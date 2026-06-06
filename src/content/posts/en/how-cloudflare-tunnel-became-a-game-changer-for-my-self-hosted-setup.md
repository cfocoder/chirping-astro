---
title: 'How Cloudflare Tunnel Became a Game Changer for My Self-Hosted Setup'
description: 'The Problem: ISP Restrictions and Port Blocking'
pubDate: 2025-12-15
heroImage: '/images/2025/12/cloudflare_tunnels_blog.png'
heroImageAlt: 'cloudflare tunnels blog'
categories: ['Cloud']
tags: ['Cloudflare', 'Tunnels']
toc: true
---

## The Problem: ISP Restrictions and Port Blocking

## Enter Cloudflare Tunnel: The Solution

Cloudflare Tunnel turned out to be the **game changer** I needed. It creates a secure, encrypted connection from your server to Cloudflare’s edge network without requiring any open inbound ports on your firewall or router.

**Here’s why it’s brilliant:**

- ✅ Zero open ports: No port forwarding needed (goodbye ports 80/443!)

- ✅ Works with restrictive ISPs: Bypasses residential port blocks entirely

- ✅ Automatic SSL/TLS: Free certificates managed by Cloudflare

- ✅ Dynamic IP friendly: Your public IP can change without issues

- ✅ Built-in DDoS protection: Cloudflare filters malicious traffic

- ✅ High availability: 4 redundant connections automatically

- ✅ Completely free: Included in Cloudflare’s free tier

## My Use Case: Mac Mini + Oracle Cloud Integration

My setup involves:

- Mac Mini running Ubuntu (at home): Running MinIO, OpenSearch, and Qdrant via Coolify

- Oracle ARM Server (cloud): Running LangFlow, OpenWebUI, and Docling

The Oracle server needed to access the MinIO S3 API running on my Mac Mini. Cloudflare Tunnel made this seamless by exposing:

- minio.example.com → MinIO Console (web UI)

- minioapi.example.com → MinIO S3 API

Now my cloud services can use the MinIO instance at home as if it were a public cloud storage service!

## Step-by-Step Setup Guide

Let me walk you through the exact process I used to set this up.

### Prerequisites

Before starting, you need:

- A domain registered with Cloudflare (e.g., yourdomain.com)

- A Linux server (Ubuntu, Debian, etc.)

- Root or sudo access

- A service running locally that you want to expose (e.g., MinIO on port 9001)

### Step 1: Install Cloudflared

On **Ubuntu/Debian**:

```bash
# Download the latest version
curl -L --output cloudflared.deb \
  https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb

# Install
sudo dpkg -i cloudflared.deb

# Verify installation
cloudflared --version
```

On **macOS**:

```text
brew install cloudflared
```

### Step 2: Authenticate with Cloudflare

```text
cloudflared tunnel login
```

This command will:

- Open your browser automatically

- Prompt you to log in to Cloudflare (if not already logged in)

- Ask you to select which domain to authorize (e.g., yourdomain.com)

- Create a certificate file at ~/.cloudflared/cert.pem

### Step 3: Create the Tunnel

```text
# Create a tunnel with a descriptive name
cloudflared tunnel create macmini
```

**Expected output:**

```text
Tunnel credentials written to /home/user/.cloudflared/a1b2c3d4-5e6f-7g8h-9i0j-k1l2m3n4o5p6.json
Created tunnel macmini with id a1b2c3d4-5e6f-7g8h-9i0j-k1l2m3n4o5p6
```

**⚠️ Important:** Save that `TUNNEL_ID` – you’ll need it for the next steps!

### Step 4: Get Your Service’s IP Address

For **Docker containers**, you need to find the container’s internal IP:

```bash
# List running containers
docker ps

# Inspect the container's networks
docker inspect  | jq '.[0].NetworkSettings.Networks'
```

**Example output:**

```json
{
  "coolify": {
    "IPAddress": "10.0.1.7",
    "Gateway": "10.0.1.1"
  },
  "jwkgo0sgscc4ow8ggs8wskoc": {
    "IPAddress": "10.0.2.2",
    "Gateway": "10.0.2.1"
  }
}
```

**Pro tip:** Select the IP from the network that’s NOT named “coolify” (in this case `10.0.2.2`).

For **native services** (not in Docker), you can use `localhost` or `127.0.0.1`.

### Step 5: Create the Configuration File

Create `/etc/cloudflared/config.yml`:

```bash
sudo mkdir -p /etc/cloudflared
sudo nano /etc/cloudflared/config.yml
```

**Basic configuration (single service):**

```bash
tunnel: a1b2c3d4-5e6f-7g8h-9i0j-k1l2m3n4o5p6
credentials-file: /etc/cloudflared/a1b2c3d4-5e6f-7g8h-9i0j-k1l2m3n4o5p6.json

ingress:
  # Your service
  - hostname: myservice.yourdomain.com
    service: http://10.0.2.2:8080

  # Catch-all (required, always at the end)
  - service: http_status:404
```

**Advanced configuration (multiple services):**

```bash
tunnel: a1b2c3d4-5e6f-7g8h-9i0j-k1l2m3n4o5p6
credentials-file: /etc/cloudflared/a1b2c3d4-5e6f-7g8h-9i0j-k1l2m3n4o5p6.json

ingress:
  # MinIO Console (UI)
  - hostname: minio.yourdomain.com
    service: http://10.0.2.2:9001

  # MinIO API (S3)
  - hostname: minioapi.yourdomain.com
    service: http://10.0.2.2:9000

  # OpenWebUI
  - hostname: openwebui.yourdomain.com
    service: http://10.0.3.3:8080

  # Catch-all rule (always at the end)
  - service: http_status:404
```

**Copy credentials to the system directory:**

```bash
sudo cp ~/.cloudflared/.json /etc/cloudflared/
sudo chmod 600 /etc/cloudflared/.json
sudo chown root:root /etc/cloudflared/.json
```

### Step 6: Configure DNS Records

You have two options:

**Option A: Automatic (Recommended)**

```text
# For each hostname, run:
cloudflared tunnel route dns macmini minio.yourdomain.com
cloudflared tunnel route dns macmini minioapi.yourdomain.com
```

This automatically creates CNAME records in Cloudflare.

**Option B: Manual (via Cloudflare Dashboard)**

- Go to: https://dash.cloudflare.com

- Select your domain

- Navigate to DNS → Records

- Click Add record

- Configure:

Type: CNAME

- Name: minio (without the full domain)

- Content: .cfargotunnel.com

- Proxy status: ✅ Proxied (orange cloud, not gray)

- Click Save

Repeat for each subdomain.

### Step 7: Install as a System Service

To make the tunnel start automatically on boot:

```bash
# Install the service
sudo cloudflared service install

# Start the service
sudo systemctl start cloudflared

# Enable auto-start on boot
sudo systemctl enable cloudflared

# Check status
sudo systemctl status cloudflared
```

**Expected output:**

```text
● cloudflared.service - cloudflared
     Loaded: loaded (/etc/systemd/system/cloudflared.service; enabled)
     Active: active (running) since Sun 2025-12-15 10:00:00 CST
   Main PID: 1234
      Tasks: 8
     Memory: 45.2M

Dec 15 10:00:01 macmini cloudflared[1234]: INF Registered tunnel connection
Dec 15 10:00:01 macmini cloudflared[1234]: INF Registered tunnel connection
Dec 15 10:00:01 macmini cloudflared[1234]: INF Registered tunnel connection
Dec 15 10:00:01 macmini cloudflared[1234]: INF Registered tunnel connection
```

**You should see 4 registered connections** – this provides high availability!

### Step 8: Verify Everything Works

**Check the logs:**

```text
# View logs in real-time
sudo journalctl -u cloudflared -f

# View last 50 lines
sudo journalctl -u cloudflared -n 50
```

**Test connectivity:**

```bash
# Test with curl
curl -I https://minio.yourdomain.com

# Should return:
# HTTP/2 200
# server: cloudflare
```

**Open in browser:**

- Navigate to https://minio.yourdomain.com

- Verify it loads correctly

- Check for a valid SSL certificate (green padlock)

## Real-World Experience: Lessons Learned

### Gotcha #1: Docker IP Addresses Can Change

Docker assigns dynamic IPs when containers restart. I learned this the hard way when my MinIO container got a new IP after a reboot.

**Solution:** Use the container name instead of IP (if on the same Docker network):

```bash
# Instead of:
service: http://10.0.2.2:9000

# Use:
service: http://minio-container:9000
```

### Gotcha #2: HTTP vs HTTPS in config.yml

Always use `http://` in your `config.yml`, even though your public URL uses HTTPS.

**Why?** Cloudflare handles SSL/TLS at the edge. Your internal service should respond with plain HTTP. Cloudflare Tunnel securely encrypts the connection from your server to Cloudflare’s edge.

### Gotcha #3: Don’t Configure URLs in Coolify

When using Coolify (or similar platforms), **don’t** add domain configurations in the app itself. Let Cloudflare Tunnel handle all routing.

If you configure URLs in both places, you’ll get redirect loops!

### Gotcha #4: The Catch-All Rule is Mandatory

You must always include a catch-all rule at the end of your ingress list:

```yaml
- service: http_status:404
```

Without this, `cloudflared` won’t start.

## Adding New Services Later

One of the best parts about this setup is how easy it is to add new services:

- Get the service IP:docker inspect | jq '.[0].NetworkSettings.Networks'

- Edit the config:sudo nano /etc/cloudflared/config.yml Add before the catch-all: - hostname: newservice.yourdomain.com service: http://10.0.X.X:PORT

- Configure DNS:cloudflared tunnel route dns macmini newservice.yourdomain.com

- Restart tunnel:sudo systemctl restart cloudflared

- Verify:curl -I https://newservice.yourdomain.com

Done! Your new service is now publicly accessible with HTTPS.

## Troubleshooting Common Issues

### HTTP 502 Bad Gateway

**Cause:** Tunnel is connected but can’t reach your local service.

**Solution:**

```bash
# Verify service is running
docker ps | grep

# Check if IP changed
docker inspect  | jq '.[0].NetworkSettings.Networks'

# Update config.yml with correct IP
sudo nano /etc/cloudflared/config.yml

# Restart tunnel
sudo systemctl restart cloudflared
```

### DNS Not Resolving

**Cause:** CNAME records not created or propagation pending.

**Solution:**

```text
# Create DNS record
cloudflared tunnel route dns macmini myservice.yourdomain.com

# Wait 1-2 minutes for propagation

# Verify with Cloudflare DNS
nslookup myservice.yourdomain.com 1.1.1.1
```

### ERR_TOO_MANY_REDIRECTS

**Cause:** Your service is configured with HTTPS but Cloudflare Tunnel connects via HTTP.

**Solution:** In `config.yml`, use `http://` not `https://`. Cloudflare handles SSL/TLS at the edge.

## Monitoring Your Tunnel

### Cloudflare Dashboard

- Go to: https://dash.cloudflare.com

- Zero Trust → Access → Tunnels

- Click your tunnel to see:

Status (Active/Inactive)

- Traffic stats (requests, bandwidth)

- Active connections (should be 4)

- Errors and latency

### Local Monitoring

```bash
# View service status
systemctl status cloudflared

# Real-time logs
sudo journalctl -u cloudflared -f

# Check resource usage
ps aux | grep cloudflared
```

## Security Considerations

### Protect Your Credentials

```bash
# Proper permissions
sudo chmod 600 /etc/cloudflared/.json
sudo chown root:root /etc/cloudflared/.json

# NEVER commit these files to version control
# NEVER share them publicly
```

### No Firewall Changes Needed

One of the best security features is that you don’t need to open any inbound ports:

```text
# Cloudflared only needs outbound connections to Cloudflare
# No ports 80/443 need to be opened on your firewall
```

### Optional: Add Access Control

For additional security, use Cloudflare Access to require authentication:

- Go to Zero Trust → Access → Applications

- Create an access policy

- Require login (email, Google, GitHub, etc.)

- Apply to specific subdomains

Example: Protect admin interfaces but allow public API access.

## Cost Analysis: Why This is Amazing

Let’s break down the cost comparison:

| Solution          | Monthly Cost | SSL     | DDoS Protection | Setup Complexity |
| ----------------- | ------------ | ------- | --------------- | ---------------- |
| Cloudflare Tunnel | \$0          | ✅ Auto | ✅ Yes          | Low              |
| VPS Reverse Proxy | \$5-10       | Manual  | Limited         | High             |
| ngrok             | \$8-25       | ✅ Auto | ❌ No           | Low              |
| Port Forwarding   | \$0          | Manual  | ❌ No           | Medium           |

Cloudflare Tunnel gives you enterprise-grade features completely free. This is why it’s a game changer.

## The Results: A Seamless Integration

After setting up Cloudflare Tunnel, my architecture now looks like this:

```text
┌──────────────────────────────────────────────────────┐
│                  Cloudflare Edge                      │
│  (SSL/TLS, DDoS Protection, CDN, DNS)                 │
└────────────┬─────────────────────────┬────────────────┘
             │                         │
   ┌─────────▼──────────┐   ┌─────────▼──────────┐
   │  Cloudflare Tunnel  │   │  Cloudflare Tunnel  │
   │   (Mac Mini Home)   │   │  (Oracle ARM Cloud) │
   └─────────┬──────────┘   └─────────┬──────────┘
             │                         │
   ┌─────────▼──────────┐   ┌─────────▼──────────┐
   │     Mac Mini        │   │   Oracle Server    │
   ├─────────────────────┤   ├────────────────────┤
   │ MinIO (S3)          │   │ LangFlow           │
   │ OpenSearch          │   │ OpenWebUI          │
   │ Qdrant              │   │ Docling            │
   └─────────────────────┘   └────────────────────┘
                   │                   │
                   └───── S3 API ──────┘
```

**Key wins:**

- ✅ My Oracle server can use MinIO S3 API at minioapi.example.com

- ✅ All services have HTTPS with valid certificates

- ✅ No port forwarding needed on my home router

- ✅ ISP port blocking is completely bypassed

- ✅ Services are protected by Cloudflare’s DDoS mitigation

- ✅ Everything just works™

## Quick Reference Commands

Here are the commands I use regularly:

```bash
# View tunnel status
sudo systemctl status cloudflared

# View real-time logs
sudo journalctl -u cloudflared -f

# Restart tunnel
sudo systemctl restart cloudflared

# List all tunnels
cloudflared tunnel list

# Test service connectivity
curl -I https://myservice.yourdomain.com

# Check Docker container IP
docker inspect  | jq '.[0].NetworkSettings.Networks'

# Add new DNS route
cloudflared tunnel route dns  newservice.yourdomain.com
```

## Final Thoughts

Cloudflare Tunnel has completely transformed how I approach self-hosting. What used to be a complex dance of VPS proxies, VPNs, and firewall rules is now:

- Install cloudflared

- Create a tunnel

- Configure a simple YAML file

- Add DNS records

That’s it.

The fact that this is **completely free** and includes SSL/TLS, DDoS protection, and high availability is almost too good to be true. But it is true, and it works beautifully.

If you’re self-hosting services and dealing with ISP restrictions, port blocks, or dynamic IPs, Cloudflare Tunnel is the solution you’ve been looking for. It certainly was for me.

Now my Mac Mini at home and my Oracle ARM server in the cloud work together seamlessly, as if they were in the same data center. And that’s exactly what I needed.

## Resources

- Cloudflare Tunnel Documentation: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/

- Cloudflared GitHub: https://github.com/cloudflare/cloudflared

- Cloudflare Dashboard: https://dash.cloudflare.com

- My Setup: Mac Mini (Coolify) + Oracle ARM Server + MinIO S3 storage
