---
title: 'Running Your First MapReduce Job on Hadoop: WordCount on War and Peace'
description: 'In Part 1 of this series we installed Hadoop 3.3.6 natively on Ubuntu 24.04 and got HDFS running in pseudo-distributed mode. That gave us a working distributed file system, but Hadoop is much more than storage — its true power lies in processing large datasets in...'
pubDate: 2026-03-01
heroImage: '/images/2026/03/map_reduce_war_peace21_compressed.png'
heroImageAlt: 'map reduce war peace21 compressed'
categories: ['Hadoop']
tags: []
toc: true
---

In [Part 1 of this series](https://cfocoder.com/hadoop-3-3-6-on-ubuntu-native-installation-without-virtual-machine/) we installed Hadoop 3.3.6 natively on Ubuntu 24.04 and got HDFS running in pseudo-distributed mode. That gave us a working distributed file system, but Hadoop is much more than storage — its true power lies in processing large datasets in parallel using the **MapReduce** programming model.

In this post we go one step further: we configure **YARN** (the resource manager that schedules and runs MapReduce jobs), write the canonical **WordCount** program from the official Apache Hadoop tutorial, and run it against the full text of *War and Peace* by Leo Tolstói — a 3.1 MB file with 562,488 words. By the end you will have a working MapReduce pipeline and concrete answers about word frequencies in one of the longest novels ever written.

## What Is YARN and Why Do We Need It?

When you read files from HDFS, you only need the NameNode and DataNode processes. But to *process* data with MapReduce, Hadoop needs a resource manager that can:

- Accept job submissions from clients

- Allocate CPU and memory containers on each node

- Launch the Map and Reduce tasks inside those containers

- Track progress and report results

That component is **YARN** (Yet Another Resource Negotiator), introduced in Hadoop 2. It consists of two daemons:

| Daemon          | Role                                                    |
| --------------- | ------------------------------------------------------- |
| ResourceManager | Master — accepts jobs, allocates resources cluster-wide |
| NodeManager     | Worker — manages containers on each individual node     |

On a single-node setup both run on the same machine. Before we can run any MapReduce program, YARN must be properly configured and running.

## Environment

All steps were executed on:

| Component   | Version / Value            |
| ----------- | -------------------------- |
| OS          | Ubuntu 24.04 LTS           |
| Java        | OpenJDK 21.0.10            |
| Hadoop      | 3.3.6                      |
| Hadoop home | ~/hadoop-3.3.6             |
| Shell       | Zsh (also works with Bash) |

**Prerequisites:** You must have Hadoop installed and HDFS running as described in [Part 1](https://cfocoder.com/hadoop-3-3-6-on-ubuntu-native-installation-without-virtual-machine/). Verify with `hdfs dfsadmin -report` before continuing.

## Step 1 — Configure YARN (yarn-site.xml)

YARN needs two properties to work in single-node mode. Open `~/hadoop-3.3.6/etc/hadoop/yarn-site.xml` and replace its empty `` block with:

```xml


        yarn.nodemanager.aux-services
        mapreduce_shuffle


        yarn.nodemanager.env-whitelist
        JAVA_HOME,HADOOP_COMMON_HOME,HADOOP_HDFS_HOME,HADOOP_CONF_DIR,CLASSPATH_PREPEND_DISTCACHE,HADOOP_YARN_HOME,HADOOP_HOME,PATH,LANG,TZ,HADOOP_MAPRED_HOME


```

**Why these two properties?**

- yarn.nodemanager.aux-services=mapreduce_shuffle tells the NodeManager to run the shuffle service, which is the mechanism that transfers intermediate Map output to the Reducer. Without it, the Reducer can never receive any data.

- yarn.nodemanager.env-whitelist controls which environment variables the NodeManager passes into the containers it launches. Without HADOOP_MAPRED_HOME in this list, the MapReduce Application Master container cannot find the Hadoop libraries it needs.

## Step 2 — Configure MapReduce (mapred-site.xml)

Open `~/hadoop-3.3.6/etc/hadoop/mapred-site.xml` and add the following (replacing the empty `` block):

```xml



        mapreduce.framework.name
        yarn




        mapreduce.application.classpath
        $HADOOP_MAPRED_HOME/share/hadoop/mapreduce/*:$HADOOP_MAPRED_HOME/share/hadoop/mapreduce/lib/*




        yarn.app.mapreduce.am.env
        HADOOP_MAPRED_HOME=/home/YOUR_USER/hadoop-3.3.6




        mapreduce.map.env
        HADOOP_MAPRED_HOME=/home/YOUR_USER/hadoop-3.3.6




        mapreduce.reduce.env
        HADOOP_MAPRED_HOME=/home/YOUR_USER/hadoop-3.3.6


```

Replace `YOUR_USER` with your actual Linux username (e.g., `hectorsa`). You can get it with `echo $USER`.

**Why the three `HADOOP_MAPRED_HOME` env properties?**

This is the most common stumbling block for newcomers. When YARN launches a MapReduce job, it runs three distinct JVM processes in separate containers:

- The Application Master (yarn.app.mapreduce.am.env) — coordinates the whole job

- Map tasks (mapreduce.map.env) — execute your Mapper logic

- Reduce tasks (mapreduce.reduce.env) — execute your Reducer logic

Each container is essentially a fresh process that doesn’t automatically inherit your shell’s environment variables. If `HADOOP_MAPRED_HOME` is not explicitly injected into each container, the JVM can’t find `hadoop-mapreduce-*.jar` and every job fails immediately with:

```text
Error: Could not find or load main class org.apache.hadoop.mapreduce.v2.app.MRAppMaster
Caused by: java.lang.ClassNotFoundException: org.apache.hadoop.mapreduce.v2.app.MRAppMaster
```

This exact error happened during our setup — it is **not** in the official single-node quickstart guide but is required in practice.

## Step 3 — Start (or Restart) YARN

If YARN was already running from a previous session, restart it to pick up the new configuration:

```text
stop-yarn.sh
start-yarn.sh
```

If this is a fresh start (HDFS already running):

```text
start-yarn.sh
```

Verify that all five Hadoop daemons are alive:

```text
jps
```

Expected output (process IDs will differ):

```text
12345 NameNode
12456 DataNode
12567 SecondaryNameNode
51803 ResourceManager
51991 NodeManager
```

You can also open the YARN web UI at `http://localhost:8088` to see the cluster is ready.

## Step 4 — Write the WordCount Program

Create a working directory and the Java source file:

```bash
mkdir -p ~/wordcount/src
```

Create `~/wordcount/src/WordCount.java` with the following content (this is the **WordCount v1.0** from the [official MapReduce Tutorial](https://hadoop.apache.org/docs/current/hadoop-mapreduce-client/hadoop-mapreduce-client-core/MapReduceTutorial.html)):

```python
import java.io.IOException;
import java.util.StringTokenizer;

import org.apache.hadoop.conf.Configuration;
import org.apache.hadoop.fs.Path;
import org.apache.hadoop.io.IntWritable;
import org.apache.hadoop.io.Text;
import org.apache.hadoop.mapreduce.Job;
import org.apache.hadoop.mapreduce.Mapper;
import org.apache.hadoop.mapreduce.Reducer;
import org.apache.hadoop.mapreduce.lib.input.FileInputFormat;
import org.apache.hadoop.mapreduce.lib.output.FileOutputFormat;

public class WordCount {

  public static class TokenizerMapper
       extends Mapper{

    private final static IntWritable one = new IntWritable(1);
    private Text word = new Text();

    public void map(Object key, Text value, Context context
                    ) throws IOException, InterruptedException {
      StringTokenizer itr = new StringTokenizer(value.toString());
      while (itr.hasMoreTokens()) {
        word.set(itr.nextToken());
        context.write(word, one);
      }
    }
  }

  public static class IntSumReducer
       extends Reducer {
    private IntWritable result = new IntWritable();

    public void reduce(Text key, Iterable values,
                       Context context
                       ) throws IOException, InterruptedException {
      int sum = 0;
      for (IntWritable val : values) {
        sum += val.get();
      }
      result.set(sum);
      context.write(key, result);
    }
  }

  public static void main(String[] args) throws Exception {
    Configuration conf = new Configuration();
    Job job = Job.getInstance(conf, "word count");
    job.setJarByClass(WordCount.class);
    job.setMapperClass(TokenizerMapper.class);
    job.setCombinerClass(IntSumReducer.class);
    job.setReducerClass(IntSumReducer.class);
    job.setOutputKeyClass(Text.class);
    job.setOutputValueClass(IntWritable.class);
    FileInputFormat.addInputPath(job, new Path(args[0]));
    FileOutputFormat.setOutputPath(job, new Path(args[1]));
    System.exit(job.waitForCompletion(true) ? 0 : 1);
  }
}
```

**How this program works — the MapReduce data flow:**

```text
Input file (HDFS)
      │
      ▼
 ┌──────────┐        Key-value pairs
 │  Mapper  │ ──────────────────────▶  ("the", 1), ("and", 1), ("the", 1) ...
 └──────────┘
      │
      ▼
 ┌──────────┐        Partial aggregation (local reduce before shuffle)
 │ Combiner │ ──────────────────────▶  ("the", 5), ("and", 3) ...
 └──────────┘
      │
      ▼  (shuffle & sort)
 ┌──────────┐        Final count per unique word
 │ Reducer  │ ──────────────────────▶  ("and", 20498), ("the", 31550) ...
 └──────────┘
      │
      ▼
Output file (HDFS)
```

- The Mapper splits each line into words using StringTokenizer and emits (word, 1) for every token.

- The Combiner (same class as the Reducer) runs locally on the Mapper output to reduce network traffic during the shuffle phase — it partially aggregates counts before they are sent to the Reducer.

- The Reducer receives all (word, [1, 1, 1, ...]) groups and sums them into the final count.

**Note on tokenization:** `StringTokenizer` splits on whitespace only. It does **not** strip punctuation, so `"war"`, `"war."`, `"war,"`, and `"war?"` are counted as four distinct tokens. Keep this in mind when interpreting results.

## Step 5 — Compile the Java Source

Use `hadoop classpath` to get all required JARs automatically instead of manually listing them:

```bash
mkdir -p ~/wordcount/classes
javac -classpath $(hadoop classpath) -d ~/wordcount/classes ~/wordcount/src/WordCount.java
```

This produces three `.class` files inside `~/wordcount/classes/`:

- WordCount.class

- WordCount\$TokenizerMapper.class

- WordCount\$IntSumReducer.class

## Step 6 — Package into a JAR

MapReduce jobs must be submitted as JAR files. Package the compiled classes:

```text
jar -cvf ~/wordcount/wordcount.jar -C ~/wordcount/classes/ .
```

Output confirms three classes were added:

```text
added manifest
adding: WordCount$IntSumReducer.class (deflated 57%)
adding: WordCount$TokenizerMapper.class (deflated 56%)
adding: WordCount.class (deflated 45%)
```

## Step 7 — Upload the Input File to HDFS

HDFS paths are separate from your local filesystem. Create an input directory in HDFS and upload the text file:

```text
# Create the input directory in HDFS
hdfs dfs -mkdir -p /user/$USER/input

# Upload the file
hdfs dfs -put /path/to/warandpeace.txt /user/$USER/input/

# Verify it was uploaded correctly
hdfs dfs -ls /user/$USER/input/
```

Expected output:

```text
Found 1 items
-rw-r--r--   1 hectorsa supergroup    3202320 2026-03-01  /user/hectorsa/input/warandpeace.txt
```

**Tip — paths with spaces:** The `hdfs dfs -put` command does not handle local paths with spaces well, even when quoted. If your local path contains spaces, copy the file to `/tmp` first:

```bash
cp "/path/with spaces/warandpeace.txt" /tmp/warandpeace.txt
hdfs dfs -put /tmp/warandpeace.txt /user/$USER/input/
```

## Step 8 — Run the WordCount Job

Submit the job to YARN:

```text
hadoop jar ~/wordcount/wordcount.jar WordCount \
  /user/$USER/input \
  /user/$USER/output
```

The output directory must **not** exist before running the job — Hadoop refuses to overwrite existing output to prevent accidental data loss. If you need to re-run, delete it first: `hdfs dfs -rm -r /user/$USER/output`

Watch the job progress in the terminal:

```text
INFO mapreduce.Job: Running job: job_1772374649976_0001
INFO mapreduce.Job:  map 0% reduce 0%
INFO mapreduce.Job:  map 100% reduce 0%
INFO mapreduce.Job:  map 100% reduce 100%
INFO mapreduce.Job: Job job_1772374649976_0001 completed successfully
```

The full run took about **30 seconds** on a 2-core Intel i5-7200U laptop with 32 GB RAM.

**Key counters from the job summary:**

| Counter                | Value     | Meaning                                    |
| ---------------------- | --------- | ------------------------------------------ |
| Map input records      | 63,845    | Lines in the input file                    |
| Map output records     | 562,488   | Total tokens (words) emitted by the Mapper |
| Combine output records | 41,621    | Unique tokens after local combining        |
| Reduce input groups    | 41,621    | Unique words sent to the Reducer           |
| Reduce output records  | 41,621    | Unique words in the final output           |
| Bytes read (HDFS)      | 3,202,442 | Input file size + split metadata           |
| Bytes written (HDFS)   | 462,958   | Output file size                           |

## Step 9 — Retrieve and Analyze the Results

Download the output from HDFS to your local machine:

```text
hdfs dfs -cat /user/$USER/output/part-r-00000 > /tmp/wordcount_results.txt
```

The output is a tab-separated file: `word\tcount` per line, sorted alphabetically by the Reducer.

### Exploring the results with standard Unix tools

```bash
# Count unique words
wc -l /tmp/wordcount_results.txt

# Top 10 most frequent words
sort -t$'\t' -k2 -nr /tmp/wordcount_results.txt | head -10

# Exact count for a specific word
grep "^peace\t" /tmp/wordcount_results.txt
grep "^war\t" /tmp/wordcount_results.txt

# Words with more than 1,000 occurrences
awk -F'\t' '$2 > 1000' /tmp/wordcount_results.txt | wc -l

# Unique words starting with a given letter (e.g., "S")
grep -i "^s" /tmp/wordcount_results.txt | wc -l
```

## Results: War and Peace Word Frequency Analysis

### 1. Unique words counted by the program

**41,621 unique tokens**

### 2. Top 5 most frequent words

| Rank | Word | Count  |
| ---- | ---- | ------ |
| 1    | the  | 31,550 |
| 2    | and  | 20,498 |
| 3    | to   | 16,252 |
| 4    | of   | 14,746 |
| 5    | a    | 9,984  |

No surprises here — these are the most common English function words (determiners, conjunctions, prepositions). They dominate any sufficiently large English corpus.

### 3. Occurrences of “peace”

The exact token `peace` (lowercase) appears **59 times**.

Because `StringTokenizer` does not strip punctuation, the word also appears as separate tokens: `peace.` (19), `peace,` (18), `peace!` (2), `Peace` (1), and several others. If you count all tokens that are clearly the word “peace” with attached punctuation, the total is **107 occurrences**.

### 4. Occurrences of “war”

The exact token `war` (lowercase) appears **166 times**.

With all punctuated variants (`war.`, `war,`, `War`, `war?`, `war!`, etc.): **284 occurrences**.

Despite the title, “war” appears far more often than “peace” — about 2.8× more when counting exact tokens. This reflects the novel’s extensive battlefield narratives.

### 5. Words with more than 1,000 occurrences

**56 words** exceed 1,000 occurrences. They are almost entirely English function words, plus a few notable proper nouns:

```text
the (31,550)   and (20,498)   to (16,252)   of (14,746)   a (9,984)
in (8,048)     his (7,632)    he (7,627)    that (7,222)  was (7,189)
...
Prince (1,499)                Pierre (1,261)
...
out (1,040)
```

The appearance of `Prince` (1,499) and `Pierre` (1,261) above the 1,000-occurrence threshold is notable — these are among the main characters of the novel, which confirms that word frequency can reveal narrative focus.

### 6. Words starting with the letter “S”

**4,428 unique tokens** in the output start with the letter `S` (case-insensitive, covering both `S` and `s`).

## Troubleshooting: Common Errors

### ClassNotFoundException: MRAppMaster

```text
Error: Could not find or load main class org.apache.hadoop.mapreduce.v2.app.MRAppMaster
```

**Cause:** The YARN containers don’t know where to find the Hadoop MapReduce JARs. **Fix:** Add the three `HADOOP_MAPRED_HOME` properties to `mapred-site.xml` as shown in Step 2. This is the single most common issue when first configuring YARN + MapReduce.

### Output directory already exists

```text
org.apache.hadoop.mapred.FileAlreadyExistsException: Output directory ... already exists
```

**Fix:** Delete the output directory before re-running: `hdfs dfs -rm -r /user/$USER/output`

### hdfs dfs -put fails silently on paths with spaces

**Fix:** Use a variable or copy the file to `/tmp` first (see Step 7).

### YARN doesn’t pick up configuration changes

After editing `mapred-site.xml` or `yarn-site.xml`, you **must restart YARN**:

```text
stop-yarn.sh
start-yarn.sh
```

## Quick Reference — Full Command Sequence

```bash
# 1. Configure files (done once)
#    Edit ~/hadoop-3.3.6/etc/hadoop/mapred-site.xml  → see Step 2
#    Edit ~/hadoop-3.3.6/etc/hadoop/yarn-site.xml    → see Step 1

# 2. Start all services
start-dfs.sh
start-yarn.sh
jps   # should show 5 processes

# 3. Write and compile WordCount
mkdir -p ~/wordcount/{src,classes}
# ... create WordCount.java in ~/wordcount/src/ ...
javac -classpath $(hadoop classpath) -d ~/wordcount/classes ~/wordcount/src/WordCount.java
jar -cvf ~/wordcount/wordcount.jar -C ~/wordcount/classes/ .

# 4. Upload input to HDFS
hdfs dfs -mkdir -p /user/$USER/input
hdfs dfs -put /tmp/myfile.txt /user/$USER/input/

# 5. Run the job
hdfs dfs -rm -r -f /user/$USER/output
hadoop jar ~/wordcount/wordcount.jar WordCount /user/$USER/input /user/$USER/output

# 6. Retrieve results
hdfs dfs -cat /user/$USER/output/part-r-00000 | sort -t$'\t' -k2 -nr | head -20

# 7. Stop all services when done
stop-yarn.sh
stop-dfs.sh
```

## Conclusion

In this post we went from a bare HDFS installation to a fully functional MapReduce pipeline:

- Configured YARN by adding shuffle and environment settings to yarn-site.xml

- Configured MapReduce by pointing it to YARN and, critically, injecting HADOOP_MAPRED_HOME into every container type in mapred-site.xml

- Wrote, compiled, and packaged the canonical WordCount program

- Processed a 3.1 MB real-world text file in ~30 seconds on a single laptop

- Analyzed the results using standard Unix tools

The key lesson beyond the configuration itself is that **YARN containers are isolated processes** — they don’t inherit your shell environment. You must explicitly pass any environment variable that the job’s JVM processes need. Once you understand that, a whole class of mysterious `ClassNotFoundException` errors becomes immediately diagnosable.

In a future post we’ll look at a more realistic MapReduce example that goes beyond word counting — one that requires custom partitioners, multiple output keys, and secondary sorting.
