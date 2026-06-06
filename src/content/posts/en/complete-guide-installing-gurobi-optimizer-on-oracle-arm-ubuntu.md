---
title: "Complete Guide: Installing Gurobi Optimizer on Oracle ARM Ubuntu"
description: "This guide will walk you through the complete process of installing Gurobi Optimizer with a Web License Service (WLS) license on an Oracle Cloud Infrastructure (OCI) server running Ubuntu on ARM64 architecture. It’s especially useful for graduate students in data science..."
pubDate: 2025-10-14
categories: ["Optimization"]
tags: []
toc: true
---

## 📋 Introduction

This guide will walk you through the complete process of installing Gurobi Optimizer with a Web License Service (WLS) license on an Oracle Cloud Infrastructure (OCI) server running Ubuntu on ARM64 architecture. It’s especially useful for graduate students in data science who have obtained an academic Gurobi license.

### Why This Guide?

- Oracle ARM servers offer excellent performance at low cost

- Gurobi is essential for optimization problems in data science

- WLS configuration can be complex without clear documentation

- Combines modern tools like uv for Python package management

## 🎯 Prerequisites

Before you begin, make sure you have:

-  An Oracle Cloud server with Ubuntu 20.04, 22.04, or 24.04 LTS

-  ARM64 architecture (aarch64)

-  Root/sudo access

-  Stable internet connection

-  A Gurobi WLS license (academic or commercial)

### Required WLS License Data

For this tutorial, you’ll need three values from your Gurobi account:

- WLSACCESSID: Your WLS access ID

- WLSSECRET: Your WLS secret key

- LICENSEID: Your numeric license ID

## Table of Contents

- 📋 Introduction

Why This Guide?

- 🎯 Prerequisites

Required WLS License Data

- 🚀 Step 1: System Verification and Preparation

1.1 Verify System Version

- 1.2 Update the System

- 🔧 Step 2: Download and Install Gurobi

2.1 Create Installation Directory

- 2.2 Download Gurobi for ARM64

- 2.3 Extract and Install

- 🌍 Step 3: Environment Variables Configuration

3.1 Configure System Variables

- 3.2 Load Variables in Current Session

- 🐍 Step 4: Python Package Installation

4.1 Using UV (Recommended)

- 4.2 Alternative: Using pip

- 🔐 Step 5: WLS License Configuration

5.1 Create License File

- 5.2 Configure License File Environment Variable

- 🧪 Step 6: Installation Verification

6.1 Complete Test Script

- 6.2 Run the Tests

- 📝 Final System Configuration

Complete Environment Variables

- File Structure

- 🚀 Basic Usage

Simple Python Example

- Command Line Usage

- 🔧 Troubleshooting

Common Issues

- Debug Logging

- 📊 Performance on Oracle ARM

Advantages of Oracle ARM for Gurobi

- Recommended Configuration

- 🎓 Academic Licenses

For Students

- Academic Limitations

- 🔄 Maintenance and Updates

Updating Gurobi

- Configuration Backup

- 📚 Additional Resources

Official Documentation

- Community and Support

- 🏆 Conclusion

Next Steps

## 🚀 Step 1: System Verification and Preparation

### 1.1 Verify System Version

```text
# Check Ubuntu version
lsb_release -a

# Check processor architecture
uname -m
```

**Expected output:**

```text
Distributor ID: Ubuntu
Description:    Ubuntu 24.04.3 LTS
Release:        24.04
Codename:       noble

aarch64
```

### 1.2 Update the System

```bash
# Update repositories and packages
sudo apt update && sudo apt upgrade -y

# Install basic dependencies
sudo apt install -y wget curl python3 python3-pip build-essential
```

## 🔧 Step 2: Download and Install Gurobi

### 2.1 Create Installation Directory

```bash
# Create directory in /opt
cd /opt
sudo mkdir -p gurobi
cd gurobi
```

### 2.2 Download Gurobi for ARM64

```bash
# Download the ARM Linux specific version
sudo wget https://packages.gurobi.com/12.0/gurobi12.0.3_armlinux64.tar.gz
```

**Note:** The URL for ARM64 is different from the x86-64 version. Make sure to use `armlinux64` instead of `linux64`.

### 2.3 Extract and Install

```bash
# Extract the file
sudo tar -xzf gurobi12.0.3_armlinux64.tar.gz

# Move the extracted directory
sudo mv gurobi1203 /opt/gurobi/

# Clean up downloaded file
sudo rm gurobi12.0.3_armlinux64.tar.gz
```

## 🌍 Step 3: Environment Variables Configuration

### 3.1 Configure System Variables

```bash
# Add variables to bashrc
echo 'export GUROBI_HOME="/opt/gurobi/gurobi1203/armlinux64"' >> ~/.bashrc
echo 'export PATH="${PATH}:${GUROBI_HOME}/bin"' >> ~/.bashrc
echo 'export LD_LIBRARY_PATH="${LD_LIBRARY_PATH}:${GUROBI_HOME}/lib"' >> ~/.bashrc

# If you use zsh (recommended)
echo 'export GUROBI_HOME="/opt/gurobi/gurobi1203/armlinux64"' >> ~/.zshrc
echo 'export PATH="${PATH}:${GUROBI_HOME}/bin"' >> ~/.zshrc
echo 'export LD_LIBRARY_PATH="${LD_LIBRARY_PATH}:${GUROBI_HOME}/lib"' >> ~/.zshrc
```

### 3.2 Load Variables in Current Session

```bash
# Load the new variables
source ~/.bashrc  # or ~/.zshrc if you use zsh

# Verify configuration
echo $GUROBI_HOME
echo $PATH | grep gurobi
```

## 🐍 Step 4: Python Package Installation

### 4.1 Using UV (Recommended)

If you have `uv` installed (modern Python package management tool):

```bash
# Navigate to your project
cd /path/to/your/project

# Install gurobipy with uv
uv add gurobipy

# Verify installation
uv run python -c "import gurobipy as gp; print('Gurobipy imported successfully')"
```

**Important:** You need to install `gurobipy` in **each Python environment** you create. The license file (created in Step 5) is shared across all environments, but the Python package must be installed separately for each project/environment.

### 4.2 Alternative: Using pip

```bash
# Install gurobipy in a virtual environment
python -m venv myenv
source myenv/bin/activate  # On Windows: myenv\Scripts\activate
pip install gurobipy

# Verify installation
python -c "import gurobipy as gp; print('Gurobipy imported successfully')"
```

**Important:** Since Gurobi 11.0, the Python package `gurobipy` is no longer included with the installer and must be installed separately.

**Remember:** Each new Python environment (virtualenv, conda env, uv project) requires its own `gurobipy` installation. The license file is shared system-wide.

## 🔐 Step 5: WLS License Configuration

### 5.1 Create License File

```bash
# Create gurobi.lic file in home directory
cat > ~/gurobi.lic 
**Important:** Replace the placeholder values with your actual WLS credentials from your Gurobi account. Keep this file secure and never commit it to version control.

**Note:** This file only needs to be created **once** on your system. It will be used by all your Python projects and environments automatically.

### 5.2 Configure License File Environment Variable

```text
# Add license file variable
echo 'export GRB_LICENSE_FILE=/home/ubuntu/gurobi.lic' >> ~/.bashrc
echo 'export GRB_LICENSE_FILE=/home/ubuntu/gurobi.lic' >> ~/.zshrc

# Load in current session
export GRB_LICENSE_FILE=/home/ubuntu/gurobi.lic
```

## 🧪 Step 6: Installation Verification

### 6.1 Complete Test Script

Create a file called `test_gurobi.py`:

```sql
#!/usr/bin/env python3
"""
Test script to verify that Gurobi works correctly with WLS license
"""

import gurobipy as gp
from gurobipy import GRB

def test_gurobi_license():
    """Test connection with WLS license and solve a simple problem"""
    try:
        print("=== Gurobi Test with WLS License ===")
        
        # Create a Gurobi environment
        print("1. Creating Gurobi environment...")
        env = gp.Env()
        
        # Show license information
        print(f"2. Gurobi version: {gp.gurobi.version()}")
        
        # Create a simple test model
        print("3. Creating simple optimization model...")
        model = gp.Model("wls_test", env=env)
        
        # Create variables
        x = model.addVar(name="x")
        y = model.addVar(name="y")
        
        # Set objective: maximize x + y
        model.setObjective(x + y, GRB.MAXIMIZE)
        
        # Add constraints
        model.addConstr(2*x + 3*y = 0, "non_neg_x")
        model.addConstr(y >= 0, "non_neg_y")
        
        # Solve the model
        print("4. Solving model...")
        model.optimize()
        
        # Check solution status
        if model.status == GRB.OPTIMAL:
            print("✅ Success! Model solved correctly.")
            print(f"   Optimal value: {model.objVal:.4f}")
            print(f"   x = {x.x:.4f}")
            print(f"   y = {y.x:.4f}")
            
            # Show additional license information
            try:
                license_expiration = model.getAttr('LicenseExpiration')
                if license_expiration == 99999999:
                    print("   License: No expiration date")
                else:
                    print(f"   License expires: {license_expiration}")
            except:
                print("   License expiration information not available")
                
        else:
            print(f"❌ Error: Model could not be solved. Status: {model.status}")
            
    except Exception as e:
        print(f"❌ Error during test: {e}")
        print("\nPossible causes:")
        print("- Problem with WLS license configuration")
        print("- Network connectivity issues")
        print("- Incorrect WLS credentials")
        return False
        
    return True

def test_wls_connection():
    """Test WLS connection specifically using parameters"""
    try:
        print("\n=== Direct WLS Connection Test ===")
        
        # Create empty environment and configure WLS parameters manually
        with gp.Env(empty=True) as env:
            env.setParam("LicenseID", 1234567)  # Replace with your License ID
            env.setParam("WLSAccessID", "your-access-id-here")  # Replace with your Access ID
            env.setParam("WLSSecret", "your-secret-here")  # Replace with your Secret
            env.start()
            
            print("✅ WLS connection established successfully")
            
            # Create a simple model to test
            with gp.Model(env=env) as model:
                x = model.addVar()
                model.setObjective(x)
                model.addConstr(x **Expected successful output:**

```text
Starting Gurobi tests...
=== Gurobi Test with WLS License ===
1. Creating Gurobi environment...
Set parameter WLSAccessID
Set parameter WLSSecret
Set parameter LicenseID to value 1234567
Academic license 1234567 - for non-commercial use only - registered to your@email.com
2. Gurobi version: (12, 0, 3)
3. Creating simple optimization model...
4. Solving model...
Gurobi Optimizer version 12.0.3 build v12.0.3rc0 (armlinux64 - "Ubuntu 24.04.3 LTS")
...
✅ Success! Model solved correctly.
   Optimal value: 1.6000
   x = 0.8000
   y = 0.8000
   License: No expiration date

🎉 Gurobi is working correctly!
```

## 📝 Final System Configuration

### Complete Environment Variables

Your `~/.bashrc` or `~/.zshrc` file should include:

```bash
# Gurobi Configuration
export GUROBI_HOME="/opt/gurobi/gurobi1203/armlinux64"
export PATH="${PATH}:${GUROBI_HOME}/bin"
export LD_LIBRARY_PATH="${LD_LIBRARY_PATH}:${GUROBI_HOME}/lib"
export GRB_LICENSE_FILE="/home/ubuntu/gurobi.lic"
```

### File Structure

```text
/opt/gurobi/gurobi1203/armlinux64/    # Gurobi installation
/home/ubuntu/gurobi.lic               # WLS license file
```

## 🚀 Basic Usage

### Simple Python Example

```python
import gurobipy as gp
from gurobipy import GRB

# Create model
model = gp.Model("example")

# Create variables
x = model.addVar(name="x")
y = model.addVar(name="y")

# Set objective
model.setObjective(3*x + 2*y, GRB.MAXIMIZE)

# Add constraints
model.addConstr(x + y = 0)
model.addConstr(y >= 0)

# Solve
model.optimize()

# Display results
if model.status == GRB.OPTIMAL:
    print(f"Optimal value: {model.objVal}")
    print(f"x = {x.x}")
    print(f"y = {y.x}")
```

### Command Line Usage

```text
# Solve a .lp file
gurobi_cl model.lp

# Check version
gurobi_cl --version

# Check license
gurobi_cl --license
```

## 🔧 Troubleshooting

### Common Issues

**1. Error “Cannot find gurobi”**

```bash
# Check environment variables
echo $GUROBI_HOME
echo $PATH

# Reload configuration
source ~/.bashrc
```

**2. WLS License Error**

```bash
# Check license file
cat ~/gurobi.lic

# Check connectivity
ping gurobi.com

# Check license variable
echo $GRB_LICENSE_FILE
```

**3. Architecture Error**

- Make sure you downloaded the armlinux64 version, not linux64

- Verify with uname -m that you’re on aarch64 architecture

### Debug Logging

```python
# Enable logging in Python
import gurobipy as gp

env = gp.Env()
env.setParam('CSClientLog', 3)  # Verbose logging
```

## 📊 Performance on Oracle ARM

### Advantages of Oracle ARM for Gurobi

- Cost-effective: Up to 40% less expensive than x86 instances

- Performance: Excellent for optimization problems

- Scalability: Easy vertical scaling

- Energy efficiency: Lower power consumption

### Recommended Configuration

- CPU: VM.Standard.A1.Flex (4 OCPU, 24 GB RAM)

- Storage: 100 GB Boot Volume

- Network: Variable bandwidth (up to 4 Gbps)

## 🎓 Academic Licenses

### For Students

- Register at Gurobi Academic Program

- Use institutional email (.edu)

- Get free WLS license

- Follow this guide for installation

### Academic Limitations

- For non-commercial use only

- Problem size limitations (generally sufficient for research)

- Requires periodic validation of academic status

## 🔄 Maintenance and Updates

### Updating Gurobi

```bash
# Download new version
cd /opt/gurobi
sudo wget https://packages.gurobi.com/12.1/gurobi12.1.0_armlinux64.tar.gz

# Extract and update environment variables
sudo tar -xzf gurobi12.1.0_armlinux64.tar.gz
# Update GUROBI_HOME in configuration files
```

### Configuration Backup

```bash
# Backup license file
cp ~/gurobi.lic ~/gurobi.lic.backup

# Backup configuration
cp ~/.bashrc ~/.bashrc.backup
```

## 📚 Additional Resources

### Official Documentation

- Gurobi Documentation

- Python API Reference

- Examples Repository

### Community and Support

- Gurobi Community Forum

- Stack Overflow Tag: gurobi

- Oracle Cloud Documentation

## 🏆 Conclusion

You have successfully completed the installation of Gurobi Optimizer on your Oracle ARM Ubuntu server. This setup will allow you to:

- Solve complex optimization problems

- Leverage high-efficiency ARM architecture

- Use modern Python tools like uv

- Work reliably with WLS licenses

### Next Steps

- Explore examples: Review the examples included in /opt/gurobi/gurobi1203/armlinux64/examples/

- Integrate into projects: Use Gurobi in your data science projects

- Optimize performance: Adjust parameters according to your specific needs

- Share knowledge: Contribute to the community with your findings

**Was this guide helpful?** Share it with other students and professionals working with cloud-based optimization. The data science community grows when we share knowledge!

*This tutorial was created during the actual installation process on an Oracle Cloud Infrastructure server with ARM64 architecture, ensuring that all steps have been tested and verified.*
