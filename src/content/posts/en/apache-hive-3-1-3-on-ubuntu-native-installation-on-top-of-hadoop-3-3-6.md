---
title: 'Apache Hive 3.1.3 on Ubuntu: Native Installation on Top of Hadoop 3.3.6'
description: 'In Part 1 of this series, I installed Hadoop 3.3.6 natively on Ubuntu 24.04 and configured HDFS in pseudo-distributed mode. In Part 2, I configured YARN and ran the canonical WordCount job on War and Peace. In Part 3, I improved the text processing pipeline by...'
pubDate: 2026-03-10
heroImage: '/images/2026/03/apache_hive_reduced.png'
heroImageAlt: 'apache hive reduced'
categories: ['Hadoop']
tags: ['Hadoop', 'Data Engineering']
toc: true
---

In [Part 1 of this series](https://cfocoder.com/hadoop-3-3-6-on-ubuntu-native-installation-without-virtual-machine/), I installed Hadoop 3.3.6 natively on Ubuntu 24.04 and configured HDFS in pseudo-distributed mode. In [Part 2](https://cfocoder.com/running-your-first-mapreduce-job-on-hadoop-wordcount-on-war-and-peace/), I configured YARN and ran the canonical WordCount job on *War and Peace*. In [Part 3](https://cfocoder.com/correcting-word-frequencies-with-data-normalization-mapreduce-text-processing-on-war-and-peace-part-3/), I improved the text processing pipeline by normalizing words before counting them.

The natural next step in that learning path was to add a SQL layer on top of the Hadoop stack. That is exactly what Apache Hive provides.

In this post I document, step by step, how I installed **Apache Hive 3.1.3** on the same Ubuntu machine, why each configuration change was necessary, what went wrong in the first attempts, and how I fixed each issue until Hive was fully operational through **HiveServer2** and **Beeline**.

This was not a copy-paste installation. It required understanding how **Hadoop**, **Hive**, **Java**, logging, and authorization settings interact. That is precisely why it is worth documenting.

## What Is Hive and Why Add It on Top of Hadoop?

Up to Part 3, the Hadoop cluster could:

- store files in HDFS,

- allocate compute resources with YARN,

- and execute MapReduce jobs.

That is powerful, but also low-level.

If you want to process data using SQL or, more precisely, HiveQL instead of writing Java MapReduce code every time, you need an abstraction layer. Hive provides that layer. Conceptually, Hive sits above Hadoop and translates those queries into execution plans that run on the Hadoop ecosystem.

That means Hive is useful because it lets you:

- query data using HiveQL,

- create databases and tables on top of HDFS,

- manage metadata through a metastore,

- and interact with the Hadoop cluster in a more analytical way.

For a learning environment, Hive is important because it connects the distributed systems layer with the data warehousing / analytics layer.

## Starting Point: Existing Hadoop Environment

This installation was not done on a blank machine. It was done on top of an already-working single-node Hadoop environment.

### Base Environment

| Component           | Version / Value             |
| ------------------- | --------------------------- |
| OS                  | Ubuntu 24.04 LTS            |
| Machine             | Dell Vostro                 |
| Hadoop              | 3.3.6                       |
| Hadoop home         | /home/hectorsa/hadoop-3.3.6 |
| Shell               | Zsh                         |
| Java used by Hadoop | OpenJDK 11                  |

Before touching Hive, I verified that Hadoop was already healthy.

### Hadoop processes expected before installing Hive

```text
jps
```

Expected daemons:

- NameNode

- DataNode

- SecondaryNameNode

- ResourceManager

- NodeManager

### Critical HDFS persistence requirement

The course instructions explicitly required that HDFS data **must not** be stored in `/tmp`, because `/tmp` is not appropriate for persistent academic work.

This had already been corrected in my Hadoop configuration.

In `hdfs-site.xml`, the storage directories were configured as:

```xml

  dfs.namenode.name.dir
  file:///home/hectorsa/hadoop_data/hdfs/namenode

  dfs.datanode.data.dir
  file:///home/hectorsa/hadoop_data/hdfs/datanode

```

That means the DFS data lives in a persistent path under the home directory rather than in a temporary filesystem location.

This matters because Hive does not replace HDFS. It depends on it.

## Step 1 — Download Apache Hive 3.1.3

The course required **Apache Hive 3.1.3**, so I installed that exact version.

I downloaded the binary distribution from the Apache archive:

```bash
cd ~
wget https://archive.apache.org/dist/hive/hive-3.1.3/apache-hive-3.1.3-bin.tar.gz
tar -xzf apache-hive-3.1.3-bin.tar.gz
```

### Installation path

After extraction, Hive was installed at:

```text
/home/hectorsa/apache-hive-3.1.3-bin
```

At this point Hive was present on disk, but not yet functional.

And that distinction matters: **downloaded is not the same as installed, and installed is not the same as operational**.

## Step 2 — Add Hive Environment Variables

Because Hive is another big Java-based toolchain, it needs a predictable environment.

I added `HIVE_HOME` and updated `PATH` in both `~/.bashrc` and `~/.zshrc`:

```bash
# --- HIVE 3.1.3 CONFIG ---
export HIVE_HOME=/home/hectorsa/apache-hive-3.1.3-bin
export PATH=$PATH:$HIVE_HOME/bin
# -------------------------
```

Why do this?

Because without it:

- the hive and beeline commands are not globally available,

- every invocation would require full absolute paths,

- and shell sessions become inconsistent.

This is the same rationale used earlier for `HADOOP_HOME`: make the environment reproducible and explicit.

## Step 3 — Configure the Hive Metastore and Warehouse

Hive needs two things beyond just binaries:

- a metastore, which holds metadata about databases, tables, partitions, and schemas;

- a warehouse directory, where table data lives in HDFS.

For a local academic installation, the simplest metastore choice is **Apache Derby** in embedded mode.

So I created `hive-site.xml` with the following essential properties:

```xml


    javax.jdo.option.ConnectionURL
    jdbc:derby:;databaseName=/home/hectorsa/metastore_db;create=true
    Derby metastore for local academic install



    javax.jdo.option.ConnectionDriverName
    org.apache.derby.jdbc.EmbeddedDriver



    hive.metastore.warehouse.dir
    /user/hive/warehouse



    hive.server2.thrift.port
    10000



    hive.server2.thrift.bind.host
    localhost



    hive.metastore.schema.verification
    false


```

### Why these settings matter

#### Derby metastore

For learning purposes, Derby is the simplest path because:

- it requires no external database server,

- it keeps the installation self-contained,

- and it is enough for a single-user, single-node setup.

In production, people typically use MySQL or PostgreSQL. But for a local class environment, Derby is the right tradeoff.

#### Warehouse directory

Hive’s default warehouse location is `/user/hive/warehouse` in HDFS. That path must exist and be writable.

So I created it explicitly:

```text
hdfs dfs -mkdir -p /tmp
hdfs dfs -mkdir -p /user/hive/warehouse
hdfs dfs -chmod g+w /tmp
hdfs dfs -chmod g+w /user/hive/warehouse
```

This step is easy to underestimate, but Hive depends on it. If `/tmp` and `/user/hive/warehouse` are missing or have the wrong permissions, Hive cannot create tables correctly.

## Step 4 — Initialize the Metastore Schema

Once the configuration was in place, I initialized the metastore schema using `schematool`:

```text
$HIVE_HOME/bin/schematool -dbType derby -initSchema
```

This creates the internal metadata structures Hive needs in the Derby database.

Conceptually, this step is like the Hive equivalent of formatting a storage system before first use. Until the schema exists, Hive has nowhere to register databases and tables.

After this step, the metastore directory existed at:

```text
/home/hectorsa/metastore_db
```

## Step 5 — First Attempt: Version String Works, CLI Fails

At this point I could already run:

```text
hive --version
```

and get:

- Hive 3.1.3

So the installation looked successful.

But when I tried to actually use Hive, the first serious issue appeared.

## Step 6 — The Java Compatibility Problem

Hadoop 3.3.6 on this machine had been configured to use **Java 11**:

```bash
export JAVA_HOME=/usr/lib/jvm/java-11-openjdk-amd64
```

That was correct for my Hadoop setup.

However, Hive 3.1.3 did not behave well with that runtime in this local setup. The symptom appeared when invoking Hive CLI functionality, where I got a `ClassCastException` involving `AppClassLoader` and `URLClassLoader`.

That error was the key clue.

### What the error meant

That pointed away from the usual installation problems. The issue was **not**:

- a missing binary,

- a bad PATH,

- a corrupt download,

- or a broken metastore.

It was a **runtime compatibility issue** between Hive 3.1.3 and the Java version being used for execution.

This is an important lesson: with Hadoop ecosystem tools, version compatibility is often more important than installation syntax.

## Step 7 — Install Java 8 Specifically for Hive

Instead of downgrading the entire machine or risking the existing Hadoop setup, I chose the cleaner approach:

- keep Hadoop on Java 11,

- run Hive on Java 8.

I installed a local Java 8 runtime in the home directory:

```text
/home/hectorsa/jdk8u442-b06
```

After that, I configured Hive’s own environment file:

```bash
export JAVA_HOME=/home/hectorsa/jdk8u442-b06
export HADOOP_HOME=/home/hectorsa/hadoop-3.3.6
export HIVE_CONF_DIR=/home/hectorsa/apache-hive-3.1.3-bin/conf
export HIVE_AUX_JARS_PATH=/home/hectorsa/apache-hive-3.1.3-bin/lib
```

This was written to:

```text
/home/hectorsa/apache-hive-3.1.3-bin/conf/hive-env.sh
```

### Why not just switch the whole machine to Java 8?

Because that would have been the wrong architectural decision.

Hadoop was already stable on Java 11. Changing the entire stack to satisfy Hive would have introduced unnecessary risk. The better solution was to isolate the Java requirement to the tool that actually needed it.

That is the same principle used in production engineering:

- minimize blast radius,

- change only what must be changed,

- preserve working components.

## Step 8 — Why HiveServer2 Still Launched with Java 11

Even after setting `hive-env.sh` to Java 8, `HiveServer2` still launched using Java 11.

That was confusing at first, but the reason turned out to be very clear once I traced the startup path.

### Root cause

The file:

```text
/home/hectorsa/hadoop-3.3.6/etc/hadoop/hadoop-env.sh
```

contained this line:

```bash
export JAVA_HOME=/usr/lib/jvm/java-11-openjdk-amd64
```

Because HiveServer2 ends up using Hadoop’s shell stack underneath, that line overrode the Java 8 value I was trying to pass from Hive.

So the problem was not that Java 8 was missing. The problem was that Hadoop’s environment script was **re-imposing Java 11**.

## Step 9 — Patch Hadoop to Respect a Predefined JAVA_HOME

The fix was small but decisive.

I changed this line in `hadoop-env.sh`:

```bash
export JAVA_HOME=/usr/lib/jvm/java-11-openjdk-amd64
```

to this:

```bash
export JAVA_HOME=${JAVA_HOME:-/usr/lib/jvm/java-11-openjdk-amd64}
```

### Why this works

This is a standard shell pattern.

It means:

- if JAVA_HOME is already defined, use that value;

- otherwise, fall back to Java 11.

That gave me the best of both worlds:

- Hadoop keeps Java 11 as the default,

- Hive can explicitly inject Java 8 when needed.

This was the cleanest fix because it preserved backward compatibility while allowing per-tool overrides.

## Step 10 — Start HiveServer2 with Java 8

After patching `hadoop-env.sh`, I launched HiveServer2 again with Java 8 exported explicitly:

```bash
export JAVA_HOME=/home/hectorsa/jdk8u442-b06
export HADOOP_HOME=$HOME/hadoop-3.3.6
export HADOOP_CONF_DIR=$HADOOP_HOME/etc/hadoop
export HIVE_HOME=$HOME/apache-hive-3.1.3-bin
export PATH=$JAVA_HOME/bin:$PATH:$HADOOP_HOME/bin:$HADOOP_HOME/sbin:$HIVE_HOME/bin

$HIVE_HOME/bin/hiveserver2
```

This time the process launched using:

```text
/home/hectorsa/jdk8u442-b06/bin/java
```

That was the turning point.

### What changed technically

Before the patch:

- HiveServer2 startup path always resolved to Java 11.

After the patch:

- HiveServer2 respected the Java 8 JAVA_HOME from the shell.

And that made the runtime compatible with Hive 3.1.3.

## Step 11 — Confirm That HiveServer2 Opened Port 10000

HiveServer2 exposes its JDBC/Thrift interface on port **10000**.

Once the process started correctly, I checked the listening port:

```text
ss -ltn | grep 10000
```

Expected result:

```text
LISTEN 0 50 *:10000 *:*
```

This is a very important validation step, because it proves that:

- the server process is not only alive,

- but has also completed startup far enough to accept client connections.

A Java process existing in `ps` output is not enough. It might still be hanging during initialization. An open listening socket is much stronger evidence.

## Step 12 — The Second Problem: Authorization / Impersonation

Once HiveServer2 was listening, I connected with Beeline:

```text
beeline -u jdbc:hive2://localhost:10000 -n hectorsa
```

The first connection attempt still failed.

The error was essentially:

- user hectorsa is not allowed to impersonate hectorsa

This looks strange at first, but the explanation is straightforward.

### What was happening

HiveServer2 has a property called `hive.server2.enable.doAs`.

When `doAs` is enabled, HiveServer2 tries to execute operations on behalf of the connecting user. In more elaborate cluster environments that can be useful. But in a simple local single-user setup, it creates unnecessary authorization friction.

So the problem was not about bad credentials. It was about an unnecessary impersonation feature being active for a local academic environment.

## Step 13 — Disable doAs for the Local Single-User Setup

To solve that, I added this property to `hive-site.xml`:

```xml

  hive.server2.enable.doAs
  false

```

### Why this was the correct setting

Because this environment is:

- single node,

- single user,

- local machine,

- academic / experimental,

- not multi-tenant,

- not security-hardened for multiple users.

In that context, `doAs=false` is the pragmatic and correct choice.

After saving the change, I restarted HiveServer2.

## Step 14 — Connect Successfully with Beeline

After the Java fix and the authorization fix, Beeline connected successfully.

The command was:

```text
beeline -u jdbc:hive2://localhost:10000 -n hectorsa
```

And the important lines from the output were:

```text
Connecting to jdbc:hive2://localhost:10000
Connected to: Apache Hive (version 3.1.3)
Driver: Hive JDBC (version 3.1.3)
Beeline version 3.1.3 by Apache Hive
```

This is the most direct proof that HiveServer2 was functioning correctly.

It confirms:

- JDBC endpoint reachable,

- HiveServer2 responding,

- protocol negotiation successful,

- version correctly reported.

## Step 15 — Execute a Real Query

A connection alone is good, but not enough. I wanted functional proof.

So I executed:

```sql
show databases;
create database if not exists maestria_hive;
show databases;
```

The resulting output showed:

```text
+----------------+
| database_name  |
+----------------+
| default        |
| maestria_hive  |
+----------------+
```

That final result is what turns the installation from “the service starts” into “the platform works.”

It proves that Hive can:

- accept HiveQL commands,

- interact with the metastore,

- create database metadata,

- and return query results to the client.

## Final Validation Summary

At the end of the process, the system had all of the following working together:

### Hadoop base

- HDFS operational

- YARN operational

- Persistent HDFS storage outside /tmp

### Hive layer

- Apache Hive 3.1.3 installed

- Derby metastore initialized

- Hive warehouse configured in HDFS

- HiveServer2 running on localhost:10000

- Beeline successfully connected

- Database creation validated

## Troubleshooting Notes

This installation produced several useful lessons.

### 1. hive --version is not enough

Seeing a version string only proves the binary can execute. It does **not** prove the runtime, metastore, server mode, or authorization model are correct.

### 2. Java version mismatches are common in Hadoop ecosystem tools

The Hadoop family is extremely sensitive to version combinations. If something starts but behaves strangely, check Java compatibility before assuming configuration is wrong.

### 3. Environment scripts matter as much as XML files

In this case, the decisive fix was not in an XML file. It was in `hadoop-env.sh`. That is an important reminder that shell wrappers are part of the runtime architecture.

### 4. Single-user academic setups should stay simple

Features designed for multi-user production clusters, such as `doAs`, can become obstacles in a local learning environment.

### 5. Some warnings are cosmetic, but screenshots still matter

After Hive was working, one more issue remained: the CLI output was cluttered with **SLF4J multiple-binding warnings**. Functionally, they did not break Hive — the commands still worked — but they were ugly and distracting in screenshots.

The root cause was that:

- Hive brought its own SLF4J binding through log4j-slf4j-impl-2.17.1.jar

- Hadoop also exposed slf4j-reload4j-1.7.36.jar

I tested the obvious global fix — hiding Hadoop’s SLF4J binding JAR — and confirmed that it cleaned Hive output, but it also caused Hadoop itself to fall back to no-op logging. That was the wrong tradeoff.

So instead of changing Hadoop globally, I created **shell wrappers only for Hive commands**:

- hive_clean

- beeline_clean

- hiveserver2_clean

Those wrappers temporarily hide the conflicting Hadoop SLF4J binding only while Hive is running, then restore it immediately afterward.

The core implementation looked like this:

```bash
_hive_clean_run() {
  local jar="$HOME/hadoop-3.3.6/share/hadoop/common/lib/slf4j-reload4j-1.7.36.jar"
  local bak="$jar.__hidden_for_hive"

  export JAVA_HOME=/home/hectorsa/jdk8u442-b06
  export HADOOP_HOME=$HOME/hadoop-3.3.6
  export HADOOP_CONF_DIR=$HADOOP_HOME/etc/hadoop
  export HIVE_HOME=$HOME/apache-hive-3.1.3-bin
  export PATH=$JAVA_HOME/bin:$PATH:$HADOOP_HOME/bin:$HADOOP_HOME/sbin:$HIVE_HOME/bin

  if [ -f "$jar" ]; then mv "$jar" "$bak"; fi
  "$@"
  local rc=$?
  if [ -f "$bak" ]; then mv "$bak" "$jar"; fi
  return $rc
}

hive_clean() {
  _hive_clean_run "$HIVE_HOME/bin/hive" "$@"
}

beeline_clean() {
  _hive_clean_run "$HIVE_HOME/bin/beeline" "$@"
}

hiveserver2_clean() {
  _hive_clean_run "$HIVE_HOME/bin/hiveserver2" "$@"
}
```

I added those functions to my shell configuration so they were always available in new terminal sessions.

That gave me the best of both worlds:

- clean Hive screenshots,

- unchanged Hadoop behavior,

- and a reversible, low-risk solution.

## Conclusion

Installing Hive 3.1.3 on top of an existing Hadoop 3.3.6 installation turned out to be much more educational than simply unpacking a tarball.

The installation itself was straightforward. The real work was in understanding the interactions between:

- Hive and Hadoop,

- HiveServer2 and Beeline,

- Java 8 and Java 11,

- shell environment files and XML configuration,

- and authorization settings for a local single-user cluster.

The final result was a working Hive stack on Ubuntu, running natively on the same machine used in the previous parts of this series.

That means the environment can now:

- store data in HDFS,

- process it with MapReduce,

- and query it through Hive using SQL / HiveQL.

That is a meaningful milestone, because it moves the system from raw distributed infrastructure into the beginning of an analytical data platform.

In a future post, the logical next step would be to create actual Hive tables on top of HDFS data and compare the Hive workflow against equivalent MapReduce logic.

## Quick Reference

### Startup sequence

```text
# 1. Start Hadoop
start-dfs.sh
start-yarn.sh
jps

# 2. Start HiveServer2 cleanly in the background
source ~/.zshrc
nohup zsh -ic 'hiveserver2_clean' > ~/hiveserver2_clean.out 2>&1 &

# 3. Confirm HiveServer2 is listening
ss -ltn | grep 10000
```

Expected Hadoop daemons after `jps`:

- NameNode

- DataNode

- SecondaryNameNode

- ResourceManager

- NodeManager

If `ss` shows port `10000` in `LISTEN` state, HiveServer2 is up and ready.

### Shutdown sequence

```text
stop-yarn.sh
stop-dfs.sh
pkill -f Dproc_hiveserver2 || true
jps
```

HiveServer2 can sometimes remain as a Java `RunJar` process after Hadoop stops. `pkill -f Dproc_hiveserver2` handles that reliably.

The desired final state is that `jps` shows only:

- Jps

### Web UIs

- NameNode: http://localhost:9870

- ResourceManager: http://localhost:8088

### Hive commands

```text
# Check version
source ~/.zshrc
hive_clean --version

# Connect with Beeline
source ~/.zshrc
beeline_clean -u jdbc:hive2://localhost:10000 -n hectorsa
```

```sql
-- Common HiveQL
show databases;
create database if not exists maestria_hive;
```

```text
# Stop HiveServer2 explicitly
pkill -f Dproc_hiveserver2
```

Installation validated on March 12, 2026 on Ubuntu 24.04 with Hadoop 3.3.6, Hive 3.1.3, Java 11 for Hadoop, Java 8 for Hive, and clean shell wrappers for Hive CLI usage.
