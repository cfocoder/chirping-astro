---
title: "The Ultimate Guide to Installing and Using Gemini CLI on Windows, Linux, and VS Code"
description: "In the fast-paced world of software development, efficiency is everything. What if you could bring the power of a cutting-edge AI directly into your terminal, ready to answer questions, explain code, and generate commands without ever leaving your command line? That’s..."
pubDate: 2025-06-28
categories: ["AI"]
tags: []
toc: true
---

In the fast-paced world of software development, efficiency is everything. What if you could bring the power of a cutting-edge AI directly into your terminal, ready to answer questions, explain code, and generate commands without ever leaving your command line? That’s exactly what the Gemini CLI offers. It’s a powerful command-line interface that transforms your terminal from a simple shell into an intelligent development partner. Whether you need to debug a complex script, understand a foreign piece of code, or simply find the right command for a tricky task, the Gemini CLI puts a world-class AI right at your fingertips, turning complex problems into simple, conversational solutions.

The command line is faster than ever, and with AI, it’s also smarter. Google’s Gemini CLI brings the power of a state-of-the-art language model directly to your terminal. However, as with many powerful tools, the setup can have a few tricky spots, from permission errors to confusing authentication methods.

This guide provides a clean, reliable, step-by-step method to install the @google/gemini-cli package on both Linux and Windows. We’ll use best practices to avoid common pitfalls and then show you how to seamlessly integrate it into your VS Code workflow, even alongside tools like GitHub Copilot or Codeium.

## The Foundation: Get Your Gemini API Key

Before we install anything, we need the key to the kingdom. Both installations will rely on an API key for authentication. This is the most reliable method and avoids issues with rate limiting on the free tier.

- Go to the Google AI Studio.

- Click “Create API key” and copy the generated key. Keep it handy.

## Part 1: Installation on Linux (The Right Way with NVM)

On Linux, the most common error is a EACCES: permission denied error when trying to install global npm packages. We’ll bypass this completely by using **Node Version Manager (nvm)**, which is the industry standard for managing Node.js environments.

#### Step 1: Install NVM

NVM installs Node.js in your user’s home directory, avoiding any need for sudo and system-wide permissions.

```bash
# Download and run the nvm installation script
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

# IMPORTANT: Close and reopen your terminal to apply the changes
```

#### Step 2: Install Node.js

With NVM installed, you can now install the latest Long-Term Support (LTS) version of Node.js.

```text
nvm install --lts
```

#### Step 3: Configure the API Key

We’ll add the API key to your shell’s startup file so it’s always available.

```bash
# Replace YOUR_API_KEY_HERE with your actual key
# This command adds the key to your .bashrc file. If you use zsh, change it to ~/.zshrc
echo 'export GEMINI_API_KEY="YOUR_API_KEY_HERE"' >> ~/.bashrc

# Apply the changes to your current session
source ~/.bashrc
```

#### Step 4: Install Gemini CLI

Now, the final step is a simple npm command—no sudo required.

```bash
npm install -g @google/gemini-cli
```

#### Step 5: Verify It Works

Test the installation with a simple prompt.

```text
gemini -p "What is the command to list files in a directory on Linux?"
```

You should get a direct answer, confirming your setup is perfect.

## Part 2: Installation on Windows (PowerShell Power)

The key to a flawless Windows installation is configuring the environment correctly *before* installing the package. This ensures both the direct (-p) and interactive modes work perfectly from the start.

#### Step 1: Install Node.js

If you don’t have it, download the official LTS installer from the [Node.js website](https://www.google.com/url?sa=E&q=https%3A%2F%2Fnodejs.org%2F) and run it.

#### Step 2: Configure the API Key (The Dual-Method Approach)

The Gemini CLI on Windows checks for the API key in two different places depending on the mode. We’ll set up both for a bulletproof configuration.

**A) The Permanent System Variable (for -p mode):**
Run this in PowerShell to create a permanent environment variable for your user.

```text
# Replace YOUR_API_KEY_HERE with your actual key
setx GEMINI_API_KEY "YOUR_API_KEY_HERE"
```

You’ll see a SUCCESS message.

**B) The .env File (for interactive gemini mode):**
Create a .env file in your home directory that the interactive mode will read.

```powershell
# Replace YOUR_API_KEY_HERE with your actual key
Set-Content -Path ~/.env -Value 'GEMINI_API_KEY="YOUR_API_KEY_HERE"'
```

#### Step 3: Install Gemini CLI

**Crucial Step:** **Close your current PowerShell window and open a brand new one.** This ensures the new environment variable from setx is loaded.

In the **new** terminal, run the installation command:

```bash
npm install -g @google/gemini-cli
```

#### Step 4: Verify Both Modes

Test both direct and interactive modes.

```text
# Test 1: Direct Mode
gemini -p "What is the capital of Germany?"

# Test 2: Interactive Mode
gemini
```

In interactive mode, you should be able to chat immediately without any warnings about slow response times or authentication.

## Part 3: Supercharging Your Workflow in VS Code

Now that the CLI is installed, let’s make it a core part of your development environment.

#### Method 1: The Integrated Terminal (The Quick & Easy)

This is the simplest way. Press Ctrl+` to open the VS Code terminal. It automatically inherits your environment, so your gemini command and API key work out of the box. It’s perfect for asking quick questions without leaving your editor.

#### Method 2: Creating a Custom Task (The Power User Move)

Let’s create a keyboard shortcut to send selected code to Gemini for an explanation.

- Create a Task: Press Ctrl+Shift+P, type Tasks: Configure Task, and create a tasks.json file from the “Others” template. Paste this in:

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Explain Selection with Gemini",
      "type": "shell",
      "command": "gemini -p 'Explain this code: ${selectedText}'",
      "presentation": { "panel": "dedicated", "clear": true, "focus": true }
    }
  ]
}
```

2. **Create a Shortcut:** Press Ctrl+Shift+P, type Preferences: Open Keyboard Shortcuts (JSON), and add this entry:Generated json

```json
{
  "key": "ctrl+alt+e", // Or your preferred shortcut
  "command": "workbench.action.tasks.runTask",
  "args": "Explain Selection with Gemini"
}
```

Now you can highlight any code, press Ctrl+Alt+E, and get a detailed explanation in a dedicated terminal panel!

#### How Gemini CLI Complements Copilot and Codeium

You don’t have to choose between them! They serve different purposes and work wonderfully together.

- GitHub Copilot / Codeium: Think of these as your inline autocompleters. They are best for generating code as you type, completing lines, and suggesting entire functions in place. They are a constant, quiet assistant.

- Gemini CLI: Think of this as your explicit, conversational expert. It excels when you have a specific, deliberate task.

Code Explanation: Use your Ctrl+Alt+E shortcut to understand a complex function you’ve found in a legacy codebase.

- Refactoring: Paste a function into the terminal and say, gemini -p “Refactor this code to be more efficient and add comments.”

- Generating Shell Commands: “Hey Gemini, what’s the git command to squash the last three commits into one?”

- High-Level Questions: Asking about architectural patterns, library choices, or debugging strategies.

Use Copilot/Codeium for the “flow” of writing code, and use the Gemini CLI when you need to stop, analyze, or ask a direct question.

Enjoy your new, powerfully integrated AI assistant
