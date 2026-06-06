---
title: 'Installing Matomo Analytics with Docker, Caddy, and Cloudflare on ARM Ubuntu'
description: 'Matomo is a powerful, open-source alternative to Google Analytics that gives you full ownership of your website’s traffic data. This guide walks through installing Matomo on its own subdomain using Docker Compose, Caddy as a reverse proxy, storing data on a separate...'
pubDate: 2025-04-07
heroImage: '/images/2025/04/matomo_logo.png'
heroImageAlt: 'matomo logo'
categories: ['Linux']
tags: []
toc: true
---

Matomo is a powerful, open-source alternative to Google Analytics that gives you full ownership of your website’s traffic data. This guide walks through installing Matomo on its own subdomain using Docker Compose, Caddy as a reverse proxy, storing data on a separate block volume, and configuring it correctly behind Cloudflare.

This setup assumes you have:

- An Oracle ARM Ubuntu 24.04 VM (though steps are similar for other ARM Linux distributions).

- Docker and Docker Compose (or docker compose) installed.

- Caddy v2 installed and running (likely via systemd), configured to manage SSL for your main domain and potentially other subdomains.

- A separate block volume mounted (e.g., at /mnt/myvolume) for persistent data storage.

- Your domain managed through Cloudflare.

- An existing setup where Caddy proxies different subdomains to different applications (e.g., WordPress on the root yourdomain.com, other apps on app1.yourdomain.com, etc.).

Our goal is to install Matomo on https://matomo.yourdomain.com.

## Step 1: Prepare Directories on the Block Volume

We’ll store Matomo’s application data and its database on the persistent block volume to avoid filling up the boot volume and make backups easier.

```bash
# Create a base directory for the Matomo stack
sudo mkdir -p /var/www/html/matomo

# Create specific directories for Matomo app and database data
sudo mkdir -p /var/www/html/matomo/matomo_data
sudo mkdir -p /var/www/html/matomo/mariadb_data

# Optional: Set permissions - sometimes needed for database containers
# Use the typical UIDs for www-data (33) and mysql (999) inside containers
# sudo chown -R 33:33 /var/www/html/matomo/matomo_data
# sudo chown -R 999:999 /var/www/html/matomo/mariadb_data
# If permissions cause issues later, you might need to adjust these.
```

## Step 2:  Create the Docker Compose File

Navigate to the base directory and create the docker-compose.yml file.

```bash
cd /var/www/html/matomo
sudo nano docker-compose.yml
```

Paste the following configuration. **Crucially, change the placeholder passwords!**

```yaml
# Note: The 'version' tag is optional in newer Docker Compose versions
# version: '3.8'

services:
  mariadb:
    image: mariadb:10.6 # Use a specific stable version
    container_name: matomo_db
    restart: unless-stopped
    volumes:
      - ./mariadb_data:/var/lib/mysql # Mount host directory to container
    environment:
      # --- !!! USE STRONG, UNIQUE PASSWORDS !!! ---
      MYSQL_ROOT_PASSWORD: 'YOUR_STRONG_MYSQL_ROOT_PASSWORD'
      MYSQL_DATABASE: matomo_db # Database name Matomo will use
      MYSQL_USER: matomo_user # Database user Matomo will use
      MYSQL_PASSWORD: 'YOUR_STRONG_MATOMO_DB_PASSWORD' # Password for the Matomo user
    networks:
      - matomo-net
    expose:
      - '3306' # Only expose DB port within the Docker network

  matomo:
    image: matomo:latest # Official Matomo image (supports ARM64)
    container_name: matomo_app
    restart: unless-stopped
    depends_on:
      - mariadb
    volumes:
      - ./matomo_data:/var/www/html # Mount host directory for Matomo data
    environment:
      MATOMO_DATABASE_HOST: mariadb # Service name of the DB container
      MATOMO_DATABASE_ADAPTER: mysql
      MATOMO_DATABASE_TABLES_PREFIX: matomo_
      MATOMO_DATABASE_DBNAME: matomo_db # Must match MYSQL_DATABASE
      MATOMO_DATABASE_USERNAME: matomo_user # Must match MYSQL_USER
      MATOMO_DATABASE_PASSWORD: 'YOUR_STRONG_MATOMO_DB_PASSWORD' # Must match MYSQL_PASSWORD
      # --- Settings for reverse proxy ---
      MATOMO_ENABLE_TRUSTED_HOST_CHECK: 0 # Disable initially, configure in UI later
      MATOMO_PROXY_URI_HEADER: 1 # Trust X-Forwarded headers from Caddy
      MATOMO_PROXY_SSL_HEADER: 1 # Trust X-Forwarded headers from Caddy
    networks:
      - matomo-net
    expose:
      - '80' # Expose port 80 *within* the Docker network
    ports:
      # --- CRITICAL FOR CADDY ON HOST ---
      # Map container port 80 to host port 8888 (only on localhost)
      # Caddy (running on host) will connect to localhost:8888
      - '127.0.0.1:8888:80'

networks:
  matomo-net:
    driver: bridge

# Note: The 'volumes:' block below defining named volumes mapped to host paths
# is optional if you use direct bind mounts like './mariadb_data:/var/lib/mysql' above.
# volumes:
#   mariadb_data:
#     driver_opts:
#       type: none
#       device: /var/www/html/matomo/mariadb_data
#       o: bind
#   matomo_data:
#     driver_opts:
#       type: none
#       device: /var/www/html/matomo/matomo_data
#       o: bind
```

**Why ports: – “127.0.0.1:8888:80”?**
When Caddy runs directly on the host OS (via systemd) and Matomo runs inside a Docker bridge network, Caddy cannot directly resolve the container name (matomo_app). By mapping the container’s port 80 to the host’s port 8888 (specifically on the 127.0.0.1 loopback interface), we give Caddy a localhost address it *can* connect to.

## Step 3: Configure Caddy Reverse Proxy

Edit your main Caddyfile, typically located at /etc/caddy/Caddyfile.

```text
sudo nano /etc/caddy/Caddyfile
```

Add a new block for your Matomo subdomain.

```text
# Global options (if any)
# {
#         email your-email@example.com
# }

matomo.yourdomain.com {
    # Enable compression
    encode zstd gzip

    # Default logging (to systemd journal) - Recommended
    # Avoids potential file permission issues with systemd services
    log

    # Optional: File logging (Caused issues in testing, use default 'log' above if problematic)
    # log {
    #   output file /var/log/caddy/matomo.yourdomain.com.log
    #   format json
    # }

    # Reverse proxy requests to the Matomo container via the mapped host port
    reverse_proxy localhost:8888 { # Connect to the port mapped in docker-compose.yml
        # --- Trust Cloudflare IPs ---
        # Necessary when Caddy needs to get the real visitor IP from Cloudflare headers.
        # Place this *inside* the reverse_proxy block if the global option doesn't work reliably.
        # Get current list from https://www.cloudflare.com/ips/
        trusted_proxies 173.245.48.0/20 103.21.244.0/22 103.22.200.0/22 103.31.4.0/22 141.101.64.0/18 108.162.192.0/18 190.93.240.0/20 188.114.96.0/20 197.234.240.0/22 198.41.128.0/17 162.158.0.0/15 104.16.0.0/13 104.24.0.0/14 172.64.0.0/13 131.0.72.0/22 2400:cb00::/32 2606:4700::/32 2803:f800::/32 2405:b500::/32 2405:8100::/32 2c0f:f248::/32 2a06:98c0::/29

        # --- Pass Correct Headers Upstream ---
        # Use the Cloudflare header now that proxies are trusted
        header_up Host {host}
        header_up X-Real-IP {header.cf-connecting-ip}
        header_up X-Forwarded-For {header.cf-connecting-ip}
        header_up X-Forwarded-Proto {scheme} # Tell Matomo it's behind HTTPS
    }

    # Recommended Security Headers
    header {
        Strict-Transport-Security "max-age=31536000;"
        X-Frame-Options "SAMEORIGIN"
        X-Content-Type-Options "nosniff"
        Referrer-Policy "strict-origin-when-cross-origin"
        # Optional: Prevent indexing of your Matomo instance itself
        X-Robots-Tag "noindex, nofollow"
        # Optional: Remove Caddy server signature
        -Server
    }
}

# --- Ensure your other site blocks are present ---
# yourdomain.com {
#     # ... your wordpress config ...
#     # Make sure php_fastcgi or reverse_proxy also has trusted_proxies
#     # and appropriate header_up directives if behind Cloudflare
# }
# otherapp.yourdomain.com {
#     # ... your other app config ...
# }
```

**Important Note on trusted_proxies:** Ideally, trusted_proxies cloudflare placed once in a global options block at the top of the Caddyfile should work. However, based on experience on some systems (potentially ARM/Ubuntu 24 specific), placing the explicit list of Cloudflare IPs *inside* each relevant reverse_proxy or php_fastcgi block proved more reliable. Use the method that works consistently for your other applications.

After saving the Caddyfile, validate and reload Caddy:

```bash
# Optional: Format the file
# sudo caddy fmt --overwrite /etc/caddy/Caddyfile

# Validate the configuration
caddy validate --config /etc/caddy/Caddyfile

# Reload the Caddy service
sudo systemctl reload caddy
```

If validation or reload fails, check Caddy’s logs (journalctl -u caddy.service -n 50 –no-pager) for errors. Log file permission errors were common in testing; switching to the default log directive (journal logging) solved this.

## Step 4: Cloudflare DNS Setting (Temporary)

Before starting Matomo for the first time, it’s crucial to allow Caddy to obtain the SSL certificate directly.

- Go to your Cloudflare DNS settings for yourdomain.com.

- Find the A (or AAAA) record for matomo.

- Change its “Proxy status” from Proxied (Orange Cloud) to DNS Only (Grey Cloud).

## Step 5: Launch the Matomo Stack

Now, start the Docker containers:

```bash
cd /var/www/html/matomo
sudo docker compose up -d --force-recreate # Use --force-recreate to ensure changes apply
```

Check if the containers started correctly:

```bash
sudo docker compose ps
# Both matomo_app and matomo_db should show 'Up' or 'Running' state.
```

## Step 6:  Matomo Web Installation

- Open your browser and navigate to https://matomo.yourdomain.com.

- You should see the Matomo installation wizard (if you see a 502 Bad Gateway, proceed to Troubleshooting section).

- System Check: Review the checks; most should pass.

- Database Setup: The details should be pre-filled from your docker-compose.yml. Verify Host (mariadb), User (matomo_user), Password (YOUR_STRONG_MATOMO_DB_PASSWORD), and DB Name (matomo_db). Click Next.

- Super User: Create your main admin account for Matomo.

- First Website Setup:

Name: e.g., “My Main Blog”

- URL: https://yourdomain.com (your root domain)

- Set your Time Zone.

- Click Next.

- Tracking Code: Matomo will display the JavaScript tracking code for this first site. Copy it somewhere safe.

- Finish: Complete the wizard.

## Step 7: Matomo Post-Installation Configuration

Log in to your new Matomo instance at https://matomo.yourdomain.com.

- Trusted Hosts:

Go to Administration (cog icon) -> System -> General settings.

- Scroll to Trusted Matomo Hostnames.

- Add matomo.yourdomain.com to the list.

- Save.

- Proxy IP Headers:

Still in General settings, scroll to Trusted proxy headers for client IP address.

- Check the box for HTTP_X_FORWARDED_FOR. (Caddy is configured to populate this correctly using Cloudflare’s IP).

- Save.

## Step 8:  Re-enable Cloudflare Proxy

Now that Matomo is set up and has its SSL certificate, you can re-enable Cloudflare’s proxy for performance and security.

- Go back to your Cloudflare DNS settings.

- Change the matomo record back to Proxied (Orange Cloud).

## Step 9: Add Tracking Code to Your Site(s)

- WordPress (yourdomain.com):

Plugin: Install a Matomo integration plugin (like “WP-Matomo Integration”). Configure it with your Matomo URL (https://matomo.yourdomain.com) and the Site ID (usually 1 for the first site).

- Manual: Add the JavaScript tracking code (copied during setup) just before the closing  or  tag in your theme’s header.php or footer.php file (Appearance -> Theme File Editor, use with caution).

- Subdomains (app.yourdomain.com):

Separate Tracking (Recommended): In Matomo Admin -> Websites -> Manage, “Add a new website” for each subdomain (e.g., https://app.yourdomain.com). Get the new Site ID and tracking code for that subdomain. Add that specific code to the application running on the subdomain.

- Aggregated Tracking: Add the original tracking code (Site ID 1) to your subdomain applications. All traffic will appear under the main yourdomain.com report in Matomo. Filtering by Hostname within reports will be needed to differentiate.

- Cross-Domain Linking: For accurate session tracking across yourdomain.com and its subdomains, modify the tracking code on all sites to include setDomains:

```text
  var _paq = window._paq = window._paq || [];
  /* tracker methods like "setCustomDimension" should be called before "trackPageView" */
  _paq.push(['trackPageView']);
  _paq.push(['enableLinkTracking']);

  // ***** Add/Modify for Cross-Domain *****
  _paq.push(['setDomains', '*.yourdomain.com']);
  _paq.push(['enableCrossDomainLinking']);
  // **************************************

  (function() {
    var u="//matomo.yourdomain.com/"; // Your Matomo URL
    _paq.push(['setTrackerUrl', u+'matomo.php']);
    _paq.push(['setSiteId', 'YOUR_SITE_ID']); // Use relevant Site ID
    var d=document, g=d.createElement('script'), s=d.getElementsByTagName('script')[0];
    g.async=true; g.src=u+'matomo.js'; s.parentNode.insertBefore(g,s);
  })();
```

## Step 10: Troubleshooting Common Issues

- 502 Bad Gateway Error:

This usually means Caddy cannot connect to the Matomo container.

- Check Port Mapping: Ensure ports: – “127.0.0.1:8888:80” is correctly defined in docker-compose.yml under the matomo service and that reverse_proxy localhost:8888 is set in the Caddyfile.

- Verify Port Listening: Run sudo ss -tulnp | grep 8888. If there’s no output, the port mapping isn’t active. Stop/recreate containers: sudo docker compose down && sudo docker compose up -d –force-recreate.

- Test Local Connection: Run curl -I http://localhost:8888. If it fails (“Connection refused”), the container isn’t listening or the mapping failed. If it works, the issue is likely in Caddy.

- Check Container Logs: sudo docker compose logs matomo (use the service name). Look for PHP or Apache errors.

- Check Caddy Logs: journalctl -u caddy.service -n 100 –no-pager | grep ‘matomo.yourdomain.com.\*localhost:8888’ Look for connection errors.

- Caddy Validation/Reload Fails: Often due to log file permissions if not using default journal logging. Check journalctl -u caddy.service and consider using just log in the Caddyfile instead of log { output file … }.

- SSL Certificate Errors: Ensure Cloudflare is “DNS Only” during initial setup. Check firewall rules (allow ports 80, 443).

## Step 11: Maintenance (Updates)

Keep Matomo and MariaDB updated:

```bash
cd /var/www/html/matomo
sudo docker compose pull # Pull latest images defined in compose file
sudo docker compose up -d --force-recreate # Recreate containers with new images
sudo docker image prune -f # Optional: Clean up old images
```

## Conclusion

You now have a self-hosted Matomo instance tracking your website analytics, running efficiently alongside your other applications!
