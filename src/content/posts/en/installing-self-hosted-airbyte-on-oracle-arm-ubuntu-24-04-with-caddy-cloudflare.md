---
title: "Installing Self-Hosted Airbyte on Oracle ARM Ubuntu 24.04 with Caddy & Cloudflare"
description: "Airbyte is a powerful open-source data integration platform, allowing you to sync data between various sources and destinations. Self-hosting Airbyte gives you full control over your data pipelines. This guide walks through installing Airbyte on an Oracle Cloud ARM..."
pubDate: 2025-04-08
categories: ["Linux"]
tags: []
toc: true
---

Airbyte is a powerful open-source data integration platform, allowing you to sync data between various sources and destinations. Self-hosting Airbyte gives you full control over your data pipelines. This guide walks through installing Airbyte on an Oracle Cloud ARM Ampere VM running Ubuntu 24.04, making it accessible via a secure subdomain (airbyte.yourdomain.com) using Caddy as a reverse proxy and Cloudflare for DNS and SSL.

We’ll leverage Airbyte’s official abctl tool for installation, which simplifies deployment, especially compared to older methods or manual Docker Compose setups that might have outdated documentation links. We’ll also cover a common port conflict issue and discuss how data storage works, particularly if you’ve customized your Docker Root Directory.

This guide is inspired on the officiald installation documenation located here: [https://docs.airbyte.com/using-airbyte/getting-started/oss-quickstart](https://docs.airbyte.com/using-airbyte/getting-started/oss-quickstart)

**Our Setup:**

- Cloud Provider: Oracle Cloud Infrastructure (OCI)

- VM: ARM Ampere instance

- OS: Ubuntu 24.04 LTS

- Web Server/Proxy: Caddy (installed directly, not via Docker)

- DNS/SSL: Cloudflare (using Proxied mode)

- Storage: Standard Boot Volume + Larger Block Volume (mounted, e.g., at /mnt/myvolume)

- Containerization: Docker & Docker Compose

- Goal: Access Airbyte securely at https://airbyte.yourdomain.com

**Prerequisites:**

- Oracle Cloud ARM VM: An Ubuntu 24.04 ARM instance running and accessible via SSH.

- Docker & Docker Compose: Installed and running. Ensure Docker is compatible with ARM.

```bash
docker --version
docker compose version
sudo systemctl status docker
```

3. **Custom Docker Root Directory (Optional but Recommended):** If you want Docker’s data (volumes, images) on your block volume, configure this in /etc/docker/daemon.json *before* installing Airbyte. For example:

```json
{
  "data-root": "/var/www/html/docker"
}
```

- (Remember to restart Docker after changing: sudo systemctl restart docker). This turned out to be key for ensuring Airbyte’s data landed on our block volume automatically.

- Mounted Block Volume: Your block volume should be mounted (e.g., /mnt/myvolume) and writable.

- Caddy: Installed and configured to serve your main domain (e.g., yourdomain.com), likely handling SSL automatically.

```bash
sudo systemctl status caddy
```

- Cloudflare Account: Access to manage DNS records for yourdomain.com.

- SSH Access: Terminal access to your VM.

## Table of Contents

- Step 1: SSH into your VM

- Step 2: Install abctl

- Step 3: Install Airbyte using abctl (Handling Port Conflicts)

- Step 4: Configure Caddy Reverse Proxy

- Step 5: Configure Cloudflare DNS

- Step 6: Retrieve Default Airbyte Credentials

- Step 7: Access Airbyte!

- Step 8: Maintenance and Updates

- Conclusion:

## Step 1: SSH into your VM

Connect to your Oracle Cloud instance using your SSH key.

## Step 2: Install abctl

Airbyte provides a handy command-line tool, abctl, to manage installations. Install it using the official script:

```bash
sudo curl -LsfS https://get.airbyte.com | bash -s
```

This command downloads the appropriate ARM version and places abctl in /usr/local/bin. Verify the installation:

```text
abctl --help
```

## Step 3: Install Airbyte using abctl (Handling Port Conflicts)

Now, we’ll use abctl to install Airbyte. A common issue is that Airbyte defaults to port 8000, which might already be in use by another application proxied by Caddy. We encountered this and resolved it by specifying a different host port using the –port flag. We’ll use 8001.

*Note: You might need sudo depending on your Docker permissions setup.*

```bash
# Create data directories (even if unused later due to Docker Root Dir, good practice)
sudo mkdir -p /var/www/html/airbyte_data/data
sudo mkdir -p /var/www/html/airbyte_data/db
sudo mkdir -p /var/www/html/airbyte_data/workspace
# Use appropriate user:group (e.g., ubuntu:ubuntu or $USER:$USER)
sudo chown -R $USER:$USER /var/www/html/airbyte_data

# Run the install, specifying a free host port (e.g., 8001)
sudo abctl local install --no-browser --port=8001
```

abctl will perform several steps:

- Verify prerequisites (Docker).

- Set up a local Kubernetes cluster using kind (Kubernetes in Docker).

- Pull all necessary Airbyte Docker images (this can take time).

- Deploy Airbyte components using Helm charts within the kind cluster.

- Set up an Nginx ingress controller within kind to expose Airbyte on the host port (8001 in our case).

Wait for the “SUCCESS Airbyte installation complete” message.

## Step 4: Configure Caddy Reverse Proxy

Now, tell Caddy to route traffic for airbyte.yourdomain.com to the port where Airbyte is listening on the host (localhost:8001).

Edit your Caddyfile (usually /etc/caddy/Caddyfile):

```text
sudo nano /etc/caddy/Caddyfile
```

Add a new block for the Airbyte subdomain *before* or *after* your existing domain configuration:

```text
airbyte.yourdomain.com {
    # Optional: Enable logging for this subdomain
    log 

    # Enable compression
    encode gzip zstd

    # Reverse proxy requests to Airbyte running via abctl/kind on host port 8001
    reverse_proxy localhost:8001 {
        # Standard headers for proxied applications
        header_up Host {host}
        header_up X-Real-IP {remote_ip}
        header_up X-Forwarded-For {remote_ip}
        header_up X-Forwarded-Proto {scheme}
    }
}

# --- Keep your existing configuration for yourdomain.com below ---
# yourdomain.com {
#    ... your existing config ...
# }
```

Save the file (Ctrl+X, then Y, then Enter).

Validate the configuration and reload Caddy:

```bash
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

## Step 5: Configure Cloudflare DNS

- Log in to your Cloudflare dashboard.

- Navigate to the DNS settings for yourdomain.com.

- Add a new DNS record:

Type: A

- Name: airbyte (Cloudflare automatically appends .yourdomain.com)

- IPv4 Address: Enter the public IP address of your Oracle VM (xxx.xxx.xxx.xxx).

- Proxy status: Ensure it’s set to Proxied (orange cloud). This is crucial for Cloudflare’s SSL and protection features.

- Save the record. DNS changes can take a few minutes to propagate globally.

## Step 6: Retrieve Default Airbyte Credentials

abctl sets up initial login credentials during installation. Retrieve them using:

```text
sudo abctl local credentials
```

Copy the username (usually airbyte) and the generated password.

## Step 7: Access Airbyte!

Open your web browser and navigate to:

https://airbyte.yourdomain.com

You should be automatically redirected to HTTPS (thanks to Caddy/Cloudflare). You’ll see the Airbyte login page. Enter the username and password obtained in the previous step.

Success! You should now be logged into your self-hosted Airbyte dashboard.

**A Note on Data Storage:**

Initially, we were concerned about where Airbyte’s data was stored. Since abctl uses Kubernetes (kind), the data (database, connector states, etc.) is stored in Kubernetes Persistent Volumes. With a default Docker setup, these often map back to Docker named volumes on the *boot disk* (/var/lib/docker/volumes).

However, because we had **pre-configured Docker’s Root Directory** (data-root) to /var/www/html/docker (on our block volume), Docker automatically placed all its named volumes there. Consequently, the Kubernetes Persistent Volumes used by Airbyte are **already being stored on the block volume**, within /var/www/html/docker/volumes/. No complex Kubernetes volume migration was needed!

**Troubleshooting:**

- 5xx Errors: Check Caddy logs (sudo journalctl -u caddy -f or the file log if configured). Ensure Caddy can reach localhost:8001. Verify Airbyte is running (sudo abctl local status or sudo docker ps).

- SSL Errors: Ensure Cloudflare DNS is correct, set to “Proxied”, and has propagated. Check Caddy logs for certificate errors.

- Cannot Log In: Double-check the credentials from sudo abctl local credentials.

## Step 8: Maintenance and Updates

Once Airbyte is up and running, regular maintenance is key to ensuring stability, security, and access to the latest features and connector updates. Here’s how to manage your abctl-based installation, which uses Kubernetes (kind) running inside Docker.

**1. Updating Airbyte Core**

The primary maintenance task is keeping Airbyte itself updated. abctl simplifies this process significantly. It manages the underlying Helm chart deployment within the kind cluster it created.

**Steps to Update Airbyte:**

- (Optional) Check Current Version: Note the Airbyte version currently displayed in the bottom-left corner of the UI or in the Settings section.

- (Optional) Check Latest Version: Visit the Airbyte Releases page on GitHub to see the latest available stable version. abctl generally aims to install the latest stable release it’s aware of.

- Ensure Airbyte/Kind Cluster is Running: Unlike some update processes, abctl needs to connect to the running Kubernetes (kind) cluster to perform the upgrade via Helm. Make sure the kind Docker container is running. You can check its status:

```bash
# Look for a name like 'kind-airbyte-abctl-control-plane' and check STATUS
sudo docker ps | grep kind
```

If it’s stopped (e.g., Exited), start it first:

```bash
# Replace  with the actual name (e.g., airbyte-abctl-control-plane)
sudo docker start 
# Wait 30 seconds or so for it to initialize before proceeding.
```

**4. Run abctl install to Trigger Upgrade:** Use the *exact same install command* you used initially, including the specific port. This command prompts abctl to check the current deployment and apply the latest stable Helm chart version it supports.

```text
# Make sure to use the SAME port you used during initial setup (e.g., 8001)
sudo abctl local install --no-browser --port=8001
```

This process will:

- Connect to the running kind cluster.

- Pull any new or updated Docker images required by the new Airbyte version.

- Use Helm (Kubernetes package manager) to upgrade the Airbyte deployment within the kind cluster.

- Restart the necessary Airbyte services/pods within Kubernetes.

**5. Verify Update:** Once the command completes, access Airbyte at https://airbyte.yourdomain.com. Check the version number in the UI to confirm the upgrade was successful. Test basic functionality, like navigating the UI and checking connections.

**Important Notes on Updating:**

- Data Preservation: Helm upgrades are designed to retain data stored in Kubernetes Persistent Volumes (PVs). Since your Docker data-root points to your block volume, your configurations, connections, and sync history stored in these PVs should be preserved during the upgrade.

- Service Interruption: While the underlying cluster remains running, Airbyte services within the cluster will be restarted during the upgrade, causing a brief service interruption.

**2. Stopping and Starting Airbyte (for other Maintenance)**

If you need to stop the *entire* Airbyte environment for server maintenance (like an OS reboot) or other reasons *unrelated* to an Airbyte version upgrade, you do **not** use abctl. Instead, you stop and start the Docker container that runs the kind Kubernetes cluster:

- Find the Container Name:

```bash
# Look for a name like 'kind-airbyte-abctl-control-plane'
sudo docker ps | grep kind
```

- To Stop Airbyte Environment:

```bash
# Replace  with the actual name found above
sudo docker stop 
```

- To Start Airbyte Environment:

```bash
# Replace  with the actual name found above
sudo docker start 
```

*Wait a minute or two after starting the container for all the internal Kubernetes pods (Airbyte services) to initialize.* You can monitor their status with kubectl get pods -n airbyte-abctl -w.

3. **Updating abctl (The Tool Itself)** 

Occasionally, you might want to update the abctl command-line tool itself. Re-run the original installation script:

```bash
sudo curl -LsfS https://get.airbyte.com | bash -s
```

This will overwrite the existing abctl binary in /usr/local/bin.

**4. Updating the Operating System (Ubuntu)**

Keep your underlying Ubuntu server updated:

```bash
sudo apt update
sudo apt upgrade -y
sudo apt autoremove -y
```

Remember that OS updates requiring a reboot (sudo reboot) will stop the kind container. You will need to manually restart it using sudo docker start  after the server comes back up.

**5. Monitoring**

Regularly check logs and resource usage to ensure your Airbyte instance is healthy.

- Airbyte Logs (via kubectl): The most detailed logs for Airbyte services (webapp, server, workers, etc.) are available within the Kubernetes (kind) cluster. To access them, you need the kubectl command-line tool, which is not installed by default or by abctl.

Install kubectl (if you haven’t already):

```bash
# --- Install kubectl on Ubuntu 24.04 ARM ---
# 1. Download the binary
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/arm64/kubectl"

# 2. Optional: Validate the binary
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/arm64/kubectl.sha256"
echo "$(cat kubectl.sha256)  kubectl" | sha256sum --check
# (Should output: kubectl: OK)

# 3. Make executable
chmod +x ./kubectl

# 4. Move to PATH
sudo mv ./kubectl /usr/local/bin/kubectl

# 5. Verify client version
kubectl version --client
# --- End kubectl Install ---
```

- Using kubectl with abctl’s Cluster: Since abctl install was likely run with sudo, the Kubernetes configuration file (kubeconfig) it created resides under the /root directory and requires sudo to access. You must tell kubectl where to find this specific configuration file each time you run a command using the KUBECONFIG environment variable:

```text
# Define the path to the kubeconfig file (check abctl install output if different)
ABCTL_KUBECONFIG="/root/.airbyte/abctl/abctl.kubeconfig"

# Example: Verify context (should show 'kind-airbyte-abctl')
sudo KUBECONFIG=${ABCTL_KUBECONFIG} kubectl config get-contexts

# Example: List Airbyte pods running in the 'airbyte-abctl' namespace
sudo KUBECONFIG=${ABCTL_KUBECONFIG} kubectl get pods -n airbyte-abctl

# Example: Tail logs from a specific pod (replace  with one from the list)
sudo KUBECONFIG=${ABCTL_KUBECONFIG} kubectl logs  -n airbyte-abctl -f
```

*(You need to include sudo KUBECONFIG=\${ABCTL_KUBECONFIG} before every kubectl command intended for the Airbyte cluster).*

**Tip: Create a Shell Alias (Recommended):** Typing the sudo KUBECONFIG=… prefix constantly is tedious. You can create a shell alias for convenience.

- Edit your shell’s configuration file (e.g., nano ~/.bashrc for bash, or nano ~/.zshrc for zsh).

- Add this line at the end:

```text
# Alias for kubectl targeting the abctl Airbyte cluster
alias kairbyte='sudo KUBECONFIG=/root/.airbyte/abctl/abctl.kubeconfig kubectl'
```

- Save the file and apply the changes to your current session (e.g., source ~/.bashrc or source ~/.zshrc).

- Now you can simply use kairbyte instead:

```text
kairbyte config get-contexts
kairbyte get pods -n airbyte-abctl
kairbyte logs  -n airbyte-abctl -f
```

- Caddy Logs: Check for reverse proxy errors or access issues related to Caddy.

```bash
# Check the specific log file for the subdomain
sudo tail -f /var/log/caddy/airbyte.yourdomain.com.log
# Or check the main system journal for Caddy messages
sudo journalctl -u caddy -f | grep airbyte.yourdomain.com
```

- System Resources: Monitor overall server health.

```bash
# Interactive process viewer
htop
# Check disk usage (especially root '/' and block volume '/mnt/myvolume')
df -h
# Check Docker-specific disk usage
sudo docker system df
```

**6. Backups (Configuration)**

Regularly back up your Airbyte configuration via the UI:

- Go to Settings -> Configuration Export.

- Download the configuration file.

- Store this backup securely off the VM. This allows you to restore your sources, destinations, and connections if needed. Remember your actual data resides in your sources/destinations and needs its own backup strategy.

By following these refined maintenance steps, you can effectively manage your abctl-deployed Airbyte instance, keeping it updated and stable while understanding how to correctly interact with the underlying kind/Docker environment.

## Conclusion:

By using the official abctl tool and handling the common port conflict, we successfully installed Airbyte on an Oracle ARM Ubuntu server. Integrating it with Caddy and Cloudflare provides a secure, easily accessible setup under a custom subdomain. Furthermore, proactively setting Docker’s data root ensured persistent data landed on our desired block volume without needing complex Kubernetes adjustments. Happy data integrating!
