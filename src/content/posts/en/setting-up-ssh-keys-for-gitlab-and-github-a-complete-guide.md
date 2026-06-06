---
title: 'Setting Up SSH Keys for GitLab and GitHub: A Complete Guide'
description: 'As a developer, I prefer to use GitLab for my private projects and repositories due to its generous free tier for private repos, while using GitHub for public open-source projects where the community and visibility are unmatched. This dual-platform approach means I need...'
pubDate: 2025-06-13
heroImage: '/images/2025/06/gitlab_github.png'
heroImageAlt: 'gitlab github'
categories: ['Linux']
tags: ['SSH', 'Linux']
toc: true
---

As a developer, I prefer to use GitLab for my private projects and repositories due to its generous free tier for private repos, while using GitHub for public open-source projects where the community and visibility are unmatched. This dual-platform approach means I need seamless SSH authentication for both services. Recently, I needed to set up SSH authentication for my Git repositories on both GitLab and GitHub from my Ubuntu development server. Here’s the complete process I followed, including troubleshooting steps and best practices.

## The Problem

I was getting authentication errors when trying to push commits from VS Code to my GitLab repository. The error messages included:

```text
HTTP Basic: Access denied. If a password was provided for Git authentication, the password was incorrect or you're required to use a token instead of a password.
```

And later:

```bash
git@gitlab.com: Permission denied (publickey).
fatal: Could not read from remote repository.
```

## Step 1: Generate SSH Key with Meaningful Name

Instead of using the default `id_ed25519` name, I created a key with a descriptive name:

```bash
# Generate new SSH key with custom name
ssh-keygen -t ed25519 -f ~/.ssh/gitlab_datavoro_2025 -C "xxxx@gitlab"
```

This creates two files:

- ~/.ssh/gitlab_datavoro_2025 (private key)

- ~/.ssh/gitlab_datavoro_2025.pub (public key)

## Step 2: Add Public Key to GitLab

```bash
# Display the public key
cat ~/.ssh/gitlab_datavoro_2025.pub
```

Then:

- Go to https://gitlab.com/-/profile/keys

- Click “Add new key”

- Paste the entire public key content

- Give it a descriptive title like “Ubuntu Development Server – June 2025”

- Click “Add key”

## Step 3: Test GitLab SSH Connection

```bash
# Test with explicit key specification
ssh -i ~/.ssh/gitlab_datavoro_2025 -T git@gitlab.com
```

Expected output:

```text
Welcome to GitLab, @xxxx!
```

## Step 4: Configure SSH for Automatic Key Selection

Create/edit SSH config file:

```text
nano ~/.ssh/config
```

Add configuration:

```text
Host gitlab.com
    HostName gitlab.com
    User git
    IdentityFile ~/.ssh/gitlab_datavoro_2025
    IdentitiesOnly yes
```

## Step 5: Fix Git Remote URL

The repository was still using HTTPS instead of SSH:

```bash
cd /path/to/your/repository

# Check current remote
git remote -v

# Change from HTTPS to SSH
git remote set-url origin git@gitlab.com:xxxx/xxxx.git

# Verify the change
git remote -v
```

## Step 6: Start SSH Agent and Add Key

```bash
# Start SSH agent
eval "$(ssh-agent -s)"

# Add your key to the agent
ssh-add ~/.ssh/gitlab_datavoro_2025
```

## Step 7: Test Git Operations

```bash
# Test SSH connection (should work without -i flag now)
ssh -T git@gitlab.com

# Test Git operations
git pull
git push
```

## Step 8: Configure VS Code to Use SSH

After the SSH setup, VS Code’s Git integration started working properly. The key steps were:

- Ensuring the Git remote uses SSH URL (not HTTPS)

- Having SSH agent running with the key loaded

- Proper SSH config file

## Step 9: Add Same Key to GitHub

Since SSH keys aren’t service-specific, I used the same key for GitHub:

```bash
# Display the same public key
cat ~/.ssh/gitlab_datavoro_2025.pub
```

Then:

- Go to https://github.com/settings/keys

- Click “New SSH key”

- Paste the same public key content

- Give it a similar title

- Click “Add SSH key”

## Step 10: Update SSH Config for Both Services

```text
nano ~/.ssh/config
```

Updated configuration:

```text
Host gitlab.com
    HostName gitlab.com
    User git
    IdentityFile ~/.ssh/gitlab_datavoro_2025
    IdentitiesOnly yes

Host github.com
    HostName github.com
    User git
    IdentityFile ~/.ssh/gitlab_datavoro_2025
    IdentitiesOnly yes
```

## Step 11: Test Both Services

```bash
# Test GitLab
ssh -T git@gitlab.com
# Expected: Welcome to GitLab, @xxxx!

# Test GitHub
ssh -T git@github.com
# Expected: Hi xxxx! You've successfully authenticated, but GitHub does not provide shell access.
```

## Final File Structure

The complete SSH setup resulted in these files:

```text
~/.ssh/
├── authorized_keys          # Keys that can SSH into this server
├── config                   # SSH client configuration
├── gitlab_datavoro_2025     # Private key (keep secret!)
├── gitlab_datavoro_2025.pub # Public key (added to services)
├── known_hosts             # Trusted server fingerprints
└── known_hosts.old         # Backup of previous known_hosts
```

## Key Troubleshooting Steps

### Problem: VS Code Using Mixed Authentication

**Symptoms**: Logs showing both HTTPS and SSH attempts **Solution**: Ensure Git remote uses SSH URL and SSH agent is running

### Problem: Permission Denied with SSH

**Symptoms**: `Permission denied (publickey)` **Solutions**:

- Start SSH agent: eval "\$(ssh-agent -s)"

- Add key to agent: ssh-add ~/.ssh/gitlab_datavoro_2025

- Test with explicit key: ssh -i ~/.ssh/gitlab_datavoro_2025 -T git@gitlab.com

### Problem: SSH Agent Connection Failed

**Symptoms**: `Could not open a connection to your authentication agent` **Solution**: Start SSH agent before adding keys

## Best Practices Learned

- Use descriptive key names instead of default id_ed25519

- One key for multiple services – SSH keys work across platforms

- Always backup your private key securely

- Use SSH config file to avoid specifying keys manually

- Test SSH connections before testing Git operations

- Keep private keys secure – never share the file without .pub extension

## Security Notes

- Private key (gitlab_datavoro_2025): Never share this file

- Public key (.pub file): Safe to share, this is what goes on services

- SSH directory permissions: Should be 700 (drwx------)

- Private key permissions: Should be 600 (-rw-------)

## Commands for Future Reference

```bash
# Generate new SSH key
ssh-keygen -t ed25519 -f ~/.ssh/service_username_year -C "email@domain"

# Test SSH connection
ssh -T git@service.com

# Start SSH agent and add key
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/keyname

# Change Git remote from HTTPS to SSH
git remote set-url origin git@service.com:username/repository.git

# Display public key for copying
cat ~/.ssh/keyname.pub
```

This setup now allows seamless Git operations from both command line and VS Code without any authentication prompts, using the same SSH key for both GitLab and GitHub.
