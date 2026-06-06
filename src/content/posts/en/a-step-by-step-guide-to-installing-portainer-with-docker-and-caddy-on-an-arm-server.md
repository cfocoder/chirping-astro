---
title: 'A Step-by-Step Guide to Installing Portainer with Docker and Caddy on an ARM Server'
description: 'Managing a server with multiple Docker applications can quickly become a juggling act of docker ps, docker logs, and docker-compose commands. While powerful, the command line isn’t always the most efficient way to get a high-level view of your services.'
pubDate: 2025-06-23
heroImage: '/images/2025/06/portainer_logo.png'
heroImageAlt: 'portainer logo'
categories: ['Linux']
tags: []
toc: true
---

Managing a server with multiple Docker applications can quickly become a juggling act of docker ps, docker logs, and docker-compose commands. While powerful, the command line isn’t always the most efficient way to get a high-level view of your services.

That’s where Portainer comes in. It’s a lightweight, powerful, open-source management UI that gives you a beautiful graphical interface to see, manage, and maintain your Docker environment.

In this guide, I’ll walk you through the exact process I used to install Portainer on my Oracle Cloud ARM server running Ubuntu 24.04. My setup uses Caddy as a reverse proxy to automatically handle SSL and assign a unique subdomain to each new app. Let’s get started!

**Our Goal**

To install Portainer on its own secure subdomain (https://portainer.your-domain.com) and have it manage our server’s local Docker instance.

**Prerequisites**

Before you begin, you should have the following setup:

- An ARM-based server (like an Oracle Cloud Ampere VM).

- Ubuntu 24.04 or a similar Debian-based OS.

- Docker and Docker Compose already installed.

- A domain name pointed to your server, managed through Cloudflare.

- Caddy installed on the host (not in Docker) and configured as a reverse proxy for other apps.

- (Recommended) An attached block volume for persistent data, mounted at a location like /path/to/your/block-volume.

## Table of Contents

- Step 1: Configure Your DNS in Cloudflare

- Step 2: Prepare the Portainer Data Directory

- Step 3: Check for Port Conflicts (A Crucial Pro-Tip!)

- Step 4: Create the Docker Compose File

- Step 5: Launch Portainer

- Step 6: Configure the Caddy Reverse Proxy

- Step 7: Final Setup and Securing Your Account

- How to Update Your Applications

- Conclusion and Basic Maintenance

## Step 1: Configure Your DNS in Cloudflare

Caddy needs to know that the subdomain portainer.your-domain.com points to our server before it can issue an SSL certificate.

- Log in to your Cloudflare dashboard.

- Navigate to your domain’s DNS records.

- Click Add record and create a new A record:

Type: A

- Name: portainer (Cloudflare will add the rest of the domain).

- IPv4 address: YOUR_SERVER_IP

- Proxy status: Proxied (Orange Cloud). This is recommended.

## Step 2: Prepare the Portainer Data Directory

To keep our data separate from the main operating system and ensure it persists, we’ll create a dedicated directory on our attached block volume.

```bash
# Create a dedicated folder for all Portainer files
sudo mkdir -p /path/to/your/block-volume/portainer

# Navigate into our new directory
cd /path/to/your/block-volume/portainer
```

## Step 3: Check for Port Conflicts (A Crucial Pro-Tip!)

Portainer’s web UI defaults to port 9000. Before we try to use it, let’s make sure no other application on our server is already listening on that port.

Run the following command to see all ports currently used by Docker containers:

```bash
sudo docker ps
```

Examine the PORTS column. If you see any entry like …:9000->…, that port is taken. If it’s free, you’re good to go!

If port 9000 is taken, simply choose another one (like 9001) and remember to use it in both the Docker Compose file and the Caddy configuration below.

## Step 4: Create the Docker Compose File

Docker Compose allows us to define our application’s configuration in a simple YAML file. Inside the /path/to/your/block-volume/portainer directory, create a new file named docker-compose.yml.

```text
sudo nano docker-compose.yml
```

Paste the following configuration into the file:

```yaml
# version: '3.8'

services:
  portainer:
    # The official multi-arch image, perfect for our ARM server
    image: portainer/portainer-ce:latest
    container_name: portainer
    restart: unless-stopped

    ports:
      # Expose Portainer's UI on port 9000. Caddy will connect to this.
      - '9000:9000'

    volumes:
      # This gives Portainer the ability to manage Docker itself.
      - /var/run/docker.sock:/var/run/docker.sock

      # This persists all of Portainer's data (users, settings, etc.)
      # in a 'data' sub-directory right here.
      - ./data:/data

networks:
  default:
    name: portainer_network
```

Save the file and exit the editor (Ctrl+X, Y, Enter).

## Step 5: Launch Portainer

With our configuration file ready, starting Portainer is a one-line command:

```bash
# Run from the `/path/to/your/block-volume/portainer` directory
sudo docker compose up -d
```

Docker will now pull the image and start the container in the background. You can verify it’s running with sudo docker ps.

## Step 6: Configure the Caddy Reverse Proxy

Now we tell Caddy to direct traffic for our new subdomain to the Portainer container.

Edit your main Caddy configuration file:

```text
sudo nano /etc/caddy/Caddyfile
```

Add the following block. You can place it above or below your existing site configurations.

```text
# ... your other site blocks, like your main domain ...

# Add this new block for Portainer
portainer.your-domain.com {
    # Forward all traffic to the Portainer container's port 9000
    reverse_proxy localhost:9000
}
```

Save the file, then reload the Caddy service to apply the changes without any downtime:

```bash
sudo systemctl reload caddy
```

Caddy will now automatically fetch an SSL certificate for portainer.your-domain.com and handle all the encryption for you!

## Step 7: Final Setup and Securing Your Account

The final step is to create your secure admin user.

- Open your browser and navigate to https://portainer.your-domain.com.

- You’ll be prompted to create your first user. Choose a strong, unique password. This is your master key to managing your Docker environment!

- On the next screen, Portainer will ask which environment to manage. Since we mounted the Docker socket, it’s easy. Just click Get Started to connect to the local Docker instance.

## How to Update Your Applications

When you click on an application stack in Portainer (like N8N or Nextcloud), you might notice a message saying, *“This stack was created outside of Portainer. Control over this stack is limited.”*

This is because we deployed our apps from the command line, which is a great practice. While Portainer is excellent for monitoring, the most reliable way to *update* these apps is by using the command line. The process is simple and safe.

Here’s how to do it:

- SSH into your server.

- Navigate to the app’s directory. Every app should have its own folder containing its docker-compose.yml file.

```bash
# Example for an app like N8N
cd /path/to/your/n8n-folder
```

3. **Pull the latest images.** This command checks for new versions of the images in your compose file and downloads them without stopping your running app.

```bash
sudo docker compose pull
```

4. **Recreate the containers.** This command gracefully stops the old containers and starts new ones using the fresh images you just downloaded. All your persistent data is automatically re-attached.

```bash
sudo docker compose up -d
```

That’s all there is to it! Your application is now running the latest version, and Portainer will automatically reflect the changes in its dashboard.

## Conclusion and Basic Maintenance

You now have a secure, powerful, and easy-to-use dashboard for all your Docker needs.

As a final tip, be sure to use Portainer to perform routine maintenance to keep your server healthy:

- Clean Unused Images: Go to the Images tab and use the “Unused” filter to find and remove old images, freeing up disk space on your boot volume.

- Clean Unused Volumes: Go to the Volumes tab to find and remove any “Unused” volumes, which clears space on your block storage.
