---
title: 'Why I Switched from Obsidian to SilverBullet: A Self-Hosted Note-Taking Journey'
description: 'I moved from Obsidian to SilverBullet, an open-source web-based note-taking platform. Here is why I made the switch, what I learned, and a complete installation guide based on my real experience getting it running on an ARM server with Cloudflare Access.'
pubDate: 2026-06-11
heroImage: '/images/2026/06/silverbullet-vs-obsidian.jpg'
heroImageAlt: 'A modern illustration comparing Obsidian and SilverBullet note-taking interfaces'
categories: ['Productivity', 'Self-Hosting']
tags:
  [
    'SilverBullet',
    'Obsidian',
    'Note-Taking',
    'Self-Hosting',
    'Cloudflare',
    'Docker',
    'Markdown',
    'Open Source',
  ]
toc: true
---

I have been an Obsidian user for a long time. It is powerful, extensible, and has a fantastic graph view. But as my workflow evolved, I started running into limitations that I could not easily fix. This post explains why I switched to **SilverBullet**, what I gained, and how I got it running on my own server.

## Why I started looking beyond Obsidian

Obsidian is great for local note-taking. The graph view, the plugin ecosystem, and the markdown-first approach are genuinely excellent. But I wanted something slightly different:

- **Web-based access**: I wanted to take notes from any browser without installing an app. Obsidian Publish exists, but it is a paid add-on, and I prefer owning the infrastructure.
- **Self-hosted**: I already run a home lab on an ARM Oracle server. I wanted my notes to live there, not in a proprietary sync service.
- **Simpler authentication**: I liked the idea of protecting my instance with a single sign-on layer rather than managing vaults and local files.
- **Hackable**: SilverBullet is open-source. It uses Markdown, Lua scripting, and has a PWA mode that works offline. That felt like a good match for my technical style.

## What is SilverBullet?

SilverBullet is an **open-source, self-hosted, web-based personal knowledge management platform**. It is built on Markdown, runs in a browser, and stores everything as plain files on disk. You can think of it as a web-based Obsidian alternative with a few different trade-offs:

- **Markdown-native**: Everything is Markdown. No proprietary formats.
- **Live Preview**: Like Obsidian, it renders Markdown while you type, but shows the raw syntax when you place your cursor inside it.
- **Outlining**: It has powerful outline support with fold, promote, and demote commands.
- **Wiki-links**: `[[Page Name]]` syntax works just like Obsidian, with bidirectional linking and backlink tracking.
- **Tags and Queries**: You can tag pages and items, then query them dynamically.
- **PWA**: It works offline once installed, thanks to a Service Worker.
- **Extensible**: You can write custom functionality in Lua and add plugins.

## The trade-offs

Before you switch, know what you are giving up:

- **No graph view**: SilverBullet does not have a visual graph of your notes like Obsidian does.
- **Smaller plugin ecosystem**: It is newer, so the library of plugins is smaller.
- **No native mobile app**: You access it through a browser or install the PWA.
- **Self-hosted complexity**: You need to run it somewhere. This is a feature for me, but it is a hurdle for others.

For me, the trade-offs were worth it. I wanted a web-first, server-based note-taking system that I could access from anywhere, and SilverBullet delivered exactly that.

## Installation Guide

This guide is based on my real experience getting SilverBullet running on an **ARM Oracle server** with **Docker**, **Coolify**, **Traefik**, and **Cloudflare Access**. I went through several iterations today to get the authentication and image attachments working correctly across all browsers.

### What you will need

- A server (I use an ARM Oracle instance)
- Docker and Docker Compose
- Coolify (or another Traefik-based reverse proxy)
- A domain name (I use `sanchezmx.com`)
- Cloudflare DNS and Cloudflare Access (Zero Trust)

### Step 1: Create the Docker Compose file

```yaml
services:
  silverbullet:
    image: ghcr.io/silverbulletmd/silverbullet:latest
    container_name: silverbullet
    restart: unless-stopped
    environment:
      - SB_HOSTNAME=0.0.0.0
      - SB_PORT=3000
      - SB_REMEMBER_ME_HOURS=720
    volumes:
      - /mnt/myvolume/ducklake/silverbullet-data:/space
    ports:
      - '3001:3000'
    networks:
      - coolify
    labels:
      - 'coolify.managed=true'
      - 'traefik.enable=true'
      - 'traefik.http.routers.silverbullet.rule=Host(`notes.yourdomain.com`)'
      - 'traefik.http.routers.silverbullet.entrypoints=https'
      - 'traefik.http.routers.silverbullet.tls.certresolver=letsencrypt'
      - 'traefik.http.services.silverbullet.loadbalancer.server.port=3000'
    privileged: true

networks:
  coolify:
    external: true
```

**Important notes:**

- **Do NOT set `SB_USER`**. I tried this initially and it broke image attachments in Chrome, Brave, and Opera. Firefox handled it fine, but the other browsers failed to render pasted images. SilverBullet handles basic auth internally, but it interferes with file serving.
- **Use an external network** (`coolify` in my case) so Traefik can route to it.
- **Map a persistent volume** for your notes. I use an external disk mounted at `/mnt/myvolume/ducklake/silverbullet-data`.

### Step 2: Configure Cloudflare DNS

1. Create an **A record** or **CNAME** pointing `notes.yourdomain.com` to your server.
2. Enable the **orange cloud** (proxy) so Cloudflare handles SSL and caching.
3. Set SSL/TLS mode to **Full (strict)**.

### Step 3: Configure Cloudflare Access (Zero Trust)

You need **two applications** in Cloudflare Access:

#### Application 1: Bypass for PWA and attachments

- **Type**: Self-hosted
- **Name**: `SilverBullet Bypass`
- **Public hostnames**:
  - `notes.yourdomain.com` → Path: `service_worker.js`
  - `notes.yourdomain.com` → Path: `.client/*`
  - `notes.yourdomain.com` → Path: `.fs/*`
- **Policy**: `SB Bypass`
  - Action: **Bypass**
  - Include: **Everyone**

This is critical. Without bypassing `.fs/*`, pasted images will not render in Chromium-based browsers (Chrome, Brave, Opera). Firefox is more forgiving, but the others require this.

#### Application 2: Authentication

- **Type**: Self-hosted
- **Name**: `SilverBullet`
- **Public hostname**: `notes.yourdomain.com`
- **Path**: _(leave empty)_
- **Policy**: `SB Access`
  - Action: **Allow**
  - Include: **Email** → `your-email@yourdomain.com`

### Step 4: Configure Cache Rules

In Cloudflare, create a **Cache Rule**:

- **When**: URL matches `https://notes.yourdomain.com/*`
- **Action**: **Bypass cache**

This prevents Cloudflare from caching authentication responses and breaking the login flow.

### Step 5: Deploy and verify

1. Deploy the container with Coolify or `docker compose up -d`.
2. Visit `https://notes.yourdomain.com`.
3. You should see the Cloudflare Access login page.
4. After authentication, SilverBullet loads without any `SB_USER` prompt.
5. Test copy-pasting an image into a note. It should render correctly in all browsers.

### Troubleshooting

If you see the error **"Could not process configuration from server"**, it usually means:

- The `service_worker.js` or `.client/*` paths are not bypassed in Cloudflare Access.
- Cloudflare is caching the response. Clear the cache or bypass it.

If images pasted into notes do not render in Chrome/Brave/Opera:

- Check that `.fs/*` is in the Cloudflare Access Bypass application.
- Do not use `SB_USER` in the Docker Compose. It breaks file serving in Chromium-based browsers.

## What I ended up with

My final setup:

- **Domain**: `notes.sanchezmx.com`
- **Server**: ARM Oracle instance
- **Storage**: External disk mounted via Docker bind mount
- **Auth**: Cloudflare Access with One-time PIN
- **No SB_USER**: Cloudflare handles all authentication
- **Working images**: Pasting screenshots works in all browsers

It is a clean, secure setup that I can access from anywhere, on any device, without installing anything.

## Final thoughts

I am not saying SilverBullet is better than Obsidian for everyone. If you love the graph view, the massive plugin ecosystem, or working fully offline with local files, Obsidian is still the better choice. But if you want a **self-hosted, web-first, markdown-native note-taking system** that you can access from any browser and protect with modern authentication, SilverBullet is a compelling alternative.

I plan to use it for my **master's classes**, technical documentation, and quick notes. The fact that it runs on my own server, under my own domain, with my own authentication, makes it feel like a natural extension of my home lab.

## Resources

- [SilverBullet Official Website](https://silverbullet.md)
- [SilverBullet GitHub](https://github.com/silverbulletmd/silverbullet)
- [SilverBullet Community Forum](https://community.silverbullet.md)
- [Cloudflare Access Documentation](https://developers.cloudflare.com/cloudflare-one/applications/)
