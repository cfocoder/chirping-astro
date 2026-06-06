---
title: "Installing n8n with Docker Compose and Caddy on Ubuntu"
description: "Workflow automation tools are incredibly powerful, and n8n is a fantastic open-source, self-hostable option. It allows you to connect various apps and services to automate tasks visually."
pubDate: 2025-03-21
categories: ["Linux"]
tags: []
toc: true
---

Workflow automation tools are incredibly powerful, and [n8n](https://www.google.com/url?sa=E&q=https%3A%2F%2Fn8n.io%2F) is a fantastic open-source, self-hostable option. It allows you to connect various apps and services to automate tasks visually.

This guide walks through installing n8n on its own subdomain (e.g., https://n8n.yourdomain.com) using Docker Compose. We’ll leverage an existing Caddy reverse proxy (running directly on the host) for handling HTTPS and use a separate block volume for persistent storage. This setup was performed on an Oracle Cloud ARM Ubuntu 24.04 VM, but the steps are broadly applicable to similar environments.

**Our Setup:**

- Server: Ubuntu 24.04 (ARM architecture)

- Web Server/Proxy: Caddy v2 (running as a systemd service directly on the host)

- Containerization: Docker and Docker Compose

- Storage: Boot volume + separate Block Volume mounted at /mnt/myvolume

- Domain & DNS: yourdomain.com managed via Cloudflare (optional, but used here)

- Goal: Run n8n accessible at https://n8n.yourdomain.com, with data stored on /mnt/myvolume.

**Prerequisites:**

- An Ubuntu server with sudo access.

- Docker and Docker Compose installed.

- Caddy installed and running as a service on the host (e.g., via systemctl). Caddy should already be configured to handle SSL for your main domain.

- A domain name (yourdomain.com) pointed to your server’s IP.

- (Optional but Recommended) A separate persistent storage volume mounted (e.g., /mnt/myvolume).

- (Optional) Cloudflare managing your DNS for easy setup and potential performance/security benefits.

## Table of Contents

- Step 1: DNS Configuration

- Step 2: Prepare Directories on Persistent Storage

- Step 3: Create the Docker Compose File

- Step 4: Configure Caddy Reverse Proxy

- Step 5: Start the n8n Container

- Step 6: Verify and Access n8n

- Step 7: Initial n8n Setup

- Conclusion

## Step 1: DNS Configuration

First, we need to tell the internet where n8n.yourdomain.com lives.

- Log in to your DNS provider (e.g., Cloudflare).

- Go to the DNS management section for yourdomain.com.

- Add a new DNS record:

Type: A

- Name: n8n (your provider will likely append .yourdomain.com automatically)

- IPv4 Address: Your server’s public IP address (xxx.xxx.xxx.xxx)

- Proxy status (Cloudflare specific): Set to Proxied (Orange Cloud) if using Cloudflare. This enables Cloudflare’s features and works well with Caddy handling SSL on the origin server.

- Save the record. DNS changes can take a few minutes to propagate.

## Step 2: Prepare Directories on Persistent Storage

We want n8n’s configuration and data to survive container restarts and updates. Let’s create dedicated directories on our block volume.

```bash
# Create a parent directory for the n8n application
sudo mkdir -p /var/www/html/n8n

# Create the subdirectory for n8n's persistent data
sudo mkdir -p /var/www/html/n8n/data

# Set ownership for the data directory. n8n runs as user ID 1000 inside the container.
sudo chown 1000:1000 /var/www/html/n8n/data

# Optional: Change ownership of the parent directory to your user for easier file management
sudo chown $USER:$USER /var/www/html/n8n
```

## Step 3: Create the Docker Compose File

Docker Compose makes managing multi-container applications easier, although here we only have one container for n8n itself.

- Navigate to the application directory:

```bash
cd /var/www/html/n8n
```

2. Create a docker-compose.yml file:

```text
nano docker-compose.yml
```

3. Paste the following configuration:

```yaml
# version: '3.7' # Version tag is optional in newer Compose versions
services:
  n8n:
    # Use the official n8n image (supports ARM64)
    image: n8nio/n8n
    container_name: n8n
    restart: unless-stopped
    volumes:
      # Mount the persistent data directory we created earlier
      - /var/www/html/n8n/data:/home/node/.n8n
    environment:
      # IMPORTANT: Set your correct timezone! Find yours: https://en.wikipedia.org/wiki/List_of_tz_database_time_zones
      - TZ=Etc/UTC # Example: America/Mexico_City, Europe/London
      # This URL is crucial for webhooks triggered from external services
      - WEBHOOK_URL=https://n8n.yourdomain.com/
      # Optional: uncomment if executing workflows with custom code/scripts
      # - EXECUTIONS_PROCESS=main
    ports:
      # Map n8n's internal port 5678 ONLY to the host's localhost interface.
      # Caddy (running on the host) will connect to this.
      - "127.0.0.1:5678:5678"

# Note: We do NOT define Docker networks here, as Caddy runs on the host,
# not in a container sharing a Docker network with n8n.
```

4. **Important:** Adjust the TZ (Timezone) environment variable to your local timezone.

5. Save the file (Ctrl+X, then Y, then Enter in nano).

- 

## Step 4: Configure Caddy Reverse Proxy

Now, let’s tell Caddy how to handle requests for n8n.yourdomain.com.

- Edit your main Caddy configuration file (usually /etc/caddy/Caddyfile):

```text
sudo nano /etc/caddy/Caddyfile
```

2. Add a new block for your n8n subdomain. Make sure it’s placed correctly relative to any other domain configurations you have.

```text
# ... (any global options at the top) ...

n8n.yourdomain.com {
    # Enable compression
    encode zstd gzip

    # Proxy requests to the n8n container listening on localhost:5678
    reverse_proxy 127.0.0.1:5678 {
       # Set essential headers for n8n to work correctly behind a proxy
       header_up Host {host}
       header_up X-Real-IP {remote_ip}
       header_up X-Forwarded-For {remote_ip}
       header_up X-Forwarded-Proto {scheme}
    }

    # Optional but recommended: Security Headers
    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
        X-Frame-Options "SAMEORIGIN"
        X-Content-Type-Options "nosniff"
        Referrer-Policy "strict-origin-when-cross-origin"
        # Permissions-Policy "..." # Add if needed
        # Content-Security-Policy "..." # Add if needed, requires careful tuning
    }
}

# ... (your existing block for yourdomain.com, etc.) ...
```

3. **Crucially**, ensure the reverse_proxy target is 127.0.0.1:5678. Since Caddy is running directly on the host, it connects to the port we exposed on the host’s localhost interface in the docker-compose.yml.

4. Save the Caddyfile.

5. Reload Caddy to apply the changes:

```bash
sudo systemctl reload caddy
```

6. You can check Caddy’s status: sudo systemctl status caddy. Caddy should automatically obtain an SSL certificate for n8n.yourdomain.com.

## Step 5: Start the n8n Container

With everything configured, let’s start n8n.

- Make sure you are in the directory containing your docker-compose.yml file:

```bash
cd /var/www/html/n8n
```

2. Start the service in detached (background) mode:

```bash
docker compose up -d
```

Docker will pull the n8n image if it’s not already downloaded and then start the container.

## Step 6: Verify and Access n8n

Let’s ensure everything is running as expected.

- Check the running Docker containers:

```bash
docker ps
```

Look for the n8n container. Critically, check the PORTS column. It **must** show 127.0.0.1:5678->5678/tcp. If it only shows 5678/tcp, the ports: section in your docker-compose.yml is incorrect or wasn’t applied (run docker compose down and docker compose up -d again after fixing the file).

2. Check the n8n container logs for any startup errors:

```bash
docker compose logs -f n8n
```

(Press Ctrl+C to exit logs). Look for a line like n8n ready on 0.0.0.0, port 5678.

3. Check Caddy logs for proxy errors (if needed):

```text
sudo journalctl -u caddy -f --since "5 minutes ago"
```

4. Open your web browser and navigate to https://n8n.yourdomain.com.

## Step 7: Initial n8n Setup

If everything went well, you should see the n8n setup screen. It will prompt you to create an “owner” account. Choose a strong password – this account has full control over your n8n instance.

**(Optional) Cloudflare SSL/TLS Mode**

If using Cloudflare, ensure your SSL/TLS encryption mode (under the “SSL/TLS” -> “Overview” tab in Cloudflare) is set to **Full** or **Full (Strict)**. **Do not** use Flexible, as Caddy is handling SSL on your origin server.

## Conclusion

You now have a fully functional, self-hosted n8n instance running securely via Docker Compose and Caddy! Its data is safely stored on your persistent volume, ready for you to start building powerful automation workflows. Remember to keep your server, Docker, Caddy, and n8n updated for security and new features. Happy automating!
