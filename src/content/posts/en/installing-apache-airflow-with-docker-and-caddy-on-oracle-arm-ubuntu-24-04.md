---
title: 'Installing Apache Airflow with Docker and Caddy on Oracle ARM (Ubuntu 24.04)'
description: 'Running data pipelines often requires a robust orchestrator like Apache Airflow. Setting it up on modern ARM-based cloud infrastructure, such as Oracle Cloud’s Ampere A1 instances, can be efficient and cost-effective. This guide walks you through installing Apache...'
pubDate: 2025-04-13
heroImage: '/images/2025/04/airflow_logo.png'
heroImageAlt: 'airflow logo'
categories: ['Linux']
tags: []
toc: true
---

Running data pipelines often requires a robust orchestrator like Apache Airflow. Setting it up on modern ARM-based cloud infrastructure, such as Oracle Cloud’s Ampere A1 instances, can be efficient and cost-effective. This guide walks you through installing Apache Airflow using Docker Compose on an Ubuntu 24.04 ARM VM, using Caddy as a reverse proxy for easy subdomain management and SSL, and leveraging a dedicated block volume for persistent storage.

We’ll configure Airflow to run on its own subdomain (e.g., airflow.yourdomain.com) while keeping other services (like a WordPress blog on the main domain) separate.

**Target Setup:**

- Server: Oracle Cloud ARM VM (Ampere A1)

- OS: Ubuntu 24.04 LTS (ARM64/aarch64)

- Orchestrator: Apache Airflow (via Docker Compose)

- Reverse Proxy: Caddy (installed natively, handling SSL via Cloudflare DNS or standard ACME)

- Storage: OS on boot volume, Airflow data (DAGs, logs, Postgres DB) on a separate Block Volume mounted at /mnt/blockvolume.

- Access: Airflow UI accessible via https://airflow.yourdomain.com

**Prerequisites**

Before you begin, ensure you have the following set up:

- Oracle Cloud ARM VM: An Ampere A1 instance running Ubuntu 24.04 LTS.

- SSH Access: You can connect to your VM as a user with sudo privileges.

- Block Volume: A block volume attached to your VM and mounted read/write (e.g., at /mnt/blockvolume). We’ll use this path throughout the guide; adjust if yours is different.

- Docker & Docker Compose: Installed and running correctly on the ARM VM. Follow the official Docker installation instructions for Ubuntu ARM64.

- Caddy v2: Installed natively (not via Docker) and configured to serve your main domain (e.g., yourdomain.com) with SSL, potentially using Cloudflare integration.

- DNS Record: An A or AAAA record for airflow.yourdomain.com pointing to your server’s public IP address (e.g., configured in Cloudflare).

- (Optional) Cloudflare: Configured for your domain (yourdomain.com).

## Table of Contents

- Step 1: Prepare Directory Structure on Block Volume

- Step 2: Create the Docker Compose File

- Step 3: Initialize the Airflow Database

- Step 4: Configure Caddy Reverse Proxy

- Step 5: Start Airflow Services

- Step 6: Verify Installation

- Step 7: Security & Next Steps

- Conclusion

## Step 1: Prepare Directory Structure on Block Volume

We need dedicated directories for Airflow’s persistent data on the block volume.

```bash
# Define base path (adjust if your volume mount point is different)
AIRFLOW_BASE_DIR="/mnt/blockvolume/airflow"

# Create directories
sudo mkdir -p ${AIRFLOW_BASE_DIR}/{dags,logs,plugins,config,postgres-data}

# Set initial ownership (adjust if your primary user isn't the default)
# Note: We will hardcode the UID/GID in docker-compose later for consistency
sudo chown -R $(id -u):$(id -g) ${AIRFLOW_BASE_DIR}

# Set appropriate permissions (allow group write for Docker flexibility)
sudo chmod -R 775 ${AIRFLOW_BASE_DIR}
```

## Step 2: Create the Docker Compose File

Airflow provides an official docker-compose.yaml file. We’ll download it and customize it for our LocalExecutor setup (simpler for single-node), ARM compatibility, block volume storage, and hardcoded configuration for consistency.

- Navigate to the config directory:

-

```bash
cd /mnt/blockvolume/airflow/config
```

2. **Download the official file (check Airflow docs for the latest recommended version):**

```bash
curl -LfO 'https://airflow.apache.org/docs/apache-airflow/stable/docker-compose.yaml'
```

3. **Edit the Docker Compose File:** Open the downloaded docker-compose.yaml with a text editor (sudo nano docker-compose.yaml). **Replace the entire contents** with the following configuration. This version uses LocalExecutor, points volumes to /mnt/blockvolume, removes Celery/Redis, binds the webserver to localhost, and **hardcodes configuration values**.

**(Security Note:** Hardcoding secrets like passwords and keys directly in this file is convenient for consistency but less secure than using a separate .env file, especially if this file might be shared or version-controlled. Ensure this file remains private on your server.)

````bash
# /mnt/blockvolume/airflow/config/docker-compose.yaml
# --- Airflow with LocalExecutor, data on block volume ---
# --- ALL Config values HARDCODED ---
---
x-airflow-common:
  &airflow-common
  # Official multi-arch image should work on ARM64. Update tag as needed.
  image: ${AIRFLOW_IMAGE_NAME:-apache/airflow:2.10.5}
  environment:
    &airflow-common-env
    AIRFLOW__CORE__EXECUTOR: LocalExecutor
    # Use a strong, unique password for Postgres below and here:
    AIRFLOW__DATABASE__SQL_ALCHEMY_CONN: postgresql+psycopg2://airflow:YOUR_SECURE_POSTGRES_PASSWORD@postgres/airflow
    # Generate unique keys using commands below and replace placeholders:
    # Fernet Key: python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
    # Secret Key: openssl rand -hex 32
    AIRFLOW__CORE__FERNET_KEY: 'YOUR_GENERATED_FERNET_KEY_HERE' # Hardcoded Fernet Key
    AIRFLOW__WEBSERVER__SECRET_KEY: 'YOUR_GENERATED_WEBSERVER_SECRET_KEY_HERE' # Hardcoded Webserver Secret Key
    AIRFLOW__CORE__DAGS_ARE_PAUSED_AT_CREATION: 'true'
    AIRFLOW__CORE__LOAD_EXAMPLES: 'true' # Set to false to disable example DAGs
    AIRFLOW__API__AUTH_BACKENDS: 'airflow.api.auth.backend.basic_auth,airflow.api.auth.backend.session'
    AIRFLOW__SCHEDULER__ENABLE_HEALTH_CHECK: 'true'
    _PIP_ADDITIONAL_REQUIREMENTS: '' # Add python packages here if needed e.g. 'apache-airflow-providers-...'
  volumes:
    # Point to directories on the block volume
    - /mnt/blockvolume/airflow/dags:/opt/airflow/dags
    - /mnt/blockvolume/airflow/logs:/opt/airflow/logs
    - /mnt/blockvolume/airflow/plugins:/opt/airflow/plugins
  # Use the UID of your host user that owns the block volume directories
  # Replace '1001' with your actual UID from `id -u` command on host
  user: "1001:0" # Hardcoded UID:GID
  depends_on:
    &airflow-common-depends-on
    postgres:
      condition: service_healthy

services:
  postgres:
    image: postgres:13 # Ensure compatibility with Airflow version
    environment:
      POSTGRES_USER: airflow
      # Use the SAME strong password as in the SQL_ALCHEMY_CONN above
      POSTGRES_PASSWORD: YOUR_SECURE_POSTGRES_PASSWORD
      POSTGRES_DB: airflow
    volumes:
      # Persist Postgres data on the block volume
      - /mnt/blockvolume/airflow/postgres-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD", "pg_isready", "-U", "airflow"]
      interval: 10s
      retries: 5
      start_period: 5s
    restart: always

  airflow-webserver:


- YOUR_GENERATED_WEBSERVER_SECRET_KEY: This key secures user sessions in the Airflow UI. Generate it on your server:

Generate key: openssl rand -hex 32

- Copy the output (a 64-character hexadecimal string) and paste it into the AIRFLOW__WEBSERVER__SECRET_KEY value in the compose file.

- User ID (user: “1001:0”): Confirm the user ID 1001 matches the output of the id -u command for your primary user on the host machine. Adjust if necessary.

- Save the file after replacing all placeholders with your generated values.

## Step 3: Initialize the Airflow Database

This one-time command runs the airflow-init service defined above to set up the database schema and create the initial admin user.

```bash
# Ensure you are in the config directory
cd /mnt/blockvolume/airflow/config

# Run the initialization
docker compose run --rm airflow-init
````

Watch the output for success messages regarding DB connection, initialization, and user creation.

## Step 4: Configure Caddy Reverse Proxy

Edit your main Caddy configuration file (usually /etc/caddy/Caddyfile) and add a block for your Airflow subdomain.

```text
sudo nano /etc/caddy/Caddyfile
```

Add this block (adjusting alongside your existing configurations):

```text
# /etc/caddy/Caddyfile

# (Your existing site blocks, e.g., for yourdomain.com)
# yourdomain.com {
#   ...
# }

# Add Airflow configuration
airflow.yourdomain.com {
    # Proxy requests to the Airflow webserver container on localhost:8080
    reverse_proxy 127.0.0.1:8080 {
        # Pass essential headers to the backend
        header_up Host {http.request.host}
        header_up X-Real-IP {http.request.remote.ip}
        header_up X-Forwarded-For {http.request.remote.ip}
        header_up X-Forwarded-Proto {http.request.scheme}
    }

    # Enable compression
    encode zstd gzip

    # Caddy automatically handles HTTPS certificates
}

# (Other global options or site blocks)
```

Save the Caddyfile and reload Caddy to apply the changes:

```bash
sudo systemctl reload caddy
sudo systemctl status caddy # Check for errors
```

## Step 5: Start Airflow Services

Now, start the main Airflow webserver and scheduler containers.

```bash
# Ensure you are in the config directory
cd /mnt/blockvolume/airflow/config

# Start services in detached mode
docker compose up -d
```

## Step 6: Verify Installation

- Check Containers: Run docker ps to see if config-postgres-1, config-airflow-scheduler-1, and config-airflow-webserver-1 (or similar names) are Up and healthy.

- Check Logs (if needed): docker logs config-airflow-webserver-1 or docker logs config-airflow-scheduler-1.

- Access UI: Open your browser and navigate to https://airflow.yourdomain.com.

- Login: Use the admin username (default admin or what you set) and the YOUR_SECURE_ADMIN_UI_PASSWORD you configured in docker-compose.yaml.

If you see the Airflow dashboard, congratulations!

## Step 7: Security & Next Steps

- Admin Password: Although you set an initial password, consider changing it via the Airflow UI (Profile -> User Info -> Reset Password) if desired, especially if you revert to using .env files later.

- Fernet Key: The key ensures connection passwords stored in Airflow are encrypted. Keep it safe.

- Secrets Management: For production, explore more robust secrets management backends (like HashiCorp Vault) instead of hardcoding or using .env files.

- DAGs: Place your DAG .py files in /mnt/blockvolume/airflow/dags on the host server. Airflow will automatically detect them.

- Monitoring: Consider tools like Netdata or Prometheus/Grafana to monitor your VM and Airflow container resources.

- Upgrades: Consult the official Airflow documentation for upgrade procedures, which typically involve updating the image tag in docker-compose.yaml, running database migrations, and restarting services.

## Conclusion

You now have a working Apache Airflow instance running securely on its own subdomain on your Oracle Cloud ARM server. By leveraging Docker Compose, Caddy, and a dedicated block volume, you have a scalable and maintainable setup ready for your data pipelines. Happy DAG running!
