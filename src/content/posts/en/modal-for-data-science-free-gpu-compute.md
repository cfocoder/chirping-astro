---
title: 'Modal for Data Science: Free GPU Compute for Your Python Projects'
description: 'Learn how to use Modal — a serverless GPU platform with $30/month free credits — to run data science and machine learning workloads from your local Jupyter notebooks and Python scripts. Covers setup with uv, notebook integration, GPU selection, and common pitfalls.'
pubDate: 2026-07-22
heroImage: '/images/2026/07/modal-datascience-hero.jpg'
heroImageAlt: 'Cloud GPU computing for data science with Modal'
categories: ['Data Science']
tags: ['Modal', 'GPU', 'Python', 'Jupyter', 'Machine Learning', 'Cloud Computing']
toc: true
---

If you've ever waited 45 minutes for `scikit-learn` to finish a grid search on your laptop, you know the pain. The M2 MacBook Air is great for browsing, but when your master's assignment involves training a neural network on 50,000 rows, you start fantasizing about GPUs you don't own.

Enter **Modal**: a serverless GPU cloud that gives you **\$30/month in free credits** — no credit card, no commitment — and lets you run Python functions on NVIDIA GPUs with a single decorator.

## What is Modal?

Modal is a serverless compute platform built for AI workloads. Instead of renting a VM, installing CUDA drivers, and configuring Docker, you add a `@app.function(gpu="L40S")` decorator above your Python function. Modal handles everything else: containerization, GPU scheduling, auto-scaling, and teardown.

Think of it as "cloud functions, but with GPUs."

```python
import modal

app = modal.App("my-project")

@app.function(gpu="T4")
def train_model():
    import torch
    # Your heavy ML code here — runs on a real GPU
    return {"accuracy": 0.94}

@app.local_entrypoint()
def main():
    result = train_model.remote()
    print(result)
```

## The Free Tier: \$30/month, Actually Free

Modal's Starter plan gives you \$30 of compute credits every month. Here's what that buys you:

| GPU | VRAM | Cost per hour | Hours of free compute/month |
|-----|------|--------------|---------------------------|
| T4 | 16 GB | \$0.59 | ~50 hours |
| L4 | 24 GB | \$0.80 | ~37 hours |
| L40S | 48 GB | \$1.95 | ~15 hours |
| A100 (40GB) | 40 GB | \$2.10 | ~14 hours |
| A100 (80GB) | 80 GB | \$2.50 | ~12 hours |
| H100 | 80 GB | \$3.95 | ~7 hours |

For graduate students, there's also the **Modal for Academics** program offering up to **\$10,000** in additional credits. Apply at [modal.com/academics](https://modal.com/academics).

## Setup with uv

I use [uv](https://docs.astral.sh/uv/) for Python projects. Here's the complete setup:

```bash
# Create a new project
uv init modal-ds --no-readme
cd modal-ds

# Pin Python 3.12 (Modal doesn't support 3.13 yet)
uv python pin 3.12

# Install Modal + data science dependencies
uv add modal jupyter pandas scikit-learn torch matplotlib

# Edit pyproject.toml: change "requires-python" to ">=3.12"
# (uv init defaults to >=3.13)

# Authenticate with Modal (opens browser)
uv run modal setup
```

> **⚠️ Important:** Modal currently supports Python 3.10–3.12 only. If your system has Python 3.13, you must pin 3.12 or you'll get `InvalidError: Unsupported Python version: '3.13'`.

### Choosing a Base Image

Modal gives you four ways to define your container environment, all chainable with build methods like `.pip_install()`, `.apt_install()`, and `.run_commands()`.

| Builder | When to use it | Example |
|---------|---------------|---------|
| **`.debian_slim()`** | The default — covers 95% of data science needs. | `modal.Image.debian_slim(python_version="3.12").pip_install("torch")` |
| **`.from_registry()`** | Pull a pre-built image from Docker Hub, NVIDIA NGC, or any public registry. | `modal.Image.from_registry("nvidia/cuda:12.1.0-devel-ubuntu22.04", add_python="3.12")` |
| **`.from_dockerfile()`** | You already have a Dockerfile. | `modal.Image.from_dockerfile("./Dockerfile")` |
| **`.micromamba()`** | You need conda/mamba packages (e.g., bioinformatics tools from conda-forge). | `modal.Image.micromamba().conda_install("bioconda::samtools")` |
| **`.from_name()`** | Reuse an image you previously built and published. | `modal.Image.from_name("my-ml-image:v1")` |

All of these support the same chainable build methods:

```python
image = (
    modal.Image.debian_slim(python_version="3.12")
    .apt_install("git", "ffmpeg")           # system packages
    .pip_install("torch", "transformers")    # Python packages
    .run_commands("echo 'build complete!'")  # arbitrary shell commands
    .env({"HF_HOME": "/cache"})              # environment variables
)
```

For data science coursework, `.debian_slim()` with `.pip_install()` is all you need. Switch to `.from_registry()` when you need a specific CUDA version, or `.micromamba()` when a package only exists on conda-forge.

## Two Ways to Use Modal

### Option 1: Script Mode (`modal run`)

Best for: batch jobs, scheduled tasks, one-off experiments.

```python
# train.py
import modal

image = modal.Image.debian_slim(python_version="3.12").pip_install(
    "torch", "scikit-learn", "pandas"
)
app = modal.App("train-model", image=image)

@app.function(gpu="L40S")
def train():
    from sklearn.ensemble import RandomForestClassifier
    # ... training code ...
    return {"score": 0.92}

@app.local_entrypoint()
def main():
    result = train.remote()
    print(result)
```

Run it:
```bash
uv run modal run train.py
```

The first run takes ~60–90 seconds while Modal builds the container image. Subsequent runs are much faster — the image stays cached.

> **⚠️ Never use `python train.py`** — Modal decorators only activate through `modal run`. Running with plain Python produces no output.

### Option 2: Notebook Mode (local kernel + remote GPU)

Best for: exploratory data analysis, iterative model development, course assignments.

The pattern is simple: your notebook runs locally on your laptop, but heavy GPU calls go to Modal via `.remote()`. Data exploration, pandas, and matplotlib stay local (free). Only GPU bursts hit the cloud.

```python
# Cell 1: Setup
import modal

image = modal.Image.debian_slim(python_version="3.12").pip_install(
    "torch", "scikit-learn", "pandas"
)
app = modal.App("nb-hybrid", image=image)

# Cell 2: Define GPU functions
@app.function(gpu="L40S")
def train_model(X_train, y_train, X_test, y_test):
    import torch
    import torch.nn as nn

    device = torch.device("cuda")
    # ... model training on GPU ...
    return {"accuracy": 0.94, "history": [...]}

# Cell 3: Run locally (CPU — free)
import pandas as pd
df = pd.read_csv("dataset.csv")
print(f"Loaded {len(df):,} rows")

# Cell 4: Offload to GPU (Modal cloud)
with app.run():                    # ← CRITICAL: context manager required
    result = train_model.remote(
        X_train, y_train, X_test, y_test
    )

# Cell 5: Analyze locally (CPU)
import matplotlib.pyplot as plt
plt.plot([h["accuracy"] for h in result["history"]])
plt.show()
```

> **⚠️ The `with app.run():` context manager is mandatory in notebooks.** Without it, you'll get `Function has not been hydrated`.

## How to Choose a GPU

| Your workload | Recommended GPU | Why |
|--------------|----------------|-----|
| Prototyping, small models (< 1M params) | **T4** (\$0.59/hr) | Cheapest, 16 GB VRAM |
| Inference, medium models (1M–7B params) | **L40S** (\$1.95/hr) | Best cost/performance, 48 GB |
| Fine-tuning, large models (7B–70B) | **A100-80GB** (\$2.50/hr) | 80 GB VRAM, fast training |
| Heavy training, largest models | **H100** (\$3.95/hr) | Fastest available, FP8 support |

For most data science coursework (scikit-learn, XGBoost, small neural nets), a **T4 or L40S** is more than enough.

## What You're Actually Billed For

Modal charges per **second of active compute**, not for idle time:

- **GPU billed:** Only while your function is executing.
- **CPU/RAM billed:** Same — per second, only during execution.
- **Storage (Volumes):** \$0.09/GiB/month, but the first **1 TiB is free**.
- **Idle:** \$0. Scale-to-zero is the default.

A typical data science notebook that trains a model for 5 seconds on a T4 costs about **\$0.0008**. With \$30/month, you can run that ~37,000 times.

> **💡 Always use the default preemptible tier.** The 3× non-preemptible multiplier is for production APIs that can't tolerate interruptions — your batch jobs and notebooks don't need it.

## When GPU Actually Matters: A Real Benchmark

Not every workload needs a GPU. I ran the exact same neural network on my local CPU and on a Modal T4 to see when the cloud GPU actually pays off.

### Small model (30 features, 10K rows, 3-layer NN)

| Metric | CPU (local) | GPU (Modal T4) |
|--------|------------|----------------|
| Time | **0.7s** | 4.4s |
| Cost | \$0 | ~\$0.0007 |

**Winner: CPU.** The T4's cold start (~3 seconds) dominates the tiny compute time. For a model this small, your laptop is faster.

### Medium model (200 features, 100K rows, 5-layer NN)

| Metric | CPU (local) | GPU (Modal T4, estimated) |
|--------|------------|--------------------------|
| Time | **70s** | ~7–14s |
| Cost | \$0 | ~\$0.002 |

**Winner: GPU by 5-10x.** Once your model has more layers and your dataset hits six figures, the GPU pulls ahead decisively.

### The rule of thumb

```
If training takes < 5 seconds on CPU → don't bother with GPU
If training takes 5–30 seconds on CPU → GPU helps, but CPU is fine
If training takes > 30 seconds on CPU → GPU is a no-brainer
```

For most coursework assignments, your laptop handles the prototyping fine. Modal earns its keep when you scale up — hyperparameter sweeps, cross-validation on large datasets, or fine-tuning pre-trained models.

## Common Pitfalls (and How to Avoid Them)

| Pitfall | Error message | Fix |
|---------|--------------|-----|
| Python 3.13 in venv | `Unsupported Python version: '3.13'` | `uv python pin 3.12 && uv sync` |
| Python 3.13 in venv vs 3.12 image | `defined with Python 3.13, but its Image has 3.12` | Same — pin to 3.12 and recreate venv |
| Running `python script.py` | No output at all | Use `modal run script.py` |
| `.remote()` without `with app.run():` | `Function has not been hydrated` | Wrap in `with app.run():` |
| `make_classification` ValueError | `n_classes * n_clusters_per_class <= 2**n_informative` | Set `n_informative`, `n_redundant` explicitly |
| Container idle billing (Jupyter in cloud) | Costs keep climbing | Ctrl+C `modal launch jupyter` when done |

## When to Use Modal vs. Alternatives

| Scenario | Use |
|----------|-----|
| Bursty data science work (notebooks, experiments) | **Modal** — pay per second |
| 24/7 inference API with steady traffic | RunPod or Lambda Labs — cheaper hourly |
| Running open-source LLMs for chat | Your existing LLM provider (OpenRouter, Together, etc.) |
| Quick prototyping with zero infrastructure | **Modal** — one decorator, no YAML |

For my master's in Data Science, Modal hits the sweet spot: I explore data locally with pandas, then offload the heavy lifting to a cloud GPU with a single line of code. The \$30/month free credit covers more than I need, and when I'm not running anything, I pay exactly zero.

## Resources

- [Modal Documentation](https://modal.com/docs)
- [Modal GPU Guide](https://modal.com/docs/guide/gpu)
- [Modal Examples (GitHub)](https://github.com/modal-labs/modal-examples)
- [Modal for Academics](https://modal.com/academics)
- [Modal Pricing](https://modal.com/pricing)
