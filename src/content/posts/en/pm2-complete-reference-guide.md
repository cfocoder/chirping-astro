---
title: 'PM2: Complete Reference Guide'
description: 'PM2 is a production-grade process manager that helps you keep applications running continuously. While it was originally designed for Node.js applications, PM2 can manage any type of application or script including Python, Ruby, PHP, Bash scripts, and binary executables.'
pubDate: 2025-10-19
heroImage: '/images/2025/10/pm2.png'
heroImageAlt: 'pm2'
categories: ['Linux']
tags: []
toc: true
---

## What is PM2?

PM2 is a production-grade process manager that helps you keep applications running continuously. While it was originally designed for Node.js applications, PM2 can manage any type of application or script including Python, Ruby, PHP, Bash scripts, and binary executables.

**Important**: PM2 is a **process manager**, not a package installer. It executes and manages programs that are already installed on your system. You’re responsible for:

- Installing the runtime environments (Node.js, Python, etc.)

- Installing your application’s dependencies (npm packages, pip packages, etc.)

- Having your application files ready to run

PM2’s job is to start, monitor, and keep those programs running – think of it as a supervisor for your applications.

### Key Features

- Process Management: Automatically restart applications if they crash

- Load Balancing: Built-in load balancer for clustering Node.js apps

- Startup Scripts: Generate scripts to launch apps on system boot

- Log Management: Centralized log management with rotation

- Monitoring: Real-time monitoring of CPU and memory usage

- Zero Downtime Reloads: Update applications without downtime

- Multi-language Support: Works with any script or executable

## Table of Contents

- What is PM2?

Key Features

- Installation

Prerequisites

- Basic Installation

- Troubleshooting Installation Issues

If you’re using nvm (Node Version Manager)

- If you’re NOT using nvm and get EACCES permission errors

- Alternative Installation Methods

- How PM2 Works

- Basic Commands

Starting Applications

- Managing Applications

- Monitoring

- Startup Script

- Examples by Language

Node.js Example

- Python Example

- Bash Script Example

- Using Ecosystem Configuration File

- Advanced Configuration Options

Common Options for All App Types

- Useful Tips

1. Process Persistence

- 2. View Real-time Logs

- 3. Graceful Reload

- 4. CPU and Memory Limits

- 5. Update PM2

- Troubleshooting

Application Won’t Start

- High Memory Usage

- PM2 Daemon Issues

- Clear Everything

- Comparison with Alternatives

PM2 vs Other Process Managers

- PM2 vs Serverless Functions vs Cron Jobs

- When to Use Each

- Conclusion

## Installation

### Prerequisites

Before installing PM2, ensure you have Node.js and npm installed on your system. PM2 itself requires Node.js, even if you plan to use it for managing Python or Bash scripts.

### Basic Installation

Install PM2 globally via npm:

```bash
npm install pm2 -g
```

Verify the installation:

```text
pm2 --version
```

### Troubleshooting Installation Issues

#### If you’re using nvm (Node Version Manager)

If you encounter an error about `globalconfig` and/or `prefix` being incompatible with nvm:

```bash
# Clear the npm prefix setting (replace with your Node version)
nvm use --delete-prefix v22.17.0 --silent

# Now install PM2
npm install pm2 -g

# Verify installation
pm2 --version
```

With nvm, global packages are automatically installed in your home directory per Node.js version, so no additional configuration is needed.

#### If you’re NOT using nvm and get EACCES permission errors

Configure npm to use a directory you own for global packages:

```bash
# Create a directory for global packages
mkdir -p ~/.npm-global

# Configure npm to use it
npm config set prefix '~/.npm-global'

# Add to your PATH
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.zshrc

# Reload your shell configuration
source ~/.zshrc

# Now install PM2
npm install pm2 -g
```

#### Alternative Installation Methods

**Using sudo (not recommended for security reasons)**

```bash
sudo npm install pm2 -g
```

**Using npx (no installation required)**

If you prefer not to install PM2 globally, you can run it on-demand:

```text
npx pm2 list
npx pm2 start app.js
```

## How PM2 Works

PM2 runs as a daemon process that manages your applications in the background. When you start an application with PM2, it:

- Spawns the process and monitors it

- Keeps the application running (auto-restart on crash)

- Provides a CLI to manage, monitor, and control processes

- Maintains logs for stdout and stderr

- Persists process list across system reboots (when configured)

## Basic Commands

### Starting Applications

```text
# Start an application
pm2 start app.js

# Start with a custom name
pm2 start app.js --name "my-app"

# Start with environment variables
pm2 start app.js --name "my-app" --env production
```

### Managing Applications

```text
# List all running applications
pm2 list

# Stop an application
pm2 stop app-name

# Restart an application
pm2 restart app-name

# Delete an application from PM2
pm2 delete app-name

# Stop all applications
pm2 stop all

# Restart all applications
pm2 restart all
```

### Monitoring

```text
# Monitor all applications
pm2 monit

# Show application details
pm2 show app-name

# Display logs
pm2 logs

# Display logs for specific app
pm2 logs app-name

# Clear logs
pm2 flush
```

### Startup Script

To make PM2 start on system boot:

```text
# Generate startup script
pm2 startup

# Save current process list
pm2 save

# Disable startup script
pm2 unstartup
```

## Examples by Language

### Node.js Example

**app.js**

```text
const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.send('Hello from PM2!');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

**Starting with PM2:**

```text
# Basic start
pm2 start app.js

# Start with cluster mode (utilizes all CPU cores)
pm2 start app.js -i max

# Start with watch mode (auto-restart on file changes)
pm2 start app.js --watch

# Start with specific Node.js version
pm2 start app.js --interpreter node@16
```

### Python Example

**app.py**

```python
import time
import logging

logging.basicConfig(level=logging.INFO)

def main():
    counter = 0
    while True:
        counter += 1
        logging.info(f"Python app running - Count: {counter}")
        time.sleep(5)

if __name__ == "__main__":
    main()
```

**Starting with PM2:**

```text
# Start Python script
pm2 start app.py --interpreter python3

# Start with custom name
pm2 start app.py --name "python-worker" --interpreter python3

# Start with arguments
pm2 start app.py --name "python-app" --interpreter python3 -- --arg1 value1

# Start Python web server
pm2 start "python3 -m http.server 8000" --name "python-server"
```

### Bash Script Example

**monitor.sh**

```bash
#!/bin/bash

echo "Starting monitoring script..."

while true; do
    echo "Checking system status at $(date)"
    uptime
    df -h | grep -E '^/dev/'
    echo "---"
    sleep 60
done
```

**Starting with PM2:**

```bash
# Make script executable first
chmod +x monitor.sh

# Start bash script
pm2 start monitor.sh --interpreter bash

# Start with custom name
pm2 start monitor.sh --name "system-monitor" --interpreter bash

# Start inline bash command
pm2 start "bash -c 'while true; do echo Hello; sleep 5; done'" --name "hello-loop"
```

## Using Ecosystem Configuration File

For managing multiple applications, use an ecosystem config file:

**ecosystem.config.js**

```yaml
module.exports = {
  apps: [
    {
      name: 'web-app',
      script: './app.js',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'development',
        PORT: 3000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 8080
      }
    },
    {
      name: 'python-worker',
      script: './worker.py',
      interpreter: 'python3',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M'
    },
    {
      name: 'bash-monitor',
      script: './monitor.sh',
      interpreter: 'bash',
      cron_restart: '0 0 * * *'  // Restart daily at midnight
    }
  ]
};
```

**Using the config file:**

```text
# Start all applications
pm2 start ecosystem.config.js

# Start specific app
pm2 start ecosystem.config.js --only web-app

# Start with production environment
pm2 start ecosystem.config.js --env production
```

## Advanced Configuration Options

### Common Options for All App Types

```yaml
{
  name: 'app-name',              // Application name
  script: './script.js',         // Script path
  interpreter: 'node',           // Interpreter (node, python3, bash, etc.)
  instances: 1,                  // Number of instances
  exec_mode: 'fork',            // 'fork' or 'cluster'
  watch: false,                  // Watch for file changes
  max_memory_restart: '200M',    // Restart if memory exceeds
  env: {                         // Environment variables
    NODE_ENV: 'development'
  },
  error_file: './logs/err.log', // Error log path
  out_file: './logs/out.log',   // Output log path
  log_date_format: 'YYYY-MM-DD HH:mm:ss',
  autorestart: true,            // Auto restart on crash
  max_restarts: 10,             // Max consecutive restarts
  min_uptime: '10s',            // Min uptime before restart
  cron_restart: '0 0 * * *'     // Cron pattern for scheduled restart
}
```

## Useful Tips

### 1. Process Persistence

Always save your process list after making changes:

```text
pm2 save
```

### 2. View Real-time Logs

```text
# All apps
pm2 logs --lines 100

# Specific app with live follow
pm2 logs app-name --lines 50
```

### 3. Graceful Reload

For zero-downtime updates (cluster mode only):

```text
pm2 reload app-name
```

### 4. CPU and Memory Limits

```text
# Start with max memory limit
pm2 start app.js --max-memory-restart 300M
```

### 5. Update PM2

```bash
# Update PM2 to latest version
npm install pm2 -g

# Update in-memory PM2 daemon
pm2 update
```

## Troubleshooting

### Application Won’t Start

```text
# Check logs for errors
pm2 logs app-name --err

# Show detailed process info
pm2 show app-name
```

### High Memory Usage

```text
# Monitor in real-time
pm2 monit

# Set memory limit
pm2 restart app-name --max-memory-restart 500M
```

### PM2 Daemon Issues

```text
# Kill and restart PM2 daemon
pm2 kill
pm2 resurrect
```

### Clear Everything

```text
# Delete all processes
pm2 delete all

# Kill PM2 daemon
pm2 kill
```

## Comparison with Alternatives

### PM2 vs Other Process Managers

| Feature              | PM2 | systemd         | supervisor | forever        |
| -------------------- | --- | --------------- | ---------- | -------------- |
| Multi-language       | ✅  | ✅              | ✅         | ❌ (Node only) |
| Clustering           | ✅  | ❌              | ❌         | ❌             |
| Easy monitoring      | ✅  | ❌              | ⚠️         | ⚠️             |
| Log management       | ✅  | ✅              | ✅         | ⚠️             |
| Cross-platform       | ✅  | ❌ (Linux only) | ✅         | ✅             |
| Zero-downtime reload | ✅  | ❌              | ❌         | ❌             |

### PM2 vs Serverless Functions vs Cron Jobs

While PM2, serverless functions (AWS Lambda, Azure Functions), and cron jobs might seem similar at first glance, they serve fundamentally different purposes:

| Aspect                 | PM2                               | Serverless Functions              | Cron Jobs                     |
| ---------------------- | --------------------------------- | --------------------------------- | ----------------------------- |
| Primary Purpose        | Keep processes running 24/7       | Run code on-demand/events         | Schedule periodic tasks       |
| Execution Model        | Continuously running              | Triggered, then stops             | Runs once per schedule        |
| Use Case               | Web servers, APIs, workers        | Event-driven, sporadic workloads  | Backups, cleanup, reports     |
| Process State          | Always running                    | Scales to zero when idle          | Starts and exits each run     |
| Restart Behavior       | Auto-restart on crash             | N/A (stateless)                   | Reruns on next schedule       |
| Scaling                | Manual (fixed instances)          | Automatic, infinite               | Single execution per schedule |
| Infrastructure         | Your server required              | Fully managed, serverless         | Your server required          |
| Billing Model          | Server uptime costs               | Pay per invocation/execution time | Server uptime costs           |
| Cold Start             | No (always warm)                  | Yes (can have delays)             | Each execution starts fresh   |
| Duration Limits        | Unlimited                         | Limited (typically 15 min max)    | Unlimited                     |
| Persistent Connections | ✅ WebSockets, long-polling       | ❌ Stateless                      | ❌ Starts fresh each time     |
| Memory/State           | Can maintain in-memory state      | Stateless between invocations     | No state between runs         |
| Best For               | 24/7 services, consistent traffic | Unpredictable/sporadic events     | Scheduled batch jobs          |

### When to Use Each

**Use PM2 when you need:**

- Web servers or APIs that must run 24/7

- Applications with consistent traffic or workload

- Persistent connections (WebSockets, databases)

- Automatic crash recovery and monitoring

- Applications that maintain state in memory

- Full control over the server environment

**Use Serverless Functions (Lambda/Azure Functions) when you need:**

- Event-driven workflows (file uploads, API calls)

- Unpredictable or sporadic traffic patterns

- Zero infrastructure management

- Automatic scaling without configuration

- Cost optimization for low-usage applications

- Quick prototyping without server setup

**Use Cron Jobs when you need:**

- Tasks that run and complete at specific times

- Scheduled maintenance (backups, cleanup)

- Periodic data processing or ETL jobs

- Batch operations (daily reports, email digests)

- Tasks that don’t need to run continuously

**Use PM2 + Cron together:**

- PM2 to keep your web application running continuously

- Cron to trigger periodic maintenance tasks

- Example: PM2 runs your API 24/7, cron runs nightly database backups

**Use PM2 with cron_restart feature:**

- Services that need scheduled restarts to clear memory leaks

- Applications that benefit from daily fresh starts

- Hybrid approach: continuous running + periodic restarts

```yaml
// ecosystem.config.js - PM2 with scheduled restarts
{
  name: 'api-server',
  script: 'server.js',
  instances: 2,
  cron_restart: '0 3 * * *'  // Restart daily at 3 AM
}
```

## Conclusion

PM2 is a powerful, versatile process manager that goes beyond just Node.js. Whether you’re running web servers, background workers, or system scripts, PM2 provides a unified interface to manage, monitor, and maintain your applications in production.

**Quick Reference Cheatsheet:**

```text
# Start
pm2 start app.js
pm2 start script.py --interpreter python3
pm2 start script.sh --interpreter bash

# Manage
pm2 list
pm2 stop
pm2 restart
pm2 delete

# Monitor
pm2 monit
pm2 logs
pm2 show

# Persist
pm2 save
pm2 startup
pm2 resurrect
```

Keep this guide handy for quick reference when working with PM2!
