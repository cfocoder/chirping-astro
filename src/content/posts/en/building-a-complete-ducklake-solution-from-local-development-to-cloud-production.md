---
title: 'Building a Complete DuckLake Solution: From Local Development to Cloud Production'
description: 'DuckLake is revolutionizing the lakehouse architecture by combining the simplicity of DuckDB with the power of modern data lake formats. In this comprehensive guide, I’ll walk you through building a complete DuckLake solution in two parts: first creating a local...'
pubDate: 2025-07-07
heroImage: '/images/2025/07/ducklake_logo.png'
heroImageAlt: 'ducklake logo'
categories: ['Data Science', 'SQL']
tags: []
toc: true
---

## Introduction

DuckLake is revolutionizing the lakehouse architecture by combining the simplicity of DuckDB with the power of modern data lake formats. In this comprehensive guide, I’ll walk you through building a complete DuckLake solution in two parts: first creating a local development environment, then scaling it to a cloud-based production setup using MotherDuck, Cloudflare R2, and Supabase.

This tutorial demonstrates a real-world data pipeline that transforms transactional data through bronze, silver, and gold layers, showcasing the power and flexibility of the DuckLake ecosystem.

## Table of Contents

- Introduction

- Architecture Overview

Technology Stack Comparison

- Part 1: Local DuckLake Implementation

Step 1: Setting Up the Data Warehouse with SQLite

- Step 2: Creating the Silver Layer with DuckDB

- Step 3: Creating the DuckLake

- Querying the Local DuckLake

- Part 2: Cloud-Based DuckLake with MotherDuck, R2, and Supabase

Prerequisites: Setting Up DuckDB Secrets

- Step 1: Creating the Cloud Data Warehouse in MotherDuck

- Step 2: Creating the Transactions Table

- Step 3: Inserting Sample Data

- Step 4: Data Transformation with Ibis Framework

- Step 5: Exporting to Cloudflare R2

- Step 6: Creating the Cloud DuckLake in Supabase

- Step 7: Attaching to the DuckLake

- Step 8: Loading Data into the Cloud DuckLake

- Querying the Cloud DuckLake

- Lessons Learned

- Key Benefits and Learnings

  1. Seamless Integration

- 2. Cost-Effective Storage

- 3. Flexible Metadata Management

- 4. Framework Flexibility

- 5. Performance at Scale

- Conclusion

- References

- Next Steps

## Architecture Overview

Our solution implements a modern lakehouse architecture with:

- Bronze Layer: Raw CSV data (local files and Cloudflare R2)

- Silver Layer: Transformed Parquet files with business logic

- Gold Layer: DuckLake tables optimized for analytics

- Data Warehouse: SQLite (local) and MotherDuck (cloud)

### Technology Stack Comparison

| Component           | Local Setup         | Cloud Setup                                     |
| ------------------- | ------------------- | ----------------------------------------------- |
| Data Warehouse      | SQLite (dwh.db)     | MotherDuck                                      |
| Compute Engine      | DuckDB              | MotherDuck + DuckDB                             |
| DuckLake Metadata   | DuckDB              | Supabase PostgreSQL                             |
| Bronze Storage      | Local CSV files     | Cloudflare R2                                   |
| Silver Storage      | Local Parquet files | Cloudflare R2                                   |
| Gold Storage        | Local Parquet files | Cloudflare R2                                   |
| Data Transformation | DuckDB SQL          | Ibis Framework + DuckDB                         |
| Secrets Management  | Not required        | DuckDB Persistent Secrets                       |
| Authentication      | Local files         | MotherDuck token, R2 keys, Supabase credentials |

## Part 1: Local DuckLake Implementation

### Step 1: Setting Up the Data Warehouse with SQLite

We start by creating a simple transactional database using SQLite to simulate a traditional data warehouse:

```sql
-- 1_sqlite_commands.sql
sqlite3 dwh.db

CREATE TABLE transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transaction_date DATE,
    customer_id INTEGER,
    product_name TEXT,
    quantity INTEGER,
    unit_price DECIMAL(10,2),
    total_amount DECIMAL(10,2)
);

INSERT INTO transactions (transaction_date, customer_id, product_name, quantity, unit_price, total_amount) VALUES
('2024-01-15', 1001, 'Laptop Pro', 1, 1299.99, 1299.99),
('2024-01-15', 1002, 'Wireless Mouse', 2, 29.99, 59.98),
('2024-01-16', 1003, 'USB Cable', 3, 9.99, 29.97),
('2024-01-16', 1004, 'Monitor 24"', 1, 299.99, 299.99),
('2024-01-17', 1005, 'Keyboard Mechanical', 1, 89.99, 89.99),
('2024-01-17', 1006, 'Headphones', 1, 149.99, 149.99),
('2024-01-18', 1007, 'Webcam HD', 1, 79.99, 79.99),
('2024-01-18', 1008, 'Phone Case', 2, 19.99, 39.98),
('2024-01-19', 1009, 'Tablet 10"', 1, 399.99, 399.99),
('2024-01-19', 1010, 'Charger USB-C', 1, 24.99, 24.99),
('2024-01-20', 1011, 'Speaker Bluetooth', 1, 59.99, 59.99),
('2024-01-20', 1012, 'Memory Card 64GB', 1, 39.99, 39.99),
('2024-01-21', 1013, 'Power Bank', 1, 49.99, 49.99),
('2024-01-21', 1014, 'Screen Protector', 3, 12.99, 38.97);

SELECT * FROM transactions;
.exit
```

This creates our foundational transactional data that represents typical e-commerce sales data.

### Step 2: Creating the Silver Layer with DuckDB

Next, we use DuckDB to connect to our SQLite database and perform transformations:

```sql
-- 2_duckdb_silver_commands.sql
duckdb

ATTACH 'dwh.db' AS sqlite_db (TYPE sqlite);
USE sqlite_db;

COPY (
SELECT
    product_name,
    SUM(total_amount) AS Sales
FROM transactions
GROUP BY product_name
ORDER BY Sales DESC
) TO 'silver/sales.parquet' (FORMAT PARQUET);

.exit
```

This transformation:

- Connects DuckDB to our SQLite database

- Aggregates sales data by product

- Exports the results as a Parquet file in the silver layer

### Step 3: Creating the DuckLake

Finally, we create our DuckLake using the DuckLake extension:

```sql
-- 3_duckdb_ducklake_commands.sql
duckdb

INSTALL ducklake;
LOAD ducklake;

ATTACH 'ducklake:duckdb:ducklake.db' AS ducklake_db (DATA_PATH 'gold/');
USE ducklake_db;

CREATE TABLE customers AS
FROM 'bronze/customers.csv';

CREATE TABLE inventory AS
FROM 'bronze/inventory.csv';

CREATE TABLE vendors AS
FROM 'bronze/vendors.csv';

CREATE TABLE sales AS
FROM 'silver/sales.parquet';

SHOW TABLES;
SELECT * FROM sales;

.exit
```

This creates our local DuckLake with:

- Customer data from CSV files

- Inventory and vendor information

- Transformed sales data from the silver layer

- All data automatically stored as optimized Parquet files in the gold folder

### Querying the Local DuckLake

Despite the data being stored as Parquet files in the gold folder, we can query the DuckLake tables as if they were traditional database tables:

```sql
SELECT * FROM sales;
```

This demonstrates one of DuckLake’s key advantages: the ability to query distributed Parquet files through a unified table interface, providing the performance benefits of columnar storage with the familiar SQL experience of traditional databases.

## Part 2: Cloud-Based DuckLake with MotherDuck, R2, and Supabase

### Prerequisites: Setting Up DuckDB Secrets

Before working with cloud services, we need to configure our credentials:

```sql
-- duckdb_settings.sql
duckdb

.timer on

CREATE PERSISTENT SECRET r2_secret (
  TYPE R2,
  KEY_ID 'your_r2_key_id',
  SECRET 'your_r2_secret',
  ACCOUNT_ID 'your_r2_account_id'
);

CREATE PERSISTENT SECRET supabase_secret (
  TYPE postgres,
  HOST 'your_supabase_host',
  PORT 6543,
  DATABASE 'postgres',
  USER 'your_supabase_user',
  PASSWORD 'your_supabase_password'
);

SELECT secret_string FROM duckdb_secrets();
.exit
```

**Important**: Make sure to set your MotherDuck token as an environment variable before proceeding.

### Step 1: Creating the Cloud Data Warehouse in MotherDuck

We start by replicating our transactional data in MotherDuck:

```sql
import duckdb
import ibis
from ibis import _

# Create connection to MotherDuck
dw = duckdb.connect("md:")
print("Connected successfully to MotherDuck!")

# Create a database (Schema) if it doesn't exist
schema_name = 'micho_db'

dw.sql("""
    CREATE DATABASE IF NOT EXISTS micho_db;
""")
print("Database created successfully.")
```

### Step 2: Creating the Transactions Table

```sql
dw.sql("""
    USE micho_db;

    DROP TABLE IF EXISTS transactions;

    -- Create a sequence for auto-incrementing IDs
    CREATE SEQUENCE IF NOT EXISTS transaction_id_seq;

    CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER DEFAULT nextval('transaction_id_seq') PRIMARY KEY,
        transaction_date TIMESTAMP,
        customer_id STRING,
        product_name STRING,
        quantity INTEGER,
        unit_price DOUBLE,
        total_amount DOUBLE
    );
""")
print("Table transactions created successfully with sequence-based auto-increment")
```

### Step 3: Inserting Sample Data

```sql
dw.sql("""
    INSERT INTO transactions (transaction_date, customer_id, product_name, quantity, unit_price, total_amount)
    VALUES
    ('2024-01-15', '1001', 'Laptop Pro', 1, 1299.99, 1299.99),
    ('2024-01-15', '1002', 'Wireless Mouse', 2, 29.99, 59.98),
    ('2024-01-16', '1003', 'USB Cable', 3, 9.99, 29.97),
    ('2024-01-16', '1004', 'Monitor 24"', 1, 299.99, 299.99),
    ('2024-01-17', '1005', 'Keyboard Mechanical', 1, 89.99, 89.99),
    ('2024-01-17', '1006', 'Headphones', 1, 149.99, 149.99),
    ('2024-01-18', '1007', 'Webcam HD', 1, 79.99, 79.99),
    ('2024-01-18', '1008', 'Phone Case', 2, 19.99, 39.98),
    ('2024-01-19', '1009', 'Tablet 10"', 1, 399.99, 399.99),
    ('2024-01-19', '1010', 'Charger USB-C', 1, 24.99, 24.99),
    ('2024-01-20', '1011', 'Speaker Bluetooth', 1, 59.99, 59.99),
    ('2024-01-20', '1012', 'Memory Card 64GB', 1, 39.99, 39.99),
    ('2024-01-21', '1013', 'Power Bank', 1, 49.99, 49.99),
    ('2024-01-21', '1014', 'Screen Protector', 3, 12.99, 38.97);
""")

print(f"Successfully inserted records with auto-generated IDs!")

# Verify the data
t = dw.sql("SELECT * FROM micho_db.main.transactions;")
print(t)

# Close MotherDuck connection
dw.close()
```

### Step 4: Data Transformation with Ibis Framework

For data transformations, we use the Ibis framework which provides a more Pythonic approach:

```text
# Create connection to MotherDuck database
con = ibis.duckdb.connect("md:")
print(f"Connected to MotherDuck successfully!")

# Execute the query on MotherDuck and pull the result into a Pandas DataFrame
silver = con.table('transactions', database='micho_db.main')
silver_transformed = silver.aggregate(
    total_quantity=_.quantity.sum(),
    average_unit_price=_.unit_price.mean(),
    total_amount=_.total_amount.sum(),
    by=['product_name']
).order_by(_.total_amount.desc())

silver_transformed_df = silver_transformed.to_pandas()
print(silver_transformed_df)

# Close the Ibis connection to MotherDuck
con.disconnect()
```

### Step 5: Exporting to Cloudflare R2

We export our transformed data to Cloudflare R2 object storage:

```text
# Export the Pandas DataFrame to a Parquet file in the R2 bucket
duckdb.sql("""
INSTALL httpfs;
LOAD httpfs;
""")

duckdb.sql("COPY (SELECT * FROM silver_transformed_df) TO 'r2://ducklake/silver/silver_transformed.parquet' (FORMAT 'parquet', OVERWRITE);")
print("Exported Pandas Dataframe to R2 bucket successfully!")
```

### Step 6: Creating the Cloud DuckLake in Supabase

Now we create our production DuckLake using Supabase as the metadata store:

```text
# Connect to MotherDuck with DuckDB
con_lh = duckdb.connect('md:')
print("Connected successfully to MotherDuck!")

# Install necessary extensions
con_lh.install_extension('ducklake')
con_lh.load_extension('ducklake')

con_lh.install_extension('postgres')
con_lh.load_extension('postgres')

con_lh.install_extension('httpfs')
con_lh.load_extension('httpfs')
```

### Step 7: Attaching to the DuckLake

```text
# Attach to PostgreSQL DuckLake Database
try:
    con_lh.sql("""
            ATTACH 'ducklake:postgres:
            host=your_supabase_host
            port=6543
            user=your_supabase_user
            password=your_supabase_password
            dbname=postgres'
            AS ducklake1 (DATA_PATH 'r2://ducklake/gold/'); """
            )
    print("Attached to PostgreSQL DuckLake database successfully!")
except Exception as e:
    print(f"{e}")

con_lh.sql("USE ducklake1;")
```

### Step 8: Loading Data into the Cloud DuckLake

Finally, we create our DuckLake tables from the data stored in R2:

```sql
# Create customers table from bronze data
try:
    con_lh.sql("""
        CREATE TABLE customers AS
        SELECT * FROM 'r2://ducklake/bronze/customers.csv';
    """)
    print("Table customers created successfully from bronze folder!")
except Exception as e:
    print(f"Error creating table customers: {e}")

# Create vendors table
try:
    con_lh.sql("""
        CREATE TABLE vendors AS
        SELECT * FROM 'r2://ducklake/bronze/vendors.csv';
    """)
    print("Table vendors created successfully from bronze folder!")
except Exception as e:
    print(f"Error creating table vendors: {e}")

# Create inventory table
try:
    con_lh.sql("""
    CREATE TABLE inventory AS
    SELECT * FROM 'r2://ducklake/bronze/inventory.csv';
""")
    print("Table inventory created successfully from bronze folder!")
except Exception as e:
    print(f"Error creating table inventory: {e}")

# Create sales table from silver data
try:
    con_lh.sql("""
        CREATE TABLE sales AS
        SELECT * FROM 'r2://ducklake/silver/silver_transformed.parquet';
    """)
    print("Table sales created successfully from silver folder!")
except Exception as e:
    print(f"Error creating table sales: {e}")

# Show all tables
con_lh.sql("SHOW TABLES;")

# Query the sales data
con_lh.sql("SELECT * FROM ducklake1.sales;")

# Close connection
con_lh.close()
```

### Querying the Cloud DuckLake

Just like in the local setup, despite our data being distributed across Cloudflare R2 object storage as Parquet files, we can query the DuckLake tables seamlessly:

```text
con_lh.sql("SELECT * FROM ducklake1.sales;")
```

This query demonstrates the power of DuckLake’s architecture: while the actual data resides in cost-effective object storage (R2), the metadata is managed in Supabase PostgreSQL, and we can query everything through a unified interface. The distributed storage is completely transparent to the user, providing both performance and cost optimization without sacrificing ease of use.

## Lessons Learned

During the development of this DuckLake solution, I encountered several important technical challenges that provided valuable insights for future projects.

Initially, I assumed that since DuckLake worked seamlessly with DuckDB in my local setup, I could simply extend this to MotherDuck for the cloud implementation. However, I discovered that MotherDuck doesn’t support DuckLake metadata management in the same way. This forced me to pivot to using Supabase’s PostgreSQL database as the metadata store, which ultimately proved to be a more robust solution for production environments. This experience taught me that while MotherDuck excels as a compute engine for data transformations, transactional databases like PostgreSQL are better suited for DuckLake’s metadata management requirements.

Another significant learning came when working with data exports to Cloudflare R2. I initially attempted to use the COPY command through the Ibis framework to export pandas DataFrames directly to R2 object storage. However, I learned that Ibis doesn’t support the COPY command for external storage operations. This limitation required me to switch back to using DuckDB directly for the export operation. This experience reinforced an important architectural principle: use DuckDB directly for structural database operations (CREATE, DROP, COPY, etc.) and reserve Ibis for data transformations and analytical queries. The clear separation of concerns between these tools leads to more reliable and maintainable data pipelines.

A third important discovery involved the Supabase connection configuration. Following the MotherDuck tutorial, I initially tried to attach to the Supabase DuckLake using just the simple reference `**dbname=postgres**`, expecting it to work with the DuckDB persistent secrets I had configured. However, this approach failed to establish the connection. I learned that despite having the Supabase secret properly configured, the ATTACH command requires the full connection string with all parameters explicitly specified (host, port, user, password, and dbname). This might be a bug in the current implementation, as theoretically the secret reference should be sufficient, but in practice, the complete connection string is necessary for successful connectivity to Supabase PostgreSQL databases.

## Key Benefits and Learnings

### 1. Seamless Integration

DuckLake provides seamless integration between different storage systems and compute engines. We can easily move between local development and cloud production environments.

### 2. Cost-Effective Storage

Using Cloudflare R2 for object storage provides significant cost savings compared to traditional cloud storage solutions, while maintaining high performance.

### 3. Flexible Metadata Management

Supabase provides a reliable and cost-effective PostgreSQL database for DuckLake metadata, enabling easy scaling and management.

### 4. Framework Flexibility

The combination of DuckDB SQL and Ibis Framework Python provides the best of both worlds – SQL for structural operations and Python for complex transformations.

### 5. Performance at Scale

MotherDuck allows us to leverage cloud compute power for data transformations while maintaining the simplicity of DuckDB.

## Conclusion

This comprehensive tutorial demonstrates how to build a complete DuckLake solution from local development to cloud production. The architecture we’ve built provides:

- Scalability: Easy to scale from local development to cloud production

- Cost-Effectiveness: Using open-source tools and cost-effective cloud services

- Flexibility: Supporting both SQL and Python workflows

- Performance: Leveraging the power of DuckDB and cloud compute

- Reliability: Using proven cloud services for storage and metadata management

The DuckLake ecosystem is rapidly evolving and provides an excellent foundation for modern data architectures. This setup gives you a solid foundation for building sophisticated data pipelines that can grow with your organization’s needs.

## References

- Introducing DuckLake: Lakehouse Architecture Reimagined for the Modern Era

- DuckLake in Practice: A Hands-On Tutorial of Core Features

- Getting Started with DuckLake Table Format

## Next Steps

Consider exploring:

- Advanced DuckLake features like time travel and versioning

- Integration with other cloud providers

- Implementing CI/CD pipelines for your data workflows

- Adding data quality and monitoring tools

- Exploring Delta Lake compatibility features
