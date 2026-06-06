---
title: 'Hadoop 3.3.6 on Ubuntu: Native Installation without Virtual Machine'
description: 'When I started working with Hadoop in a learning environment, the course guide indicated using Linux Mint in a virtual machine. However, I already had Ubuntu 24.04 installed natively on my Dell Vostro with 32 GB of RAM, and it seemed smarter to leverage it directly. In...'
pubDate: 2026-02-23
heroImage: '/images/2026/02/hadoop.jpg'
heroImageAlt: 'hadoop'
categories: ['Hadoop']
tags: []
toc: true
---

When I started working with Hadoop in a learning environment, the course guide indicated using Linux Mint in a virtual machine. However, I already had Ubuntu 24.04 installed natively on my Dell Vostro with 32 GB of RAM, and it seemed smarter to leverage it directly. In this post I documented the complete process for reference — and because I’m convinced that installing it natively is the correct technical decision.

“This post covers HDFS only. To configure YARN and run MapReduce jobs, see Part 2: [Running WordCount on War and Peace](https://cfocoder.com/running-your-first-mapreduce-job-on-hadoop-wordcount-on-war-and-peace/).”

## Why native installation on Ubuntu instead of a VM?

The decision has both practical and technical merit:

- No virtualization overhead: A VM consumes between 2 and 4 GB of RAM just by existing. With native installation, Hadoop has direct access to all 32 GB.

- Ubuntu is the production standard: It’s the operating system used by AWS, Cloudera, and most real cloud environments. Working on it from the start makes sense.

- Real performance: There’s no latency from the virtualization layer. Commands and response times reflect what you’d see on a real server.

- Ubuntu 24.04 was already configured and working: There was no reason to add an unnecessary layer.

The result: HDFS and MapReduce running natively with all the machine’s resources available. The Pi test took 41 seconds — a good starting point for the next step: installing Hive on top of this same stack.

## Step 1: Verify Prerequisites

Before installing anything, I verified the status of Java and SSH, which are Hadoop’s two prerequisites:

```bash
java -version
# Result: OpenJDK version 21.0.10

ssh -V
# Result: OpenSSH_9.6p1
```

## Step 2: Install Java 11

```bash
sudo apt update && sudo apt install -y openjdk-11-jdk
```

It installs at: `/usr/lib/jvm/java-11-openjdk-amd64`

## Step 3: Configure SSH without Password

This is important: Hadoop uses SSH to communicate with itself, even when it’s a single node. If we don’t configure this, it won’t start.

```bash
# Create SSH key without password
ssh-keygen -t rsa -P '' -f ~/.ssh/id_rsa

# Authorize my own key
cat ~/.ssh/id_rsa.pub >> ~/.ssh/authorized_keys
chmod 0600 ~/.ssh/authorized_keys

# Test that it works (the first time it will ask to confirm the fingerprint — type "yes")
ssh localhost
```

After typing `yes` the first time, subsequent connections should enter without asking for a password. If it still asks, verify that `~/.ssh/authorized_keys` has `600` permissions and `~/.ssh` has `700` permissions.

## Step 4: Download Hadoop 3.3.6

I used version 3.3.6 (the official guide points to 3.4.2, but 3.3.6 is the stable version recommended for this stack). The official Apache binary is downloaded:

```bash
# Download (~700 MB)
wget https://archive.apache.org/dist/hadoop/common/hadoop-3.3.6/hadoop-3.3.6.tar.gz

# Decompress in home
tar -xzf hadoop-3.3.6.tar.gz

# Clean up the tar to save space
rm hadoop-3.3.6.tar.gz
```

💡 **Tip**: On my first download I had an EOF error due to partial file corruption. If that happens, use `wget -c` to resume the download from where it stopped.

## Step 5: Configure Environment Variables

I use Zsh, so variables go in `~/.zshrc`. If you use Bash, the file is `~/.bashrc`.

```bash
# --- HADOOP 3.3.6 CONFIG ---
export JAVA_HOME=/usr/lib/jvm/java-11-openjdk-amd64
export HADOOP_HOME=$HOME/hadoop-3.3.6
export PATH=$PATH:$HADOOP_HOME/bin:$HADOOP_HOME/sbin
export HADOOP_CONF_DIR=$HADOOP_HOME/etc/hadoop
# ---------------------------
```

To activate the changes without restarting the terminal:

```text
source ~/.zshrc
```

## Step 6: Configure XML Files

We edit five files in `~/hadoop-3.3.6/etc/hadoop/`. All five are necessary for HDFS, MapReduce, and YARN to operate in pseudo-distributed mode:

### hadoop-env.sh

Explicitly tell it the path to Java 11, so it doesn’t use the version 21 that’s also installed on the system:

```bash
export JAVA_HOME=/usr/lib/jvm/java-11-openjdk-amd64
```

### core-site.xml

We define the default filesystem (HDFS) and what port the NameNode listens on:

```xml


        fs.defaultFS
        hdfs://localhost:9000


```

### hdfs-site.xml

Since there’s only one node, replication must be `1`. In a real cluster with multiple nodes the standard value is `3`:

```xml


        dfs.replication
        1


```

### mapred-site.xml

This file is critical: without it, Hadoop runs MapReduce jobs in **local mode** ignoring YARN completely, even though the daemons are active. You must explicitly tell it to use YARN as the framework:

```xml


        mapreduce.framework.name
        yarn


        mapreduce.application.classpath
        $HADOOP_MAPRED_HOME/share/hadoop/mapreduce/*:$HADOOP_MAPRED_HOME/share/hadoop/mapreduce/lib/*


```

### yarn-site.xml

Enables the shuffle service, necessary for data to be transferred between the Map and Reduce phases:

```xml


        yarn.nodemanager.aux-services
        mapreduce_shuffle


        yarn.nodemanager.env-whitelist
        JAVA_HOME,HADOOP_COMMON_HOME,HADOOP_HDFS_HOME,HADOOP_CONF_DIR,CLASSPATH_PREPEND_DISTCACHE,HADOOP_YARN_HOME,HADOOP_HOME,PATH,LANG,TZ,HADOOP_MAPRED_HOME


```

## Step 7: Format the NameNode

This step is equivalent to “formatting the disk” of HDFS. **It’s run only once**, when setting up the cluster for the first time:

```text
hdfs namenode -format
```

✅ If you see: `Storage directory /tmp/hadoop-/dfs/name has been successfully formatted`, everything is ready.

## Step 8: Start the Services

The services are started with two separate commands:

```text
# First HDFS (the file system)
start-dfs.sh

# Then YARN (the resource manager for MapReduce)
start-yarn.sh
```

To verify that everything started correctly:

```text
$ jps
12345 NameNode
12346 DataNode
12347 SecondaryNameNode
12348 ResourceManager
12349 NodeManager
12350 Jps
```

Those 5 processes should appear (plus `Jps`, which is the verification command itself). If any are missing, something went wrong in the previous configuration.

## Step 9: Web Monitoring Interfaces

Hadoop includes web dashboards to monitor cluster status in real-time:

- HDFS NameNode: http://localhost:9870 — File system status, space usage, replicated blocks.

- YARN ResourceManager: http://localhost:8088 — Running jobs, cluster resource utilization.

## Step 10: Final Validation — Calculate Pi with MapReduce

The ultimate test. Hadoop includes precompiled examples, and the classic one is estimating the value of Pi using MapReduce. If this job runs correctly, the entire installation is properly configured:

```text
hadoop jar ~/hadoop-3.3.6/share/hadoop/mapreduce/hadoop-mapreduce-examples-3.3.6.jar pi 2 10
```

What this command does:

- Launches 2 mappers (parallel processes)

- With 10 samples each

- The reducer consolidates the results and approximates the value of Pi

📊 **Result on my machine**: `Job Finished in 41.761 seconds. Estimated value of Pi is 3.14159265358979323846`

A successful job confirms that:

- ✅ HDFS is operational (data writing and reading)

- ✅ YARN is managing resources correctly

- ✅ MapReduce processed the data without errors using YARN

- ✅ The 5 daemons working in sync

## Summary: What Do We Have at the End?

A Hadoop Pseudo-Distributed cluster running natively on Ubuntu:

- ✅ Operational HDFS — create folders, upload files, list directories

- ✅ Working MapReduce — execute jobs and custom programs

The natural next step is to install **Apache Hive** on top of this same cluster to add a SQL layer to the ecosystem.

⚠️ **Data Persistence**: By default Hadoop stores data in `/tmp`, which Linux cleans up on reboot. If you’re going to use this installation continuously, apply the steps in the next section before loading real data.

## Update: Data Persistence (Permanent Configuration)

- Create permanent directories in the home directory:

```bash
mkdir -p ~/hadoop_data/hdfs/namenode
mkdir -p ~/hadoop_data/hdfs/datanode
```

- Update hdfs-site.xml with the new paths (replace  with your actual username):

```xml

    dfs.namenode.name.dir
    file:///home//hadoop_data/hdfs/namenode

    dfs.datanode.data.dir
    file:///home//hadoop_data/hdfs/datanode

```

- Stop the cluster, reformat the NameNode with the new paths, and restart:

```text
stop-yarn.sh && stop-dfs.sh
hdfs namenode -format
start-dfs.sh && start-yarn.sh
```

⚠️ Reformatting deletes any previous data in HDFS. Apply this step only if it’s a fresh installation or if you don’t have important data in `/tmp`.

## Cheat Sheet: Cluster Startup and Shutdown

Each time you start the system, these are the commands to bring up and down the cluster:

```text
# To START the cluster:
start-dfs.sh
start-yarn.sh
jps  # Verify that the 5 processes appear

# To SHUTDOWN the cluster:
stop-yarn.sh
stop-dfs.sh
```

_Installation verified on February 21, 2026 on Ubuntu 24.04 with Hadoop 3.3.6, Java 11, and Zsh._
