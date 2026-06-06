---
title: 'Self-Hosting Open Web UI on Oracle ARM with Docker and Caddy (Private Setup)'
description: 'Running your own Large Language Model (LLM) interface offers fantastic benefits like privacy, customization, and potentially lower costs compared to hosted services. Open Web UI is a popular, user-friendly interface for interacting with local LLMs managed by Ollama.'
pubDate: 2025-04-08
heroImage: '/images/2025/04/openwebui_logo.png'
heroImageAlt: 'openwebui logo'
categories: ['Linux']
tags: []
toc: true
---

Running your own Large Language Model (LLM) interface offers fantastic benefits like privacy, customization, and potentially lower costs compared to hosted services. Open Web UI is a popular, user-friendly interface for interacting with local LLMs managed by Ollama.

This guide details how to install Open Web UI on an Oracle Cloud Infrastructure (OCI) ARM Ampere VM running Ubuntu 24.04, **configured for private access**. We’ll use Docker Compose for easy management, Caddy as a reverse proxy for automatic HTTPS, Cloudflare for DNS and added security, and leverage an OCI Block Volume for persistent storage. This setup places Open Web UI on its own subdomain (e.g., aichat.yourdomain.com) and **disables public user registration**.

**Why this setup?**

- Oracle ARM VMs: Offer generous free-tier resources, perfect for experimenting.

- Docker Compose: Simplifies managing the multi-container setup (Ollama + Open Web UI).

- Caddy: Effortlessly handles HTTPS certificates and reverse proxying.

- Block Volume: Keeps LLM models and application data off the boot volume, preserving space and making data management easier.

- Subdomain: Organizes web services neatly.

- Private Access: Prevents unknown users from signing up.

**Prerequisites**

Before you start, ensure you have the following:

- Oracle ARM VM: An Ubuntu 24.04 instance running on OCI Ampere (ARM).

- SSH Access: Ability to connect to your VM.

- Domain Name: A registered domain (we’ll use yourdomain.com as an example).

- Cloudflare Account: Managing your domain’s DNS.

- Docker & Docker Compose: Installed on your VM. (Follow official Docker installation guides for Ubuntu).

- Caddy v2: Installed directly on the VM (not via Docker). (Follow official Caddy installation guides).

- OCI Block Volume: Created, attached, and mounted to your VM (e.g., at /mnt/myvolume).

- Basic Linux Command Line Knowledge.

## Step 1: Prepare Directories on Block Volume

To keep things organized and prevent filling up the boot drive, we’ll store configuration and persistent data on the attached block volume.

```bash
# Create directory for the Docker Compose configuration
sudo mkdir -p /var/www/html/open-webui_app

# Create directories for persistent data
sudo mkdir -p /var/www/html/ollama_data
sudo mkdir -p /var/www/html/open-webui_data

# Optional: Change ownership to your user if you prefer not to use sudo for editing
# Replace 'your_user' with your actual username
sudo chown your_user:your_user /var/www/html/open-webui_app
# Depending on docker setup, you might need to adjust data directory permissions later if issues arise.

# Navigate to the app configuration directory
cd /var/www/html/open-webui_app
```

## Step 2: Create the Docker Compose File

Docker Compose uses a YAML file to define and run multi-container applications. Create a file named docker-compose.yml inside the /var/www/html/open-webui_app directory.

```text
# Ensure you are in the correct directory
# cd /var/www/html/open-webui_app

nano docker-compose.yml
```

Paste the following content into the file. **Note the inclusion of WEBUI_SIGNUP_ENABLED=false to disable public registrations.**

```yaml
version: '3.8'

services:
  ollama:
    image: ollama/ollama # Multi-arch image, supports arm64
    container_name: ollama
    volumes:
      - /var/www/html/ollama_data:/root/.ollama # Store models on block volume
    networks:
      - aichat_network
    restart: unless-stopped
    # Optional: Add GPU passthrough here if applicable (uncommon on basic OCI ARM)

  open-webui:
    image: ghcr.io/open-webui/open-webui:main # Multi-arch image, supports arm64
    container_name: open-webui
    ports:
      - '3001:8080' # Map container port 8080 to host port 3001
    environment:
      # Connect to ollama service within the private docker network
      - OLLAMA_BASE_URL=http://ollama:11434
      # --- Add a Secure Secret Key ---
      # Generate one using: openssl rand -hex 32
      # Example - REPLACE WITH YOUR GENERATED KEY:
      - WEBUI_SECRET_KEY=your_super_secret_randomly_generated_key_here
      # --- Disable Public Signups ---
      # Set to false to prevent anyone from creating an account via the web UI
      - WEBUI_SIGNUP_ENABLED=false
    volumes:
      # Store Web UI data (users, settings) on block volume
      - /var/www/html/open-webui_data:/app/backend/data
    networks:
      - aichat_network
    depends_on:
      - ollama # Wait for ollama service to start
    restart: unless-stopped

networks:
  aichat_network:
    driver: bridge
    name: aichat_network # Use a specific network name
```

**Important Configuration Notes:**

- Generate WEBUI_SECRET_KEY: Before saving, generate a strong secret key

```text
openssl rand -hex 32
```

- Replace your_super_secret_randomly_generated_key_here with your generated key.

- Disable Signups (WEBUI_SIGNUP_ENABLED=false): This crucial line prevents the “Sign Up” option from appearing on the login page after the initial admin user is created. This ensures only users you create or invite (potentially through an admin interface within the app, or by temporarily enabling signups later) can gain access.

Save the file (Ctrl+X, then Y, then Enter).

## Step 3: Configure Caddy Reverse Proxy

Caddy handles secure HTTPS connections and directs traffic to your Open Web UI container.

- Backup your Caddyfile:

```bash
sudo cp /etc/caddy/Caddyfile /etc/caddy/Caddyfile.bak
```

**2. Edit your Caddyfile:**

```text
sudo nano /etc/caddy/Caddyfile
```

**3. Add a new block for your Open Web UI subdomain:**

```text
# --- Your existing Caddyfile content ---

aichat.yourdomain.com {
    # Reverse proxy requests to the Open Web UI container (listening on host port 3001)
    reverse_proxy 127.0.0.1:3001

    # Optional: Add logging
    # log {
    #    output file /var/log/caddy/aichat.yourdomain.com.log
    # }

    # Caddy automatically handles HTTPS
}

# --- Other Caddyfile configurations ---
```

4. **Validate and Reload Caddy:**

```bash
sudo caddy fmt --overwrite /etc/caddy/Caddyfile
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

Check Caddy’s status if needed: sudo systemctl status caddy.

## Step 4: Configure Cloudflare DNS

Point your subdomain to your server and ensure secure connections.

- Log in to Cloudflare.

- Go to DNS settings for yourdomain.com.

- Add an A record:

Type: A

- Name: aichat

- IPv4 address: Your Oracle VM’s Public IP address (e.g., xxx.xxx.xxx.xxx)

- Proxy status: Proxied (Orange cloud).

- Go to the “SSL/TLS” section.

- Set encryption mode to Full (Strict).

## Step 5: Launch Open Web UI

Start the Ollama and Open Web UI containers.

```bash
# Ensure you are in the directory containing docker-compose.yml
cd /var/www/html/open-webui_app

# Start the services in detached mode
docker compose up -d

# Optional: Check logs
# docker compose logs -f
```

Docker will pull the required images and start the containers based on your compose file.

## Step 6: Access and Configure Open Web UI

- Open your browser and navigate to https://aichat.yourdomain.com.

- You should see the Open Web UI login page. Crucially, because you set WEBUI_SIGNUP_ENABLED=false, there should be NO “Sign Up” button.

- The very first time you access it, it should prompt you to create the initial admin user account. Complete this sign-up process. This will be the primary account for managing the instance.

- Once logged in as admin, navigate to Settings > Models.

- Pull a desired model (e.g., llama3:8b, mistral:7b). Models are stored in /var/www/html/ollama_data.

- Return to the chat interface, select your downloaded model, and begin interacting.

### Managing Users (With Signups Disabled)

Since public registration is off, you’ll need to manage users through other means:

- Admin Panel: Explore the Open Web UI settings (usually under Admin settings) for options to invite or manually create new user accounts.

- Temporary Re-enable: If direct user creation isn’t available via the UI, you could temporarily stop the container (docker compose down), change WEBUI_SIGNUP_ENABLED back to true, restart (docker compose up -d), have the desired user sign up, then stop, set it back to false, and restart again. This is less convenient but guarantees privacy most of the time.

### Exploring Advanced Features: Connections and Functions

Even in a private setup, you can leverage Open Web UI’s advanced features:

- Connections: Integrate with external services like web search APIs (Google, SearxNG, DuckDuckGo) to provide LLMs with real-time information. Configure these in the settings.

- Functions (Tool Calling): Define custom tools (like fetching weather, managing calendars) that the LLM can utilize to perform actions beyond text generation. This requires defining the functions and potentially coding backend handlers. Consult the official Open Web UI Functions documentation for details.

## Conclusion

You now have a **private and secure**, self-hosted Open Web UI instance running on your Oracle ARM VM. By disabling public sign-ups, you ensure only authorized users can access your LLM interface. This setup utilizes Docker, Caddy, Cloudflare, and a block volume for an efficient, secure, and manageable deployment. Enjoy full control over your private AI chat environment!
