---
title: 'Time Series Forecasting'
description: 'Time Series is a topic that I’m very passionate about, because for many years I have worked in the preparation of Forecasts and Budgets for Revenue, Expenses and Headcount in Excel, but so far, I have never seen the use of Time Series techniques at work, to this day,...'
pubDate: 2025-01-09
heroImage: '/images/2025/01/TimeSeries.jpg'
heroImageAlt: 'TimeSeries'
categories: ['Data Science']
tags: ['Time Series', 'Forecasting']
toc: true
---

Time Series is a topic that I’m very passionate about, because for many years I have worked in the preparation of Forecasts and Budgets for Revenue, Expenses and Headcount in Excel, but so far, I have never seen the use of Time Series techniques at work, to this day, forecasts still take months of work, involving lots of people and overly complicated Excel models but at the same time the use of very simplistic Excel formulas.

I’m a strong believer in the use of Time Series for streamlining the preparation and forecasts and budgets, so this blog post is a short guide that I did for me so I can remember easily how to implement them in my work in Finance and Accounting.

## What are Time Series?

Time Series Data is any data that keeps track how things change over time, from oldest to newest. Especially in business and finance, the data we manage is recorded in regular intervals or cycles, which can be weekly, monthly, quarterly and yearly, and the fact that data can be presented in cycles, allows us to discover patterns and make comparisons to track how well we are doing.

## The Basics

In this blog post, I will use Pandas to work with Time Series, although we can also work with them in PySpark and other libraries.

It is important that whenever we import data with Pandas, we set Date column of the Pandas dataframe as the index:

```python
import pandas as pd

df = pd.read_csv(r'C:\bitcoin_price.csv',
                 index_col = 'Date',
                 parse_dates = True
                 )
df
```
