---
title: "Self-Hosting a Vector Database: OpenSearch on Oracle ARM with Coolify"
description: "If you are building AI applications, RAG (Retrieval-Augmented Generation) pipelines, or just need a powerful search engine, you need a Vector Database. While services like Pinecone are great, they get expensive."
pubDate: 2025-11-21
categories: ["AI"]
tags: []
toc: true
---

If you are building AI applications, RAG (Retrieval-Augmented Generation) pipelines, or just need a powerful search engine, you need a **Vector Database**. While services like Pinecone are great, they get expensive.

In this guide, I’ll walk you through self-hosting **OpenSearch** (the open-source fork of Elasticsearch) on an Oracle Cloud ARM server using **Coolify**. We will set up both the Database Node (for storing vectors) and the Dashboard (for visualizing data).

## What is OpenSearch?

OpenSearch is a distributed search and analytics suite. It is a community-driven fork of Elasticsearch and Kibana.

- OpenSearch (The Database): Stores data, indexes it, and performs queries. Most importantly, it includes the k-NN (k-Nearest Neighbors) plugin out of the box, turning it into a powerful Vector Database for AI embeddings.

- OpenSearch Dashboards (The UI): A web interface to visualize data, manage indices, and run queries via a console.

## Prerequisites

- Server: Oracle Cloud ARM (Ampere) instance (Aarch64 architecture).

- OS: Ubuntu.

- Manager: Coolify installed.

- RAM: At least 4GB (Oracle Free Tier offers 24GB, which is perfect).

## Step 1: Prepare the Server (Critical!)

Before touching Docker, you must increase the Virtual Memory map count on your Linux host. Elasticsearch/OpenSearch uses memory mapping (mmap) extensively. If you skip this, the container will crash immediately.

SSH into your server and run:

```bash
# Set the limit
sudo sysctl -w vm.max_map_count=262144

# Make it permanent (persists after reboot)
echo "vm.max_map_count=262144" | sudo tee -a /etc/sysctl.conf
```

*Note: You can verify this by running `sysctl vm.max_map_count`. If it returns `262144` or higher, you are safe.*

## Step 2: Create the Resource in Coolify

- Open Coolify.

- Navigate to your Project -> Environment.

- Click + New Resource -> Docker Compose.

- Paste the following configuration.

### The Docker Compose Configuration

This file is optimized for ARM processors and includes specific fixes to prevent SSL handshake errors and disable unnecessary multi-tenancy popups.

```yaml
services:
  opensearch-node:
    image: opensearchproject/opensearch:latest
    container_name: opensearch-node
    environment:
      - cluster.name=opensearch-cluster
      - node.name=opensearch-node
      - discovery.type=single-node
      - bootstrap.memory_lock=true
      # Oracle ARM usually has 24GB RAM. We allocate 2GB heap here.
      - "OPENSEARCH_JAVA_OPTS=-Xms2g -Xmx2g"
      - OPENSEARCH_INITIAL_ADMIN_PASSWORD=${OPENSEARCH_INITIAL_ADMIN_PASSWORD}
      # DISABLE HTTP CLIENT AUTH (Fixes 504/SSL errors from Dashboard)
      - plugins.security.ssl.http.clientauth_mode=NONE
    ulimits:
      memlock:
        soft: -1
        hard: -1
      nofile:
        soft: 65536
        hard: 65536
    volumes:
      - opensearch-data:/usr/share/opensearch/data
    networks:
      - opensearch-net
    restart: always

  opensearch-dashboards:
    image: opensearchproject/opensearch-dashboards:latest
    container_name: opensearch-dashboards
    depends_on:
      - opensearch-node
    environment:
      - 'OPENSEARCH_HOSTS=["https://opensearch-node:9200"]'
      # DISABLE MULTI-TENANCY (Removes the "Select Tenant" popup)
      - OPENSEARCH_SECURITY_MULTITENANCY_ENABLED=false
      # Stop Dashboard from complaining about self-signed certs
      - OPENSEARCH_SSL_VERIFICATIONMODE=none
    networks:
      - opensearch-net
    restart: always

volumes:
  opensearch-data:

networks:
  opensearch-net:
```

## Step 3: Environment Variables

Before deploying, you must set the admin password. OpenSearch enforces strict password complexity rules.

- In Coolify, go to the Environment Variables tab for this resource.

- Add the key used in the compose file:

Key: OPENSEARCH_INITIAL_ADMIN_PASSWORD

- Value: StrongPass123! (Must include: Uppercase, Lowercase, Number, Special Character).

- Save.

## Step 4: Deploy and Configure Domain

- Click Deploy.

- Once the deployment is “Healthy,” go to the opensearch-dashboards service settings (click the gear icon next to it).

- Domains: Set your public URL (e.g., https://search.yourdomain.com).

- Port Exposes: Set to 5601.

- Save and Restart the dashboard service.

## Step 5: Verify Installation

- Go to your dashboard URL.

- Log in with admin and your password.

- Because we disabled Multi-Tenancy, you should go straight to the Home screen.

- Click the “Hamburger Menu” (top left) -> Management -> Dev Tools.

- Run this command to create a test Vector Index:

```json
PUT /my-vector-index
{
  "settings": {
    "index": {
      "knn": true,
      "knn.algo_param.ef_search": 100
    }
  },
  "mappings": {
    "properties": {
      "my_vector_field": {
        "type": "knn_vector",
        "dimension": 1536,
        "method": {
          "name": "hnsw",
          "engine": "lucene"
        }
      }
    }
  }
}
```

If you see `"acknowledged": true`, your Vector Database is ready!

## Pro Tip: Connecting Other Apps in Coolify

One of the best features of Coolify is the internal network. If you have a Node.js, Python, or Go app running in the same Coolify environment, **do not** use the public domain to connect to the database. Connect internally for zero latency and better security.

- Go to your OpenSearch resource in Coolify.

- Enable “Connect To Predefined Network”.

- Do the same for your Application resource.

- Use these connection details in your App’s .env file:

- Host: opensearch-node

- Port: 9200

- Protocol: http (Use HTTP internally; SSL is handled at the edge)

- Auth: Basic Auth (admin / password)

**Example Connection String:**

```text
http://admin:YourStrongPass@opensearch-node:9200
```

## Summary of “Gotchas” Fixed

If you try to install this blindly, you usually hit these errors. This guide solved them:

- Exit Code 78: Solved by sysctl vm.max_map_count.

- 504 Gateway Timeout: Solved by setting plugins.security.ssl.http.clientauth_mode=NONE.

- Tenant Popups: Solved by OPENSEARCH_SECURITY_MULTITENANCY_ENABLED=false.

- SSL Handshake Failures: Solved by removing Transport layer auth requirements in the YAML.
