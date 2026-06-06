---
title: 'Installing Nextcloud on Oracle ARM Ubuntu 24.04 with Docker and Caddy'
description: 'In today’s data-driven world, managing files, collaborating securely, and maintaining control over your digital assets is paramount. Nextcloud is a powerful, open-source, self-hosted productivity platform that allows you to do just that. Think of it as your own private...'
pubDate: 2025-04-18
heroImage: '/images/2025/04/nextcloud_logo.png'
heroImageAlt: 'nextcloud logo'
categories: ['Cloud']
tags: []
toc: true
---

**Introduction: Your Data, Your Cloud**

In today’s data-driven world, managing files, collaborating securely, and maintaining control over your digital assets is paramount. Nextcloud is a powerful, open-source, self-hosted productivity platform that allows you to do just that. Think of it as your own private Dropbox or Google Drive, but with far more flexibility and control. It offers file synchronization across devices, shared calendars, contact management, online document editing (with Collabora or OnlyOffice integrations), and a vast ecosystem of apps to extend its functionality.

**Why Nextcloud for Data Science?**

While often seen as a general productivity tool, Nextcloud offers distinct advantages for data science workflows:

- Large Dataset Management: Syncing large datasets, model files, or research papers across your work machine, home computer, and even cloud VMs becomes seamless and private. No more relying on third-party services with potential size limits or privacy concerns.

- Collaboration: Securely share project folders, datasets, reports, or even version-controlled code notebooks (like Jupyter) with collaborators without emailing large attachments or granting broad access to cloud storage.

- Version Control: Nextcloud’s built-in versioning helps track changes to files, which can be invaluable for reproducibility in research or tracking dataset evolution.

- Secure Environment: Keep sensitive research data, code, and results within an environment you control.

- Extensibility: Apps exist for things like drawing diagrams, project management (Kanban boards), and more, allowing you to centralize more of your workflow.

This guide walks through installing Nextcloud on a modern, efficient platform: an Oracle Cloud Infrastructure (OCI) ARM Ampere VM running Ubuntu 24.04, using Docker Compose for container management and Caddy as a secure, automatic-HTTPS reverse proxy. We’ll install Nextcloud on its own subdomain (e.g., nextcloud.yourdomain.com).

**Prerequisites**

Before you begin, ensure you have the following:

- Oracle Cloud ARM VM: An Ampere A1 compute instance running Ubuntu 24.04 LTS. (Other ARM servers or cloud providers with Ubuntu 24.04 should also work).

- SSH Access: Ability to connect to your server via SSH with sudo privileges.

- Docker & Docker Compose: Installed and running correctly on the server.

- Caddy v2: Installed directly on the host system (not in Docker) and configured to handle reverse proxying for your main domain (e.g., yourdomain.com). Guide assumes Caddy is managing SSL automatically.

- Block Volume (Recommended): A separate block volume mounted on your server (e.g., at /mnt/myvolume) for persistent data storage. This separates application data from the boot volume. Our examples use /mnt/myvolume.

- Domain Name: A domain name you own (e.g., yourdomain.com).

- DNS Configured: An A record for nextcloud.yourdomain.com pointing to your server’s public IP address. If using Cloudflare, ensure it’s proxied (orange cloud) and SSL/TLS mode is set to “Full (Strict)”.

- Basic Linux Command Line Skills.

## Phase 1: Preparation

We’ll use the popular and well-maintained LinuxServer.io Nextcloud Docker image, which bundles Nextcloud with Nginx and PHP-FPM internally, simplifying our Caddy configuration significantly compared to using the official FPM-only image directly.

- Get Your User/Group ID: The LinuxServer.io images use PUID (User ID) and PGID (Group ID) environment variables to manage permissions, ensuring the container process runs as your host user rather than root. This avoids permission issues with mounted volumes

```text
id
```

Note down the numeric uid and gid values (e.g., uid=1000(ubuntu) gid=1000(ubuntu) -> use 1000 for both PUID and PGID).

2. **Create Host Directories for Persistent Data:** We’ll create directories on our mounted block volume to store Nextcloud’s configuration, user data, the database, and Redis cache.

```bash
# Use sudo if your user doesn't have write access to /mnt/myvolume
sudo mkdir -p /var/www/html/nextcloud_lsi_config # For LSIO container config
sudo mkdir -p /var/www/html/nextcloud_lsi_data   # For Nextcloud user data
sudo mkdir -p /var/www/html/nextcloud_data/db    # For PostgreSQL data
sudo mkdir -p /var/www/html/nextcloud_data/redis # For Redis cache data
```

3. **Create Docker Compose Directory:** Let’s keep our compose file organized.

```bash
mkdir -p /var/www/html/docker_compose/nextcloud
cd /var/www/html/docker_compose/nextcloud
```

## Phase 2: Docker Compose Configuration

Create a file named docker-compose.yml in the directory you just created (/var/www/html/docker_compose/nextcloud).

```text
nano docker-compose.yml
```

Paste the following content, replacing the placeholder values:

```bash
# Note: 'version' attribute is optional in recent Docker Compose
# version: '3.8'

services:
  db:
    image: postgres:16-alpine # Use a specific version like 16
    container_name: nextcloud_db
    restart: always
    volumes:
      # Mount the dedicated host directory to the container's data path
      - /var/www/html/nextcloud_data/db:/var/lib/postgresql/data
    environment:
      - POSTGRES_DB=nextcloud
      - POSTGRES_USER=nextcloud
      # !!! SET A STRONG, UNIQUE PASSWORD AND REMEMBER IT !!!
      - POSTGRES_PASSWORD=YOUR_STRONG_DB_PASSWORD
    networks:
      - nextcloud-net

  redis:
    image: redis:7-alpine # Use a specific version like 7
    container_name: nextcloud_redis
    restart: always
    volumes:
      - /var/www/html/nextcloud_data/redis:/data
    networks:
      - nextcloud-net

  nextcloud: # This is the main Nextcloud service using the LSIO image
    image: lscr.io/linuxserver/nextcloud:latest # Or pin to a specific tag for stability
    container_name: nextcloud_lsi
    restart: always
    environment:
      # Set User/Group IDs to match your host user for permissions
      - PUID=1000 # !!! REPLACE with your 'id -u' output !!!
      - PGID=1000 # !!! REPLACE with your 'id -g' output !!!
      # Set your server's timezone
      - TZ=Etc/UTC # !!! REPLACE e.g., America/New_York, Europe/London !!!
      # Database connection details (MUST match 'db' service and password above)
      - POSTGRES_HOST=db
      - POSTGRES_DB=nextcloud
      - POSTGRES_USER=nextcloud
      - POSTGRES_PASSWORD=YOUR_STRONG_DB_PASSWORD # !!! USE SAME PASSWORD AS 'db' SERVICE !!!
      # Redis connection details
      - REDIS_HOST=redis
      # LSIO image handles proxy headers well, specific OVERWRITE vars often not needed here
    volumes:
      # Map host directories to internal container paths
      - /var/www/html/nextcloud_lsi_config:/config
      - /var/www/html/nextcloud_lsi_data:/data
    ports:
      # Map internal HTTPS port 443 to localhost:9443 on the host
      # Caddy will connect to localhost:9443
      - "127.0.0.1:9443:443"
    depends_on: # Ensure database and redis start first
      - db
      - redis
    networks:
      - nextcloud-net

networks:
  nextcloud-net:
    driver: bridge # Use a bridge network for inter-container communication
```

Save and close the file (Ctrl+X, Y, Enter).

## Phase 3: Caddy Configuration

Now, configure Caddy to securely proxy requests to the Nextcloud container.

- Edit your main Caddyfile:

```text
sudo nano /etc/caddy/Caddyfile
```

2. **Add a new block** for nextcloud.yourdomain.com, alongside your existing site blocks:

```text
nextcloud.yourdomain.com {
    encode zstd gzip  # Enable compression
    log               # Enable access logging (check Caddy docs for customization)

    # Standard security headers (adjust HSTS after testing)
    header {
        # Strict-Transport-Security "max-age=31536000;" # Uncomment when ready
        X-Content-Type-Options "nosniff"
        X-Frame-Options "SAMEORIGIN" # Required by Nextcloud
        Referrer-Policy "strict-origin-when-cross-origin"
        X-Robots-Tag "none"
        X-Download-Options "noopen"
        X-Permitted-Cross-Domain-Policies "none"
        -Server # Hide Caddy server signature
    }

    # Reverse proxy to the LSIO container mapped to localhost:9443
    # Connect using HTTPS because the LSIO container expects it on port 443
    reverse_proxy https://127.0.0.1:9443 {
        # Send standard proxy headers (LSIO image expects these)
        header_up Host {host}
        header_up X-Real-IP {remote_ip}
        header_up X-Forwarded-For {remote_ip}
        header_up X-Forwarded-Proto {scheme}

        # Tell Caddy to TRUST the self-signed cert from the internal container
        transport http {
            tls_insecure_skip_verify
        }
    }

    # Redirect specific Nextcloud paths required by spec/clients
    # Place these *after* the main reverse_proxy
    redir /.well-known/carddav /remote.php/dav/ permanent
    redir /.well-known/caldav /remote.php/dav/ permanent
    redir /.well-known/webfinger /index.php/.well-known/webfinger permanent
    redir /.well-known/nodeinfo /index.php/.well-known/nodeinfo permanent
}

# --- Keep your other Caddy configurations below ---
# yourdomain.com { ... }
# otherapp.yourdomain.com { ... }
```

**3. Validate and Reload Caddy:**

```bash
# Optional formatting check
sudo caddy fmt --overwrite /etc/caddy/Caddyfile
# Validate the configuration
sudo caddy validate --config /etc/caddy/Caddyfile
# Reload Caddy service if valid
sudo systemctl reload caddy
# Check status for errors
sudo systemctl status caddy
```

## Phase 4: Launch and Initial Setup

- Navigate to the Compose Directory:

```bash
cd /var/www/html/docker_compose/nextcloud
```

2. **Start the Containers:**

```bash
sudo docker compose up -d
```

Docker will pull the images and start the containers in the background.

3. **Monitor Logs (Optional but Recommended):** Watch the Nextcloud container initialize.

```bash
sudo docker compose logs -f nextcloud
```

- Wait until you see messages like [ls.io-init] done. or Please run the web-based installer…. Press Ctrl+C to exit the logs.

- Access the Web UI:

Open your web browser.

- Important: Clear your browser cache or use an Incognito/Private window to avoid stale data.

- Navigate to https://nextcloud.yourdomain.com/.

- Complete the Web Installer: You should see the Nextcloud setup screen.Create admin account: Enter your desired admin username and a strong password.
- Storage & database: Click the dropdown/link.
- Select PostgreSQL.
- Database user: nextcloud
- Database password: YOUR_STRONG_DB_PASSWORD (the one from docker-compose.yml)
- Database name: nextcloud
- Database host: db (the service name of the database container)
- Click Install (or Finish setup).

The installation might take a minute or two. You should then be redirected to the Nextcloud dashboard or login screen.

## Phase 5: Post-Installation Steps

- Restart Nextcloud Container: As recommended by the LSIO logs, restart the container once after the web setup is complete to apply optimal caching settings.

```bash
cd /var/www/html/docker_compose/nextcloud
sudo docker compose restart nextcloud
```

- Change Default Passwords!

Log in to Nextcloud as the admin user you created.

- Go to Settings (click user icon top-right) -> Security -> Change password. Set a new, strong, unique password.

- Crucially, change the database password used in docker-compose.yml (both for the db service and the nextcloud service) and restart the stack (sudo docker compose down && sudo docker compose up -d).

- Security Scan & 2FA: Navigate to Settings -> Administration -> Overview. Address any security warnings. Strongly consider enabling Two-Factor Authentication (2FA/MFA) under Security settings for your admin account.

## Troubleshooting Notes

- Permission Errors during Setup: If you hit database permission errors (permission denied for table oc_migrations), it usually means the database volume (/var/www/html/nextcloud_data/db) wasn’t completely empty when the db container started. Stop the stack (docker compose down), thoroughly delete the contents of that host directory (sudo rm -rf /var/www/html/nextcloud_data/db/\*), and start again (docker compose up -d). You might also need to clear the /var/www/html/nextcloud_lsi_config directory again.

- “User Files Exist” Error: If the setup complains files already exist for the admin user, stop the stack (docker compose down), delete the contents of the Nextcloud data directory (sudo rm -rf /var/www/html/nextcloud_lsi_data/\*), and start again (docker compose up -d).

- Blank Page / Errors: Always clear your browser cache aggressively or use an Incognito window when testing changes. Check Caddy logs (journalctl -u caddy -f) and Nextcloud container logs (docker compose logs -f nextcloud) for clues.

- 400 Bad Request (Plain HTTP to HTTPS): Ensure your Caddy reverse_proxy directive includes https:// before the address and the transport http { tls_insecure_skip_verify } block, as shown above.

## Conclusion

You should now have a fully functional Nextcloud instance running securely on your Oracle ARM server, accessible via https://nextcloud.yourdomain.com. By using Docker Compose and the LinuxServer.io image, the setup is relatively clean and leverages Caddy for easy SSL and reverse proxying. This private cloud gives you control over your files and provides a powerful platform for personal productivity and enhanced data science workflows through secure synchronization and collaboration. Enjoy exploring the features and apps Nextcloud has to offer!
