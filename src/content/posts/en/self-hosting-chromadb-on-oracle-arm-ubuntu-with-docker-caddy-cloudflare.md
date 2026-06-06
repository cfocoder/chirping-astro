---
title: 'Self-Hosting ChromaDB on Oracle ARM Ubuntu with Docker, Caddy & Cloudflare'
description: 'ChromaDB is a powerful open-source embedding database, essential for building AI applications involving semantic search, retrieval-augmented generation (RAG), and more. While Chroma offers a managed service, self-hosting provides greater control, privacy, and potentially...'
pubDate: 2025-04-08
heroImage: '/images/2025/04/chroma_logo.png'
heroImageAlt: 'chroma logo'
categories: ['Linux']
tags: []
toc: true
---

ChromaDB is a powerful open-source embedding database, essential for building AI applications involving semantic search, retrieval-augmented generation (RAG), and more. While Chroma offers a managed service, self-hosting provides greater control, privacy, and potentially lower costs, especially when leveraging free-tier resources like Oracle Cloud’s ARM VMs.

This guide details how to install and run ChromaDB on its own subdomain (chromadb.yourdomain.com) using Docker Compose on an Oracle Cloud ARM Ampere VM running Ubuntu 24.04. We’ll leverage a Block Volume for persistent storage, secure the installation with an API token, and use Caddy as a reverse proxy (managed outside Docker) with Cloudflare handling DNS and providing edge security/SSL.

**Our Stack:**

- Cloud Provider: Oracle Cloud Infrastructure (OCI)

- VM: ARM Ampere (Ubuntu 24.04)

- Storage: Boot Volume + OCI Block Volume (mounted at /mnt/myvolume)

- Containerization: Docker & Docker Compose

- Web Server/Reverse Proxy: Caddy (installed natively)

- DNS/Edge: Cloudflare

- Database: ChromaDB

**Prerequisites:**

- An Oracle Cloud ARM VM running Ubuntu 24.04 (or similar Debian-based ARM distro).

- SSH access to the VM with sudo privileges.

- Docker and Docker Compose installed and running.

- Caddy installed natively (not via Docker) and configured to serve your main domain (e.g., yourdomain.com).

- A domain name managed via Cloudflare.

- An OCI Block Volume attached and mounted (we’ll use /mnt/myvolume).

Let’s dive in!

## Step 1: Preparation (Token & Directories)

First, we need a secure token for ChromaDB’s API authentication and directories to store its configuration and persistent data.

- Generate a Secure Token:

```bash
# Generate a strong random token (store this securely!)
CHROMA_TOKEN=$(openssl rand -base64 32)
echo "Your ChromaDB API Token: $CHROMA_TOKEN"
# !!! IMPORTANT: Copy this token and save it somewhere safe !!!
# We'll refer to it as YOUR_STRONG_SECRET_TOKEN_HERE later.
```

2. **Create Directories:**
   We’ll place the Docker Compose file and ChromaDB’s data on the mounted block volume for persistence and space.

```bash
# Directory for Docker Compose configuration
sudo mkdir -p /var/www/html/chromadb_config

# Directory for ChromaDB persistent data
sudo mkdir -p /var/www/html/chromadb_data
```

## Step 2: Docker Compose Configuration

Navigate to the config directory and create the docker-compose.yml file.

```bash
cd /var/www/html/chromadb_config
sudo nano docker-compose.yml
```

Paste the following configuration. **Replace YOUR_STRONG_SECRET_TOKEN_HERE with the actual token you generated in Step 1.**

```yaml
version: '3.8' # Note: Version tag is becoming obsolete but harmless for now

services:
  chromadb:
    image: chromadb/chroma:latest # Use the official multi-arch image
    container_name: chromadb
    restart: unless-stopped
    volumes:
      # Persist data to your block volume
      - /var/www/html/chromadb_data:/chroma/chroma
    ports:
      # IMPORTANT: Bind only to localhost. Caddy will handle external access.
      - '127.0.0.1:8000:8000'
    environment:
      # Enable persistence mode
      - IS_PERSISTENT=TRUE
      # Configure Token Authentication
      - CHROMA_SERVER_AUTH_PROVIDER=chromadb.auth.token.TokenConfigServerAuthCredentialsProvider
      - CHROMA_SERVER_AUTH_CREDENTIALS_PROVIDER=chromadb.auth.token.TokenConfigServerAuthCredentialsProvider
      # Set the valid API token(s) - REPLACE THIS!
      - CHROMA_SERVER_AUTH_CREDENTIALS=YOUR_STRONG_SECRET_TOKEN_HERE
      # Allow ChromaDB resets via API (optional, set to FALSE for production safety)
      - ALLOW_RESET=TRUE
      # Disable anonymous telemetry (recommended)
      - CHROMA_OTEL_EXPORTER_TYPE=none
      # Optional: Set log level (e.g., INFO, DEBUG, WARNING, ERROR)
      # - CHROMA_LOG_LEVEL=INFO

# We removed the healthcheck as the V1 /heartbeat endpoint was deprecated
# in the 'latest' image we encountered. Monitor logs instead.
```

Save and close the file (Ctrl+O, Enter, Ctrl+X in nano).

## Step 3: Launch ChromaDB

Start the ChromaDB container using Docker Compose:

```bash
cd /var/www/html/chromadb_config
sudo docker compose up -d
```

Docker will pull the chromadb/chroma:latest image (which supports ARM64) and start the container in the background.

## Step 4: Initial Verification (Local)

Let’s ensure the container is running and check a known V2 API endpoint locally. Note that older V1 API endpoints (like /api/v1/heartbeat or /api/v1/collections) are deprecated or removed in recent versions and will return errors (like 410 Gone or 404 Not Found).

```bash
# Check container status
sudo docker compose ps

# Check logs for startup messages or errors
sudo docker compose logs -f chromadb

# Test the V2 version endpoint (should work without a token)
curl http://127.0.0.1:8000/api/v2/version
# Expected output: "1.0.0"% (or similar version string)

# Test an endpoint requiring authentication (without token - should fail 401)
# Example: Try listing tenants (replace with an actual V2 path if needed)
# curl -i http://127.0.0.1:8000/api/v2/tenants

# Test an endpoint requiring authentication (WITH token - should succeed)
# Example: Try getting default tenant info (requires your actual token)
# curl -i -H "X-Chroma-Token: YOUR_STRONG_SECRET_TOKEN_HERE" http://127.0.0.1:8000/api/v2/tenants/default_tenant
```

The key is getting a successful response from /api/v2/version.

## Step 5: Cloudflare DNS Setup

Now, point your desired subdomain (chromadb.yourdomain.com) to your server via Cloudflare.

- Log in to your Cloudflare dashboard.

- Select your domain (yourdomain.com).

- Go to the DNS -> Records section.

- Add a new record:

Type: A

- Name: chromadb (Cloudflare automatically appends .yourdomain.com)

- IPv4 address: Enter the public IP address of your Oracle VM (e.g., xxx.xxx.xxx.xxx).

- Proxy status: Ensure it’s set to Proxied (Orange Cloud). This enables Cloudflare’s benefits and allows Caddy to get SSL certificates easily.

- Save the record. Propagation is usually fast but can take a few minutes.

## Step 6: Caddy Reverse Proxy Configuration

Configure Caddy to handle incoming requests for chromadb.yourdomain.com, manage SSL, and forward traffic to the locally running ChromaDB container. We’ll also add a specific handler to show a blank page for the root URL, as ChromaDB doesn’t serve a webpage there by default.

- Edit your main Caddyfile (usually /etc/caddy/Caddyfile):

```text
sudo nano /etc/caddy/Caddyfile
```

2. Add the following block (adjust formatting/placement relative to your existing site blocks):

```text
# ----- Your other site configurations (e.g., yourdomain.com) -----
# ...

# ----- ChromaDB Configuration -----
chromadb.yourdomain.com {
    # Optional: Enable access logging
    log

    # Handle the root path specifically: return a blank 200 OK page
    # Prevents the default 404 error when visiting the base URL in a browser.
    handle / {
        respond "" 200 {
            close
        }
    }

    # For all other paths, proxy to the ChromaDB container.
    # The general 'handle' catches requests not matched above.
    handle {
        reverse_proxy localhost:8000
        # Optional: Add headers if needed, though Caddy's defaults are usually fine
        # header_up Host {http.request.host}
        # header_up X-Real-IP {http.request.remote.ip}
        # header_up X-Forwarded-For {http.request.remote.ip}
        # header_up X-Forwarded-Proto {http.request.scheme}
    }

    # Caddy automatically handles HTTPS via Let's Encrypt/ZeroSSL
}

# ----- Other subdomain configurations -----
# ...
```

3. Validate and Reload Caddy:

```bash
sudo caddy validate --config /etc/caddy/Caddyfile
# If validation is successful:
sudo systemctl reload caddy
# Check status if needed: sudo systemctl status caddy
```

## Step 7: Public Verification

Test access from your local machine (not the VM) using the public URL.

```bash
# Test V2 version endpoint publicly (should succeed)
curl https://chromadb.yourdomain.com/api/v2/version
# Expected output: "1.0.0"%

# Test an authenticated endpoint publicly (replace token)
# curl -i -H "X-Chroma-Token: YOUR_STRONG_SECRET_TOKEN_HERE" https://chromadb.yourdomain.com/api/v2/tenants/default_tenant

# Visit https://chromadb.yourdomain.com/ in your browser
# You should see a blank page (due to our Caddy handle / rule)
# and a valid HTTPS connection (padlock icon).
```

## Step 8: Python Client Usage Example

Here’s how to connect and interact with your self-hosted ChromaDB instance using the official Python client. Make sure you have it installed (pip install chromadb-client).

````python
import chromadb
from chromadb.config import Settings
import traceback

# ==> REPLACE THIS WITH YOUR ACTUAL TOKEN While client libraries are usually easier, you might need to interact with the API directly (e.g., from shell scripts or other languages). The API structure follows /api/v2/tenants/{tenant}/databases/{database}/…. Always include your token via the X-Chroma-Token header. You can explore all endpoints via https://chromadb.yourdomain.com/openapi.json (use your token).

Here are some common examples using curl and default tenant/database:

**List Collections:**

```bash
curl -H "X-Chroma-Token: YOUR_STRONG_SECRET_TOKEN_HERE" \
  "https://chromadb.yourdomain.com/api/v2/tenants/default_tenant/databases/default_database/collections"
````

**Create Collection:**

```bash
curl -X POST \
  -H "X-Chroma-Token: YOUR_STRONG_SECRET_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{"name": "my_curl_collection", "get_or_create": true}' \
  "https://chromadb.yourdomain.com/api/v2/tenants/default_tenant/databases/default_database/collections"
```

_(You’ll need the UUID returned by this command for subsequent operations on this specific collection)_

**Add Records (replace {COLLECTION_UUID}):**

```bash
curl -X POST \
  -H "X-Chroma-Token: YOUR_STRONG_SECRET_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{"ids": ["c_id1"], "documents": ["Added via curl"]}' \
  "https://chromadb.yourdomain.com/api/v2/tenants/default_tenant/databases/default_database/collections/{COLLECTION_UUID}/add"
```

**Count Records (replace {COLLECTION_UUID}):**

```bash
curl -H "X-Chroma-Token: YOUR_STRONG_SECRET_TOKEN_HERE" \
  "https://chromadb.yourdomain.com/api/v2/tenants/default_tenant/databases/default_database/collections/{COLLECTION_UUID}/count"
```

## Troubleshooting Tips

- Connection Refused: Check if the Docker container is running (sudo docker ps). Ensure Caddy is running (sudo systemctl status caddy) and proxying to localhost:8000. Check VM firewall rules (though OCI default Ubuntu images often allow all egress and necessary ingress if security lists are open).

- 401 Unauthorized: Double-check your X-Chroma-Token header and ensure the token matches the one in docker-compose.yml.

- 404 Not Found (API): Verify the API path is correct for V2. Use curl -H “X-Chroma-Token: …” https://chromadb.yourdomain.com/openapi.json to get the definitive list of paths.

- 404 Not Found (Browser): If you see this instead of a blank page at https://chromadb.yourdomain.com/, ensure the handle / { respond “” 200 } block is correctly placed before the reverse_proxy in your Caddyfile and that Caddy was reloaded.

- 5xx Errors: Check Caddy logs (sudo journalctl -u caddy -f) and ChromaDB container logs (sudo docker compose logs chromadb) for specific error messages.

- Permission Denied (Volumes): If the container fails to start with volume errors, ensure the directories (/var/www/html/chromadb_data) exist. Docker usually handles permissions, but sudo chown -R 1001:1001 /var/www/html/chromadb_data (or the relevant UID/GID if different) might be needed in rare cases.

## Conclusion

You now have a secure, persistent, self-hosted ChromaDB instance running on cost-effective Oracle Cloud ARM infrastructure! It’s accessible via its own subdomain with HTTPS handled by Caddy and Cloudflare. You can interact with it using client libraries like Python or directly via its V2 HTTP API. Happy embedding!
