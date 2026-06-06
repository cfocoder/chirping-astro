---
title: "Cloud Services Comparison (AWS vs Google vs Azure)"
description: "This is a quick reference guide to compare the basic cloud services among the 3 top competitors, Microsoft Azure, Google Cloud Services, and Amazon AWS. This compilation was made based on two articles published by Microsoft, and the prices I was able to get in their..."
pubDate: 2022-10-24
categories: ["Cloud"]
tags: []
toc: true
---

This is a quick reference guide to compare the basic cloud services among the 3 top competitors, Microsoft Azure, Google Cloud Services, and Amazon AWS. This compilation was made based on two articles published by Microsoft, and the prices I was able to get in their respective pricing calculators. It is possible that my estimates are not accurate, based on my own understanding of the pricing calculators, so I expect to update this web page frequently.

I really like the documentation from Microsoft Azure, both the pricing structure and the management of services are a lot clearer and easier to understand. 

- AWS to Azure services comparison

- Google Cloud to Azure services comparison

## Table of Contents

- Pricing Calculators

- Side by Side Services

- Pricing

Virtual Machines

- Object Storage

- MySQL Databases

- Container Registry

- Container Instances

- Web Applications

## Pricing Calculators

| Azure | Amazon AWS | Google Cloud |
|---|---|---|
| Azure Pricing Calculator | AWS Pricing Calculator | Google Cloud Pricing Calculator |
|  |  |  |

## Side by Side Services

| Service Description | Azure | Amazon AWS | Google Cloud |
|---|---|---|---|
| Virtual Machines | Azure Virtual Machines | Amazon EC2 | Compute Engine |
| Object Storage | Blob Storage | S3 Standard | Cloud Storage |
| MySQL Databases | Database for MySQL | Amazon RDS for MySQL | Cloud SQL for MySQL |
| NoSQL Databases | CosmosDB | DynamoDB | Cloud Firestore |
| Real-Time NoSQL Databases | Azure Cosmos DB change feed | DynamoDB | Firebase Real-Time Database |
| Container Registry | Azure Container Registry | Amazon ECR | Artifact Registry |
| Container Instances | Azure Container Instances | Amazon ECS | Cloud Run |
| Web Apps | App Service | Elastic Beenstalk | App Engine |
| Mobile AppsRealtime Backend | App Service | AWS Amplify | Firebase |
| Build, Test, and Monitor Mobile Applications | App Center | Mobile Hub | N/A |
| Content Delivery Network (CDN) | Azure CDN | CloudFront | Cloud CDN |
| Functions | Azure Functions | AWS Lambda | Cloud Functions |
| Authentication | Azure Active Directory | Cognito | Cloud Identity |
| DNS Management | DNS | Route 53 | Cloud DNS |
| APIs Management | API Management | API Gateway | Apigee |
| Promotional Email & Messaging | Azure Communication Services | Amazon Pinpoint | N/A |
| Transactional Email | Azure Communication Services | Amazon Simple Email Service (SES) | N/A |
| Internal Messaging | Service Bus | Simple Notification Service (SNS) | Cloud Pub/Sub |

## Pricing

### Virtual Machines

Monthly Cost based on 1 CPU, 1 GB of RAM, and 30Gb of SSD with a Linux Operating System with a “Pay-as-you-go” plan and 100% of utilization per month

| Feature | Azure | Amazon AWS | Google Cloud |
|---|---|---|---|
| Name | Azure Virtual Machines | Amazon EC2 | Compute Engine |
| Instance Name | B1S | t4g.micro | n1-standard-1 |
| Monthly Cost | \$9.05 | \$9.13 | \$24.27 |

### Object Storage

Estimate based on 100 GB of storage on a standard service for general purpose on a “Pay-as-you-go” plan, assuming the data is already there.

| Feature | Azure | Amazon AWS | Google Cloud |
|---|---|---|---|
| Name | Blob Storage | S3 Standard | Cloud Storage |
| Monthly Cost | \$21.84 | \$2.30 | \$2.00 |

### MySQL Databases

Monthly Cost based on 2 vCore, Single Server with 10 GB of Storage and with a “Pay-as-you-go” plan at 100% of utilization per month 

| Feature | Azure | Amazon AWS | Google Cloud |
|---|---|---|---|
| Name | Database for MySQL | Amazon RDS for MySQL | Cloud SQL for MySQL |
| Service Level | Single Server General Purpose Gen 5, 2vCore | db.m1.large | db-standard-1 |
| Specifications | Gen5, 2vCore (No memory specified) | (2 vCPU, 7.5 GiB of Memory ) | (2 vCPU, 7.5 GiB of Memory ) |
| Monthly Cost | \$128.17 | \$169.15 | \$107.41 |

### Container Registry

Based on 1 registry, with 1CPU, 10 GB of storage, and 5 GB of outbound Data Transfer

| Feature | Azure | Amazon AWS | Google Cloud |
|---|---|---|---|
| Name | Azure Container Registry | Amazon ECR | Artifact Registry |
| Monthly Cost | \$5.90 | \$1.45 | \$0.95 |

### Container Instances

Based on 1 vCPU, 1 pod, 2 GB of Memory, 30 Days duration

| Feature | Azure | Amazon AWS | Google Cloud |
|---|---|---|---|
| Name | Azure Container Instances | Amazon ECS | Cloud Run |
| Service Level | No storage specified | 20 GB | No storage specified |
| Monthly Cost | \$35.57 | \$35.55 | \$52.60 |

### Web Applications

| Feature | Azure | Amazon AWS | Google Cloud |
|---|---|---|---|
| Name | App Service | Elastic Beenstalk | App Engine |
| Service Level | B1 | Depends on resources used | B1 |
| Specifications | 1 vCore, 1.75 GB RAM, 10 GB Storage, with Linux OS | Depends on resources used | Not disclosed |
| Monthly Cost | \$13.14 | Depends on resources used | \$25.09 |
