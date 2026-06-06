---
title: 'Installing AnythingLLM on Oracle ARM Ubuntu Server'
description: 'A comprehensive guide for self-hosting AnythingLLM with Docker, Caddy, and Ollama'
pubDate: 2025-08-18
heroImage: '/images/2025/08/anythingllm_logo.jpg'
heroImageAlt: 'anythingllm logo'
categories: ['AI']
tags: []
toc: true
---

_A comprehensive guide for self-hosting AnythingLLM with Docker, Caddy, and Ollama_

## 🤖 What is AnythingLLM?

**AnythingLLM** is a powerful, self-hosted AI knowledge management and chat platform that transforms how you interact with your data and AI models. It’s designed to be your personal AI workspace where you can combine multiple AI capabilities into a unified, privacy-focused environment.

### 🌟 Why AnythingLLM is Exceptional

#### Multi-LLM Support 🔄

- Local Models: Integrate with Ollama, LMStudio, or any OpenAI-compatible local inference servers

- Cloud Providers: Connect to OpenAI, Anthropic, Google Gemini, Mistral, and many more

- Model Switching: Seamlessly switch between different models for different tasks within the same workspace

- Cost Optimization: Use local models for routine tasks and premium cloud models for complex reasoning

#### Advanced RAG (Retrieval-Augmented Generation) 📚

- Document Processing: Upload PDFs, Word docs, text files, web pages, and more

- Smart Chunking: Automatically segments documents for optimal embedding generation

- Vector Database Integration: Supports LanceDB, Pinecone, ChromaDB, and others for fast similarity search

- Contextual Conversations: Chat with your documents using natural language queries

- Source Attribution: Always know which documents informed the AI’s responses

#### MCP (Model Context Protocol) Server Support 🔌

- Extensible Architecture: Add custom tools and data sources through MCP servers

- Real-time Data: Connect to live APIs, databases, and external services

- Tool Integration: Extend AI capabilities with weather data, web search, code execution, and more

- Custom Workflows: Build sophisticated AI agents that can interact with multiple systems

#### Privacy-First Design 🔒

- Self-Hosted: Complete control over your data – nothing leaves your server

- Local Processing: Process sensitive documents without cloud dependencies

- Audit Trail: Full visibility into what data is being used and how

- Enterprise Ready: Secure multi-user support with role-based access control

#### Flexible Deployment Options ⚙️

- Single User Mode: Perfect for personal use and experimentation

- Multi-User Workspaces: Team collaboration with isolated document collections

- API Access: Programmatic integration with existing workflows

- Docker Native: Easy deployment and scaling with container orchestration

### 🎯 Perfect For

- Knowledge Workers: Researchers, analysts, and consultants who need to quickly extract insights from large document collections

- Developers: Technical teams building AI-powered applications with custom data sources

- Privacy-Conscious Users: Organizations that require on-premises AI without data sharing

- AI Enthusiasts: Hobbyists who want to experiment with multiple models and advanced RAG techniques

- Small Businesses: Teams that need enterprise-grade AI capabilities without the enterprise price tag

### 🚀 Real-World Use Cases

- Research Assistant: Upload research papers and academic documents, then ask complex questions that span multiple sources

- Documentation Helper: Index your company’s internal docs, wikis, and procedures for instant Q&A

- Code Analysis: Upload codebases and architectural documents for AI-assisted code review and understanding

- Legal Document Review: Process contracts, policies, and legal documents with privacy-preserving local models

- Personal Knowledge Base: Create your own AI-powered second brain with books, articles, and notes

## 📋 Prerequisites

### System Requirements

- Oracle ARM Ubuntu Server (or any ARM64/AMD64 Linux server)

- Minimum: 2GB RAM, 2-core CPU, 10GB storage

- Recommended: 4GB+ RAM for better performance with local LLMs

- External Storage: Mounted volume for persistent data (e.g., /mnt/myvolume)

### Required Software

- Docker (latest version)

- Caddy Server (for reverse proxy and SSL)

- Domain/Subdomain configured with DNS (e.g., anythingllm.yourdomain.com)

- Cloudflare (optional but recommended for DNS and SSL management)

### Pre-existing Services

- Ollama (for local LLM inference)

- Proper firewall configuration (ports 80, 443 open)

## 🚀 Installation Steps

### Step 1: Prepare the Environment

#### 1.1 Create Directory Structure

```bash
# Create AnythingLLM directory on external volume
sudo mkdir -p /var/www/html/anythingllm/storage

# Set ownership to your current user for easy file editing (config files)
sudo chown -R $USER:$USER /var/www/html/anythingllm/

# IMPORTANT: Set storage directory ownership for container access
# AnythingLLM container runs as UID 1000, so storage must be owned by 1000:1000
sudo chown -R 1000:1000 /var/www/html/anythingllm/storage

# Ensure proper permissions for container access
sudo chmod -R 755 /var/www/html/anythingllm/storage
```

**⚠️ Permission Strategy Note:**

- Configuration files (docker-compose.yml, .env, etc.): Owned by your user for editing

- Storage directory: Must be owned by container user (1000:1000) for runtime access

#### 1.2 Check Existing Docker Networks

```bash
# List Docker networks to find Ollama network
docker network ls

# Inspect Ollama container to find its network
docker inspect ollama | grep -A 10 "NetworkMode|Networks"
```

### Step 2: Configure Caddy Reverse Proxy

#### 2.1 Add AnythingLLM Configuration to Caddyfile

```text
sudo nano /etc/caddy/Caddyfile
```

Add this configuration block:

```text
anythingllm.yourdomain.com {
    log

    # Security headers
    header {
        X-Content-Type-Options "nosniff"
        X-Frame-Options "SAMEORIGIN"
        Referrer-Policy "strict-origin-when-cross-origin"
        Strict-Transport-Security "max-age=31536000;"
        -Server
    }

    # Handle agent invocations with WebSocket support
    handle /api/agent-invocation/* {
        reverse_proxy 127.0.0.1:3003 {
            header_up Host {host}
            header_up X-Real-IP {remote_host}

            # WebSocket support
            header_up Connection {>Connection}
            header_up Upgrade {>Upgrade}

            # Extended timeout for agent tasks
            transport http {
                dial_timeout 30s
                response_header_timeout 10m
            }
        }
    }

    # Handle file uploads with larger body size
    handle /api/v1/document/* {
        request_body {
            max_size 100MB
        }
        reverse_proxy 127.0.0.1:3003 {
            header_up Host {host}
            header_up X-Real-IP {remote_host}

            transport http {
                dial_timeout 30s
                response_header_timeout 5m
            }
        }
    }

    # Handle all other requests
    handle {
        reverse_proxy 127.0.0.1:3003 {
            header_up Host {host}
            header_up X-Real-IP {remote_host}

            # Health check
            health_uri /api/ping
            health_interval 30s
            health_timeout 10s
        }
    }

    # Enable compression
    encode zstd gzip
}
```

### Step 3: Install Required Ollama Models

#### 3.1 Install LLM Model

```bash
# Install Llama 3.1 8B (adjust model based on your server capacity)
docker exec ollama ollama pull llama3.1:8b
```

#### 3.2 Install Embedding Model

```bash
# Install Nomic Embed Text for embeddings
docker exec ollama ollama pull nomic-embed-text:latest
```

#### 3.3 Verify Models

```bash
docker exec ollama ollama list
```

### Step 4: Get Ollama Network Information

#### 4.1 Find Ollama Container IP

```bash
# Get Ollama network details
docker network inspect [OLLAMA_NETWORK_NAME] | grep -A 5 -B 5 "ollama"

# Example output shows IP like 172.18.0.2
```

### Step 5: Deploy AnythingLLM Container

#### 5.1 Using Docker Run (Recommended)

**Note**: While docker-compose is often preferred for multi-container deployments, we use `docker run` here due to potential permission issues with `.env` file mounting in some environments. The `docker run` approach with inline environment variables is more reliable and provides the same functionality.

```bash
# Replace 172.18.0.2 with your actual Ollama container IP
# Replace [OLLAMA_NETWORK_NAME] with your actual network name
docker run -d -p 127.0.0.1:3003:3001 \
--name anythingllm \
--restart unless-stopped \
--cap-add SYS_ADMIN \
--network [OLLAMA_NETWORK_NAME] \
-v /var/www/html/anythingllm/storage:/app/server/storage \
-e STORAGE_DIR="/app/server/storage" \
-e LLM_PROVIDER="ollama" \
-e OLLAMA_BASE_PATH="http://172.18.0.2:11434" \
-e OLLAMA_MODEL_PREF="llama3.1:8b" \
-e OLLAMA_MODEL_TOKEN_LIMIT="131072" \
-e EMBEDDING_ENGINE="ollama" \
-e EMBEDDING_BASE_PATH="http://172.18.0.2:11434" \
-e EMBEDDING_MODEL_PREF="nomic-embed-text:latest" \
-e EMBEDDING_MODEL_MAX_CHUNK_LENGTH="8192" \
-e VECTOR_DB="lancedb" \
-e WHISPER_PROVIDER="local" \
-e TTS_PROVIDER="native" \
-e DISABLE_TELEMETRY="true" \
-e AUTH_TOKEN_LIFE_SPAN="30d" \
-e LOG_LEVEL="info" \
-e BROWSER_TYPE="chromium" \
-e FILE_UPLOAD_SIZE_LIMIT="25MB" \
-e TZ="UTC" \
mintplexlabs/anythingllm:latest
```

#### 5.2 Alternative: Docker Compose (If Preferred)

If you prefer docker-compose and want to avoid potential `.env` file issues, you can create a docker-compose.yml without external env_file:

```yaml
version: '3.8'
services:
  anythingllm:
    image: mintplexlabs/anythingllm:latest
    container_name: anythingllm
    ports:
      - '127.0.0.1:3003:3001'
    restart: unless-stopped
    cap_add:
      - SYS_ADMIN
    networks:
      - aichat_network # Replace with your actual network name
    volumes:
      - /var/www/html/anythingllm/storage:/app/server/storage
    environment:
      - STORAGE_DIR=/app/server/storage
      - LLM_PROVIDER=ollama
      - OLLAMA_BASE_PATH=http://172.18.0.2:11434 # Replace with your Ollama IP
      - OLLAMA_MODEL_PREF=llama3.1:8b
      - OLLAMA_MODEL_TOKEN_LIMIT=131072
      - EMBEDDING_ENGINE=ollama
      - EMBEDDING_BASE_PATH=http://172.18.0.2:11434
      - EMBEDDING_MODEL_PREF=nomic-embed-text:latest
      - EMBEDDING_MODEL_MAX_CHUNK_LENGTH=8192
      - VECTOR_DB=lancedb
      - WHISPER_PROVIDER=local
      - TTS_PROVIDER=native
      - DISABLE_TELEMETRY=true
      - AUTH_TOKEN_LIFE_SPAN=30d
      - LOG_LEVEL=info
      - BROWSER_TYPE=chromium
      - FILE_UPLOAD_SIZE_LIMIT=25MB
      - TZ=UTC

networks:
  aichat_network:
    external: true # Replace with your actual network name
```

**Deploy with docker-compose:**

```bash
docker-compose up -d
```

### Step 6: Verification and Testing

#### 6.1 Check Container Status

```bash
# Check if container is running
docker ps | grep anythingllm

# Check logs
docker logs anythingllm --tail 20
```

#### 6.2 Test API Endpoint

```bash
# Test local API
curl -f http://localhost:3003/api/ping

# Test HTTPS endpoint
curl -I https://anythingllm.yourdomain.com
```

#### 6.3 Test Ollama Connectivity

```bash
# Test from within AnythingLLM container
docker exec anythingllm curl -s http://172.18.0.2:11434/api/version
```

### Step 7: Initial Setup

#### 7.1 Access Web Interface

- Navigate to https://anythingllm.yourdomain.com

- Complete the initial setup wizard

- Choose single-user mode or multi-user mode

- Set up admin account and password

- Configure language settings (English)

#### 7.2 Configure LLM Settings

- Go to Settings → LLM Preference

- Select “Ollama” as provider

- Verify connection to local Ollama instance

- Select your preferred model (llama3.1:8b)

#### 7.3 Configure Embedding Settings

- Go to Settings → Embedding Preference

- Select “Ollama” as provider

- Choose “nomic-embed-text:latest” model

## 🔧 Troubleshooting

### Common Issues and Solutions

#### File Editing Permission Issues

- Issue: Can’t save configuration files (docker-compose.yml, .env, etc.)

- Root Cause: Files owned by different user than your current login

- Solution:

```bash
# Check current user
whoami

# Fix ownership for all AnythingLLM files
sudo chown -R $USER:$USER /var/www/html/anythingllm/

# Verify ownership change
ls -la /var/www/html/anythingllm/
```

#### Port Conflicts

- Issue: Port 3003 already in use

- Solution: Change port mapping in docker run command: -p 127.0.0.1:3004:3001

- Update Caddy: Change reverse_proxy target to 127.0.0.1:3004

#### Permission Issues

```bash
# Fix storage permissions for container access
sudo chmod -R 755 /var/www/html/anythingllm/storage

# If you can't edit configuration files, fix ownership
sudo chown -R $USER:$USER /var/www/html/anythingllm/

# Alternative: Set specific ownership for container compatibility
# sudo chown -R 1000:1000 /var/www/html/anythingllm/storage
```

#### Container Won’t Start

```bash
# Check logs for errors
docker logs anythingllm

# Common fixes:
# 1. Ensure storage directory exists and has correct permissions
# 2. Verify Ollama network connectivity
# 3. Check for port conflicts
```

#### Post-Reboot Container Issues

- Issue: Container stuck in “Restarting” state after server reboot

- Common Error: EACCES: permission denied, open '/app/server/storage/comkey/ipc-priv.pem'

- Root Cause: Storage directory ownership changed or doesn’t match container user

- Solution:

```bash
# Fix storage directory ownership for container
sudo chown -R 1000:1000 /var/www/html/anythingllm/storage
sudo chmod -R 755 /var/www/html/anythingllm/storage

# Restart the container
docker restart anythingllm

# Verify it's running and healthy
docker ps | grep anythingllm
curl -f http://localhost:3003/api/ping
```

#### Docker Compose vs Docker Run Issues

- Issue: Docker compose fails with .env file mounting or permission errors

- Root Cause: Environment file mounting can have permission conflicts in some setups

- Solution: Use docker run with inline environment variables (as shown in Step 5.1)

- Alternative: Use docker-compose with embedded environment variables (Step 5.2) instead of external env_file

## 📝 Important Notes

### Permission Management Strategy

AnythingLLM requires a **two-tier permission approach** for optimal functionality:

#### Configuration Files (Host User Access)

```bash
# These should be owned by your user for easy editing:
# - docker-compose.yml
# - .env
# - INSTALLATION_GUIDE.md
# - Any custom configuration files

sudo chown $USER:$USER /var/www/html/anythingllm/*.yml
sudo chown $USER:$USER /var/www/html/anythingllm/*.env
sudo chown $USER:$USER /var/www/html/anythingllm/*.md
```

#### Storage Directory (Container User Access)

```bash
# This MUST be owned by container user (1000:1000):
# - /storage/ and all subdirectories
# - Contains database, keys, models, plugins, etc.

sudo chown -R 1000:1000 /var/www/html/anythingllm/storage
sudo chmod -R 755 /var/www/html/anythingllm/storage
```

**Why This Matters:**

- After server reboots: Container may fail to start if storage permissions are incorrect

- File editing: You need write access to configuration files

- Runtime operations: Container needs write access to its data directory

### Security Considerations

- Firewall: Only expose ports 80 and 443 externally

- Access Control: Use strong passwords and consider IP restrictions

- Updates: Regularly update the container image

- Backups: Backup /var/www/html/anythingllm/storage regularly

### Performance Tips

- ARM Optimization: AnythingLLM supports ARM64 natively

- Memory Management: Monitor RAM usage with local LLMs

- Storage: Use fast storage for vector database operations

- Network: Ensure low latency between AnythingLLM and Ollama containers

### Backup Strategy

```bash
# Backup AnythingLLM data
sudo tar -czf anythingllm-backup-$(date +%Y%m%d).tar.gz /var/www/html/anythingllm/storage

# Backup Caddy configuration
sudo cp /etc/caddy/Caddyfile /var/www/html/backups/Caddyfile-$(date +%Y%m%d)
```

## 🎯 Final Configuration Summary

After successful installation, you should have:

- ✅ AnythingLLM running on https://anythingllm.yourdomain.com

- ✅ Local LLM via Ollama with Llama 3.1 8B

- ✅ Local Embeddings via Ollama with Nomic Embed Text

- ✅ Persistent Storage on external volume

- ✅ SSL Certificate via Caddy and Cloudflare

- ✅ Health Monitoring with container health checks

- ✅ Security Headers configured in Caddy

- ✅ Privacy-First Setup with telemetry disabled

## 🔗 Useful Links

- AnythingLLM Documentation

- AnythingLLM GitHub Repository

- Ollama Documentation

- Caddy Documentation
