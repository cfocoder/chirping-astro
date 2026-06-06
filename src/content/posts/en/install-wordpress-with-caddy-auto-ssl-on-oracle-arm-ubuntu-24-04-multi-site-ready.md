---
title: 'Install WordPress with Caddy & Auto-SSL on Oracle ARM Ubuntu 24.04 (Multi-Site Ready!)'
description: 'Setting up a WordPress blog or website on an efficient Oracle Cloud ARM instance is a great way to get performance on a budget. Combining it with the modern Caddy web server provides automatic HTTPS, simple configuration, and an excellent foundation for hosting multiple...'
pubDate: 2025-04-05
heroImage: '/images/2025/04/wordpress_caddy-2.png'
heroImageAlt: 'wordpress caddy'
categories: ['Linux']
tags: []
toc: true
---

Setting up a WordPress blog or website on an efficient Oracle Cloud ARM instance is a great way to get performance on a budget. Combining it with the modern Caddy web server provides automatic HTTPS, simple configuration, and an excellent foundation for hosting multiple web applications later on separate subdomains.

This guide walks through installing WordPress on the main domain (yourdomain.com) using Caddy v2 on an Oracle Cloud Infrastructure (OCI) ARM VM running Ubuntu 24.04. We’ll configure it so the main site uses a dedicated block volume for web files (/mnt/myvolume in this example), making it easy to add future apps (like app.yourdomain.com) in their own subdirectories on the same volume. We’ll also leverage Cloudflare for DNS and its security/performance benefits.

**Prerequisites:**

- An Oracle Cloud Infrastructure account.

- An OCI ARM Ampere VM created with Ubuntu 24.04 (4 vCPU / 24GB RAM used in this guide, but adjust as needed).

- SSH access to your VM.

- A registered domain name (we’ll use yourdomain.com) managed through Cloudflare.

- A Block Volume attached to your VM (we’ll assume it’s mounted at /mnt/myvolume).

Let’s get started!

## Step 1: Initial System Setup

First, log in to your VM via SSH and update the system packages:

```bash
sudo apt update
sudo apt upgrade -y
sudo apt install -y curl wget unzip ufw # Essential tools + firewall
```

## Step 2: Prepare Storage (Using Existing Mount)

This guide assumes you already attached your block volume and mounted it. In our case, lsblk showed the volume partition (e.g., /dev/sdb1) mounted at /mnt/myvolume. This directory will be our main web root for all applications.

_(Optional: If you hadn’t mounted it, you would format it (e.g., sudo mkfs.ext4 /dev/sdb1), create the mount point (sudo mkdir /mnt/myvolume), mount it (sudo mount /dev/sdb1 /mnt/myvolume), and add it to /etc/fstab for persistence.)_

Confirm the mount point:

```text
lsblk
df -h /mnt/myvolume
```

## Step 3: Configure Cloudflare DNS & SSL

Before installing Caddy, configure Cloudflare:

- DNS Records:

Log in to your Cloudflare dashboard.

- Go to the DNS settings for yourdomain.com.

- Ensure you have an A record for @ (or yourdomain.com) pointing to your VM’s Public IP Address (xxx.xxx.xxx.xxx). Set Proxy status to Proxied (Orange Cloud).

- Ensure you have a CNAME record for www pointing to @ (or an A record pointing to the IP). Set Proxy status to Proxied (Orange Cloud).

- SSL/TLS Mode:

Go to SSL/TLS -> Overview for yourdomain.com.

- Set the encryption mode to Full (strict). Caddy will provide the valid origin certificate.

## Step 4: Install Caddy Web Server

We’ll use the official Cloudsmith repository for the latest Caddy v2.

```bash
# Install prerequisites
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl

# Add Caddy repository GPG key
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg

# Add Caddy repository
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list

# Update package list and install Caddy
sudo apt update
sudo apt install caddy

# Enable and start the Caddy service
sudo systemctl enable caddy
sudo systemctl start caddy
sudo systemctl status caddy # Verify it's active (running)
```

## Step 5: Install MariaDB (Database Server)

WordPress needs a database. MariaDB is a reliable MySQL alternative.

```bash
sudo apt install -y mariadb-server mariadb-client
sudo systemctl enable mariadb
sudo systemctl start mariadb

# Secure the installation (Highly Recommended!)
sudo mysql_secure_installation
```

Follow the prompts for mysql_secure_installation: set a root password, remove anonymous users, disallow remote root login, remove the test database, and reload privileges. Answer ‘Y’ to the security recommendations.

Now, create the database and user for WordPress:

```text
# Log in to MariaDB as root
sudo mysql -u root -p # Enter the MariaDB root password you just set
```

Inside the MariaDB prompt, execute these commands (use a **strong, unique password** for YourStrongPassword):

```sql
CREATE DATABASE wordpress_db DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'wp_user'@'localhost' IDENTIFIED BY 'YourStrongPassword';
GRANT ALL PRIVILEGES ON wordpress_db.* TO 'wp_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

## Step 6: Install PHP-FPM

WordPress runs on PHP. Caddy works well with PHP-FPM. Ubuntu 24.04 uses PHP 8.3 by default.

```bash
# Install PHP-FPM and common extensions needed by WordPress
sudo apt install -y php8.3-fpm php8.3-mysql php8.3-curl php8.3-gd php8.3-intl php8.3-mbstring php8.3-soap php8.3-xml php8.3-xmlrpc php8.3-zip php8.3-imagick

# Enable and start PHP-FPM
sudo systemctl enable php8.3-fpm
sudo systemctl start php8.3-fpm

# Check the exact socket path (needed for Caddyfile)
ls /run/php/
```

Note the socket path shown (e.g., php8.3-fpm.sock). It’s usually /run/php/php8.3-fpm.sock.

## Step 7: Install WordPress

Download and set up the WordPress files in our designated web root.

```bash
# Navigate to your web root (the mounted volume)
cd /mnt/myvolume

# Download the latest WordPress
sudo wget https://wordpress.org/latest.tar.gz

# Extract it
sudo tar -xzvf latest.tar.gz

# Move files from the 'wordpress' subdirectory to the current directory
sudo mv wordpress/* .

# Clean up
sudo rm -rf wordpress latest.tar.gz

# Create the configuration file from the sample
sudo cp wp-config-sample.php wp-config.php

# Edit the configuration file
sudo nano /var/www/html/wp-config.php
```

Inside wp-config.php:

- Update Database Details: Find these lines and replace the placeholders with the database name, user, and password you created in Step 5.

```text
define( 'DB_NAME', 'wordpress_db' );
define( 'DB_USER', 'wp_user' );
define( 'DB_PASSWORD', 'YourStrongPassword' ); // Use the actual password!
define( 'DB_HOST', 'localhost' );
define( 'DB_CHARSET', 'utf8mb4' );
define( 'DB_COLLATE', '' );
```

2. **Add Security Keys:** Go to the official WordPress salt generator: [https://api.wordpress.org/secret-key/1.1/salt/](https://www.google.com/url?sa=E&q=https%3A%2F%2Fapi.wordpress.org%2Fsecret-key%2F1.1%2Fsalt%2F)
   Copy the entire block of generated keys and paste it over the placeholder keys in wp-config.php.

3. Save and close the file (Ctrl+X, Y, Enter).

- **Set Correct File Permissions:** This is crucial for WordPress updates, uploads, and security. Caddy runs as caddy, PHP-FPM often as www-data.

```bash
# Set ownership to the PHP user/group
sudo chown -R www-data:www-data /var/www/html/

# Set standard directory permissions (read/execute for all, write for owner)
sudo find /var/www/html/ -type d -exec chmod 755 {} \;

# Set standard file permissions (read for all, write for owner)
sudo find /var/www/html/ -type f -exec chmod 644 {} \;

# Allow Caddy group read/execute access (important for serving files)
sudo chgrp -R caddy /mnt/myvolume
sudo chmod -R g+rx /mnt/myvolume
```

## Step 8: Configure Caddy (Caddyfile)

Now we configure Caddy to serve WordPress and handle HTTPS automatically. This file also sets the stage for future subdomains.

```bash
# Backup the default Caddyfile (optional but good practice)
sudo cp /etc/caddy/Caddyfile /etc/caddy/Caddyfile.bak

# Edit the main Caddyfile
sudo nano /etc/caddy/Caddyfile
```

**Replace the entire content** with the following configuration. Replace your-email@example.com with your actual email address (for Let’s Encrypt notifications).

```text
# Global options
{
    email your-email@example.com
    # Note: client_ip_headers directive didn't work in Caddy v2.9.1/ARM/Ubuntu24 in testing
}

# Main WordPress Site
yourdomain.com {
    # Set the root directory to our mounted volume
    root * /mnt/myvolume
    encode zstd gzip
    file_server

    # Enable default logging (outputs JSON to systemd journal)
    log

    # PHP-FPM Setup - Verify socket path from Step 6!
    php_fastcgi unix//run/php/php8.3-fpm.sock {
        # Tell PHP to trust headers from Cloudflare IPs
        # Using explicit IPs due to validation issues with 'cloudflare' keyword in testing
        trusted_proxies 173.245.48.0/20 103.21.244.0/22 103.22.200.0/22 103.31.4.0/22 141.101.64.0/18 108.162.192.0/18 190.93.240.0/20 188.114.96.0/20 197.234.240.0/22 198.41.128.0/17 162.158.0.0/15 104.16.0.0/13 104.24.0.0/14 172.64.0.0/13 131.0.72.0/22 2400:cb00::/32 2606:4700::/32 2803:f800::/32 2405:b500::/32 2405:8100::/32 2c0f:f248::/32 2a06:98c0::/29
    }

    # Security Headers (Recommended)
    header {
        Strict-Transport-Security max-age=31536000;
        X-Content-Type-Options nosniff
        X-Frame-Options DENY
        Referrer-Policy strict-origin-when-cross-origin
        -Server # Remove Caddy signature
    }

    # Rewrite rule for WordPress pretty permalinks
    @wp {
        not file {path}
        not path /wp-admin/*
    }
    rewrite @wp /index.php?{query}

    # Block access to sensitive files
    @forbidden {
         path /wp-config.php
         path /xmlrpc.php # Disable unless needed for specific plugins/apps
         path /.git/*
         path /.env
         # Consider blocking other sensitive paths if needed
    }
    respond @forbidden 404
}

# --- Placeholder structure for future subdomains ---
#     Future apps will have their root under /mnt/myvolume in subdirs
#
# Example: A simple static site on static.yourdomain.com
# static.yourdomain.com {
#     # Create /var/www/html/static_site first
#     root * /var/www/html/static_site
#     file_server
#     encode zstd gzip
#     log # Use default logging
# }
#
# Example: Another PHP app on app.yourdomain.com
# app.yourdomain.com {
#     # Create /var/www/html/my_php_app first
#     root * /var/www/html/my_php_app
#     encode zstd gzip
#     file_server
#     log
#     php_fastcgi unix//run/php/php8.3-fpm.sock {
#         # Also trust Cloudflare for this app
#         trusted_proxies 173.245.48.0/20 ... 2a06:98c0::/29 # Truncated
#     }
# }
#
# Example: A Node.js app (running on port 3001) on nodeapp.yourdomain.com
# nodeapp.yourdomain.com {
#     reverse_proxy localhost:3001
#     encode zstd gzip
#     log
# }
```

Save and close the Caddyfile. Now, format and validate it, then restart Caddy:

```bash
# Format the Caddyfile (optional but good practice)
sudo caddy fmt --overwrite /etc/caddy/Caddyfile

# Validate the configuration
sudo caddy validate --config /etc/caddy/Caddyfile

# Restart Caddy to apply changes
sudo systemctl restart caddy

# Check status again
sudo systemctl status caddy
```

Make sure validation passes and the status shows active (running).

## Step 9: Configure Firewalls

We need to allow web traffic through both the VM’s firewall (ufw) and the OCI network security layer.

**UFW (VM Firewall):**

```text
sudo ufw status # Check current status
sudo ufw allow ssh # Ensure SSH is allowed!
sudo ufw allow http # Port 80 (for ACME challenges & redirects)
sudo ufw allow https # Port 443
sudo ufw enable # Enable if not already active (confirm with 'y')
sudo ufw status # Verify rules are active
```

**OCI Security List / Network Security Group (NSG):**

- Log in to your OCI console.

- Navigate to Networking -> Virtual Cloud Networks -> [Your VCN].

- Click Security Lists or Network Security Groups (whichever controls your VM’s subnet/VNIC).

- Select the relevant list/group.

- Ensure you have Ingress Rules allowing traffic:

Source: 0.0.0.0/0 (or restrict to Cloudflare IPs if desired: https://www.cloudflare.com/ips/)

- IP Protocol: TCP

- Destination Port Range: 80

- (Add another rule)

- Source: 0.0.0.0/0 (or Cloudflare IPs)

- IP Protocol: TCP

- Destination Port Range: 443

- Add/modify rules if necessary and allow a minute for them to apply.

## Step 10: Final WordPress Setup (Web UI)

Open your web browser and navigate to https://yourdomain.com. Thanks to Caddy, it should automatically redirect to HTTPS and have a valid certificate.

You should see the WordPress installation screen:

- Select your language.

- Enter your Site Title, Admin Username, a strong Admin Password, and your Admin Email.

- Click “Install WordPress”.

- Log in using the credentials you just created.

## Step 11: Check Logging and Visitor IPs

We configured Caddy to use its default logger, which sends JSON-formatted logs to the systemd journal.

To view logs:

```text
# Follow logs in real-time
sudo journalctl -u caddy -f

# View last 50 log entries
sudo journalctl -u caddy -n 50 --no-pager
```

Look for entries with “logger”: “http.log.access”. Since we couldn’t get Caddy’s client_ip field to automatically show the real visitor IP in this specific setup, you’ll need to look inside the JSON structure:

```text
{
  // ...
  "request":{
    "remote_ip":"xxx.xxx.xxx.xxx", // Cloudflare IP
    "client_ip":"xxx.xxx.xxx.xxx", // Cloudflare IP
    "headers":{
        "X-Forwarded-For":["REAL_VISITOR_IP_HERE"], // The trusted_proxies setting inside the php_fastcgi block ensures WordPress itself (via PHP) sees the correct IP from X-Forwarded-For.

### Adding Future Subdomain Apps

The Caddyfile is structured for easy expansion:

- Create a subdirectory inside your main web root for the new app (e.g., sudo mkdir /var/www/html/my_cool_app).

- Place your app’s files in that subdirectory.

- Set appropriate permissions (similar to Step 7, adjusting the path).

- Add a new site block to /etc/caddy/Caddyfile for the subdomain (e.g., my_cool_app.yourdomain.com), following the commented-out examples. Ensure the root directive points to the correct subdirectory (/var/www/html/my_cool_app). Configure php_fastcgi, reverse_proxy, etc., as needed for that specific app.

- Add the corresponding DNS record (A or CNAME) in Cloudflare, pointing to your server IP (xxx.xxx.xxx.xxx) and set to Proxied.

- Validate and reload Caddy: sudo caddy validate –config /etc/caddy/Caddyfile && sudo systemctl reload caddy. Caddy will automatically get an SSL certificate for the new subdomain.

### Conclusion

You now have a WordPress site running efficiently on an Oracle ARM VM, served securely over HTTPS by Caddy. By using a dedicated block volume mounted at /mnt/myvolume and structuring the Caddyfile appropriately, you’re perfectly set up to add more web applications on subdomains in the future without major reconfiguration. Caddy’s simplicity and automatic HTTPS make managing multiple sites much easier. Happy blogging!
```
