---
title: 'The Powerful COPY Command in DuckDB / MotherDuck: A Quick Reference Guide'
description: 'The COPY command in DuckDB and MotherDuck is a versatile tool for importing and exporting data. This guide provides a concise overview of how to use COPY both from the DuckDB CLI (SQL only) and from Python, including workflows with Ibis and pandas. Use this as a quick...'
pubDate: 2025-07-08
heroImage: '/images/2025/07/COPY_Command_Logo.png'
heroImageAlt: 'COPY Command Logo'
categories: ['Data Science', 'Python', 'SQL']
tags: []
toc: true
---

The `COPY` command in DuckDB and MotherDuck is a versatile tool for importing and exporting data. This guide provides a concise overview of how to use `COPY` both from the DuckDB CLI (SQL only) and from Python, including workflows with Ibis and pandas. Use this as a quick reference for your data engineering tasks!

## Table of Contents

- Section 1: Using COPY in DuckDB CLI (SQL Only)

Working with CSV Files

- Working with Parquet Files

- Section 2: Using COPY with the DuckDB Python Library

Basic COPY Operations

Working with Parquet Files

- Working with CSV Files

- Core Concepts

Understanding register()

- Understanding fetchdf()

- Practical Workflows

Workflow: Ingesting a pandas DataFrame

- Workflow: Moving Data from Snowflake (via Ibis) to DuckDB

- Section 3: MotherDuck-Specific Operations

Connecting to MotherDuck

- Using COPY with MotherDuck Tables

- Cloning a Database with COPY DATABASE

- Tips

- References

## Section 1: Using COPY in DuckDB CLI (SQL Only)

The `COPY` command allows you to efficiently move data between DuckDB tables and files in various formats (CSV, Parquet, JSON, etc.).

### Working with CSV Files

When working with CSV files, you can specify several options to handle different formats, such as the presence of a header, the delimiter used, and rows to skip.

```text
-- Export with a header
COPY my_table TO 'output.csv' (FORMAT CSV, HEADER);

-- Import a file with no header, using a semicolon delimiter, and skipping the first 2 rows
COPY my_table FROM 'input.csv' (FORMAT CSV, HEADER false, DELIMITER ';', SKIP 2);
```

### Working with Parquet Files

Parquet is a highly efficient columnar format ideal for large datasets.

```text
-- Export to Parquet
COPY my_table TO 'output.parquet' (FORMAT PARQUET);

-- Import from Parquet
COPY my_table FROM 'input.parquet' (FORMAT PARQUET);

-- Export a query result to Parquet
COPY (SELECT col1, col2 FROM my_table WHERE col3 > 100) TO 'filtered_output.parquet' (FORMAT PARQUET);

-- Import multiple Parquet files using a glob pattern
COPY my_table FROM 'data_folder/*.parquet' (FORMAT PARQUET);
```

## Section 2: Using COPY with the DuckDB Python Library

DuckDB integrates seamlessly with Python, allowing for powerful data manipulation and transfer.

### Basic COPY Operations

#### Working with Parquet Files

```python
import duckdb
con = duckdb.connect()

# Export a table to Parquet
con.execute("COPY my_table TO 'output.parquet' (FORMAT PARQUET)")

# Import a Parquet file
con.execute("COPY my_table FROM 'input.parquet' (FORMAT PARQUET)")
```

#### Working with CSV Files

```text
# Basic CSV export with header
con.execute("COPY my_table TO 'output.csv' (FORMAT CSV, HEADER)")

# Basic CSV import with header
con.execute("COPY my_table FROM 'input.csv' (FORMAT CSV, HEADER)")

# Advanced CSV import with custom parameters
con.execute("COPY my_table FROM 'input.csv' (FORMAT CSV, HEADER false, DELIMITER '|', SKIP 1)")
```

### Core Concepts

#### Understanding register()

The `con.register('view_name', python_object)` function is a zero-copy operation that makes a Python object (like a pandas DataFrame or Arrow table) queryable as a virtual table in DuckDB without moving or duplicating data. This is highly efficient for querying data that already exists in memory.

#### Understanding fetchdf()

The `.fetchdf()` method is called on a query result object to retrieve the complete result set as a pandas DataFrame. This is extremely useful when you want to use the results of a DuckDB query in other Python libraries that work with DataFrames, such as scikit-learn, Matplotlib, or Streamlit.

```python
import pandas as pd
df = pd.DataFrame({'a': [1, 2, 3]})
con.register('my_df_view', df)

# Execute a query and fetch the result as a pandas DataFrame
result_df = con.execute('SELECT * FROM my_df_view').fetchdf()
print(type(result_df))
#
```

### Practical Workflows

#### Workflow: Ingesting a pandas DataFrame

A common workflow is to load or generate data in a pandas DataFrame and then move it into DuckDB for faster querying or to save it in a more efficient format like Parquet.

```python
import pandas as pd
import duckdb

# 1. Create a pandas DataFrame
data = {'product': ['A', 'B', 'C', 'D'], 'sales': [100, 150, 200, 50]}
df = pd.DataFrame(data)

# 2. Connect to DuckDB and register the DataFrame
con = duckdb.connect('my_duckdb.db')
con.register('df_view', df)

# 3. Create a persistent table in DuckDB from the DataFrame
con.execute("CREATE OR REPLACE TABLE product_sales AS SELECT * FROM df_view")

# 4. Use COPY to export the new table to a Parquet file
con.execute("COPY product_sales TO 'product_sales.parquet' (FORMAT PARQUET);")

print("DataFrame successfully ingested into DuckDB and exported to Parquet.")
```

#### Workflow: Moving Data from Snowflake (via Ibis) to DuckDB

You can efficiently move data from another database (like Snowflake) into DuckDB using Ibis, which can execute queries and stream results as Arrow tables, avoiding the need to load the entire dataset into a pandas DataFrame.

```python
import ibis
import duckdb

# 1. Connect to source and destination
con_sf = ibis.snowflake.connect(...)
con_duck = duckdb.connect('my_duckdb.db')

# 2. Get a reference to the source table
table_sf = con_sf.table('MY_SNOWFLAKE_TABLE')

# 3. Create a table in DuckDB and insert the data directly
# Ibis executes the query and streams the data to DuckDB
con_duck.execute("CREATE OR REPLACE TABLE my_duckdb_table AS SELECT * FROM table_sf")

# 4. Export the imported data to a Parquet file for backup or sharing
con_duck.execute("COPY my_duckdb_table TO 'snowflake_data_backup.parquet' (FORMAT PARQUET)")

print("Data successfully moved from Snowflake to DuckDB and exported to Parquet.")
```

## Section 3: MotherDuck-Specific Operations

MotherDuck extends DuckDB with cloud features, including easy database sharing and cloning.

### Connecting to MotherDuck

To connect to MotherDuck, use a connection string with your service token.

```python
import duckdb

# Use your MotherDuck token to connect
con = duckdb.connect('md:?motherduck_token=YOUR_TOKEN_HERE')

# You can now run queries on your MotherDuck databases
con.execute("USE my_database;")
con.execute("SELECT * FROM my_table LIMIT 5;").fetchdf()
```

### Using COPY with MotherDuck Tables

You can use the `COPY` command to export data from MotherDuck tables to local files or import data from local files to MotherDuck.

```text
# Export a MotherDuck table to a local Parquet file
con.execute("COPY my_motherduck_table TO 'local_backup.parquet' (FORMAT PARQUET)")

# Import a local CSV file to a MotherDuck table
con.execute("COPY my_motherduck_table FROM 'local_data.csv' (FORMAT CSV, HEADER)")
```

### Cloning a Database with COPY DATABASE

The `COPY DATABASE` command is a powerful MotherDuck feature for creating an exact copy of a database, which is useful for backups or creating development environments. You can execute these commands from Python as follows:

```python
import duckdb

# Connect to MotherDuck
con = duckdb.connect('md:?motherduck_token=YOUR_TOKEN_HERE')

# Attach the target database (can be a local file)
con.execute("ATTACH 'my_local_backup.db' AS local_db;")

# Copy your cloud database to the local file
con.execute("COPY DATABASE my_cloud_database TO local_db;")

print("Database 'my_cloud_database' successfully copied to 'my_local_backup.db'")
```

## Tips

- The COPY command is the most efficient way to perform bulk data import/export in DuckDB and MotherDuck.

- Parquet is the recommended format for large datasets due to its columnar nature and compression.

- Use register() for zero-copy querying of in-memory Python objects.

- When moving data between databases with Ibis, stream data directly to avoid materializing intermediate DataFrames.

- For MotherDuck, you can seamlessly move data between cloud tables and local files using COPY.

## References

- DuckDB COPY Statement

- DuckDB Data Import/Export

- DuckDB Tricks: Part 1

- MotherDuck: Copying Databases

- MotherDuck SQL Reference: COPY DATABASE
