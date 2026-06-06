---
title: "Building a Modern Frontier Data Stack: Hadoop 3.4.3, Hive 4.2.0, and MinIO S3 Integration in 2026"
description: "A few days ago, I published posts about how to install Hadoop 3.3.6 natively on Ubuntu. At that time, I thought it was the state of the art. But things in the Big Data world move fast."
pubDate: 2026-03-12
categories: ["Hadoop"]
tags: []
toc: true
---

## A bit of personal context

A few days ago, I published posts about how to install Hadoop 3.3.6 natively on Ubuntu. At that time, I thought it was the state of the art. But things in the Big Data world move fast.

Fast foward a few days, and when I had the chance to revisit my old setup, I decided to do something different: not just update, but **build from scratch a “Frontier Data Stack”** — using the newest versions released in early 2026.

Why build it on a Mac Mini with Ubuntu 24.04 instead of in the cloud? Because I believe it’s important to understand that **you don’t need a massive cloud budget to learn modern Big Data**. With a modest desktop machine (Intel i5, 16GB RAM), we can build something that looks and works like the stacks you see in production.

This post is as much for me as it is for you: a reference I can check when I need to reinstall in six months, and a path you can follow if you want to experiment with these technologies.

## What are we going to build?

Imagine your Mac Mini is a small “data company.” You need:

- Distributed file storage (Hadoop HDFS)

- A SQL-like data warehouse (Hive)

- Cloud-like storage locally that’s S3-compatible (MinIO)

- Everything working together, without components fighting over ports

That’s exactly what we’ll accomplish in this guide.

### The architecture we’ll build

```text
┌─────────────────────────────────────────────┐
│         Mac Mini (Ubuntu 24.04)             │
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │ Hadoop 3.4.3 (HDFS + YARN)          │    │
│  │ - NameNode on port 9010             │    │
│  │ - Local DataNode                    │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │ Hive 4.2.0 (Data Warehouse)         │    │
│  │ - Metastore for schemas             │    │
│  │ - Beeline CLI                       │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │ MinIO (S3-compatible Object Store)  │    │
│  │ - Buckets for data                  │    │
│  │ - S3A connector                     │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │ Java 21 LTS (Runtime)               │    │
│  │ - Engine for everything             │    │
│  └─────────────────────────────────────┘    │
└─────────────────────────────────────────────┘
```

## Prerequisites: A Modern Java Runtime

Before we start, we need to prepare the ground. Hadoop 3.4 and especially Hive 4.2.0 were designed with Java 21 in mind. While Java 17 works, Java 21 includes performance optimizations worth having.

### Why Java 21?

Java 21 introduced “Foreign Function & Memory” (FFM) features that allow modern libraries to access native system functionality more efficiently. Hive 4.2.0 uses JLine (a command-line library) that takes advantage of these features.

### Installation

```bash
sudo apt update && sudo apt install -y openjdk-21-jdk
```

Verify it installed correctly:

```text
java -version
# You should see something like:
# openjdk version "21.0.x" ...
```

This may take a few minutes. Time for a coffee break ☕

## Step 1: Hadoop 3.4.3 — The Engine of Your Data Lake

Hadoop 3.4.3 was released in January 2026 and is a significant leap forward. It includes important improvements in:

- S3A Connector: More stable with better concurrency handling

- ARM64 compatibility: Native support for ARM architectures

- Java 21 optimizations: Leverages the new runtime

### The challenge I faced: Port conflict

When I first installed Hadoop, HDFS tried to use port 9000 by default. But MinIO (already running on the Mac Mini) was occupying that port.

**The solution**: Move Hadoop’s NameNode to a different port — in my case, port 9010.

This is a good example of something you’ll see in production: when you have multiple services, you need to coordinate which services use which ports.

### Hadoop Configuration: core-site.xml

This file is the heart of Hadoop’s configuration. Here we tell it where HDFS lives and what port to contact it on.

```xml

    
        fs.defaultFS
        hdfs://localhost:9010
    

```

**What does this mean?**

- fs.defaultFS: The default file system. We’re saying “when someone wants to write to HDFS, connect to localhost on port 9010”

- hdfs://: The protocol — in other words, “I’m using HDFS, not S3, not GCS”

- :9010: The port where our NameNode listens

Once configured, Hadoop will know where to find its data even if you restart it.

## Step 2: Hive 4.2.0 — Your SQL Warehouse in the Data Lake

If Hadoop is distributed storage, Hive is the **schema manager and query engine**. Hive 4.2.0 is essentially a rewrite of the 3.x series and represents significant maturation of the project.

Why Hive and not Spark or Presto?

- Compatibility: Hive is the de facto standard in Hadoop legacy ecosystems

- Metastore: Hive maintains a metastore — a registry of all your schemas, tables, and columns

- SQL: You can use standard SQL, making it accessible even if you come from traditional database worlds

### The problem I encountered: “Unable to create a terminal”

During Hive initialization, when I tried to use `schematool` or `beeline`, I got a strange error:

```text
java.lang.IllegalStateException: Unable to create a terminal
```

What was happening?

The new JLine libraries in Hive 4.2 try to use Java 21’s FFM features to create native terminals. When you run commands in non-interactive contexts (like remote SSH or scripts), this fails because there’s no real terminal to interact with.

**The solution**: Add flags to `HADOOP_OPTS` to explicitly enable these features:

```bash
export HADOOP_OPTS="-Djava.library.path=$HADOOP_HOME/lib/native --enable-preview --enable-native-access=ALL-UNNAMED"
```

This tells Java: “I know this is a preview feature, but go ahead, allow it.”

## Step 3: Connecting Hadoop to MinIO with S3A

This is where the real magic happens. MinIO is an S3-compatible object storage server you can run locally. But for Hadoop and Hive to read data from MinIO, they need the S3A connector.

### The important change: AWS SDK v2

If you search for old tutorials, you’ll find references to “aws-java-sdk-1.x.jar”. **That no longer works**. Hadoop 3.4.3 has completely migrated to **AWS SDK v2**.

**What does this mean?**

- v1 and v2 are completely different APIs

- v1 jars are incompatible with Hadoop 3.4.3

- You need the correct version

### Installing the AWS SDK v2 bundle

- Download the correct bundle: The version that matches Hadoop 3.4.3’s POM is 2.35.4wget https://repo1.maven.org/maven2/software/amazon/awssdk/aws-java-sdk-bundle/2.35.4/aws-java-sdk-bundle-2.35.4.jar

- Copy it to two locations:# In the Hadoop folder cp aws-java-sdk-bundle-2.35.4.jar \$HADOOP_HOME/share/hadoop/common/lib/ # Also in Hive (so Hive can access S3A) cp aws-java-sdk-bundle-2.35.4.jar \$HIVE_HOME/lib/

**Why two locations?** Because both Hadoop and Hive need access to the connector. It’s like having a key in two different places to ensure whoever needs it, finds it.

### Configuring S3A in core-site.xml

After copying the jars, Hadoop needs to know how to connect to MinIO. Add this to your `core-site.xml`:

```xml

    fs.s3a.endpoint
    http://minio-server:9000

    fs.s3a.access.key
    YOUR_MINIO_ACCESS_KEY

    fs.s3a.secret.key
    YOUR_MINIO_SECRET_KEY

    fs.s3a.path.style.access
    true

```

## Step 4: Your First MapReduce Job with Python

This is where we test that everything works. Instead of writing complex Java code, we’ll use **Hadoop Streaming** — an elegant way to run MapReduce jobs using any language that can read stdin and write to stdout.

### What is Hadoop Streaming?

Hadoop Streaming is a utility that lets you use any executable as a mapper or reducer. It doesn’t care what language you use — Python, Bash, Ruby, Perl, Node.js, whatever. As long as your program reads from stdin and writes to stdout, Hadoop can orchestrate it.

This is a paradigm shift from the traditional approach:

**Traditional way (Java MapReduce):**

```text
You write Java code → Compile to .jar → Submit to Hadoop →
Hadoop runs your compiled Java → Get results
```

**Hadoop Streaming way:**

```text
You write a script in any language → Submit to Hadoop →
Hadoop pipes data through your script → Get results
```

### Why Hadoop Streaming is better than traditional Java MapReduce

- Language agnostic: Write in Python, Go, R, whatever you’re comfortable with. You’re not locked into Java.

- Development speed: A Python script takes minutes to write and test. Java requires compilation, packaging, JAR creation, debugging classpath issues… hours.

- Lower barrier to entry: Most data engineers and data scientists know Python. Very few want to write Java MapReduce code.

- Easy debugging: You can test your mapper/reducer locally with simple shell pipes before submitting to Hadoop:# Test mapper locally cat input.txt | python3 mapper.py # Test full pipeline locally cat input.txt | python3 mapper.py | sort | python3 reducer.py

- Version control friendly: Plain text scripts. No need to commit binary JARs.

- Flexibility: Sometimes you need to call external tools, parse complex formats, or use ML libraries. Much easier in Python than Java.

- Production-ready: Hadoop Streaming isn’t “toy” code. Companies like Spotify, Airbnb, and Netflix used/use it for serious production workloads.

### Common Hadoop Streaming parameters explained

The command we’ll use has many optional parameters. Here are the most important ones:

```text
hadoop jar hadoop-streaming.jar \
    -files               # Files to distribute to nodes (your scripts)
    -mapper            # The mapper command/script
    -reducer           # The reducer command/script
    -input                # Input file path (HDFS or S3)
    -output               # Output directory path
    -numReduceTasks          # Number of reducers (default: 1)
    -partitioner         # Custom partitioner (advanced)
    -combiner          # Optional combiner for optimization
    -jobconf         # Additional job configuration
    -inputformat        # Input format (TextInputFormat by default)
    -outputformat       # Output format (TextOutputFormat by default)
    -lazyOutput                 # Don't create output files until job finishes
```

**The ones you’ll use 90% of the time:**

- -files: Distributes your mapper/reducer to all nodes

- -mapper: The script that processes each line

- -reducer: The script that aggregates results

- -input: Where your data lives

- -output: Where results go

- -numReduceTasks: How many parallel reducers (more = faster, but more network I/O)

**Example with numReduceTasks:**

```text
hadoop jar $HADOOP_HOME/share/hadoop/tools/lib/hadoop-streaming-3.4.3.jar \
    -files mapper.py,reducer.py \
    -mapper "python3 mapper.py" \
    -reducer "python3 reducer.py" \
    -input s3a://hive-data/test_folder/warandpeace.txt \
    -output s3a://hive-data/output_python \
    -numReduceTasks 4  # Use 4 parallel reducers instead of default 1
```

### Why Python specifically?

For this guide:

- It’s accessible for beginners

- Scripts are simple and readable

- Hadoop handles the distribution and coordination

- It’s excellent for learning how MapReduce works without Java complexity

### The Mapper: mapper.py

```python
#!/usr/bin/env python3
import sys

for line in sys.stdin:
    words = line.strip().split()
    for word in words:
        print(f'{word}\t1')
```

**What does it do?**

- Reads each line from input

- Splits the line into words

- For each word, emits word\t1 (one word, count 1)

Example: If the input is “hello world”, it emits:

```text
hello	1
world	1
```

### The Reducer: reducer.py

```python
#!/usr/bin/env python3
import sys

current_word = None
current_count = 0

for line in sys.stdin:
    line = line.strip()
    if not line:
        continue

    word, count = line.split('\t', 1)
    count = int(count)

    if word != current_word:
        if current_word:
            print(f'{current_word}\t{current_count}')
        current_word = word
        current_count = 0

    current_count += count

if current_word:
    print(f'{current_word}\t{current_count}')
```

**What does it do?**

- Receives key-value pairs from the Mapper (already grouped by word)

- Sums all the counts for each word

- Emits the word with its total count

Example: If it receives:

```text
hello	1
hello	1
world	1
```

It emits:

```text
hello	2
world	1
```

### Running the job on MinIO data

Suppose you have a file `warandpeace.txt` in MinIO, in the `hive-data` bucket with path `test_folder/`:

```text
hadoop jar $HADOOP_HOME/share/hadoop/tools/lib/hadoop-streaming-3.4.3.jar \
    -files mapper.py,reducer.py \
    -mapper "python3 mapper.py" \
    -reducer "python3 reducer.py" \
    -input s3a://hive-data/test_folder/warandpeace.txt \
    -output s3a://hive-data/output_python
```

**Breaking down the command:**

- hadoop jar: Run a Hadoop job

- -files mapper.py,reducer.py: “Send these scripts to each participating node”

- -mapper "python3 mapper.py": “The mapper is this Python command”

- -input s3a://...: “Read from MinIO (note the s3a:// prefix)”

- -output s3a://...: “Write results here”

Hadoop automatically:

- Reads the input file

- Divides it into chunks

- Sends each chunk to a Mapper in parallel

- Groups the outputs by key

- Sends each group to a Reducer

- Writes the final result

### Interpreting the results

After the job completes successfully, results will be in `s3a://hive-data/output_python/`. For a 562,488-word file (like War and Peace), you’ll typically see:

```text
and     20,498
the     31,550
to      16,252
...
```

These are the most frequent words in the book, counted distributively across Hadoop.

## Step 5: Troubleshooting — The MRAppMaster Problem

If you get to this point, you’ll probably encounter this error:

```text
java.lang.ClassNotFoundException: org.apache.hadoop.mapreduce.v2.app.MRAppMaster
```

This error is more common than you’d think, and it points to a specific problem: **YARN containers can’t find MapReduce libraries**.

### What’s happening?

YARN (Yet Another Resource Negotiator) is Hadoop’s resource manager. When you run a job:

- YARN creates containers (processes) on nodes

- Those containers need access to MapReduce libraries

- If they don’t know where to look, it fails

### The solution: Two key configurations

**1. In mapred-site.xml:**

```xml

    mapreduce.application.classpath
    $HADOOP_MAPRED_HOME/share/hadoop/mapreduce/*:$HADOOP_MAPRED_HOME/share/hadoop/mapreduce/lib/*

```

**2. In bash (before running jobs):**

```bash
export HADOOP_MAPRED_HOME=$HADOOP_HOME
```

This tells Hadoop: “When you create containers, include these paths in the CLASSPATH.”

## Validating that everything works

Before considering it “ready for production” (or at least, “ready to experiment”), verify each component:

### 1. Java is installed

```text
java -version
# You should see Java 21
```

### 2. Hadoop is running

```text
jps
# You should see: NameNode, DataNode, SecondaryNameNode
```

### 3. Hive can connect

```text
beeline -u jdbc:hive2://localhost:10000/
# You should be able to connect (though it may spam warnings)
```

### 4. MinIO is accessible

```text
# Using an S3 client or curl:
aws s3 --endpoint-url http://localhost:9000 ls s3://hive-data/
```

### 5. A simple job works

```bash
echo -e "hello world\nhello hadoop" | \
  hadoop jar $HADOOP_HOME/share/hadoop/tools/lib/hadoop-streaming-3.4.3.jar \
    -mapper "cat" \
    -reducer "uniq -c"
```

If you see output without errors, you’re ready!

## What are the numbers?

After running our Word Count on War and Peace:

- Total words processed: 562,488

- Map tasks executed: 2 (Hadoop split the file into 2 chunks)

- Reduce tasks executed: automatic (Hadoop optimizes this)

- Total time: Seconds (on a Mac Mini, incredibly fast)

**Most frequent words:**

- “the” — 31,550 times

- “and” — 20,498 times

- “to” — 16,252 times

Interesting, right? The three articles/conjunctions dominate, as expected in English.

## Reflection: Why build this locally?

When I tell people I’m setting up a Big Data stack on a 2012 desktop machine running Ubuntu, they typically give this look 😐

But I think there’s something valuable here you won’t get in the cloud:

- You understand each component — There’s no magic abstraction. You see exactly how Hadoop divides files, how Hive maintains its metastore, how MinIO serves data.

- You can experiment fearlessly — Want to know what happens if you change the port? Try it. Want to understand how YARN behaves under pressure? Run 100 jobs. No need to pay for every mistake.

- You learn what matters in production — The same challenges we overcome here (port conflicts, classpath issues, SDK versions) are exactly what you’ll face in an AWS or Databricks cluster.

- It’s reproducible — This guide is technically for me (for when I need to reinstall in six months), but it’s also a map for you.

## Next steps: Now it’s your turn

If you made it this far and you have a Mac Mini, an old server, a laptop with enough RAM… **give it a try**.

Here’s what you could do:

- Start with Java 21 — Following Step 1 exactly

- Then Hadoop — Once jps shows the processes, you know it works

- Then Hive and MinIO — The background services

- Finally, a MapReduce job — That first time you see a distributed job work on your machine is magical

You don’t have to do it all at once. Even if you just experiment with Hadoop + Python streaming, you’ll have learned something important: **how distributed systems think**.

And if something doesn’t work — if you find a port is occupied, or classpath behaves strangely — it’s not a failure. It’s exactly how you learn. I’ve been through all these problems, and documenting them here is as much about reminding myself as it is about saving you frustration.

**Will you give it a try? If you do, tell me in the comments what surprised you most. Was it the speed? The conceptual simplicity versus configuration complexity? Or just that feeling of “wow, it actually worked”?**

## Quick Reference: URLs and Endpoints

A quick reference table to access the main services. Keep this handy so you don’t have to search through logs or remember port numbers.

| Service | URL/Endpoint | Port | Purpose |
|---|---|---|---|
| Hadoop NameNode Web UI | http://localhost:9870 | 9870 | Monitor HDFS, file system status, job tracking |
| Hadoop HDFS | hdfs://localhost:9010 | 9010 | HDFS NameNode (configured port) |
| Hadoop Secondary NameNode | http://localhost:9868 | 9868 | Backup NameNode monitoring |
| YARN ResourceManager | http://localhost:8088 | 8088 | Monitor running jobs, cluster resources |
| YARN NodeManager | http://localhost:8042 | 8042 | Individual node resource status |
| Hive Server 2 | jdbc:hive2://localhost:10000 | 10000 | JDBC connection for SQL queries |
| Beeline (Hive CLI) | localhost:10000 | 10000 | Interactive Hive query shell |
| MinIO Console | http://localhost:9001 | 9001 | MinIO web interface (if running) |
| MinIO S3 API | http://localhost:9000 | 9000 | S3-compatible API endpoint |
| Java Version Check | java -version | N/A | Verify Java 21 installation |
| Hadoop Version Check | hadoop version | N/A | Verify Hadoop 3.4.3 installation |
| Hive Version Check | beeline --version | N/A | Verify Hive 4.2.0 installation |

### Quick connectivity tests

```text
# Test Hadoop HDFS
hdfs dfs -ls /

# Test Hive connectivity
beeline -u jdbc:hive2://localhost:10000/ -e "SELECT 1;"

# Test MinIO S3
aws s3 --endpoint-url http://localhost:9000 ls s3://hive-data/

# Check all Java processes running
jps -l

# Check active ports
netstat -tlnp | grep -E ':(9010|9870|10000|9000|9001)'
```

## References and resources

- Apache Hadoop Official Docs: https://hadoop.apache.org/docs/

- Apache Hive Documentation: https://hive.apache.org/

- AWS SDK for Java v2: https://github.com/aws/aws-sdk-java-v2

- MinIO Documentation: https://min.io/docs/

- Java 21 Release Notes: https://www.oracle.com/java/technologies/javase/21-0-1-relnotes.html
