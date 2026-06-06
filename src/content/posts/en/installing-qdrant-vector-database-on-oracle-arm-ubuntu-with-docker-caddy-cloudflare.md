---
title: "Installing Qdrant Vector Database on Oracle ARM Ubuntu with Docker, Caddy & Cloudflare"
description: "This guide details how to install the Qdrant vector database on an Oracle Cloud Infrastructure (OCI) ARM Ampere VM running Ubuntu 24.04. We’ll use Docker Compose for easy management, Caddy as a secure reverse proxy with automatic SSL, and store Qdrant’s data on a..."
pubDate: 2025-03-30
categories: ["Linux"]
tags: []
toc: true
---

This guide details how to install the Qdrant vector database on an Oracle Cloud Infrastructure (OCI) ARM Ampere VM running Ubuntu 24.04. We’ll use Docker Compose for easy management, Caddy as a secure reverse proxy with automatic SSL, and store Qdrant’s data on a persistent OCI Block Volume. We’ll also configure it to run on its own subdomain (e.g., qdrant.yourdomain.com) and restrict access to its dashboard while securing the API.

This setup specifically addresses challenges when running behind Cloudflare’s proxy (orange cloud).

**Our Setup:**

- Server: Oracle Cloud ARM Ampere VM (Ubuntu 24.04)

- Storage: OCI Boot Volume + OCI Block Volume mounted at /mnt/myvolume

- Containerization: Docker & Docker Compose

- Web Server/Proxy: Caddy (with automatic HTTPS via Let’s Encrypt/ZeroSSL)

- CDN/Proxy: Cloudflare (Orange Cloud Enabled)

- Goal: Run Qdrant on qdrant.yourdomain.com, store data on /mnt/myvolume, restrict UI access by IP, and secure the API.

**Prerequisites:**

- An Oracle Cloud ARM Ubuntu 24.04 VM (or similar ARM server).

- Docker and Docker Compose installed.

- Caddy installed and configured to serve your main domain (e.g., yourdomain.com).

- A domain name (yourdomain.com) managed through Cloudflare (or another DNS provider).

- DNS record for qdrant.yourdomain.com pointing to your server’s public IP.

- Cloudflare proxy (orange cloud) enabled for qdrant.yourdomain.com. Ensure Cloudflare SSL/TLS mode is set to “Full (Strict)”.

- An OCI Block Volume (or other persistent storage) mounted, for example, at /mnt/myvolume.

- SSH access and sudo privileges on your server.

## Table of Contents

- Step 1: Prepare Directories

- Step 2: Create the Docker Compose File

- Step 3: Configure Caddy

- Step 4: Apply Caddy Configuration

- Step 5: Start Qdrant

- Step 6: Verification and Testing

- Step 7: Example of loading a Collection from a Snapshot

- Conclusion

## Step 1: Prepare Directories

We need directories to store the Qdrant configuration (docker-compose.yml) and its persistent data on the block volume.

```bash
# Create a directory for the Qdrant service configuration (e.g., in your home directory)
mkdir ~/qdrant
cd ~/qdrant

# Create directories on the block volume for Qdrant's persistent data
sudo mkdir -p /var/www/html/qdrant/storage

# Create a directory to store snapshots loaded through Python code
sudo mkdir -p /var/www/html/qdrant_snapshots 
```

## Step 2: Create the Docker Compose File

In the ~/qdrant directory, create a file named docker-compose.yml. This file defines the Qdrant service.

```text
sudo nano /var/www/html/qdrant/docker-compose.yml
```

Paste the following configuration, **making sure to generate and replace YOUR_VERY_STRONG_SECRET_KEY_HERE**:

```yaml
# ~/qdrant/docker-compose.yml
services:
  qdrant:
    image: qdrant/qdrant:latest # Official image with ARM64 support
    container_name: qdrant_service
    restart: unless-stopped
    ports:
      # IMPORTANT: Expose ports ONLY to the host machine (localhost)
      # Caddy will handle external access.
      - "127.0.0.1:6333:6333" # REST API & Web UI port
      - "127.0.0.1:6334:6334" # gRPC port
    volumes:
      # Mount persistent storage from the block volume
      - /var/www/html/qdrant/storage:/qdrant/storage
      # --- Add this line to mount the snapshot directory ---
      - /var/www/html/qdrant_snapshots:/qdrant/snapshots # Map host snapshot dir to container path
    environment:
      # --- Secure the API! Generate a strong key and paste it below ---
      QDRANT__SERVICE__API_KEY: "YOUR_VERY_STRONG_SECRET_KEY_HERE"
      # You can optionally add a read-only key too:
      # QDRANT__SERVICE__READ_ONLY_API_KEY: "YOUR_READ_ONLY_KEY_HERE"

networks:
  default:
    name: qdrant_network # Optional: Define a specific network
```

**Key Points:**

- image: qdrant/qdrant:latest: Uses the official multi-arch image, compatible with ARM.

- ports: We map Qdrant’s ports 6333 (REST/UI) and 6334 (gRPC) only to 127.0.0.1 (localhost) on the host. This prevents direct external access to Qdrant; all traffic must go through Caddy.

- volumes: Maps the directory we created on the block volume (/var/www/html/qdrant/storage) to Qdrant’s internal storage path (/qdrant/storage). This ensures your vector data persists if the container restarts.

- environment.QDRANT__SERVICE__API_KEY: Crucial for security. This enables Qdrant’s built-in API key authentication. Generate a strong key (e.g., using openssl rand -hex 32) and replace the placeholder.

Save and close the file (Ctrl+X, Y, Enter).

## Step 3: Configure Caddy

Now, we’ll edit the main Caddy configuration file (usually /etc/caddy/Caddyfile) to add the qdrant.yourdomain.com subdomain and set up the reverse proxy with access control.

```text
sudo nano /etc/caddy/Caddyfile
```

Add the following block **before** your main domain’s configuration. Replace qdrant.yourdomain.com with your actual subdomain and YOUR.ALLOWED.IP.1, YOUR.ALLOWED.IP.2 with the public IP addresses you want to grant dashboard access to.

```text
# Global options (example)
{
        email your-email@example.com
}

# Qdrant Service (Reverse Proxy)
qdrant.yourdomain.com {
        encode zstd gzip
        log

        # --- Access Control Matcher ---
        # This matcher defines the conditions under which access to the dashboard should be BLOCKED.
        @block_dashboard_access {
                # Condition 1: Affects only the dashboard paths
                path /dashboard /dashboard/*

                # Condition 2 & 3: Check the Cloudflare header directly.
                # Block if the CF-Connecting-IP header is NOT one of the allowed IPs.
                # Replace with your actual allowed public IP(s). Add more 'not header' lines if needed.
                not header CF-Connecting-IP 127.0.0.1         # Allow localhost access (optional)
                not header CF-Connecting-IP YOUR.ALLOWED.IP.1
                # not header CF-Connecting-IP YOUR.ALLOWED.IP.2 # Example for a second IP
        }

        # --- Routing Logic ---
        route {
                # 1. If the request matches @block_dashboard_access (dashboard path AND not an allowed IP header)...
                handle @block_dashboard_access {
                        # ...then block it with a 403 Forbidden response.
                        respond "Access Denied from your IP (Header Check)" 403
                }

                # 2. For ALL OTHER requests (API calls, OR dashboard access with an allowed IP header)...
                handle {
                        # ...proxy the request to the Qdrant container running on localhost.
                        reverse_proxy 127.0.0.1:6333 {
                                # Define Cloudflare IPs as trusted for *this handler*.
                                # This helps ensure logging/headers passed upstream are correct,
                                # even though our primary access control uses the header matcher above.
                                trusted_proxies 173.245.48.0/20 103.21.244.0/22 103.22.200.0/22 103.31.4.0/22 141.101.64.0/18 108.162.192.0/18 190.93.240.0/20 188.114.96.0/20 197.234.240.0/22 198.41.128.0/17 162.158.0.0/15 104.16.0.0/13 104.24.0.0/14 172.64.0.0/13 131.0.72.0/22 2400:cb00::/32 2606:4700::/32 2803:f800::/32 2405:b500::/32 2405:8100::/32 2c0f:f248::/32 2a06:98c0::/29
                        }
                }
        }

        # --- Standard Security Headers ---
        header {
                Strict-Transport-Security max-age=31536000;
                X-Content-Type-Options nosniff
                X-Frame-Options DENY
                Referrer-Policy strict-origin-when-cross-origin
                -Server # Hide Caddy Server signature
        }
}

# --- Your Main Domain Config (Example: WordPress) ---
yourdomain.com {
        # ... your existing configuration for the main domain...
        # Make sure trusted_proxies is defined appropriately here too, e.g., inside php_fastcgi
        # Example:
        # php_fastcgi unix//run/php/php8.3-fpm.sock {
        #       trusted_proxies 173.245.48.0/20 ... (full list) ... 2a06:98c0::/29
        # }
}

# --- Other subdomain configurations ---
# ...
```

**Explanation of the Caddy Configuration:**

- Basic Setup: encode enables compression, log enables access logging, header sets security headers.

- Access Control Goal: We want to restrict access to the /dashboard path based on the visitor’s IP, but allow API access (which will be protected by the Qdrant API Key).

- The Cloudflare Challenge: When using Cloudflare’s proxy, the direct connection IP Caddy sees (remote_ip) belongs to Cloudflare, not the actual visitor. We need Caddy to look at the visitor’s real IP, typically found in headers like CF-Connecting-IP or X-Forwarded-For.

- Why client_ip Didn’t Work (Initially): We tried using Caddy’s client_ip matcher, which is supposed to resolve the real IP using trusted_proxies. However, in this route block structure, the matcher (@block_dashboard_access) seemed to be evaluated before the request context was fully updated by the trusted_proxies setting defined later within the specific reverse_proxy handler. This resulted in the matcher still seeing the Cloudflare IP.

- The header CF-Connecting-IP Solution: To bypass this timing/context issue, we directly check the value of the CF-Connecting-IP header. This header is reliably added by Cloudflare and contains the visitor’s original IP. The @block_dashboard_access matcher now checks the path (/dashboard/*) and ensures the CF-Connecting-IP header value is NOT one of the explicitly allowed IPs.

- route and handle: The route block allows conditional request handling.

The first handle @block_dashboard_access catches requests matching the “block” conditions (dashboard path from a non-allowed IP header) and sends a 403 Forbidden response.

- The second handle (with no matcher) catches everything else (API calls, or dashboard access from an allowed IP header) and proxies it to the Qdrant container using reverse_proxy.

- trusted_proxies inside reverse_proxy: Although our primary access control now uses the header check, we still include the trusted_proxies list inside the reverse_proxy block. This is good practice as it allows the reverse proxy handler itself to correctly identify the client IP for its own purposes (like setting X-Forwarded-For headers correctly for the upstream Qdrant service, or for potential future logging needs).

## Step 4: Apply Caddy Configuration

Format, validate, and reload Caddy to apply the changes:

```bash
# Optional: Format the Caddyfile for readability
sudo caddy fmt --overwrite /etc/caddy/Caddyfile

# Validate the configuration
sudo caddy validate --config /etc/caddy/Caddyfile

# Reload Caddy service (only if validation succeeds)
sudo systemctl reload caddy

# Check Caddy status (optional)
sudo systemctl status caddy
```

## Step 5: Start Qdrant

Navigate back to your Qdrant configuration directory and start the container using Docker Compose in detached mode (-d).

```bash
cd /var/www/html/qdrant/
docker compose up -d
```

Docker will pull the image (if needed) and start the Qdrant container.

## Step 6: Verification and Testing

- Check Container: Ensure the container is running: docker ps (look for qdrant_service).

- Check Logs: Check for errors during startup: docker logs qdrant_service.

- Test Dashboard Access (Allowed IP): From one of the IPs you listed in the Caddyfile (YOUR.ALLOWED.IP.1, etc.), open https://qdrant.yourdomain.com/dashboard in your browser. It should load.

- Test Dashboard Access (Disallowed IP): From a different IP address (e.g., using a VPN or mobile hotspot), try accessing https://qdrant.yourdomain.com/dashboard. You should receive the “Access Denied from your IP (Header Check)” message.

- Test API Access (No Key): From any IP, try accessing an API endpoint like https://qdrant.yourdomain.com/collections using curl or a browser. You should receive an error (likely 401 Unauthorized or 403 Forbidden) because you haven’t provided the API key.curl -v https://qdrant.yourdomain.com/collections

- Test API Access (With Key): Use curl and provide the API key you set in docker-compose.yml:

```bash
curl https://qdrant.yourdomain.com/collections \
  -H "api-key: YOUR_VERY_STRONG_SECRET_KEY_HERE" \
  -H "Content-Type: application/json"
```

This command should succeed and return JSON (likely showing an empty list of collections initially).

**Note on Dashboard Functionality:** Since we enabled the API key, the web dashboard loaded from an allowed IP might appear empty or show errors when trying to list collections. This is because the UI itself isn’t configured out-of-the-box to use your API key when making background requests to the Qdrant API. Your backend applications, however, *can* use the key to interact fully with the API.

## Step 7: Example of loading a Collection from a Snapshot

```python
import os
from pathlib import Path
from qdrant_client import QdrantClient, models
from qdrant_client.http.exceptions import UnexpectedResponse
import warnings

# --- Configuration ---
QDRANT_HOST = "localhost"
QDRANT_PORT = 6333
COLLECTION_NAME_TO_RECOVER = "Wolt Food"
QDRANT_API_KEY = "MY_SUPER_DIFFICULT_API_KEY" # Use your actual key

# --- Filename of the snapshot (must be in /var/www/html/qdrant_snapshots on host) ---
SNAPSHOT_FILENAME = "wolt-clip-ViT-B-32-2446808438011867-2023-12-14-15-55-26.snapshot" # Use your actual filename

# --- Path TO THE SNAPSHOT FILE *INSIDE* THE CONTAINER ---
SNAPSHOT_CONTAINER_PATH = f"/qdrant/snapshots/{SNAPSHOT_FILENAME}"
SNAPSHOT_URI = f"file://{SNAPSHOT_CONTAINER_PATH}"

# --- Set a longer timeout (in seconds) ---
CLIENT_TIMEOUT = 600 # 10 minutes - ADJUST IF NEEDED

print(f"Attempting server-side recovery using snapshot URI: {SNAPSHOT_URI}")
print(f"(Ensure snapshot file '{SNAPSHOT_FILENAME}' exists in '/var/www/html/qdrant_snapshots' on the host machine)")

# --- Step 1: Connect to Qdrant ---
print(f"\nAttempting to connect to Qdrant at {QDRANT_HOST}:{QDRANT_PORT} using HTTP (Timeout: {CLIENT_TIMEOUT}s)...")
client = None
try:
    client = QdrantClient(
        host=QDRANT_HOST,
        port=QDRANT_PORT,
        api_key=QDRANT_API_KEY,
        https=False, # Connect via HTTP
        timeout=CLIENT_TIMEOUT # This Python script successfully loads a Qdrant collection from a snapshot file, specifically addressing challenges when Qdrant runs within a Docker container where direct client-side uploads might face issues. The core strategy involves initiating a **server-side recovery**. This requires two key parts: first, ensuring the snapshot file is accessible *inside* the Qdrant container by adding a Docker volume mount in your docker-compose.yml (e.g., mapping a host directory like /var/www/html/qdrant_snapshots to /qdrant/snapshots within the container, ensuring this mount has write permissions for Qdrant’s temporary operations). Second, the Python code specifies the snapshot’s location using a file:// URI that points to the **absolute path *within the container*** (e.g., location=’file:///qdrant/snapshots/your_snapshot.snapshot’). Crucially, the QdrantClient is initialized not only with the correct host, port, and api_key (if used), but also explicitly sets https=False (for plain HTTP connections typical in local Docker setups) and includes a significantly increased timeout value (e.g., timeout=600 seconds) to prevent the client from prematurely disconnecting while the server performs the potentially lengthy recovery operation instructed by wait=True in the recover_snapshot call.

## Conclusion

You have successfully installed Qdrant on your Oracle ARM Ubuntu server using Docker Compose, with data stored persistently on a block volume. Caddy provides a secure reverse proxy with automatic SSL, and access is controlled:

- The Qdrant dashboard (/dashboard) is only accessible from specific IP addresses (verified via the Cloudflare CF-Connecting-IP header).

- All Qdrant API endpoints require a valid API key for interaction.

This layered approach provides robust security for your vector database deployment. Remember to keep your API keys secure and configure your client applications accordingly.
