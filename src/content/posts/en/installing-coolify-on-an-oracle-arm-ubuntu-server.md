---
title: 'Installing Coolify on an Oracle ARM Ubuntu server'
description: 'Coolify is an open-source, self-hostable Platform-as-a-Service (PaaS)—think “Heroku/Vercel, but free on your own server”. Deploy applications, databases, and services with one click, automatic SSL, and Git integration, with zero monthly fees.'
pubDate: 2025-11-02
heroImage: '/images/2025/11/Coolify.png'
heroImageAlt: 'Coolify'
categories: ['Linux']
tags: ['Coolify', 'Self-Hosting']
toc: true
---

## What is Coolify?

Coolify is an open-source, self-hostable Platform-as-a-Service (PaaS)—think **“Heroku/Vercel, but free on your own server”**. Deploy applications, databases, and services with one click, automatic SSL, and Git integration, with **zero monthly fees**.

| Feature                       | Heroku/Vercel | Coolify on Your Server |
| ----------------------------- | ------------- | ---------------------- |
| One-click deployments         | ✅            | ✅                     |
| Automatic SSL (Let’s Encrypt) | ✅            | ✅                     |
| Git integration               | ✅            | ✅                     |
| Free database management      | ❌ (\$)       | ✅                     |
| Monthly cost                  | 💰 \$7-50+    | 💰 \$0                 |
| Data ownership                | ❌ Provider   | ✅ Your server         |
| Full customization            | ❌ Limited    | ✅ Complete            |

**Trade-off**: You manage server infrastructure, but gain complete control and cost savings.

This guide documents the complete process of installing Coolify on an Oracle Cloud instance with Docker configured to use a separate volume to avoid filling up the boot disk.

## System Setup

- Server: Oracle Cloud ARM instance

- OS: Ubuntu 24.04

- Boot disk: 45GB (/dev/sda1)

- Data volume: 148GB (/dev/sdb1 mounted at /mnt/myvolume)

- Goal: Install Coolify with all Docker data on the larger volume

## Prerequisites

Before starting, ensure you have:

- SSH access to your server

- Root/sudo privileges

- A mounted volume at /mnt/myvolume (or your preferred location)

- Docker installed (version 27.5.1)

## Step 1: Configure Docker to Use Custom Data Root

Edit Docker daemon configuration:

```bash
sudo cp /etc/docker/daemon.json /etc/docker/daemon.json.backup
```

Update `/etc/docker/daemon.json` to include the `data-root` directive:

```json
{
  "data-root": "/mnt/myvolume/docker",
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "100m",
    "max-file": "5"
  },
  "features": {
    "buildkit": true
  },
  "live-restore": true,
  "default-address-pools": [
    {
      "base": "172.17.0.0/12",
      "size": 20
    },
    {
      "base": "192.168.0.0/16",
      "size": 24
    }
  ]
}
```

Restart Docker and verify:

```bash
sudo systemctl restart docker
sudo docker info | grep "Docker Root Dir"
```

Expected output: `Docker Root Dir: /mnt/myvolume/docker`

## Step 2: Install Coolify

Run the official installation script:

```bash
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | sudo bash
```

The installer will:

- Install required packages

- Configure SSH

- Download Coolify components

- Start Coolify containers

- Display access URL (e.g., http://YOUR_IP:8000)

## Step 3: Configure SSH for Coolify

Coolify runs as root and needs SSH access to manage the server. Add Coolify’s generated SSH key to authorized_keys:

```bash
# The key will be shown in the Coolify UI during setup
# Copy it and add to authorized_keys:
echo "ssh-ed25519 AAAAC3Nza... coolify" | sudo tee -a /root/.ssh/authorized_keys
sudo chmod 600 /root/.ssh/authorized_keys
```

## Step 4: Configure Firewall (UFW)

Allow required ports:

```text
# Essential ports
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw allow 6001/tcp  # Coolify real-time
sudo ufw allow 6002/tcp  # Coolify terminal
sudo ufw allow 8000/tcp  # Coolify dashboard

# Allow Docker networks to access SSH (critical for Coolify)
sudo ufw allow from 172.16.0.0/12 to any port 22 comment "Coolify Docker network"
sudo ufw allow from 10.0.0.0/8 to any port 22 comment "Docker networks"
```

## Step 5: Configure Oracle Cloud Ingress Rules

In Oracle Cloud Console, add these Ingress Rules to your Security List:

| Source CIDR | Protocol | Destination Port | Description       |
| ----------- | -------- | ---------------- | ----------------- |
| 0.0.0.0/0   | TCP      | 22               | SSH               |
| 0.0.0.0/0   | TCP      | 80               | HTTP              |
| 0.0.0.0/0   | TCP      | 443              | HTTPS             |
| 0.0.0.0/0   | TCP      | 6001             | Coolify Real-time |
| 0.0.0.0/0   | TCP      | 6002             | Coolify Terminal  |
| 0.0.0.0/0   | TCP      | 8000             | Coolify Dashboard |

## Step 6: Configure Custom Domain (Optional but Recommended)

Once you set up a custom domain with SSL in Coolify:

- Point your domain to the server IP

- Configure the domain in Coolify settings

- Enable wildcard domain for subdomains

- After SSL is working, close ports 6001, 6002, and 8000 for security:

```text
# Remove from UFW
sudo ufw delete allow 6001/tcp
sudo ufw delete allow 6002/tcp
sudo ufw delete allow 8000/tcp
```

Also remove these ports from Oracle Cloud Ingress Rules.

## Step 7: Ensure Containers Auto-Restart

Set all Coolify containers to restart automatically:

```bash
sudo docker update --restart=always coolify-sentinel
```

Verify all containers have restart policies:

```bash
sudo docker inspect coolify coolify-db coolify-redis coolify-realtime coolify-proxy coolify-sentinel --format '{{.Name}}: {{.HostConfig.RestartPolicy.Name}}' | sed 's|/||'
```

## Step 8: Add SSH Keys for Deployments

Copy your deployment SSH keys to root user:

```bash
sudo cp ~/.ssh/your-key /root/.ssh/your-key
sudo cp ~/.ssh/your-key.pub /root/.ssh/your-key.pub
sudo chmod 600 /root/.ssh/your-key
sudo chmod 644 /root/.ssh/your-key.pub
```

## Step 9: Configure S3 Storage and Docling for AI Applications

### Overview

This step configures S3-compatible storage (Cloudflare R2, AWS S3, etc.) for persistent data storage and adds Docling for document processing capabilities to your Coolify deployment.

### S3 Configuration

Set up S3 storage for applications requiring external object storage:

- Obtain S3 Credentials:

Create S3 bucket (e.g., through Cloudflare R2, AWS S3, or compatible service)

- Generate access key ID and secret access key

- Note the endpoint URL and region

- Environment Variables:

STORAGE_PROVIDER: Set to s3

- S3_ACCESS_KEY_ID: Your S3 access key

- S3_SECRET_ACCESS_KEY: Your S3 secret key

- S3_ENDPOINT_URL: S3 endpoint URL (e.g., https://yourbucket.r2.cloudflarestorage.com)

- S3_REGION_NAME: Region code (e.g., us-east-1, wnam)

- S3_BUCKET_NAME: Name of your S3 bucket

### Docling Integration

Docling is a document processing service that converts various document formats to structured markdown. It’s useful for AI applications that need to process PDFs, Word documents, and other file types.

### Docker Compose Example

Edit the `docker-compose.yml` file in Coolify with S3 storage and Docling:

```yaml
services:
  open-webui:
    image: 'ghcr.io/open-webui/open-webui:main'
    volumes:
      - 'open-webui:/app/backend/data'
    environment:
      - ENV=dev
      - SERVICE_URL_OPENWEBUI_8080
      - STORAGE_PROVIDER=s3
      - 'S3_ACCESS_KEY_ID=${S3_ACCESS_KEY_ID}'
      - 'S3_SECRET_ACCESS_KEY=${S3_SECRET_ACCESS_KEY}'
      - 'S3_ENDPOINT_URL=${S3_ENDPOINT_URL}'
      - 'S3_REGION_NAME=${S3_REGION_NAME}'
      - 'S3_BUCKET_NAME=${S3_BUCKET_NAME}'
    healthcheck:
      test:
        - CMD
        - curl
        - '-f'
        - 'http://127.0.0.1:8080'
      interval: 5s
      timeout: 30s
      retries: 10
  docling:
    image: 'quay.io/docling-project/docling-serve:latest'
    healthcheck:
      test:
        - CMD
        - curl
        - '-f'
        - 'http://127.0.0.1:5001/health'
      interval: 10s
      timeout: 30s
      retries: 5
volumes:
  open-webui: null
```

### Docling Usage

The Docling service exposes an API for document processing:

```bash
# Health check
curl http://localhost:5001/health

# Convert document to markdown
curl -X POST http://localhost:5001/convert \
  -F "file=@document.pdf"
```

### Security Considerations

- Store credentials securely: Use Coolify’s environment variable management or a secrets manager

- Never commit .env files: Add .env to .gitignore

- Use IAM policies: Restrict S3 bucket access to only what’s needed

- Rotate credentials regularly: Periodically rotate S3 access keys

- Use S3 bucket policies: Restrict access by IP or endpoint

## Verification

Check everything is working:

```bash
# Verify Docker location
sudo docker info | grep "Docker Root Dir"

# Check container status
sudo docker ps --format "table {{.Names}}\t{{.Status}}"

# Check disk usage
df -h / /mnt/myvolume
sudo du -sh /mnt/myvolume/docker
```

## Post-Reboot Checklist

After any server reboot, run the health check:

```text
/mnt/myvolume/coolify-data/check-coolify.sh
```

Or add to `.zshrc`:

```text
alias coolify-check='/mnt/myvolume/coolify-data/check-coolify.sh'
```

## Common Issues

### SSH Connection Timeout During Setup

**Symptom**: “ssh: connect to host host.docker.internal port 22: Operation timed out”

**Solution**: Ensure Docker networks can access SSH:

```text
sudo ufw allow from 172.16.0.0/12 to any port 22
```

### Containers Not Restarting After Reboot

**Symptom**: `coolify-sentinel` or other containers show as “Exited”

**Solution**: Update restart policy:

```bash
sudo docker update --restart=always coolify-sentinel
```

### Port Already in Use

**Symptom**: Installation fails because port 8000 or others are in use

**Solution**: Check and stop conflicting services:

```bash
sudo lsof -i :8000
sudo systemctl stop
```

## Environment Variables (.zshrc)

Add these to your `.zshrc` for convenience:

```bash
export COOLIFY_HOME="/mnt/myvolume/coolify-data"
export COOLIFY_AUTO_UPDATE="true"

alias coolify-check='/mnt/myvolume/coolify-data/check-coolify.sh'
```

## Storage Layout

After successful installation:

```text
/mnt/myvolume/
├── docker/                    # All Docker data (7.6GB+)
│   ├── containers/
│   ├── volumes/              # App data and databases
│   │   ├── coolify-db/
│   │   ├── coolify-redis/
│   │   └── /
│   └── ...
└── coolify-data/             # Coolify scripts and tools
    ├── check-coolify.sh
    └── coolify-installation-guide.md
```

## Summary

With this setup:

- ✅ Docker stores all data on /mnt/myvolume (large volume)

- ✅ Boot disk stays at ~24GB usage

- ✅ All deployed apps automatically use the large volume

- ✅ Coolify containers auto-restart after reboot

- ✅ Firewall properly configured for Oracle Cloud

- ✅ SSH keys properly configured for root user

- ✅ Custom domain with SSL (if configured)

For a more detailed explanation of how to install Coolify, please watch this excellent video that covers all the details

**Resources:**

- Coolify Official Documentation

- Coolify GitHub

- Coolify Discord Community
