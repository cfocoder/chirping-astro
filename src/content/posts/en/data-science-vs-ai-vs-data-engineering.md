---
title: 'Unraveling the Differences: Data Science, AI, and Data Engineering'
description: 'I recently met with a group of colleagues from the accounting firm (KPMG), where I worked many years ago, and I found it hard to explain to them, what I do in the field of Data Science and what Artificial Intelligence is and is not, so after giving it a lot of thought, I...'
pubDate: 2024-09-06
heroImage: '/images/2024/09/data_science.jpg'
heroImageAlt: 'data science'
categories: ['Data Science']
tags: ['Data Science', 'Python']
toc: true
---

I recently met with a group of colleagues from the accounting firm (KPMG), where I worked many years ago, and I found it hard to explain to them, what I do in the field of Data Science and what Artificial Intelligence is and is not, so after giving it a lot of thought, I wrote this blog post that explains how I see and understand all the topics around these fields based in my personal experience.

## 1.- Data Science

First off, for me, Data Science is the broadest level of the AI world. At the broadest level, Data Science is an interdisciplinary field that uses scientific methods, processes, algorithms, and systems to extract knowledge and insights from structured and unstructured data. It encompasses various techniques from statistics, computer science, and domain expertise to analyze and interpret complex data.

Examples:

- Analyzing customer transaction data to identify spending patterns and trends, helping banks tailor personalized financial products.

- Using statistical models to predict stock market trends based on historical data and economic indicators.

Data Science itself sits at the intersection of three key areas according to Drew Conway’s famous Venn diagram:

- Computer Science: This includes programming, software engineering, and the ability to manipulate data using various tools and techniques

- Math and Statistics: This involves understanding statistical methods, mathematical modeling, and data analysis techniques.

- Business Domain Knowledge: This is the knowledge of the specific field or industry where data is being applied, allowing meaningful questions and insights.

![](/images/2024/09/data_science_venn_diagram.png)

## 2.- Artificial Intelligence (AI)

Artificial Intelligence is a subset of data science, focused on creating systems capable of performing tasks that typically require human intelligence. These tasks include reasoning, learning, problem-solving, perception, and language understanding. AI can be divided into two main types:

- Narrow AI: AI systems designed for a specific task (e.g. voice assistants, recommendation systems)

- General AI: Hypothetical AI that can perform any intellectual task that a human can do

Data Science provides the data and the analytical tools necessary for AI systems to learn and make decisions

Examples:

- A chatbot that assists customers with their banking queries.

- A hypothetical AI system that can manage all aspects of financial planning, from budgeting to investment strategies, as effectively as a human financial advisor.

- An AI system that can autonomously trade stocks, adapt to new market conditions and make decisions across various financial domains.

## 3.- Machine Learning (ML)

Machine Learning is a subset of AI that involves the development of algorithms that allow computers to learn from and make predictions or decisions based on large datasets. ML focuses on the idea that systems can automatically learn and improve from experience without being explicitly programmed. Key types of ML include:

- Supervised Learning: Learning from labeled data

- Unsupervised Learning: Finding patterns in unlabelled data

- Reinforcement Learning: Learning through trial and error to achieve a specific goal

Examples:

- Credit scoring models that predict the likelihood of a borrower defaulting on a loan based on their credit history and other factors

- Algorithms that optimize investment portfolios by learning from historical performance data and adjusting asset allocations accordingly.

## 4.- Neural Networks

Neural Networks are a subset of Machine Learning, inspired by the structure and function of the human brain. They consist of interconnected layers of nodes (neurons) that process data in a way that allows the network to learn and make decisions. This approach is particularly effective for tasks like image and speech recognition.

Examples:

- A neural network model that predicts stock prices by analyzing vast amounts of historical price data and identifying complex patterns

- Using neural networks to detect fraudulent transactions by learning from a large dataset of legitimate and fraudulent transaction records.

## 5.- Deep Learning

This is a further specialization within Neural Networks. These deep networks are capable of learning and modeling complex patterns in large amounts of data.

Examples:

- A deep learning model that analyses news articles, social media posts, and other unstructured data to predict market movements

- Image recognition systems that process and analyze scanned documents, such as checks or invoices, to automate financial workflows.

## 6.- Foundational Layers

### 6.1 Data Engineering

There is no AI without Data and Data Engineering. Data Engineering serves as the foundation that supports the layers above. It is a critical component in the AI ecosystem, providing the infrastructure and tools necessary to collect, store, and process data efficiently:

- Data Collection: Data engineers design and implement systems for collecting data from various sources. This data is essential for training AI and machine learning models.

- Data Storage: They create and manage databases and data warehouses to store large volumes of data. Efficient storage solutions ensure that data is easily accessible for analysis and model training.

- Data Processing: Data engineers develop pipelines to clean, transform, and prepare data for analysis. This step is crucial because raw data often contains noise and inconsistencies that need to be addressed before it can be used effectively.

- Data Integration: They integrate data from different sources, ensuring that it is consistent and usable. This involves combining data from various databases, APIs, and other data streams.

- Data Scalability: Data engineers build scalable systems that can handle increasing amounts of data as the organization grows. This is particularly important for AI and machine learning projects that require large datasets.

- Collaboration with Data Scientists: Data engineers work closely with data scientists to understand their data needs and ensure that the data infrastructure supports their analytical and modeling efforts

In summary, data engineering provides the backbone for AI and machine learning by ensuring that high-quality, well-organized data is available for analysis and model training. Without robust data engineering, it would be challenging to build effective AI systems.

### 6.2 Mathematical Optimization

The vertical purple bar represents mathematical optimization as a critical element that cuts across all the Data Science and AI domains. Mathematical Optimization, often associated with Operations Research (OR), is a field that focuses on finding the best solution from a set of feasible solutions, given certain constraints. This involves maximizing or minimizing a function by systematically choosing input values from within an allowed set and computing the value of the function.

Mathematical Optimization problems can be broadly categorized into several types, below are the main categories:

- Linear Optimization (Linear Programming): Involves optimizing a linear objective function, subject to linear equality and inequality constraints. These problems are typically the easier to solve and are widely used in various industries for resource allocation, production planning, etc.

- Non-Linear Optimization (Non-linear Programming): Deals with optimizing a non-linear objective function, which may also have non-linear constraints. These problems are more complex and require advanced techniques to solve.

- Integer Optimization (Integer Programming): Involves optimization where some or all the variables are restricted to be integers.

- Stochastic Optimization: Deals with optimization problems that involve uncertainty in the data. The objective is to find a solution that is feasible for all (or almost all) possible data instances and optimizes the expected performance.

Mathematical Optimization can be applied across various levels of the Data Science hierarchy discussed earlier:

- Data Science: Mathematical Optimization is a key tool in Data Science for solving problems that require optimal decision-making. For example, optimizing resource allocation, scheduling, and logistics.

- Artificial Intelligence: Optimization techniques are often used in AI to improve the performance of algorithms and models. For instance, optimizing the parameters of an AI model to achieve the best performance.

- Machine Learning: In ML, optimization is crucial for training models. Algorithms like gradient descent, are used to minimize the error in predictions by adjusting model parameters.

- Neural Networks and Deep Learning: Optimization is fundamental in training neural networks. Techniques like backpropagation rely on optimization algorithms to adjust the weights of the network to reduce the loss function.

### 6.3 Analytics Engineering

Analytics Engineering is a bridge between data engineering and data science, as it focuses on transforming raw data into well-organized, usable formats that data scientists and business users can easily work with. Here’s how it aligns:

- Data Engineering is responsible for building and maintaining the data infrastructure, like pipelines, data lakes, and storage systems. Analytics Engineers typically work with data engineers to create, transforming it into models that are easier to analyze.

- Data Science relies on clean, accessible data for advanced analytics and model building. Analytics Engineers ensure the data is prepared, structured, and maintained in a way that makes this analysis smooth and efficient.

- AI & Machine Learning require well-structured datasets to train models. The role of the Analytics Engineer is crucial in preparing this data for algorithms, often by working closely with data scientists to ensure the models are fed with the right type of data.

An Analytics Engineer uses SQL, data transformation tools, and business logic to turn raw data into meaningful data sets, allowing better decision-making or more accurate machine learning predictions. They don’t build pipelines from scratch like data engineers but play a key role in shaping how data flows within analytics environments, positioning themselves between engineering and science roles.

## 7.- The 4 types of Analysis

There are four categories of analysis, which are essential for understanding data and making informed decisions, and each category in turn, is associated with a discipline in the Data Science / AI field :

![](/images/2024/09/Types_of_Analysis.png)

- Descriptive Analysis: It answers the question of “What happened?“. The goal is to summarize historical data, identify trends, and provide insights into past performance, for example, a sales report that shows the total sales per region over the last year. Descriptive Analysis is greatly associated with “Data Science”.

- Diagnostic Analysis: It answers the question of “Why did it happen?“. The goal is to dive deeper into the data to understand the causes behind the outcomes identified in the descriptive analysis, for example, analyzing why sales dropped in a specific region by looking at factors like market conditions, promotions, or competitor actions. Diagnostic Analysis is related to Statistics, part of “Data Science”.

- Predictive Analysis: It answers the question of “What is likely to happen in the future?“. The goal is to use historical data to forecast future outcomes, allowing organizations to anticipate trends and challenges, for example, using past sales data to forecast revenue for the next four quarters. Predictive Analysis is primarily associated with “Machine Learning” which uses models trained to make predictions based on historical data.

- Prescriptive Analysis: It answers the question of “What should we do about it?“. The goal is to provide recommendations or actionable insights based on the predictions made, guiding decision-making, for example when we recommend specific inventory levels based on the predicted demand for the next quarter. Prescriptive Analysis is heavily associated with “Mathematical Optimization” as this field focuses on finding the best solutions to complex problems within given constraints.

## 8.- Types of Data Professionals and their Skills

![](/images/2024/09/types_of_data_professionals.jpg)

Image Credit: [Sol Rashidi ](https://www.linkedin.com/posts/sol-rashidi-a672291_data-datascientist-dataanalyst-activity-7238918640262164480-IxZ0?utm_source=share&utm_medium=member_desktop)

This image highlights how the different data roles complement each other in a data-driven organization. Each brings distinct skills, from infrastructure to actionable business insights.

### 1. Data Engineer

Data Engineers prioritize building and maintaining the infrastructure for data storage and pipelines. They focus more on the technical backend with limited involvement in business insights or advanced statistical modeling.

- High proficiency: Data Pipelines, Databases, Deployment, and ML Ops.

- Moderate skills: Data Visualization, Reporting, and Storytelling.

- Lower focus: Stats, ML Modeling, and Experimentation.

### 2. ML Engineer

ML Engineers specialize in deploying machine learning models and maintaining the infrastructure that supports them. They focus heavily on the technical and operational aspects of machine learning rather than business interpretation.

- High proficiency: ML Ops, ML Modeling, and Deployment.

- Moderate skills: Data Pipelines and Databases.

- Lower focus: Business Insights, Reporting, and Storytelling.

### 3. Data Scientist

Data Scientists are strong in statistical analysis, experimentation, and modeling, using data pipelines to work on complex data problems. They don’t focus as much on the operational side (ML Ops or deployment), as they typically hand off models to engineers.

- High proficiency: Stats, ML Modeling, Experimentation, and Data Pipelines.

- Moderate skills: Databases, Data Viz, and Reporting.

- Lower focus: Deployment and ML Ops.

### 4. Data Analyst

Data Analysts focus on making data understandable and actionable for businesses. They excel in visualization and drawing insights from data but typically don’t handle advanced modeling or engineering tasks.

- High proficiency: Data Visualization, Storytelling, and Business Insights.

- Moderate skills: Databases, Reporting.

- Lower focus: ML Modeling, Stats, Experimentation, and ML Ops.
