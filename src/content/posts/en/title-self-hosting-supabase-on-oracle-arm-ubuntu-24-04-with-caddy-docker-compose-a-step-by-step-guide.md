---
title: "Title: Self-Hosting Supabase on Oracle ARM (Ubuntu 24.04) with Caddy & Docker Compose: A Step-by-Step Guide"
description: "So, you’ve got a powerful Oracle Cloud ARM VM running Ubuntu 24.04, complete with SSL, Docker, and a Caddy reverse proxy neatly managing your subdomains. Your blog is humming along on the main domain, and now you want to add the awesome open-source Firebase alternative,..."
pubDate: 2025-05-18
categories: ["Cloud"]
tags: []
toc: true
---

So, you’ve got a powerful Oracle Cloud ARM VM running Ubuntu 24.04, complete with SSL, Docker, and a Caddy reverse proxy neatly managing your subdomains. Your blog is humming along on the main domain, and now you want to add the awesome open-source Firebase alternative, Supabase, to your arsenal, running on its own subdomain like https://supabase.yourdomain.com. This guide will walk you through the exact steps I took to get Supabase up and running using Docker Compose, persisting data on a block volume, and integrating it with an existing Caddy setup. We’ll also cover the crucial secret generation and some troubleshooting we encountered along the way.

**Why Supabase for Finance and Data Science?**

For professionals in Finance and Data Science, managing, securing, and rapidly iterating on data-driven applications is paramount. Supabase offers a compelling suite of tools that can significantly accelerate this process. Its core PostgreSQL database provides a robust, SQL-compliant foundation perfect for storing complex financial models, market data, transactional records, or large datasets for analysis. The built-in authentication can secure sensitive financial dashboards or client portals. Realtime capabilities allow for live data feeds, such as stock tickers or monitoring algorithm performance. Furthermore, Supabase Storage is ideal for housing datasets, model artifacts, or generated reports, while Edge Functions can be used to deploy data processing pipelines, custom API endpoints for models, or automated financial reporting tasks—all within a cohesive, self-hostable platform that gives you full data sovereignty and control.

**My Server Setup (Prerequisites):**

- VM: Oracle Cloud ARM instance

- OS: Ubuntu 24.04 LTS

- Web Server/Proxy: Caddy (installed directly, not via Docker)

- Containerization: Docker and Docker Compose

- DNS & SSL: Cloudflare (managing DNS and providing edge SSL, with Caddy handling origin SSL)

- Storage:

Boot Volume: ~46GB

- Block Volume: 150GB, mounted at /mnt/myvolume (This is where Supabase data will live)

- Existing Apps: WordPress on the main domain, other apps on subdomains, all reverse-proxied by Caddy.

**Goal:** Install Supabase on https://supabase.yourdomain.com using Docker Compose, with data on /mnt/myvolume, and secure it properly.

## Table of Contents

- Phase 1: Preparation & DNS

- Phase 2: Supabase Setup with Docker Compose

- Phase 3: Caddy Configuration

- Phase 4: Final Verification

- Phase 5: Important Next Steps & Considerations

- Troubleshooting Notes from Our Install:

- Conclusion:

## Phase 1: Preparation & DNS

- Cloudflare DNS Configuration:Before anything else, we need to tell the world where supabase.yourdomain.com lives.

Log in to your Cloudflare dashboard for yourdomain.com.

- Add an A record:

Type: A

- Name: supabase (this creates supabase.yourdomain.com)

- IPv4 address: YOUR_VM_PUBLIC_IP_ADDRESS_XXX_XXX

- Proxy status: Proxied (Orange Cloud – Recommended)

- TTL: Auto

- Ensure your SSL/TLS encryption mode in Cloudflare is Full (Strict). Caddy will provide a valid certificate on our origin server.

- Install Git (if not already installed):Supabase uses a Git repository for its Docker setup.

```bash
sudo apt update
sudo apt install -y git
```

**3. Create Supabase Directories on Block Volume:**
We’ll keep Supabase configuration and its persistent data organized on our block volume.

```bash
sudo mkdir -p /var/www/html/supabase_config
# Supabase data will implicitly go into a subdirectory here via Docker volume mounts
cd /var/www/html/supabase_config
```

## Phase 2: Supabase Setup with Docker Compose

- Clone the Official Supabase Docker Repository:Navigate into your newly created config directory and clone the official setup files.

```bash
cd /var/www/html/supabase_config
git clone --depth 1 https://github.com/supabase/supabase.git .
cd docker
```

- –depth 1 gets only the latest commit, saving space.

- The . clones into the current directory (/var/www/html/supabase_config).

- We then move into the docker subdirectory where the docker-compose.yml resides.

2. **Initialize Environment Files:**
Supabase uses .env files for configuration.

```bash
cp .env.example .env
# The docker-compose.yml we used also implicitly expects some Realtime/Supavisor
# variables to be in the main .env, so a separate realtime.env wasn't needed.
```

3. **Configure Secrets and URLs in .env:**
This is the most critical step for security and functionality! Open /var/www/html/supabase_config/docker/.env for editing:

```text
nano .env
```

Generate strong, unique values for the following. **Do NOT use the examples directly.**

- POSTGRES_PASSWORD: Your main database password.

Generate: openssl rand -base64 32

- Example: POSTGRES_PASSWORD=YOUR_VERY_STRONG_POSTGRES_PASSWORD_HERE

- JWT_SECRET: Used to sign all JSON Web Tokens. Keep this extremely secret. At least 32 characters.

Generate: openssl rand -base64 32

- Example: JWT_SECRET=YOUR_ULTRA_SECRET_JWT_SIGNING_KEY_HERE

- ANON_KEY: Public-facing anonymous key (a JWT). This must be correctly signed with your JWT_SECRET.

How we generated it (after initial trouble):

Get your JWT_SECRET value from above.

- Get current epoch seconds: date +%s (e.g., 1716081000)

- Get future epoch seconds (e.g., +10 years): date -d “+10 years” +%s (e.g., 2031781000)

- Go to jwt.io.

Algorithm: HS256

- Payload:

- Copy the full encoded JWT.

```json
{
  "iss": "supabase.yourdomain.com",
  "ref": "yourproject-anon",
  "role": "anon",
  "iat": 1716081000,
  "exp": 2031781000
}
```

Verify Signature: Paste your *actual* JWT_SECRET and ensure “secret base64 encoded” is **UNCHECKED**.

- Example: ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3…YOUR_SIGNED_ANON_JWT_HERE…9u0

**SERVICE_ROLE_KEY**: Super-admin key (a JWT). Bypasses RLS. Keep extremely secret. This *must* also be correctly signed with your JWT_SECRET.

- How we generated it: Similar to ANON_KEY on jwt.io.

Payload:

```json
{
  "iss": "supabase.yourdomain.com",
  "ref": "yourproject-service",
  "role": "service_role",
  "iat": 1716081000, // Use same iat as ANON_KEY
  "exp": 2031781000  // Use same exp as ANON_KEY
}
```

- Verify Signature: Same method as ANON_KEY, using your JWT_SECRET.

- Example: SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3…YOUR_SIGNED_SERVICE_JWT_HERE…7rA

**DASHBOARD_USERNAME / DASHBOARD_PASSWORD**: Credentials for Kong’s admin API (not Supabase Studio login).

- Example:

```text
DASHBOARD_USERNAME=supabase_kong_admin
DASHBOARD_PASSWORD=YOUR_VERY_STRONG_KONG_ADMIN_PASSWORD_HERE
```

- (We initially had DASHBOARD_PASSWORD=Anapaula1974 which is insecure; ensure you use a strong one).

- SECRET_KEY_BASE: Used by Realtime and Supavisor (pooler).

Generate: openssl rand -base64 64 (If it outputs two lines, combine them into one).

- Example: SECRET_KEY_BASE=YOUR_VERY_LONG_AND_RANDOM_BASE64_STRING_FOR_PHOENIX_HERE

- DB_ENC_KEY: Encryption key for Realtime.

What worked for us: A 16-character alphanumeric string.

- Generate: 

- VAULT_ENC_KEY: Encryption key for Supavisor’s vault.

Generate: openssl rand -hex 16 (gives a 32-character hex string)

- Example: VAULT_ENC_KEY=your32characterhexstringforvault

- Logflare/Analytics:

LOGFLARE_API_KEY: For internal Supabase analytics communication.

Generate: openssl rand -hex 32 (gives a 64-character hex string)

- Example: LOGFLARE_API_KEY=your64charhexstringforlogflareapikey

- Comment out LOGFLARE_LOGGER_BACKEND_API_KEY, GOOGLE_PROJECT_ID, GOOGLE_PROJECT_NUMBER if using the default Postgres analytics backend.

- DOCKER_SOCKET_LOCATION=/var/run/docker.sock (Keep as is for Linux).

- URLs:

SITE_URL=https://supabase.yourdomain.com

- API_EXTERNAL_URL=https://supabase.yourdomain.com (Ensure HTTPS!)

- SUPABASE_PUBLIC_URL=https://supabase.yourdomain.com

- Kong Ports: (We adjusted this due to conflicts)

KONG_HTTP_PORT=8008 (Initially 8000, but conflicted with ChromaDB, then 8001 conflicted with Airbyte. 8008 was free).

- KONG_HTTPS_PORT=8443 (This won’t be directly used as Caddy handles external HTTPS).

- Supavisor Tenant ID:

POOLER_TENANT_ID=yourdomain_supabase_prod (Make this unique).

- Mailer: For now, we used default SMTP_HOST=supabase-mail. For actual email delivery, configure with a real SMTP provider.

SMTP_ADMIN_EMAIL=your_admin_email@example.com

Save and close the .env file.

4. **Modify docker-compose.yml:**
Open /var/www/html/supabase_config/docker/docker-compose.yml for a couple of tweaks.

```text
nano docker-compose.yml
```

- Kong Service Ports: Bind to localhost and use the variable for the host port.

```yaml
services:
  kong:
    # ...
    ports:
      - "127.0.0.1:${KONG_HTTP_PORT}:8000/tcp" # Changed from default
      # - "127.0.0.1:${KONG_HTTPS_PORT}:8443/tcp" # Commented out, Caddy handles SSL
    # ...
```

- Realtime Service DB_ENC_KEY: Ensure it uses the variable from .env.

```yaml
  realtime:
    # ...
    environment:
      # ...
      DB_ENC_KEY: ${DB_ENC_KEY} # Changed from 'supabaserealtime'
      # ...
```

- Analytics Service Port (Optional): Bind to localhost.

```yaml
  analytics:
    # ...
    ports:
      - "127.0.0.1:4000:4000" # Changed from default
    # ...
```

- Data Persistence Check: Confirm that volumes like db: -> – ./volumes/db/data:/var/lib/postgresql/data:Z and storage: -> – ./volumes/storage:/var/lib/storage:z are present. These relative paths mean data will be stored in /var/www/html/supabase_config/docker/volumes/, which is on our block volume. Perfect!

Save and close the docker-compose.yml file.

5. **Pull Docker Images and Start Supabase:**
Still in /var/www/html/supabase_config/docker/:

```bash
sudo docker-compose down -v # Recommended for a clean slate if you ran before
sudo docker-compose pull
sudo docker-compose up -d
```

## Phase 3: Caddy Configuration

Now, let’s tell Caddy how to serve our new Supabase instance.

- Edit your Caddyfile (usually /etc/caddy/Caddyfile):

```text
sudo nano /etc/caddy/Caddyfile
```

Add this block, ensuring the port in reverse_proxy matches your KONG_HTTP_PORT from the .env file (e.g., 8008):

```text
supabase.yourdomain.com {
    # Recommended security headers
    header {
        Strict-Transport-Security "max-age=31536000;"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "SAMEORIGIN"
        Referrer-Policy "strict-origin-when-cross-origin"
        Permissions-Policy "geolocation=(), midi=(), sync-xhr=(), microphone=(), camera=(), magnetometer=(), gyroscope=(), fullscreen=(), payment=()"
    }

    encode gzip zstd

    # Reverse proxy to the Supabase Kong gateway
    reverse_proxy localhost:8008 { # Ensure this port matches KONG_HTTP_PORT
        # header_up X-Forwarded-For {remote_host} # Caddy sets this by default
        # header_up X-Forwarded-Proto {scheme}    # Caddy sets this by default
        header_up Host {host} # Still useful
    }

    log 
}
```

*Note: Caddy’s validator might warn about X-Forwarded-For and X-Forwarded-Proto being unnecessary as Caddy sets them by default. You can remove those lines if desired.*

2. **Format and Validate Caddyfile (Good Practice):**

```text
sudo caddy fmt --overwrite /etc/caddy/Caddyfile
sudo caddy validate --config /etc/caddy/Caddyfile
```

3. **Reload Caddy Service:**

```bash
sudo systemctl reload caddy
```

## Phase 4: Final Verification

- Check Docker Container Status:

```bash
sudo docker ps
```

All Supabase containers (e.g., supabase-kong, supabase-db, realtime-dev.supabase-realtime, supabase-studio, etc.) should be Up and ideally show (healthy). It might take a minute or two for all healthchecks to pass.

2. **Check Specific Logs if Issues Arise:**
If docker compose logs -f  gives no such service (we saw this intermittently), use the container ID:

```bash
sudo docker logs  -f --tail 50
```

Key logs to check if realtime was unhealthy:

```bash
# Should show healthchecks returning HTTP 200
sudo docker logs  -f --tail 50
```

**3. Test in Browser:**

Open your favorite web browser and navigate to https://supabase.yourdomain.com.
You should be greeted by the Supabase Studio login page!

- Default Studio Login (if not changed via specific Studio env vars):

Email: supabase@example.com

- Password: supabase

- CHANGE THESE IMMEDIATELY after your first login via the Studio interface or by setting specific Studio admin user/pass env vars if available and restarting.

## Phase 5: Important Next Steps & Considerations

**Database Backups:** CRITICAL! Your data lives in /var/www/html/supabase_config/docker/volumes/db/data/. Implement a robust backup strategy (e.g., pg_dumpall run from the host via docker exec, or volume snapshots if your cloud provider offers them for block volumes).

```text
# Example pg_dumpall (run from host, ensure backup dir exists)
# sudo mkdir -p /var/www/html/supabase_backups
# sudo docker exec -t supabase-db pg_dumpall -c -U postgres > /var/www/html/supabase_backups/supabase_dump_$(date +%Y-%m-%d_%H-%M-%S).sql
```

- Updating Supabase: Periodically cd /var/www/html/supabase_config && git pull to get the latest docker-compose.yml and other config files, then cd docker && sudo docker-compose pull && sudo docker-compose up -d –remove-orphans. Always check release notes for breaking changes.

- Resource Monitoring: Keep an eye on CPU, RAM, and disk usage.

- Email Service: Configure a proper SMTP provider in your .env for functional email (confirmations, resets).

- Security Hardening: Regularly review your Oracle Cloud firewall (Security Lists/NSGs), ufw on the VM, and Cloudflare settings.

## Troubleshooting Notes from Our Install:

We hit a few snags, and here’s how we solved them:

- Kong Port Conflict:

Symptom: Error response from daemon: … Bind for 127.0.0.1:8000 failed: port is already allocated (and then again for 8001).

- Cause: Other Docker containers (chromadb, then airbyte-abctl-control-plane) were already using those ports on the host.

- Fix: We changed KONG_HTTP_PORT in the Supabase .env file to an unused port (e.g., 8008) and updated the Caddyfile’s reverse_proxy directive accordingly.

- Realtime Service Crypto Error (“Bad key size”):

Symptom: realtime-dev.supabase-realtime container in a restart loop. Logs showed ErlangError: {:badarg, {~c”api_ng.c”, 244}, ~c”Bad key size”}.

- Cause: The DB_ENC_KEY format was incorrect. We initially tried a 32-character hex string.

- Fix: Changed DB_ENC_KEY in .env to a 16-character alphanumeric string (e.g., generated by 

- Realtime Service Unhealthy (403 on Healthcheck):

Symptom: realtime-dev.supabase-realtime container was Up but (unhealthy). Logs showed healthcheck requests getting Sent 403.

- Cause: The ANON_KEY in .env was not correctly signed with the main JWT_SECRET. The healthcheck uses this ANON_KEY to authenticate.

- Fix: Regenerated ANON_KEY (and SERVICE_ROLE_KEY for good measure) using jwt.io. The key steps were:

Use the actual JWT_SECRET value from .env in the “Verify Signature” section of jwt.io.

- Ensure the “secret base64 encoded” checkbox was UNCHECKED.

- Update .env with these new, correctly signed keys. Restarting Supabase then showed Realtime as (healthy).

## Conclusion:

And there you have it! A fully functional, self-hosted Supabase instance running smoothly on an Oracle ARM VM, neatly integrated with Caddy and Cloudflare, with its data safely on a dedicated block volume. While there were a few bumps with port conflicts and key generation, systematic troubleshooting got us there. This setup provides a powerful backend for your projects, giving you full control over your data and infrastructure.
