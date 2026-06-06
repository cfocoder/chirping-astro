---
title: '🚀 Installing and Configuring MCPO for Open WebUI: A Complete Guide'
description: 'Today I successfully set up MCPO (MCP-to-OpenAPI) to work seamlessly with Open WebUI, providing access to powerful external APIs through the Model Context Protocol. This post documents the entire process, scripts, and configuration needed for a smooth installation.'
pubDate: 2025-08-22
heroImage: '/images/2025/08/mcpo.png'
heroImageAlt: 'mcpo'
categories: ['AI']
tags: ['MCP', 'AI Tools']
toc: true
---

## 📝 Introduction

Today I successfully set up MCPO (MCP-to-OpenAPI) to work seamlessly with Open WebUI, providing access to powerful external APIs through the Model Context Protocol. This post documents the entire process, scripts, and configuration needed for a smooth installation.

## 🎯 What is MCPO?

MCPO is a bridge that converts Model Context Protocol (MCP) servers into OpenAPI endpoints, making them easily consumable by Open WebUI and other applications. It provides a standardized way to access external services like:

- Exa AI – Advanced web search and research

- Perplexity – AI-powered question answering

- Memory Systems – Knowledge graph storage

- Weather APIs – Real-time weather data

- Financial Data – Stock prices and market information

- And many more…

## 🛠️ Installation Process

### Prerequisites

- Docker and Docker Compose

- Basic Linux command line knowledge

- API keys for the services you want to use

### Step 1: Get the Clean Installation Package

First, obtain the clean MCPO installation files from the GitHub repository:

[https://github.com/cfocoder/mcpo](https://github.com/cfocoder/mcpo)

```bash
git clone https://github.com/cfocoder/mcpo.git
cd mcpo
```

The package should include:

```text
mcpo/
├── src/                           # Core Python source code
├── config.example.json            # Configuration template
├── config.working-example.json    # Working configuration example
├── .env.example                   # Environment variables template
├── .env.working-example           # Working environment example
├── docker-compose.yml             # Docker orchestration
├── Dockerfile                     # Container definition
├── mcpo.sh                        # Management script (the hero!)
├── pyproject.toml                 # Python dependencies
├── uv.lock                        # Locked dependency versions
├── README.md                      # Project documentation
├── INSTALL.md                     # Installation guide
└── LICENSE                        # License information
```

### Step 2: Initial Configuration

```bash
# Navigate to installation directory
cd /path/to/mcpo

# Set up environment variables
cp .env.example .env
nano .env  # Add your API keys

# Set up MCP server configuration
cp config.example.json config.json
# Or use the working example:
cp config.working-example.json config.json
nano config.json  # Customize as needed
```

### Step 3: Configure API Keys

Edit your `.env` file to include required API keys:

```text
# Essential API keys
EXA_API_KEY=your_exa_api_key_here
PERPLEXITY_API_KEY=your_perplexity_api_key_here

# Optional additional keys
OPENWEATHER_API_KEY=your_weather_key
ALPHA_VANTAGE_API_KEY=your_finance_key
```

### Step 4: Launch MCPO

The included `mcpo.sh` script makes management incredibly easy:

```bash
# Make the script executable
chmod +x mcpo.sh

# Start MCPO services
./mcpo.sh start

# Check if everything is running
./mcpo.sh status

# View logs to verify startup
./mcpo.sh logs
```

## 🎮 The Magic of mcpo.sh Script

The `mcpo.sh` script is a game-changer for managing the MCPO installation. Here are all the available commands:

### Management Commands

```text
./mcpo.sh start          # Start all MCPO services
./mcpo.sh stop           # Stop all services gracefully
./mcpo.sh restart        # Restart services (stop + start)
./mcpo.sh status         # Check running status
./mcpo.sh logs           # View recent logs
./mcpo.sh logs -f        # Follow logs in real-time
./mcpo.sh pull           # Update container images
./mcpo.sh build          # Rebuild containers from source
```

### Real-World Usage Examples

```text
# Quick health check
./mcpo.sh status
# Output: ✅ MCPO is running (PID: 12345)

# Debug issues
./mcpo.sh logs | grep ERROR

# Update to latest version
./mcpo.sh stop
./mcpo.sh pull
./mcpo.sh start

# Monitor live activity
./mcpo.sh logs -f
```

## 🔗 Open WebUI Integration

### Adding MCPO APIs to Open WebUI

Once MCPO is running, integrate it with Open WebUI using these OpenAPI endpoints:

- Access Open WebUI Admin Panel

Go to Settings → Tools

- Click “Manage Tool Servers”

- Add MCPO ToolsFor each service, add the corresponding OpenAPI URL:Exa AI Research: http://localhost:8001/exa/openapi.json Perplexity Q&A: http://localhost:8001/perplexity/openapi.json Memory Management: http://localhost:8001/memory/openapi.json Weather Data: http://localhost:8001/weather/openapi.json Financial Data: http://localhost:8001/yahoo-finance/openapi.json

- Test Integration

Create a new chat in Open WebUI

- Try using the new tools:Search for recent AI research papers about transformers What's the weather in San Francisco? Get Apple stock price

### Tailscale Remote Access (Bonus!)

For secure remote access to MCPO, set up Tailscale serve:

```text
# Configure Tailscale to serve MCPO
sudo tailscale serve --https=8443 --set-path=/mcpo http://localhost:8001

# Access remotely via:
https://your-hostname.your-tailnet.ts.net:8443/mcpo/docs
```

Then use the Tailscale URLs in Open WebUI:

```text
https://your-hostname.your-tailnet.ts.net:8443/mcpo/exa/openapi.json
```

## 🚀 Real-World Configuration Example

Here’s a working configuration that includes multiple useful services:

```json
{
  "servers": {
    "exa": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-exa"],
      "env": {
        "EXA_API_KEY": "${EXA_API_KEY}"
      }
    },
    "perplexity": {
      "command": "uv",
      "args": ["run", "mcp-server-perplexity"],
      "env": {
        "PERPLEXITY_API_KEY": "${PERPLEXITY_API_KEY}"
      }
    },
    "memory": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-memory"]
    },
    "weather": {
      "command": "uv",
      "args": ["run", "mcp-server-weather"],
      "env": {
        "OPENWEATHER_API_KEY": "${OPENWEATHER_API_KEY}"
      }
    },
    "yahoo-finance": {
      "command": "uv",
      "args": ["run", "mcp-server-yahoo-finance"]
    }
  }
}
```

## 🛠️ Troubleshooting Guide

### Common Issues and Solutions

**Problem: Container won’t start**

```text
./mcpo.sh logs
# Check for port conflicts or missing API keys
```

**Problem: API calls failing**

```bash
# Verify API keys are correctly set
cat .env | grep API_KEY

# Test individual endpoints
curl http://localhost:8001/health
curl http://localhost:8001/exa/openapi.json
```

**Problem: Open WebUI can’t connect**

```bash
# Ensure MCPO is accessible
curl http://localhost:8001/docs

# Check if Docker port binding is correct
docker ps | grep mcpo
```

**Problem: Tailscale access issues**

```text
# Verify Tailscale serve configuration
sudo tailscale serve status

# Check if service is bound to all interfaces (not just localhost)
```

### Verification Steps

- Check MCPO Status: ./mcpo.sh status

- Test API Health: curl http://localhost:8001/health

- View Documentation: Visit http://localhost:8001/docs

- Test Tool Call: Use Open WebUI to call a function

- Monitor Logs: ./mcpo.sh logs -f during testing

## 🎯 Pro Tips from Today’s Experience

### 1. Always Use the Management Script

The `mcpo.sh` script saves enormous time. Instead of remembering Docker commands, just use:

```text
./mcpo.sh status  # Instead of: docker ps | grep mcpo
./mcpo.sh logs    # Instead of: docker logs mcpo-container
```

### 2. Keep Working Examples

The installation includes `config.working-example.json` and `.env.working-example` files. These are invaluable for quickly restoring a known-good configuration.

### 3. Test Incrementally

Start with one or two MCP servers, verify they work in Open WebUI, then add more. This makes debugging much easier.

### 4. Monitor Logs During Integration

When adding tools to Open WebUI, keep `./mcpo.sh logs -f` running to see real-time API calls and catch issues immediately.

### 5. Use Health Endpoints

Always verify `http://localhost:8001/health` before troubleshooting complex issues.

## 🌟 Benefits Achieved

After this setup, Open WebUI gains powerful capabilities:

- Research: Real-time web search and academic paper discovery

- Analysis: Advanced AI reasoning through Perplexity

- Memory: Persistent knowledge storage across conversations

- Data: Live weather, financial, and other real-world information

- Extensibility: Easy addition of new MCP servers

## 📚 Additional Resources

- MCPO Documentation: Check the included README.md and INSTALL.md

- MCP Server Directory: Explore available servers at Model Context Protocol

- Open WebUI Docs: Open WebUI Functions Guide

## 🔄 Maintenance

### Regular Updates

```text
# Update MCPO containers
./mcpo.sh stop
./mcpo.sh pull
./mcpo.sh start

# Update MCP server packages
# (They're automatically updated when containers restart)
```

### Backup Configuration

```bash
# Backup your working configuration
cp config.json config.backup.json
cp .env .env.backup
```

### Monitor Performance

```bash
# Check resource usage
docker stats

# View detailed logs
./mcpo.sh logs | tail -100
```

## 💡 Conclusion

MCPO provides an elegant bridge between the Model Context Protocol ecosystem and Open WebUI, dramatically expanding the capabilities of your AI assistant. The included management script makes installation and maintenance straightforward, while the modular configuration allows easy customization.

The key to success is starting simple, testing thoroughly, and leveraging the excellent tooling provided. With this setup, you have a powerful, extensible platform for AI-assisted workflows.

Happy building! 🚀

_Tags: #MCPO #OpenWebUI #MCP #Docker #AI #Installation #Tutorial_
