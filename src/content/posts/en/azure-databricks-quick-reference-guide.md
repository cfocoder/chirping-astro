---
title: 'Azure Databricks Quick Reference Guide'
description: 'Databricks is an analytics and data engineering platform that sits on top of Spark, an analytics engine for big data processing and machine learning. Spark uses in-memory processing using a distributed computer platform of clusters that work as if they were a single one.'
pubDate: 2024-02-24
heroImage: '/images/2024/02/og-databricks-1030x541-1.png'
heroImageAlt: 'og databricks 1030×541'
categories: ['Data Science']
tags: []
toc: true
---

Databricks is an analytics and data engineering platform that sits on top of Spark, an analytics engine for big data processing and machine learning. Spark uses in-memory processing using a distributed computer platform of clusters that work as if they were a single one.

Databricks makes it easy to work with Spark as its runtime is optimized to run fast and among other features, it lets us create databases and tables and do SQL Analytics.

Azure offers two types of tiers, standard and premium, but given the features and the difference between these two offerings, it is always better to get premium.

The cost of Databricks in Azure has two main components, one is Databricks itself, priced as “DBUs” or Databricks Units per hour, and the second component which is the type of VM used.

The Databricks component comes in two types of clusters, one for “All-Purpose Compute” which costs \$0.55/DBU per hour, and one for running specific jobs which is cheaper as it costs \$0.30/DBU per hour.

For the VM instance, if we get the cheaper one which as of today is “DS3 V2” with 4 cores and 14 GB of RAM, it costs about \$0.30/ hour, so in total, we are talking about a cost per hour of about \$0.85 for running Databricks for a single node..

## Table of Contents

- Magic Commands

- Databricks Utilities

File System Utilities

- Secret Utilities: Securing Secrets with an Azure Key Vault

Creating an Azure Key Vault

- Creating a Databricks Secret Scope

- Using Databricks Secrets Utility (dbutils.secrets)

- Using Secrets Utility in a Databricks Cluster

- Widget Utilities (Parameters)

- Notebook Utilities

- Working with the DBFS Root

- Accessing Data stored in an Azure Data Lake Storage (ADLS) Gen 2

  1.- Accessing Azure Data Lake Storage (ADLS) with the “abfss” protocol/driver

  1.1- Accessing ADLS with Access Keys

- 1.2.- Accessing ADLS with Shared Access Signature (SAS Token)

- 1.3.- Accessing ADLS with Service Principal (an Application)

- 1.4.- Accessing ADLS with Scoped Authentication

- 2.- Databricks Mounts

DBFS File Browser

- How to mount an ADLS Gen 2

- Display all the mounts

- How to unmount an ADLS Gen 2

- Accessing data in ADLS2 through Unity Catalog

  1.- Giving access to the “Unity Catalog Access Connector” to the ADLS2

- 2.- Entering location of the ADLS2 in the Azure Databricks Workspace

- Working with Delta Tables

  1.- CREATE a Delta Table

  1.1 – Create Delta Table with Spark SQL in Databricks

- 1.2 – Create Delta Table with Pyspark in Databricks

- 1.3 – Create Delta Table with the Delta API

- 1.4 – Save data as Delta Table in an External Location

- 2.- READ a Delta Table

  2.1 – Read a Delta Table with Spark SQL in Databricks

- 2.2 – Read a Delta Table with PySpark in Databricks

- 2.3 Read a Delta file stored in an External Location

- 3.- UPDATE a Delta Table (Delete, Update, and Merge)

  3.1 – Delete a row from a Delta Table using Spark SQL in Databricks

- 3.2 – Delete a row from a Delta Table using the Delta API

- 3.3 – Update a row from a Delta Table using the Delta API

- 3.4 – Merge data from two Delta Tables using the Delta API

- 4.- Time Travel Delta Tables

- 5.- Convert Parquet files to Delta

- 6.- Delta Table Optimization Utilities

  6.1 – Vacuum Utility

- 6.2 – Reorg Utility

- 6.4 – Optimize Utility and Zorder

- Incremental Ingestion of Data in Databricks

  1.- COPY INTO Command

- 2.- PySpark Structured Streaming API

- 3.- Databricks Autoloader

- 4.- Delta Live Tables (DLT Pipelines)

  4.1- Create a Streaming Table with source files in a Volume

- 4.2- Create a Streaming Table with data from another Streaming Table

- 4.3- SCD Type 2 dimensions using CDC

  4.4- Create Materialized Table (Gold)

## Magic Commands

There are 6 main types of “magic commands” which are little pieces of code that are placed on top of a Jupyter notebook cell before the Python or SQL code.

- %sql (for running SQL commands)

- % md (for writing Markdown text)

- %fs (for running Linux file system commands, such as “ls” for listing the content of a folder)

- %sh (for using the shell)

- %run (for executing a notebook from another notebook)

- %lsmagic (for listing all the magic commands available)

## Databricks Utilities

Databricks has a set of utilities that make it easier to handle different tasks

- File System Utilities

- Secrets Utilities

- Widget Utilities

- Notebook Workflow Utilities

### File System Utilities

```text
## For listing the contents of the folder "databricks-datasets"
dbutils.fs.ls('/databricks-datasets/')
```

We can get help hints by typing .help() after the dbutils command like this:

```text
## For getting help about the fs command
dbutils.fs.help()
```

### Secret Utilities: Securing Secrets with an Azure Key Vault

A Key Vault helps to store the credentials securely and reference them in notebooks, clusters, or jobs when we need them.

We first create an Azure Key Vault, after that, we create a Databricks Secret Scope and then we link it to the Azure Key Vault, and from there, we can create the secrets inside the Notebooks, Clusters, or Jobs.

#### Creating an Azure Key Vault

From the Azure Portal, we search for the Key Vault and create the Key Vault as any other resource in the Azure Portal. We just need to be careful to select “Vault Access Policy” when creating the Key Vault in Azure

![](/images/2024/02/key_vault1.png)

Once the Key Vault is created in the Azure portal, we then go to it, and from the left navigation menu, click on “Secrets” and then on “Generate/Import”. In the following screen, we just need to give the secret a name and then its value.

![](/images/2024/02/secrets1.png)

#### Creating a Databricks Secret Scope

From the home page of the Databricks Dashboard, add “#secrets/createScope” to the end of the URL of the Databricks dashboard

![](/images/2024/02/databricks_secrets_scope.png)

This will reveal a hidden screen where we can create the scope for the secrets. In the “Manage Principal” dropdown select “All Users” and in the section for “Azure Key Vault”, it asks us to put the “DNS Name” and “Resource ID”.

![](/images/2024/02/databricks_secrets_scope2.png)

We can get the DNS Name and Resource ID from the section “Properties” of the Key Vault in Azure, this will link the key vaults in Databricks with the one in the Azure Portal

![](/images/2024/02/databricks_secrets_scope3.png)

#### Using Databricks Secrets Utility (dbutils.secrets)

These are the pieces of code to get details about the KeyValut. The value we get in the last one, we can save it in a variable in a Notebook so we can use it in the code

```text
# To see the functions associated with dbutils.secrets
dbutils.secrets.help()
```

```text
# To see the Scopes in Databricks
dbutils.secrets.listScopes()
```

```text
# To see the secrets inside a Databricks Scope
dbutils.secrets.list(scope='course_scope')
```

```text
# To get the value of a secret
dbutils.secrets.get(scope='course_scope', key='client')
```

#### Using Secrets Utility in a Databricks Cluster

In the previous section, we saw how to use secrets in a Notebook but secrets can also be implemented at the cluster level, just like we did in the section for “Accessing ADLS with Scoped Authentication”, the only difference here is that we need to insert the secret within curly brackets, putting first the word “secrets”, then the name of the scope followed by the name of the secret separated by “/”

```text
fs.azure.account.key.###_STORAGE_ACCOUNT_NAME_###.dfs.core.windows.net {{secrets/course_scope/accountkey}}
```

### Widget Utilities (Parameters)

The widget utilities are useful for passing parameters to a notebook. There are several types of parameters, but the one in the example below refers to a text parameter that is later read by the get method

```text
dbutils.widgets.text("p_data_source", "")
v_data_source = dbutils.widgets.get("p_data_source")
print(v_data_source)
```

### Notebook Utilities

The notebook utilities only have two functions, exit and run. Exit returns a value from a notebook, for example when we place it at the very end of a notebook, we can return the value “success” after the successful completion of a notebook.

With the “run” function, we can execute other notebooks and we can even pass parameters to them. In the example below, we are executing the notebook named “1_ingest_circuits_CSV_file” and we are passing the parameter “p_data_source” with the value “Ergast API”.

```text
dbutils.notebook.exit('Success')
```

```text
dbutils.notebook.run("1_ingest_circuits_CSV_file", 0, {"p_data_source": "Ergast API"})
```

## Working with the DBFS Root

By default, when we list the files of the root directory, Databricks understands that we want to see data inside the DBFS like this (with and without the qualifier):

```text
display(dbutils.fs.ls('dbfs:/databricks-datasets/'))
```

```text
display(dbutils.fs.ls('/databricks-datasets/'))
```

But this is another file system qualifier like file:/, that allows us to access the local file system of the driver machine

```text
display(dbutils.fs.ls('file:/'))
```

## Accessing Data stored in an Azure Data Lake Storage (ADLS) Gen 2

When we mount external storage, we mount it inside the root directory ‘/’. There are two ways of accessing data stored in an ADLS

- Using the “abfss” protocol/driver

- Mounting a Disk in the Databricks cluster

The first method requires long “abfss” pointers to containers and files, so whenever possible, it is preferred to work with mounted disks.

### 1.- Accessing Azure Data Lake Storage (ADLS) with the “abfss” protocol/driver

There are 5 ways of accessing data in ADLS from Databricks:

- Using Access Keys:

- Using Shared Access Signature (SAS Token):

- Using Service Principal (From an Application)

- Cluster Scoped Authentication

- Unity Catalog

Each access type comes with pros and cons so it depends on the situation which one is better1.

To refer to a file inside an ADLS (Azure Data Lake Storage) container, we need to use the “abfs” driver instead of the “HTTP” protocol like this. The piece before the “@” symbol, is the name of the container:

```text
abfss://demo@###_STORAGE_ACCOUNT_NAME_###.dfs.core.windows.net/test/circuits.csv
```

#### 1.1- Accessing ADLS with Access Keys

This access gives full access to the storage with a superuser access level. We just need to set the Spark config by running this code in the first cell of the notebook, we can get the keys from the ADLS

```text
# Set the spark config fs.azure.account.key
spark.conf.set(
   'fs.azure.account.key.###_STORAGE_ACCOUNT_NAME_###.dfs.core.windows.net',
   '####_MY_KEY_#####')
```

#### 1.2.- Accessing ADLS with Shared Access Signature (SAS Token)

We can control access at a more granular level. We can restrict access to specific resource types or services and allow specific permissions such as only read or write and we can even restrict IP addresses.

We can get the SAS Token, by going first to a specific container in the ADLS, and by right-clicking on the ellipsis, we then select “Generate SAS”:

![](/images/2024/02/sas_token_adls.png)

Then, similar to the case with Access Keys, we need to run this code in the first cell of the notebook.

```text
# Set the Spark config for SAS Token

spark.conf.set(
  'fs.azure.account.auth.type.###_STORAGE_ACCOUNT_NAME_###.dfs.core.windows.net',
  'SAS')

spark.conf.set(
  'fs.azure.sas.token.provider.type.###_STORAGE_ACCOUNT_NAME_###.dfs.core.windows.net',
  'org.apache.hadoop.fs.azurebfs.sas.FixedSASTokenProvider')

spark.conf.set(
  'fs.azure.sas.fixed.token.###_STORAGE_ACCOUNT_NAME_###.dfs.core.windows.net',
  '###_MY_SAS_TOKEN_###')
```

#### 1.3.- Accessing ADLS with Service Principal (an Application)

This approach is recommended when we want to access data in an ADLS in an automated way. The steps to set this access are:

- Register Azure AD Application / Service Principal

- Generate a secret/password for the Application

- Set the Spark Config settings in the Notebook with App/Client Id, Directory/Tenant Id & Secret

- Assign the Role “Storage Blob Data Contributor” to the ADLS

To register the Application, from the Azure Portal, we go to “Microsoft Entra ID” and then from “App registrations”, we click on “new registration”

![](/images/2024/02/app_registration.png)

With the application registered, we take note of:

- Application / Client ID

- Directory / Tenant ID

- Secret Value (From the “Certificates & secrets” section). ** We need the Secret Value, not the Secret ID **

We then create variables for each of these 3 values in the Jupyter notebook so we can use them later in the notebook in the config setup.

```text
# Register Azure AD Application & Generate a secret/password for the Application
client_id = '###_MY_CLIENT_ID_###'
tenant_id = '###_MY_TENANT_ID_###'
client_secret_value = '###_MY_CLIENT_SECRET_VALUE_###'
```

```text
# Set the Spark config with App/Client id, Directory/Tenant Id and Secret

spark.conf.set(
  "fs.azure.account.auth.type.###_STORAGE_ACCOUNT_NAME_###.dfs.core.windows.net",
  "OAuth")

spark.conf.set(
   "fs.azure.account.oauth.provider.type.###_STORAGE_ACCOUNT_NAME_###.dfs.core.windows.net",
   "org.apache.hadoop.fs.azurebfs.oauth2.ClientCredsTokenProvider")

spark.conf.set(
   "fs.azure.account.oauth2.client.id.###_STORAGE_ACCOUNT_NAME_###.dfs.core.windows.net",
   client_id)

spark.conf.set(
   "fs.azure.account.oauth2.client.secret.###_STORAGE_ACCOUNT_NAME_###.dfs.core.windows.net",
   client_secret_value)

spark.conf.set(
   "fs.azure.account.oauth2.client.endpoint.###_STORAGE_ACCOUNT_NAME_###.dfs.core.windows.net",
   f"https://login.microsoftonline.com/{tenant_id}/oauth2/token")
```

Finally, after finishing the config setup, we just need to assign the role of “Storage Blob Data Contributor” to the app in the ADLS. To do that, we first go to the ADLS, then to “Access Control (IAM)” on the left menu, and on the next screen we type the role name in the search box. We then click next, and assign access to “User Group, or service principal” followed by clicking on “Select Members” and then a pop-up screen will appear where we will type the name of the app so we can click on it and select it to assign the role to it.

![](/images/2024/02/adls_role1.png)

![](/images/2024/02/adls_role2.png)

#### 1.4.- Accessing ADLS with Scoped Authentication

In the previous 3 ways of accessing an ADLS container, we had the config setup in the Jupyter Notebook itself, but in the Scoped Authentication, we set up the configuration in the cluster so that all the notebooks in the cluster could have access to the ADLS container.

To do this, we need to go to the cluster in Databricks and open the “Advanced Options” section at the bottom, and in the Spark tab, type value pairs of the Access Keys separated by a space:

![](/images/2024/02/cluster_auth.png)

After doing this, we no longer need to set the config cell from within a Notebook, as the access is set up now at the cluster level

### 2.- Databricks Mounts

Databricks File System (DBFS) is a distributed file system mounted on the Databricks workspace created in the default Azure Blob Storage when the Databricks cluster was deployed. DBFS is the default storage location, and this is what is called “root” but it is not recommended for storing user data as data doesn’t persist long-term. For long-term storage, we have to mount data stored in another blob storage container created by us.

#### DBFS File Browser

By default, the DBFS file browser is disabled, so to enable it, we have to go to the Settings section and enable it as in the screenshot below. This will enable us to browse the contents of a mounted ADLS so we can upload or browse its contents.

![](/images/2024/02/dfs_browser.png)

The advantage of using data from mounted ADLS, is that we don’t have to provide credentials, we can list the contents of a folder or show a file as in the following commands.

```text
display(dbutils.fs.ls('/FileStore/'))
```

```text
display(spark.read.csv('/FileStore/circuits.csv'))
```

#### How to mount an ADLS Gen 2

The process is very similar to Accessing ADLS with Service Principal, the difference is that the config details are provided in a dictionary and separately we run a mount function passing the config details as a parameter of the mount function, below is the code:

```text
configs = {"fs.azure.account.auth.type": "OAuth",
          "fs.azure.account.oauth.provider.type": "org.apache.hadoop.fs.azurebfs.oauth2.ClientCredsTokenProvider",
          "fs.azure.account.oauth2.client.id": client_id,
          "fs.azure.account.oauth2.client.secret": client_secret_value,
          "fs.azure.account.oauth2.client.endpoint": f"https://login.microsoftonline.com/{tenant_id}/oauth2/token"}
```

```text
dbutils.fs.mount(
    source = "abfss://{container_name}@{storage_account_name}.dfs.core.windows.net",
    mount_point = "/mnt/{container_name}",
    extra_configs = configs
)
```

```text
# Display the contents of the mounted demo container using the file system semantics
display(dbutils.fs.ls('/mnt/{container_name}/'))
```

#### Display all the mounts

```text
display(dbutils.fs.mounts())
```

#### How to unmount an ADLS Gen 2

```text
dbutils.fs.unmount('/mnt/{container_name}')
```

## Accessing data in ADLS2 through Unity Catalog

After the introduction of Unity Catalog, as a central governance feature in Databricks, it is now the preferred way of accessing data stored in Azure Data Lake Storage Version 2 (ADLS2) rather than with DBFS mounts as described in previous steps. It is not only because of convenience but also because of the level of granularity that we have when granting permissions.

So now, when we create a Databricks workspace in Azure, Databricks creates several resources automatically inside a dedicated resource group, among them, a “unity catalog access connector” which is the link between the Azure Portal and the Databricks workspace, and it also creates a Storage Account which is used internally by Databricks, so we don’t have any control of the data stored inside this storage account.

So, to store data in ADLS2, data that we can control, we need to create a separate Storage Account in Azure, but to give Databricks access to it, all we have to do, is grant access to the “unity catalog access connector” created automatically by Databricks from the Azure Data Lake Storage, and after that, we then input the location of the ADLS2 from within the Databricks workspace.

### 1.- Giving access to the “Unity Catalog Access Connector” to the ADLS2

From the Azure Portal, we go to the ADLS2 control panel and then we click on “Access Control IAM” and select the role of “Storage Blob Data Contributor”. After that, we select “Managed Identity” and search for the “unity-catalog-access-connector” and finally we click on “Review + assign”.

![](/images/2024/04/unity_catalog_access_connector_adls2.jpg)

### 2.- Entering location of the ADLS2 in the Azure Databricks Workspace

When the Databricks workspace was created, it automatically entered the credentials of the “unity catalog access connector”, this gives Databricks access to the Azure portal, and because in the previous step, we granted access to the connector to the ADLS2, this is now accessible from Databricks, so all we have to do is enter the location of the container and the storage account as in the screenshot below. When entering the details, it will ask for the storage credential, which is the one created automatically by Databricks.

The URL needs to be in this format: **abfss://{container_name}@{storage_account_name}.dfs.core.windows.net/**

![](/images/2024/04/external_locations.png)

## Working with Delta Tables

For the next 3 steps, I will use a Pandas Dataframe to perform the 5 tasks in CRUD

```python
import pandas as pd

#Create the dictionary with the speficied columns
data = {
 'animal' : ['cat', 'dog', 'elephant', 'lion'],
 'name' : ['Micho', 'Candy', 'Dumbo', 'Simba'],
 'age' : [3, 5, 7, 15]
}

#Create the Pandas DataFrame
df = pd.DataFrame(data)

#Convert the Pandas DataFrame to Pyspark
df_pyspark = spark.createDataFrame(df)
df_pyspark.display()
```

### 1.- CREATE a Delta Table

#### 1.1 – Create Delta Table with Spark SQL in Databricks

I first create the table using SQL, then I insert data into it with Python code. I use Pyspark to insert data into the table, given that the DaataFrame is a Python object

```sql
%sql
CREATE TABLE IF NOT EXISTS dev.demo_db.pets (
  animal STRING ,
  name STRING,
  age INT
)
```

To create an external table, we just need to add the LOCATION at the end

```sql
%sql
CREATE TABLE IF NOT EXISTS dev.demo_db.pets_ext (
  animal STRING ,
  name STRING,
  age INT
) USING DELTA
LOCATION 'abfss://dbfs-container2@testdatabricksadls2.dfs.core.windows.net/external2'
```

```text
from pyspark.sql.functions import col

df_pyspark = df_pyspark.withColumn("age", col("age").cast("integer"))

df_pyspark.write.format('delta').mode('overwrite').saveAsTable('dev.demo_db.pets');
```

#### 1.2 – Create Delta Table with Pyspark in Databricks

If the table doesn’t exist, it will create it based on the PySpark Dataframe schema, if it exists, it will overwrite it

```text
from pyspark.sql.functions import col

df_pyspark = df_pyspark.withColumn("age", col("age").cast("integer"))

df_pyspark.write.format('delta').mode('overwrite').saveAsTable('dev.demo_db.pets')
```

#### 1.3 – Create Delta Table with the Delta API

The Delta API is a Python module that we have to import first before we can us it

```python
from delta import DeltaTable

(DeltaTable.createOrReplace(sparkSession=spark)
    .tableName("dev.demo_db.pets")
    .addColumn("animal", "STRING")
    .addColumn('name', 'STRING')
    .addColumn('age', 'INT')
    .execute()
)
```

```text
from pyspark.sql.functions import col

df_pyspark = df_pyspark.withColumn("age", col("age").cast("integer"))

df_pyspark.write.format('delta').mode('overwrite').saveAsTable('dev.demo_db.pets');
```

#### 1.4 – Save data as Delta Table in an External Location

We first need to add the external location to Databricks, then we can use it to save data. The coalesce piece avoids splitting the data into multiple parquet files (partitions), it restricts it to only one in this case

```text
(df_pyspark.coalesce(1).write
    .format('delta')
    .mode('overwrite')
    .save('abfss://dbfs-container2@testdatabricksadls2.dfs.core.windows.net/external')
)
```

### 2.- READ a Delta Table

#### 2.1 – Read a Delta Table with Spark SQL in Databricks

```sql
SELECT
*
FROM dev.demo_db.pets;
```

#### 2.2 – Read a Delta Table with PySpark in Databricks

```text
spark.read.format('delta').table('dev.demo_db.pets').display()
```

#### 2.3 Read a Delta file stored in an External Location

```text
spark.read.format('delta').load('abfss://dbfs-container2@testdatabricksadls2.dfs.core.windows.net/external').display()
```

### 3.- UPDATE a Delta Table (Delete, Update, and Merge)

Update operations such as Delete, Update, or Merge are not possible from the PySpark DataFrame API, so we can only do them with Spark SQL or with the Delta API.

#### 3.1 – Delete a row from a Delta Table using Spark SQL in Databricks

```sql
%sql
DELETE
FROM dev.demo_db.pets
WHERE name = 'Dumbo';
```

#### 3.2 – Delete a row from a Delta Table using the Delta API

```python
from delta import DeltaTable

pets_dt = DeltaTable.forName(sparkSession=spark, 'dev.demo_db.pets')

pets_dt.delete("name = 'Dumbo' ")
```

#### 3.3 – Update a row from a Delta Table using the Delta API

```python
from delta import DeltaTable

pets_dt = DeltaTable.forName(sparkSession=spark, tableOrViewName='dev.demo_db.pets')

pets_dt.update(
   condition = "name = 'Micho' ",
   set = {"age" :  "4"}
)
```

#### 3.4 – Merge data from two Delta Tables using the Delta API

```text
(people_dt.alias('tgt')
 .merge(source_df.alias('src'), 'src.id=tgt.id')
 .whenMatchedDelete(condition="tgt.firstName='Kailash' and tgt.lastName='Patil' ")
 .whenMatchedUpdate(condition="tgt.id=101", set = {"tgt.BirthDate": "src.dob"})
 .whenMatchedUpdate(set= {"tgt.id": "src.id", "tgt.firstName": "src.fname", "tgt.lastName": "src.lname", "tgt.birthDate": "src.dob"})
 .whenNotMatchedInsert(values = {"tgt.id": "src.id", "tgt.firstName": "src.fname", "tgt.lastName": "src.lname", "tgt.birthDate": "src.dob"})
 .execute()
)
```

### 4.- Time Travel Delta Tables

```text
%sql
DESCRIBE HISTORY dev.demo_db.people;
```

```text
%sql
-- Show the history of a delta file stored in a Volume (not a table yet)
DESCRIBE HISTORY delta.`/Volumes/dev/demo_db/files/fire_calls_t
```

```sql
%sql
SELECT * FROM dev.demo_db.people VERSION AS OF 1
```

```sql
%sql
SELECT * FROM dev.demo_db.people TIMESTAMP AS OF '2024-04-06T21:57:25.000+00:00'
```

```text
%sql
RESTORE TABLE dev.demo_db.people TO VERSION AS OF 4
```

### 5.- Convert Parquet files to Delta

```text
%sql
CONVERT TO DELTA parquet.`/Volumes/dev/demo_db/files/fire_calls_tbl`
PARTITIONED BY (Year INT)
```

### 6.- Delta Table Optimization Utilities

#### 6.1 – Vacuum Utility

It is used to purge old parquet partitions, the default minimum retention time allowed is 7 days, unless we override this setting

```text
SET spark.databricks.delta.retentionDurationCheck.enabled = false

VACUUM dev.demo_db.fire_calls_tbl RETAIN 0 HOURS
```

#### 6.2 – Reorg Utility

Used to mark columns from a delta table as “to be removed”, which no longer makes them visible in the table, although the underlying data is still retained

```text
REORG TABLE dev.demo_db.fire_calls_tbl APPLY(PURGE)
```

#### 6.4 – Optimize Utility and Zorder

This utility creates evenly balanced parquet files concerning their size on disk, thus preventing the creation of unnecessary small parquet files. It can be used along with the Zorder utility to maintain a specific order on key columns

```text
OPTIMIZE dev.demo_db.fire_calls_tbl ZORDER BY (Year, CallDate)
```

## Incremental Ingestion of Data in Databricks

Databrocks offers four methods of ingesting data:

- COPY INTO command

- PySpark Streaming

- Autoloader

- Delta Live Tables (DLT Pipelines)

### 1.- COPY INTO Command

This command will always replace the data of the whole table, and it is the recommended method for data loading in bulk, as it copies the entire data at once and not row by row as in an INSERT statement. We can input different parameters like the header in the case of CSV files or “mergeShema” in case we ingest data from a file that has an extra column that wasn’t there in the original schema.

In the FROM statement, we need to point directly to the file, so the COPY statement won’t work with a SELECT statement reading from another table or view.

If we want to be strict in the schema of the table, we can select the columns in a SELECT statement

```sql
COPY INTO dev.demo_db.invoices_raw
FROM
(
SELECT
        InvoiceNo::STRING
        ,StockCode::STRING
        ,Description::STRING
        ,Quantity::INT
        ,to_timestamp(InvoiceDate, "d-M-y H.m") AS InvoiceDate
        ,UnitPrice::DOUBLE
        ,CustomerID ::STRING
        ,Country::STRING
FROM "abfss://dbfs-container@testdatabricksadls2.dfs.core.windows.net/dataset_ch8/invoices"
)
FILEFORMAT = CSV
FORMAT_OPTIONS("header" = "true", "mergeSchema" = "true")
```

If we want to let Databricks infer the schema from the structure of the file, we can implement the “automatic schema evolution” in the COPY_OPTIONS and tell Databricks to infer the schema in the FORMAT_OPTIONS

```text
COPY INTO dev.demo_db.invoices_raw
FROM 'abfss://dbfs-container@testdatabricksadls2.dfs.core.windows.net/dataset_ch8/invoices'
FILEFORMAT= CSV
FORMAT_OPTIONS ("header" = "true", "inferSchema" = "true", "mergeSchema" = "true", "timestampFormat" = "d-M-y H:m")
COPY_OPTIONS("mergeSchema" = "true"); --for automatic schema evolution implementation
```

### 2.- PySpark Structured Streaming API

The ingestion of data through the Streaming API, involves running the code inside a python function. Inside this function, we first define a data frame with “spark.readStream” and then in a second step, we take this data frame and apply the method “.writeStream”, to write the data to the table with the “.toTable” method.

In the first example below, we are setting up the schema of the data in a variable, in the second example, we let Databricks infer the schema from the file, and it is not necessary to alter the table to add any new columns.

```python
def ingest():
  invoice_schema = """InvoiceNo int, StockCode string, Description string, Quantity int,
                    InvoiceDate timestamp, UnitPrice double, CustomerID int, Country string"""

  source_df = (spark.readStream
                      .format("csv")
                      .option("header", "true")
                      .schema(invoice_schema) #  FIXED SCHEMA
                      .load(f"{base_dir}/invoices")
  )

  write_query = (source_df.writeStream
                          .format("delta")
                          .option("checkpointLocation", f"{base_dir}/chekpoint/invoices")
                          .outputMode("append")
                          .trigger(availableNow = True) # To run it as a single micro batch for available data
                          .toTable("dev.demo_db.invoices_raw")
  )

ingest()
```

Schema inference is turned off by default, so in this 2nd example, we turn it on before executing the ingestion function

```python
def ingest():

  spark.conf.set("spark.sql.streaming.schemaInference", "true")

  source_df = (spark.readStream
                      .format("csv")
                      .option("header", "true")
                      .option("inferSchema", "true")  # Let Databricks to infer the Schema
                      .option("mergeSchema", "true")  # Automatic Schema evoluition
                      .load(f"{base_dir}/invoices")
  )

  write_query = (source_df.writeStream
                          .format("delta")
                          .option("checkpointLocation", f"{base_dir}/chekpoint/invoices")
                          .option("mergeSchema", "true") # Automatic Schema evoluition
                          .outputMode("append")
                          .trigger(availableNow = True)
                          .toTable("dev.demo_db.invoices_raw") # Create table if not exists
  )

ingest()
```

### 3.- Databricks Autoloader

Autoloader is a framework to efficiently process new data files from cloud storage (Amazon S3, GCP, Azure Data Lake Storage Gen 2. It is built on top of Spark Structured Streaming API, so it works very similar to Streaming API but in a more simplified way.

The key is the use of “cloudFiles” which is the Autoloader. The `spark.readStream.format("cloudFiles")` line specifies that we’re using the **cloudFiles** source for streaming data. The cloudFiles source automatically processes new files as they arrive, including existing files in the specified directory

```python
def ingest():
  source_df = (spark.readStream
                      .format("cloudFiles")
                      .option("cloudFiles.format", "csv")
                      .option("header", "true")
                      .option("timestampFormat","d-M-y H.m")
                      .option("cloudFiles.schemaLocation", f"{base_dir}/chekpoint/invoices_schema")
                      .option("cloudFiles.inferColumnTypes", "true") # Infer Schema
                      .option("cloudFiles.schemaHints", "InvoiceNo string, CustomerID string")
                      .load(f"{base_dir}/invoices")
  )

  write_query = (source_df.writeStream
                          .format("delta")
                          .option("checkpointLocation", f"{base_dir}/chekpoint/invoices")
                          .option("mergeSchema", "true")  # Automatic Schema Evolution
                          .outputMode("append")
                          .trigger(availableNow = True)
                          .toTable("dev.demo_db.invoices_raw")
  )

ingest()
```

## 4.- Delta Live Tables (DLT Pipelines)

DLT Tables is a framework for building pipelines. It simplifies the development of streaming pipelines, and the pipelines have two steps:

- Write Declarative the declarative pipeline code in a notebook. These are the different ELT / ETL steps to transform the data, from the ingestion of data to the creation of final tables.

- Create a DLT Pipeline using the Workflow UI

The code can be written in SQL or Python, but since I’m more familiar with SQL, I’ll write the samples in SQL.

Once our steps are finished in our notebook, we then create a Delta Live Table Pipeline from the UI, which is similar to creating a workflow

![](/images/2024/04/dlt.png)

### 4.1- Create a Streaming Table with source files in a Volume

The function cloud_files() is the autoloader that loads the data from the source files stored in cloud storage mounted on a Volume and we create a file as a STREAMING TABLE. This code is useful for creating a BRONZE table, where we load data as is, without applying any filter or transformation.

Any additional configurations can be provided as a “map”, which is nothing that data provided as key-value pairs.

```sql
CREATE OR REFRESH STREAMING TABLE customers_raw
AS SELECT *, current_timestamp() AS load_time
FROM cloud_files('/Volumes/dev/demo_db/landing_zone/customers', 'csv', map("cloudFiles.inferColumnTypes", "true"))
```

### 4.2- Create a Streaming Table with data from another Streaming Table

This is a typical code for producing SILVER tables, which are tables that have some transformations applied to them.

The quality checks are performed through “expectations”, which are constraints applied to filter data like duplicates. Since this table reads from another streaming table, in the FROM statement we need to use the function STREAM and apply the schema “live” as a prefix to the streaming table we are reading data from. “live” is the schema where the streaming tables are stored.

```sql
CREATE OR REFRESH STREAMING TABLE invoices_cleaned
(
  --expectations
  CONSTRAINT valid_invoice_and_qty EXPECT (invoice_no IS NOT NULL AND quantity > 0) ON VIOLATION DROP ROW
  PARTITIONED BY (invoice_year, country)
) AS
SELECT
InvoiceNo AS invoice_no
,StockCode AS stock_code
,Description AS description
,UnitPrice AS unit_price
,CustomerID AS customer_id
,Country AS country
,year(to_date(InvoiceDate, 'd-M.y H.m')) AS invoice_year
,month(to_date(InvoiceDate, 'd-M-y H.m')) AS invoice_month
,load_time
FROM STREAM(live.invoices_raw)
```

### 4.3- SCD Type 2 dimensions using CDC

It is also possible to create an empty streaming table to later apply some criteria for the SCD Type 2 dimensions.

APPLY CHANGES works similarly to a MERGE statement. The KEYS function is the column or columns that we want to keep an eye on for uniqueness. The SEQUENCE statement is the column that we will use to determine which KEY to take in case we get duplicated values, typically we use a sort of timestamp column. STORED indicates the type of SCD we want to implement.

```sql
CREATE OR REFRESH STREAMING TABLE customers;

APPLY CHANGES INTO live.customers
FROM STREAM(live.customers_cleaned)
KEYS(customer_id)
SEQUENCE BY load_time
STORED AS SCD TYPE 2;
```

#### 4.4- Create Materialized Table (Gold)

A Materialized View is created as “LIVE TABLE”, which is not a streaming table but a materialized view with FULL Refresh (not incremental tables as in the previous steps), this is usually done for “Gold” final tables. Since this is a materialized view and not a streaming table, it is not necessary to use the STREAM function in the FROM statement.

This table will be updated when we execute the pipeline

```sql
CREATE OR REFRESH LIVE TABLE daily_sales_uk_2022;
AS
SELECT
country
,invoice_year
,invoice_month
,invoice_date
round(sum(quantity * price), 2) as total_sales
FROM
live.invoices
WHERE invoice_year = 2022 AND country = 'United Kingdom'
GROUP BY country, invoice_year, invoice_month, invoice_date
```
