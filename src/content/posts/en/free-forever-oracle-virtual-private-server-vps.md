---
title: 'Free Forever Oracle Virtual Private Server'
description: 'I recently discovered a super cool offer from Oracle, to setup a free-forever Virtual Machine instance with an ARM processor, 4 OCPUs, 24 GB of RAM memory and 200 GB of storage. So this guide is to remind myself what settings I have to use to create a virtual machine...'
pubDate: 2025-03-17
heroImage: '/images/2025/03/oracle_logo.png'
heroImageAlt: 'oracle logo'
categories: ['Linux']
tags: []
toc: true
---

I recently discovered a [super cool offer from Oracle](https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm), to setup a free-forever Virtual Machine instance with an ARM processor, 4 OCPUs, 24 GB of RAM memory and 200 GB of storage. So this guide is to remind myself what settings I have to use to create a virtual machine with Oracle. I intend to use this virtual machine for personal and data science projects.

## 1.- Create a Virtual Machine

- Shape:

Select the Ampere A1 Compute shape, selecting an “Always Free Eligible” shape is crucial to avoid charges.

- Choose an Availability Domain (AD). It doesn’t matter which AD for the purpose of the tutorial, but the user must select one.

- Image and Networking:

Image:

Select Ubuntu 24.04 (or the latest LTS version at the time of writing). Using the latest LTS is generally best for security and long-term support.

- Avoid using a custom image. This avoids many potential problems.

- Networking:

Public IP Address: Create a Reserved Public IP Address during the VM creation process. This is much easier and less error-prone than assigning one later.

- Security List:This is absolutely critical. Oracle Cloud has a built-in firewall (the Security List) that must be configured to allow traffic.

Create a new Security List (or use the default, but modify it). It’s generally better to create a new one specifically for your web server.

- Add Ingress Rules:Before launching the instance, add the following ingress rules:

Source: 0.0.0.0/0 (Allow from anywhere – you can restrict this later for advanced users)

- IP Protocol: TCP

- Destination Port Range: 22 (SSH)

- Destination Port Range: 80 (HTTP)

- Destination Port Range: 443 (HTTPS)

- Stateless: No.

- Explanation: Without these rules, the VM will be unreachable, even if ufw is configured correctly later. This is the single biggest source of problems for new users.

- SSH Keys:

Securely store the private key. Losing it means losing access to the VM.

- Permissions: The private key file on the user’s local machine must have permissions 600 or 400 (chmod 400 ~/.ssh/your_private_key).

- Use a dedicated key: Recommend to use a dedicated key.

- Boot Volume:

Mention that it is possible to increase the boot volume size (up to 200GB for free tier).

- Click “Create”: After all these steps, click “Create” to launch the VM.

![](/images/2025/03/security_list.png)

## 2.- Setup a Static Public IP Address

When you create a VM, it usually gets an *ephemeral* public IP. This IP can change if you stop/start the VM, or if Oracle needs to perform maintenance. A *reserved* public IP is one you explicitly create and manage; it stays assigned to your account until you release it.

**1. Access the Oracle Cloud Console**

- Log in to your Oracle Cloud Infrastructure (OCI) console.

**2. Navigate to Networking -> Public IPs**

- In the OCI menu (usually on the left), go to Networking, then IP Management, and finally click on Reserved Public IPs.

**3. Create a Reserved Public IP**

- Click the Reserve Public IP Address button (or similar wording).

- A dialog box will appear. Here’s what you need to fill in:

Create in Compartment: Select the same compartment where your VM is located. This is crucial.

- Name: Give your reserved IP a descriptive name (e.g., mxcfo-reserved-ip). This is just for your own organization.

- IP Address Source in :

Oracle (Recommended): Let Oracle assign you an IP from their pool. This is the simplest option.

- Bring Your Own IP (BYOIP): This is for advanced scenarios where you already own a block of public IPs and want to use them in OCI. You likely don’t need this.

- IP Address Assignment:

Reserve a public IPv4 address (Recommended)

- Click Reserve Public IP Address.

**4. Detach the *Ephemeral* IP **

- Go to your VM instance details: Compute -> Instances -> Click your VM.

- Under Resources, click Attached VNICs.

- Click on the name of your VNIC.

- Under Resources, click IPv4 Addresses.

- Click the three dots menu (…) next to the ephemeral IP address (the one currently assigned, 137.131.36.79 in your image).

- Select Edit.

- Change Public IP Type to No Public IP. This is the critical step. You are detaching the ephemeral IP.

- Click Update.

**5. Attach the *Reserved* IP:**

- Now, stay on the same IPv4 Addresses page for your VNIC.

- You should see that there is no public IP assigned. If the change didn’t apply refresh the page.

- Click “Assign Public IPv4 Address” or a similar button. If the button doesn’t exists, click on the three dots from the Private IP Address and hit “Edit”

- Choose Reserved Public IP.

- Select the reserved IP you created in step 1 from the dropdown.

- Click Assign or Update.

Oracle Cloud Infrastructure manages IP addresses and VNICs in a specific way. An ephemeral IP is tied to the lifecycle of the *private* IP address on the VNIC. You can’t directly replace it. You have to:

- Remove the association with any public IP (making it “No Public IP”).

- Then, create a new association with the reserved IP.

## 3.- Connect to the Virtual Machine

After having downloaded the keys to my laptop, now the next step is open a WSL Ubuntu session and type the following to copy the keys to my WSL instance in my laptop. The code below also sets the correct permissions to the keys

```bash
cp /mnt/c/Users/my_user/Downloads/mykey.key ~/.ssh/mxcfo.key
chmod 400 ~/.ssh/mykey.key
```

Once the keys are copied to my WSL machine, now the next step is to connect to my virtual machine with the keys

```bash
ssh -i ~/.ssh/mykey.key ubuntu@123.45.67.89
```

**Note:** The default username for Ubuntu instances is ubuntu

## 4.- Create a User

Now we need to to create a user so we can connect to the VM from the Oracle’s Instance Console in case we have problems to connect to it with our keys.

```bash
sudo adduser user_name
sudo usermod -aG sudo user_name
sudo usermod -aG adm user_name
```

## 5.- Install Software Packages

Once connected to my new virtual machine, the first step is to update it with the following command

```bash
sudo apt-get update && sudo apt-get upgrade
```

## 5.1 Install ufw

UFW is a simple Firewall to manage access rules by ports. To enable it, connect to the VM from the Oracle’s Instance Console and click on the button “Launch Cloud Shell Connection”. This will open a terminal at the bottom, and most likely will open the session withe user we created in the previous section, but after connecting we need to switch the user to “ubuntu” so we can configure the firewall:

```bash
sudo apt update
sudo apt upgrade -y

sudo su - ubuntu
```

To make sure we are now connected with the ubuntu user, type the following:

```text
whoami
```

Then we proceed to install the ufw firewall

```bash
sudo apt update
sudo apt upgrade -y

sudo apt install ufw -y
```

We proceed to allow SSH (Port 22), this is the most important step to prevent lock outs. 

```text
sudo ufw allow 22/tcp
```

Before enabling the firewall, we need to check the rules before enabling:

```text
sudo ufw show added
```

If you need to allow other ports for specific applications or services, do so *now*, before enabling ufw. For example:

- MySQL/MariaDB: sudo ufw allow 3306/tcp

- PostgreSQL: sudo ufw allow 5432/tcp

- Custom Ports: sudo ufw allow /tcp or sudo ufw allow /udp (replace  with the actual port number and choose tcp or udp as appropriate).

*Only* allow ports that are *absolutely necessary*. The fewer ports you have open, the more secure your server is.

Finally, we enable the ufw:

```text
sudo ufw enable
```

And then we verify the status. We should see an output confirming that the ufw is active and that ports 22, 80, and 443 (and any other ports you explicitly allowed) are allowed. The output should look like this

```text
sudo ufw status
```

![](/images/2025/03/ufw.png)

If at some point, we have problems connecting to the VM, we need to connect to it from Oracle´s Instance Console, change the user to ubuntu, and from there, disable UFW with this command

```text
sudo ufw disable
```

## 5.2 Install NGINX

Nginx is a high-performance web server that we’ll use to serve our website and act as a reverse proxy for our applications. We’ll configure it to:

- Automatically redirect all HTTP traffic to HTTPS (for security).

- Serve a basic test page on our main domain (mxcfo.com).

- Be ready to host multiple web applications on separate subdomains (e.g., openbb.mxcfo.com, n8n.mxcfo.com).

 Key aspects:

- Separate configuration files per subdomain/domain. (Best practice for organization and scalability)

- Main domain (mxcfo.com) serving the test index.html.

- Subdomains (openbb.mxcfo.com, n8n.mxcfo.com, etc.) prepared for reverse proxying. (Placeholders for future application installations)

- HTTPS redirection for all domains/subdomains.

- Clear explanations and commands.

### 5.2.1 Install NGINX

Let’s install it with the following commands:

```bash
sudo apt update
sudo apt upgrade -y

sudo apt install nginx -y
sudo systemctl status nginx
```

### 5.2.2 Start and Enable NGINX

These commands start the Nginx service, configure it to start automatically on boot, and verify that it’s running.

```bash
sudo systemctl start nginx
sudo systemctl enable nginx
sudo systemctl status nginx
```

### 5.2.3 Create the Webroot Directory

We’ll create a directory to store our website’s files. This is where we’ll put our test index.html file.

```bash
sudo mkdir -p /var/www/mxcfo.com
sudo chown -R $USER:$USER /var/www/mxcfo.com
sudo chmod -R 755 /var/www/mxcfo.com
```

### 5.2.4 Create the Test index.html File

```bash
echo 'Hello from mxcfo.com!' | sudo tee /var/www/mxcfo.com/index.html
```

### 5.2.5 Disable the Default NGINX site

```bash
sudo rm /etc/nginx/sites-enabled/default
```

### 5.2.6 Edit Main NGINX Configuration File

Inside the http { … } block (but outside any specific server block), add the following lines. These include Cloudflare’s official IP ranges.

```text
http {
    # ... other http settings like gzip, log_format, etc. ...

    # --- Add Cloudflare Real IP Configuration ---
    set_real_ip_from 173.245.48.0/20;
    set_real_ip_from 103.21.244.0/22;
    set_real_ip_from 103.22.200.0/22;
    set_real_ip_from 103.31.4.0/22;
    set_real_ip_from 141.101.64.0/18;
    set_real_ip_from 108.162.192.0/18;
    set_real_ip_from 190.93.240.0/20;
    set_real_ip_from 188.114.96.0/20;
    set_real_ip_from 197.234.240.0/22;
    set_real_ip_from 198.41.128.0/17;
    set_real_ip_from 162.158.0.0/15;
    set_real_ip_from 104.16.0.0/13;
    set_real_ip_from 104.24.0.0/14;
    set_real_ip_from 172.64.0.0/13;
    set_real_ip_from 131.0.72.0/22;
    set_real_ip_from 2400:cb00::/32;
    set_real_ip_from 2606:4700::/32;
    set_real_ip_from 2803:f800::/32;
    set_real_ip_from 2405:b500::/32;
    set_real_ip_from 2405:8100::/32;
    set_real_ip_from 2a06:98c0::/29;
    set_real_ip_from 2c0f:f248::/32;

    # Use the CF-Connecting-IP header or X-Forwarded-For
    real_ip_header CF-Connecting-IP;
    # As fallback, you can add X-Forwarded-For, but CF-Connecting-IP is preferred
    # real_ip_header X-Forwarded-For;
    # real_ip_recursive on; # Use if you have multiple proxies

    # --- End Cloudflare Real IP Configuration ---

    # ... rest of your http block ...
}
```

(You can get the latest list from [Cloudflare’s IP Ranges page](https://www.google.com/url?sa=E&q=https%3A%2F%2Fwww.cloudflare.com%2Fips%2F)).
Save and close.

### 5.2.7 Create NGINX Configuration Files

We’ll create separate configuration files for each domain/subdomain. This makes the configuration much cleaner and easier to manage.

- mxcfo.com (Main Domain)

```text
sudo nano /etc/nginx/sites-available/mxcfo.com
```

Paste the following into the configuration file:

```text
server {
    listen 80;
    listen [::]:80;
    server_name mxcfo.com www.mxcfo.com;
    client_max_body_size 512M;
    root /var/www/mxcfo.com;
    index index.html;

    location / {
        try_files $uri $uri/ =404;
    }
}
```

- openbb.mxcfo.com (Example Subdomain – placeholder)

```text
sudo nano /etc/nginx/sites-available/openbb.mxcfo.com
```

Paste the following configuration (note the placeholder return 503;):

```text
server {
    listen 80;
    listen [::]:80;
    server_name openbb.mxcfo.com;
    root /var/www/openbb.mxcfo.com; # Make sure this directory exists!
    index index.html;

    location / {
        try_files $uri $uri/ =404;
    }
}
```

Create similar placeholder files for any other subdomains you plan to use (e.g., n8n.mxcfo.com).

**Explanation of the Minimal Configuration for Configuration files**

- server { … }: Each file contains one server block. This is crucial.

- listen 80; and listen [::]:80;: These directives tell Nginx to listen for HTTP connections on port 80 (for both IPv4 and IPv6).

- server_name …;: This directive specifies the domain name(s) that this server block should handle. This is how Nginx knows which server block to use for a given request.

- root …;: This directive specifies the document root – the directory where Nginx will look for files to serve.

- index index.html;: This directive tells Nginx which file to serve if a request doesn’t specify a particular file.

- location / { … }: This block handles all requests (because / matches everything).

- try_files \$uri \$uri/ =404;: This is the standard way to tell Nginx to try to find a matching file or directory, and return a 404 error if nothing is found.

**What’s *Not* Included (and Why)**

- No HTTPS Configuration: There are no listen 443, ssl_certificate, ssl_certificate_key, include /etc/letsencrypt/…, or other SSL-related directives. Certbot will add these automatically.

- No Redirection (Yet): There’s no return 301 https://\$host\$request_uri; directive. Certbot will handle the redirection automatically as part of the HTTPS setup. This is a key improvement over your previous attempts.

- No Placeholder for OpenBB: Since the location block is the same for both, there is no need to add anything specific for OpenBB.

**What Certbot Will Add**

When you run sudo /snap/bin/certbot –nginx -d mxcfo.com -d www.mxcfo.com -d openbb.mxcfo.com, Certbot will:

- Create a new server block for HTTPS in each config file It will add a new server block to each file, specifically for handling HTTPS connections. This new block will include:

listen 443 ssl http2; (and the IPv6 equivalent)

- ssl_certificate …; (pointing to the generated certificate file)

- ssl_certificate_key …; (pointing to the generated private key file)

- include /etc/letsencrypt/options-ssl-nginx.conf; (this file contains recommended SSL settings)

- ssl_dhparam …; (this file contains Diffie-Hellman parameters for stronger security)

- Add the HTTP->HTTPS Redirection: Certbot will add a redirect to the HTTP block. This is equivalent to adding the return 301 https://\$host\$request_uri; directive, but certbot does this in the optimal way.

### 5.2.8 Enable the Sites (Create Symbolic Links)

```bash
sudo ln -s /etc/nginx/sites-available/mxcfo.com /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/openbb.mxcfo.com /etc/nginx/sites-enabled/
# Add more links for other subdomains
```

### 5.2.9 Test the NGINX Configuration

```text
sudo nginx -t
```

### 5.2.10 Reload NGINX

```bash
sudo systemctl reload nginx  # Reload NGINX to apply the changes.
sudo systemctl restart nginx # While reload is usually sufficient, sometimes a full restart can help
sudo systemctl status nginx # Make sure status shows active
```

![](/images/2025/03/nginx2.png)

### 5.2.11 Update UFW Rules

We also allow HTTP and HTTPS (for NGINX). These commands allow both HTTP (port 80) and HTTPS (port 443), which are needed for your website. Nginx Full is a pre-defined profile in ufw.

```text
sudo ufw allow 'Nginx Full'
sudo ufw show added
sudo ufw status
```

-  (Explanation): This single command allows both HTTP (port 80) and HTTPS (port 443).

- Check added rules: Add this line after configuring ufw.

**Explanations and Best Practices:**

- Separate Configuration Files: Using separate files for each domain/subdomain keeps your configuration organized and makes it much easier to manage multiple websites or applications.

- server_name: The server_name directive is how Nginx tells which configuration block to use for a given request. It must match the domain name or subdomain exactly.

- root: The root directive specifies the directory where Nginx will look for files to serve. For the main domain, this is /var/www/mxcfo.com.

- index: The index directive tells Nginx which file to serve if a directory is requested (usually index.html).

- try_files: This directive is used for serving static files. It tries to find the requested file or directory; if it doesn’t exist, it returns a 404 error.

- return 301: This directive redirects HTTP requests to HTTPS. This is a best practice for security.

- proxy_pass (Placeholder): The openbb.mxcfo.com configuration includes a placeholder return 503; directive. This is a temporary measure. After you install OpenBB, you’ll replace this with the correct proxy_pass configuration to forward requests to your OpenBB Docker container.

- Symbolic links: Nginx only loads configurations from /etc/nginx/sites-enabled/. The files in /etc/nginx/sites-available/ are the actual configurations.

### 5.2.12 Test your Website (HTTP)

Open a web browser and go to http://mxcfo.com. You should see the “Hello from mxcfo.com!” message. If you don’t, double-check:

- DNS Propagation: Is it complete? Use whatsmydns.net.

- Firewall: Are ports 80 and 443 open in both ufw and your Oracle Cloud security list?

- NGINX Configuration: Is the server_name directive correct? Did you run nginx -t and fix any errors?

- File Permissions: Is the /var/www/mxcfo.com directory and its contents readable by the NGINX user (usually www-data)?

**Crucial New Test: curl from *Inside* the VM**

We need to determine if Nginx is actually listening on port 80 *from the perspective of the VM itself*. We’ll use the curl command *from within the VM* to test this:

- Run curl: On your VM (connected via SSH), run the following command:

```bash
curl http://localhost/
```

This section provides a complete, step-by-step guide to configuring Nginx for your main domain and preparing it for multiple subdomains. It emphasizes best practices, includes clear explanations, and sets the stage for installing applications and configuring the reverse proxy settings later. It also makes it clear *where* the Certbot configuration will fit in (the SSL certificate directives). This is a much more robust and scalable approach than your original configuration.

### 5.2.12 AppArmor

- Why: AppArmor is a security module that restricts what programs can do. Even with correct file permissions, Nginx might be blocked from accessing the Let’s Encrypt certificates if there isn’t an AppArmor profile that explicitly allows it. We created a profile to grant Nginx the minimum necessary permissions, enhancing security.

- Key Steps:

Create /etc/apparmor.d/usr.sbin.nginx with the profile content (allowing access to /etc/letsencrypt/).

- Load the profile with sudo apparmor_parser -r ….

- Verify the profile is loaded and enforced: sudo apparmor_status.

More information about AppArmor can be found in Ubuntu’s official documentation: [https://documentation.ubuntu.com/server/how-to/security/apparmor/index.html](https://documentation.ubuntu.com/server/how-to/security/apparmor/index.html)

#### 5.2.12.1 Create AppArmor Main Profile

Execute this command after you installed and tested certbot to check if there is an AppArmor profile for NGINX

```bash
sudo apt install apparmor-utils
sudo apparmor_status
```

If there is no NGINX profile, execute this line:

```text
sudo nano /etc/apparmor.d/usr.sbin.nginx
```

This will open the file in a nano session, then paste this:

```text
# AppArmor profile for Nginx (Corrected)
#include

/usr/sbin/nginx {
    # Include necessary abstractions
    include          # Semicolon REMOVED
    include    # Semicolon REMOVED
    include        # Semicolon REMOVED
    include      # Semicolon REMOVED

    # Capabilities required by Nginx
    capability dac_override,
    capability net_bind_service,
    capability setgid,
    capability setuid,
    capability sys_resource,
    capability chown,

    # Allow read access to necessary Nginx files and directories
    /etc/nginx/** r,
    /usr/sbin/nginx mr,
    /var/log/nginx/** rw,
    /run/nginx.pid rw,

    # ---> ADDED: Allow Nginx to read website content       # Ensure no semicolon here either

}
```

Now set these filesystem permissions (for NGINX FastCGI Buffer)

```bash
# Set correct ownership
sudo chown www-data:www-data /var/lib/nginx/fastcgi/
# Set correct permissions (owner/group rwx)
sudo chmod 770 /var/lib/nginx/fastcgi/
# Restart Nginx
sudo systemctl restart nginx
```

#### 5.2.12.2 Create Local Directory

```bash
sudo mkdir -p /etc/apparmor.d/local
```

#### 5.12.2.3 Create the local/usr.sbin.nginx File:

We first create an empty file so that apparmor_status doesn’t produce an error, and later on, we add stie specific rules

```text
sudo nano /etc/apparmor.d/local/usr.sbin.nginx
```

Then load the profile and verity the status

```text
sudo apparmor_parser -r -W /etc/apparmor.d/usr.sbin.nginx
sudo apparmor_status
```

#### 5.12.2.4 Add Site-Specific Rules to local/usr.sbin.nginx

```text
sudo nano /etc/apparmor.d/local/usr.sbin.nginx
```

```text
# Site-specific rules for mxcfo.com and openbb.mxcfo.com
/var/www/mxcfo.com/** r,
/var/www/openbb.mxcfo.com/** r,
```

Then load the profile and verity the status (Again)

```text
sudo apparmor_parser -r -W /etc/apparmor.d/usr.sbin.nginx
sudo apparmor_status
```

Those rules, as they are, are a good *starting point*, but they are almost certainly **not definitive** and will likely need to be expanded as you add functionality to your websites. They provide *read-only* access to your webroot directories. This is sufficient for serving *static* HTML, CSS, JavaScript, and image files. However, most modern web applications require more than just read access.

Here’s a breakdown of why they’re not definitive, what other rules you *might* need to add, and *how* to determine what rules are necessary:

**Why They’re Not Definitive (and What’s Missing)**

- No Write Access: The rules only specify r (read) access. Many web applications need to write to the filesystem, even if it’s just for temporary files, caching, or logging within the webroot. Examples:

Content Management Systems (CMS): WordPress, Drupal, Joomla, etc., all need to write to upload directories, cache directories, and sometimes configuration files within the webroot.

- Web Frameworks: Frameworks like Laravel (PHP), Django (Python), Ruby on Rails, etc., often need write access for temporary files, logs, and uploaded content.

- Any Application with File Uploads: If your website allows users to upload files (images, documents, etc.), Nginx (or rather, the PHP-FPM process, in a typical LEMP stack) needs write access to the upload directory.

- PHP sessions: If using PHP, write permissions must be granted.

- No Access to Other Directories: The rules only cover the webroot directories (/var/www/mxcfo.com and /var/www/openbb.mxcfo.com). Web applications often need to access other directories outside the webroot, such as:

PHP-FPM Socket: If you’re using PHP-FPM (which is extremely common), the AppArmor profile needs to allow Nginx to communicate with the PHP-FPM process via a Unix socket. This socket is not usually within the webroot.

- System Libraries: Applications might need to access system libraries (e.g., /usr/lib/). The abstractions/base include usually covers the most common cases, but you might need to add specific rules in some situations.

- Databases: If your application connects to a database (like MySQL/MariaDB or PostgreSQL), the AppArmor profile might need to allow network access to the database server (although this is often handled by separate AppArmor profiles for the database server itself). It is much more common to have database connections not restricted by AppArmor.

- Temporary Files: Applications often use temporary directories (like /tmp or a dedicated temporary directory within the webroot).

**How to Determine What Rules You Need**

The *best* way to determine the necessary AppArmor rules is through a combination of:

- Understanding Your Application: Read the documentation for your web application (WordPress, OpenBB, etc.). It should specify the directories it needs to access and whether it needs read-only or read-write access.

- Testing in Complain Mode (Crucial):

Put the Nginx AppArmor profile into complain mode:sudo aa-complain /etc/apparmor.d/usr.sbin.nginxcontent_copydownloadUse code with caution.Bash

- Use your website thoroughly. Test all features: upload files, submit forms, log in, use any administrative interfaces, etc.

- Check the AppArmor logs:sudo journalctl -u apparmor | grep nginxcontent_copydownloadUse code with caution.Bash

- Look for log entries that say would have denied. These entries tell you what actions Nginx (or PHP-FPM, or other related processes) tried to perform but would have been blocked if AppArmor were in enforce mode. These log entries give you the precise information you need to create the necessary rules. For example, you might see something like:audit: type=1400 audit(1678886400.123:456): apparmor="ALLOWED" operation="open" profile="/usr/sbin/nginx" name="/var/www/mxcfo.com/wp-content/uploads/2023/03/image.jpg" pid=1234 comm="nginx" requested_mask="w" denied_mask="w" fsuid=33 ouid=33content_copydownloadUse code with caution.This tells you that Nginx (or, more likely, PHP-FPM running as user www-data with UID 33) tried to write (requested_mask=”w”) to /var/www/mxcfo.com/wp-content/uploads/2023/03/image.jpg. This indicates that you need to add a rule allowing write access to that directory (or a more general rule for the uploads directory).

- Iterative Refinement: Add the necessary rules to your local/usr.sbin.nginx file based on the log entries. Reload AppArmor (sudo systemctl reload apparmor), put the profile back into complain mode, and test again. Repeat this process until you no longer see any would have denied messages in the logs during normal website operation.

- Enforce Mode: Once you’re confident that you’ve addressed all the necessary permissions, put the profile back into enforce mode:sudo aa-enforce /etc/apparmor.d/usr.sbin.nginxcontent_copydownloadUse code with caution.Bash

**Example: Adding Rules for WordPress**

Let’s say you’re installing WordPress on mxcfo.com. WordPress needs write access to the wp-content/uploads directory to store uploaded files. Based on the AppArmor logs (and WordPress documentation), you might add the following to /etc/apparmor.d/local/usr.sbin.nginx:

```text
# Site-specific rules for mxcfo.com
/var/www/mxcfo.com/** r,
/var/www/mxcfo.com/wp-content/uploads/** rw,  # Allow read/write for uploads
/var/www/mxcfo.com/wp-content/cache/** rw, # Allow caching
/run/php/php8.3-fpm.sock rw, # Allow communication with php
```

Also add the following lines to the main profile inside the brackets:

```text
network inet tcp,
  network inet6 tcp,
```

**Example: Adding Rules for PHP-FPM**
If you are using php, you must give nginx permissions to communicate via sockets.

```text
/run/php/php8.3-fpm.sock rw, # Allow communication with php
```

You need to find out which version of php you are using, to check the right socket name.

**Key Principles**

- Least Privilege: Only grant the minimum necessary permissions.

- Specificity: Use specific paths whenever possible (e.g., /var/www/mxcfo.com/wp-content/uploads/** instead of /var/www/mxcfo.com/** rw).

- Testing: Use complain mode and the AppArmor logs to iteratively refine your rules.

- Documentation: Keep good comments in your local/usr.sbin.nginx file to explain the purpose of each rule.

In summary, the initial rules are a starting point. You’ll almost certainly need to add more rules based on the specific requirements of your web applications and your server setup. Use complain mode and the AppArmor logs to guide you. Don’t be afraid to experiment, but *always* test thoroughly before putting the profile into enforce mode in a production environment.

#### 5.12.2.5 Reload AppArmor

_Crucially_, we reload the entire apparmor service, *not* just the individual profile with apparmor_parser. This ensures that all changes, including the new local/ include file, are correctly loaded.  Restart Nginx abd check AppArmor status

```bash
sudo systemctl reload apparmor
sudo systemctl restart nginx
sudo apparmor_status
```

## 5.3 Install Certbot

At this point, your Nginx server is running and serving a basic test page over HTTP. However, for security and best practices, you should *always* use HTTPS. We’ll use Let’s Encrypt, a free, automated, and open certificate authority, and Certbot, a tool that makes obtaining and managing Let’s Encrypt certificates easy.

### 5.3.1 Install Certbot

On Ubuntu, the recommended way to install Certbot is using snap:

**Explanation:**

- snap: snap is a package manager for Linux. Certbot is distributed as a snap package, which ensures you get the latest version and all its dependencies.

- –classic: The –classic flag is required for Certbot to modify your Nginx configuration files.

- ln -s: We create a symbolic link, to use certbot from anywhere.

```bash
sudo apt update
sudo apt upgrade -y

sudo apt remove certbot python3-certbot-nginx # Th remove existing apt installation as we will use snap
sudo apt autoremove  # Remove any leftover dependencies

sudo snap install core; sudo snap refresh core
sudo snap install --classic certbot
sudo ln -s /snap/bin/certbot /usr/bin/certbot  # Create a symbolic link
```

Verity the Snap Installation

```text
/snap/bin/certbot --version
```

### 5.3.2 Obtain and Install the Certificate:

This is where Certbot works its magic. We’ll use the –nginx plugin, which automatically configures Nginx for HTTPS:

**Explanation:**

- –nginx: Tells Certbot to use the Nginx plugin. This plugin will automatically:

Detect your Nginx configuration.

- Modify your configuration files to enable HTTPS.

- Reload Nginx to apply the changes.

- -d mxcfo.com -d www.mxcfo.com: Specifies the domains for which you want a certificate. Include both the root domain (mxcfo.com) and the www subdomain (www.mxcfo.com). This ensures your site works correctly with and without the www.

Add any subdomains as necessary (the –nginx plugin automatically modifies your Nginx configuration files)

```text
sudo /snap/bin/certbot --nginx -d mxcfo.com -d www.mxcfo.com -d openbb.mxcfo.com
```

When you run the command, Certbot will:

- Ask for your email address (for renewal notices and security alerts). Provide a valid email address.

- Ask you to agree to the Let’s Encrypt terms of service.

- Communicate with the Let’s Encrypt servers to verify that you control the domains (mxcfo.com and www.mxcfo.com). It does this by making temporary changes to your Nginx configuration. This is why it’s essential that your DNS records are correctly configured and have propagated before you run Certbot.

- Obtain the SSL/TLS certificate.

- Modify your Nginx configuration files (specifically, the mxcfo.com file in /etc/nginx/sites-available/) to use the certificate and enable HTTPS.

- Reload Nginx.

- Set up automatic renewal (so your certificate doesn’t expire).

### 5.3.3 Change permissions of the pem file

We need to change the permissions of the pem file and verify it

```bash
sudo chmod 600 /etc/letsencrypt/ssl-dhparams.pem
 ls -l /etc/letsencrypt/ssl-dhparams.pem
```

The permissions of the pem file should look like this:

![](/images/2025/03/certificate_pem.png)

### 5.3.4 Verify HTTPS

```bash
sudo nginx -t
sudo systemctl reload nginx
```

- Test HTTPS: Open your web browser and go to https://mxcfo.com. You should see a padlock icon, indicating a secure connection.

- Test Renewal: Certbot certificates are valid for 90 days. The snap package includes a systemd timer that automatically renews the certificate. You can test the renewal process with:

### 5.3.5 Automatic Renewal

Let’s Encrypt certificates are valid for 90 days. Certbot automatically sets up a systemd timer that will renew your certificate before it expires. You don’t need to do anything manually.

You can test the renewal process with:

### 5.3.6 Test NGINX Configuration (Again)

```text
sudo nginx -t
```

```text
sudo certbot renew --dry-run
```

### 5.3.7 Troubleshoot

**When to Use kill (or pkill) with Nginx**

You should use kill (or pkill) to stop Nginx processes *only* in these situations:

- systemctl stop nginx or systemctl restart nginx Fails: The preferred way to stop or restart Nginx is to use the systemd service manager:sudo systemctl stop nginx # To stop sudo systemctl restart nginx # To restartcontent_copydownloadUse code with caution.BashThese commands use systemd’s mechanisms to manage the Nginx service, ensuring a clean shutdown and proper handling of dependencies. However, if these commands fail (which is unusual but can happen if Nginx is in a very bad state), then you might need to use kill as a fallback.

- “Address Already in Use” Error: As you experienced, if you get an “Address already in use” error when trying to start Nginx, it means there are already Nginx processes running and holding onto ports 80 and 443. In this case, you need to stop the existing processes before you can start a new Nginx instance. This is the most common scenario where you’d need to use kill with Nginx. This is often caused by:

Previous Failed Startup: If Nginx failed to start cleanly (due to a configuration error, for example), some processes might be left running.

- Manual Intervention: If you manually started Nginx (e.g., using /usr/sbin/nginx directly) without going through systemd, the systemd service manager might not be aware of it.

- Duplicate process: In rare cases, some conflict may create another instance of nginx.

- Unresponsive Nginx Processes: In very rare cases, Nginx processes might become completely unresponsive and refuse to shut down gracefully, even with systemctl stop. In this situation, you might need to use kill -9 (or pkill -9 nginx) as a last resort to forcefully terminate the processes. This is a “hard kill” and should only be used if gentler methods fail.

- Testing (Rare): Very rarely will you need to stop a specific nginx process manually.

**How to Use kill (and pkill) Correctly**

- Identify the Master Process: Always use ps aux | grep nginx to identify the master Nginx process. This is the process you should kill. Killing the master process will automatically terminate the worker processes.

- Use kill  (Preferred): The most direct way is to use kill with the process ID (PID) of the master process:ps aux | grep nginx # Find the master process PID sudo kill # Replace with the actual PIDcontent_copydownloadUse code with caution.Bash

- Use pkill nginx (Less Precise): pkill nginx sends a signal to all processes whose name matches “nginx”. This is less precise than using the PID, but it can be convenient. By default, pkill sends SIGTERM (signal 15), which is a graceful shutdown request.

- Use kill -9 or pkill -9 (Only as a Last Resort): The -9 option sends the SIGKILL signal, which immediately terminates the process. This is a “hard kill” and should only be used if kill  (without -9) or pkill nginx fails. SIGKILL can potentially lead to data loss or corruption if the process was in the middle of writing to a file.

**When *Not* to Use kill**

- Normal Operation: You should not use kill to stop or restart Nginx during normal operation. Always use systemctl stop, systemctl restart, or systemctl reload.

- When systemd is Managing Nginx: As long as Nginx is running as a systemd service (which is the standard and recommended way), you should always use systemd commands to manage it.

**Summary**

Use kill (or pkill) with Nginx only when:

- systemctl stop/restart fails.

- You have an “Address already in use” error and need to stop existing Nginx processes.

- Nginx processes are completely unresponsive (very rare).

Always prefer kill  (using the PID of the master process) over pkill nginx. Use kill -9 or pkill -9 only as a last resort. For normal operation, always use systemctl.

![](/images/2025/03/nginx_kill.png)

## 5.4 Create a Custom Image

Up to this point, we have a fully functioning VM with a basic base installation that includes an SSL Certificate. Before installing anything else, it is good to create an image of the VM as it is, in case we need to create another VM due to an issue with another software we later install on it that creates problems.

A custom image is a complete copy of your VM’s boot volume (and optionally, other data volumes) at a specific point in time.

- How it Works: OCI takes a snapshot of your boot volume (and any other volumes you choose). This snapshot is then used to create a “custom image” that you can use as a template for new VMs.

- Pros:

Complete Copy: It’s a full copy of your entire operating system, applications, configurations, and data (on the included volumes).

- Fast Creation of New VMs: Creating a new VM from a custom image is very fast, as it’s essentially just restoring from a snapshot.

- Versioned: You can create multiple custom images over time, giving you different versions of your server state to choose from.

- Portable (Within OCI): You can use custom images within your OCI tenancy (and even share them with other tenancies, with appropriate permissions).

- Cons:

Storage Costs: Custom images consume storage space in your OCI Object Storage, so there are storage costs associated with them. However, the cost is usually quite reasonable.

- Point-in-Time: It’s a snapshot at a specific point in time. Any changes you make to your VM after creating the image will not be reflected in the image.

- Does not include Instance configuration: The configuration of the Instance (shape, network configuration…) are not part of the image.

- How to Create a Custom Image (Steps):Stop the VM (Recommended): It’s strongly recommended to stop the VM before creating a custom image. This ensures that the file system is in a consistent state and avoids potential data corruption. You can create a custom image while the VM is running (“hot” image), but this is riskier.
- Go to the Oracle Cloud Console: Navigate to your VM instance’s details page.
- “Create Custom Image”: Find the option to “Create Custom Image” (it’s usually under the “Instance Details” section, or in a menu like “More Actions”).
- Give it a Name: Choose a descriptive name for your custom image (e.g., mxcfo-server-2025-03-20).
- Select Compartment: Choose the compartment where you want to store the image.
- Create: Click the “Create Custom Image” button.

The process will take some time, depending on the size of your boot volume. You can monitor the progress in the OCI console.

- How to launch and instance from the image:

In the navigation menu, under Compute, click Custom Images.

- Choose the compartment.

- Click the image you want to use.

- Click Create Instance.

- Complete the fields, like you would normally do to create an instance.

## 5.5 Export Custom Image

Exporting a custom image to an external cloud blob storage to save money, is a common and perfectly reasonable strategy to manage costs and increase portability. Here’s a breakdown of how you can do it, the considerations involved, and some popular options, assuming your VM uses a boot volume (most Oracle VMs do)

**Key Concepts and Steps**

- Image Export (Oracle-Specific): Oracle Cloud Infrastructure (OCI) has a built-in mechanism for exporting images. This creates a file (typically in a .oci format, which is essentially a tarball containing the image data) that you can download. You must use the Oracle export feature; you can’t just copy the virtual disk file directly.

- Transfer: You need a way to move the exported image file from Oracle’s infrastructure to your chosen object storage service.

- Object Storage Choice: Several cloud providers offer cost-effective object storage. You’ll need to choose one and create a “bucket” (or its equivalent) to hold your image.

- Upload: You’ll upload the exported image file to your chosen object storage bucket.

- Import (Optional, but Important): If you ever want to use the image again in another cloud provider (or even back in Oracle in a different region), you’ll likely need to import it into that provider’s image service. This process varies significantly between cloud providers. This is a crucial step if you want to use the image to launch new VMs. Just storing the file isn’t enough; you need to register it as a usable image.

**Detailed Steps (with Oracle Specifics)**

**1. Export the Image from Oracle Cloud:**

- Go to OCI Console: Log in to your Oracle Cloud Infrastructure console.

- Navigate to Compute > Custom Images: Find your custom image in the list.

- Export the Image: Click the three dots (Action menu) next to your custom image and select “Export Image”.

- Choose Export Destination: The most important part here:

Object Storage Bucket: You can export directly to an OCI Object Storage bucket. This is the easiest option if you plan to use the image again within Oracle Cloud. You’d create a bucket (if you don’t have one already) and select it here. But, since your goal is to use a different provider, you’ll likely choose the next option.

- Object Storage URL (Pre-Authenticated Request): This is the key for exporting outside of OCI. You need to create a Pre-Authenticated Request (PAR) on an OCI Object Storage bucket. This PAR gives you a temporary URL with write access to that bucket. Here’s how to create a PAR:

Go to Object Storage > Object Storage.

- Select the compartment containing the bucket you want to use (or create a new bucket).

- Click the three dots next to your bucket and select “Create Pre-Authenticated Request.”

- Set an expiration date (make it long enough for the export to complete!).

- Choose “Permit object writes” (or both read and write if you might need to download it from OCI later).

- Create the PAR. Copy the generated URL. This URL is your temporary write access key; keep it safe!

- Paste the PAR URL into the “Object Storage URL” field in the image export dialog.

- Start the Export: Click “Export Image”. This process can take a significant amount of time, depending on the size of your image. You can monitor the progress in the Work Requests section of the OCI console.

- Object Storage File The export process will produce an image in Oracle format (.oci).

**2. Transfer (Download) the Image:**

- Important: Once the export is complete, the .oci file will be in the OCI Object Storage bucket temporarily, accessible only via the PAR URL. You must download it before the PAR expires.

- Download Options:

**oci CLI:** The Oracle Cloud Infrastructure Command Line Interface (oci) is the best option for reliable downloads, especially for large images. You’ll need to install and configure the CLI (see Oracle’s documentation). The command would look something like this (replace with your actual PAR URL):

```text
oci os object get --bucket-name  --name  --file  --source-uri
```

**curl or wget:** You can use standard command-line tools like curl or wget with the PAR URL:

```bash
curl -O   # or wget
```

- This is less robust than the oci CLI, especially for very large files and unreliable connections.

- Web Browser: You can paste the PAR URL into a web browser to download the file, but this is generally not recommended for large files.

**3. Choose Your Object Storage Provider:**

Here are some popular and cost-effective options, along with links to their relevant documentation:

- Backblaze B2: Very affordable, especially for storage. Backblaze B2 Cloud Storage

- Wasabi: Also very affordable, with a focus on simplicity. Wasabi Hot Cloud Storage

- AWS S3 (Infrequent Access or Glacier): Amazon S3 is the industry leader, but the standard tier can be more expensive. Consider the “S3 Standard-IA” (Infrequent Access) or “S3 Glacier” tiers for lower costs. AWS S3 Storage Classes

- Google Cloud Storage (Nearline or Coldline): Similar to AWS, Google Cloud Storage offers different tiers. “Nearline” and “Coldline” are good options for archival storage. Google Cloud Storage Classes

- Azure Blob Storage (Cool or Archive): Microsoft’s Azure Blob Storage also has tiered pricing. “Cool” and “Archive” are suitable for infrequently accessed data. Azure Blob Storage Access Tiers

**Create a Bucket:** Once you’ve chosen a provider, sign up for an account (if you don’t have one), and create a “bucket” (or the equivalent concept) within their object storage service. Make note of:

- Bucket Name: The unique name of your bucket.

- Region/Location: The geographic location of your bucket.

- Access Keys/Credentials: You’ll need credentials (access keys, service account keys, etc.) to upload files to your bucket. Keep these secure!

**4. Upload to Object Storage:**

The upload method depends on your chosen provider. Most offer:

- Web UI: A web-based interface where you can drag and drop files. Suitable for smaller files, but may not be reliable for very large images.

- CLI Tools: Command-line tools (like aws s3 cp for AWS, gsutil cp for Google Cloud, az storage blob upload for Azure, or provider-specific CLIs) are generally the most reliable and efficient way to upload large files.

- SDKs: If you’re comfortable with programming, you can use software development kits (SDKs) for various languages (Python, Java, Node.js, etc.) to upload files programmatically.

**Example (AWS S3 CLI):**

```text
aws s3 cp  s3://// --storage-class STANDARD_IA  # Use STANDARD_IA for lower cost
```

**Example (Google Cloud Storage gsutil):**

```text
gsutil cp -s nearline  gs:////
```

**Example (Backblaze B2 CLI):**

```text
b2 upload-file
```

**5. Import (If Needed):**

This is the *critical* step if you want to create new VMs from your stored image in a *different* cloud environment. The .oci file is just a data archive; you need to “register” it with the target cloud provider’s image service. The process varies *wildly* between providers. Here are some examples:

- AWS: You’ll likely use the aws ec2 import-image command. This is a complex process that often involves creating a temporary S3 bucket and configuring roles. See Importing a VM as an image using VM Import/Export. You may need to convert the .oci file into another format.

- Google Cloud: You can use the gcloud compute images import command. Google Cloud can often import directly from a .oci file stored in Google Cloud Storage. Importing virtual disks

- Azure: You’ll typically create a managed disk from the VHD file (you may need to convert the .oci to VHD) and then create an image from that managed disk. See Upload a generalized VHD and use it to create new VMs in Azure.

- Backblaze B2/Wasabi (Indirect): These providers are primarily for storage, not compute. You’d typically download the image from B2/Wasabi and then import it into a compute provider like AWS, Google Cloud, or Azure.

**Important Considerations:**

- Image Format Conversion: You might need to convert the .oci image file to a different format (e.g., VHD, VMDK, QCOW2) depending on your target cloud provider. Tools like qemu-img can be used for this conversion. This is often the most challenging part.

- Licensing: Be mindful of Ubuntu’s licensing terms. While Ubuntu itself is open source, you need to ensure you comply with any licensing requirements for any pre-installed software.

- Networking: When you import the image into a new cloud, you’ll likely need to configure networking (VPC, subnets, security groups) to match your requirements. The image itself doesn’t contain network configuration details that will automatically work in a different environment.

- Security: Store your access keys and credentials securely. Use strong passwords and consider using multi-factor authentication where available.

- Cost Monitoring: Keep an eye on your object storage costs. While object storage is generally inexpensive, costs can accumulate, especially for large images. Set up billing alerts to avoid surprises.

- Testing: After importing to a new platform, test the new VM to ensure that everything is working correctly.

This comprehensive guide should give you a solid understanding of the process. The most complex parts are usually the initial export and the final import into a new cloud provider. Remember to consult the specific documentation for your chosen object storage provider and any target cloud provider for detailed instructions

## 5.6 Install tmux

It allows to manage multiple terminal sessions, ideal for maintaining processes active even if I disconnect

```bash
sudo apt update
sudo apt upgrade -y

sudo apt install tmux -y
```

Here we have some basic key commands to start working with **tmux**:

| Action                         | Command                     |
| ------------------------------ | --------------------------- |
| Start a new session            | tmux                        |
| Create a new session           | tmux new -s session_name    |
| Disconnect from a session      | Ctrl + B followed by D      |
| List active sessions           | tmux ls                     |
| Reconnect to an active session | tmux attach -t session_name |
| Close a session from within    | exit                        |

## 5.7 Install curl and wget

Basic and essential tools to download files and make HTTP requests.

```bash
sudo apt update
sudo apt upgrade -y

sudo apt install wget -y
sudo apt install curl -y
```

## 5.8 Install system-wide pip3, pipx and uv (Best Practice)

```bash
sudo apt update
sudo apt install python3-pip -y
```

1. **System-Level `pip3`:** Installing `pip3` at the system level (with `sudo apt install python3-pip`) is *generally* recommended. It provides a system-wide `pip3` command that can be useful for managing system-level Python packages (though you’ll mostly be working within your environment). It doesn’t *directly* affect the virtual environment, but it’s a good practice for a clean system.

2. **Install pipx and uv: **

pipx handles creating an isolated environment for uv automatically.

```bash
# 1. Install pipx using apt
sudo apt update
sudo apt install pipx

# 2. Ensure pipx's directory is in your PATH (usually needed once)
pipx ensurepath
# You might need to close and reopen your terminal after this step

# 3. Install uv using pipx
pipx install uv

# 4. Verify installation
uv --version
```

You’ve successfully:

- Installed pipx using apt. Notice that apt automatically pulled in python3-venv and the necessary wheel files (python3-pip-whl, python3-setuptools-whl) that venv and pipx rely on. This is good – it shows the system managing these core components.

- Run pipx ensurepath. This modified your shell’s startup file (likely ~/.bashrc or ~/.profile) to include ~/.local/bin in your PATH environment variable for future terminal sessions.

- Installed uv using pipx. It created an isolated environment for uv and placed the executable links (uv and uvx) in ~/.local/bin.

Now close your current terminal window or SSH session and start a new one. The new session will read the updated configuration file, and ~/.local/bin will be in its PATH.

3. **Create a python_projects folder:** Create this folder in /var/www/html/ so we can put our python projecs there, and assign the correct permissions:

```bash
sudo mkdir python_projects
sudo chmod -R 755 /var/www/html/python_projects
 sudo chown -R ubuntu:ubuntu /var/www/html/python_projects
```

## 5.9 Install Anaconda

Anaconda is a popular distribution of Python and R for data science and machine learning. It includes a package manager (conda), an environment manager, and a collection of pre-installed packages. This section will guide you through installing the latest version of Anaconda on your Ubuntu server.

**Important:** Always download and install software from official sources, and verify the integrity of downloaded files.

### 5.9.1 Download the Latest Anaconda Installer

- Go to the Official Anaconda Download Page: Open a web browser and go to the official Anaconda download page: https://www.anaconda.com/download/success

- Find the Linux Installer: Locate the Linux installer section. You’ll see different installers for different architectures.

- Copy the Installer URL (64-Bit (arm64)): Right-click on the “64-Bit (arm64) Installer” link and select “Copy link address” (or the equivalent option in your browser). This will copy the URL of the latest Anaconda installer for your architecture.

- Find the SHA256 hash: In the anaconda website, you’ll see the SHA256 hash for the file you are downloading. Copy that too.

- Download the Installer (using wget): In your server’s terminal, use the wget command to download the installer, replacing  with the URL you copied:

- Note: This is just an example, and it is probably outdated, use the correct URL.

```bash
wget https://repo.anaconda.com/archive/Anaconda3-2024.10-1-Linux-aarch64.sh
```

### 5.9.2 Verify the Installer’s Integrity (Crucial!)

Before running the installer, it’s *essential* to verify its integrity using the SHA-256 checksum. This ensures that the file hasn’t been tampered with during download.

- Get the Expected Checksum: Go back to the Anaconda download page. You should find the expected SHA-256 checksum listed next to the download link. Copy this checksum.

- Calculate the Checksum of the Downloaded File: In your server’s terminal, use the sha256sum command. This will output the SHA-256 checksum of the downloaded file.

- Compare the Checksums: Compare the checksum you calculated with the expected checksum from the Anaconda website. They must match exactly. If they don’t match, do not run the installer! Delete the downloaded file and try downloading it again (potentially from a different mirror).

```text
sha256sum Anaconda3-*.sh  # Use the actual filename of the installer
```

### 5.9.3 Run the Anaconda Installer

- Make the Installer Executable (usually not necessary, but good practice):Although in most cases the file will have execution permissions, it is a good practice to run this command

- Run the Installer:

- Follow the Prompts:

Read and accept the license agreement.

- Choose the installation location (the default is usually fine).

- Important: When prompted whether to initialize Anaconda Distribution by running conda init, answer yes. This will add the necessary lines to your .bashrc file to make the conda command available in your shell.

```bash
chmod +x Anaconda3-*.sh  # Use the actual filename of the installer
bash Anaconda3-*.sh
```

### 5.9.4 Activate Anaconda

- Close and Reopen Your Terminal: This is the easiest way to ensure that the changes to your .bashrc file are applied.

- Verify the Installation:This should output the installed conda version. If you get a “command not found” error, something went wrong with the conda init step.

```text
source ~/.bashrc
conda --version
```

### 5.9.5 (Optional) Update Conda

It’s a good idea to update conda to the latest version after installation:

```text
conda update -n base -c defaults conda
```

## 5.9.6 Deactivate Anaconda’s base environment

```text
conda config --set auto_activate_base false
```

**Why Disable Automatic `base` Activation?**

- Conflicts: As we’ve seen, activating Anaconda’s base environment by default can cause major conflicts with other Python environments (like your UV-created virtual environment). The base environment’s libraries and tools can take precedence over the ones you intend to use in your project-specific environment, leading to unpredictable errors (like the bottleneck build failure you experienced).

- Best Practice: It’s generally best practice to explicitly activate the environment you need for each project. This keeps your projects isolated and avoids accidental use of the wrong Python version or packages. Automatic activation is convenient for quick, one-off tasks, but it’s not suitable for structured project development.

- Reproducibility: If you’re collaborating with others or deploying your code, relying on automatic base activation can make it harder to ensure that everyone is using the same environment configuration. Explicit activation promotes reproducibility.
