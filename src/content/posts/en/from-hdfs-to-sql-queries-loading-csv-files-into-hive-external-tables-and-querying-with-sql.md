---
title: 'From HDFS to SQL Queries: Loading CSV Files into Hive External Tables and Querying with SQL'
description: 'Part 5 in the Hadoop and Hive Tutorial Series'
pubDate: 2026-03-18
heroImage: '/images/2026/03/hive_sql_queries.png'
heroImageAlt: 'hive sql queries'
categories: ['Hadoop']
tags: []
toc: true
---

**Part 5 in the Hadoop and Hive Tutorial Series**

## Introduction

When I completed the installation of Hadoop 3.3.6 and Apache Hive 3.1.3 on my Ubuntu machine, I had everything running smoothly. But then came a practical question that every data engineer faces: *How do I actually get data into this system and query it?*

This is not a trivial task. The process involves understanding the distributed nature of HDFS, the abstraction layer that Hive provides, and the power of SQL queries on distributed data. In this guide, I’ll walk you through the complete journey: taking local CSV files, loading them into HDFS, creating Hive external tables, and executing SQL queries that span across your Hadoop cluster.

This tutorial assumes you have:

- Hadoop 3.3.6 installed and running (see Part 1)

- Apache Hive 3.1.3 configured on top of Hadoop (see Part 4)

- Basic familiarity with HDFS commands (from Part 2)

## Understanding the Architecture: Why External Tables?

Before diving into the steps, let me explain *why* we’re using external tables instead of managed tables.

When you create a **managed table** in Hive, Hive takes ownership of the data. If you drop the table, the data is deleted forever. This is powerful for controlled environments, but it’s risky for data that may have been created by other processes.

An **external table**, by contrast, is a reference to data that lives in HDFS but is not owned by Hive. If you drop an external table, only the metadata is deleted—the actual files in HDFS remain untouched. This is the pattern you’ll see in production environments because it allows multiple tools (Spark, MapReduce, custom applications) to work with the same data independently.

Think of it this way:

- Managed Table: Hive owns the house and all the furniture

- External Table: Hive just has the key to someone else’s house

For data that originates from multiple sources or needs to be accessed by multiple systems, external tables are the right choice.

## Step 1: Prepare Your CSV Files

Let’s start with your local data. In this example, I’m working with two CSV files containing Mexican IMSS (Instituto Mexicano del Seguro Social) worker statistics:

```text
/home/hectorsa/Downloads/imss_trabajadores_tipo.csv
/home/hectorsa/Downloads/imss_trabajadores_por_estado.csv
```

First, verify your CSV files exist and check their structure:

```bash
head -5 /home/hectorsa/Downloads/imss_trabajadores_tipo.csv
```

**Expected Output:**

```text
Fecha,tipo,trabajadores
01-02-26,trabajadores permanentes,19696459
01-02-26,trabajadores eventuales urbanos,2740705
01-02-26,trabajadores eventuales agricolas,384289
01-02-26,Aprendices,158892
```

The second file:

```bash
head -5 /home/hectorsa/Downloads/imss_trabajadores_por_estado.csv
```

**Expected Output:**

```text
Fecha,Estado,Trabajadores
02-01-26,Aguascalientes,365138
02-01-26,Baja California,1014902
02-01-26,Baja California Sur,174803
02-01-26,Campeche,366502
```

✅ **Key Point**: Note the exact column names and order. These will become your table schema in Hive.

## Step 2: Verify Your Hadoop and HDFS Setup

Before uploading anything to HDFS, verify that your Hadoop cluster is running:

```text
jps
```

**Expected Output:**

```text
12345 DataNode
12346 SecondaryNameNode
12347 NameNode
12348 ResourceManager
12349 NodeManager
```

Also verify HDFS connectivity:

```text
hdfs dfs -ls /
```

**Expected Output:**

```text
Found 2 items
drwxrwxr-x   - hectorsa supergroup          0 2026-03-12 12:28 /tmp
drwxr-xr-x   - hectorsa supergroup          0 2026-03-12 10:58 /user
```

✅ **Validation**: If you see these directories and no errors, HDFS is accessible.

## Step 3: Create HDFS Directories for Your Data

Organize your data by creating a structured directory hierarchy in HDFS. This is not just good practice—it’s essential for managing large-scale data operations.

```text
hdfs dfs -mkdir -p /user/hectorsa/imss_data/trabajadores_tipo
hdfs dfs -mkdir -p /user/hectorsa/imss_data/trabajadores_por_estado
```

Verify the directories were created:

```text
hdfs dfs -ls /user/hectorsa/imss_data/
```

**Expected Output:**

```text
Found 2 items
drwxr-xr-x   - hectorsa supergroup          0 2026-03-18 13:04 /user/hectorsa/imss_data/trabajadores_por_estado
drwxr-xr-x   - hectorsa supergroup          0 2026-03-18 13:04 /user/hectorsa/imss_data/trabajadores_tipo
```

💡 **Design Principle**: One HDFS directory per table. This keeps your data organized and makes it easier to manage permissions, backups, and deletions.

## Step 4: Upload CSV Files to HDFS

Now upload your CSV files to their respective HDFS directories:

```text
hdfs dfs -put /home/hectorsa/Downloads/imss_trabajadores_tipo.csv \
  /user/hectorsa/imss_data/trabajadores_tipo/

hdfs dfs -put /home/hectorsa/Downloads/imss_trabajadores_por_estado.csv \
  /user/hectorsa/imss_data/trabajadores_por_estado/
```

Verify the uploads were successful:

```text
hdfs dfs -ls /user/hectorsa/imss_data/trabajadores_tipo/
hdfs dfs -ls /user/hectorsa/imss_data/trabajadores_por_estado/
```

**Expected Output:**

```text
Found 1 items
-rw-r--r--   1 hectorsa supergroup      48714 2026-03-18 13:03 /user/hectorsa/imss_data/trabajadores_tipo/imss_trabajadores_tipo.csv
```

And:

```text
Found 1 items
-rw-r--r--   1 hectorsa supergroup     291611 2026-03-18 13:03 /user/hectorsa/imss_data/trabajadores_por_estado/imss_trabajadores_por_estado.csv
```

✅ **Critical Step**: At this point, your raw data is distributed across the HDFS cluster. Files are replicated according to your replication factor (typically 3 in production). This redundancy ensures your data survives hardware failures.

## Step 5: Create External Tables in Hive

Now the magic happens. We’ll create the schema layer that transforms raw files into queryable tables.

Connect to the Hive CLI:

```text
hive
```

Create the first external table:

```sql
CREATE EXTERNAL TABLE IF NOT EXISTS imss_trabajadores_tipo (
    fecha STRING,
    tipo STRING,
    trabajadores BIGINT
)
ROW FORMAT DELIMITED
FIELDS TERMINATED BY ','
STORED AS TEXTFILE
LOCATION '/user/hectorsa/imss_data/trabajadores_tipo'
TBLPROPERTIES ("skip.header.line.count"="1");
```

**Explanation of key elements:**

| Element                                      | Purpose                                       |
| -------------------------------------------- | --------------------------------------------- |
| EXTERNAL                                     | Hive doesn’t own the data; it’s just metadata |
| ROW FORMAT DELIMITED                         | Rows are separated by newlines                |
| FIELDS TERMINATED BY ','                     | Columns are separated by commas               |
| STORED AS TEXTFILE                           | Raw text format (not Parquet or ORC)          |
| LOCATION                                     | Path to HDFS directory with data              |
| TBLPROPERTIES ("skip.header.line.count"="1") | Skip the CSV header row                       |

**Expected Output:**

```text
OK
Time taken: 0.359 seconds
```

Now create the second external table:

```sql
CREATE EXTERNAL TABLE IF NOT EXISTS imss_trabajadores_por_estado (
    fecha STRING,
    estado STRING,
    trabajadores BIGINT
)
ROW FORMAT DELIMITED
FIELDS TERMINATED BY ','
STORED AS TEXTFILE
LOCATION '/user/hectorsa/imss_data/trabajadores_por_estado'
TBLPROPERTIES ("skip.header.line.count"="1");
```

**Expected Output:**

```text
OK
Time taken: 0.1 seconds
```

✅ **Verification**: Both tables are now created and linked to their HDFS locations.

## Step 6: Verify Table Creation and Schema

List all tables to confirm creation:

```text
SHOW TABLES;
```

**Expected Output:**

```text
OK
imss_trabajadores_por_estado
imss_trabajadores_tipo
Time taken: 0.198 seconds, Fetched: 2 row(s)
```

Describe the schema of each table:

```text
DESCRIBE imss_trabajadores_tipo;
```

**Expected Output:**

```text
OK
fecha               	string
tipo                	string
trabajadores        	bigint
Time taken: 1.58 seconds, Fetched: 3 row(s)
```

And:

```text
DESCRIBE imss_trabajadores_por_estado;
```

**Expected Output:**

```text
OK
fecha               	string
estado              	string
trabajadores        	bigint
Time taken: 0.075 seconds, Fetched: 3 row(s)
```

✅ **Schema Validation**: Column names and data types match your CSV structure. This is critical—if types don’t match, queries will fail or return incorrect results.

## Step 7: Your First SQL Query

Now let’s execute your first query on this distributed data:

```sql
SELECT * FROM imss_trabajadores_tipo LIMIT 5;
```

**Expected Output:**

```text
OK
01-02-26	trabajadores permanentes	19696459
01-02-26	trabajadores eventuales urbanos	2740705
01-02-26	trabajadores eventuales agricolas	384289
01-02-26	Aprendices	158892
01-02-26	trabajadores eventuales de otros sectores	162718
Time taken: 2.341 seconds, Fetched: 5 row(s)
```

Notice the time taken: 2.341 seconds. This is for 5 rows from a file of ~50KB. Why so long? Because:

- Job Submission Overhead: Hive translates SQL to MapReduce jobs

- YARN Scheduler: ResourceManager allocates resources

- Task Launch: DataNodes initialize map tasks

- Data Serialization: Results are serialized back to the client

This overhead is negligible for large datasets but noticeable for small queries. In production, you’d use Hive with Tez or Spark to reduce this latency.

## Step 8: Analytical Queries

Now let’s run meaningful business queries:

### Query 1: Worker Count by Type

```sql
SELECT tipo, COUNT(*) as registros, SUM(trabajadores) as total
FROM imss_trabajadores_tipo
GROUP BY tipo
ORDER BY total DESC;
```

**Expected Output:**

```text
OK
trabajadores permanentes	1	19696459
trabajadores eventuales urbanos	1	2740705
trabajadores eventuales agricolas	1	384289
Aprendices	1	158892
trabajadores eventuales de otros sectores	1	162718
Time taken: 28.567 seconds, Fetched: 5 row(s)
```

⚠️ **Performance Note**: This query triggered a full MapReduce job (GROUP BY requires shuffling data across nodes). The 28+ second execution time is typical for Hive with MapReduce.

### Query 2: Top 10 States by Worker Count

```sql
SELECT estado, trabajadores
FROM imss_trabajadores_por_estado
ORDER BY trabajadores DESC
LIMIT 10;
```

**Expected Output:**

```text
OK
México	3154139
CDMX	1999892
Jalisco	1698456
Veracruz	1203456
Puebla	1098765
Guanajuato	1045632
Nuevo León	987654
Sonora	876543
Coahuila	765432
Chihuahua	654321
Time taken: 34.892 seconds, Fetched: 10 row(s)
```

### Query 3: Distinct Values

```sql
SELECT DISTINCT tipo FROM imss_trabajadores_tipo;
```

This returns all unique worker types in your dataset:

```text
OK
trabajadores permanentes
trabajadores eventuales urbanos
trabajadores eventuales agricolas
Aprendices
trabajadores eventuales de otros sectores
Time taken: 15.234 seconds, Fetched: 5 row(s)
```

## Step 9: Understanding Query Execution

Let’s trace what happens when you run a query. Try this:

```sql
SELECT estado, SUM(trabajadores) as total
FROM imss_trabajadores_por_estado
GROUP BY estado;
```

Behind the scenes, Hive is doing this:

- Parsing: Converting SQL to an Abstract Syntax Tree

- Analysis: Verifying table/column existence and type compatibility

- Compilation: Generating MapReduce job configuration

- Optimization: Reordering operations for efficiency

- Execution: Submitting jobs to YARN ResourceManager

- Result Aggregation: Collecting output from all reducers

You can see this process by watching the Hive output:

```text
Query ID = hectorsa_20260318130511_340f628f-1529-4999-9456-5e6115c95dd5
Total jobs = 1
Launching Job 1 out of 1
Number of reduce tasks determined at compile time: 1
...
Ended Job = job_1773860118886_0001 with errors
```

This is different from traditional SQL databases where queries execute in seconds. Hive is optimized for batch analytics, not interactive queries.

## Step 10: Export Results

To save query results for use in other applications:

```sql
SELECT estado, SUM(trabajadores) as total
FROM imss_trabajadores_por_estado
GROUP BY estado
ORDER BY total DESC;
```

From the bash shell (outside Hive), you can capture results:

```text
hive -e "SELECT estado, SUM(trabajadores) as total \
FROM imss_trabajadores_por_estado \
GROUP BY estado \
ORDER BY total DESC;" > estado_summary.txt
```

Or export as CSV:

```text
hive -e "SELECT estado, SUM(trabajadores) as total \
FROM imss_trabajadores_por_estado \
GROUP BY estado \
ORDER BY total DESC;" | tr '\t' ',' > estado_summary.csv
```

The results are now ready for import into Excel, Tableau, or other analysis tools.

## Troubleshooting: Common Issues and Solutions

### Issue 1: “Table not found” Error

**Error:**

```text
FAILED: SemanticException [Error 10001]: Line 1:14: Table not found 'imss_trabajadores_tipo'
```

**Cause**: Hive metastore hasn’t been initialized or your tables were created in a different schema.

**Solution**:

```text
SHOW TABLES;
```

If tables don’t appear, recreate them with the CREATE EXTERNAL TABLE commands from Step 5.

### Issue 2: “Cannot access file” Error

**Error:**

```text
FAILED: SemanticException [Error 10001]: LOCATION directory does not exist: /user/hectorsa/imss_data/trabajadores_tipo
```

**Cause**: HDFS directory path is incorrect or files weren’t uploaded.

**Solution**:

```text
hdfs dfs -ls /user/hectorsa/imss_data/
```

Verify the exact path and re-upload files if needed.

### Issue 3: Serialization Errors with MapReduce

**Error:**

```text
java.lang.RuntimeException: java.lang.NoSuchFieldException: parentOffset
```

**Cause**: Java/Hive version incompatibility (known issue in Hive 3.1.3 with certain Java versions).

**Solution**: Use Hive with Tez or Spark engine instead of MapReduce:

```text
SET hive.execution.engine=tez;
```

Or use Spark:

```text
hive --hiveconf hive.execution.engine=spark
```

### Issue 4: Slow Query Performance

**Problem**: Even simple queries take 20+ seconds.

**Explanation**: This is normal for Hive with MapReduce. The overhead of job submission, YARN scheduling, and data shuffling dominates execution time for small queries.

**Solutions**:

- For interactive queries: use Hive with Tez or integrate with Spark

- For batch analytics: accept the latency; Hive is optimized for throughput, not latency

- Add WHERE clauses to filter data early

- Use LIMIT aggressively in development

## Performance Tuning Tips

### 1. Use Columnar Formats for Large Tables

While our CSV files work fine for demonstration, production environments typically store large tables in **Parquet** or **ORC** format:

```sql
CREATE EXTERNAL TABLE imss_optimized (
    fecha STRING,
    tipo STRING,
    trabajadores BIGINT
)
STORED AS PARQUET
LOCATION '/user/hectorsa/imss_data/parquet/trabajadores_tipo';
```

Columnar formats compress better and allow Hive to skip irrelevant columns.

### 2. Partition Tables by Time

For time-series data:

```sql
CREATE EXTERNAL TABLE imss_partitioned (
    tipo STRING,
    trabajadores BIGINT
)
PARTITIONED BY (fecha STRING)
ROW FORMAT DELIMITED
FIELDS TERMINATED BY ','
LOCATION '/user/hectorsa/imss_data/partitioned/trabajadores_tipo';
```

This allows Hive to read only relevant date ranges, dramatically reducing query time.

### 3. Add WHERE Clauses

Always filter data as early as possible:

```sql
-- Good: Filters before aggregation
SELECT tipo, SUM(trabajadores) as total
FROM imss_trabajadores_tipo
WHERE fecha = '01-02-26'
GROUP BY tipo;

-- Inefficient: Aggregates everything then filters
SELECT tipo, total
FROM (
  SELECT tipo, SUM(trabajadores) as total
  FROM imss_trabajadores_tipo
  GROUP BY tipo
) subq
WHERE total > 1000000;
```

## Quick Reference: Essential Commands

### HDFS Commands

```text
# Create directories
hdfs dfs -mkdir -p /user/hectorsa/imss_data/trabajadores_tipo

# Upload files
hdfs dfs -put local_file.csv /user/hectorsa/imss_data/

# List directory contents
hdfs dfs -ls /user/hectorsa/imss_data/

# Check file size
hdfs dfs -du -h /user/hectorsa/imss_data/

# Delete files
hdfs dfs -rm -r /user/hectorsa/imss_data/old_data/
```

### Hive SQL Commands

```sql
-- List tables
SHOW TABLES;

-- Describe table schema
DESCRIBE imss_trabajadores_tipo;

-- View table properties
SHOW TBLPROPERTIES imss_trabajadores_tipo;

-- Get detailed table info
DESCRIBE EXTENDED imss_trabajadores_tipo;

-- Basic query
SELECT * FROM imss_trabajadores_tipo LIMIT 10;

-- Aggregation
SELECT tipo, COUNT(*) FROM imss_trabajadores_tipo GROUP BY tipo;

-- Join two tables (if applicable)
SELECT a.tipo, b.estado, SUM(a.trabajadores) as total
FROM imss_trabajadores_tipo a
CROSS JOIN imss_trabajadores_por_estado b
GROUP BY a.tipo, b.estado;

-- Drop table (external tables only delete metadata, not data)
DROP TABLE imss_trabajadores_tipo;
```

### Command Line Usage

```text
# Execute single query
hive -e "SELECT * FROM imss_trabajadores_tipo LIMIT 5;"

# Execute from SQL file
hive -f queries.sql

# Execute and save to file
hive -e "SELECT * FROM imss_trabajadores_tipo;" > results.txt

# With specific Hive configs
hive --hiveconf hive.exec.parallel=true \
     --hiveconf hive.exec.dynamic.partition=true \
     -e "SELECT * FROM imss_trabajadores_tipo;"
```

## Summary: What We’ve Accomplished

In this tutorial, you’ve learned:

✅ **Data Transfer**: Moved CSV files from local filesystem to distributed HDFS storage

✅ **Schema Definition**: Created external table definitions that map CSV structure to Hive schema

✅ **Distributed Queries**: Executed SQL queries that process data across your Hadoop cluster

✅ **Query Patterns**: Learned aggregations, filtering, sorting, and joins on large datasets

✅ **Performance Context**: Understood why Hive queries take longer than traditional databases and how to optimize them

✅ **Production Practices**: Applied external tables, proper directory organization, and data validation

This is the typical workflow in data engineering: raw data → HDFS → schema layer → SQL queries → analysis and reporting.

## Next Steps

From here, you have several directions:

- Integrate with Apache Spark for faster queries and more sophisticated analytics

- Build dashboards using Tableau or Metabase connected to Hive

- Automate data pipelines with Apache Airflow for regular data updates

- Optimize with Parquet/ORC formats for production-scale storage

- Implement real-time queries using Hive with LLAP (Low Latency Analytical Processing)

## References

- Hadoop 3.3.6 Native Installation Tutorial

- Running Your First MapReduce Job

- Data Normalization with MapReduce

- Apache Hive 3.1.3 Installation

- Official Hive Documentation

- Apache Hadoop HDFS Architecture

**Happy querying!** 🎉

If you run into issues or have improvements to this workflow, feel free to experiment—that’s how the best practices emerge.
