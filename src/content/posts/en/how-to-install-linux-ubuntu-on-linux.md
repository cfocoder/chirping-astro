---
title: 'How to Install Linux Ubuntu on Windows'
description: 'I recently learned how to install Ubuntu on my Windows 10 laptop, not as a virtual machine, but as part of my normal Windows installation, so I have the advantage of not wasting resources dedicated to Ubuntu on a virtual machine.'
pubDate: 2022-10-19
heroImage: '/images/2023/08/ubuntu-logo14-e1666232702975.png'
heroImageAlt: 'ubuntu logo14 e1666232702975'
categories: ['Linux']
tags: []
toc: true
---

I recently learned how to install Ubuntu on my Windows 10 laptop, not as a virtual machine, but as part of my normal Windows installation, so I have the advantage of not wasting resources dedicated to Ubuntu on a virtual machine.

## Table of Contents

- Install Windows Subsystem for Linux (WSL)

- Install “Windows Terminal” from the Microsoft Store

- Install the Linux Kernel

- Set WSL 2 as the default version

- Install Ubuntu from the Microsoft Store

- Install ZSH

- Source

## Install Windows Subsystem for Linux (WSL)

First, you must activate some features of Windows, from the “Control Panel”, which are:

- Virtual Machine Platform

- Windows Hypervisor Platform

- Windows Subsystem for Linx

![](/images/2023/08/wsl.png)

Once these features have been activated, we must restart the machine

## Install “Windows Terminal” from the Microsoft Store

Installing this terminal is not strictly necessary, but it is ideal because it has certain features that allow us to manage several terminals from the same application.

![](/images/2023/08/windows_terminal.png)

Al terminar la instalación de la terminal, abrir la nueva terminal como Administrador

## Install the Linux Kernel

Go to [https://aka.ms/wsl2kernel](https://aka.ms/wsl2kernel) and install the Kernel

![](/images/2023/08/wsl_kernel.png)

## Set WSL 2 as the default version

Open the new terminal as PowerShell or Command Prompt and type the following command:

```text
wsl --set-default-version 2
```

## Install Ubuntu from the Microsoft Store

Open the Microsoft Store, search for “ubuntu” and install the official version:

![](/images/2023/08/ubuntu_windows.png)

Follow the installation instructions, and at the end, it will ask us to create a username and password.

To access the files on the laptop in Windows, we must change to the “/mnt/c/” directory and from there we can navigate to any file or folder. The letter “c” stands for the name of the hard drive, so if you had any other hard drives, just change the letter in the path.

![](/images/2023/08/ubuntu_start.png)

Later, already in the ubuntu terminal, type the following command to update the pre-installed applications:

```bash
sudo apt-get update && sudo apt-get upgrade
```

## Install ZSH

ZSH is a Linux application that helps us improve the Ubuntu Shell or terminal, so from the Ubuntu terminal, we proceed to type the following command to install it:

```bash
sudo apt install zsh
```

Later, go to [https://ohmyz.sh/](https://ohmyz.sh/) and run the following command, as explained on the web page:

```text
sh -c "$(curl -fsSL https://raw.github.com/ohmyzsh/ohmyzsh/master/tools/install.sh)"
```

Oh My Zsh expects custom plugins to be placed in its custom plugins directory (\$ZSH_CUSTOM/plugins, which usually defaults to ~/.oh-my-zsh/custom/plugins).

```bash
git clone https://github.com/zsh-users/zsh-autosuggestions ${ZSH_CUSTOM:-~/.oh-my-zsh/custom}/plugins/zsh-autosuggestions

git clone https://github.com/zsh-users/zsh-syntax-highlighting.git ${ZSH_CUSTOM:-~/.oh-my-zsh/custom}/plugins/zsh-syntax-highlighting
```

Now we only need to customize the ZSH shell terminal for which we write the following command in the terminal, which will open the file in Visual Studio Code

```text
nano .zshrc
```

And once the zshrc file was opened, we proceed to make the following editions, which are the “agnoster” theme and later at the end of the file we install the “syntax highlighting” and the “autosuggestions”:

```text
# Set name of the theme to load --- if set to "random", it will
# load a random theme each time oh-my-zsh is loaded, in which case,
# to know which specific one was loaded, run: echo $RANDOM_THEME
# See https://github.com/ohmyzsh/ohmyzsh/wiki/Themes
ZSH_THEME="agnoster"
```

**Enable the Plugins in .zshrc:**
Open your ~/.zshrc file with a text editor (like nano, vim, or code):

```text
nano ~/.zshrc
# or vim ~/.zshrc
# or code ~/.zshrc
```

Find the line that looks like plugins=(…). Add zsh-autosuggestions and zsh-syntax-highlighting to the list, separated by spaces or newlines. **Important:** Make sure zsh-syntax-highlighting is listed **last**.

Example:

```bash
plugins=(
    git
    # other plugins...
    zsh-autosuggestions
    zsh-syntax-highlighting
)
```

**Apply Changes:**
Either close and reopen your terminal, or run:

```text
source ~/.zshrc
```

## Source

These instructions are taken from this video, which does an excellent job of explaining the entire process (in Spanish)
