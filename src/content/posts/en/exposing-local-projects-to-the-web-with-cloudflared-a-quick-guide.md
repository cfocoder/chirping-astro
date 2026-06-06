---
title: 'Exposing Local Projects to the Web with Cloudflared: A Quick Guide'
description: 'Ever needed to quickly share a local project with someone without deploying it? Cloudflared makes it incredibly easy to expose your local development server to the web temporarily. Whether you’re showing off a new feature, getting feedback on a design, or testing an API,...'
pubDate: 2025-09-12
heroImage: '/images/2025/09/cloudflared_logo.png'
heroImageAlt: 'cloudflared logo'
categories: ['Linux']
tags: []
toc: true
---

## 🚀 Introduction

Ever needed to quickly share a local project with someone without deploying it? Cloudflared makes it incredibly easy to expose your local development server to the web temporarily. Whether you’re showing off a new feature, getting feedback on a design, or testing an API, Cloudflared tunnels provide a secure, instant solution.

## ⚡ Quick Setup

### Installation

```bash
# Ubuntu/Debian
curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64.deb
sudo dpkg -i cloudflared.deb

# Verify installation
cloudflared --version
```

## 📋 Basic Commands Reference

| Command                    | Description                              | Quick Example                                  |
| -------------------------- | ---------------------------------------- | ---------------------------------------------- |
| cloudflared tunnel --url   | Create temporary tunnel to local service | cloudflared tunnel --url http://localhost:8000 |
| cloudflared tunnel login   | Authenticate with Cloudflare account     | cloudflared tunnel login                       |
| cloudflared tunnel create  | Create a named permanent tunnel          | cloudflared tunnel create my-project           |
| cloudflared tunnel list    | List all your tunnels                    | cloudflared tunnel list                        |
| cloudflared tunnel run     | Run a named tunnel                       | cloudflared tunnel run my-project              |
| cloudflared tunnel cleanup | Clean up tunnel connections              | cloudflared tunnel cleanup my-project          |
| cloudflared --version      | Check current version                    | cloudflared --version                          |
| cloudflared update         | Update to latest version                 | cloudflared update                             |

## 🎯 Quick Start Examples

### Example 1: Share a Simple HTML Page

- Create a test HTML file:

```xml

My Project

    Hello from my local server!
    This is being served from my development machine.

```

- Start a local server:

```bash
# Navigate to your project directory
cd ~/my-project

# Start Python's built-in server
python3 -m http.server 8000
```

- Create the tunnel:

```text
# In another terminal
cloudflared tunnel --url http://localhost:8000
```

- Share the URL: You’ll see output like:

```text
Your quick Tunnel has been created! Visit it at:
https://abc123def.trycloudflare.com
```

### Example 2: Share a React Development Server

```bash
# Start your React dev server
npm start
# Server runs on http://localhost:3000

# Create tunnel (new terminal)
cloudflared tunnel --url http://localhost:3000
```

### Example 3: Share a Flask API

```bash
# Start Flask app
python app.py
# API runs on http://localhost:5000

# Create tunnel
cloudflared tunnel --url http://localhost:5000
```

## 🔧 Advanced Usage

### Named Tunnels for Persistent Access

```text
# 1. Login to Cloudflare
cloudflared tunnel login

# 2. Create named tunnel
cloudflared tunnel create my-dev-project

# 3. Run the tunnel
cloudflared tunnel run my-dev-project
```

### Configuration File (config.yml)

```bash
tunnel: my-dev-project
credentials-file: ~/.cloudflared/my-dev-project.json

ingress:
  - hostname: my-project.example.com
    service: http://localhost:8000
  - service: http_status:404
```

## 💡 Use Cases

### 🎨 Design Reviews

Share your latest UI changes with designers and stakeholders instantly.

### 🔧 API Testing

Let backend developers test your API endpoints without complex deployments.

### 📊 Data Science Projects

Share Jupyter notebooks or data visualizations with colleagues.

### 🎯 Client Presentations

Demonstrate work-in-progress features to clients securely.

### 🧪 QA Testing

Allow QA teams to test features before they’re production-ready.

## ⚠️ Important Notes

### Security Considerations

- Temporary tunnels are perfect for short-term sharing

- Named tunnels require Cloudflare account authentication

- URLs are publicly accessible – don’t expose sensitive data

- Always stop tunnels when you’re done sharing

### Duration

- Quick tunnels: Active until you stop the process

- Named tunnels: Can run indefinitely until manually stopped

- No uptime guarantees for free temporary tunnels

## 🛠️ Troubleshooting

### Common Issues

**“Connection refused” error:**

```bash
# Check if your local server is running
curl http://localhost:8000

# Verify the port is correct
netstat -tulpn | grep :8000
```

**Tunnel not accessible:**

```text
# Check tunnel status
cloudflared tunnel list

# Restart tunnel
cloudflared tunnel cleanup my-tunnel
cloudflared tunnel run my-tunnel
```

**Port already in use:**

```bash
# Find what's using the port
lsof -i :8000

# Kill the process
kill -9
```

## 🧹 Cleanup Commands

| Action                         | Command                    |
| ------------------------------ | -------------------------- |
| Stop current tunnel            | Ctrl + C                   |
| Kill all cloudflared processes | pkill cloudflared          |
| Stop specific tunnel           | cloudflared tunnel cleanup |
| Check active processes         | ps aux \| grep cloudflared |

## 🎓 Pro Tips

- Test locally first – Always verify http://localhost:PORT works before creating a tunnel

- Use descriptive tunnel names – Makes management easier

- Keep track of active tunnels – Use cloudflared tunnel list regularly

- Set up aliases for common commands:# Add to ~/.bashrc or ~/.zshrc alias tunnel='cloudflared tunnel --url' alias tunnels='cloudflared tunnel list'

- Combine with tmux/screen for persistent sessions

## 🔗 Resources

- Official Cloudflared Documentation

- Cloudflare Tunnel GitHub

- Cloudflare One Documentation

_This guide is perfect for developers who need to quickly share local projects without the complexity of full deployments. Cloudflared makes secure, temporary exposure of local services incredibly simple and accessible._

_Have you used Cloudflared for your projects? Share your experiences in the comments!_

#cloudflared #webdevelopment #devops #cloudflare #localdevelopment
