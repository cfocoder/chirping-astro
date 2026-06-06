---
title: 'Installing RedPanda Streaming Data Platform on Oracle ARM Ubuntu 24.04 with Docker and Caddy'
description: 'Environment: Oracle Cloud ARM VM, Ubuntu 24.04, Docker, Caddy (non-Docker), Cloudflare'
pubDate: 2025-04-14
heroImage: '/images/2025/04/redpanda_logo.png'
heroImageAlt: 'redpanda logo'
categories: ['Linux']
tags: ['Redpanda', 'Streaming']
toc: true
---

**Level:** Intermediate
**Environment:** Oracle Cloud ARM VM, Ubuntu 24.04, Docker, Caddy (non-Docker), Cloudflare

**Introduction: What is RedPanda and Why Should Analytics Engineers/Data Scientists Care?**

In the world of data, moving information quickly and reliably is crucial. Enter **RedPanda**, a modern streaming data platform designed for simplicity and performance. Think of it as a **Kafka-compatible** alternative, but built from the ground up in C++ without the JVM dependency. This often translates to lower latency, better resource utilization (especially memory), and simpler operational overhead compared to traditional Kafka setups.

**Why is this relevant for Analytics Engineers and Data Scientists?**

- Real-Time Data Ingestion: RedPanda provides a robust backbone for ingesting event streams from various sources (applications, IoT devices, databases via CDC). This allows you to work with data as it happens, rather than waiting for batch processes.

- Streaming ETL/ELT: Instead of batch-based transformations, you can build pipelines that process and transform data streams in real-time using tools that integrate with the Kafka protocol (like Spark Streaming, Flink, ksqlDB, or custom applications). This enables faster insights and feature generation.

- Foundation for Real-Time Analytics & ML: Access to fresh, streaming data enables dashboards that reflect current state, anomaly detection systems that react instantly, and machine learning models that can be updated or served based on the latest events (e.g., real-time feature engineering, online inference).

- Event Sourcing & Event-Driven Architectures: RedPanda can serve as the central log for event-driven systems, enabling decoupled services and providing an auditable history of state changes – valuable patterns even in analytics workflows.

Essentially, RedPanda offers a high-performance, resource-efficient way to handle the “firehose” of data increasingly common today, making it easier to build sophisticated, real-time data capabilities. This guide walks you through installing RedPanda and its web UI (Redpanda Console) on an Oracle Cloud ARM instance running Ubuntu 24.04, using Docker Compose for containerization and Caddy as a reverse proxy for secure access.

**Prerequisites**

Before starting, ensure you have the following set up:

- Oracle Cloud ARM VM: An Ampere A1 instance (or similar ARM64 VM).

- Operating System: Ubuntu 24.04 LTS.

- Docker & Docker Compose: Installed and running correctly for the ARM64 architecture.

- Caddy: Installed directly on the host (not in Docker) and configured as a systemd service. It should already be handling SSL for your main domain.

- Block Volume: A separate block volume attached and mounted to the VM. In this guide, we assume it’s mounted at /mnt/myvolume. This is crucial for persistent data storage outside the boot volume.

- Domain Name & DNS: A domain name (we’ll use yourdomain.com as a placeholder) managed via Cloudflare.

- Cloudflare Configuration:

An A record (or CNAME) for redpanda.yourdomain.com pointing to your VM’s public IP address (xxx.xxx.xxx.xxx). Ensure the Cloudflare proxy (Orange Cloud) is enabled.

- SSL/TLS encryption mode set to Full (Strict) in the Cloudflare dashboard for yourdomain.com.

We’ll install RedPanda (broker) and Redpanda Console (web UI) using Docker Compose, storing configuration and data on the block volume, securing the broker with SASL, and proxying the Console via Caddy.

## Step 1: Prepare Directories on Block Volume

We need directories for the Docker Compose configuration and RedPanda’s data.

```bash
# Create directory for Docker Compose files
sudo mkdir -p /var/www/html/redpanda-setup
cd /var/www/html/redpanda-setup

# Create directory for Redpanda data
sudo mkdir -p /var/www/html/redpanda/data

# IMPORTANT: Grant permissions for the Redpanda container user (UID/GID 101)
sudo chown -R 101:101 /var/www/html/redpanda/data
```

## Step 2: Create the Docker Compose File

In the /var/www/html/redpanda-setup directory, create a file named docker-compose.yml:

```text
nano docker-compose.yml
```

Paste the following content into the file. **Remember to replace “YOUR_STRONG_PASSWORD_HERE” with a secure password you choose.**

```yaml
networks:
  redpanda_net:
    driver: bridge

services:
  redpanda:
    image: docker.redpanda.com/redpandadata/redpanda:latest # Multi-arch image
    container_name: redpanda-broker
    command:
      - redpanda
      - start
      - --smp 1 # Adjust based on available CPU cores if needed
      - --memory 1G # Adjust based on available RAM
      - --reserve-memory 0M
      - --node-id 0
      - --check=false
      # --- Listeners (Internal network) ---
      - --kafka-addr INTERNAL://0.0.0.0:9092 # Kafka listener for internal Docker network
      # --- Advertised Addresses ---
      - --advertise-kafka-addr INTERNAL://redpanda:9092 # Advertise Kafka internally
      - --advertise-rpc-addr redpanda:33145 # Advertise RPC internally
      # --- Seeds ---
      - --seeds redpanda:33145 # Required for single-node when empty_seed_starts_cluster=false
      # --- SASL settings ---
      - --set redpanda.enable_sasl=true
      - --set redpanda.sasl_mechanisms=SCRAM-SHA-256
      - --set redpanda.superusers=rp_admin
      # --- Single node settings ---
      - --set redpanda.default_topic_replications=1
      - --set redpanda.empty_seed_starts_cluster=false # Safer setting
    ports:
      # Expose Admin API only to localhost for rpk commands from host (optional)
      - '127.0.0.1:9644:9644'
    volumes:
      - /var/www/html/redpanda/data:/var/lib/redpanda/data # Map data dir to block volume
    networks:
      - redpanda_net
    restart: unless-stopped

  console:
    image: docker.redpanda.com/redpandadata/console:latest # Multi-arch image
    container_name: redpanda-console
    depends_on:
      - redpanda
    ports:
      # Map HOST port 8081 to CONTAINER port 8080 (Avoids potential conflicts on host 8080)
      - '127.0.0.1:8081:8080'
    environment:
      # Console connects to broker via internal Docker network name
      KAFKA_BROKERS: 'redpanda:9092'
      # --- SASL Configuration for Console ---
      KAFKA_SASL_ENABLED: 'true'
      KAFKA_SASL_MECHANISM: 'SCRAM-SHA-256'
      KAFKA_SASL_USERNAME: 'rp_admin'
      # --- Password Hardcoded ---
      # SECURITY NOTE: Password is hardcoded here. Ensure this file is protected.
      KAFKA_SASL_PASSWORD: 'YOUR_STRONG_PASSWORD_HERE' # Replace with your actual password!
    networks:
      - redpanda_net
    restart: unless-stopped
```

**Explanation of Key Parts:**

- networks: Defines a bridge network for containers to communicate.

- services.redpanda: Defines the core RedPanda broker.

command: Sets startup flags. Crucially, –seeds redpanda:33145 tells the single node where to find itself to form the cluster, and –set redpanda.empty_seed_starts_cluster=false prevents accidental new cluster formation on restart. SASL is enabled via –set redpanda.enable_sasl=true and the superuser is defined.

- volumes: Maps the data directory on the host block volume (/var/www/html/redpanda/data) to the standard data location inside the container.

- services.console: Defines the Redpanda Console web UI.

depends_on: Ensures the broker starts before the console.

- ports: Maps port 8081 on the host’s localhost interface to port 8080 inside the container. We use 8081 on the host to avoid conflicts.

- environment: Configures the Console. KAFKA_BROKERS uses the service name redpanda. SASL settings match the broker, and the password is hardcoded here for simplicity in this environment (be mindful of the security implications).

## Step 3: Start RedPanda Broker (First Time)

We need the broker running before we can create the SASL user within it.

```bash
# Ensure you are still in /var/www/html/redpanda-setup
docker compose up -d redpanda
```

Wait about 30 seconds for it to initialize. Check logs briefly (ignore SASL warnings for now):

```bash
docker compose logs -f redpanda
# Press Ctrl+C when stable
```

## Step 4: Create the SASL User

Execute the command inside the running broker container to create the rp_admin user with the password you set in the docker-compose.yml file.

```bash
# Replace "YOUR_STRONG_PASSWORD_HERE" with the actual password you used!
RP_PASSWORD="YOUR_STRONG_PASSWORD_HERE"

docker exec -it redpanda-broker rpk acl user create rp_admin \
  -p "$RP_PASSWORD" \
  --mechanism SCRAM-SHA-256
```

You should see Created user “rp_admin”.

## Step 5: Start Redpanda Console

Now, start the console service. Docker Compose will use the updated docker-compose.yml with the hardcoded password.

```bash
docker compose up -d console
```

Or bring up the entire stack defined in the compose file:

```bash
docker compose up -d
```

Check that both containers are running:

```bash
docker compose ps
```

## Step 6: Configure Caddy Reverse Proxy

Edit your Caddyfile (/etc/caddy/Caddyfile) and add a block for the RedPanda subdomain. Make sure it proxies to the *host* port we mapped for the console (8081).

```text
sudo nano /etc/caddy/Caddyfile
```

Add this block (alongside your existing configurations):

```text
redpanda.yourdomain.com {
        # Reverse proxy requests to the Redpanda Console container listening on localhost:8081
        reverse_proxy 127.0.0.1:8081

        # Optional Recommended Headers
        # header {
        #         Strict-Transport-Security max-age=31536000; includeSubDomains; preload
        #         X-Content-Type-Options nosniff
        #         X-Frame-Options DENY
        #         Referrer-Policy strict-origin-when-cross-origin
        # }
}

# --- Your other domain configs (e.g., yourdomain.com for WordPress) ---
# yourdomain.com {
#       ...
# }
```

## Step 7: Reload Caddy

Apply the new Caddy configuration:

```bash
sudo systemctl reload caddy
```

Check the status for errors:

```bash
sudo systemctl status caddy
```

## Step 8: Verify Cloudflare and Access

- Cloudflare: Double-check the A record for redpanda.yourdomain.com points to xxx.xxx.xxx.xxx (your server IP) and that SSL/TLS is Full (Strict).

- Access: Open your web browser and navigate to https://redpanda.yourdomain.com.

You should see the Redpanda Console UI. You might notice some errors (like 501 Not Implemented) in the browser’s developer console for features like Kafka Connect or Enterprise features – this is expected for the community version and default setup. The core broker information and topic management should work.

## Step 9: Managing Your Installation

Remember to cd into your configuration directory first:

```bash
cd /var/www/html/redpanda-setup
```

- Start: docker compose up -d

- Stop: docker compose down

- View Logs (Broker): docker compose logs -f redpanda

- View Logs (Console): docker compose logs -f console

- Update Images: docker compose pull && docker compose up -d –force-recreate

## Conclusion

You now have a RedPanda broker and the Redpanda Console web UI running securely on your Oracle Cloud ARM Ubuntu instance using Docker Compose. Data is persisted on your block volume, access is secured via SASL, and Caddy handles the SSL termination and reverse proxying. This setup provides a powerful, efficient foundation for building real-time data pipelines and analytics workflows. Happy streaming!
