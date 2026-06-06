---
title: 'Hosting WordPress on Oracle ARM Ubuntu 24.04: Nginx, Certbot & Root Domain Setup'
description: 'So you’ve snagged one of Oracle Cloud’s awesome “Always Free” Ampere A1 (ARM) Compute instances running Ubuntu 24.04 LTS. Fantastic! Now, you want to host a WordPress blog on your main domain (like yourdomain.com) and keep the door open for future web apps on subdomains...'
pubDate: 2025-03-28
heroImage: '/images/2025/03/wordpress_logo.png'
heroImageAlt: 'wordpress logo'
categories: ['Blog']
tags: []
toc: true
---

**Introduction:**

So you’ve snagged one of Oracle Cloud’s awesome “Always Free” Ampere A1 (ARM) Compute instances running Ubuntu 24.04 LTS. Fantastic! Now, you want to host a WordPress blog on your main domain (like yourdomain.com) and keep the door open for future web apps on subdomains (like app1.yourdomain.com). Setting up Nginx correctly for this scenario can be tricky, especially when integrating PHP-FPM and securing it with SSL/TLS using Let’s Encrypt via Certbot.

This guide walks you through the exact steps I took to get a fresh WordPress installation running securely on the root domain of my Oracle ARM VM, using Nginx as the webserver, MariaDB as the database, and Certbot (via Snap) for free SSL certificates. We’ll also ensure the Nginx structure is ready for easy subdomain additions later.

**Prerequisites:**

- Oracle Cloud ARM VM: An active instance running Ubuntu 24.04 LTS.

- SSH Access: You need to be able to log into your VM via SSH with a user that has sudo privileges.

- Domain Name: A registered domain name (e.g., yourdomain.com).

- DNS Configured: Your domain’s A record (and optionally a www A or CNAME record) must point to your VM’s public IP address. This is crucial before setting up SSL.

- Basic Command Line Familiarity: We’ll be running commands in the terminal.

- (Optional but recommended) A block volume mounted (e.g., at /mnt/myvolume). While not strictly required for this setup (we use /var/www/), knowing how to mount storage is useful for Oracle Cloud VMs.

Let’s dive in!

## Phase 1: Install the Essentials – Nginx, PHP, MariaDB

First, we need the core components: the web server (Nginx), the PHP processor (PHP-FPM), and the database server (MariaDB).

- Update Package List & Install Nginx:

```bash
sudo apt update
sudo apt upgrade -y # Good practice on a new VM
sudo apt install nginx -y
```

2. **Configure Firewall (UFW):** Allow web traffic. We’ll start with HTTP and enable HTTPS later.

```text
sudo ufw allow 'Nginx HTTP'
# If UFW isn't enabled yet:
# sudo ufw enable
# sudo ufw status # Verify 'Nginx HTTP' is allowed
```

3. **Start & Enable Nginx:** Ensure it runs automatically on boot.

```bash
sudo systemctl start nginx
sudo systemctl enable nginx
# sudo systemctl status nginx # Check it's active (running)
```

_At this point, visiting your VM’s public IP in a browser should show the default Nginx welcome page._

4. **Install PHP-FPM and Extensions:** WordPress needs PHP and several common extensions. Ubuntu 24.04 typically uses PHP 8.3.

```bash
sudo apt install php-fpm php-mysql php-curl php-gd php-mbstring php-xml php-xmlrpc php-soap php-intl php-zip -y
# php -v # Verify installation (optional)
```

5. **Install MariaDB Database Server:**

```bash
sudo apt install mariadb-server -y
```

6. **Secure MariaDB:** Run the security script and follow the prompts. Set a strong root password (or use socket authentication) and accept the defaults for removing anonymous users, disallowing remote root login, etc.

```text
sudo mysql_secure_installation
```

## Phase 2: Prepare the Database and WordPress Files

Now, let’s create a dedicated database and user for WordPress, then download the WordPress software.

- Create WordPress Database & User:

- Log into MariaDB using the root credentials you just configured. Replace YOUR_STRONG_PASSWORD with a unique, secure password.

```sql
sudo mysql -u root -p
# (Enter your MariaDB root password when prompted)

# Inside the MariaDB prompt:
CREATE DATABASE wordpress_db DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'wp_user'@'localhost' IDENTIFIED BY 'YOUR_STRONG_PASSWORD';
GRANT ALL PRIVILEGES ON wordpress_db.* TO 'wp_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

_Remember the database name (wordpress_db), username (wp_user), and the password you set!_

2. **Create Web Root Directory:** We’ll use /var/www/yourdomain.com for better organization, especially with future subdomains. Replace yourdomain.com with your actual domain.

```bash
sudo mkdir -p /var/www/yourdomain.com
```

3. **Download and Extract WordPress:**

```bash
cd /tmp
curl -O https://wordpress.org/latest.tar.gz
tar xzvf latest.tar.gz
sudo mv wordpress/* /var/www/yourdomain.com/ # Move contents, not the folder itself
# Clean up
rm latest.tar.gz
rm -rf wordpress
```

4. **Set Ownership:** Nginx and PHP often run as www-data. Grant ownership to this user.

```bash
sudo chown -R www-data:www-data /var/www/yourdomain.com
```

5. **Configure wp-config.php:** Copy the sample file and edit it with your database details.

```bash
cd /var/www/yourdomain.com
sudo cp wp-config-sample.php wp-config.php
sudo nano wp-config.php
```

- Find DB_NAME, DB_USER, DB_PASSWORD and update them with the values from Step 1 (wordpress_db, wp_user, YOUR_STRONG_PASSWORD).

- Go to https://api.wordpress.org/secret-key/1.1/salt/ in your browser, copy the entire output, and paste it over the placeholder SALT keys in wp-config.php. This is important for security.

- Save and close the file (Ctrl+X, then Y, then Enter in nano).

- Added these two lines near the top, after 6. **Set Correct File Permissions:** Crucial for security and allowing WordPress updates.

```bash
sudo find /var/www/yourdomain.com/ -type d -exec chmod 755 {} \;
sudo find /var/www/yourdomain.com/ -type f -exec chmod 644 {} \;
sudo chmod 600 /var/www/yourdomain.com/wp-config.php # Extra security for the config file
```

## Phase 3: Configure Nginx for Your WordPress Site

This is where we tell Nginx how to serve your WordPress site from the root domain and handle PHP requests.

- Disable the Default Nginx Site: It can conflict with our custom configuration.

```bash
sudo rm /etc/nginx/sites-enabled/default
```

2. **Create Nginx Server Block:** Create a new config file named after your domain.

```text
sudo nano /etc/nginx/sites-available/yourdomain.com
```

\*Paste the following configuration. ***Crucially, replace yourdomain.com and www.yourdomain.com with your actual domain(s). Also, double-check the fastcgi_pass line*** – the PHP socket path might be php8.3-fpm.sock or similar; verify with ls /run/php/.\*

```text
server {
    listen 80;
    listen [::]:80;

    # ---- CHANGE THESE ----
    server_name yourdomain.com www.yourdomain.com;

    client_max_body_size 512M;

    root /var/www/yourdomain.com;
    # ----------------------

    index index.php index.html index.htm;

    location / {
        # try_files $uri $uri/ =404; # Default (doesn't work well with WP Permalinks)
        try_files $uri $uri/ /index.php?$args; # REQUIRED for WordPress Permalinks
    }

    # Pass PHP scripts to PHP-FPM
    location ~ \.php$ {
        include snippets/fastcgi-php.conf;

        # ---- VERIFY THIS PATH ----
        # Check with: ls /run/php/
        fastcgi_pass unix:/run/php/php8.3-fpm.sock;
        # --------------------------

        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
    }

    # Security: Deny access to hidden files and sensitive WP files
    location ~ /\.ht {
        deny all;
    }
    location = /wp-config.php {
        deny all;
    }
    # Optional: Block XML-RPC if not needed (common attack vector)
    # location = /xmlrpc.php {
    #     deny all;
    # }

    # Optional: Improve browser caching for static assets
    location ~* \.(css|js|gif|ico|jpeg|jpg|png|svg|webp|woff|woff2|ttf|eot)$ {
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }
}
```

_Save and close the file._

3. **Enable the New Site:** Create a symbolic link.

```bash
sudo ln -s /etc/nginx/sites-available/yourdomain.com /etc/nginx/sites-enabled/
```

4. **Test Nginx Configuration:** Always check for syntax errors before reloading.

```text
sudo nginx -t
```

_If you see syntax is ok and test is successful, proceed. Otherwise, re-edit the config file to fix typos._

5. **Reload Nginx:** Apply the new configuration.

```bash
sudo systemctl reload nginx
```

**6. Setup Write Permissions: **Ensure that the user your web server (Nginx + PHP-FPM) runs as has the correct ownership and write permissions for the WordPress files and directories. In our setup, this user is www-data.

**6.1 Set Correct Ownership:** Change the owner and group of your entire WordPress directory to www-data. This allows the web server process to manage its own files. -R makes it recursive for all files and subdirectories.

```bash
# Ensure you are in the parent directory or provide the full path
sudo chown -R www-data:www-data /var/www/yourdomain.com/
```

**6.2 Set Correct Permissions:** Set standard secure permissions. Directories typically need execute permission to be accessed, while files generally don’t.

```bash
# Set directories to 755 (owner rwx, group rx, others rx)
sudo find /var/www/yourdomain.com/ -type d -exec chmod 755 {} \;

# Set files to 644 (owner rw, group r, others r)
sudo find /var/www/yourdomain.com/ -type f -exec chmod 644 {} \;
```

**6.3 Secure wp-config.php (Optional but Recommended):** Make your configuration file slightly less accessible.

```bash
sudo chmod 600 /var/www/yourdomain.com/wp-config.php
```

**After Running These Commands:**

- Go back to your WordPress admin area (https://yourdomain.com/wp-admin/).

- Try updating the themes/plugins again (you might need to refresh the Updates page).

- WordPress should now detect that it can write directly to the necessary directories and will not prompt you for FTP credentials. The update should proceed directly.

## Phase 4: Edit php.ini to increase upload file size

- Backup the php.ini file

```bash
sudo cp /etc/php/8.3/fpm/php.ini /etc/php/8.3/fpm/php.ini.bak
```

2. **Edit the file:**

```text
sudo nano /etc/php/8.3/fpm/php.ini
```

3. **Find and Modify Directives:** Use Ctrl+W in nano to search. Increase the values based on your largest backup file component size. Using 512M as an example:

```text
; Increase maximum allowed size for uploaded files.
upload_max_filesize = 512M

; Must be greater than or equal to upload_max_filesize
post_max_size = 512M

; Increase PHP memory limit
memory_limit = 512M

; Increase maximum execution time in seconds
max_execution_time = 300

; Increase maximum time PHP waits for input data
max_input_time = 300
```

**Save and Exit:** Press Ctrl+X, then Y, then Enter.

**4. Restart PHP-FPM Service:**
Apply the PHP changes by restarting the PHP-FPM service:

```bash
sudo systemctl restart php8.3-fpm
```

**5. Adjust Nginx Client Body Size Limit:**

Nginx itself has a limit on the size of the client request body, which includes file uploads. This often defaults to something small like 1M and needs to be increased as well.

- Edit your Nginx configuration: This is usually either the main config file (/etc/nginx/nginx.conf) or, more likely, your site-specific server block file (/etc/nginx/sites-available/cfocoder.com or similar – use the actual filename for your site).

```text
sudo nano /etc/nginx/sites-available/your_site_config_file
```

_(Or sudo nano /etc/nginx/nginx.conf if you want to set it globally)_

**Add/Modify client_max_body_size:** Find the http { … } block (in nginx.conf) or the server { … } block for your site. Add or modify the client_max_body_size directive within one of those blocks. Set it to the *same value* or slightly *larger* than your PHP post_max_size and upload_max_filesize.

Example (inside the http or server block):

````yaml
server {
    listen 80;
    server_name cfocoder.com www.cfocoder.com;
    root /path/to/your/wordpress/root;
    index index.php index.html index.htm;

    client_max_body_size 512M; # Now Nginx will allow larger file uploads, matching the limits you set in PHP-FPM. You should be able to upload your UpdraftPlus backup files through the WordPress interface.

## Phase 5: WordPress Web Installation

The backend is ready! Now complete the setup via your browser.

- Visit Your Domain: Open http://yourdomain.com in your web browser.

- WordPress Setup: You should see the WordPress language selection screen. Follow the on-screen prompts to:

Choose your language.

- Enter your Site Title, desired Admin Username, a strong Admin Password, and your Email Address.

- Click “Install WordPress”.

- Login: Once installed, log in to your WordPress dashboard at http://yourdomain.com/wp-admin/.

*Success! WordPress is running, but currently only over HTTP.*

## Phase 6: Secure Your Site with HTTPS (Certbot/Let’s Encrypt)

Let’s add that crucial padlock icon using Certbot via Snap.

- Install Snapd (if needed) & Certbot:

```text
sudo apt install snapd -y # Usually pre-installed on Ubuntu 24.04
sudo snap install core; sudo snap refresh core
sudo apt remove certbot # Remove any old system package versions
sudo snap install --classic certbot
sudo ln -s /snap/bin/certbot /usr/bin/certbot # Make command accessible
````

2. **Obtain and Install Certificate:** Run Certbot with the Nginx plugin, specifying all domain variations you want covered.

```text
# Replace with your actual domain(s) used in the Nginx config
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

_Follow the prompts:_

- Enter your email for renewal notices.

- Agree to the Let’s Encrypt Terms of Service.

- Choose whether to share your email (optional).

- Select option 2 (Redirect): This automatically redirects all HTTP traffic to HTTPS – highly recommended!

_Certbot will automatically configure Nginx for SSL and reload it._

3. **Update Firewall for HTTPS:** Allow HTTPS traffic and remove the HTTP-only rule.

```text
sudo ufw allow 'Nginx Full' # Allows both HTTP & HTTPS
sudo ufw delete allow 'Nginx HTTP'
sudo ufw status # Verify 'Nginx Full' is allowed
```

4. **Verify Auto-Renewal:** Certbot sets up automatic renewals. Test it:

```text
sudo certbot renew --dry-run
```

_This should complete without errors._

5. **Test HTTPS:** Visit https://yourdomain.com. You should see the padlock! Log back into WordPress if needed, and go to Settings -> General in the dashboard to ensure both “WordPress Address (URL)” and “Site Address (URL)” start with https://.

## Phase 7: Ready for Subdomains

Because we used the sites-available / sites-enabled structure and created a specific config file for yourdomain.com, adding subdomains is straightforward:

- For a new app on app1.yourdomain.com:

Add a DNS A record for app1 pointing to your VM’s IP.

- Create a new web root: sudo mkdir -p /var/www/app1.yourdomain.com

- Set ownership: sudo chown -R www-data:www-data /var/www/app1.yourdomain.com

- Place your app’s files in the new web root.

- Create a new Nginx config: sudo nano /etc/nginx/sites-available/app1.yourdomain.com (configure server_name, root, and location blocks appropriately for that app).

- Enable the site: sudo ln -s /etc/nginx/sites-available/app1.yourdomain.com /etc/nginx/sites-enabled/

- Test: sudo nginx -t

- Reload: sudo systemctl reload nginx

- Get SSL: sudo certbot –nginx -d app1.yourdomain.com (Certbot may ask if you want to add it to the existing certificate).

## Phase 8: Troubleshooting

It is possible that after the initial setup, especially after adding the site to Cloudflare, that we experiment some issues, so here are some troubleshooting steps to apply after the initial setup, in case we get issues getting the WordPress admin area working correctly

**1. Cloudflare Configuration**

- When to Check: If you experience an ERR_TOO_MANY_REDIRECTS loop after adding your site to Cloudflare and ensuring your server forces HTTPS. Also relevant for ERR_HTTP2_PROTOCOL_ERROR.

- Where: Cloudflare Dashboard (yourdomain.com)

SSL/TLS -> Overview tab

- Network tab

- Speed -> Optimization -> Content Optimization tab

- Caching -> Configuration

- What to Do:

SSL/TLS Mode: Set to Full (Strict). (Fixes redirect loops caused by “Flexible” mode).

- HTTP/3 (with QUIC): Turn OFF if encountering ERR_HTTP2_PROTOCOL_ERROR. (Found under Network tab).

- Auto Minify (JS/CSS/HTML): Ensure these are OFF if experiencing broken styles/scripts. (Found under Speed -> Optimization -> Content Optimization).

- Rocket Loader™: Ensure this is OFF. (Found under Speed -> Optimization -> Content Optimization).

- Purge Cache: After making changes, click “Purge Everything” under Caching -> Configuration.

**2. WordPress Configuration (wp-config.php)**

- When to Check: If experiencing redirect loops or potential mixed content issues (HTTP assets loading on HTTPS pages), especially after setting up SSL.

- Where: Server file: /var/www/html/wp-config.php

- What to Do: Edit the file (sudo nano …) and add/ensure these lines exist near the top, right after **3. Nginx AppArmor Profile**

- When to Check: If Nginx fails to start/restart after enabling AppArmor, or if you get 502 Bad Gateway errors, or specific (13: Permission denied) errors in /var/log/nginx/error.log for accessing sockets or /var/lib/nginx/fastcgi/. This only applies if you explicitly enforced the Nginx profile (sudo aa-enforce /etc/apparmor.d/usr.sbin.nginx).

- Where: Server file: /etc/apparmor.d/usr.sbin.nginx

- What to Do: Edit the file (sudo nano …) and ensure the following rules exist inside the main /usr/sbin/nginx { … } block:

```text
# Allow reading essential Let's Encrypt files
/etc/letsencrypt/live/** r,
/etc/letsencrypt/archive/** r,
/etc/letsencrypt/options-ssl-nginx.conf r,
/etc/letsencrypt/ssl-dhparams.pem r,

# Allow Nginx to communicate with PHP-FPM via socket
/run/php/php8.3-fpm.sock rw,  # Adjust PHP version if needed

# Allow Nginx to buffer FastCGI (PHP) responses
/var/lib/nginx/fastcgi/** rwk,

# Allow nginx to create/write/read/lock temp request bodies
/var/lib/nginx/body/** rw,
```

- After Editing:

Reload the profile: sudo apparmor_parser -r /etc/apparmor.d/usr.sbin.nginx

- Restart Nginx: sudo systemctl restart nginx

**4. Filesystem Permissions (for Nginx FastCGI Buffer)**

- When to Check: If the (13: Permission denied) errors for /var/lib/nginx/fastcgi/ persist in the Nginx logs even after correcting the AppArmor profile.

- Where: Server command line.

- What to Do:

```bash
# Set correct ownership
sudo chown www-data:www-data /var/lib/nginx/fastcgi/
# Set correct permissions (owner/group rwx)
sudo chmod 770 /var/lib/nginx/fastcgi/
# Restart Nginx
sudo systemctl restart nginx
```

By checking and adjusting these specific points when encountering the relevant errors, you should be able to keep your WordPress site running smoothly behind Cloudflare with AppArmor enabled.

**Conclusion:**

That’s it! You now have a secure, functional WordPress blog running on the root of your domain on your Oracle Cloud ARM VM. Nginx is correctly configured to handle WordPress permalinks and PHP processing, and it’s structured perfectly to add more sites or applications on subdomains whenever you’re ready. Happy blogging!

Remember to replace yourdomain.com, YOUR_STRONG_PASSWORD, and potentially the PHP socket path (php8.3-fpm.sock) with your actual values throughout the post. Good luck!
