---
title: 'Installing Odoo 18 with Docker Compose and Caddy on Ubuntu 24.04 (Oracle ARM) – The Easy Way (After Hitting a Snag!)'
description: 'Odoo is a fantastic suite of open-source business apps, covering CRM, ERP, accounting, inventory, and more. Running it yourself gives you full control, and Docker makes the deployment process much smoother. This guide walks you through installing Odoo 18 Community...'
pubDate: 2025-03-26
heroImage: '/images/2025/03/Odoo_logo2.png'
heroImageAlt: 'Odoo logo2'
categories: ['Cloud']
tags: []
toc: true
---

Odoo is a fantastic suite of open-source business apps, covering CRM, ERP, accounting, inventory, and more. Running it yourself gives you full control, and Docker makes the deployment process much smoother. This guide walks you through installing Odoo 18 Community Edition using Docker Compose on an Oracle Cloud ARM Ampere VM running Ubuntu 24.04, with Caddy acting as a secure reverse proxy for easy HTTPS.

We’ll use a subdomain (odoo.yourdomain.com) and leverage Docker Compose for managing Odoo and its PostgreSQL database. Crucially, we’ll address a common permission pitfall encountered when using host-mounted volumes and show why **Docker Named Volumes** provided a reliable solution in this scenario.

**Our Stack:**

- Cloud Provider: Oracle Cloud Infrastructure (OCI)

- VM: ARM Ampere (aarch64)

- OS: Ubuntu 24.04 LTS

- Web Server / Reverse Proxy: Caddy v2

- Containerization: Docker & Docker Compose

- Application: Odoo 18 Community Edition

- Database: PostgreSQL 15

- DNS: Managed via Cloudflare (important for easy HTTPS with Caddy)

- (Optional) Storage: Separate Block Volume mounted at /mnt/myvolume (for config/addons)

**Prerequisites:**

- An Ubuntu 24.04 server (ARM architecture assumed, but x86_64 is similar).

- Docker and Docker Compose v2+ installed.

- Caddy v2 installed and running as a service.

- A registered domain name (yourdomain.com) pointed to your server’s public IP.

- DNS configured for odoo.yourdomain.com (an A record pointing to your server IP). If using Cloudflare, ensure the record is proxied (orange cloud).

- SSH access to your server.

- (Optional) A block volume mounted (e.g., at /mnt/myvolume) if you want to store config/addons separately from the root filesystem.

## Step 1: Create Project Directories

We’ll organize our Odoo configuration files. While the main Odoo data will live in Docker named volumes, we might still want host access for custom configuration or addons.

```bash
# Choose a location, e.g., on your block volume or home directory
# Using the block volume example:
sudo mkdir -p /var/www/html/odoo/config
sudo mkdir -p /var/www/html/odoo/addons

# Navigate to the main project directory
cd /var/www/html/odoo
```

## Step 2: Create the docker-compose.yml File

This file defines the Odoo application and its database service. We’ll use the official multi-arch images that support ARM64. **Crucially, we will use Docker Named Volumes for the persistent data.**

Create the file /var/www/html/odoo/docker-compose.yml:

```text
sudo nano /var/www/html/odoo/docker-compose.yml
```

Paste the following content. **Remember to replace YOUR_STRONG_DB_PASSWORD with a secure password!**

```yaml
# /var/www/html/odoo/docker-compose.yml

services:
  db:
    image: postgres:15-alpine # Compatible with Odoo 18, good for ARM
    container_name: odoo_18_db
    environment:
      - POSTGRES_DB=postgres
      - POSTGRES_USER=odoo
      - POSTGRES_PASSWORD=YOUR_STRONG_DB_PASSWORD # !! CHANGE THIS !!
    volumes:
      # Use a named volume for DB data
      - odoo_db_data:/var/lib/postgresql/data
    restart: unless-stopped
    networks:
      - odoo-network

  odoo:
    image: odoo:18.0 # Official Odoo 18 image (multi-arch)
    container_name: odoo_18_app
    depends_on:
      - db
    ports:
      # IMPORTANT: Expose only to localhost (127.0.0.1). Caddy will handle external access.
      - '127.0.0.1:8069:8069'
      # - "127.0.0.1:8072:8072" # Optional debug/longpolling port
    environment:
      - HOST=db
      - PORT=8069 # Internal port Odoo listens on
      - USER=odoo # Connect to DB as this user
      - PASSWORD=YOUR_STRONG_DB_PASSWORD # !! Use the SAME password as for the DB !!
      # Optional: Set the Odoo Master Admin password (recommended)
      # - ADMIN_PASSWORD=YOUR_SECURE_MASTER_PASSWORD # !! CHANGE THIS !!
    volumes:
      # Odoo application data using a named volume
      - odoo_app_data:/var/lib/odoo
      # Optional: Mount for custom addons from host
      - /var/www/html/odoo/addons:/mnt/extra-addons
      # Optional: Mount for custom config file (needs command below)
      - ./config/odoo.conf:/etc/odoo/odoo.conf
    restart: unless-stopped
    # Optional: Command to explicitly load the config file
    command: ['--config', '/etc/odoo/odoo.conf']
    networks:
      - odoo-network

networks:
  odoo-network:
    driver: bridge
    name: odoo_network # Give the network an explicit name

# Define the named volumes used above
volumes:
  odoo_db_data:
  odoo_app_data:
```

Save and close the file (Ctrl+X, then Y, then Enter in nano).

## Step 3: Understanding the docker-compose.yml and Named Volumes

- services:: Defines the containers.

db: The PostgreSQL database using the postgres:15-alpine image. Environment variables set up the user (odoo) and password.

- odoo: The Odoo application using the odoo:18.0 image. Environment variables tell it how to connect to the db service.

- ports:: The 127.0.0.1:8069:8069 mapping is key. It makes Odoo accessible only from the host machine itself (localhost) on port 8069. Caddy will connect to this.

- volumes: (within services): This is where we define how data persists.

odoo_db_data:/var/lib/postgresql/data: Maps the internal PostgreSQL data directory to a Docker named volume called odoo_db_data.

- odoo_app_data:/var/lib/odoo: Maps the internal Odoo data directory (sessions, attachments/filestore) to a Docker named volume called odoo_app_data.

- /var/www/html/odoo/addons:/mnt/extra-addons: Maps a directory on the host (our block volume) into the container. Useful for adding custom Odoo modules.

- ./config/odoo.conf:/etc/odoo/odoo.conf: Maps a config file from the host into the container. ./ means relative to where docker-compose.yml is.

- volumes: (at the bottom): This top-level block declares the named volumes (odoo_db_data, odoo_app_data) used by the services. Docker manages the actual storage location for these (usually under /var/lib/docker/volumes/).

**Why Named Volumes Solved Our Problem:**

During our initial setup attempt using *host path volumes* (e.g., – /var/www/html/odoo/data:/var/lib/odoo), we encountered persistent PermissionError: [Errno 13] Permission denied: ‘/var/lib/odoo/.local’ errors in the Odoo logs, resulting in a 500 Internal Server Error.

This happened because the Odoo container runs as user ID 101. Even after explicitly setting the host directory ownership (sudo chown -R 101:101 /var/www/html/odoo/data), the container *still* couldn’t write to its data directory (/var/lib/odoo) mounted from the host. This could be due to subtle interactions with the host filesystem type, mount options on /mnt/myvolume, or security modules like AppArmor enforcing restrictions differently for host mounts.

**Named volumes bypass this.** Docker manages the underlying storage and permissions for named volumes, typically ensuring the container user has the necessary access rights automatically. By switching to odoo_app_data:/var/lib/odoo and odoo_db_data:/var/lib/postgresql/data, the permission errors vanished, and Odoo started correctly.

## Step 4: (Optional) Create Custom Odoo Configuration

If you need specific Odoo settings not covered by environment variables, create /var/www/html/odoo/config/odoo.conf. Make sure the command: line is present in your docker-compose.yml if you use this.

```text
sudo nano /var/www/html/odoo/config/odoo.conf
```

Add necessary options (ensure passwords match docker-compose.yml):

```text
[options]
db_host = db
db_port = 5432
db_user = odoo
db_password = YOUR_STRONG_DB_PASSWORD
addons_path = /mnt/extra-addons,/usr/lib/python3/dist-packages/odoo/addons,/var/lib/odoo/.local/share/Odoo/addons/18.0
# Important for reverse proxy setup:
proxy_mode = True
# Optional performance tuning (adjust based on server specs)
# workers = 2
# limit_memory_hard = 2684354560 ; 2.5GB
# limit_memory_soft = 2147483648 ; 2GB
```

## Step 5: Configure Caddy Reverse Proxy

Edit your main Caddyfile (/etc/caddy/Caddyfile) and add a block for your Odoo subdomain:

```text
sudo nano /etc/caddy/Caddyfile
```

Add the following block (adjusting alongside your existing site blocks):

```text
# /etc/caddy/Caddyfile

# ... (your global options and other site blocks like yourdomain.com) ...

odoo.yourdomain.com {
    # Log requests for this site (optional)
    log

    # Enable compression
    encode zstd gzip

    # Recommended security headers
    header {
        Strict-Transport-Security "max-age=31536000;"
        X-Frame-Options "SAMEORIGIN"
        X-Content-Type-Options "nosniff"
        Referrer-Policy "strict-origin-when-cross-origin"
        -Server # Hide Caddy signature
    }

    # Reverse proxy to the Odoo container listening on localhost:8069
    reverse_proxy localhost:8069
}

# ... (any other site blocks) ...
```

- Ensure the log directory /var/log/caddy exists and the caddy user can write to it.

- The reverse_proxy localhost:8069 line tells Caddy to forward requests for odoo.yourdomain.com to the Odoo container, which we exposed only on the host’s port 8069.

- Caddy automatically handles obtaining and renewing Let’s Encrypt SSL certificates for odoo.yourdomain.com.

Reload Caddy to apply the changes:

```bash
sudo systemctl reload caddy
```

## Step 6: Launch Odoo!

Navigate back to your Odoo project directory and start the containers:

```bash
cd /var/www/html/odoo
docker compose up -d
```

Docker will pull the images (if not already present) and create the containers and named volumes.

## Step 7: Monitor and Initial Setup

Check the container status and logs:

```bash
docker compose ps
docker compose logs -f odoo
# (Press Ctrl+C to stop viewing logs)
```

Look for the line HTTP service (werkzeug) running on …:8069. You should *not* see the permission errors we encountered earlier.

Now, open your web browser and navigate to https://odoo.yourdomain.com.

You should be greeted by the Odoo Database Setup page:

- Master Password: Set a secure master password. Save this somewhere safe! It’s needed for database management tasks.

- Database Name: Choose a name (e.g., odoo_prod).

- Admin Credentials: Enter the email and password for your primary Odoo administrator.

- Language/Country: Select appropriate options.

- Demo Data: Check the box if you want sample data (useful for exploring).

- Click Create Database.

The creation process can take a minute or two. Once finished, you’ll be logged into your brand new Odoo 18 instance!

## Step 8: Troubleshooting Common Issues

Even with a guide, things can sometimes go sideways. Here are some common problems you might encounter and how to diagnose them:

**1. Error: 500 Internal Server Error (from Odoo)**

- Symptom: You see “Internal Server Error” in your browser when accessing https://odoo.yourdomain.com.

- Diagnosis: This almost always means an error within the Odoo application itself after Caddy successfully proxied the request.

Check Odoo Logs: This is the most important step. Run docker compose logs -f odoo in your terminal (from /var/www/html/odoo), then refresh the browser page. Look for Python tracebacks (multi-line error messages).

- Common Cause (We hit this!): PermissionError: [Errno 13] Permission denied: ‘/var/lib/odoo/…’. If you see this, it confirms a filesystem permission issue inside the container. The most reliable fix we found was switching from host path volumes to Docker Named Volumes for /var/lib/odoo and /var/lib/postgresql/data as shown in Step 2’s docker-compose.yml. If you initially used host paths, stop the containers (docker compose down), switch your docker-compose.yml to use named volumes, and restart (docker compose up -d).

- Check odoo.conf: Ensure proxy_mode = True is uncommented in /var/www/html/odoo/config/odoo.conf (if you’re using the config file). If you change it, restart Odoo: docker compose restart odoo.

- Database Connection: Check Odoo logs for errors connecting to the db service. Ensure the POSTGRES_PASSWORD in the db service matches the PASSWORD in the odoo service in your docker-compose.yml.

**2. Error: 502 Bad Gateway (from Caddy)**

- Symptom: You see a Caddy error page indicating a “Bad Gateway”.

- Diagnosis: This means Caddy cannot successfully connect to the upstream service (Odoo).

Is Odoo Container Running? Check docker compose ps. Is the odoo_18_app container listed as Up? If not, check its logs (docker compose logs odoo) to see why it failed to start.

- Is Odoo Listening Correctly? Did you correctly map the port in docker-compose.yml as 127.0.0.1:8069:8069?

- Test Direct Connection: SSH into your server and run curl -v http://127.0.0.1:8069. If you get “Connection refused”, the Odoo container isn’t listening correctly on the host. If you get a 500 error from Odoo (HTML output), then Odoo is running but failing internally (see #1 above).

- Check Caddy Logs: View Caddy’s logs (sudo journalctl -u caddy -f or /var/log/caddy/odoo.yourdomain.com.log) for errors related to connecting to localhost:8069.

**3. Error: Browser shows “Connection Refused” or Timeout**

- Symptom: You can’t reach https://odoo.yourdomain.com at all.

- Diagnosis: This could be Caddy, networking, DNS, or Cloudflare.

Is Caddy Running? Check sudo systemctl status caddy.

- Did Caddy Reload? Did you run sudo systemctl reload caddy after editing the Caddyfile?

- Caddyfile Syntax: Validate your Caddyfile: caddy validate –config /etc/caddy/Caddyfile. Fix any reported errors and reload.

- DNS Propagation: Ensure odoo.yourdomain.com points correctly to your server’s IP (xxx.xxx…). Use ping odoo.yourdomain.com or dig odoo.yourdomain.com from your local machine.

- Firewall: Is port 443 (HTTPS) open on your server’s firewall (e.g., OCI Security Lists, ufw)? Caddy handles HTTP->HTTPS redirects, so port 80 also needs to be open.

- Cloudflare Settings:

Is the DNS record for odoo.yourdomain.com proxied (orange cloud)?

- Is your Cloudflare SSL/TLS mode set to Full or Full (Strict)? (Flexible will cause redirect loops).

**4. Docker Compose Warnings/Errors**

- WARN[…] The “…” variable is not set.: You likely used \$YourPassword instead of just YourPassword in docker-compose.yml. Edit the file and remove the \$.

- Error response from daemon: … mount … Are you trying to mount a directory onto a file (or vice-versa)?: Often caused by running docker compose up -d from the wrong directory when using relative paths (./config/odoo.conf), or if the host file/directory doesn’t exist or has the wrong type. Ensure you run docker compose commands from the directory containing your docker-compose.yml (/var/www/html/odoo in our guide). Ensure config/odoo.conf exists if you’re mounting it.

- Containers Exit Immediately: Check logs (docker compose logs odoo or docker compose logs db) for the reason. It could be incorrect passwords, inability to connect to the DB, or other configuration errors.

**General Tips:**

- Check Logs First: Odoo logs, DB logs, and Caddy logs are your best friends.

- Restart Services: Sometimes a simple restart helps after fixing config: docker compose restart odoo db or sudo systemctl restart caddy.

- Patience: DNS changes can take time to propagate. Container restarts aren’t always instantaneous.

## Conclusion:

You now have a working Odoo 18 installation running securely via Docker Compose and Caddy on your Oracle ARM server. By using **Docker Named Volumes** for persistent data storage, we avoided potential host filesystem permission conflicts, leading to a smoother and more reliable setup compared to using direct host path mounts in this particular environment. Enjoy exploring the power of Odoo!
