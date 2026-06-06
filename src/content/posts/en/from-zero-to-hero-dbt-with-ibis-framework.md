---
title: 'From Zero to Hero: dbt with Ibis Framework'
description: 'A complete guide from dbt fundamentals to Python-powered transformations'
pubDate: 2026-01-12
heroImage: '/images/2026/01/DBT_Ibis_compressed.png'
heroImageAlt: 'DBT Ibis compressed'
categories: ['Data Science']
tags: ['dbt', 'Analytics Engineering']
toc: true
---

_A complete guide from dbt fundamentals to Python-powered transformations_

## Introduction

After completing the [Complete dbt Data Build Tool Bootcamp](https://www.udemy.com/course/complete-dbt-data-build-tool-bootcamp-zero-to-hero-learn-dbt/), I realized dbt brings software engineering best practices to data transformation. But what if you could combine dbt’s structure with Python’s flexibility? That’s where **dbt-ibis** comes in.

This guide will take you from **zero to hero** – starting with dbt fundamentals, then showing you how to supercharge your transformations with Ibis framework. We’ll use DuckDB as our data warehouse.

## Part 1: Understanding dbt Basics

### What is dbt?

**dbt (data build tool)** is an open-source command-line tool that enables analysts and engineers to:

- Transform data using SQL (or Python with Ibis)

- Manage data models with version control

- Test data quality automatically

- Document your data pipeline

- Deploy changes safely

Think of dbt as **“software engineering practices for data”** – it brings Git workflows, testing, and modularity to your data transformations.

### dbt Core Concepts

#### 1. Models

Models are SQL or Python files that transform raw data into useful tables/views.

**SQL Model** (`models/customer_orders.sql`):

```sql
SELECT
    customer_id,
    COUNT(*) as order_count
FROM {{ ref('orders') }}
GROUP BY customer_id
```

#### 2. Sources

Define where your raw data lives (Snowflake, BigQuery, DuckDB, etc.).

**`models/sources.yml`**:

```yaml
version: 2

sources:
  - name: raw_data
    schema: main
    tables:
      - name: orders
      - name: customers
```

#### 3. Seeds

CSV files stored in your project that dbt loads as tables. Perfect for small reference data.

**`seeds/customer_segments.csv`**:

```text
customer_id,segment_name,segment_priority
1,Enterprise,High
2,SMB,Medium
3,Startup,Low
```

Load seeds with:

```text
dbt seed
```

Reference in models:

```sql
SELECT
    c.*,
    s.segment_name
FROM {{ ref('customers') }} c
LEFT JOIN {{ ref('customer_segments') }} s ON c.customer_id = s.customer_id
```

#### 4. Snapshots

Track changes to your data over time (Type 2 Slowly Changing Dimensions).

**`snapshots/customer_snapshot.sql`**:

```sql
{% snapshot customer_snapshot %}

{{
    config(
      target_schema='snapshots',
      unique_key='customer_id',
      strategy='timestamp',
      updated_at='updated_at'
    )
}}

SELECT * FROM {{ source('raw_data', 'customers') }}

{% endsnapshot %}
```

#### 5. Refs and Sources

- {{ ref('model_name') }} – Reference another model

- {{ source('source_name', 'table_name') }} – Reference raw data

- {{ ref('seed_name') }} – Reference a seed

#### 6. Tests

Ensure data quality with built-in and custom tests.

**`models/schema.yml`**:

```yaml
version: 2

models:
  - name: customer_orders
    columns:
      - name: customer_id
        tests:
          - unique
          - not_null
```

### dbt Project Structure

```text
my_dbt_project/
├── dbt_project.yml          # Project configuration
├── profiles.yml             # Database connections (usually in ~/.dbt/)
├── models/
│   ├── sources.yml          # Raw data definitions
│   ├── schema.yml           # Tests and docs
│   ├── staging/             # Cleaned raw data
│   │   ├── stg_orders.sql
│   │   └── stg_customers.sql
│   └── marts/               # Business logic
│       └── customer_metrics.sql
├── seeds/                   # CSV files
├── snapshots/               # Historical tracking
└── tests/                   # Custom tests
```

### Essential dbt Commands

```text
# Setup and validation
dbt debug                    # Test connection
dbt deps                     # Install dependencies

# Development
dbt run                      # Run all models
dbt run --select stg_orders  # Run specific model
dbt run --select +customer_orders  # Run model + upstream

# Testing
dbt test                     # Run all tests
dbt test --select customer_orders  # Test specific model

# Documentation
dbt docs generate            # Generate docs
dbt docs serve               # View docs locally

# Other
dbt seed                     # Load CSV files
dbt snapshot                 # Capture historical data
dbt compile                  # Compile without running
```

### Your First dbt Project

#### Step 1: Setup

```bash
# Install dbt with DuckDB adapter
pip install dbt-core dbt-duckdb

# Initialize project
dbt init my_project

# Navigate to project
cd my_project
```

#### Step 2: Configure DuckDB

**`~/.dbt/profiles.yml`**:

```text
my_project:
  target: dev
  outputs:
    dev:
      type: duckdb
      path: "analytics.duckdb"
```

#### Step 3: Create Sources

**`models/sources.yml`**:

```yaml
version: 2

sources:
  - name: jaffle_shop
    schema: main
    tables:
      - name: orders
      - name: customers
```

#### Step 4: Create Staging Models

**`models/staging/stg_orders.sql`**:

```sql
SELECT
    id as order_id,
    customer_id,
    order_date,
    status
FROM {{ source('jaffle_shop', 'orders') }}
```

#### Step 5: Create Business Logic

**`models/marts/customer_orders.sql`**:

```sql
SELECT
    c.customer_id,
    c.first_name,
    c.last_name,
    MIN(o.order_date) as first_order,
    MAX(o.order_date) as most_recent_order,
    COUNT(o.order_id) as number_of_orders
FROM {{ ref('stg_customers') }} c
LEFT JOIN {{ ref('stg_orders') }} o ON c.customer_id = o.customer_id
GROUP BY c.customer_id, c.first_name, c.last_name
```

#### Step 6: Run and Test

```text
dbt run
dbt test
dbt docs generate && dbt docs serve
```

## Part 2: Why Switch to Ibis?

Now that you understand dbt fundamentals, let’s see why Ibis is a game-changer.

### The Problem with Pure SQL

```sql
SELECT
    c.customer_id,
    c.first_name,
    c.last_name,
    MIN(o.order_date) as first_order,
    MAX(o.order_date) as most_recent_order,
    COUNT(o.order_id) as number_of_orders,
    SUM(o.amount) as total_spent
FROM {{ ref('stg_customers') }} c
LEFT JOIN {{ ref('stg_orders') }} o ON c.customer_id = o.customer_id
WHERE o.status = 'completed'
GROUP BY c.customer_id, c.first_name, c.last_name
HAVING COUNT(o.order_id) >= 2
ORDER BY total_spent DESC
```

**Issues with SQL:**

- No type checking

- Hard to reuse logic

- Difficult to unit test

- Limited IDE autocomplete

- Database-specific syntax variations

- Hard to debug complex queries

### The Ibis Solution

**Ibis Model** (`models/marts/customer_orders.ibis`):

```python
from dbt_ibis import depends_on, ref

@depends_on(ref("stg_customers"), ref("stg_orders"))
def model(stg_customers, stg_orders):
    """Calculate customer order metrics with Python"""
    # Filter completed orders
    completed_orders = stg_orders.filter(stg_orders["status"] == "completed")

    # Aggregate by customer
    customer_orders = completed_orders.group_by("customer_id").aggregate(
        first_order=completed_orders["order_date"].min(),
        most_recent_order=completed_orders["order_date"].max(),
        number_of_orders=completed_orders.count(),
        total_spent=completed_orders["amount"].sum()
    )

    # Join with customers
    result = stg_customers.join(customer_orders, "customer_id", how="left")

    # Filter and order
    return result.filter(
        result["number_of_orders"] >= 2
    ).order_by(result["total_spent"].desc())
```

**Benefits of Ibis:**

- Type safety – Catch errors before execution

- Reusable functions – Build complex transformations

- Unit testing – Test with pytest

- IDE support – Autocomplete and refactoring

- Backend agnostic – Works with DuckDB, Snowflake, BigQuery, etc.

- Python ecosystem – Use any Python library for logic

### Comparison: SQL vs Ibis

| Feature       | SQL                 | Ibis                |
| ------------- | ------------------- | ------------------- |
| Type Safety   | None                | Full Python typing  |
| Testing       | Limited             | pytest integration  |
| Reusability   | Copy-paste or Jinja | Functions & classes |
| Debugging     | Hard                | Python debugger     |
| IDE Support   | Basic               | Full autocomplete   |
| Multi-backend | Different syntax    | Same code           |

## Part 3: Implementing dbt with Ibis

### Installation

```bash
# Install dbt-ibis with DuckDB support
pip install dbt-ibis dbt-duckdb "ibis-framework[duckdb]"

# Verify installation
dbt --version
dbt-ibis --version
```

### Project Structure with Ibis

```text
my_dbt_project/
├── dbt_project.yml
├── models/
│   ├── sources.yml
│   ├── schema.yml
│   ├── staging/
│   │   ├── stg_orders.ibis        # Note: .ibis extension
│   │   ├── stg_customers.ibis
│   │   └── __ibis_sql/            # Auto-generated SQL (don't edit)
│   │       ├── stg_orders.sql
│   │       └── stg_customers.sql
│   └── marts/
│       ├── customer_orders.ibis
│       └── __ibis_sql/
│           └── customer_orders.sql
├── seeds/
│   └── customer_segments.csv
├── snapshots/
│   └── customer_snapshot.sql      # Snapshots remain in SQL
└── tests/
    └── test_customer_orders.ibis
```

**Important:** Ibis models use the `.ibis` file extension, NOT `.py`. The `dbt-ibis` CLI automatically compiles these to SQL files in `__ibis_sql/` subfolders.

### Configuration

**`~/.dbt/profiles.yml`**:

```text
my_project:
  target: dev
  outputs:
    dev:
      type: duckdb
      path: "analytics.duckdb"
```

**`dbt_project.yml`**:

```yaml
name: 'my_project'
version: '1.0.0'
config-version: 2

profile: 'my_project'

model-paths: ['models']
seed-paths: ['seeds']
snapshot-paths: ['snapshots']
test-paths: ['tests']

target-path: 'target'
clean-targets:
  - 'target'
  - 'dbt_packages'

models:
  my_project:
    staging:
      +materialized: view
    marts:
      +materialized: table
```

### Building Models with Ibis

#### 1. Define Sources with Column Data Types

**Critical:** For non-Ibis models, sources, seeds, and snapshots, you **must** specify column data types. This is how dbt-ibis knows the schema.

**`models/sources.yml`**:

```yaml
version: 2

sources:
  - name: jaffle_shop
    schema: main
    tables:
      - name: orders
        columns:
          - name: id
            data_type: integer
          - name: customer_id
            data_type: integer
          - name: order_date
            data_type: date
          - name: status
            data_type: varchar
          - name: amount
            data_type: decimal
      - name: customers
        columns:
          - name: id
            data_type: integer
          - name: first_name
            data_type: varchar
          - name: last_name
            data_type: varchar
          - name: email
            data_type: varchar
```

**Tip:** Use the [dbt-codegen](https://hub.getdbt.com/dbt-labs/codegen/latest/) package to auto-generate these column definitions:

```text
dbt run-operation generate_source --args '{"database_name": "main", "schema_name": "main", "generate_columns": true, "table_names": ["orders", "customers"]}'
```

#### 2. Create Staging Models

**`models/staging/stg_orders.ibis`**:

```python
from dbt_ibis import depends_on, source

@depends_on(source("jaffle_shop", "orders"))
def model(orders):
    """Clean and standardize orders data"""
    return orders.select(
        order_id=orders["id"],
        customer_id=orders["customer_id"],
        order_date=orders["order_date"],
        status=orders["status"],
        amount=orders["amount"]
    )
```

**`models/staging/stg_customers.ibis`**:

```python
from dbt_ibis import depends_on, source

@depends_on(source("jaffle_shop", "customers"))
def model(customers):
    """Standardize customer data"""
    return customers.select(
        customer_id=customers["id"],
        first_name=customers["first_name"],
        last_name=customers["last_name"],
        email=customers["email"].lower()
    )
```

#### 3. Create Business Logic Models

**`models/marts/customer_orders.ibis`**:

```python
from dbt_ibis import depends_on, ref

@depends_on(ref("stg_customers"), ref("stg_orders"))
def model(stg_customers, stg_orders):
    """
    Calculate customer order metrics:
    - First order date
    - Most recent order
    - Total number of orders
    - Total spent
    """
    # Filter for completed orders only
    completed_orders = stg_orders.filter(stg_orders["status"] == "completed")

    # Aggregate by customer
    customer_orders = completed_orders.group_by("customer_id").aggregate(
        first_order=completed_orders["order_date"].min(),
        most_recent_order=completed_orders["order_date"].max(),
        number_of_orders=completed_orders.count(),
        total_spent=completed_orders["amount"].sum()
    )

    # Join with customer details
    result = stg_customers.join(customer_orders, "customer_id", how="left")

    # Select final columns
    return result.select(
        "customer_id",
        "first_name",
        "last_name",
        "first_order",
        "most_recent_order",
        "number_of_orders",
        "total_spent"
    )
```

**Note:** Parameter names in the `model()` function must match the names used in `ref()` and `source()`. For example, `ref("stg_customers")` means the parameter should be `stg_customers`.

### Running Your Ibis Project

The key command is `dbt-ibis` instead of `dbt`:

```text
# Run all models (compiles .ibis to .sql, then runs dbt)
dbt-ibis run

# Run specific model
dbt-ibis run --select customer_orders

# Run with upstream dependencies
dbt-ibis run --select +customer_orders

# Run tests
dbt-ibis test

# Generate documentation
dbt-ibis docs generate
dbt-ibis docs serve

# Load seeds (seeds are still CSV, no Ibis)
dbt-ibis seed

# Run snapshots (snapshots are still SQL)
dbt-ibis snapshot
```

#### Understanding the Compilation Process

```text
# This single command:
dbt-ibis run

# Is equivalent to:
dbt-ibis precompile    # Convert .ibis files to .sql
dbt run                # Run the generated SQL with dbt
```

The `precompile` step generates SQL files in `__ibis_sql/` subfolders. You can inspect these to debug your Ibis expressions.

#### Shell Alias (Optional)

To continue using `dbt` command instead of `dbt-ibis`, add this alias to your `~/.bashrc` or `~/.zshrc`:

```text
alias dbt="dbt-ibis"
```

## Part 4: Working with Seeds and Snapshots

### Seeds with Ibis

Seeds remain CSV files, but you can reference them in Ibis models.

**`seeds/customer_segments.csv`**:

```text
customer_id,segment_name,segment_priority
1,Enterprise,High
2,SMB,Medium
3,Startup,Low
```

**`seeds/schema.yml`** (required for Ibis to know the types):

```yaml
version: 2

seeds:
  - name: customer_segments
    columns:
      - name: customer_id
        data_type: integer
      - name: segment_name
        data_type: varchar
      - name: segment_priority
        data_type: varchar
        tests:
          - accepted_values:
              values: ['High', 'Medium', 'Low']
```

**`models/marts/enriched_orders.ibis`**:

```python
from dbt_ibis import depends_on, ref

@depends_on(ref("stg_orders"), ref("customer_segments"))
def model(stg_orders, customer_segments):
    """Enrich orders with customer segments"""
    return stg_orders.join(
        customer_segments,
        "customer_id",
        how="left"
    ).select(
        "order_id",
        "customer_id",
        "order_date",
        "amount",
        "segment_name",
        "segment_priority"
    )
```

### Snapshots

Snapshots currently remain in SQL (dbt-ibis limitation). You can still reference them in Ibis models.

**`snapshots/customer_snapshot.sql`**:

```sql
{% snapshot customer_snapshot %}

{{
    config(
      target_schema='snapshots',
      unique_key='customer_id',
      strategy='timestamp',
      updated_at='updated_at'
    )
}}

SELECT * FROM {{ source('jaffle_shop', 'customers') }}

{% endsnapshot %}
```

**`models/schema.yml`** (define snapshot columns for Ibis):

```yaml
version: 2

snapshots:
  - name: customer_snapshot
    columns:
      - name: customer_id
        data_type: integer
      - name: first_name
        data_type: varchar
      - name: last_name
        data_type: varchar
      - name: email
        data_type: varchar
      - name: dbt_valid_from
        data_type: timestamp
      - name: dbt_valid_to
        data_type: timestamp
```

**`models/marts/customer_history.ibis`**:

```python
from dbt_ibis import depends_on, ref

@depends_on(ref("customer_snapshot"))
def model(customer_snapshot):
    """Analyze customer changes over time"""
    # Get current customers (dbt_valid_to is null)
    current = customer_snapshot.filter(
        customer_snapshot["dbt_valid_to"].isnull()
    )

    return current.select(
        "customer_id",
        "first_name",
        "last_name",
        "dbt_valid_from"
    )
```

## Part 5: Writing Tests with Ibis

### Singular Tests

Create `.ibis` files in your `tests/` folder with a `test` function (not `model`).

**`tests/test_no_duplicate_names.ibis`**:

```python
from dbt_ibis import depends_on, ref

@depends_on(ref("stg_customers"))
def test(stg_customers):
    """Test that no customer has first_name equal to last_name"""
    return stg_customers.filter(
        stg_customers["first_name"] == stg_customers["last_name"]
    )
```

The test passes if the query returns **zero rows**.

### Unit Testing with pytest

You can also write unit tests outside of dbt using pytest and Ibis memtables:

**`tests/unit/test_transformations.py`**:

```python
import pytest
import ibis

def test_customer_orders_aggregation():
    """Test that customer orders aggregation works correctly"""

    # Create test data using memtables
    test_orders = ibis.memtable({
        "order_id": [1, 2, 3, 4],
        "customer_id": [1, 1, 2, 3],
        "order_date": ["2024-01-01", "2024-01-15", "2024-01-20", "2024-02-01"],
        "status": ["completed", "completed", "completed", "pending"],
        "amount": [100.0, 150.0, 200.0, 50.0]
    })

    # Apply the same logic as your model
    completed_orders = test_orders.filter(test_orders["status"] == "completed")

    result = completed_orders.group_by("customer_id").aggregate(
        order_count=completed_orders.count(),
        total_spent=completed_orders["amount"].sum()
    ).execute()

    # Assert expectations
    assert len(result) == 2  # Only customers 1 and 2 have completed orders

    customer_1 = result[result["customer_id"] == 1].iloc[0]
    assert customer_1["order_count"] == 2
    assert customer_1["total_spent"] == 250.0
```

Run with:

```text
pytest tests/unit/
```

## Part 6: Advanced Ibis Patterns

### Complex Aggregations

```python
from dbt_ibis import depends_on, ref

@depends_on(ref("stg_orders"))
def model(stg_orders):
    """Customer lifetime value analysis"""
    return stg_orders.group_by("customer_id").aggregate(
        first_order=stg_orders["order_date"].min(),
        last_order=stg_orders["order_date"].max(),
        total_spent=stg_orders["amount"].sum(),
        avg_order_value=stg_orders["amount"].mean(),
        order_count=stg_orders.count()
    )
```

### Window Functions

```python
from dbt_ibis import depends_on, ref

@depends_on(ref("stg_orders"))
def model(stg_orders):
    """Rank orders by customer"""
    return stg_orders.mutate(
        order_rank=stg_orders["order_id"].rank().over(
            group_by="customer_id",
            order_by="order_date"
        ),
        running_total=stg_orders["amount"].sum().over(
            group_by="customer_id",
            order_by="order_date"
        )
    )
```

### Conditional Logic with Case Statements

````python
from dbt_ibis import depends_on, ref
import ibis

@depends_on(ref("stg_orders"))
def model(stg_orders):
    """Categorize order values"""
    return stg_orders.mutate(
        order_category=ibis.case()
            .when(stg_orders["amount"] Create reusable transformation functions:

```python
# models/utils/transformations.py (regular Python file)
def add_fiscal_quarter(table, date_column):
    """Add fiscal quarter based on date column"""
    import ibis
    month = table[date_column].month()
    return table.mutate(
        fiscal_quarter=ibis.case()
            .when(month.isin([1, 2, 3]), "Q1")
            .when(month.isin([4, 5, 6]), "Q2")
            .when(month.isin([7, 8, 9]), "Q3")
            .else_("Q4")
            .end()
    )
````

```python
# models/marts/orders_with_quarter.ibis
from dbt_ibis import depends_on, ref
from utils.transformations import add_fiscal_quarter

@depends_on(ref("stg_orders"))
def model(stg_orders):
    """Add fiscal quarter to orders"""
    return add_fiscal_quarter(stg_orders, "order_date")
```

## Part 7: Configuration Tips

### Column Name Casing (Snowflake, etc.)

For databases like Snowflake that store identifiers in uppercase:

**`dbt_project.yml`**:

```text
vars:
  # Format: dbt_ibis_letter_case_in_db_{profile}_{target}
  dbt_ibis_letter_case_in_db_my_project_prod: upper
  dbt_ibis_letter_case_in_expr: lower
```

This lets you write lowercase column names in your Ibis code while Snowflake stores them in uppercase.

### VS Code Configuration

Add to your VS Code `settings.json`:

```text
{
    "files.associations": {
        "*.ibis": "python"
    }
}
```

## Part 8: Limitations and Workarounds

### Current dbt-ibis Limitations

- No database connection in models – Ibis models generate SQL; they cannot query the database directly

- Column types required – Non-Ibis sources, seeds, snapshots, and SQL models need explicit column type definitions

- Snapshots remain SQL – Currently no Ibis support for snapshot definitions

### Workarounds

**For complex queries requiring database connection:** Use a SQL model for that specific transformation, then reference it in your Ibis models.

**For auto-generating column types:**

```text
# Install dbt-codegen
dbt deps  # After adding to packages.yml

# Generate source definitions
dbt run-operation generate_source \
  --args '{"database_name": "main", "schema_name": "main", "generate_columns": true, "table_names": ["orders"]}'

# Generate model column definitions
dbt run-operation generate_model_yaml \
  --args '{"model_names": ["stg_orders"]}'
```

## Part 9: CI/CD Integration

### GitHub Actions Example

**`.github/workflows/dbt.yml`**:

```sql
name: dbt CI

on: [push, pull_request]

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'

      - name: Install dependencies
        run: |
          pip install dbt-ibis dbt-duckdb "ibis-framework[duckdb]"
          pip install pytest

      - name: Verify Ibis compilation is up to date
        run: |
          dbt-ibis precompile
          # Check if any files changed
          if [[ -n \$(git status --porcelain) ]]; then
            echo "Error: dbt-ibis precompile generated changes. Please commit them."
            git status
            exit 1
          fi

      - name: Run dbt
        run: |
          dbt-ibis run
          dbt-ibis test

      - name: Run pytest
        run: pytest tests/unit/
```

### Pre-commit Hook

**`.pre-commit-config.yaml`**:

```yaml
repos:
  - repo: local
    hooks:
      - id: dbt-ibis-precompile
        name: dbt-ibis precompile
        entry: dbt-ibis precompile
        language: system
        pass_filenames: false
        files: '\.ibis\$'
```

## Part 10: Switching Backends

One of Ibis’s greatest strengths is backend portability. Your models work unchanged across databases.

### Development with DuckDB, Production with Snowflake

**`~/.dbt/profiles.yml`**:

```text
my_project:
  target: dev
  outputs:
    dev:
      type: duckdb
      path: "analytics.duckdb"

    prod:
      type: snowflake
      account: "{{ env_var('SNOWFLAKE_ACCOUNT') }}"
      user: "{{ env_var('SNOWFLAKE_USER') }}"
      password: "{{ env_var('SNOWFLAKE_PASSWORD') }}"
      role: analyst
      database: analytics
      warehouse: compute_wh
      schema: dbt_analytics
```

Run against different targets:

```text
# Development
dbt-ibis run

# Production
dbt-ibis run --target prod
```

Your Ibis models remain **unchanged** – they automatically compile to the appropriate SQL dialect!

## Conclusion

This guide took you from **zero to hero** – starting with dbt fundamentals and ending with Python-powered transformations using Ibis.

### What You Now Know

- dbt fundamentals: Models, sources, refs, tests, seeds, snapshots

- dbt commands: run, test, docs, seed, snapshot

- dbt-ibis syntax: .ibis files, @depends_on, ref(), source()

- Column type requirements: Why and how to specify them

- Testing: Singular tests and pytest integration

- Advanced patterns: Window functions, aggregations, reusable code

- CI/CD: GitHub Actions integration

- Multi-backend: Same code for DuckDB and Snowflake

### Quick Reference

| Task               | Command                          |
| ------------------ | -------------------------------- |
| Run all models     | dbt-ibis run                     |
| Run specific model | dbt-ibis run --select model_name |
| Run tests          | dbt-ibis test                    |
| Load seeds         | dbt-ibis seed                    |
| Run snapshots      | dbt-ibis snapshot                |
| Generate docs      | dbt-ibis docs generate           |
| Precompile only    | dbt-ibis precompile              |

### Supported Backends

dbt-ibis supports: DuckDB, Snowflake, BigQuery, Postgres, Redshift, RisingWave, Databricks, Trino, MySQL, SQLite, Oracle

### Resources

- dbt-ibis Documentation

- dbt-ibis GitHub

- Ibis Project

- dbt Documentation

- dbt-ibis Blog Post

_Ready to transform your data pipeline? Start with the examples above, experiment locally with DuckDB, and watch your productivity soar._
