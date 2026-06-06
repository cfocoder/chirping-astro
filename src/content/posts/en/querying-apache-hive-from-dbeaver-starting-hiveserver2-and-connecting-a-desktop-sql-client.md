---
title: "Querying Apache Hive from DBeaver: Starting HiveServer2 and Connecting a Desktop SQL Client"
description: "Part 6 in the Hadoop and Hive Tutorial Series"
pubDate: 2026-03-24
categories: ["Hadoop"]
tags: []
toc: true
---

**Part 6 in the Hadoop and Hive Tutorial Series**

In the previous posts of this series, I installed Hadoop 3.3.6 natively on Ubuntu, configured YARN, ran MapReduce jobs, installed Apache Hive 3.1.3 on top of Hadoop, and finally loaded CSV files into Hive external tables so they could be queried with SQL.

At that point, Hive was already working. I could open the Hive CLI in the terminal, run `SHOW TABLES`, and execute analytical queries on data stored in HDFS. But a practical question remained: **how do we connect Hive to a desktop SQL client so we can write queries more comfortably, browse schemas visually, and work in a more familiar interface?**

That is exactly what **HiveServer2** solves.

## What Is HiveServer2 and Why Do We Need It?

HiveServer2 is the service that exposes Hive to external clients through a standard network interface. In other words, it is the component that allows applications such as **DBeaver**, **Beeline**, JDBC tools, BI software, and other SQL clients to connect to Hive remotely or locally.

Without HiveServer2, Hive works only as a local command-line tool. You can still run queries from the terminal using `hive`, but desktop applications have nothing to connect to.

Think of the stack this way:

- HDFS stores the files

- Hive Metastore stores table definitions and metadata

- Hive CLI lets you run queries locally in the terminal

- HiveServer2 exposes Hive through JDBC/ODBC so external tools can connect

- DBeaver is the SQL client that uses that JDBC connection

So if the goal is to query Hive from DBeaver instead of the terminal, **HiveServer2 must be running first**.

## Where This Post Fits in the Series

This tutorial assumes you already completed the previous steps in the Hadoop/Hive setup:

- Hadoop 3.3.6 on Ubuntu: Native Installation without Virtual Machine

- Running Your First MapReduce Job on Hadoop: WordCount on War and Peace

- Correcting Word Frequencies with Data Normalization: MapReduce Text Processing on War and Peace (Part 3)

- Apache Hive 3.1.3 on Ubuntu: Native Installation on Top of Hadoop 3.3.6

- From HDFS to SQL Queries: Loading CSV Files into Hive External Tables and Querying with SQL

At this stage, the Hadoop cluster and Hive installation already exist. What we are adding now is the **client connectivity layer**.

## Environment Used in This Post

All steps below were validated on the following setup:

| Component | Version / Value |
|---|---|
| OS | Ubuntu 24.04 LTS |
| Hadoop | 3.3.6 |
| Hive | 3.1.3 |
| Hadoop home | ~/hadoop-3.3.6 |
| Hive home | ~/apache-hive-3.1.3-bin |
| Java for Hadoop | OpenJDK 11 |
| Java for Hive | Temurin / JDK 8 |
| SQL client | DBeaver |
| HiveServer2 port | 10000 |
| HiveServer2 web UI | 10002 |

In this local academic setup, Hive uses an embedded Derby metastore. That is acceptable for personal learning and single-user experimentation, but it is not the architecture you would use for a multi-user production environment.

## Step 1: Verify That Hadoop and Hive Are Already Working

Before introducing DBeaver into the picture, verify that the underlying services are healthy. If Hadoop itself is not running, HiveServer2 will not be able to work correctly.

First, start HDFS and YARN if they are not already running:

```text
start-dfs.sh
start-yarn.sh
```

Then verify the expected Java processes:

```text
jps
```

**Expected output:**

```text
NameNode
DataNode
SecondaryNameNode
ResourceManager
NodeManager
Jps
```

You should also confirm that Hive can still access the metastore and the tables you created earlier:

```text
hive
```

Then inside the Hive CLI:

```text
SHOW DATABASES;
SHOW TABLES;
```

If this works, then the Hive installation itself is fine. The only missing piece is the network service that DBeaver will use.

## Step 2: Review the HiveServer2 Configuration

HiveServer2 is configured in `hive-site.xml`. In my installation, the critical properties are these:

```xml

  hive.server2.thrift.port
  10000

  hive.server2.thrift.bind.host
  localhost

  hive.server2.enable.doAs
  false

```

These settings mean:

- 10000 is the JDBC/Thrift port where SQL clients connect

- localhost restricts the service to the local machine, which is ideal for a laptop or classroom setup

- doAs=false avoids impersonation complications in a simple single-user environment

The metastore connection in my case is also local and embedded:

```xml

  javax.jdo.option.ConnectionURL
  jdbc:derby:;databaseName=/home/hectorsa/metastore_db;create=true

```

For a class or local lab, that is enough.

## Step 3: Understand the Startup Dependency Order

This is the most important operational idea in the whole process:

**DBeaver does not start Hive.**
It only connects to HiveServer2 if HiveServer2 is already running.

So the correct startup order is:

- Start HDFS

- Start YARN

- Start HiveServer2

- Open DBeaver and connect

That means the commands should be executed in this order:

```text
start-dfs.sh
start-yarn.sh
start-hiveserver2.sh
```

And the shutdown order should be the reverse:

```text
stop-hiveserver2.sh
stop-yarn.sh
stop-dfs.sh
```

This order matters because HiveServer2 depends on the Hadoop services below it.

## Step 4: Create a Dedicated Script to Start HiveServer2

In my setup, I created a dedicated script called:

```text
~/bin/start-hiveserver2.sh
```

This script is useful because Hive 3.1.3 in this local environment needs explicit paths for Java, Hadoop, and Hive. It also takes a few seconds to start, so it is better to have a repeatable command.

A practical version of the script is:

```bash
#!/usr/bin/env bash

set -euo pipefail

JAVA_HOME="/home/hectorsa/jdk8u442-b06"
HADOOP_HOME="/home/hectorsa/hadoop-3.3.6"
HADOOP_CONF_DIR="$HADOOP_HOME/etc/hadoop"
HIVE_HOME="/home/hectorsa/apache-hive-3.1.3-bin"
HIVE_CONF_DIR="$HIVE_HOME/conf"

PID_DIR="$HOME/.hive/run"
LOG_DIR="$HOME/.hive/logs"
PID_FILE="$PID_DIR/hiveserver2.pid"
LOG_FILE="$LOG_DIR/hiveserver2.log"

mkdir -p "$PID_DIR" "$LOG_DIR"

export JAVA_HOME HADOOP_HOME HADOOP_CONF_DIR HIVE_HOME HIVE_CONF_DIR
export PATH="$JAVA_HOME/bin:$HADOOP_HOME/bin:$HADOOP_HOME/sbin:$HIVE_HOME/bin:$PATH"

if [[ -f "$PID_FILE" ]]; then
  existing_pid="$(cat "$PID_FILE")"
  if [[ -n "${existing_pid}" ]] && kill -0 "$existing_pid" 2>/dev/null; then
    echo "HiveServer2 is already running with PID $existing_pid"
    echo "JDBC: jdbc:hive2://localhost:10000/default"
    exit 0
  fi
  rm -f "$PID_FILE"
fi

nohup "$HIVE_HOME/bin/hive" --service hiveserver2 >>"$LOG_FILE" 2>&1 &
server_pid=$!
echo "$server_pid" > "$PID_FILE"

for _ in {1..60}; do
  if ss -ltn | grep -q ':10000 '; then
    echo "HiveServer2 started successfully."
    echo "PID: $server_pid"
    echo "JDBC: jdbc:hive2://localhost:10000/default"
    echo "Web UI: http://localhost:10002/"
    echo "Log: $LOG_FILE"
    exit 0
  fi
  sleep 2
done

echo "HiveServer2 is still starting. Check:"
echo "  ss -ltnp | grep 10000"
echo "  tail -f $LOG_FILE"
```

### What this script does

- forces the environment to use the correct Java for Hive

- exports the Hive and Hadoop directories explicitly

- starts HiveServer2 in the background

- waits until port 10000 becomes available

- stores a PID file for clean shutdown

- writes logs to ~/.hive/logs/hiveserver2.log

This matters because a desktop client like DBeaver expects a stable server endpoint. If HiveServer2 is not fully started yet, DBeaver will return a connection error.

## Step 5: Create the Matching Shutdown Script

For clean operation, I also created:

```text
~/bin/stop-hiveserver2.sh
```

A working version is:

```bash
#!/usr/bin/env bash

set -euo pipefail

PID_FILE="$HOME/.hive/run/hiveserver2.pid"

if [[ -f "$PID_FILE" ]]; then
  pid="$(cat "$PID_FILE")"
  if kill -0 "$pid" 2>/dev/null; then
    kill "$pid"
    rm -f "$PID_FILE"
    echo "HiveServer2 stopped."
    exit 0
  fi
  rm -f "$PID_FILE"
fi

fallback_pids="$(pgrep -f 'org\.apache\.hive\.service\.server\.HiveServer2|Dproc_hiveserver2' || true)"

if [[ -z "$fallback_pids" ]]; then
  echo "No active HiveServer2 process was found."
  exit 0
fi

for pid in $fallback_pids; do
  kill "$pid" || true
done

echo "HiveServer2 stopped."
```

### Why use a dedicated stop script?

Because once you start integrating tools, it is good practice to treat each service as a separate layer:

- stop-hiveserver2.sh stops the SQL service

- stop-yarn.sh stops the resource manager

- stop-dfs.sh stops the distributed file system

That separation makes the architecture easier to remember, which is especially useful in a classroom context.

## Step 6: Start HiveServer2 and Verify That It Is Listening

Once the script exists, start the full stack in order:

```text
start-dfs.sh
start-yarn.sh
start-hiveserver2.sh
```

When the startup completes, verify that HiveServer2 is listening on the expected ports:

```text
ss -ltnp | grep 10000
ss -ltnp | grep 10002
```

**Expected output:**

```text
LISTEN 0 50 *:10000 *:* users:(("java",pid=...,fd=...))
LISTEN 0 50 *:10002 *:* users:(("java",pid=...,fd=...))
```

These ports mean:

- 10000: JDBC / Thrift endpoint used by DBeaver and Beeline

- 10002: HiveServer2 web interface

You can also open the browser and verify the web interface:

```text
http://localhost:10002/
```

If that page loads, HiveServer2 is alive.

## Step 7: Validate the Connection Locally with Beeline Before Using DBeaver

Before troubleshooting DBeaver, always validate the server with Hive’s own JDBC client first. That removes the desktop UI from the equation and confirms whether the server is really ready.

Use:

```text
beeline -u 'jdbc:hive2://localhost:10000/default' -n hectorsa
```

If the connection works, you should see something like this:

```text
Connected to: Apache Hive (version 3.1.3)
Driver: Hive JDBC (version 3.1.3)
Transaction isolation: TRANSACTION_REPEATABLE_READ
```

Then run a quick test query:

```text
SHOW DATABASES;
```

**Expected output:**

```text
+----------------+
| database_name  |
+----------------+
| default        |
| maestria_hive  |
+----------------+
```

This is the most important validation step in the whole tutorial. If `beeline` can connect, then DBeaver can connect too, provided the connection settings are correct.

## Step 8: Install or Open DBeaver

If DBeaver is already installed, simply open it.

If not, install it using your preferred method. On Ubuntu, a common route is the `.deb` package from the official site or the Snap package, but the exact installation method is less important than the connection configuration itself.

What matters is that DBeaver has access to the Hive JDBC driver. In most cases, DBeaver downloads the driver automatically when you create the connection for the first time.

## Step 9: Create the Hive Connection in DBeaver

In DBeaver:

- Open Database > New Database Connection

- Search for Hive

- Select Apache Hive

- Continue to the connection settings screen

Use these values:

| Field | Value |
|---|---|
| Host | localhost |
| Port | 10000 |
| Database | default |
| Username | hectorsa |
| Password | (leave empty) |

If DBeaver asks for the JDBC URL, use:

```text
jdbc:hive2://localhost:10000/default
```

For this local setup, no SSL, Kerberos, or HTTP transport configuration is necessary.

### Why these settings work

Because HiveServer2 is listening locally on the Thrift binary transport at port `10000`, and your Hive installation is using a simple local metastore with no authentication layer beyond the local username.

In a production cluster this would often be more complex, but for a personal Ubuntu workstation this is the correct minimal setup.

## Step 10: Test the DBeaver Connection

After entering the connection details, click **Test Connection**.

If HiveServer2 is already running, the test should succeed.

If DBeaver asks to download missing driver files, allow it. That does not change your Hive server; it only installs the client-side JDBC driver inside DBeaver.

Once connected, you should be able to:

- browse databases in the left panel

- expand tables and inspect columns

- open a SQL editor tab

- execute Hive queries directly from DBeaver

At this point, the architecture is complete:

- data in HDFS

- metadata in Hive Metastore

- queries served by HiveServer2

- SQL editing from DBeaver

## Step 11: Run a First Query from DBeaver

Open a SQL editor tab and run:

```text
SHOW DATABASES;
```

Then try:

```text
USE default;
SHOW TABLES;
```

If you already created the IMSS tables from the previous post, you can run:

```sql
SELECT * 
FROM imss_trabajadores_tipo
LIMIT 5;
```

Or an aggregation:

```sql
SELECT tipo, SUM(trabajadores) AS total
FROM imss_trabajadores_tipo
GROUP BY tipo
ORDER BY total DESC;
```

This is functionally the same as running the query from the Hive CLI, but now you gain a desktop editing experience:

- better query editing

- query history

- schema browser

- reusable SQL tabs

- easier copy/paste of results

That is why connecting Hive to DBeaver is such a useful next step after getting Hive itself installed.

## Step 12: Understand the Difference Between Hive CLI and DBeaver

At this point it is helpful to clarify something conceptually.

When you query from the Hive terminal CLI:

```text
hive
```

you are using a local shell interface directly tied to the Hive installation.

When you query from DBeaver, you are no longer using the CLI. Instead:

- DBeaver sends SQL through JDBC

- JDBC talks to HiveServer2 on port 10000

- HiveServer2 parses and executes the query

- Hive interacts with the metastore and Hadoop

- results are sent back over JDBC to DBeaver

So DBeaver is not replacing Hive. It is replacing the terminal client.

That distinction matters because if DBeaver cannot connect, the problem is usually not your SQL. It is usually one of these:

- HiveServer2 is not running

- the port is incorrect

- the server is still starting

- the JDBC driver is missing on the client side

## Troubleshooting: Common Problems and Their Causes

## Problem 1: DBeaver says “Connection refused”

**Cause:** HiveServer2 is not running yet, or not listening on `10000`.

**Solution:**

```text
ss -ltnp | grep 10000
```

If nothing appears, start it:

```text
start-hiveserver2.sh
```

Then test with Beeline before retrying DBeaver.

## Problem 2: DBeaver opens but cannot see databases

**Cause:** The connection may be pointed to the wrong database, or the metastore is not accessible.

**Solution:**

Test manually:

```text
beeline -u 'jdbc:hive2://localhost:10000/default' -n hectorsa -e 'show databases;'
```

If this works, the issue is likely on the DBeaver connection settings side.

## Problem 3: HiveServer2 takes time to start

**Cause:** This is normal. HiveServer2 does not become available instantly. It initializes internal services, the metastore connection, and the JDBC service.

**Solution:**

Wait a few seconds and verify with:

```text
ss -ltnp | grep 10000
```

Also inspect the log:

```bash
tail -f ~/.hive/logs/hiveserver2.log
```

## Problem 4: Hadoop is running but HiveServer2 queries fail

**Cause:** Hadoop alone is not enough. HiveServer2 is a separate service.

**Solution:** Start all three layers in order:

```text
start-dfs.sh
start-yarn.sh
start-hiveserver2.sh
```

## Problem 5: Derby limitations in multi-user environments

**Cause:** Embedded Derby is fine for local experimentation, but it is not intended for concurrent production-style access from multiple users and tools.

**Solution:** For classroom use and a single local machine, keep Derby. For larger or shared environments, migrate the metastore to MySQL or PostgreSQL.

## Quick Reference: Daily Startup and Shutdown

### To start everything

```text
start-dfs.sh
start-yarn.sh
start-hiveserver2.sh
```

### To verify

```text
jps
ss -ltnp | grep 10000
```

### To connect from DBeaver

```text
jdbc:hive2://localhost:10000/default
```

### To stop everything

```text
stop-hiveserver2.sh
stop-yarn.sh
stop-dfs.sh
```

## Summary: What We Added in This Post

In this tutorial, we extended the local Hadoop/Hive environment with a proper desktop client workflow.

By the end of the process, we have:

- HDFS running as the distributed storage layer

- YARN running as the resource management layer

- Hive installed and working with tables in the metastore

- HiveServer2 exposing Hive through JDBC on port 10000

- DBeaver connected as a desktop SQL client

That changes Hive from a terminal-only tool into a system that can be explored visually and queried from a much more comfortable interface.

For teaching, self-study, and local experimentation, this is a very practical improvement. You still keep the full Hadoop/Hive architecture underneath, but now you interact with it in a way that feels much closer to traditional SQL work.

## Next Step

At this point, the local stack is already useful for SQL exploration. A natural next step would be one of these:

- query larger datasets from DBeaver and inspect performance

- create views in Hive to simplify repeated analysis

- connect BI tools on top of HiveServer2

- move beyond CSV and start using ORC or Parquet

- replace the embedded metastore with MySQL or PostgreSQL for a more production-like architecture

## References

- Hadoop 3.3.6 on Ubuntu: Native Installation without Virtual Machine

- Running Your First MapReduce Job on Hadoop: WordCount on War and Peace

- Correcting Word Frequencies with Data Normalization: MapReduce Text Processing on War and Peace (Part 3)

- Apache Hive 3.1.3 on Ubuntu: Native Installation on Top of Hadoop 3.3.6

- From HDFS to SQL Queries: Loading CSV Files into Hive External Tables and Querying with SQL

- Apache Hive Official Documentation

- DBeaver Official Website

*Validated on March 24, 2026 on Ubuntu 24.04 with Hadoop 3.3.6, Hive 3.1.3, HiveServer2, and DBeaver in a local single-node academic environment.*
