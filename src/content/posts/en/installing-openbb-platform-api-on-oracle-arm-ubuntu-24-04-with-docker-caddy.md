---
title: "Installing OpenBB Platform API on Oracle ARM (Ubuntu 24.04) with Docker & Caddy"
description: "OpenBB has evolved. While known for its powerful terminal and, previously, a self-hostable web application, the core of the self-hosted OpenBB Platform is now its robust set of API endpoints. This post will clarify what the current self-hosted OpenBB Platform offers, how..."
pubDate: 2025-03-20
categories: ["Data Science"]
tags: []
toc: true
---

OpenBB has evolved. While known for its powerful terminal and, previously, a self-hostable web application, the core of the self-hosted OpenBB Platform is now its robust set of **API endpoints**. This post will clarify what the current self-hosted OpenBB Platform offers, how to use it (with a focus on Swagger/OpenAPI), and who benefits from this API-centric approach.

The OpenBB Platform provides powerful financial data access via an API. Running it in Docker offers isolation and simplified dependency management, making it a great fit for cloud instances like Oracle Cloud Infrastructure’s (OCI) ARM Ampere servers running Ubuntu 24.04 LTS.

This guide details how to:

- Build the OpenBB Platform API Docker image on an ARM64 architecture.

- Configure persistent storage on a separate block volume (assuming Docker itself is already configured to use it).

- Run the container interactively using tmux to handle initial token setup.

- Expose the API securely using Caddy as a reverse proxy.

This method specifically addresses the need for interactive setup (like entering an API token) while keeping the service running after you disconnect.

**Prerequisites:**

- OCI ARM Instance: An Oracle Cloud Ampere A1 instance running Ubuntu 24.04 LTS.

- SSH Access: Ability to connect to your instance with sudo privileges.

- Docker & Docker Compose: Docker Engine and the Docker Compose plugin (v2) installed. Crucially, Docker should already be configured to use a dedicated block volume for its primary data directory (data-root) to save boot volume space. (See separate guide on configuring Docker’s data-root).

- Mounted Block Volume: A separate block volume mounted persistently (e.g., via /etc/fstab). We’ll use /mnt/myvolume as the example mount point for storing specific OpenBB configuration data in this guide.

- Caddy: Caddy web server installed and configured (likely already serving your main domain, e.g., yourdomain.com).

- Git: Git version control tool installed (sudo apt install git).

- Tmux: Terminal multiplexer installed (sudo apt install tmux).

- DNS: A DNS record (e.g., openbb.yourdomain.com) pointing to your server’s public IP address (xxx.xxx.xxx.xxx). If using Cloudflare, ensure it’s set up correctly (potentially “DNS Only” during initial Caddy setup).

- OpenBB API Token: You need to have obtained your necessary API token(s) from OpenBB or relevant data providers beforehand.

**Short Summary: What is the Self-Hosted OpenBB Platform (API-Only)?**

The self-hosted OpenBB Platform is now essentially a powerful, customizable **financial data API server**. You deploy it on your own infrastructure (server or cloud instance). Instead of a built-in graphical user interface, you interact with it programmatically through its well-documented API endpoints, which are exposed and described using Swagger (also known as OpenAPI). Key features include:

- API Access: Comprehensive access to a vast collection of financial and economic data via RESTful API endpoints.

- Data Aggregation: Connections to numerous data providers (free and premium, configured with API keys). This includes sources like Alpha Vantage, Financial Modeling Prep, SEC EDGAR, Benzinga, and the ability to integrate your own data.

- Swagger/OpenAPI Documentation: Interactive, browser-based documentation that allows you to explore all available API endpoints, understand their parameters, and even test them directly.

- Customization and Extensibility: The platform remains extensible; you can add new data connectors to integrate additional sources.

- Data Models (Pydantic): Consistent data structures (using Pydantic) ensure that data from different providers is easily usable and comparable.

- Control and Privacy: You maintain complete control over your data and infrastructure, ensuring privacy and avoiding reliance on external services.

- Centralized settings: All the user configurations are managed in a single place.

- Extensions Packages that add extra functionalities to the core package.

**How Does the Self-Hosted OpenBB Platform (API-Only) Work?**

The platform operates as an API server:

- Server-Side: You deploy the OpenBB Platform (typically using Docker). This server handles data fetching, processing, and API request management.

- Client-Side (Your Code/Tools): You interact with the platform programmatically. This means using code (e.g., Python, JavaScript) or API client tools (e.g., Postman, Insomnia, or the Swagger UI itself) to send requests to the API endpoints.

- Swagger UI: The platform provides a built-in Swagger UI. Accessing the Swagger UI in your browser (usually at a URL like your-server-address/docs) gives you a visual, interactive way to explore the API.

- Data Connectors: The platform connects to various data providers using modular connectors. You configure these with your API keys (as needed).

**The workflow typically looks like this:**

- Deployment: Follow the OpenBB Platform installation instructions (usually involving Docker) to set up the server. https://docs.openbb.co/platform/installation

- Access Swagger: Open your web browser and navigate to the Swagger UI endpoint (e.g., your-server-address/docs or, in your specific example, https://openbb.mxcfo.com/docs).

- Explore Endpoints: Use the Swagger UI to browse the available API endpoints. Each endpoint is documented with its purpose, parameters, and expected response format.

- Test Endpoints (Optional): You can use the Swagger UI’s “Try it out” feature to send test requests directly from the browser. This is great for experimentation and understanding how the API works.

- Integrate into Your Code: Write code (in your preferred language) to make requests to the API endpoints. Use libraries like requests (Python), fetch (JavaScript), or any HTTP client library.

- Configure Data Providers: Use the API (or configuration files, depending on the setup) to add API keys for your chosen data providers.

**Who is the Self-Hosted OpenBB Platform (API-Only) For?**

This API-focused approach is primarily aimed at developers and technically proficient users:

- Developers: Build custom financial applications, dashboards, trading bots, or integrations with other systems. The API gives you complete flexibility to create tailored solutions.

- Quantitative Analysts (Quants): Integrate the API directly into your Python-based research workflows. Fetch data, perform analysis, and build models using your existing tools.

- Data Scientists: Access and process financial data for machine learning, time series analysis, and other data-driven projects.

- Fintech Companies: Use the platform as a flexible backend for your financial products and services.

- Organizations with Internal Data: Combine internal datasets with public financial data via the API.

- Power Users: Individuals comfortable with APIs and scripting who want fine-grained control over their data access.

## Table of Contents

- Step 1: Prepare Persistent Storage Directory

- Step 2: Clone the OpenBB Platform Repository

- Step 3: Build the OpenBB Docker Image

- Step 4: Configure Caddy Reverse Proxy

- Step 5: Run OpenBB Interactively with Tmux

- Step 6: Verify Access

- Conclusion:

## Step 1: Prepare Persistent Storage Directory

Even if Docker’s main data is on a block volume, we need a specific, easily accessible location *on that volume* to store the OpenBB configuration (like your tokens) that we’ll mount into the container.

```bash
# Navigate to your mounted block volume
cd /mnt/myvolume

# Create directories for OpenBB persistent data
sudo mkdir -p /var/www/html/openbb_data/platform_config

# Set ownership - often needed for container permissions (assuming container runs as root)
sudo chown root:root /var/www/html/openbb_data/platform_config

# Verify directories (optional)
ls -l /var/www/html/openbb_data
```

## Step 2: Clone the OpenBB Platform Repository

Fetch the source code, which includes the necessary Dockerfile.

```bash
# Navigate to a suitable location, e.g., your block volume or home directory
cd /mnt/myvolume
# Or: cd ~

git clone https://github.com/OpenBB-finance/OpenBB.git
cd OpenBB
```

*(You’ll need to be inside this OpenBB directory for the next step).*

## Step 3: Build the OpenBB Docker Image

Now, build the Docker image using the provided platformAPI.Dockerfile. This process might take some time, especially the first time, as it downloads base images and installs dependencies. Docker will automatically handle the ARM64 architecture.

```bash
# Ensure you are inside the cloned 'OpenBB' directory
docker build -f build/docker/platformAPI.Dockerfile -t openbb-platform:latest .
```

Look for a FINISHED message at the end. Ignore warnings about commit information unless you specifically need build provenance.

## Step 4: Configure Caddy Reverse Proxy

Edit your Caddy configuration file (/etc/caddy/Caddyfile) to add a block for your OpenBB subdomain. This tells Caddy to handle HTTPS and forward requests to the Docker container.

```text
sudo nano /etc/caddy/Caddyfile
```

Add the following block (adjusting alongside your existing site configurations):

```text
# ... (Keep your global options and other site blocks like yourdomain.com) ...

openbb.yourdomain.com {
        # Optional: Log requests specifically for this site
        log {
            output file /var/log/caddy/openbb.yourdomain.com.log
        }

        # Reverse proxy requests to the OpenBB container
        # We'll map the container to localhost:6900
        reverse_proxy localhost:6900
}

# ... (Keep any other site blocks) ...
```

Save the Caddyfile and reload Caddy’s configuration:

```bash
# Optional: Format the file
sudo caddy fmt --overwrite /etc/caddy/Caddyfile

# Reload Caddy service
sudo systemctl reload caddy

# Check status (optional)
sudo systemctl status caddy
sudo journalctl -u caddy --no-pager | tail -n 20 # Check for errors
```

## Step 5: Run OpenBB Interactively with Tmux

Because OpenBB Platform might require you to enter an API token interactively the first time, we can’t simply run it detached (-d). We’ll use tmux to start the container interactively, enter the token, and then detach from tmux, leaving the container running.

TMUX allows to manage multiple terminal sessions, ideal for maintaining processes active even if I disconnect

```bash
sudo apt update
sudo apt upgrade -y

sudo apt install tmux -y
```

Here we have some basic key commands to start working with **tmux**:

| Action | Command |
|---|---|
| Start a new session | tmux |
| Create a new session | tmux new -s session_name |
| Disconnect from a session | Ctrl + B followed by D |
| List active sessions | tmux ls |
| Reconnect to an active session | tmux attach -t session_name |
| Close a session from within | exit |

- Start a new tmux session:

```text
tmux new -s openbb
```

*(You’ll now be inside a new terminal session managed by tmux).*

2. **Run the Docker container interactively:** This command maps the necessary port *only* to localhost (for Caddy), mounts your persistent config directory, and uses flags for an interactive terminal (-it) and automatic cleanup on exit (–rm).

```bash
# Run this command INSIDE the tmux session
docker run -it --rm \
  -p 127.0.0.1:6900:6900 \
  -v /var/www/html/openbb_data/platform_config:/root/.openbb_platform \
  openbb-platform:latest
```

- Enter Token(s): Watch the container output. When prompted by the OpenBB setup process, enter your required API token(s).

- Wait for API Server: After entering the token(s), the container should proceed to start the Uvicorn web server (you’ll likely see logs indicating it’s listening on 0.0.0.0:6900).

- Detach Tmux: Once the API server is running, detach from the tmux session by pressing Ctrl+b then d.

Your container is now running in the background, managed by the detached tmux session. The token you entered is saved in /var/www/html/openbb_data/platform_config.

## Step 6: Verify Access

Open your web browser and navigate to your subdomain:

[https://openbb.yourdomain.com](https://openbb.yourdomain.com)

You should see the OpenBB Platform API’s Swagger UI or documentation page. You can try executing some of the non-authenticated endpoints directly from the Swagger interface to confirm functionality.

You can also test from your terminal:

```bash
curl https://openbb.yourdomain.com
# Or: curl -I https://openbb.yourdomain.com (to check headers)
```

**Important Considerations:**

- No Automatic Restarts: Using tmux means the container won’t automatically restart if it crashes or if the server reboots. You would need to re-attach to the tmux session (tmux attach -t openbb) and run the docker run command again. For production, explore methods to handle token injection differently to allow using docker run -d –restart unless-stopped.

- Viewing Logs: To see the running container’s logs, re-attach to the tmux session: tmux attach -t openbb.

- Stopping: To stop the container, re-attach to the tmux session and press Ctrl+c. Because you used –rm, the container will stop and be removed. To restart, run the docker run… command again.

## Conclusion:

You have successfully deployed the OpenBB Platform API on your Oracle ARM Ubuntu server using Docker, leveraging a block volume for persistent storage, and handling interactive setup with tmux. Caddy provides secure HTTPS access, making your powerful financial data API ready to use!
