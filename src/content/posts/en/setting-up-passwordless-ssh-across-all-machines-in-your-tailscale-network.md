---
title: 'Setting Up Passwordless SSH Across All Machines in Your Tailscale Network'
description: 'If you have multiple machines connected through Tailscale, you’ve probably found yourself typing SSH passwords repeatedly when jumping between systems. In this guide, I’ll show you how to set up passwordless SSH authentication across all your Tailscale machines, creating...'
pubDate: 2025-12-20
heroImage: '/images/2025/12/tailscale_mesh.png'
heroImageAlt: 'tailscale mesh'
categories: ['Cloud']
tags: []
toc: true
---

## Introduction

If you have multiple machines connected through Tailscale, you’ve probably found yourself typing SSH passwords repeatedly when jumping between systems. In this guide, I’ll show you how to set up passwordless SSH authentication across all your Tailscale machines, creating a seamless mesh network where any machine can connect to any other without passwords.

## What You’ll Achieve

By the end of this guide, you’ll have:

- Passwordless SSH authentication between all machines

- Easy-to-remember SSH aliases (e.g., ssh laptop, ssh server)

- A fully connected mesh network where every machine can reach every other machine

- Works across different operating systems (Windows, Linux, macOS)

## Prerequisites

- Tailscale installed and running on all machines

- SSH server enabled on all machines

- Basic command line knowledge

- Administrator/sudo access on all machines

## Overview of the Process

For each machine, we’ll:

- Generate SSH keys without passphrases

- Distribute public keys to all other machines

- Create SSH config files for easy connections

- Test the connections

## Step 1: Enable SSH Server

### On Windows

```powershell
# Check if SSH server is installed
Get-WindowsCapability -Online | Where-Object Name -like 'OpenSSH.Server*'

# Install if needed (run as Administrator)
Add-WindowsCapability -Online -Name OpenSSH.Server~~~~0.0.1.0

# Start and enable the service
Start-Service sshd
Set-Service -Name sshd -StartupType 'Automatic'

# Verify it's running
Get-Service sshd
```

### On Linux/macOS

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install openssh-server
sudo systemctl enable ssh
sudo systemctl start ssh

# macOS (usually pre-installed)
sudo systemsetup -setremotelogin on
```

## Step 2: Get Tailscale IPs

List all your Tailscale machines and their IPs:

```text
tailscale status
```

You’ll see output like:

```text
100.x.x.1    laptop1        user@  linux    -
100.x.x.2    laptop2        user@  windows  -
100.x.x.3    server1        user@  linux    -
100.x.x.4    macmini        user@  darwin   -
```

Take note of the IPs and hostnames – you’ll need them later.

## Step 3: Generate SSH Keys on Each Machine

**Important:** Generate keys WITHOUT a passphrase for passwordless authentication.

### On Linux/macOS

```bash
# Generate key
ssh-keygen -t ed25519 -f ~/.ssh/id_ed25519 -N ""

# View your public key
cat ~/.ssh/id_ed25519.pub
```

### On Windows (PowerShell)

```powershell
# Generate key
ssh-keygen -t ed25519 -f "$env:USERPROFILE\.ssh\id_ed25519" -N ""

# View your public key
Get-Content "$env:USERPROFILE\.ssh\id_ed25519.pub"
```

**Save each machine’s public key** – you’ll need to distribute them.

## Step 4: Distribute Public Keys

For each machine, you need to add the public keys of ALL OTHER machines to its `authorized_keys` file.

### On Linux/macOS

```bash
# Add a public key to authorized_keys
echo "ssh-ed25519 AAAA...rest-of-key... user@hostname" >> ~/.ssh/authorized_keys

# Set correct permissions
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys
```

### On Windows (PowerShell)

For **non-administrator users:**

```bash
# Create .ssh directory if needed
mkdir "$env:USERPROFILE\.ssh" -Force

# Add public key
$key = "ssh-ed25519 AAAA...rest-of-key... user@hostname"
Add-Content -Path "$env:USERPROFILE\.ssh\authorized_keys" -Value $key

# Set permissions
icacls.exe "$env:USERPROFILE\.ssh\authorized_keys" /inheritance:r
icacls.exe "$env:USERPROFILE\.ssh\authorized_keys" /grant:r "$($env:USERNAME):(R)"
icacls.exe "$env:USERPROFILE\.ssh\authorized_keys" /grant:r "SYSTEM:(F)"
```

For **administrator users** (Windows treats them differently):

```text
# Also add to administrators file
$key = "ssh-ed25519 AAAA...rest-of-key... user@hostname"
Add-Content -Path "C:\ProgramData\ssh\administrators_authorized_keys" -Value $key

# Set permissions
icacls.exe "C:\ProgramData\ssh\administrators_authorized_keys" /inheritance:r
icacls.exe "C:\ProgramData\ssh\administrators_authorized_keys" /grant "SYSTEM:(F)"
icacls.exe "C:\ProgramData\ssh\administrators_authorized_keys" /grant "Administrators:(F)"
```

## Step 5: Create SSH Config Files

Instead of typing `ssh user@100.x.x.x`, create aliases like `ssh laptop`.

### On Linux/macOS

````bash
# Create/edit ~/.ssh/config
cat > ~/.ssh/config **Important:** The `IdentitiesOnly yes` option prevents the “Too many authentication failures” error when you have multiple SSH keys.

## Step 6: Test Connections

From any machine, try connecting to others:

```bash
# Test individual connections
ssh laptop1 "hostname"
ssh server1 "whoami"
ssh macmini "uptime"

# Test from one machine to another and then to a third
ssh laptop1 'ssh server1 "echo Connected through laptop1 to server1"'
````

If everything works, you should connect without any password prompts!

## Troubleshooting

### “Permission denied (publickey)”

- Verify the public key is in authorized_keys:# On the target machine cat ~/.ssh/authorized_keys

- Check permissions:

Linux/macOS: ~/.ssh should be 700, authorized_keys should be 600

- Windows: Use icacls as shown above

- For Windows administrators: Make sure the key is in C:\ProgramData\ssh\administrators_authorized_keys

### “Too many authentication failures”

Add `IdentitiesOnly yes` to your SSH config file (shown above).

### Can’t connect but Tailscale ping works

```text
# Verify Tailscale connectivity
tailscale ping 100.x.x.x

# Check if SSH is listening
# On target machine
netstat -an | grep :22  # Linux/macOS
netstat -an | Select-String ":22"  # Windows PowerShell
```

### SSH asks for passphrase

Your SSH key has a passphrase. Either:

- Use ssh-agent to cache the passphrase, OR

- Generate a new key without a passphrase (as shown in Step 3)

## Security Considerations

- Private keys never leave their machine – only public keys are shared

- Tailscale provides the network security – SSH traffic is already encrypted by Tailscale

- Passwordless keys are safe when:

The private key file is protected (correct permissions)

- The machine itself is secured (disk encryption, strong login password)

- You trust the Tailscale network (all machines are yours or your team’s)

- For extra security:

Use PasswordAuthentication no in /etc/ssh/sshd_config to disable password login entirely

- Use Tailscale ACLs to restrict which machines can connect to which

- Consider keeping passphrases on keys for highly sensitive servers

## The Full Mesh Matrix

Once completed, you’ll have this connection matrix:

| From ↓ / To → | laptop1 | laptop2 | server1 | macmini |
| ------------- | ------- | ------- | ------- | ------- |
| laptop1       | –       | ✅      | ✅      | ✅      |
| laptop2       | ✅      | –       | ✅      | ✅      |
| server1       | ✅      | ✅      | –       | ✅      |
| macmini       | ✅      | ✅      | ✅      | –       |

## Automation Script

Here’s a helper script to test all connections from the current machine:

### Linux/macOS

```bash
#!/bin/bash
# test-ssh-mesh.sh

HOSTS=("laptop1" "laptop2" "server1" "macmini")
CURRENT_HOST=\$(hostname)

echo "Testing SSH connections from \$CURRENT_HOST..."
echo "=========================================="

for host in "\${HOSTS[@]}"; do
    if [ "\$host" != "\$CURRENT_HOST" ]; then
        echo -n "Testing \$host... "
        if ssh -o ConnectTimeout=5 "\$host" "echo OK" &>/dev/null; then
            echo "✅"
        else
            echo "❌"
        fi
    fi
done
```

### Windows (PowerShell)

```powershell
# test-ssh-mesh.ps1

\$hosts = @("laptop1", "laptop2", "server1", "macmini")
\$currentHost = hostname

Write-Host "Testing SSH connections from \$currentHost..."
Write-Host "=========================================="

foreach (\$host in \$hosts) {
    if (\$host -ne \$currentHost) {
        Write-Host -NoNewline "Testing \$host... "
        try {
            \$result = ssh -o ConnectTimeout=5 \$host "echo OK" 2>&1
            if (\$LASTEXITCODE -eq 0) {
                Write-Host "✅" -ForegroundColor Green
            } else {
                Write-Host "❌" -ForegroundColor Red
            }
        } catch {
            Write-Host "❌" -ForegroundColor Red
        }
    }
}
```

## Conclusion

You now have a fully connected mesh of machines where any system can SSH to any other without passwords! This setup is incredibly powerful for:

- Running distributed tasks across machines

- Quickly hopping between systems for maintenance

- Setting up cluster computing

- Remote development workflows

- Automated deployment scripts

The combination of Tailscale’s secure network and SSH key authentication gives you both security and convenience. Enjoy your passwordless SSH mesh network!

## Additional Resources

- Tailscale Documentation

- OpenSSH Manual

- SSH Config File Reference
