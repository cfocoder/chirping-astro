---
title: "Mastering Internal Networking in Coolify: Connecting n8n, Flowise, and OpenSearch Like a Pro"
description: "If you run a self-hosted stack on Coolify (v4), you likely have powerful AI tools like n8n, Flowise, LangFlow, and OpenSearch running side-by-side. But there is a catch: out of the box, Coolify assigns them long, random container names like n8n-cs0gs0kogswgsgwk...."
pubDate: 2025-11-22
categories: ["AI"]
tags: []
toc: true
---

If you run a self-hosted stack on Coolify (v4), you likely have powerful AI tools like **n8n**, **Flowise**, **LangFlow**, and **OpenSearch** running side-by-side. But there is a catch: out of the box, Coolify assigns them long, random container names like `n8n-cs0gs0kogswgsgwk...`.

If you try to connect n8n to Flowise using that name, your connection breaks the moment you redeploy.

In this post, I will document how to set up **stable internal hostnames**, how to handle **HTTPS-only services** (like OpenSearch), and how to **verify your connections** using `wget` or `curl`.

## Part 1: Setting Stable Hostnames

We want to move from fragile, random names to clean, permanent internal URLs. There are two ways to do this in Coolify.

### Method A: For “Docker Image” Deployments

*Use this for apps installed via the Coolify UI (e.g., Docling).*

- Go to the app Configuration.

- Scroll to the Network section.

- In the Network Aliases field, type your simple name (e.g., docling).

- Click Save and Redeploy.

*Result: Reachable at `http://docling:5001`.*

### Method B: For “Docker Compose” Deployments

*Use this for Stacks or apps where you have the “Edit Compose File” button (e.g., n8n, LangFlow).*

- Click Edit Compose File.

- Find the service definition (under services:).

- Add the hostname property:

```yaml
services:
  n8n:
    image: docker.n8n.io/n8nio/n8n:latest
    hostname: n8n  # *Result: Reachable at `http://n8n:5678`.*

## Part 2: Verifying Connections

Don’t guess—test! Go to the **Terminal** of the app you are connecting *from*.

Docker containers are often minimal. Some have `wget`, some have `curl`. Here is how to use both.

### Option A: Using wget (Most Common)

If `curl` is missing, use `wget`.

- -q: Quiet mode.

- -O-: Print output to screen (Standard Output).

```bash
wget -qO- http://flowise:3000
```

### Option B: Using curl (Cleanest Output)

If installed, `curl` is excellent for debugging headers.

- -v: Verbose (shows the handshake).

- -I: Head only (shows status without downloading the page).

```bash
# Full check (shows handshake + content)
curl -v http://flowise:3000

# Status check only (cleaner)
curl -I http://flowise:3000
```

## Part 3: The “HTTPS” Curveball (OpenSearch)

Most internal traffic is HTTP. However, services like **OpenSearch** force **HTTPS** even internally. If you use HTTP, the connection will be reset.

### How to test securely (ignoring certificates)

Since OpenSearch uses a self-signed certificate, you must tell your tool to ignore verification.

**With `wget`:**

```bash
wget --no-check-certificate -qO- https://opensearch:9200
```

**With `curl`:**

```bash
curl -k -v https://opensearch:9200
```

*(The `-k` flag stands for “insecure” / skip certificate check).*

## Part 4: Troubleshooting Guide

Interpret your terminal results to find the root cause:

| Output | Meaning | Verdict |
|---|---|---|
| HTML / JSON | Server replied with data. | ✅ Success |
| 404 Not Found | Server is reachable, but path / is empty. | ✅ Success (Network works!) |
| 401 Unauthorized | Server is reachable, needs password. | ✅ Success (Network works!) |
| Bad Address | Hostname doesn’t exist. | ❌ DNS/Network Error |
| Connection Refused | Hostname exists, port is wrong/closed. | ❌ Port Error |
| Empty Reply / Reset | You used HTTP on an HTTPS service. | ❌ Protocol Error |

## Summary Cheat Sheet

| Application | Internal Port | Protocol | Connection URL |
|---|---|---|---|
| Flowise | 3000 | HTTP | http://flowise:3000 |
| n8n | 5678 | HTTP | http://n8n:5678 |
| Docling | 5001 | HTTP | http://docling:5001 |
| LangFlow | 7860 | HTTP | http://langflow:7860 |
| OpenSearch | 9200 | HTTPS | https://opensearch:9200 |

**Pro Tip:** When configuring nodes in n8n or LangFlow to talk to OpenSearch, always look for the **“Ignore SSL”** or **“Allow Insecure”** toggle and turn it ON.
