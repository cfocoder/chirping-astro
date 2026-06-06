---
title: 'Deploying Flowise on a Secured Subdomain with Caddy, Docker, and Oracle ARM VM'
description: 'Introduction: Empowering Analysts and Automating with Flowise & n8n'
pubDate: 2025-05-19
heroImage: '/images/2025/05/flowise_logo.png'
heroImageAlt: 'flowise logo'
categories: ['Cloud']
tags: []
toc: true
---

**Introduction: Empowering Analysts and Automating with Flowise & n8n**

In the rapidly evolving landscape of AI, tools like Flowise are democratizing access to powerful Large Language Model (LLM) capabilities. Flowise offers a user-friendly, drag-and-drop interface to build customized LLM flows, making it an invaluable asset for professionals across various domains. For **financial analysts**, Flowise can streamline tasks such as summarizing lengthy financial reports, extracting key metrics from unstructured text, performing sentiment analysis on market news, or even building Q&A bots trained on specific regulatory documents. Imagine quickly building a tool that answers complex queries about a company’s 10-K filing or a bot that provides instant summaries of analyst calls.

For **data scientists**, Flowise accelerates the prototyping and deployment of LLM-powered applications. It allows for easy experimentation with different models, prompts, and data sources (like vector databases) without extensive coding. This means faster iteration cycles for tasks like text classification, generation, and building sophisticated conversational AI. Furthermore, Flowise integrates seamlessly with automation platforms like **n8n**. Flowise exposes API endpoints for its chatflows. n8n, a workflow automation tool, can call these APIs, enabling powerful chained automations. For instance, n8n could fetch new customer support tickets, send their content to a Flowise chatflow for summarization and categorization, and then route the processed information to the appropriate team or update a CRM – all automatically.

This guide will walk you through installing Flowise on its own secured subdomain using Docker Compose, with Caddy as a reverse proxy, on an Oracle ARM Ubuntu 24.04 VM. We’ll ensure data persistence using an Oracle Block Volume and secure the Flowise instance.

**Prerequisites:**

- An Oracle ARM Ubuntu 24.04 VM.

- A registered domain name (e.g., yourdomain.com) managed via Cloudflare.

- Caddy (v2) installed directly on the VM (not in Docker).

- Docker and Docker Compose installed on the VM.

- A Block Volume attached and mounted to the VM (e.g., at /mnt/myvolume).

- Your VM’s public IP address (let’s refer to it as YOUR_PUBLIC_VM_IP).

- Basic familiarity with the Linux command line.

**Our Goal:** Install Flowise on https://flowise.yourdomain.com, with data stored on the block volume, and secured with a token.

## Table of Contents

- Step 1: DNS Configuration (Cloudflare)

- Step 2: Prepare Data Directory on Block Volume

- Step 3: Generate Security Credentials

- Step 4: Create Docker Compose File for Flowise

- Step 5: Configure Caddy

- Step 6: Start Flowise and Initial Verification

- Step 7: Final Verification & Access

- Troubleshooting & Tips

- Conclusion

## Step 1: DNS Configuration (Cloudflare)

- Log in to your Cloudflare dashboard.

- Select your domain (yourdomain.com).

- Navigate to the “DNS” records section.

- Add a new A record:

Type: A

- Name: flowise (Cloudflare will append .yourdomain.com)

- IPv4 address: YOUR_PUBLIC_VM_IP

- Proxy status: Proxied (orange cloud). This is recommended.

- Click “Save”. Allow a few minutes for DNS propagation.

## Step 2: Prepare Data Directory on Block Volume

We’ll store Flowise’s persistent data (database, configurations, chatflows) on your block volume.

- Create a dedicated directory for Flowise data:

```bash
sudo mkdir -p /var/www/html/flowise_data
```

2. Create a directory to store the Docker Compose configuration (optional, but good for organization):

```bash
sudo mkdir -p /var/www/html/flowise_config # Or your preferred location like ~/flowise
cd /var/www/html/flowise_config
```

## Step 3: Generate Security Credentials

Flowise can be secured with basic authentication for the UI and an API key for programmatic access. It also benefits from a secret key for encrypting credentials stored within Flowise.

- Generate FLOWISE_USERNAME and FLOWISE_PASSWORD:

Choose a memorable username, e.g., flowise_admin.

- Generate a strong password. You can use a password manager or a command like:

```text
openssl rand -base64 24
```

**2. Generate API_KEY:**
This key protects your Flowise API endpoints.

```text
openssl rand -hex 32
```

3. **Generate FLOWISE_SECRET_KEY_OVERWRITE:**
   This key is used by Flowise to encrypt sensitive data it stores (like API keys for third-party services you use in your flows).

```text
openssl rand -base64 48
```

**Important:** Store these generated credentials securely. You’ll need them for the next step.

## Step 4: Create Docker Compose File for Flowise

Navigate to the directory you created for the Docker Compose file (e.g., /var/www/html/flowise_config or /var/www/html/flowise).

Create a docker-compose.yml file:

```text
sudo nano docker-compose.yml
```

Paste the following content, **replacing the placeholder credentials with the ones you just generated**. We’ll use host port 3002 in this example, assuming it’s free. If 3002 is taken, choose another unused port (e.g., 3003, 3004, etc.) and use it consistently.

```yaml
# version: '3.8'

services:
  flowise:
    image: flowiseai/flowise:latest # Multi-arch, ARM64 compatible
    container_name: flowise
    restart: unless-stopped
    ports:
      - '127.0.0.1:3002:3000' # Host port 3002 (or your chosen free port) -> Container port 3000
    volumes:
      - /var/www/html/flowise_data:/root/.flowise # Persist Flowise data
    environment:
      # --- BASIC AUTHENTICATION (for UI access) ---
      FLOWISE_USERNAME: 'your_flowise_admin_username' # Replace with your chosen username
      FLOWISE_PASSWORD: 'YourGeneratedStrongPassword!' # Replace with your generated password

      # --- API KEY (for programmatic access) ---
      API_KEY: 'YourGeneratedHexAPIKey' # Replace with your generated API_KEY

      # --- RECOMMENDED FOR SECURITY ---
      FLOWISE_SECRET_KEY_OVERWRITE: 'YourGeneratedBase64SecretKey' # Replace with your generated FLOWISE_SECRET_KEY_OVERWRITE

      # --- OPTIONAL ---
      # DEBUG: "true"
      # LOG_LEVEL: "debug"
    networks:
      - flowise_network

networks:
  flowise_network:
    driver: bridge
```

Save and close the file (Ctrl+X, then Y, then Enter in nano).

_Note on ports_: 127.0.0.1:3002:3000 means Flowise will only be accessible on port 3002 from the VM itself (localhost). Caddy will handle public access.\*

## Step 5: Configure Caddy

Edit your Caddyfile, typically located at /etc/caddy/Caddyfile:

```text
sudo nano /etc/caddy/Caddyfile
```

Add a new block for Flowise. Ensure the reverse_proxy port matches the host port you defined in docker-compose.yml (e.g., 3002).

```text
# ... your existing Caddy configurations ...

flowise.yourdomain.com {
    encode gzip zstd

    log

    # Reverse proxy to the Flowise Docker container
    # Make sure 127.0.0.1:3002 matches the host port in your docker-compose.yml
    reverse_proxy 127.0.0.1:3002 {
        header_up Host {http.request.host}
    }

    # Optional: Security headers
    header {
        Strict-Transport-Security "max-age=31536000;"
        X-Frame-Options "SAMEORIGIN"
        X-Content-Type-Options "nosniff"
        X-XSS-Protection "1; mode=block"
        Referrer-Policy "strict-origin-when-cross-origin"
    }
}

# ... any other configurations ...
```

Save and close the Caddyfile.

Format, validate, and reload Caddy:

```bash
sudo caddy fmt --overwrite /etc/caddy/Caddyfile
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
sudo systemctl status caddy # Check for errors
```

## Step 6: Start Flowise and Initial Verification

- Navigate to the directory containing your docker-compose.yml file (e.g., /var/www/html/flowise_config or /var/www/html/flowise).

- Start the Flowise container in detached mode:

```bash
sudo docker compose up -d
```

3. Check if the container is running:

```bash
sudo docker compose ps
```

You should see the flowise service with State: Up.

4. Check the logs for any errors (press Ctrl+C to exit):

```bash
sudo docker compose logs -f flowise
```

## Step 7: Final Verification & Access

Open your web browser and navigate to https://flowise.yourdomain.com.

- You should be prompted for the FLOWISE_USERNAME and FLOWISE_PASSWORD you set.

- After logging in, you should see the Flowise dashboard.

Your Flowise instance is now running, secured, and accessible!

## Troubleshooting & Tips

- Port Conflict (“address already in use”): If docker compose up -d fails with this error for the port you chose (e.g., 3002), another service is using it.

Find the conflicting service: sudo ss -tulnp | grep ‘:3002’ (replace 3002 with your chosen port).

- Stop the conflicting service or choose a different port for Flowise (remember to update both docker-compose.yml and Caddyfile).

- Firewall: Ensure your server’s firewall (e.g., UFW) allows traffic on ports 80 and 443 (for Caddy).

```text
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
# sudo ufw enable (if not already enabled)
# sudo ufw status
```

- Cloudflare SSL/TLS Mode: In Cloudflare, set SSL/TLS encryption mode for yourdomain.com to Full (Strict) for optimal security.

- Updating Flowise:

```bash
cd /path/to/your/flowise_compose_directory # e.g., /var/www/html/flowise_config
sudo docker compose pull flowise  # Pulls the latest image
sudo docker compose up -d         # Recreates the container with the new image
sudo docker image prune -f        # Optional: clean up old images
```

- Caddy Logs: sudo journalctl -u caddy -f or check the file specified in your Caddyfile.

## Conclusion

You’ve successfully deployed Flowise on a secure subdomain, leveraging the power of Docker for containerization, Caddy for reverse proxying and SSL, and Cloudflare for DNS and added security layers. This setup provides a robust and scalable environment for building and experimenting with LLM applications. Enjoy exploring the capabilities of Flowise!
