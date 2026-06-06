---
title: 'Running Your Own AI: Installing Ollama on Ubuntu 24.04 ARM with Docker and Caddy'
description: 'Self-hosting Large Language Models (LLMs) is becoming increasingly accessible, offering benefits like privacy, cost savings, and customization. Ollama makes it incredibly simple to run open-source models like Llama 3, Phi-3, Mistral, and more, right on your own hardware.'
pubDate: 2025-03-27
heroImage: '/images/2025/03/ollama_logo.png'
heroImageAlt: 'ollama logo'
categories: ['Linux']
tags: []
toc: true
---

Self-hosting Large Language Models (LLMs) is becoming increasingly accessible, offering benefits like privacy, cost savings, and customization. Ollama makes it incredibly simple to run open-source models like Llama 3, Phi-3, Mistral, and more, right on your own hardware.

This guide walks you through installing Ollama on an Oracle Cloud ARM Ampere VM running Ubuntu 24.04. We’ll use Docker Compose for easy management and Caddy as a reverse proxy to serve Ollama securely on its own subdomain (e.g., https://ollama.yourdomain.com), complete with automatic HTTPS via Cloudflare.

**Our Setup:**

- Cloud Provider: Oracle Cloud (Free Tier Ampere A1 VM)

- Operating System: Ubuntu 24.04 LTS (Noble Numbat) ARM64

- Containerization: Docker & Docker Compose

- Reverse Proxy: Caddy (already configured for other subdomains)

- DNS/SSL: Cloudflare

- Storage: Standard Boot Volume + External Block Volume mounted at /mnt/myvolume (Recommended for model storage)

**Prerequisites:**

- An Ubuntu 24.04 ARM VM (like Oracle’s Ampere A1 instances).

- Docker and Docker Compose installed and running.

- Caddy installed and running, likely already serving your main domain (e.g., yourdomain.com).

- A registered domain name (yourdomain.com).

- Access to your DNS provider (we’ll use Cloudflare examples).

- An external block volume mounted (e.g., at /mnt/myvolume). While optional, storing large models on the boot volume isn’t ideal.

- Basic familiarity with the Linux command line and editing files.

**Let’s Get Started!**

## Step 1: Prepare Directories

We need a place for our Docker Compose configuration and a dedicated directory on our block volume for Ollama’s model data.

```bash
# Create a directory for the Docker Compose file (choose your preferred location)
mkdir -p ~/docker-services/ollama
cd ~/docker-services/ollama

# Create the data directory on the block volume
sudo mkdir -p /var/www/html/ollama_data

# Optional: Adjust permissions if needed later, Docker usually handles this.
# sudo chown -R $(id -u):$(id -g) /var/www/html/ollama_data
```

## Step 2: Create the Docker Compose File

Inside the ~/docker-services/ollama directory, create a file named docker-compose.yml:

```text
nano docker-compose.yml
```

Paste the following configuration:

```yaml
services:
  ollama:
    image: ollama/ollama # Official image, supports ARM64
    container_name: ollama
    ports:
      # IMPORTANT: Map Ollama port ONLY to the host's localhost interface.
      # Caddy will access it via 127.0.0.1:11434, keeping it private.
      - '127.0.0.1:11434:11434'
    volumes:
      # Mount the data directory from your block volume
      - /var/www/html/ollama_data:/root/.ollama
    restart: unless-stopped
    # Note: For typical ARM VMs without dedicated GPUs, Ollama uses CPU.
    # GPU configuration would require specific drivers and settings.

# Note: The 'version:' tag is optional in newer Docker Compose versions.
# You can omit it if you prefer.
```

- image: ollama/ollama: Uses the official multi-arch image.

- ports: – “127.0.0.1:11434:11434”: This is key. It exposes Ollama’s default port 11434 only on the server’s internal loopback address (127.0.0.1). This prevents direct external access, forcing traffic through our secure Caddy reverse proxy.

- volumes: …: Mounts the directory we created on the block volume into the container where Ollama stores its models (/root/.ollama). This ensures models persist even if the container is recreated.

- restart: unless-stopped: Ensures the container restarts automatically unless manually stopped.

Save and close the file (Ctrl+O, Enter, Ctrl+X).

## Step 3: Configure Caddy Reverse Proxy

Now, we tell Caddy about our new subdomain and how to route traffic to the Ollama container. Edit your main Caddy configuration file (usually /etc/caddy/Caddyfile):

```text
sudo nano /etc/caddy/Caddyfile
```

Add a new site block for ollama.yourdomain.com alongside your existing configurations. **Do not** nest it inside another site block.

```text
# Your existing Caddy configuration (e.g., for your main blog)

ollama.yourdomain.com {
	# Optional: Enable specific logging for Ollama traffic
	# log {
	#    output file /var/log/caddy/ollama.yourdomain.com.log
	# }

	# Define a matcher for requests WITHOUT the correct authorization
	@unauthorized {
		not header Authorization "Bearer MySuperSecureAndSafeToken"
	}

	# Block unauthorized requests
	handle @unauthorized {
		respond "Unauthorized" 401
	}

	# Handle authorized requests - reverse proxy to Ollama
	handle {
		reverse_proxy localhost:11434
	}

	# Caddy automatically handles HTTPS via Let's Encrypt/ZeroSSL
	# Ensure Cloudflare settings are correct (see Step 4)
}

# Any other site configurations you have...
# anotherapp.yourdomain.com {
#     # ... directives ...
# }
```

- ollama.yourdomain.com { … }: Defines the configuration for this specific subdomain.

- reverse_proxy localhost:11434: This tells Caddy to forward incoming requests for ollama.yourdomain.com to the Ollama service listening on 127.0.0.1:11434 (which we configured in docker-compose.yml).

Save and close the Caddyfile.

## Step 4: Cloudflare DNS and SSL Check

Before reloading Caddy, ensure Cloudflare is set up correctly:

- DNS Record: In your Cloudflare DNS settings for yourdomain.com, create an A record (or CNAME) for ollama pointing to your server’s public IP address (xxx.xxx.xxx.xxx). Make sure it’s Proxied (orange cloud) to benefit from Cloudflare’s features and allow Caddy’s HTTP-01 challenge to work easily.

- SSL/TLS Mode: Go to the SSL/TLS section in Cloudflare for yourdomain.com. Set the encryption mode to Full or, ideally, Full (Strict). Do not use Flexible, as it will cause redirect loops or errors with Caddy’s automatic HTTPS.

## Step 5: Apply Caddy Configuration

Let’s validate and reload Caddy:

```bash
# Check the syntax of your Caddyfile
sudo caddy validate --config /etc/caddy/Caddyfile

# Optional but recommended: Format the Caddyfile for consistency
sudo caddy fmt --overwrite /etc/caddy/Caddyfile

# Reload Caddy to apply the changes gracefully
sudo systemctl reload caddy

# Check Caddy's status and logs for any errors
sudo systemctl status caddy
journalctl -u caddy --no-pager | tail -n 50
```

You should see logs indicating Caddy is managing the certificate for ollama.yourdomain.com. It might initially fail the tls-alpn-01 challenge (due to Cloudflare proxying) but should succeed with the http-01 challenge.

## Step 6: Launch the Ollama Container

Navigate back to your Ollama configuration directory and start the container:

```bash
cd ~/docker-services/ollama
docker compose up -d
```

Check that the container is running:

```bash
docker ps
```

You should see the ollama container listed and running.

## Step 7: Verify Access

**Test Locally (from server SSH):**

```bash
curl http://127.0.0.1:11434
# Expected Output: Ollama is running
```

**Test Externally (via Caddy/Cloudflare):**

```bash
curl https://ollama.yourdomain.com
# Expected Output: Ollama is running
```

If the external curl works, congratulations! Caddy is successfully proxying HTTPS traffic to your Ollama container. If you encountered 502 Bad Gateway errors *before* starting the Ollama container in Step 6, that was expected because Caddy had nowhere to send the traffic. Those errors should now be gone.

## Step 8: Download and Use a Model

- Choose a model: Check the Ollama Library. Consider your VM’s RAM. phi3:mini (~4GB RAM needed) or gemma:2b (~5GB) are good starting points. llama3:8b (~8GB+) is more powerful but resource-intensive.

- Download: Use docker exec to run the ollama pull command inside the running container:

```bash
# Example: Download Phi-3 Mini
docker exec -it ollama ollama pull phi3:mini

# Or download Llama 3 8B (if you have enough RAM)
# docker exec -it ollama ollama pull llama3:8b
```

The model files will be stored safely in /var/www/html/ollama_data/models.

3. **Verify Download:** Check the available models via the API:

```bash
curl https://ollama.yourdomain.com/api/tags
# Expected Output: A JSON list including the model you downloaded.
# e.g., {"models":[{"name":"phi3:mini","modified_at":"...","size":...}]}
```

4. **Test Inference:** Send a prompt to the model via the API:

```bash
# Replace 'phi3:mini' with the model you downloaded
curl https://ollama.yourdomain.com/api/generate -d '{
  "model": "phi3:mini",
  "prompt": "Why is the sky blue?",
  "stream": false
}'
```

You should get a JSON response containing the model’s answer!

## Conclusion

You now have a fully functional Ollama instance running securely on your own ARM server, accessible via a dedicated subdomain with automatic HTTPS thanks to Docker, Caddy, and Cloudflare. Models are safely stored on your block volume.

From here, you can explore different models, integrate Ollama’s API into your own applications, or use various web UIs designed to work with Ollama. Enjoy your private AI playground!
