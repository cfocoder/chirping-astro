---
title: 'How to Install Langflow on Oracle ARM (Ubuntu) using Coolify: The “Proper” Way'
description: 'Deploying AI tools like Langflow on self-hosted hardware (like the generous Oracle Cloud ARM Free Tier) gives you total control over your data and costs. While tools like Coolify make deployment easy, Langflow has a few quirks regarding data persistence and admin...'
pubDate: 2025-11-21
heroImage: '/images/2025/11/Langflow_Logo.png'
heroImageAlt: 'Langflow Logo'
categories: ['AI']
tags: []
toc: true
---

Deploying AI tools like **Langflow** on self-hosted hardware (like the generous Oracle Cloud ARM Free Tier) gives you total control over your data and costs. While tools like **Coolify** make deployment easy, Langflow has a few quirks regarding data persistence and admin authentication that can cause headaches—like data disappearing after restarts or getting locked out of the Admin panel.

After some trial and error, I found the rock-solid method to deploy Langflow securely, ensuring your data survives updates and your Admin user is correctly configured.

Here is the step-by-step guide.

## Prerequisites

- An Oracle Cloud ARM server (Ubuntu).

- Coolify installed and running.

- A domain name pointing to your server.

## Step 1: Create the Service in Coolify

- Create a new Project / Environment in Coolify.

- Select + Add Resource -> Docker Image.

- Use the official image: langflowai/langflow:latest

- Configuration Settings:

Name: langflow

- Domains: Set your full https domain (e.g., https://langflow.example.com). Do not add the port number here.

### ⚠️ Network Configuration (Critical)

This is where many setups go wrong. You want to force traffic through the secure HTTPS proxy, not the raw IP.

- Ports Exposes: 7860(This allows Coolify to talk to the container internally).

- Ports Mappings: LEAVE EMPTY(Do not put 7860:7860 here. If you do, you open an unencrypted “backdoor” to your server via IP address).

## Step 2: Fix Persistent Storage (Crucial)

By default, Docker containers are ephemeral—if you restart them, your data is wiped. You need to map specific folders to persistent volumes to keep your database and uploaded files safe.

- Go to the Persistent Storage tab.

- Add the following two volumes:

| Volume Name      | Destination | Why?                                                       |
| ---------------- | ----------- | ---------------------------------------------------------- |
| (Auto-generated) | /app        | Stores the database file (where we will force it to live). |
| (Auto-generated) | /data       | Standard storage for uploads, cache, and generic data.     |

- Save the configuration.

## Step 3: Configure Environment Variables

We need to tell Langflow where to look for the database (our safe `/app` folder) and how to handle the initial user login.

Go to **Environment Variables** and add the following:

| Variable Key                | Value                      | Description                                                                |
| --------------------------- | -------------------------- | -------------------------------------------------------------------------- |
| LANGFLOW_AUTO_LOGIN         | False                      | Disables the default “Guest” mode. Essential for security.                 |
| LANGFLOW_NEW_USER_IS_ACTIVE | True                       | Allows you to sign up and immediately log in without waiting for approval. |
| LANGFLOW_DATABASE_URL       | sqlite:////app/langflow.db | The Secret Sauce. Forces the DB to live in your safe storage volume.       |

**Important:** For `LANGFLOW_DATABASE_URL`, ensure there are **four slashes** (`////`) after `sqlite:`.

## Step 4: Initial Deployment & Account Creation

- Click Redeploy (or Start) in Coolify.

- Wait for the logs to show Uvicorn running on http://0.0.0.0:7860.

- Open your domain (https://langflow.example.com).

- You will see the Login screen. Click “Don’t have an account? Sign Up”.

- Create your user (e.g., myuser and your password).

_Because we set `NEW_USER_IS_ACTIVE=True`, you will get in immediately._

## Step 5: The “Admin Fix” (Promoting your User)

By default, signing up via the UI creates a “Standard User,” meaning you won’t see the **Admin Page** in settings. Since the CLI commands often fail due to authentication locks on the running app, the most reliable method is to modify the database directly using the container’s terminal.

- In Coolify, go to the Terminal tab of your Langflow service.

- Click Connect.

- Assign Admin Rights: Run this exact Python command to force the database to update your status:

```bash
python -c "import sqlite3; conn = sqlite3.connect('/app/langflow.db'); conn.execute(\"UPDATE user SET is_superuser=1 WHERE username='YOUR_USERNAME_HERE'\"); conn.commit(); print('✅ Success: User promoted to Superuser');"
```

_(Replace `YOUR_USERNAME_HERE` with the username you just created)._

### Verify Admin Status

Before you restart, you can verify that the database update was successful by running this check command in the terminal:codeBash

```bash
python -c "import sqlite3; conn = sqlite3.connect('/app/langflow.db'); cursor = conn.execute(\"SELECT username, is_superuser FROM user WHERE username='YOUR_USERNAME_HERE'\"); print(cursor.fetchone());"
```

- If the output is: (‘your_username’, 1) — You are an Admin! (1 = True).

- If the output is: (‘your_username’, 0) — Something failed, run the update command again.

- Restart the Container via Coolify (required to flush the permissions cache).

- Log in again and go to Settings. You will now see the Admin Page button on the sidebar!

## Troubleshooting: “I already started without the Env Var!”

If you started Langflow _before_ setting the `LANGFLOW_DATABASE_URL` variable, your data is currently hidden inside a temporary system folder (`.venv/...`) and will be lost if you restart.

**Here is the command to rescue your data and move it to the safe zone:**

- Open the Terminal in Coolify.

- Run this command to copy the hidden database to your persistent /app folder:bash cp ./.venv/lib/python3.12/site-packages/langflow/langflow.db /app/langflow.db

- Now go back to Step 3 and add the LANGFLOW_DATABASE_URL environment variable.

- Redeploy. Your data is now safe.

## Step 6: Final Security Hardening

Now that you are the Admin, lock the door behind you.

- Go to the Admin Page inside Langflow.

Check for a user named langflow. This is a default insecure account included in the Docker image. Delete it immediately.

- Go back to Coolify -> Environment Variables.

- Change LANGFLOW_NEW_USER_IS_ACTIVE to False.

- Redeploy.

## Summary

You now have a robust Langflow instance running on Oracle ARM.

- ✅ HTTPS Secured (via Coolify/Traefik).

- ✅ Data Persisted (Database mapped to /app).

- ✅ Admin Access (Manually promoted via Python script).

- ✅ Registration Locked (No strangers can sign up).

Happy building! 🚀
