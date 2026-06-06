---
title: 'SQL Server Integration Services (SSIS) Guide'
description: 'SQL Server Integration Services (SSIS) Guide'
pubDate: 2022-12-16
categories: ['SQL']
tags: ['SQL Server', 'SQL']
toc: true
---

Here is a Guide on SSIS

## Integration Services Tasks

| Service Type            | Service Name                                           | Explanation                                                                                                                                           |
| ----------------------- | ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Data Flow Task          | Data Flow Task                                         | \* Extract data from a variety of sources, apply column-level transformations, and load data into a database                                          |
| Data Preparation Tasks  | _ FTP Task_ Hadoop File System Task\* File System Task | _ Copy files and directories from local file systems, FTP sites, or the internet._ Apply operations to XML documents, and profile data for cleansing. |
| Workflow Tasks          | _ Execute Package Task_ Send Mail Task                 | _ Communicate with other processes to run packages or programs_ Send email messages, read WMI data, and watch for WMI events                          |
| SQL Server Tasks        | _ Execute SQL Task_ Execute T-SQL Statement Task       | \* Access, copy, insert, delete and modify SQL Server objects and data                                                                                |
| Scripting Tasks         |                                                        | \* Extend package functionality by using custom-written scripts                                                                                       |
| Analysis Services Tasks |                                                        | \* Create, modify, delete, and process Analysis Services objects                                                                                      |
| Maintenance Tasks       | _ Rebuild Index Task_ Back Up Database Task            | _ Performa administrative functions such as backup up SQL Server databases_ Rebuild and reorganize indexes and run SQL Server Agent jobs              |
| Custom Tasks            |                                                        | \* Written in a programming language, such as Visual Basic or C#                                                                                      |
