---
title: 'Time Series Forecasting with Exogenous Variables: SARIMAX vs Prophet'
description: 'Last quarter, I needed to forecast SMS volume for budget planning. The catch? Our SMS volume directly depends on how many locations we operate—and that number is also growing. I couldn’t just extrapolate historical trends; I needed a model that accounts for this external...'
pubDate: 2026-01-14
heroImage: '/images/2026/01/time_series.png'
heroImageAlt: 'time series'
categories: ['Data Science']
tags: ['Time Series', 'Forecasting']
toc: true
---

Last quarter, I needed to forecast SMS volume for budget planning. The catch? Our SMS volume directly depends on how many locations we operate—and that number is also growing. I couldn’t just extrapolate historical trends; I needed a model that accounts for this external driver.

This is a common scenario in business forecasting: you’re predicting something (sales, costs, workload) that depends on an external factor you can forecast separately (headcount, locations, customers). The question is: which tool should you use?

I compared two popular approaches—**SARIMAX** and **Prophet**—and here’s what I learned.

## Why Exogenous Variables Matter

Most time series tutorials focus on pure autoregressive models: predict the future based on the past. But in business, your target metric often depends on factors outside the historical pattern.

In my case:

- Target: Monthly SMS volume

- Driver: Number of operating locations

- Pattern: Clear seasonality (summer peaks)

- Reality: As we add locations, SMS volume grows—but by how much?

Both SARIMAX and Prophet can incorporate these external drivers (called “exogenous variables” or “regressors”). The question is which one fits your workflow better.

## Understanding the Models

### SARIMAX: The Statistical Workhorse

**SARIMAX** stands for Seasonal AutoRegressive Integrated Moving Average with eXogenous variables. That’s a mouthful, but the concept is straightforward:

- AR (AutoRegressive): Use past values to predict future values

- I (Integrated): Apply differencing to make the series stationary

- MA (Moving Average): Use past forecast errors in the model

- S (Seasonal): Repeat the above for seasonal patterns

- X (eXogenous): Add external variables as linear predictors

You configure SARIMAX with two key parameters:

- order=(p,d,q): The non-seasonal AR, differencing, and MA orders

- seasonal_order=(P,D,Q,s): The seasonal equivalents, plus the seasonality period (s=12 for monthly data)

**Strengths**:

- Mature, well-understood statistical framework

- Coefficients have clear interpretations

- Extensive diagnostic tools (ACF, PACF, residual tests)

- Part of statsmodels—a battle-tested library

**Challenges**:

- Requires understanding of time series theory

- Sensitive to parameter choices

- Assumes regular time intervals with no gaps

- Convergence issues with short series

### Prophet: The Pragmatic Forecaster

**Prophet** was developed by Facebook (Meta) for business forecasting at scale. It takes a different approach:

- Trend: A piecewise linear or logistic growth curve

- Seasonality: Fourier series for yearly, weekly, daily patterns

- Holidays: Built-in holiday effects

- Regressors: Additional external variables (like our locations)

You don’t specify AR or MA orders. Prophet automatically detects trend changes and seasonality. Just provide your data and optional regressors.

**Strengths**:

- Fast to prototype—minimal configuration needed

- Handles missing data and outliers gracefully

- Visual component breakdown (easy to explain to stakeholders)

- Automatic trend changepoint detection

**Challenges**:

- Less control over model structure

- “Black box” feel compared to classical methods

- Requires cmdstan installation (extra setup)

- Uncertainty intervals can be wide

## When to Use Each

Here’s my decision framework after using both:

| Criteria            | SARIMAX                           | Prophet                         |
| ------------------- | --------------------------------- | ------------------------------- |
| Data quality        | Needs regular intervals, no gaps  | Handles gaps and irregularities |
| Seasonality         | You specify the period (s=12)     | Automatic detection             |
| Learning curve      | Steeper (need ACF/PACF knowledge) | Gentler                         |
| Interpretability    | Statistical coefficients          | Visual component plots          |
| Time to prototype   | Slower                            | Faster                          |
| Production maturity | Very mature                       | Good, actively maintained       |
| Model control       | Full control over structure       | Limited tuning options          |

**My rule of thumb**:

- Start with Prophet when exploring a new forecasting problem, especially if data quality is uncertain or you need to quickly show results to stakeholders.

- Use SARIMAX when you have clean, regular data and need statistical rigor—or when regulatory/audit requirements demand transparent model specifications.

- Use both for validation. If they agree, you have confidence. If they diverge, investigate why.

## The Dataset

For this comparison, I used an SMS volume forecasting scenario:

- Historical period: 18 months (July 2024 – December 2025)

- Exogenous variable: number_of_locations (growing from ~100 to ~150)

- Forecast horizon: 12 months (January – December 2026)

- Pattern: Clear seasonality with summer peaks (July-August)

The locations forecast extends through 2026, projecting growth from ~160 to ~200 locations.

```python
import pandas as pd
import numpy as np

# Historical data
dates_hist = pd.date_range('2024-07-01', '2025-12-01', freq='MS')

np.random.seed(42)
locations_hist = np.linspace(100, 150, len(dates_hist)) + np.random.normal(0, 2, len(dates_hist))

# SMS volume with seasonal pattern (summer peaks)
seasonal = [1.3, 1.2, 1.0, 0.8, 0.7, 0.7, 1.3, 1.2, 1.0, 0.8, 0.7, 0.7,
            1.3, 1.2, 1.0, 0.8, 0.7, 0.7][:len(dates_hist)]
sms_volume = (5000 + locations_hist * 50) * seasonal + np.random.normal(0, 500, len(dates_hist))

df_historical = pd.DataFrame({
    'date': dates_hist,
    'number_of_locations': locations_hist.round(0).astype(int),
    'sms_volume': sms_volume.round(0).astype(int)
})

# Future locations forecast (Jul 2024 - Dec 2026)
dates_full = pd.date_range('2024-07-01', '2026-12-01', freq='MS')
locations_full = np.linspace(100, 200, len(dates_full)) + np.random.normal(0, 2, len(dates_full))

df_locations = pd.DataFrame({
    'date': dates_full,
    'number_of_locations': locations_full.round(0).astype(int)
})
```

This gives us `df_historical` (18 months of actual data) and `df_locations` (30 months including the 12-month forecast horizon with projected location growth).

## SARIMAX Implementation

### Step 1: Prepare the Data

SARIMAX expects the target variable (`y`) and exogenous variables (`X`) as separate inputs:

```python
from statsmodels.tsa.statespace.sarimax import SARIMAX
from sklearn.metrics import mean_absolute_error, mean_squared_error, mean_absolute_percentage_error, r2_score
import matplotlib.pyplot as plt

y = df_historical['sms_volume']
X = df_historical[['number_of_locations']]
```

### Step 2: Fit the Model

For monthly data with yearly seasonality, use `s=12` in the seasonal order:

```text
model = SARIMAX(y, exog=X, order=(1,1,1), seasonal_order=(1,1,1,12))
results = model.fit(disp=False)
print(results.summary())
```

**What does `.fit()` do?** It uses Maximum Likelihood Estimation to find the parameter values that best explain your historical data—how much past values influence the future, how strong the seasonal pattern is, and how much each additional location contributes to SMS volume.

**A note on warnings**: With only 18 months of data, you’ll likely see convergence warnings. SARIMAX needs sufficient data to estimate seasonal parameters reliably. For production use, aim for at least 2-3 complete seasonal cycles (24-36 months for monthly data).

### Step 3: Interpret the Results

The summary output shows:

- Coefficients: The effect of each term (AR, MA, seasonal, exogenous)

- P-values: Statistical significance of each term

- AIC/BIC: Model comparison metrics (lower is better)

- Diagnostics: Ljung-Box test for residual autocorrelation

In my case, the `number_of_locations` coefficient tells me how much SMS volume changes per additional location, controlling for time patterns.

### Step 4: Evaluate Model Fit

Before trusting any forecast, visualize how well the model fits historical data. This is critical—if the model can’t capture past patterns, its future predictions are unreliable.

**Understanding the metrics**:

| Metric | What it measures         | Interpretation                                   |
| ------ | ------------------------ | ------------------------------------------------ |
| MAE    | Average absolute error   | “On average, predictions are off by X units”     |
| RMSE   | Root mean squared error  | Like MAE but penalizes large errors more heavily |
| R²     | Variance explained (0-1) | 0.85 = model explains 85% of the variation       |
| MAPE   | Error as percentage      | Useful for comparing across different scales     |

```text
predicted = results.get_prediction(start=0, end=len(y)-1, exog=X)
predicted_mean = predicted.predicted_mean

mae = mean_absolute_error(y, predicted_mean)
rmse = np.sqrt(mean_squared_error(y, predicted_mean))
r2 = r2_score(y, predicted_mean)
mape = mean_absolute_percentage_error(y, predicted_mean) * 100

print(f"MAE:  {mae:,.0f}")
print(f"RMSE: {rmse:,.0f}")
print(f"R²:   {r2:.3f}")
print(f"MAPE: {mape:.1f}%")
```

**Actual vs Predicted (In-Sample)**:

```text
fig, ax = plt.subplots(figsize=(12, 5))
ax.plot(df_historical['date'], df_historical['sms_volume'], 'b-o', label='Actual')
ax.plot(df_historical['date'], predicted_mean, 'g--s', label='Predicted (In-Sample)')
ax.set_xlabel('Date')
ax.set_ylabel('SMS Volume')
ax.set_title('SARIMAX Model Fit: Actual vs Predicted')
ax.legend()
ax.grid(True, alpha=0.3)
plt.xticks(rotation=45)
plt.tight_layout()
plt.show()
```

This chart shows the green predicted line overlaying the blue actuals. You want to see the predicted values tracking the actual values closely—especially at peaks and troughs. Large gaps indicate the model is missing important patterns.

### Step 5: Generate Forecasts

To forecast, provide future values of your exogenous variable:

```text
# Future locations (your separate forecast)
df_future_locations = df_locations[df_locations['date'] > '2025-12-01'].copy()
X_future = df_future_locations[['number_of_locations']]

# Forecast
forecast = results.get_forecast(steps=len(X_future), exog=X_future)
forecast_mean = forecast.predicted_mean
forecast_ci = forecast.conf_int()

# Create forecast DataFrame
df_forecast = pd.DataFrame({
    'date': df_future_locations['date'].values,
    'number_of_locations': df_future_locations['number_of_locations'].values,
    'sms_volume_forecast': forecast_mean.values.round(0).astype(int),
    'lower_ci': forecast_ci.iloc[:, 0].values.round(0).astype(int),
    'upper_ci': forecast_ci.iloc[:, 1].values.round(0).astype(int)
})
df_forecast
```

### Step 6: Visualize Forecast

```text
fig, ax = plt.subplots(figsize=(12, 5))
ax.plot(df_historical['date'], df_historical['sms_volume'], 'b-o', label='Historical')
ax.plot(df_forecast['date'], df_forecast['sms_volume_forecast'], 'r--o', label='Forecast')
ax.fill_between(df_forecast['date'], df_forecast['lower_ci'], df_forecast['upper_ci'],
                alpha=0.2, color='red')
ax.set_xlabel('Date')
ax.set_ylabel('SMS Volume')
ax.set_title('SARIMAX: SMS Volume Forecast')
ax.legend()
ax.grid(True, alpha=0.3)
plt.tight_layout()
plt.show()
```

## Prophet Implementation

### Step 1: Prepare Data (Prophet Format)

Prophet requires specific column names: `ds` for dates and `y` for the target:

```python
from prophet import Prophet
from sklearn.metrics import mean_absolute_error, mean_squared_error, mean_absolute_percentage_error, r2_score
import matplotlib.pyplot as plt

df_prophet = df_historical.rename(columns={'date': 'ds', 'sms_volume': 'y'})
```

Keep your regressor column (`number_of_locations`) as-is.

### Step 2: Add Regressor and Fit

Create the model, add your regressor, then fit:

```text
model = Prophet(
    yearly_seasonality=True,
    weekly_seasonality=False,  # Not relevant for monthly data
    daily_seasonality=False
)
model.add_regressor('number_of_locations')
model.fit(df_prophet)
```

**What does `.fit()` do?** Prophet uses Bayesian inference to decompose your data into trend, seasonality, and regressor effects. It learns the growth pattern, which months are high/low, and how much each location contributes to volume.

No order parameters to tune—Prophet handles the rest.

### Step 3: Visualize Components

One of Prophet’s best features—decomposition into interpretable components:

```text
df_insample = model.predict(df_prophet)
fig = model.plot_components(df_insample)
plt.tight_layout()
plt.show()
```

This shows:

- Trend: The underlying growth pattern

- Yearly seasonality: Month-by-month seasonal effects

- Regressor effect: The contribution of number_of_locations

This visualization is incredibly useful when explaining the model to non-technical stakeholders.

### Step 4: Evaluate Model Fit

Same as SARIMAX—calculate metrics and visualize the in-sample fit:

```text
actual = df_historical['sms_volume']
predicted = df_insample['yhat']

mae = mean_absolute_error(actual, predicted)
rmse = np.sqrt(mean_squared_error(actual, predicted))
r2 = r2_score(actual, predicted)
mape = mean_absolute_percentage_error(actual, predicted) * 100

print(f"MAE:  {mae:,.0f}")
print(f"RMSE: {rmse:,.0f}")
print(f"R²:   {r2:.3f}")
print(f"MAPE: {mape:.1f}%")
```

**Actual vs Predicted (In-Sample)**:

```text
fig, ax = plt.subplots(figsize=(12, 5))
ax.plot(df_historical['date'], df_historical['sms_volume'], 'b-o', label='Actual')
ax.plot(df_historical['date'], df_insample['yhat'], 'g--s', label='Predicted (In-Sample)')
ax.set_xlabel('Date')
ax.set_ylabel('SMS Volume')
ax.set_title('Prophet Model Fit: Actual vs Predicted')
ax.legend()
ax.grid(True, alpha=0.3)
plt.xticks(rotation=45)
plt.tight_layout()
plt.show()
```

Compare this chart side-by-side with the SARIMAX fit. You’ll notice Prophet tends to produce smoother predictions, while SARIMAX may track sharper fluctuations more closely (depending on parameter choices).

### Step 5: Generate Forecasts

Prophet needs a DataFrame with `ds` and all regressors for the forecast period:

```text
df_future = df_locations[df_locations['date'] > '2025-12-01'].copy()
df_future = df_future.rename(columns={'date': 'ds'})

# Generate forecast
forecast = model.predict(df_future)

# Create forecast DataFrame
df_forecast = pd.DataFrame({
    'date': forecast['ds'].values,
    'number_of_locations': df_future['number_of_locations'].values,
    'sms_volume_forecast': forecast['yhat'].values.round(0).astype(int),
    'lower_ci': forecast['yhat_lower'].values.round(0).astype(int),
    'upper_ci': forecast['yhat_upper'].values.round(0).astype(int)
})
df_forecast
```

### Step 6: Visualize Forecast

```text
fig, ax = plt.subplots(figsize=(12, 5))
ax.plot(df_historical['date'], df_historical['sms_volume'], 'b-o', label='Historical')
ax.plot(df_forecast['date'], df_forecast['sms_volume_forecast'], 'r--o', label='Forecast')
ax.fill_between(df_forecast['date'], df_forecast['lower_ci'], df_forecast['upper_ci'],
                alpha=0.2, color='red')
ax.set_xlabel('Date')
ax.set_ylabel('SMS Volume')
ax.set_title('Prophet: SMS Volume Forecast')
ax.legend()
ax.grid(True, alpha=0.3)
plt.tight_layout()
plt.show()
```

## Comparing the Results

Running both models on the same data, here’s what I observed:

### Forecast Behavior

**SARIMAX** produced forecasts that:

- Track seasonal patterns precisely

- Show sharper peaks and troughs matching historical extremes

- Have tighter confidence intervals (but this can be misleading with limited data)

- Exhibited a notable jump in July forecasts (~24K) aligned with summer peak

**Prophet** produced forecasts that:

- Capture the general seasonal shape

- Smooth out extreme values

- Have wider uncertainty bands

- Provide more conservative peak estimates

### Confidence Intervals

SARIMAX’s intervals widened steadily over the forecast horizon—a common pattern in autoregressive models where uncertainty compounds. Prophet’s intervals remained more consistent, reflecting its different uncertainty quantification approach.

### Key Insight

Neither model is “right.” They make different assumptions:

- SARIMAX assumes your specified structure is correct and propagates uncertainty accordingly

- Prophet uses a more flexible approach that’s robust to misspecification but potentially less precise

## Practical Recommendations

After comparing both approaches, here’s my guidance:

### Start with Prophet When:

- You’re exploring a new forecasting problem – Get a baseline quickly without tuning

- Data has quality issues – Missing months, outliers, irregular intervals

- Stakeholders need to understand the model – Component plots are intuitive

- Business context matters more than statistical precision – Directionally correct is good enough

### Use SARIMAX When:

- You have clean, regular time series data – Monthly or weekly, no gaps

- Statistical inference is important – Need to test coefficient significance

- Regulatory or audit requirements exist – Transparent, documented methodology

- You understand the data generating process – Can justify AR/MA/seasonal orders

### Hybrid Approach

In practice, I use both:

- Prophet first for rapid prototyping and stakeholder communication

- SARIMAX second for validation and production deployment

- Compare results – agreement builds confidence; divergence demands investigation

If both models tell a similar story, you’re probably on the right track. If they diverge significantly, dig into why before trusting either.

## Installation Notes

Both libraries are easy to install:

```bash
# Using uv (recommended)
uv add statsmodels prophet pandas numpy matplotlib scikit-learn

# Using pip
pip install statsmodels prophet pandas numpy matplotlib scikit-learn
```

Prophet requires cmdstan, which it will attempt to install automatically. If you hit issues, check the [Prophet installation docs](https://facebook.github.io/prophet/docs/installation.html).

## Conclusion

Forecasting with exogenous variables is a practical necessity in business contexts. Both SARIMAX and Prophet handle this well, with different tradeoffs:

- SARIMAX gives you control and statistical rigor at the cost of complexity

- Prophet gives you speed and robustness at the cost of precision

My recommendation: learn both. Start with Prophet to quickly validate whether your forecasting approach makes sense, then refine with SARIMAX when you need production-grade precision.
