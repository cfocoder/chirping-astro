---
title: 'A SysAdmin’s Complete Guide: From Crisis to Clean Server – The Ultimate Disk Space Recovery Playbook'
description: 'Updated with advanced techniques and lessons learned from multiple real-world storage crises'
pubDate: 2025-07-03
categories: ['Linux']
tags: []
toc: true
---

_Updated with advanced techniques and lessons learned from multiple real-world storage crises_

This is the comprehensive story of how I’ve evolved from reactive firefighting to proactive server management. What started as a “simple” file sync issue revealed a server at 93% disk capacity, leading to a systematic methodology that later saved me during an even more critical 95% storage crisis. Join me as I share the exact commands, tools, and preventive measures that have kept my Oracle ARM Ubuntu server healthy through multiple storage emergencies.

It all started with a seemingly minor issue. I use Mountain Duck to mount a remote drive from my ARM Oracle Cloud server, making it easy to drag and drop files. One day, some files just wouldn’t sync. My first thought? “It must be a permissions issue.”

I was right, but I had no idea this small clue would unravel a series of deeper issues, leading me on a journey from a simple file sync problem to developing a complete server health management system.

## Chapter 1: The First Clue – Permission Denied

### The Initial Investigation

The first step was to confirm my suspicion. The logs in Mountain Duck showed SFTP errors, and on the server, I found the problem immediately.

When I connected via SSH (`ssh ubuntu@my_server_ip`), a quick `ls -ld /mnt/myvolume` revealed the directory was owned by www-data, not my ubuntu user.

**Lesson Learned**: Tools like Mountain Duck act as the user you log in with. If that user doesn’t have write permissions to a directory, operations will fail.

### The Wrong Fix That Started Everything

My first instinct was to run `sudo chown -R ubuntu:ubuntu /mnt/myvolume`. This was a **critical mistake** that taught me one of the most important lessons in system administration.

## Chapter 2: The Alarms Go Off – A Cascade of Failures

### The Immediate Disaster

Seconds after running chown, my server monitoring tool, Netdata, lit up like a Christmas tree:

- Critical Alert: out_of_disk_space_time

- Warning: Docker container health failures for multiple services

The `chown -R` command was recursively changing ownership on my Docker data directory, which was stored on this volume. This had two catastrophic effects:

- Docker Health: My running containers (like Supabase and others) suddenly lost permission to access their own files, causing them to crash.

- The I/O Storm: The chown command created a massive storm of disk write operations (metadata writes). Netdata saw this and predicted the disk would be full soon, triggering the “out of space” alert, even though the actual usage wasn’t changing much.

**Critical Lesson**: Never, ever run a recursive ownership change (`chown -R`) on a live Docker data directory. It will break your running services and can trigger false disk space alerts.

## Chapter 3: The Recovery – Restoring Order

### The Emergency Recovery Plan

The plan was clear: stabilize first, then fix the permissions correctly.

- Stop the Bleeding: I aborted the dangerous chown command (Ctrl + C)

- Revert Ownership: I reverted everything back to its original state to get my services working again:sudo chown -R www-data:www-data /mnt/myvolume

- Restart Services: A simple reboot (sudo reboot) or restarting the Docker containers (sudo docker-compose restart) brought the crashed services back online

- The Correct Permission Fix: To give my ubuntu user write access without breaking the www-data services:# Add ubuntu user to the www-data group sudo usermod -aG www-data ubuntu # Give the group write permission sudo chmod -R g+w /mnt/myvolume

This two-step process solved my original Mountain Duck sync issue safely.

## Chapter 4: The Real Problem – The Disk Space Crisis

With the immediate fires put out, I was still left with a genuine “Disk space usage: 93%” warning from Netdata. It was time to become a digital detective and find out where my space had gone.

### My Essential Toolkit for Disk Investigation

#### 1. The Overview (df -h)

The first command to get the lay of the land. It shows the usage for all mounted volumes:

```text
df -h
```

This confirmed `/mnt/myvolume` was indeed the full one.

#### 2. The Ultimate Analyzer (ncdu)

This command-line tool is the MVP of disk analysis. It provides an interactive, size-sorted map of any directory:

```bash
# Install it first if you don't have it
sudo apt update && sudo apt install ncdu

# Run it on the volume
sudo ncdu /mnt/myvolume
```

With ncdu, I could navigate with arrow keys and instantly see the biggest directories. The culprit was clear: a 130 GB directory named `/docker`.

#### 3. The Docker Space Breakdown

I navigated into the `/docker` directory with ncdu and found:

- /overlay2: 80.8 GiB (The Docker images themselves)

- /volumes: 14.5 GiB (Persistent data for my apps)

- /containers: 234.9 MiB (Runtime files and logs)

The biggest offender was overlay2, meaning the space was being used by the application images themselves, not just their data.

## Chapter 5: The Great Cleanup – Reclaiming Gigabytes

Armed with this knowledge, I executed a three-part cleanup strategy:

### 1. Uninstall Unused Apps

I realized I was no longer using a full Supabase stack. Using the `docker-compose down -v` command in its directory, followed by `sudo docker system prune -a`, I instantly reclaimed nearly 20 GB of space.

### 2. Hunt Down Runaway Logs

Some containers, especially chatty ones, can generate enormous log files. I used this command to find the biggest offenders:

```bash
sudo find /var/www/html/docker/containers -name "*-json.log" -exec du -sh {} + | sort -rh | head -n 10
```

I found several log files that were hundreds of megabytes or even gigabytes in size.

- Immediate Fix: I emptied them without deleting them:sudo truncate -s 0 /path/to/the/giant/log.log

- Permanent Fix: I edited the docker-compose.yml for those services to add log rotation:services: my-chatty-app: # ... logging: driver: "json-file" options: max-size: "20m" # Max 20MB per file max-file: "3" # Keep 3 files max

### 3. Fix Broken Services

The earlier chaos had left a few services in a “Restarting” loop. A quick look at their logs with `sudo docker logs` revealed the classic “Permission denied” error.

- I used sudo docker inspect  to find the exact host directory they used for data

- I applied the correct ownership (sudo chown -R 101:101 ... for Redpanda, sudo chown -R 999:999 ... for MariaDB)

- A final docker-compose down && docker-compose up -d brought them back to life

## Chapter 6: The Advanced Crisis – Lessons from a 95% Emergency

_This section incorporates lessons learned from subsequent storage crises_

Months later, I faced an even more severe crisis: both drives hitting critical levels (95% main drive, 91% mounted volume). This emergency taught me advanced techniques that every sysadmin should know:

### Advanced Disk Analysis Techniques

#### User Home Directory Deep Dive

```bash
# Analyze user directory usage
sudo du -h --max-depth=1 /home/ubuntu | sort -rh

# Find the largest cache directories
find ~/.cache -type d -exec du -sh {} + 2>/dev/null | sort -rh | head -20
```

#### System-Wide Cache Hunters

```bash
# Find all cache directories across the system
sudo find / -type d -name "*cache*" -exec du -sh {} + 2>/dev/null | sort -rh | head -20

# Check for package manager caches
ls -la ~/.cache/
du -sh ~/.cache/*
```

### The Nuclear Cache Cleanup Arsenal

#### Python UV Package Manager (Major Space Hog)

```bash
# Check UV cache size first
du -sh ~/.cache/uv

# Remove UV cache (can be 13GB+!)
rm -rf ~/.cache/uv
```

#### NPM Cache Cleanup

```bash
# Check current cache size
npm cache verify

# Clean cache
npm cache clean --force
```

#### VS Code Server Cache

```bash
# These can accumulate gigabytes over time
rm -rf ~/.cache/vscode-server-extensions
rm -rf ~/.vscode-server/extensions
rm -rf ~/.vscode-server/data/logs/*
```

#### DuckDB Extensions

```bash
# Check for multiple versions
du -sh ~/.duckdb/extensions/*

# Remove older versions
rm -rf ~/.duckdb/extensions/v1.3.1  # Keep only latest
```

### System Log Management

#### Immediate Log Cleanup

```bash
# Truncate large system logs
sudo truncate -s 0 /var/log/syslog
sudo truncate -s 0 /var/log/kern.log

# Clean old log files
sudo rm -f /var/log/kern.log.*
sudo rm -f /var/log/auth.log.*
```

#### Journal Log Management

```text
# Check journal size
sudo journalctl --disk-usage

# Vacuum to specific size
sudo journalctl --vacuum-size=100M

# Vacuum by time
sudo journalctl --vacuum-time=7d
```

#### Permanent Journal Size Limits

Create a permanent configuration to prevent journal bloat:

````bash
# Create config directory
sudo mkdir -p /etc/systemd/journald.conf.d

# Create size limit config
sudo tee /etc/systemd/journald.conf.d/size-limit.conf Set up automatic alerts before you hit crisis mode:

```bash
# Create monitoring script
cat > ~/disk-monitor.sh Add this to all your docker-compose.yml files:

```yaml
version: '3.8'
services:
  app:
    # ... your service config
    logging:
      driver: "json-file"
      options:
        max-size: "20m"
        max-file: "3"
````

#### Logrotate Configuration

```sql
# Create custom logrotate config
sudo tee /etc/logrotate.d/docker-containers /dev/null || true
    endscript
}
EOF
```

### The Emergency Response Playbook

When you get a disk space alert, follow this order:

- Immediate Assessment (/dev/null | head -20

- Nuclear Options (last resort)rm -rf ~/.cache/uv rm -rf ~/.cache/vscode-server-extensions docker system prune -a --volumes -f

## Chapter 8: Results and Lessons Learned

### The Numbers Don’t Lie

Through systematic application of these techniques across multiple crises:

**Original Crisis Recovery:**

- Mounted Volume: 93% → 69% (24% reduction)

- Total Space Freed: ~20GB

**Advanced Crisis Recovery:**

- Main Drive: 87% → 41% (46% reduction!)

- Mounted Volume: 91% → 29% (62% reduction!)

- Total Space Freed: 106GB

### Key Insights

- Package Manager Caches Are Silent Killers: UV Python cache (13GB), NPM cache (1.7GB), and VS Code caches can accumulate massive amounts of data

- System Logs Need Aggressive Management: Without proper rotation, logs can consume 5-10GB easily

- Docker Needs Regular Maintenance: Images, containers, and build cache can grow to 50GB+ without pruning

- Prevention Beats Reaction: Automated cleanup and monitoring prevent crisis situations

### The Complete Monitoring Workflow

My evolved proactive workflow:

- Daily Glance: Check Netdata dashboard for disk space trends

- Weekly Maintenance: Automated cache cleaning and Docker pruning

- Monthly Deep Dive: Full ncdu analysis and application review

- Emergency Response: Follow the playbook above when alerts trigger

## Epilogue: Building Anti-Fragile Systems

This journey taught me that great system administration isn’t about preventing all problems—it’s about building systems that can detect, respond to, and learn from problems quickly.

The methodology developed through these crises has transformed my approach from reactive firefighting to proactive system health management. By following the clues, using the right tools, and implementing preventive measures, you can not only fix immediate issues but also make your entire infrastructure more resilient.

### Essential Takeaways

- Never run chown -R on live Docker directories

- Cache directories are often the largest space consumers

- System logs need proactive management, not reactive cleanup

- Automated monitoring and cleanup prevent emergencies

- Document your emergency response procedures

- Test your recovery procedures during calm periods

Remember: in system administration, today’s small warning might be tomorrow’s major outage. Build your defenses accordingly.

### Emergency Commands Quick Reference

```bash
# Immediate disk space assessment
df -h
sudo du -h --max-depth=1 / | sort -rh | head -10

# Quick space recovery (usually 2-5GB)
sudo journalctl --vacuum-size=100M
sudo truncate -s 0 /var/log/syslog
npm cache clean --force
docker system prune -f

# Major cache cleanup (potentially 10-20GB)
rm -rf ~/.cache/uv
rm -rf ~/.cache/vscode-server-extensions
sudo apt clean && sudo apt autoremove

# Nuclear Docker cleanup (potentially 20-50GB)
docker system prune -a --volumes -f

# Deep analysis tools
sudo ncdu /
sudo find / -type f -size +1G 2>/dev/null
```

Keep this guide handy—your future self will thank you when the next storage crisis hits.
