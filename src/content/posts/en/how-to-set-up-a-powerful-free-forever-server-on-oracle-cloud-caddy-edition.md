---
title: 'How to Set Up a Powerful, Free Forever Server on Oracle Cloud (Caddy Edition)'
description: 'Earlier in 2025, I signed up for Oracle’s “Free Forever” cloud offer. It was, and still is, one of the most generous free tiers available, especially for developers and hobbyists. I wrote a blog post to document my setup, and today I’m updating it with a more modern,...'
pubDate: 2025-07-03
heroImage: '/images/2025/07/oracle2.png'
heroImageAlt: 'oracle2'
categories: ['Linux']
tags: []
toc: true
---

Earlier in 2025, I signed up for [Oracle’s “Free Forever” cloud offer](https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm). It was, and still is, one of the most generous free tiers available, especially for developers and hobbyists. I wrote a [blog post to document my setup,](https://cfocoder.com/free-forever-oracle-virtual-private-server-vps/) and today I’m updating it with a more modern, simpler stack and more tips for anyone starting out.

The goal remains the same: **to combine all the “Always Free” resources into a single, powerful virtual private server (VPS)** that you can use for your projects without ever paying a dime. This guide is my personal reference for setting it up again, and I hope it helps you too.

Oracle Cloud’s Always Free tier offers an incredibly generous free VPS that’s perfect for hosting websites, APIs, and side projects. This comprehensive guide combines the simplicity of Caddy with robust security practices to create a production-ready server.

## What You Actually Get: The “Always Free” Powerhouse

First, let’s be clear about how generous this offer is. When you consolidate the main resources for a single server, this is what you get, for free, forever:

| Component / Purpose | “Always Free” Allocation                    | How It Benefits Your Server                                                                                                            |
| ------------------- | ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Server CPU & RAM    | 4 ARM OCPUs & 24 GB RAM                     | This is the core of your machine. It’s powerful enough to run multiple apps, a game server, or a complex web service.                  |
| Primary Storage     | 200 GB Block Storage (Total)                | Your server’s “hard drive.” This is the combined total of boot volumes and block volumes. Typically: 50 GB boot + 150 GB block volume. |
| Database            | 2 Autonomous Databases                      | You get two dedicated, fully-managed Oracle databases. Offloading your database work to these frees up your server’s CPU and RAM.      |
| Networking          | 1 Load Balancer & 10 TB/month Data Transfer | A stable public entry point for your services and a massive amount of free bandwidth.                                                  |

## Why Caddy Over NGINX?

While NGINX is powerful and widely used, Caddy offers several advantages:

- Automatic HTTPS: Caddy automatically obtains and renews SSL/TLS certificates from Let’s Encrypt

- Simpler Configuration: Caddy’s configuration syntax is more intuitive and easier to read

- Modern Defaults: Caddy comes with secure defaults out of the box

- No Plugin Required: Unlike NGINX, you don’t need additional plugins for automatic SSL

## Step 1: Sign Up and Create the Instance

### Sign Up for the Offer

Go to the [Oracle Cloud Free Tier](https://www.oracle.com/cloud/free/) page and sign up. You will need a credit card for verification, but you won’t be charged as long as you only use “Always Free” eligible resources.

### Select Your Home Region

Choose your region carefully. All your “Always Free” resources must be in this single region. In my case, I selected Phoenix, as it is one of the big regions closer to Mexico. I had the bad experience in another Oracle VM setup of selecting Querétaro, México, but since it is new and doesn’t have as much resources as other regions, I couldn’t install any server under the free eligible offer.

### Create a VM Instance

From the OCI console dashboard, click **“Create a VM instance”**

![](/images/2025/07/image.png)

### Configure the Instance

**Shape Configuration:**

- Name: Give your server a descriptive name, like vps-main or my-cloud-server

- Placement: Leave as is

- Image and Shape: This is the most important part

Click “Edit”

- Click “Change Image” and select Ubuntu (the latest LTS version – currently 24.04)

- Click “Change Shape”

- Select “Ampere” under “Shape series”

- Choose the VM.Standard.A1.Flex shape

- Drag the OCPU slider to 4 and the Memory slider to 24

- This uses up your entire free ARM allocation for maximum power

- Click “Select shape”

![](/images/2025/07/image-1.png)

![](/images/2025/07/image-2.png)

![](/images/2025/07/image-3.png)

![](/images/2025/07/image-6.png)

![](/images/2025/07/image-7.png)

![](/images/2025/07/image-8.png)

![](/images/2025/07/image-9.png)

**Boot Volume:**

- The default boot volume size is 50 GB (minimum: 47 GB)

- You can increase it up to 200 GB, but this uses your entire free storage allocation

- Important: The 200 GB free tier limit applies to the combined total of boot volumes AND block volumes

- Recommended approach: Keep the default 50 GB boot volume, then add a 150 GB block volume later for flexibility

![](/images/2025/07/image-12.png)

**SSH Keys:**

- Download and securely store the private key. Losing it means losing access to the VM

- The private key file on your local machine must have permissions 600 or 400

- Use a dedicated key for this server

![](/images/2025/07/image-10.png)

### Create the Instance

After all these steps, click **“Create”** to launch the VM. It will take a minute or two to provision. Once it’s “Running” (green), note down its **Public IP Address**.

![](/images/2025/07/image-11.png)

## Step 2A: Networking Configuration (Critical)

- Security List: This is absolutely critical. Oracle Cloud has a built-in firewall that must be configured

Create a new Security List (or modify the default)

- Add Ingress Rules BEFORE launching the instance:

Rule 1 (SSH):

Source: 0.0.0.0/0

- IP Protocol: TCP

- Destination Port Range: 22

- Stateless: No

- Rule 2 (HTTP):

Source: 0.0.0.0/0

- IP Protocol: TCP

- Destination Port Range: 80

- Stateless: No

- Rule 3 (HTTPS):

Source: 0.0.0.0/0

- IP Protocol: TCP

- Destination Port Range: 443

- Stateless: No

**Important:** Without these rules, the VM will be unreachable, even if UFW is configured correctly later. This is the single biggest source of problems for new users.

![](/images/2025/07/image-16.png)

![](/images/2025/07/image-17.png)

![Oracle Security List Configuration](/images/2025/03/security_list.png)

## Step 2B: Setup a Static Public IP Address

When you create a VM, it usually gets an ephemeral public IP that can change if you stop/start the VM. A reserved public IP stays assigned to your account until you release it.

![](/images/2025/07/image-15.png)

### Access the Oracle Cloud Console

Log in to your Oracle Cloud Infrastructure (OCI) console.

### Navigate to Networking → Public IPs

In the OCI menu, go to **Networking** → **IP Management** → **Reserved Public IPs**

### Create a Reserved Public IP

- Click the Reserve Public IP Address button

- Fill in the details:

Create in Compartment: Select the same compartment where your VM is located

- Name: Give it a descriptive name (e.g., my-server-reserved-ip)

- IP Address Source: Choose Oracle (Recommended)

- IP Address Assignment: Choose Reserve a public IPv4 address

- Click Reserve Public IP Address

### Detach the Ephemeral IP

- Go to your VM instance details: Compute → Instances → Click your VM

- Under Resources, click Attached VNICs

- Click on the name of your VNIC

- Under Resources, click IPv4 Addresses

- Click the three dots menu (…) next to the ephemeral IP address

- Select Edit

- Change Public IP Type to No Public IP

- Click Update

### Attach the Reserved IP

- Stay on the same IPv4 Addresses page for your VNIC

- Click “Assign Public IPv4 Address” (or click the three dots on the Private IP Address and hit “Edit”)

- Choose Reserved Public IP

- Select the reserved IP you created from the dropdown

- Click Assign or Update

## Step 3: Connect to Your Server via SSH

You’ll use an SSH client to connect. If you’re on Windows, you can use PowerShell, WSL, Git Bash or PuTTY. On macOS or Linux, use your terminal.

### Prepare Your SSH Key

If you’re using WSL on Windows, first copy the key to your WSL instance:

```bash
# Copy from Windows downloads to WSL
cp /mnt/c/Users/your_username/Downloads/ssh-key-file.key ~/.ssh/my-server.key

# Set the correct permissions (mandatory for security)
chmod 400 ~/.ssh/my-server.key
```

![](/images/2025/07/image-13.png)

If you’re on macOS or Linux, just move the key to `~/.ssh/` and set permissions:

```bash
# Move the key to SSH directory
mv ~/Downloads/ssh-key-file.key ~/.ssh/my-server.key

# Set the correct permissions
chmod 400 ~/.ssh/my-server.key
```

### Connect to the Server

```bash
# Replace the IP with your server's public IP
ssh -i ~/.ssh/my-server.key ubuntu@YOUR_SERVER_IP
```

Type `yes` when prompted to trust the host. You are now logged into your new server!

**Note:** The default username for Ubuntu instances is `ubuntu`

## Step 4: Understanding Users and Creating Your Own Account

### Default Users on Your Oracle Ubuntu VM

When Oracle creates your Ubuntu VM, it automatically sets up these user accounts:

- root: The superuser account with full system privileges (SSH login disabled for security)

- ubuntu: The default user account you use to connect via SSH

**Important Security Note:**

- Neither root nor ubuntu have passwords set by default

- Oracle Cloud uses SSH key-based authentication only – password login is disabled

- The ubuntu user has passwordless sudo access (can run admin commands without a password)

- You authenticate using the SSH private key you downloaded during VM creation

### Why Create Another User Account?

While you can use the `ubuntu` account for everything, creating your own user account is recommended for:

- Emergency Console Access: If you get locked out of SSH, you can use the Oracle Instance Console to login with a password-based account

- Best Practice: Separate your personal administration from the default system account

- Multiple Administrators: Give access to other people without sharing your SSH key

- Better Audit Trail: Track who performed which actions on the server

### Create Your Own User Account

```bash
# Create a new user (replace 'username' with your desired username)
sudo adduser username

# This will prompt you to:
# 1. Set a password (important for Oracle Console access!)
# 2. Enter optional user information (you can skip these)

# Add the user to the sudo group (for administrative privileges)
sudo usermod -aG sudo username

# Add the user to the adm group (for log access)
sudo usermod -aG adm username
```

### Set Up SSH Keys for Your New User (Optional but Recommended)

If you want to login directly as your new user via SSH:

```bash
# Switch to the new user
su - username

# Create SSH directory
mkdir -p ~/.ssh
chmod 700 ~/.ssh

# Copy the authorized keys from ubuntu user
sudo cp /home/ubuntu/.ssh/authorized_keys ~/.ssh/
sudo chown username:username ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

Now you can connect directly:

```bash
ssh -i ~/.ssh/my-server.key username@YOUR_SERVER_IP
```

### Quick User Switching

You can switch between users without logging out:

```text
# Switch to your user account
su - username

# Switch back to ubuntu (if needed)
su - ubuntu

# Return to previous user
exit
```

## Step 5: Essential Server Security

Before installing anything, let’s update the system and prepare for security configuration.

```bash
# Update package list and upgrade installed packages
sudo apt update && sudo apt upgrade -y
```

This ensures all your system packages are up to date with the latest security patches.

## Step 6: Install and Configure UFW Firewall

UFW (Uncomplicated Firewall) is a simple firewall to manage access rules by ports. This provides an additional layer of security on top of Oracle’s cloud firewall.

**CRITICAL WARNING:** Before enabling UFW, you MUST allow SSH connections, or you will lock yourself out of the server!

### Connect via Instance Console (Recommended)

To prevent accidental lockout, connect to your VM from the Oracle Instance Console:

It will ask for the username and password that we created in the step earlier. We can’t use root or ubuntu users because they are passwordless. Accessing the server from Cloud Shell should be done only for emergencies when for some reason we get locked out from accessing it via SSH, that’s why it is very important to setup another user

![](/images/2025/07/image-19.png)

- Go to your instance details in OCI Console

- Click “Launch Cloud Shell Connection”

- This opens a terminal at the bottom

- Switch to the ubuntu user:

```text
sudo su - ubuntu
```

Verify you’re using the correct user:

```text
whoami
```

### Install and Configure UFW

```bash
# Update and install UFW
sudo apt update
sudo apt upgrade -y
sudo apt install ufw -y

# CRITICAL: Allow SSH first to prevent lockout
sudo ufw allow 22/tcp

# Allow HTTP and HTTPS for web traffic
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Check the rules before enabling
sudo ufw show added
```

### Enable UFW

After verifying the rules look correct:

```text
# Enable the firewall
sudo ufw enable

# Verify the status
sudo ufw status
```

You should see output showing UFW is active with ports 22, 80, and 443 allowed.

![UFW Status](/images/2025/03/ufw.png)

### If You Get Locked Out

If you can’t connect via SSH after enabling UFW, connect via Oracle Instance Console and run:

```text
sudo ufw disable
```

Then carefully review and re-add your firewall rules.

### Optional: Allow Other Ports

If you need to allow other ports for specific applications:

```text
# MySQL/MariaDB
sudo ufw allow 3306/tcp

# PostgreSQL
sudo ufw allow 5432/tcp

# Custom application port
sudo ufw allow 8080/tcp
```

**Best Practice:** Only allow ports that are absolutely necessary. The fewer ports you have open, the more secure your server is.

## Step 7: Install Caddy Web Server

This is where we replace NGINX and Certbot with a much simpler solution. Caddy automatically provisions and renews free SSL certificates from Let’s Encrypt.

### Install Caddy

We’ll add Caddy’s official repository to ensure we get updates:

```bash
# Install prerequisites
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https

# Add Caddy's GPG key
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg

# Add Caddy's repository
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list

# Update and install Caddy
sudo apt update
sudo apt install caddy

# Verify Caddy is running
sudo systemctl status caddy
```

### Configure Caddy

Caddy is configured with a simple file called `Caddyfile`. Let’s create a basic configuration.

```text
# Open the Caddyfile with a text editor
sudo nano /etc/caddy/Caddyfile
```

Delete all the default content and replace it with this:

```text
your-domain.com {
    respond "Hello from my new Oracle server!"
}
```

**Important:** Replace `your-domain.com` with the actual domain name you will point to this server.

Save the file and exit (Ctrl+X, then Y, then Enter).

### Reload Caddy

To apply the new configuration:

```bash
sudo systemctl reload caddy
```

### Verify Caddy is Working

Check the status:

```bash
sudo systemctl status caddy
```

You should see that Caddy is “active (running)”.

## Step 8: Configure Your DNS

Now, point your domain name to the server’s IP address.

### At Your Domain Registrar

- Go to your domain registrar (Namecheap, GoDaddy, Cloudflare, etc.)

- Find the DNS management section for your domain

- Create an “A” record:

Host/Name: @ (for the root domain your-domain.com) or www (for www.your-domain.com)

- Value/Points to: Your server’s Public IP Address

- TTL (Time to Live): Set to the lowest possible value or leave as default

- Save the record

DNS changes can take anywhere from a few minutes to a few hours to propagate. You can check propagation at [whatsmydns.net](https://www.whatsmydns.net/).

## Step 9: Final Verification

Once your DNS has updated, open a web browser and navigate to `https://your-domain.com`.

You should see:

- Your message: “Hello from my new Oracle server!”

- A padlock icon in the address bar (indicating HTTPS is working)

- Caddy has automatically handled the entire HTTPS process for you!

### Troubleshooting

If you don’t see your site:

- Check DNS Propagation: Use whatsmydns.net to verify DNS has propagated

- Check Firewalls: Verify ports 80 and 443 are open in both UFW and Oracle Cloud security list

- Check Caddy Configuration:# View Caddy logs sudo journalctl -u caddy -n 50 # Test from within the VM curl http://localhost/

- Verify Domain in Caddyfile: Make sure the domain in /etc/caddy/Caddyfile matches exactly

## Step 10: Add Block Volume for Additional Storage (Optional)

Since we used the default 50 GB boot volume during instance creation, you have 150 GB of free storage remaining in your Always Free allocation.

### Understanding Oracle’s Storage Allocation

Oracle’s Always Free tier provides **200 GB total** of block storage, which includes:

- Boot volumes: The primary disk where your OS is installed (minimum 47 GB, default 50 GB)

- Block volumes: Additional storage you can attach to instances

You have two options:

- Single large boot volume: 200 GB boot volume (uses entire allocation, less flexible)

- Boot + Block volumes: 50 GB boot + 150 GB block volume (recommended for flexibility)

### Why Use a Separate Block Volume?

- Flexibility: You can detach and attach block volumes to different instances

- Data persistence: Keep your data separate from the OS

- Better organization: Use boot volume for OS/apps, block volume for data

- Easier backups: Back up data volume separately from system volume

### Adding and Mounting a Block Volume

For detailed instructions on creating, attaching, and properly mounting a block volume with systemd (for automatic mounting on boot), see this dedicated guide:

**[Adding and Mounting a Block Volume in Ubuntu with systemd](https://cfocoder.com/adding-and-mounting-a-block-volume-in-ubuntu-with-systemd/)**

The guide covers:

- Creating and attaching a block volume in Oracle Cloud

- Formatting the volume with ext4

- Setting up systemd mount units (more reliable than fstab)

- Proper permissions and ownership configuration

- Troubleshooting common issues

## Step 11: Create a Custom Image (Backup)

Before installing additional software, create a backup image of your VM. This allows you to quickly restore or create new VMs if something goes wrong.

### Stop the VM (Recommended)

It’s strongly recommended to stop the VM before creating a custom image to ensure filesystem consistency:

- In OCI Console, go to your instance details

- Click “Stop” and wait for it to completely stop

### Create the Custom Image

- On the instance details page, click “More Actions” → “Create Custom Image”

- Give it a descriptive name (e.g., my-server-caddy-baseline-2025-11-01)

- Choose your compartment

- Click “Create Custom Image”

The process will take some time depending on your boot volume size.

### Start the VM Again

After the image is created, start your VM:

- Click “Start” on the instance details page

- Wait for it to reach “Running” state

- Reconnect via SSH

### How to Use the Custom Image

To create a new VM from your custom image:

- Go to Compute → Custom Images

- Find your image and click it

- Click “Create Instance”

- Complete the instance creation as normal

## Additional Useful Tools

### Install tmux

tmux allows you to manage multiple terminal sessions and keep processes running even after you disconnect:

```bash
# Install tmux
sudo apt update
sudo apt install tmux -y
```

Basic tmux commands:

| Action                    | Command                     |
| ------------------------- | --------------------------- |
| Start a new session       | tmux                        |
| Create a named session    | tmux new -s session_name    |
| Detach from session       | Ctrl + B then D             |
| List active sessions      | tmux ls                     |
| Reattach to session       | tmux attach -t session_name |
| Close session from within | exit                        |

### Install curl and wget

Essential tools for downloading files and making HTTP requests:

```bash
sudo apt update
sudo apt install curl wget -y
```

### Python Environment Setup (Optional)

If you plan to run Python applications:

```bash
# Install pip3
sudo apt install python3-pip -y

# Install pipx (for isolated Python tools)
sudo apt install pipx
pipx ensurepath

# Install uv (modern Python package manager)
pipx install uv

# Verify installation (close and reopen terminal first)
uv --version
```

## What’s Next? Ideas for Your Server

You now have a powerful, secure, and free ARM server. Here are some great ideas for what to do with it:

### Host a Website or Web App

Caddy can easily:

- Run a static site using the file_server directive

- Act as a reverse proxy for applications written in Node.js, Python, Go, or PHP

Example Caddyfile for a static site:

```text
your-domain.com {
    root * /var/www/your-site
    file_server
}
```

Example Caddyfile for a reverse proxy:

```text
app.your-domain.com {
    reverse_proxy localhost:3000
}
```

### Run Docker Containers

Install Docker and manage multiple applications in containers:

```bash
sudo apt install docker.io docker-compose -y
sudo usermod -aG docker $USER
```

**Important:** Use Docker images built for the `linux/arm64` architecture. Many official images on Docker Hub are multi-arch and will work seamlessly.

### Host a Minecraft Server

The standard Java version of the Minecraft server runs perfectly on ARM:

```bash
sudo apt install default-jre -y
```

Then download and run the Minecraft server JAR file.

### Media Server

Set up Plex or Jellyfin. Both have official, native builds for ARM64:

- Jellyfin ARM64 Installation

- Plex Media Server

### Connect to Oracle Autonomous Database

Install your application stack on the server and use the free Oracle database as your backend for amazing performance, freeing up your server’s resources.

### Host a Development Environment

Set up:

- Git server (Gitea or GitLab)

- CI/CD pipelines

- Code-server (VS Code in the browser)

- JupyterHub for data science work

## Preventing Instance Reclamation

**Important:** Oracle may reclaim “idle” Always Free instances. An instance is idle if it has very low CPU, memory, or network usage for 7 days.

To prevent this:

- Run a web server that gets occasional traffic (which you’ve done!)

- Set up a simple cron job that performs periodic tasks

- Run a lightweight monitoring service

- Keep Docker containers running

Simply having Caddy running and serving your website should be sufficient to avoid the idle classification.

## Best Practices Summary

- Always use SSH keys, never password authentication

- Configure both firewalls: Oracle Cloud Security List AND UFW

- Create regular backups using Custom Images

- Keep the system updated: Run sudo apt update && sudo apt upgrade regularly

- Use tmux for long-running processes

- Monitor logs: sudo journalctl -u caddy for Caddy logs

- Use subdomain for applications: Keep your main domain for your main site

- Test in staging first: Use your custom image to spin up test VMs for experimentation

- Document your setup: Keep notes of what you’ve installed and configured

- Set up monitoring: Consider installing monitoring tools like Netdata or Prometheus

## Caddy Configuration Examples

### Multiple Sites with Subdomains

```text
your-domain.com {
    root * /var/www/main-site
    file_server
}

blog.your-domain.com {
    root * /var/www/blog
    file_server
}

api.your-domain.com {
    reverse_proxy localhost:8080
}
```

### With Custom Headers and Compression

```text
your-domain.com {
    encode gzip

    header {
        # Enable HSTS
        Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
        # Security headers
        X-Content-Type-Options "nosniff"
        X-Frame-Options "DENY"
        Referrer-Policy "strict-origin-when-cross-origin"
    }

    root * /var/www/your-site
    file_server
}
```

### With Rate Limiting

```text
your-domain.com {
    rate_limit {
        zone dynamic {
            key {remote_host}
            events 100
            window 1m
        }
    }

    reverse_proxy localhost:3000
}
```

## Conclusion

You now have a production-ready, secure, and powerful free server running on Oracle Cloud with Caddy handling automatic HTTPS. This setup combines:

- Security: UFW firewall + Oracle Cloud Security Lists + automatic HTTPS

- Simplicity: Caddy’s easy configuration

- Power: 4 ARM cores and 24GB RAM

- Reliability: Custom image backups

- Scalability: Ready for multiple applications and domains

Enjoy your free forever server! 🚀

**Additional Resources:**

- Oracle Cloud Free Tier Documentation

- Caddy Documentation

- Ubuntu Server Guide

- UFW Documentation
