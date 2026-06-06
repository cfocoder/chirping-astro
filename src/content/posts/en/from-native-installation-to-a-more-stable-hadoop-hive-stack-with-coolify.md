---
title: "From Native Installation to a More Stable Hadoop + Hive Stack with Coolify"
description: "Part 7 in the Hadoop and Hive Tutorial Series"
pubDate: 2026-04-11
categories: ["Hadoop"]
tags: []
toc: true
---

**Part 7 in the Hadoop and Hive Tutorial Series**

## Introduction

In the previous posts of this series, I installed Hadoop 3.3.6 natively on Ubuntu, configured YARN, ran MapReduce jobs, installed Apache Hive 3.1.3 on top of Hadoop, loaded external tables from HDFS, and finally connected HiveServer2 to DBeaver from my desktop.

That path was valuable because it forced me to understand what each component does:

- HDFS for distributed storage

- YARN for scheduling jobs

- MapReduce as the execution model behind many Hive queries

- Hive Metastore as the metadata layer

- HiveServer2 as the SQL service that external clients can use

But once I moved from “learning how the pieces work” to “using this stack repeatedly for a master’s program,” a different requirement became more important than purity: **operational stability**.

The native installation taught me a lot, but it also exposed the kind of friction that is hard to justify when your goal is to finish assignments, test queries, and work with datasets reliably. After several rounds of debugging, I decided to keep the same versions used in class but move the runtime into a Docker Compose stack managed by **Coolify**.

This post documents that transition, why it was necessary, what problems it solved, and what had to be fixed to make the final setup stable enough to survive reboots and repeated start/stop cycles on a single laptop.

## Where the Native Installation Started to Hurt

The native installation was not a mistake. On the contrary, it was the right way to learn the internal architecture. When you install Hadoop and Hive directly on Ubuntu, you see clearly how each daemon starts, where configuration files live, how HDFS behaves, and how Hive translates SQL into distributed execution.

However, that same visibility also means you inherit every compatibility problem directly on the host operating system.

In practice, the native setup started to create three kinds of friction:

### 1. Java version drift on the host

One of the biggest risks in native Hadoop/Hive setups is ending up with multiple Java versions on the same machine. Even if Hadoop works with one JDK and Hive works with another, the interaction between both components becomes fragile. In my case, some problems started to look less like data issues and more like environment issues.

That is the kind of instability that wastes time because symptoms appear in different places:

- MapReduce jobs fail

- HiveServer2 behaves inconsistently

- Beeline or JDBC clients connect sometimes and fail other times

- commands work in one terminal session but not after a reboot

For a lab machine, this is frustrating. For coursework with deadlines, it is worse.

### 2. Hive on MapReduce is already slow enough without host-level instability

Even when the stack was working, Hive queries that triggered MapReduce jobs had a fixed overhead. On a single machine this is expected. A query that reads 29 rows and one that reads 60 million rows can both take tens of seconds because the system still has to:

- compile the query

- create temporary staging paths in HDFS

- submit a job to YARN

- launch containers

- run the ApplicationMaster

- coordinate Map and Reduce tasks

That is normal behavior for Hive on MapReduce. The problem is that if the environment itself is unstable, you stop learning from the query results and start fighting the platform.

### 3. Repeated start/stop cycles became risky

For coursework I do not need Hadoop and Hive running 24/7. I prefer to start the stack when I need it and stop it when I am done. That pattern worked poorly in the native setup because every restart reopened questions:

- Did HiveServer2 really start?

- Did HDFS leave safe mode?

- Is YARN actually ready?

- Is the metastore reachable?

- Is Java pointing to the same runtime as last time?

At that point the environment was teaching the wrong lesson. Instead of focusing on HDFS, external tables, IMSS datasets, and SQL analysis, I was spending too much time recovering the platform itself.

## Why Coolify Was the Right Next Step

I did not want to change the versions used in class. That was non-negotiable.

The final stack still uses:

- Hadoop 3.3.6

- Hive 3.1.3

- HiveServer2

The difference is that now they run inside containers managed by Coolify, with a dedicated PostgreSQL metastore.

Why this helped:

### 1. The runtime became isolated

Instead of relying on whatever Java configuration existed on my Ubuntu host, the container image carries the runtime expected by the stack. That eliminates an entire class of host-level compatibility issues.

### 2. Coolify made deployment repeatable

With a single Docker Compose file, the environment became declarative. That means:

- the same services are created every time

- the same ports are exposed every time

- the same environment variables are applied every time

- the same startup logic runs every time

That repeatability matters more than elegance when the goal is to have a reliable working environment for a master’s program.

### 3. PostgreSQL replaced Derby as the metastore backend

For short experiments, embedded Derby can be enough. But for a setup I planned to restart often and use with external tools like DBeaver, PostgreSQL was a better choice. It made the metastore explicit, persistent, and easier to reason about.

### 4. I could stop the stack when not in use

Once the stack was stable in Coolify, the operational pattern became simpler:

- Start the service from Coolify

- Wait until Hive is healthy

- Connect from DBeaver or Beeline

- Work on the assignment

- Stop the service when finished

That is a much better fit for a laptop used for many other tasks.

## The Final Architecture

The final single-machine lab setup uses three services:

### 1. postgres

This service stores the Hive metastore in PostgreSQL 15.

### 2. hive

This is the main service, based on the image:

`mtsrus/hadoop:hadoop3.3.6-hive3.1.3`

It runs:

- HDFS daemons

- YARN services

- Hive Metastore service

- HiveServer2

### 3. hdfs-init

This is a one-shot initialization container. Its job is to prepare HDFS directories and permissions required for Hive and MapReduce to work correctly in a lab environment.

This last point turned out to be more important than I expected.

## The First Problems After Moving to Containers

Moving the stack into Coolify improved the overall direction, but it did not instantly solve everything. In fact, the first iterations exposed several operational problems that had to be fixed one by one.

### Problem 1: Hive INSERT statements failed with HDFS permission errors

At first, connecting through DBeaver worked, basic metadata queries worked, but `INSERT` operations failed with permission errors related to `/tmp` and YARN staging directories in HDFS.

The underlying issue was that HiveServer2 was trying to execute work in a context that did not match the HDFS permissions expected by the environment.

The fix was to:

- set hive.server2.enable.doAs=false

- initialize scratch and staging directories with explicit HDFS permissions

That included directories such as:

- /tmp

- /tmp/hive

- /tmp/hadoop-yarn

- /tmp/hadoop-yarn/staging

- /user/hive/warehouse

Without those paths and permissions, simple SQL operations can fail even though the cluster looks “up.”

### Problem 2: MapReduce failed because the ApplicationMaster could not start

After fixing permissions, another issue appeared: Hive queries that required MapReduce still failed because YARN could not find the MapReduce runtime classes.

The root cause was missing `HADOOP_MAPRED_HOME` environment propagation for:

- the ApplicationMaster

- map task containers

- reduce task containers

That required generating a `mapred-site.xml` configuration that explicitly sets:

- yarn.app.mapreduce.am.env

- mapreduce.map.env

- mapreduce.reduce.env

This was exactly the same class of issue that showed up earlier during native experimentation. The lesson remained the same: **YARN containers do not automatically inherit your shell environment.**

### Problem 3: The stack worked once, but not reliably after reboots

This was the hardest bug, and it is the reason this post exists.

At one stage the stack appeared healthy after deployment, queries worked, HDFS was fine, and DBeaver connected correctly. But after turning the laptop off and on again, the same stack could fail during startup and Coolify would mark `hive` as unhealthy.

At first sight, this looked random. It was not.

## The Real Root Cause of the Unstable Startup

The instability was caused by two startup scripts inside the base image:

- /scripts/start-hdfs.sh

- /scripts/populate-hdfs.sh

### Bug 1: start-hdfs.sh handled persisted NameNode state incorrectly

When HDFS had already been initialized and the NameNode data directory contained persisted `fsimage*` files, the original script could evaluate that condition incorrectly and fail during startup.

That made the startup path depend on whether the NameNode was fresh or already had stored state, which is exactly the kind of issue that appears after a reboot or after using bind-mounted persistent storage.

### Bug 2: populate-hdfs.sh touched HDFS too early

The second bug was even more subtle. The image attempted to create directories and apply permissions while HDFS was still in **safe mode**.

When that happened:

- HDFS was technically starting

- the script tried to run chmod or related operations too early

- the entrypoint exited

- the container restarted

- Coolify eventually marked the service as unhealthy

This explains why the behavior felt inconsistent: it depended on timing. Sometimes HDFS left safe mode fast enough. Sometimes it did not.

That is why the setup could appear correct one day and fail the next day after a simple reboot.

## The Fix That Finally Made It Stable

The final solution was not to fight symptoms one by one, but to make startup deterministic.

The Docker Compose file now does the following inside the `hive` service before handing control to the original image entrypoint:

### 1. It replaces start-hdfs.sh

The custom version only formats the NameNode if no `fsimage*` files exist. If persisted HDFS state is already present, it skips formatting and starts HDFS cleanly.

### 2. It replaces populate-hdfs.sh

The custom version explicitly waits for HDFS to leave safe mode before applying permissions or creating additional directories.

In practice, this was the most important behavioral change.

### 3. It generates hive-site.xml inline

This allows Coolify to deploy the full stack from a single Docker Compose block, without requiring extra files on disk for configuration. It also keeps the metastore and HiveServer2 settings under source control.

### 4. It generates mapred-site.xml inline

This guarantees the MapReduce environment variables required by YARN are present every time the container starts.

### 5. It uses a more tolerant health check

The health check for `HiveServer2` was adjusted to give the stack enough time to:

- start PostgreSQL

- bring HDFS online

- leave safe mode

- initialize required HDFS paths

- start Hive Metastore

- start HiveServer2

This matters because a health check that is too aggressive can turn a slow but correct startup into a false failure.

## Why Persistent Storage Matters in This Setup

Another improvement was to stop relying on anonymous Docker volumes and instead bind storage explicitly to host paths on the laptop:

- /home/hectorsa/coolify-data/hadoop-hive/postgres

- /home/hectorsa/coolify-data/hadoop-hive/hadoop

This has two practical advantages:

### 1. The metastore and HDFS survive redeploys

If the Coolify deployment is recreated but points to the same host paths, the data remains available.

### 2. Startup bugs become easier to understand

Once persistent state exists, startup logic must be correct for both a fresh cluster and an already initialized cluster. That is precisely how the `fsimage*` bug was exposed and then fixed.

In other words, persistence did not create the problem. It revealed it.

## How I Use the Stack Now

Operationally, the environment is much simpler than the native setup.

### For SQL authoring and exploration

I use **DBeaver** connected to:

`jdbc:hive2://localhost:10000/default`

This is the most comfortable way to:

- inspect tables

- iterate on queries

- validate aggregations

- check join outputs

### For command-line validation

I use **Beeline** from the host terminal through `docker exec`.

That looks like this:

```bash
HIVE_CONTAINER=$(docker ps --format '{{.Names}} {{.Image}}' | grep 'mtsrus/hadoop:hadoop3.3.6-hive3.1.3' | grep '^hive-' | awk '{print $1}')
docker exec -it "$HIVE_CONTAINER" beeline -u jdbc:hive2://hive:10000/default -n anonymous
```

### For HDFS operations

I also work from the host terminal:

```bash
docker exec -it "$HIVE_CONTAINER" hdfs dfs -ls /
docker exec -it "$HIVE_CONTAINER" hdfs dfs -ls /user/hectorsa
```

This ended up being more reliable than trying to depend on a persistent interactive terminal inside Coolify.

### For data loading

The cleanest workflow is:

- Copy files from the host to /tmp inside the Hive container

- Upload them from /tmp to HDFS

- Create Hive external tables over those HDFS paths

This makes each step explicit and easier to debug.

## What Stayed the Same

It is worth emphasizing that this move to Coolify did **not** change the learning model of the series.

I am still working with:

- Hadoop 3.3.6

- Hive 3.1.3

- HiveServer2

- HDFS

- YARN

- MapReduce-backed Hive execution

- external tables on HDFS

- SQL analysis over distributed data

So the academic content is the same. What changed is the operational envelope around it.

That distinction matters.

If the goal is to learn how Hadoop and Hive work internally, the native setup still has educational value. But if the goal is to run assignments repeatedly without spending half the session recovering the environment, the Coolify-based deployment is the better tool.

## What I Learned from the Transition

This migration clarified an important principle for me:

The best learning environment is not always the best working environment.

The native installation was excellent for understanding:

- daemon layout

- filesystem paths

- environment variables

- XML configuration files

- the difference between HDFS, YARN, Hive Metastore, and HiveServer2

But once those lessons were learned, continuing to use the host-level setup for day-to-day coursework created unnecessary operational risk.

The Coolify stack gave me:

- the same versions used in class

- clearer separation from the host OS

- reproducible startup behavior

- persistent storage

- simpler stop/start control

- reliable JDBC access from DBeaver

That is a better tradeoff for a master’s program.

## Practical Recommendation

If you are following this series for learning, I would still recommend doing at least one native installation first. It forces you to understand the moving parts, and that knowledge is valuable.

But if you already understand the architecture and you now need a setup that you can trust for repeated coursework, a containerized deployment is the more pragmatic choice.

In my case, the final recommendation is:

- learn the internals natively

- work repeatedly from a containerized stack

Those two approaches are not contradictory. They solve different problems.

## Conclusion

This post marks an important transition in the series.

The earlier posts were about learning Hadoop and Hive by building the stack directly on Ubuntu:

- install HDFS

- configure YARN

- run MapReduce

- install Hive

- load external tables

- connect with DBeaver

This post is about what comes next: making that environment reliable enough for actual academic use.

The move to Coolify was not about hiding complexity. It was about controlling it. By keeping the same Hadoop and Hive versions while moving the runtime into a repeatable Docker Compose deployment, I was able to preserve the learning value of the earlier posts while gaining a more stable operational platform.

At this point, the stack:

- starts correctly after reboot

- survives repeated start/stop cycles

- supports HDFS operations from the host terminal

- runs Hive external tables correctly

- accepts JDBC connections from DBeaver

- executes aggregations and assignments reliably

That is the environment I wanted for the master’s program from the beginning.

## Series Navigation

- Part 1: Hadoop 3.3.6 on Ubuntu Native Installation Without Virtual Machine

- Part 2: Running Your First MapReduce Job on Hadoop: WordCount on War and Peace

- Part 3: Correcting Word Frequencies with Data Normalization

- Part 4: Apache Hive 3.1.3 on Ubuntu Native Installation on Top of Hadoop 3.3.6

- Part 5: From HDFS to SQL Queries: Loading CSV Files into Hive External Tables and Querying with SQL

- Part 6: Querying Apache Hive from DBeaver: Starting HiveServer2 and Connecting a Desktop SQL Client

## References

- Apache Hadoop Documentation

- Apache Hive Documentation

- Coolify Documentation

## Quick Reference: Daily Operational Commands

The commands below summarize the workflow I now use from the host terminal. They are intentionally explicit because I want to keep each step visible and easy to troubleshoot.

### 1. Find the current Hive container name

The container name may change after a redeploy, so I do not hardcode it.

```bash
docker ps --format '{{.Names}} {{.Image}}' | grep 'mtsrus/hadoop:hadoop3.3.6-hive3.1.3'
```

If I want to store it in a variable for the current terminal session:

```bash
HIVE_CONTAINER=$(docker ps --format '{{.Names}} {{.Image}}' | grep 'mtsrus/hadoop:hadoop3.3.6-hive3.1.3' | grep '^hive-' | awk '{print $1}')
echo "$HIVE_CONTAINER"
```

### 2. Check that HDFS is responding

```bash
docker exec -it "$HIVE_CONTAINER" hdfs dfs -ls /
docker exec -it "$HIVE_CONTAINER" hdfs dfs -ls /user
```

### 3. Connect to Hive from the terminal with Beeline

```bash
docker exec -it "$HIVE_CONTAINER" beeline -u jdbc:hive2://hive:10000/default -n anonymous
```

Or run a quick command without opening an interactive session:

```bash
docker exec -it "$HIVE_CONTAINER" beeline -u jdbc:hive2://hive:10000/default -n anonymous -e 'show databases;'
```

### 4. Copy files from the local machine into /tmp inside the container

For a single file:

```bash
docker cp /path/on/local/machine/file.csv "$HIVE_CONTAINER":/tmp/file.csv
```

Example:

```bash
docker cp /home/hectorsa/Downloads/HADOOP_BACKUP/input/warandpeace.txt "$HIVE_CONTAINER":/tmp/warandpeace.txt
```

For a full local directory:

```bash
docker exec -it "$HIVE_CONTAINER" mkdir -p /tmp/input
docker cp /home/hectorsa/Downloads/HADOOP_BACKUP/input/. "$HIVE_CONTAINER":/tmp/input/
```

Verify that the files arrived:

```bash
docker exec -it "$HIVE_CONTAINER" ls -lh /tmp
docker exec -it "$HIVE_CONTAINER" ls -lh /tmp/input
```

### 5. Create directories in HDFS

Create a user folder:

```bash
docker exec -it "$HIVE_CONTAINER" hdfs dfs -mkdir -p /user/hectorsa
docker exec -it "$HIVE_CONTAINER" hdfs dfs -ls /user
```

Create subdirectories for datasets:

```bash
docker exec -it "$HIVE_CONTAINER" hdfs dfs -mkdir -p /user/hectorsa/input
docker exec -it "$HIVE_CONTAINER" hdfs dfs -mkdir -p /user/hectorsa/imss_data/asg_2025_01_parquet_clean
docker exec -it "$HIVE_CONTAINER" hdfs dfs -mkdir -p /user/hectorsa/catalogos_parquet/delegaciones
docker exec -it "$HIVE_CONTAINER" hdfs dfs -mkdir -p /user/hectorsa/catalogos_parquet/municipios
docker exec -it "$HIVE_CONTAINER" hdfs dfs -mkdir -p /user/hectorsa/catalogos_parquet/sector_economico_1
docker exec -it "$HIVE_CONTAINER" hdfs dfs -mkdir -p /user/hectorsa/catalogos_parquet/sector_economico_2
docker exec -it "$HIVE_CONTAINER" hdfs dfs -mkdir -p /user/hectorsa/catalogos_parquet/sector_economico_4
```

### 6. Move files from /tmp in the container into HDFS

For a single file:

```bash
docker exec -it "$HIVE_CONTAINER" hdfs dfs -put /tmp/warandpeace.txt /user/hectorsa/input/
```

For multiple files:

```bash
docker exec -it "$HIVE_CONTAINER" bash -lc 'hdfs dfs -put /tmp/input/* /user/hectorsa/input/'
```

For parquet files:

```bash
docker exec -it "$HIVE_CONTAINER" hdfs dfs -put /tmp/asg-2025-01-31_clean.parquet /user/hectorsa/imss_data/asg_2025_01_parquet_clean/
docker exec -it "$HIVE_CONTAINER" hdfs dfs -put /tmp/delegaciones.parquet /user/hectorsa/catalogos_parquet/delegaciones/
docker exec -it "$HIVE_CONTAINER" hdfs dfs -put /tmp/municipios.parquet /user/hectorsa/catalogos_parquet/municipios/
```

Verify the upload:

```bash
docker exec -it "$HIVE_CONTAINER" hdfs dfs -ls /user/hectorsa/input
docker exec -it "$HIVE_CONTAINER" hdfs dfs -ls /user/hectorsa/imss_data/asg_2025_01_parquet_clean
docker exec -it "$HIVE_CONTAINER" hdfs dfs -ls /user/hectorsa/catalogos_parquet/delegaciones
```

### 7. Replace an existing file in HDFS

If the file already exists and I want to overwrite it:

```bash
docker exec -it "$HIVE_CONTAINER" hdfs dfs -put -f /tmp/file.csv /user/hectorsa/some_folder/
```

Or explicitly delete and re-upload:

```bash
docker exec -it "$HIVE_CONTAINER" hdfs dfs -rm /user/hectorsa/some_folder/file.csv
docker exec -it "$HIVE_CONTAINER" hdfs dfs -put /tmp/file.csv /user/hectorsa/some_folder/
```

### 8. Create external tables in Hive from files in HDFS

First create or select the database:

```sql
CREATE DATABASE IF NOT EXISTS maestria_db;
USE maestria_db;
```

#### External table over Parquet

Example for the IMSS monthly parquet:

```sql
USE maestria_db;

CREATE EXTERNAL TABLE IF NOT EXISTS asg_2025_01 (
  cve_delegacion STRING,
  cve_subdelegacion STRING,
  cve_entidad STRING,
  cve_municipio STRING,
  sector_economico_1 STRING,
  sector_economico_2 STRING,
  sector_economico_4 STRING,
  tamano_patron STRING,
  sexo STRING,
  rango_edad STRING,
  rango_salarial STRING,
  rango_uma STRING,
  asegurados BIGINT,
  no_trabajadores BIGINT,
  ta BIGINT,
  teu BIGINT,
  tec BIGINT,
  tpu BIGINT,
  tpc BIGINT,
  ta_sal BIGINT,
  teu_sal BIGINT,
  tec_sal BIGINT,
  tpu_sal BIGINT,
  tpc_sal BIGINT,
  masa_sal_ta BIGINT,
  masa_sal_teu BIGINT,
  masa_sal_tec BIGINT,
  masa_sal_tpu BIGINT,
  masa_sal_tpc BIGINT
)
STORED AS PARQUET
LOCATION '/user/hectorsa/imss_data/asg_2025_01_parquet_clean';
```

Example for a small lookup parquet:

```sql
USE maestria_db;

CREATE EXTERNAL TABLE IF NOT EXISTS delegaciones (
  cve_delegacion STRING,
  descripcion_delegacion STRING,
  cve_subdelegacion STRING,
  descripcion_subdelegacion STRING
)
STORED AS PARQUET
LOCATION '/user/hectorsa/catalogos_parquet/delegaciones';
```

#### External table over CSV

If the source in HDFS is a CSV file:

```sql
USE maestria_db;

CREATE EXTERNAL TABLE IF NOT EXISTS diccionario_csv (
  columna STRING,
  descripcion STRING,
  tipo STRING,
  naturaleza_dato STRING
)
ROW FORMAT SERDE 'org.apache.hadoop.hive.serde2.OpenCSVSerde'
WITH SERDEPROPERTIES (
  "separatorChar" = ",",
  "quoteChar" = "\"",
  "escapeChar" = "\\"
)
STORED AS TEXTFILE
LOCATION '/user/hectorsa/catalogos/diccionario_csv'
TBLPROPERTIES ("skip.header.line.count"="1");
```

### 9. Validate the external tables

```sql
SELECT * FROM asg_2025_01 LIMIT 10;
SELECT COUNT(*) FROM asg_2025_01;
SELECT * FROM delegaciones LIMIT 10;
```

### 10. Execute a full SQL script from the host terminal

Copy a local SQL file into the container:

```bash
docker cp /home/hectorsa/Documents/hadoop_hive_installation/tarea_analisis_empleo.sql "$HIVE_CONTAINER":/tmp/tarea_analisis_empleo.sql
```

Run it with Beeline:

```bash
docker exec -it "$HIVE_CONTAINER" beeline -u jdbc:hive2://hive:10000/default -n anonymous -f /tmp/tarea_analisis_empleo.sql
```

Save output to a local host file:

```bash
docker exec -i "$HIVE_CONTAINER" beeline -u jdbc:hive2://hive:10000/default -n anonymous -f /tmp/tarea_analisis_empleo.sql > /home/hectorsa/Documents/hadoop_hive_installation/salida_tarea.txt
```

## Full Docker Compose Reference

Below is the full Docker Compose file used in this setup, with sensitive values removed. Replace the placeholder values before deploying in Coolify.

```xml
services:
  postgres:
    image: postgres:15-alpine
    pull_policy: if_not_present
    restart: unless-stopped
    environment:
      POSTGRES_DB: ${POSTGRES_DB:-metastore}
      POSTGRES_USER: ${POSTGRES_USER:-hive}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-CHANGE_ME}
    healthcheck:
      test:
        - CMD-SHELL
        - pg_isready -U ${POSTGRES_USER:-hive} -d ${POSTGRES_DB:-metastore}
      interval: 10s
      timeout: 5s
      retries: 10
      start_period: 20s
    ports:
      - "${POSTGRES_PORT:-5432}:5432"
    volumes:
      - type: bind
        source: /home/hectorsa/coolify-data/hadoop-hive/postgres
        target: /var/lib/postgresql/data

  hive:
    image: mtsrus/hadoop:hadoop3.3.6-hive3.1.3
    pull_policy: if_not_present
    restart: unless-stopped
    hostname: hive
    healthcheck:
      test:
        - CMD-SHELL
        - /bin/bash -lc "beeline -u jdbc:hive2://localhost:10000/default -n anonymous -e 'show databases;' >/dev/null 2>&1"
      interval: 30s
      timeout: 30s
      retries: 10
      start_period: 240s
    entrypoint:
      - /bin/bash
      - -lc
      - |
        mkdir -p /etc/hadoop
        cat > /scripts/start-hdfs.sh /dev/null | head -n 1)" ]; then
          echo "--------------- FORMATTING DATA DIRECTORY ---------------"
          $HADOOP_HOME/bin/hdfs namenode 2>&1 -format -nonInteractive | sed 's/^/| HDFS | /g' || true
        fi
        echo "--------------- STARTING HDFS NODES ---------------"
        $HADOOP_HOME/sbin/start-dfs.sh 2>&1 | sed 's/^/| HDFS | /g'
        tail -F -n 1000 /opt/hadoop/logs/*namenode-*.log | sed 's/^/| NAMENODE | /g' &
        tail -F -n 1000 /opt/hadoop/logs/*datanode-*.log | sed 's/^/| DATANODE | /g' &
        /wait-for-it.sh -h localhost -p 9820 -t $WAIT_TIMEOUT_SECONDS
        /wait-for-it.sh -h localhost -p 9867 -t $WAIT_TIMEOUT_SECONDS
        echo "--------------- HDFS NODES READY ---------------"
        EOF
        chmod +x /scripts/start-hdfs.sh
        cat > /scripts/populate-hdfs.sh  /etc/hadoop/mapred-site.xml 
        
        
          
            mapreduce.framework.name
            yarn
          
          
            yarn.app.mapreduce.am.env
            HADOOP_MAPRED_HOME=/opt/hadoop
          
          
            mapreduce.map.env
            HADOOP_MAPRED_HOME=/opt/hadoop
          
          
            mapreduce.reduce.env
            HADOOP_MAPRED_HOME=/opt/hadoop
          
        
        EOF
        mkdir -p /var/hive/conf
        cat > /var/hive/conf/hive-site.xml 
        
        
          
            javax.jdo.option.ConnectionURL
            {{HIVE_METASTORE_DB_URL}}
          
          
            javax.jdo.option.ConnectionDriverName
            {{HIVE_METASTORE_DB_DRIVER}}
          
          
            javax.jdo.option.ConnectionUserName
            {{HIVE_METASTORE_DB_USER}}
          
          
            javax.jdo.option.ConnectionPassword
            {{HIVE_METASTORE_DB_PASSWORD}}
          
          
            hive.server2.authentication
            NONE
          
          
            hive.server2.thrift.port
            10000
          
          
            datanucleus.autoCreateTables
            False
          
          
            hive.metastore.schema.verification
            false
          
          
            hive.server2.enable.doAs
            false
          
          
            hive.exec.scratchdir
            /tmp/hive
          
          
            hive.metastore.warehouse.dir
            /user/hive/warehouse
          
        
        EOF
        exec /entrypoint.sh
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      HADOOP_HOME: /opt/hadoop
      HADOOP_MAPRED_HOME: /opt/hadoop
      WAIT_TIMEOUT_SECONDS: ${WAIT_TIMEOUT_SECONDS:-180}
      WITH_HIVE_SERVER: "true"
      WITH_HIVE_METASTORE_SERVER: "true"
      HIVE_METASTORE_DB_URL: jdbc:postgresql://postgres:5432/${POSTGRES_DB:-metastore}
      HIVE_METASTORE_DB_DRIVER: org.postgresql.Driver
      HIVE_METASTORE_DB_USER: ${POSTGRES_USER:-hive}
      HIVE_METASTORE_DB_PASSWORD: ${POSTGRES_PASSWORD:-CHANGE_ME}
    ports:
      - "${HDFS_IPC_PORT:-9820}:9820"
      - "${HDFS_WEB_PORT:-9870}:9870"
      - "${YARN_UI_PORT:-8088}:8088"
      - "${NODEMANAGER_UI_PORT:-8042}:8042"
      - "${HIVESERVER2_PORT:-10000}:10000"
      - "${HIVESERVER2_WEBUI_PORT:-10002}:10002"
      - "${JOBHISTORY_UI_PORT:-19888}:19888"
      - "${HIVE_METASTORE_PORT:-9083}:9083"
    volumes:
      - type: bind
        source: /home/hectorsa/coolify-data/hadoop-hive/hadoop
        target: /var/hadoop/data

  hdfs-init:
    image: mtsrus/hadoop:hadoop3.3.6-hive3.1.3
    pull_policy: if_not_present
    restart: "no"
    depends_on:
      hive:
        condition: service_healthy
    entrypoint:
      - /bin/bash
      - -lc
      - |
        set -e
        /scripts/prepare-hadoop-conf.sh
        sed -i 's#hdfs://.*:9820#hdfs://hive:9820#' /etc/hadoop/core-site.xml
        for i in $(seq 1 60); do
          if hdfs dfs -test -d /; then
            break
          fi
          sleep 5
        done
        hdfs dfs -mkdir -p /tmp /tmp/hive /tmp/hadoop-yarn /tmp/hadoop-yarn/staging /user/hive/warehouse
        hdfs dfs -chmod 777 /tmp
        hdfs dfs -chmod 1777 /tmp/hive
        hdfs dfs -chmod 777 /tmp/hadoop-yarn
        hdfs dfs -chmod 777 /tmp/hadoop-yarn/staging
        hdfs dfs -chmod 1777 /user/hive/warehouse
        hdfs dfs -ls /
        hdfs dfs -ls /tmp
```
