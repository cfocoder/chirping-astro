---
title: 'Helical Insight v7.0 on a Mac mini: why it caught my attention and how I deployed it with Coolify'
description: 'A hands-on, independent look at deploying Helical Insight v7.0 with Docker Compose and Coolify on a private Mac mini.'
pubDate: 2026-08-24
heroImage: '/images/2026/08/helical-insight-coolify-macmini-featured-v3.png'
heroImageAlt: 'Helical Insight v7.0 deployed on a Mac mini with Coolify'
categories: ['Business Intelligence', 'Self-Hosting']
tags:
  [
    'Helical Insight',
    'Business Intelligence',
    'Coolify',
    'Docker Compose',
    'Self-Hosted',
    'Semantic Layer',
    'Tailscale',
  ]
toc: true
comments: true
---

> **Editorial disclosure.** This is the first post in a series based on my hands-on, independent evaluation of Helical Insight. The project’s founder contacted me after I discovered it, but this article is neither sponsored nor subject to editorial approval. Product claims are attributed to their official sources; the installation results reflect my test environment.

# Helical Insight v7.0 on a Mac mini: Why It Caught My Attention and How I Deployed It with Coolify

For several years, I have worked with Power BI, Microsoft Fabric, and Tableau. They are powerful tools, but I have also seen how per-user licensing, capacity, embedding, and cloud operations can complicate an analytics project for a small or midsize business. Added to that reality is a question that occupies much of my current research: how do you give language models enough business context to answer reliably about a database?

That is why, when I discovered **Helical Insight**, I did not see it merely as another dashboard product. What made me pause was the combination of four elements that usually appear separately: enterprise paginated reporting, interactive dashboards, a _Semantic Model_ module, and conversational analytics with the option to use the LLM of the user’s choice. The project presents itself as a unified, open, self-hosting-ready BI platform; its public repository includes the backend, frontend, Docker assets, documentation, and Instant BI components.[1][3]

I also found the commercial proposition unusual. Helical states that the Community Edition includes the same capabilities as Enterprise—including Instant BI, dashboards, pixel-perfect reports, embedding, SSO, multi-tenancy, and row-level security—and that the stated differences are limited to commercial support and mandatory branding in charts and exports.[2] That claim deserves careful verification, but it is exactly the type of model worth evaluating when control over data, deployment, and licensing cost matters.

Shortly after I began exploring the tool, the founder of Helical Insight contacted me to ask whether I would write about my experience. The timing was fortunate: I had already planned to test it independently, especially its Semantic Model and the possibility of combining self-hosted BI with AI-assisted analytics. This first article documents the step that made that evaluation possible: the actual deployment of Helical Insight v7.0 on a Mac mini using Docker Compose and Coolify.

This is not a final product review. It is a technical log of an installation that involved real failures, adjustments, and verification; that is also why I am keeping it as a guide for my future self.

## What Helical Insight Is and Why It Is Worth Testing

Helical Insight brings together components that often require several tools:

- **Interactive dashboards** with filters, drill-down, and drill-through.
- **Paginated/pixel-perfect reports**, useful for operational documents such as invoices, financial statements, or printable reports.
- **Embedding and APIs**, relevant when analytics must live inside another application.
- **Security and multi-tenancy**, including SSO and row-level security according to the product’s public matrix.[1][2]
- **Instant BI**, its conversational analytics component, with a stated _bring your own LLM_ option.[2][3]
- **Semantic Model**, the aspect I am most interested in testing: measures, dimensions, definitions, and business context that could help a conversational layer generate better queries.

None of this proves on its own that it is the right solution for every organization. Vendor-stated capabilities and the operational experience are different things. But having the code available and a Docker path made it possible to move quickly from curiosity to a private test environment.[3]

## The Goal of My Deployment

I did not need to publish a BI portal to the internet. I wanted a private, reproducible, and sufficiently realistic environment for experimenting with synthetic data, Metadata, Semantic Model, reports, and Instant BI without exposing databases or AI provider keys.

![Deployment architecture: private Tailscale access to Helical Insight, with PostgreSQL and Instant BI kept inside the Docker network.](/images/2026/08/helical-deployment-architecture.png)

Coolify manages the Docker Compose lifecycle, but access to the application does not go through a public domain or Traefik. The application is published only on a Tailscale address and a private port. PostgreSQL and Instant BI remain inside the Docker network.

## My Test Environment

| Component         | Configuration                                        |
| ----------------- | ---------------------------------------------------- |
| Host              | Mac mini running Ubuntu 24.04                        |
| CPU / RAM         | 4 cores / 16 GiB RAM                                 |
| Orchestration     | Coolify with a single Docker Compose stack           |
| Platform          | Helical Insight Community Edition v7.0.0             |
| Database          | Internal PostgreSQL 15                               |
| Conversational AI | Instant BI, initially in `stub` mode                 |
| Access            | Tailscale, without exposing PostgreSQL or Instant BI |
| Persistence       | Dedicated bind mounts on the host                    |

The `stub` mode was deliberate. Before sending a single row to an external LLM, I wanted to verify that the platform, data flow, and internal components started correctly. Configuring a real AI provider will be a later test, using synthetic data and a key stored as a Coolify secret.

## Installation Guide Based on the Actual Experience

Helical’s official guide provides installation resources, and the repository includes a Docker path.[3] However, deploying it within Coolify while keeping data secure required additional decisions. This is the procedure that worked for me.

### 1. Verify the Host Before Creating the Resource

Before copying a Compose file, I would confirm four things:

```bash
ssh macmini
uname -m
df -hT / /mnt/ducklake
findmnt -T /mnt/ducklake
docker version
docker compose version
```

My host was `x86_64` and had sufficient space for images, the official package, and persistent storage. I would not assume an ARM machine has exactly the same compatibility; checking the architecture first prevents wasting time on a deployment that cannot start.

### 2. Create Helical-Specific Persistent Paths

Rather than relying on ephemeral volumes managed by the resource, I separated the data under a dedicated directory:

```bash
sudo mkdir -p \
  /mnt/ducklake/helicalinsight/postgres \
  /mnt/ducklake/helicalinsight/hi/db \
  /mnt/ducklake/helicalinsight/hi/hi-repository \
  /mnt/ducklake/helicalinsight/config \
  /mnt/ducklake/helicalinsight/instantbi \
  /mnt/ducklake/helicalinsight/hirepo-root \
  /mnt/ducklake/helicalinsight/tomcat-temp \
  /mnt/ducklake/helicalinsight/logs \
  /mnt/ducklake/helicalinsight/.bootstrap

sudo chown -R root:root /mnt/ducklake/helicalinsight
sudo find /mnt/ducklake/helicalinsight -type d -exec chmod 0750 {} \;
```

PostgreSQL metadata, the Helical repository, extracted configuration, Instant BI, and logs survive a normal redeploy. I would not use `chmod 777`; if a container fails because of permissions, I would first inspect its UID/GID and logs.

### 3. Use Reproducible, Version-Pinned Bootstrap

The Compose file I used includes a one-time `bootstrap` service. On its first startup, it downloads the official Docker package for version `v7.0.0`, extracts the necessary files, and leaves a completion marker in the persistent directory.

![Reproducible deployment flow from persistent storage and a pinned package to a verified endpoint and safe operation.](/images/2026/08/helical-deployment-flow.png)

Pinning the version prevents a redeploy from changing the software implicitly. It also makes it possible to distinguish between an infrastructure problem and a change introduced by an update.

### 4. Define the Compose Services

The stack has four services:

- `bootstrap` downloads and prepares the official package artifacts.
- `postgres` stores Helical metadata and scheduling data.
- `hiee` runs the Helical Insight web application on Tomcat.
- `instantbi` runs the Python service behind the conversational layer.

The essential parts of the Compose file are as follows:

```yaml
services:
  postgres:
    image: postgres:15.8-alpine3.20
    restart: unless-stopped
    volumes:
      - /mnt/ducklake/helicalinsight/postgres:/var/lib/postgresql/data
    networks: [hinet]

  hiee:
    image: hiee/helicalinsight:nitrogen-j25t11
    restart: unless-stopped
    depends_on:
      postgres:
        condition: service_healthy
    ports:
      - '${TAILSCALE_IP}:${HELICAL_HOST_PORT}:8080'
    networks: [hinet]

  instantbi:
    image: python:3.13-slim
    restart: unless-stopped
    expose: ['8000']
    networks: [hinet]
```

The complete configuration also needs the product bind mounts, a Tomcat entrypoint wrapper, and the bootstrap process described above. I am not including passwords or values from my private network here; those values should live as resource variables or secrets, not in a post or public repository.

The minimum variables I would separate are:

```dotenv
POSTGRES_USER=...
POSTGRES_PASSWORD=...
POSTGRES_DB=hiee
HOST_IP=private-host:port
TAILSCALE_IP=100.x.y.z
HELICAL_HOST_PORT=18085
HELICALBI_LLM_MODE=stub
INSTALL_CHROME=false
```

### 5. Create the Resource in Coolify

In Coolify, I selected a **Docker Compose** resource and pasted in a single Compose file. Then:

1. I added the environment variables in Coolify.
2. I marked the PostgreSQL password as a secret.
3. I did not assign a public domain or additional ports.
4. I did not publish the PostgreSQL or Instant BI ports.
5. I performed the first deployment and waited for `bootstrap` to complete before interpreting Tomcat’s status.

The first startup is not immediate. Bootstrap downloads a large package, PostgreSQL initializes its data, Tomcat deploys the WAR, and Instant BI installs Python dependencies. A temporary `starting` status does not automatically mean failure.

### 6. Use a Health Check That Represents the Application

The most useful endpoint I found for Helical was:

```text
/hi-ee/applicationSettings
```

The application health check was conceptually as follows:

```yaml
healthcheck:
  test: ['CMD-SHELL', 'curl -f http://localhost:8080/hi-ee/applicationSettings || exit 1']
  interval: 30s
  timeout: 10s
  retries: 8
  start_period: 90s
```

I did not use the login page as a health check because it can respond with a redirect and does not clearly distinguish between a routed interface and a healthy backend.

### 7. Set Resource Limits From the Start

A healthy deployment should not compete without limits against the rest of the host’s services. On my Mac mini, I set these conservative limits:

| Service        | RAM Limit | Reservation |
| -------------- | --------: | ----------: |
| Helical/Tomcat |   1.5 GiB |     768 MiB |
| Instant BI     |   512 MiB |     256 MiB |
| PostgreSQL     |   384 MiB |     192 MiB |

I also limited the Java heap:

```text
CATALINA_OPTS=-Xms256m -Xmx768m
```

There is no universal number: limits should grow only after measuring usage, OOMs, restarts, and actual report load. In my most recent check, Helical was using about 929 MiB of its 1.5 GiB limit, while PostgreSQL and Instant BI were well below their caps.

## The Problems I Encountered — and How I Solved Them

The useful part of a guide is not pretending that everything started successfully on the first try. These were the relevant setbacks.

### BusyBox Does Not Support Every `find` Variant

The first version of the bootstrap process used a `find` option that works in GNU find but not in BusyBox/Alpine. The container exited with an error before copying the package.

**Fix:** use BusyBox-compatible constructs and test the command inside the image that actually runs bootstrap, not just on the Ubuntu host.

### A Bind Mount Should Not Be Deleted Like a Normal Directory

Another error came from trying to run `rm -rf /data/hi` on a mount point. Docker reported it as busy.

**Fix:** retain the directory that functions as the mount point and delete only its contents:

```bash
find "$dir" -mindepth 1 -maxdepth 1 -exec rm -rf {} +
```

That makes it possible to rebuild bootstrap artifacts without destroying the persistent path.

### The ZIP File Contained More Than One `docker-compose.yml`

The initial extraction could not assume that the ZIP root was the root of the desired package. Instant BI also included artifacts that could confuse a naive detection process.

**Fix:** explicitly locate `hi/hi-ee.war` and derive the package root from that file; then verify that the entrypoint and Instant BI application are also present.

### Port Conflict After a Redeploy

Coolify showed a resource as stopped, but an older container was still holding the private port. The new `hiee` could not start.

**Fix:** identify the actual port owner with Docker, stop the previous stack without deleting containers or volumes, and start the new deployment again. I did not use `docker compose down -v`.

### Compatibility Between Instant BI and Current LangChain Dependencies

The v7.0.0 package referenced an older namespace for `ChatOllama`. The current Python image required the `langchain-ollama` package.

**Fix:** explicitly patch the import during preparation and ensure that `langchain-ollama` is in `requirements.txt`. This is a deployment adaptation, not a claim about every future Helical version; that is why I would document it alongside the exact version.

## How I Validated That the Deployment Actually Worked

After the redeploy, I did not stop at Coolify showing a green icon. I verified four levels:

```bash
# Containers and status
sudo docker ps -a --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'

# Health check and restart status
sudo docker inspect <contenedor-hiee> \
  --format 'health={{.State.Health.Status}} restarts={{.RestartCount}}'

# Application endpoint over the private route
curl -fsS http://macmini:18085/hi-ee/applicationSettings

# Actual resource usage
sudo docker stats --no-stream
```

The current check produced:

```text
hiee       healthy, 0 restarts
postgres   healthy
instantbi  healthy

http://macmini:18085/hi-ee/applicationSettings → HTTP 200
```

I was also able to access the interface from an iPhone through Tailscale. That detail matters: a healthy container does not by itself guarantee that a user can reach the product from the intended network.

## What I Would Not Do in a Normal Deployment

These precautions prevented me from turning a configuration failure into data loss:

- Do not run `docker compose down -v` during the evaluation.
- Do not delete Helical’s persistent directory to “fix” a redeploy.
- Do not rotate the PostgreSQL password without verifying the effective internal configuration of the WAR and the existing volume.
- Do not copy API keys, passwords, private URLs, or connection strings into public Compose files, Git, or Slack.
- Do not enable an LLM with real data before reviewing costs, data retention, region, and security controls.
- Do not publish PostgreSQL or Instant BI merely for debugging convenience.

Before experimenting with Semantic Models or upgrading versions, it is wise to take at least one backup of the persistent data:

```bash
sudo tar -C /mnt/ducklake \
  -czf /mnt/ducklake/helicalinsight-backup-$(date +%F).tar.gz \
  helicalinsight
```

In addition to the archive, a logical PostgreSQL dump is preferable once the system is stable. And that backup needs to end up off the same disk if it is truly intended to protect against a host failure.

## Evaluation Status

At the time of writing this post, the installation is active and validated for the infrastructure flow:

```text
Docker Compose → Coolify → PostgreSQL → Helical Insight → Instant BI
```

A synthetic sales dataset is also ready to walk through the path from a Data Source to Metadata, Semantic Model, report, and dashboard. The example’s control total is `8,350.00`, so any report built on the dataset can be checked against a known result.

I am not yet claiming that Instant BI produces reliable answers with a real LLM, nor that the Semantic Model alone solves business-semantics problems. That requires a separate, reproducible test with clear comparison criteria. But something important is already in place: a complete, private, self-hosted BI platform that I can inspect, break, measure, and evaluate without depending on an ephemeral demo.

## Closing Thoughts

Helical Insight caught my attention because it challenges an assumption that has become common in BI: that advanced features must necessarily sit behind an enterprise plan or an increasingly expensive cloud platform. Its public proposition is that the Community platform retains the capabilities and that the commercial model focuses on support and branding.[2]

My experience so far shows that self-hosting is possible, but not magical. It required understanding Docker, persistence, private networking, resource limits, logs, and runtime dependencies. In return, the environment is under my control: I can work with synthetic data, inspect the SQL, control the network, and decide when—or whether—to connect an external AI layer.

That balance between autonomy and responsibility is, to me, the most interesting part of the platform.

## Sources

[1] https://helicalinsight.com
[2] https://www.helicalinsight.com/community-edition
[3] https://github.com/helicalinsight/helicalinsight
