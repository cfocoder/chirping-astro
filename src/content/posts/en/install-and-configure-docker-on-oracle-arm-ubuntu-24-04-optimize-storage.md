---
title: 'Install and Configure Docker on Oracle ARM (Ubuntu 24.04) – Optimize Storage!'
description: 'Oracle Cloud Infrastructure (OCI) offers powerful and cost-effective ARM Ampere A1 instances. Running Ubuntu 24.04 LTS (“Noble Numbat”) on these instances is a popular choice. If you’re planning to use Docker, this guide will walk you through the official installation...'
pubDate: 2025-04-06
heroImage: '/images/2025/04/oracle_ubuntu_docker.png'
heroImageAlt: 'oracle ubuntu docker'
categories: ['Linux']
tags: []
toc: true
---

Oracle Cloud Infrastructure (OCI) offers powerful and cost-effective ARM Ampere A1 instances. Running Ubuntu 24.04 LTS (“Noble Numbat”) on these instances is a popular choice. If you’re planning to use Docker, this guide will walk you through the official installation process and, crucially, show you how to configure Docker to use a separate OCI Block Volume for its data. This is **highly recommended** to avoid filling up the limited boot volume space often provided by default.

**Why Optimize Docker Storage on OCI ARM?**

- Boot Volume Limits: OCI instances often have relatively small boot volumes. Docker images and volumes can consume gigabytes quickly.

- Leverage Block Volumes: OCI makes it easy to attach larger, performant Block Volumes – perfect for Docker’s storage needs.

- Performance & Scalability: Separating Docker data can potentially improve I/O performance and makes managing storage simpler.

This guide assumes you have:

- An OCI ARM Ampere A1 Compute instance running Ubuntu 24.04 LTS.

- Access via SSH with a user account having sudo privileges.

- A separate OCI Block Volume attached, formatted (e.g., ext4), and persistently mounted to your instance (e.g., via /etc/fstab). We’ll use /mnt/blockvolume as the example mount point – replace this with your actual mount path.

Let’s get Docker installed and configured!

## Table of Contents

- Step 1: Prepare Your Ubuntu 24.04 System

- Step 2: Add Docker’s Official GPG Key

- Step 3: Set Up the Docker Repository

- Step 4: Install Docker Engine and Plugins

- Step 5: Configure Docker to Use Your Block Volume (/mnt/myvolume) & Grant User Access

- Step 6: Verify Docker Installation and Configuration

- Step 7: Test Docker Without sudo

## Step 1: Prepare Your Ubuntu 24.04 System

First, update your package list and install prerequisite packages needed for adding repositories securely over HTTPS:

```bash
sudo apt update
sudo apt install -y ca-certificates curl gnupg
```

## Step 2: Add Docker’s Official GPG Key

To ensure the authenticity of the Docker packages, add Docker’s official GPG signing key:

```bash
# Create the directory for apt keys if it doesn't exist
sudo install -m 0755 -d /etc/apt/keyrings

# Download Docker's GPG key, de-armor it (convert format), and save
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Ensure the key file is readable by the package manager
sudo chmod a+r /etc/apt/keyrings/docker.gpg
```

## Step 3: Set Up the Docker Repository

Now, add the official Docker repository specific to your architecture (ARM64) and Ubuntu version (Noble Numbat) to your system’s sources:

```bash
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
```

**Platform Aware:** Notice \$(dpkg –print-architecture) automatically detects your arm64 architecture, and \$(. /etc/os-release && echo “\$VERSION_CODENAME”) correctly identifies noble for Ubuntu 24.04. This ensures you get the right packages.

## Step 4: Install Docker Engine and Plugins

Update the package list again to fetch package information from the new Docker repository, then install the core components:

```bash
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

- docker-ce: Docker Engine (Community Edition) for ARM64.

- docker-ce-cli: The command-line tool to interact with Docker.

- containerd.io: The underlying container runtime.

- docker-buildx-plugin: For efficient, modern image building.

- docker-compose-plugin: The standard way to use Docker Compose. Allows docker compose … commands.

## Step 5: Configure Docker to Use Your Block Volume (/mnt/myvolume) & Grant User Access

This crucial section covers redirecting Docker’s main data directory to your mounted Block Volume at /mnt/myvolume and ensuring your regular user can interact with Docker without needing sudo for every command.

**Important Prerequisite:** Ensure you have successfully attached, formatted, and **persistently mounted** your block volume (/dev/sdb1 in our example) specifically at the /mnt/myvolume path via /etc/fstab.

**5.1. Stop the Docker Service:**

Ensure Docker is completely stopped before changing its core configuration.

```bash
sudo systemctl stop docker
sudo systemctl stop docker.socket
```

**5.2. Verify the Mount Point /mnt/myvolume:**

Double-check that your block volume is correctly mounted at /mnt/myvolume.

```text
df -h /mnt/myvolume
```

**Expected Output Check:** The output **MUST** show your block device as the Filesystem (e.g., /dev/sdb1) and its size (e.g., 148G). If not, **STOP** and fix your mount configuration first.

**5.3. Create Docker Data Directory on /mnt/myvolume:**

Create the specific subdirectory *inside* /mnt/myvolume where Docker will store its data.

```bash
# This creates the 'docker' subdirectory INSIDE your /mnt/myvolume block volume.
sudo mkdir -p /var/www/html/docker
```

**5.4. Configure Docker Daemon (daemon.json):**

Edit (or create) the Docker daemon configuration file to set the new data location.

```text
sudo nano /etc/docker/daemon.json
```

Add the following content, ensuring the data-root path is exactly /var/www/html/docker.

```json
{
  "data-root": "/var/www/html/docker"
}
```

Save and close the file (Ctrl+X, then Y, then Enter).

**5.5. Restart Docker Service:**

Docker will now read the new configuration and start using the specified directory.

```bash
sudo systemctl start docker
```

**5.6. Verify Docker Data Root Configuration:**

Confirm that Docker is using the new setting. You might need sudo for this *first* check before adjusting user permissions.

```bash
# Run this first check WITH sudo
sudo docker info | grep "Docker Root Dir"
```

- Expected Output Verification: You should see: Docker Root Dir: /var/www/html/docker.

- Troubleshooting: If it still shows /var/lib/docker or fails, review steps 5.4 & 5.3, check directory existence, restart Docker (sudo systemctl restart docker), and check logs (sudo journalctl -u docker.service).

**5.7. Grant Docker Permissions to Your User (Recommended):**

To avoid typing sudo for every Docker command, add your regular user (e.g., ubuntu) to the docker group.

- Add User to Group:

```bash
# Replace $USER with your actual username if not logged in as that user
sudo usermod -aG docker $USER
```

- The -aG options append your user to the supplementary docker group.

- Activate Group Changes: Group membership changes require you to start a new session. Choose one of the following:

Option A (Easiest): Log out of your SSH session and log back in.

- Option B (Current Session Only): Run newgrp docker. This starts a new sub-shell with the group active. You can continue working in this sub-shell.

- Verify User Access (No Sudo): After logging back in or running newgrp docker, test a Docker command without sudo.

**Important:** Log out and log back in, or reboot the instance for this group change to take effect. A reboot is often easiest:

```text
sudo reboot
```

```bash
# Should work WITHOUT sudo now
docker info | grep "Docker Root Dir"
docker ps
```

You should no longer get a “permission denied” error.

## Step 6: Verify Docker Installation and Configuration

Let’s confirm everything is working as expected on your Oracle ARM instance:

- Check Docker Engine Version:

```bash
docker --version
```

**2. Check Docker Compose Version:**

```bash
docker compose version
```

## Step 7: Test Docker Without sudo

After rebooting and logging back in, ensure you can run Docker commands as your regular user:

```bash
# Should run without sudo now
docker run hello-world
```

If the hello-world container runs successfully without errors, congratulations! You have successfully installed Docker on your Oracle ARM Ubuntu 24.04 instance, configured it to use your OCI Block Volume for optimal storage, and granted necessary user permissions. Your Docker environment is ready for building and running ARM-compatible containers!
