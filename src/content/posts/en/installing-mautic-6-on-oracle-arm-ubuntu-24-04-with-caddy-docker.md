---
title: 'Installing Mautic 6 on Oracle ARM Ubuntu 24.04 with Caddy & Docker'
description: 'Marketing automation is a powerful tool for businesses looking to nurture leads, engage customers, and streamline marketing efforts. Mautic stands out as a leading open-source marketing automation platform, offering a robust alternative to expensive proprietary solutions.'
pubDate: 2025-04-19
heroImage: '/images/2025/04/mautic_logo.png'
heroImageAlt: 'mautic logo'
categories: ['Linux']
tags: []
toc: true
---

Marketing automation is a powerful tool for businesses looking to nurture leads, engage customers, and streamline marketing efforts. Mautic stands out as a leading open-source marketing automation platform, offering a robust alternative to expensive proprietary solutions.

**What is Mautic?** It’s a comprehensive platform that allows you to manage your marketing campaigns, track user interactions, segment your audience, and automate communications across various channels. Key features include detailed lead tracking (website visits, form submissions, email opens), sophisticated email campaign builders, dynamic content, audience segmentation tools, landing page and form creation, and in-depth reporting.

Self-hosting Mautic gives you complete control over your data, avoids vendor lock-in, offers limitless customization possibilities, and can be significantly more cost-effective than SaaS alternatives. It’s particularly helpful for businesses that prioritize data privacy, need specific integrations, or want to deeply tailor their marketing automation workflows without the constraints of closed platforms.

This guide will walk you through installing Mautic 6.0 on an Oracle Cloud Infrastructure (OCI) ARM-based virtual machine running Ubuntu 24.04 Noble Numbat. We’ll use Caddy as a reverse proxy for automatic HTTPS, Composer for the Mautic installation (as recommended), and Docker for the database.

**Prerequisites**

Before starting, ensure you have the following set up:

- Oracle ARM VM: An Ubuntu 24.04 instance running on OCI’s Ampere A1 platform.

- Basic Server Setup: sudo privileges and SSH access.

- Docker: Installed and running (sudo systemctl status docker).

- Caddy: Installed directly on the host (not in Docker) and configured to manage SSL for your main domain (sudo systemctl status caddy).

- Domain Name: A registered domain (we’ll use yourdomain.com as an example).

- Subdomain: A subdomain for Mautic (e.g., mautic.yourdomain.com).

- DNS Records: An ‘A’ record pointing mautic.yourdomain.com to your server’s public IP address (xxx.xxx.xxx.xxx).

- Cloudflare (Optional but Recommended): If using Cloudflare, ensure it’s configured for your domain, pointing to your server’s IP. Set the SSL/TLS mode to Full (Strict).

- Block Volume: A block volume attached and mounted, for persistent data storage (e.g., at /mnt/myvolume).

## Table of Contents

- Step 1: Install PHP 8.2 & Prerequisites

- Step 2: Configure PHP-FPM

- Step 3: Set up MariaDB Database (Docker)

- Step 4: Install Mautic (Composer)

- Step 5: Configure Caddy

- Step 6: Run Mautic Web Installer

- Step 7: Configure Cron Jobs

- Conclusion

## Step 1: Install PHP 8.2 & Prerequisites

Mautic 6 requires PHP 8.2+. Ubuntu 24.04 ships with 8.3, so we’ll use Ondřej Surý’s PPA for a specific version and install necessary extensions, plus Composer.

```bash
# Add Ondřej Surý's PPA for PHP
sudo add-apt-repository ppa:ondrej/php -y
sudo apt update

# Install PHP 8.2 and necessary extensions (check Mautic docs for latest)

sudo apt install -y php8.2 php8.2-fpm php8.2-mysql php8.2-curl php8.2-gd php8.2-intl \
                  php8.2-mbstring php8.2-xml php8.2-zip php8.2-imap php8.2-bcmath \
                  php8.2-soap php8.2-opcache php8.2-cli php8.2-common php8.2-readline

# Switch default CLI version (optional but helpful)
sudo update-alternatives --set php /usr/bin/php8.2
sudo update-alternatives --set phar /usr/bin/phar8.2
sudo update-alternatives --set phar.phar /usr/bin/phar.phar8.2

# Verify PHP installation
php -v

# Install Composer globally
cd /tmp
php -r "copy('https://getcomposer.org/installer', 'composer-setup.php');"
# Optional: Verify installer hash from getcomposer.org/download/
# EXPECTED_SIGNATURE=$(php -r "echo hash_file('sha384', 'composer-setup.php');"); echo $EXPECTED_SIGNATURE
sudo php composer-setup.php --install-dir=/usr/local/bin --filename=composer
php -r "unlink('composer-setup.php');"

# Verify Composer installation
composer --version

# Install DB client (useful for debugging)
sudo apt install -y mariadb-client
```

## Step 2: Configure PHP-FPM

Adjust PHP settings for better performance and reliability with Mautic.

```text
# Edit the PHP-FPM configuration file
sudo nano /etc/php/8.2/fpm/php.ini
```

Find and modify these values (use Ctrl+W in nano):

```text
memory_limit = 256M
upload_max_filesize = 64M
post_max_size = 64M
max_execution_time = 300
date.timezone = YOUR_TIMEZONE ; e.g., America/New_York or UTC
```

_(Replace YOUR_TIMEZONE with your actual timezone: timedatectl list-timezones)_

Save (Ctrl+X, Y, Enter) and restart PHP-FPM:

```bash
sudo systemctl restart php8.2-fpm
sudo systemctl status php8.2-fpm
```

## Step 3: Set up MariaDB Database (Docker)

We’ll run the database in a Docker container, storing data on the block volume for persistence.

```bash
# Create directories on the block volume
sudo mkdir -p /var/www/html/mautic_app # App code will go here
sudo mkdir -p /var/www/html/mautic_db_data # DB data will go here

# Define database credentials (REPLACE passwords and save them securely!)
DB_ROOT_PASSWORD=""
MAUTIC_DB_USER="mautic_user"
MAUTIC_DB_PASSWORD=""
MAUTIC_DB_NAME="mautic_db"

# Run MariaDB container
# NOTE: We use host port 3307 because 3306 might be in use by other containers.
# If 3306 is free on your host, you can use 127.0.0.1:3306:3306.
sudo docker run -d \
  --name mautic-db \
  -p 127.0.0.1:3307:3306 \
  -v /var/www/html/mautic_db_data:/var/lib/mysql \
  -e MARIADB_ROOT_PASSWORD="$DB_ROOT_PASSWORD" \
  -e MARIADB_DATABASE="$MAUTIC_DB_NAME" \
  -e MARIADB_USER="$MAUTIC_DB_USER" \
  -e MARIADB_PASSWORD="$MAUTIC_DB_PASSWORD" \
  --restart=always \
  mariadb:10.11 --character-set-server=utf8mb4 --collation-server=utf8mb4_unicode_ci

# Wait for the database to initialize
echo "Waiting for database container to initialize..."
sleep 60

# Verify container is running
sudo docker ps
```

\*Remember the DB User, Password, Name, and ***Port (3307)*** for the Mautic installer.\*

## Step 4: Install Mautic (Composer)

Use Composer to download Mautic and its dependencies. Then install Node.js/npm to build frontend assets.

```bash
# Navigate to the parent directory on the block volume
cd /mnt/myvolume

# Create the Mautic project using Composer
sudo composer create-project mautic/recommended-project:^6 mautic_app --no-dev --no-interaction
# This might initially fail on the 'npm' step if Node.js isn't installed yet.

# Install Node.js (LTS version, e.g., 20.x) and npm
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | sudo gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg
NODE_MAJOR=20
echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_$NODE_MAJOR.x nodistro main" | sudo tee /etc/apt/sources.list.d/nodesource.list
sudo apt-get update
sudo apt-get install nodejs -y
node -v
npm -v

# Re-run composer install within the Mautic directory to build assets
cd /var/www/html/mautic_app
# Allow plugins as root for the npm scripts to run
sudo COMPOSER_ALLOW_SUPERUSER=1 composer install --no-dev --prefer-dist --no-interaction

# Set ownership and permissions after successful install
sudo chown -R www-data:www-data /var/www/html/mautic_app
sudo chmod -R 755 /var/www/html/mautic_app
# Set writable permissions for specific directories
sudo find /var/www/html/mautic_app/var -type d -exec chmod 775 {} \;
sudo find /var/www/html/mautic_app/var -type f -exec chmod 664 {} \;
sudo find /var/www/html/mautic_app/config -type d -exec chmod 775 {} \;
sudo find /var/www/html/mautic_app/config -type f -exec chmod 664 {} \;
# Ensure media/translations dirs exist (if needed later) and set permissions
sudo mkdir -p /var/www/html/mautic_app/docroot/media/files # Media usually lives under docroot
sudo chown -R www-data:www-data /var/www/html/mautic_app/docroot/media
sudo chmod -R 775 /var/www/html/mautic_app/docroot/media
```

## Step 5: Configure Caddy

Add a block to your Caddyfile to serve Mautic over HTTPS.

```text
sudo nano /etc/caddy/Caddyfile
```

Add this block (adjust alongside your existing configurations):

```text
mautic.yourdomain.com {
    # Set the web root to Mautic's public directory
    root * /var/www/html/mautic_app/docroot
    # Enable PHP-FPM handling via the correct socket
    php_fastcgi unix//run/php/php8.2-fpm.sock {
         split .php
    }

    file_server
    encode zstd gzip

    header {
        Strict-Transport-Security "max-age=31536000;"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "SAMEORIGIN"
        Referrer-Policy "strict-origin-when-cross-origin"
        Permissions-Policy "interest-cohort=()"
        -Server
    }

    # Block access to sensitive files/directories OUTSIDE the docroot
    @forbidden {
        # path /app/* # REMOVED - Caused issues with Mautic 6 assets
        path /bin/*
        path /config/*
        path /vendor/*
        path /var/*
        path /translations/* # If it existed at project root
        path /upgrade/*      # If it existed at project root
        path /.env
        path /.env.local
        path /.git*
        path /composer.json
        path /composer.lock
        path /phpunit.xml.dist
    }
    respond @forbidden 403

    # Rewrite rules for Mautic's front controller (index.php in docroot)
    try_files {path} {path}/ /index.php?{query}

    # Optional: Configure logging
    log {
        output file /var/log/caddy/mautic.yourdomain.com.access.log {
             roll_size 10mb
             roll_keep 5
             roll_keep_for 720h
        }
        level INFO
    }
}

# Ensure your other domain blocks (like yourdomain.com) are still present
# yourdomain.com { ... }
```

Save the file, then format, validate, and reload Caddy:

```bash
# Ensure log directory exists and has correct permissions for Caddy
sudo mkdir -p /var/log/caddy
sudo chown caddy:caddy /var/log/caddy # Or the user Caddy runs as

# Format and validate the Caddyfile
sudo caddy fmt --overwrite /etc/caddy/Caddyfile
sudo caddy validate --config /etc/caddy/Caddyfile

# Reload Caddy service
sudo systemctl reload caddy
sudo systemctl status caddy # Check it reloaded okay
```

_Troubleshooting Note: If you get 403 errors on assets later, ensure the Caddy user (caddy) is part of the www-data group: sudo usermod -a -G www-data caddy and restart Caddy (sudo systemctl restart caddy)._

## Step 6: Run Mautic Web Installer

Open your browser and navigate to https://mautic.yourdomain.com.

- Environment Check: Should show green checks. Review any recommendations.

- Database Setup:

Database Driver: MySQL PDO

- Database Host: 127.0.0.1

- Database Port: 3307 (or 3306 if you didn’t change it in Step 3)

- Database Name: mautic_db

- Database Username: mautic_user

- Database Password:  (from Step 3)

- Database Table Prefix: mau_ (or leave default)

- Administrative User: Create your Mautic admin login.

- Email Configuration: Configure your mail settings (SMTP, etc.). Crucially, under “How should email be handled?”, select “Queue” for better performance. You can configure the details later if needed.

- Login: Access your Mautic dashboard!

## Step 7: Configure Cron Jobs

Mautic relies heavily on background tasks (cron jobs) to function correctly – updating segments, running campaigns, sending emails, and performing maintenance. Without these, your automation workflows will not execute.

- Configure Email Queue Transport (Recommended): For better performance and reliability, configure Mautic to queue emails instead of sending them immediately. This requires telling Mautic’s “Messenger” component to use the database as a queue storage.

- Edit (or create) the local environment override file:

```text
sudo nano /var/www/html/mautic_app/.env.local
```

Add the following line, specifying the Doctrine transport for the **email** message handler (using the variable Mautic expects):

```text
MAUTIC_MESSENGER_DSN_EMAIL=doctrine://default?auto_setup=true
```

_(The auto_setup=true part allows Mautic to create the necessary database table automatically)_. Save and exit (Ctrl+X, Y, Enter).

2. **Clear Mautic Cache:** Apply the configuration change so Mautic recognizes the new queue setting.

```bash
cd /var/www/html/mautic_app
sudo -u www-data php bin/console cache:clear --no-warmup
sudo -u www-data php bin/console cache:warmup
```

3. **Edit www-data User’s Crontab:** Add the scheduled tasks.

```text
sudo crontab -u www-data -e
```

(Choose nano if prompted).

4. **Add Cron Job Lines:** Paste the following lines into the editor. Note the comments explaining each job. **Use the full path /usr/bin/php** (which should point to PHP 8.2 if you used update-alternatives) or specify the direct version path (e.g., /usr/bin/php8.2).

```text
# Mautic Cron Jobs v5/v6+ (Based on Official Documentation & Env Findings)
# Output from each job is appended (>>) to its log file in var/logs/
# Errors (stderr) are redirected (2>&1) to the same log file.

# --- Mandatory core jobs (Run frequently, e.g., every 5 minutes) ---
*/5 * * * * /usr/bin/php /var/www/html/mautic_app/bin/console mautic:segments:update --no-interaction >> /var/www/html/mautic_app/var/logs/cron_segments.log 2>&1
*/5 * * * * /usr/bin/php /var/www/html/mautic_app/bin/console mautic:campaigns:update --no-interaction >> /var/www/html/mautic_app/var/logs/cron_campaigns_update.log 2>&1
*/5 * * * * /usr/bin/php /var/www/html/mautic_app/bin/console mautic:campaigns:trigger --no-interaction >> /var/www/html/mautic_app/var/logs/cron_campaigns_trigger.log 2>&1

# --- Process Message Queue (Run frequently if using Queue for email) ---
# We consume the 'email' transport specifically.
# CRITICAL: Prepending the DSN variable ensures it's set correctly for the cron environment,
# as loading from .env.local can be unreliable for cron jobs.
*/5 * * * * MAUTIC_MESSENGER_DSN_EMAIL='doctrine://default?auto_setup=true' /usr/bin/php /var/www/html/mautic_app/bin/console messenger:consume email --limit=300 --memory-limit=512M --time-limit=300 --no-interaction >> /var/www/html/mautic_app/var/logs/cron_queue.log 2>&1

# --- Alternative: If using "Send Immediately" for email (NOT recommended) ---
# Comment out the messenger:consume line above and uncomment this one:
# */15 * * * * /usr/bin/php /var/www/html/mautic_app/bin/console mautic:emails:send --no-interaction >> /var/www/html/mautic_app/var/logs/cron_emails.log 2>&1

# --- Maintenance (Run daily, e.g., 3:30 AM) ---
30 3 * * * /usr/bin/php /var/www/html/mautic_app/bin/console mautic:maintenance:cleanup --days-old=365 --no-interaction >> /var/www/html/mautic_app/var/logs/cron_maintenance.log 2>&1

# --- Optional: Update MaxMind GeoIP database (Run weekly, e.g., 4:00 AM Monday) ---
0 4 * * 1 /usr/bin/php /var/www/html/mautic_app/bin/console mautic:iplookup:download --no-interaction >> /var/www/html/mautic_app/var/logs/cron_geoip.log 2>&1
```

5. **Save and Exit** the crontab editor (Ctrl+X, Y, Enter in nano). You should see crontab: installing new crontab.

**6. Verify Cron Job Execution:** This is essential! Wait for at least 15-30 minutes (to allow the 5-minute jobs to run a few times). Then check the log files:

```bash
# Check log directory listing (files should exist and have recent timestamps)
ls -l /var/www/html/mautic_app/var/logs/

# Check the queue log specifically (should show it's consuming/waiting, NO 'SyncTransport' error)
tail /var/www/html/mautic_app/var/logs/cron_queue.log

# Check other logs (might be empty initially but should not show errors)
tail /var/www/html/mautic_app/var/logs/cron_segments.log
tail /var/www/html/mautic_app/var/logs/cron_campaigns_update.log
```

If logs aren’t created or show errors, double-check paths, permissions, and the prepended DSN variable in your crontab entry.

## Conclusion

You should now have a fully functional Mautic 6 installation running on your Oracle ARM Ubuntu server, managed by Caddy and using Docker for the database. By setting up the cron jobs correctly using the database queue, you’ve ensured reliable background processing for your marketing automation tasks. Remember to keep Mautic, PHP, Caddy, Docker, and your server updated for security and performance.

Happy automating! Let us know in the comments if you have any questions or ran into different issues.
