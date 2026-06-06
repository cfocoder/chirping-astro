---
title: 'Supercharging Your Cloud Server Management: Mountain Duck + Tailscale + ARM Ubuntu Done Right!'
description: 'Managing files on a remote server can sometimes feel like navigating a maze. Public IPs, firewalls, SSH keys – it’s a lot to keep track of. But what if I told you there’s a “super cool” way to get seamless, secure file access, even to your Oracle ARM Ubuntu server, all...'
pubDate: 2025-06-20
heroImage: '/images/2025/06/mountainduck_logo.png'
heroImageAlt: 'mountainduck logo'
categories: ['Linux']
tags: ['Mountain Duck', 'Tailscale']
toc: true
---

Managing files on a remote server can sometimes feel like navigating a maze. Public IPs, firewalls, SSH keys – it’s a lot to keep track of. But what if I told you there’s a “super cool” way to get seamless, secure file access, even to your Oracle ARM Ubuntu server, all while keeping public access locked down?

This post details my recent journey to connect [My Local Machine OS, e.g., Windows Laptop] with my [Your Cloud Provider, e.g., Oracle Cloud Infrastructure (OCI)] ARM Ubuntu server using Mountain Duck, fortified by Tailscale for a private, encrypted network connection. We’ll cover everything from ensuring your SSH server is alive, to fine-tuning your firewall, managing SSH keys, and accessing mounted volumes.

## The Setup: My Cloud Server & Tools

- Cloud Server: An Ubuntu Server running on ARM architecture (e.g., Oracle Cloud’s Free Tier Ampere A1 instance).

- Local File Manager: Mountain Duck (an excellent utility for mounting remote filesystems as local drives).

- Secure Network Fabric: Tailscale (for creating a private, encrypted network between my devices).

Let’s dive in!

## Step 1: Ensure Your SSH Server is Ready to Listen

Mountain Duck relies on SFTP, which runs over the SSH protocol. The first crucial step is to ensure your server’s SSH daemon (sshd) is actually running and configured to start on boot.

I first checked its status:

```bash
sudo systemctl status ssh
```

My initial output showed Active: inactive (dead). Uh-oh! This meant no incoming SSH connections would work.

**The Fix:**
I started the service and enabled it to persist across reboots:

```bash
sudo systemctl start ssh
sudo systemctl enable ssh
```

A quick check with sudo systemctl status ssh then confirmed it was Active: active (running). Success on the first hurdle!

## Step 2: The Tailscale Advantage – Your Private Network Superhighway

This is where Tailscale truly shines. Instead of exposing my server to the public internet, Tailscale creates a secure, encrypted tunnel between my local machine and the server. This means:

- I use the server’s private Tailscale IP address (e.g., 100.x.x.x) or its Tailscale hostname (e.g., my-server-name.tailscale.net) for connections.

- I can close public SSH ports (more on that next!).

**Before connecting with Mountain Duck, make sure both your local machine and server are online and connected to the same Tailscale network.** You can verify the server’s Tailscale IP by running tailscale ip on the server or tailscale status from your local machine.

## Step 3: UFW Firewall Fortification – Locking Down Public Access

My server uses UFW (Uncomplicated Firewall) for local firewall management. My initial sudo ufw status looked something like this (simplified):

```text
Status: active

To                         Action      From
--                         ------      ----
80/tcp                     ALLOW       Anywhere   # For my blog
443                        ALLOW       Anywhere   # For my blog
22/tcp on tailscale0       ALLOW       Anywhere   # SSH via Tailscale
22/tcp                     ALLOW       Anywhere   # PUBLIC SSH! (DANGER!)
# ... and more IPv6 rules
```

**The “Aha!” Moment:** The 22/tcp ALLOW Anywhere rule was a gaping hole! It meant my server’s public SSH port was open to anyone on the internet, a prime target for attackers. Since I was using Tailscale for private management access, this public exposure was completely unnecessary.

**The Fix (and Security Boost!):**
I removed the public SSH rules while keeping the essential ones for my blog (80/tcp, 443) and for SSH over Tailscale (22/tcp on tailscale0):

```text
sudo ufw delete allow 22/tcp
# And for IPv6:
sudo ufw delete allow 22/tcp comment 'v6' # Or use `sudo ufw status numbered` to find the exact rule number to delete
```

After these changes, my sudo ufw status looked much cleaner and more secure:

```text
Status: active

To                         Action      From
--                         ------      ----
80/tcp                     ALLOW       Anywhere
443                        ALLOW       Anywhere
22/tcp on tailscale0       ALLOW       Anywhere
# ... and corresponding IPv6 rules ...
```

This closed off a significant attack surface, ensuring my SSH connections only come through the trusted Tailscale network.

## Step 4: SSH Keys – The True Authentication Gatekeeper

This was a point of initial confusion for me. I thought since I was using Tailscale, I no longer needed my SSH keys. **Wrong!** Tailscale handles the *network connection*, but SSH keys are still the robust method for *authentication* to the server.

My local Linux environment’s ~/.ssh folder didn’t show my Oracle server key because I primarily work from my [My Local Machine OS, e.g., Windows Laptop].

**The Fix:**

- Locate Your Private Key: I found my private key file (e.g., my_oracle_server_key.pem or mxcfo.key) that I either downloaded from OCI or generated when setting up the instance. On Windows, it was typically in my Downloads folder or a custom location, often identified as a “KEY File” by Windows.

Important: If your key is in PuTTY’s .ppk format, you might need to convert it to OpenSSH format using PuTTYgen (Conversions > Export OpenSSH key).

- Set Secure Permissions (on Windows): For security, private keys should have very restricted access.

Right-click the private key file > Properties > Security tab > Advanced.

- Disable inheritance and Convert inherited permissions.

- Remove all users/groups except your own Windows user account (and optionally SYSTEM/Administrators). Ensure your user only has Read and Read & Execute permissions.

- Configure Mountain Duck:

Open Mountain Duck and create a new SFTP (SSH File Transfer Protocol) bookmark.

- Server: Enter your server’s Tailscale IP address (e.g., 100.x.x.x) or Tailscale hostname (e.g., my-server-name.tailscale.net).

- Port: 22

- Username: The user account on your Ubuntu server (e.g., ubuntu).

- Authentication: Select SSH Key.

- Browse to and select your private key file (e.g., my_oracle_server_key.pem or mxcfo.key).

- If your key has a passphrase, enter it when prompted.

## Step 5: Accessing Mounted Volumes (e.g., /mnt/myvolume)

Once connected, I realized Mountain Duck initially landed me in my home directory. To access other parts of the filesystem, like a mounted volume at /mnt/myvolume, you need to:

- Navigate Manually: Once connected, you can simply browse through the directory structure in Mountain Duck to find /mnt/myvolume.

- Set as Default Path: For quick access, I edited my Mountain Duck bookmark and set the Path field to /mnt/myvolume. Now, every time I connect, it takes me directly there!

**The Permissions Catch:** If you can’t see files or write to your mounted volume, it’s almost certainly a permissions issue on the server. Your connecting user needs appropriate permissions.

**The Fix:**
I SSH’d into my server (using my Tailscale IP and SSH key, of course!) and checked the permissions:

```bash
ls -ld /mnt/myvolume
```

If the owner wasn’t my connecting user (e.g., ubuntu), I changed it:

```bash
sudo chown -R your_username:your_username /mnt/myvolume
```

(Replace your_username with your actual SSH username on the server). This recursively gives my user full ownership of the volume.

## Conclusion: Secure, Seamless, Super Cool!

By combining Mountain Duck’s intuitive file management with Tailscale’s secure network capabilities, and ensuring proper SSH setup, UFW rules, and key management, I now have a robust and secure way to interact with my Oracle ARM Ubuntu server. My files are just a click away, mounted like a local drive, but protected by layers of security.

If you’re managing cloud servers, I highly recommend adopting a similar workflow. It’s a game-changer for both convenience and peace of mind!
