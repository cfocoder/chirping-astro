---
title: 'My Journey: Taming VPN Conflicts and Securing Server Access with Tailscale'
description: 'Ever found yourself constantly connecting and disconnecting your regular VPN just to SSH into your own server? I certainly did. It was a daily annoyance: fire up the privacy VPN (like ProtonVPN in my case) for general browsing, then disconnect it because my server,...'
pubDate: 2025-04-15
heroImage: '/images/2025/04/talscale_ssh-1.png'
heroImageAlt: 'talscale ssh'
categories: ['Linux']
tags: []
toc: true
---

Ever found yourself constantly connecting and disconnecting your regular VPN just to SSH into your own server? I certainly did. It was a daily annoyance: fire up the privacy VPN (like ProtonVPN in my case) for general browsing, then *disconnect* it because my server, secured by firewall rules allowing only specific IPs, wouldn’t recognize the VPN’s ever-changing public address. Then, reconnect the VPN afterwards. Rinse and repeat.

There had to be a better way. I’d heard about Tailscale potentially replacing VPNs, and decided to dive in. Turns out, it was the perfect solution for *this* specific problem, and it could even coexist with my existing VPN.

## The Core Problem: Changing IPs vs. Static Firewall Rules

My Ubuntu server was configured with ufw (Uncomplicated Firewall). For security, I wanted to restrict SSH access (port 22). The “easy” way is ufw allow from to any port 22, but what happens when I’m travelling, at a coffee shop, or using my commercial VPN? My public IP changes constantly, making static IP rules a nightmare to maintain or completely insecure if left wide open (ALLOW Anywhere). Using my commercial VPN meant my server saw connection attempts from random VPN server IPs, which were promptly blocked by the firewall.

## Enter Tailscale: A Private Network Overlay

Tailscale works differently from traditional or commercial VPNs. Instead of routing all traffic through a central server, it creates a secure **mesh network** (a “tailnet”) between *your* devices.

Here’s the magic:

- Stable Private IPs: Every device (my laptop, my server) I added to my Tailscale account got a unique, stable IP address in the 100.x.y.z range. This IP doesn’t change, no matter what Wi-Fi I’m on or if my commercial VPN is active.

- Direct Connections: Tailscale uses the clever WireGuard protocol and NAT traversal techniques to establish direct, encrypted connections between my devices whenever possible. My data doesn’t usually flow through Tailscale’s servers.

- Simple Setup: Install Tailscale on the client (my laptop) and the server (Ubuntu), log in via a browser using the same account (e.g., Google, GitHub, Microsoft), and boom – they can see each other using their 100.x.y.z Tailscale IPs.

## Initial Success! (Followed by a Twist)

After installing Tailscale on both ends, I could instantly SSH into my server using its Tailscale IP:

```bash
ssh my_username@100.x.y.z # (Using the server's Tailscale IP)
```

This worked perfectly… until I reconnected ProtonVPN. Suddenly, the SSH connection failed again.

## The Conflict: Who Controls the Routes?

The issue was clear: ProtonVPN, by default, grabs *all* network traffic from my laptop and routes it through its own tunnel. When I tried to SSH to 100.x.y.z, ProtonVPN intercepted it and tried sending it out to its own servers, which had no idea how to reach my private Tailscale IP. Tailscale needed its traffic to be left alone.

## The Solution: Split Tunneling

Thankfully, most good commercial VPNs, including ProtonVPN, offer **Split Tunneling**. This feature lets you specify which apps or IP addresses should *bypass* the VPN tunnel.

The key was to tell ProtonVPN to **exclude** the entire Tailscale IP range: 100.64.0.0/10.

- Opened ProtonVPN settings on my laptop.

- Navigated to Connection -> Split Tunneling.

- Chose the option to “Exclude IPs” from the VPN tunnel.

- Added the 100.64.0.0/10 CIDR range to the exclusion list.

- Saved the settings.

With both ProtonVPN and Tailscale running, I tried again:

```bash
ssh my_username@100.x.y.z
```

Success! My laptop now intelligently sent traffic destined for my Tailscale network directly via Tailscale, while all other traffic went through ProtonVPN as intended.

## Final Step: Locking Down the Server Firewall (ufw)

Now that I had a reliable, secure way to connect via Tailscale, it was time to harden my server’s firewall. My previous ufw rules were too permissive:

````text
# Old Dangerous Rules (Example)
Status: active

To                         Action      From
--                         ------      ----
22/tcp                     ALLOW       Anywhere  The goal: Allow SSH *only* over the Tailscale network.

- Allow SSH on Tailscale Interface: I ensured rules existed specifically for the Tailscale network interface (tailscale0). If not present, I would add them:

```text
sudo ufw allow in on tailscale0 to any port 22 proto tcp
````

- (My output showed these rules were already added during the initial setup, which was great.)

- Remove Public SSH Access: This is the crucial security step. I listed the rules with numbers (sudo ufw status numbered) and identified the lines allowing port 22 from Anywhere (both IPv4 and IPv6) that didn’t mention tailscale0. Then I deleted them by number:

```text
# Find the numbers first!
sudo ufw status numbered

# Example: If public SSH was rule [1] and [5]
sudo ufw delete 1
sudo ufw delete 5
```

- Review Other Ports: I also reviewed rules for ports 80 (HTTP) and 443 (HTTPS). Since this server wasn’t hosting a public website, I decided to remove public access for those too and only allow them via Tailscale if needed later. If it were a public web server, I would have left the public 80/443 rules intact.

## The Result: Secure, Convenient Access

Now I have the best of both worlds:

- ProtonVPN: Protects my general web browsing privacy and security on any network.

- Tailscale: Provides a rock-solid, secure, and easy way to SSH into my server using its stable 100.x.y.z IP, regardless of my location or whether ProtonVPN is active.

- Server Firewall (ufw): Properly configured to only allow SSH connections coming through the secure Tailscale tunnel, significantly reducing its exposure to the public internet.

No more disconnecting/reconnecting my VPN just for server access! This setup feels much cleaner and more secure. If you face similar SSH-over-VPN headaches, I highly recommend exploring Tailscale and configuring split tunneling on your commercial VPN.
