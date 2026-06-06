---
title: "Conquering “Permission Denied”: A Quick Guide to Ubuntu File Permissions"
description: "Ever been in the middle of setting up a new project, run a command, and then BAM! You’re hit with the dreaded Permission denied (os error 13)? It’s a common stumbling block, especially when dealing with directories that might have been created by root or another user."
pubDate: 2025-06-15
categories: ["Linux"]
tags: []
toc: true
---

Ever been in the middle of setting up a new project, run a command, and then BAM! You’re hit with the dreaded Permission denied (os error 13)? It’s a common stumbling block, especially when dealing with directories that might have been created by root or another user.

I recently ran into this exact issue when trying to initialize a uv project with uv init inside a directory on my /mnt/myvolume drive:

```text
➜  marimo_test uv init
error: failed to create file `/var/www/html/python_projects/marimo_test/main.py`: Permission denied (os error 13)
```

Frustrating, right? My first instinct, like many, was to try sudo uv init. But that failed too:

```text
➜  marimo_test sudo uv init
sudo: uv: command not found
```

This led me down a rabbit hole, but the solution was actually quite straightforward once I understood how to properly check and grant permissions. Let’s break it down!

## Step 1: Diagnosing the Problem with ls -ld

The first step when facing a “Permission denied” error on a directory is to check who owns that directory and what permissions are set. The magical command for this is ls -ld.

In my case, running it on the marimo_test directory revealed the culprit:

```text
➜  ~ ls -ld /var/www/html/python_projects/marimo_test
drwxr-xr-x 2 root root 4096 Jun 15 15:57 /var/www/html/python_projects/marimo_test
```

Let’s decode this output:

- d: This tells us it’s a directory.

- rwxr-xr-x: This is the permission string, broken into three sets of three characters:

rwx (for root – the owner): Read, Write, and Execute. root has full control.

- r-x (for root – the group): Read and Execute. Members of the root group can read and enter the directory.

- r-x (for others): Read and Execute. Anyone else on the system can read and enter the directory.

- 2: Number of hard links (less relevant here).

- root root: This is the crucial part! The directory is owned by the user root and the group root.

- The rest is size, date, and name.

**The Aha! Moment:** My regular user (let’s say ubuntu for this example) was trying to run uv init. Since marimo_test was owned by root, my ubuntu user fell into the “others” category. And “others” only had r-x (read and execute) permissions. To create files (main.py, .venv), uv init needed **write (w) permission**, which my ubuntu user did not have on that directory.

## Step 2: Granting Permissions with chown (and understanding sudo)

Now that we know the problem, how do we fix it? We need to change the ownership of the directory from root to our regular user.

This is where chown comes in:

```bash
sudo chown -R ubuntu:ubuntu /var/www/html/python_projects/marimo_test
```

Let’s break down this command:

- sudo: We use sudo because we are trying to change the ownership of a file/directory currently owned by root. Only root (or a user with sudo privileges) can do this.

- chown: Stands for “change owner.”

- -R: This is important! It means “recursive.” It will change the ownership of the marimo_test directory and everything inside it (if there’s anything there already) to the specified user and group.

- ubuntu:ubuntu: This sets the new owner to the ubuntu user and the new group to the ubuntu group. You’d replace ubuntu with your actual username.

- /var/www/html/python_projects/marimo_test: The path to the directory we want to modify.

**Why sudo uv init failed:**

It’s crucial to understand why sudo uv init didn’t work.

- sudo and PATH: When you use sudo, the system often uses a different PATH environment variable for the root user. If uv was installed in your user’s local binary directory (e.g., ~/.cargo/bin or a virtual environment), root wouldn’t find it in its default PATH.

- Ownership: Even if sudo uv init had worked, it would have created all the project files (main.py, .venv/, etc.) as being owned by root. This would lead to more permission problems later when you try to edit or run your project as your regular user!

**The rule of thumb:** Use sudo only when you *need* elevated privileges (like changing system files, or taking ownership of root-owned files/directories). For creating user-level project files, always run commands as your regular user.

## Step 3: Verify and Proceed!

After running the chown command, you can (optionally) verify the change:

```text
➜  ~ ls -ld /var/www/html/python_projects/marimo_test
drwxr-xr-x 2 ubuntu ubuntu 4096 Jun 15 15:57 /var/www/html/python_projects/marimo_test
```

Notice ubuntu ubuntu is now the owner! This means your ubuntu user now has full rwx permissions on marimo_test.

Now, navigate back to your project directory (if you’re not already there):

```bash
cd /var/www/html/python_projects/marimo_test
```

And try your original command:

```text
uv init
```

Voilà! It should now work perfectly.

## Prevention is Key: Understanding Directory Creation and Ownership

This problem often stems from how directories are initially created. Let’s solidify that understanding:

- When you use mkdir (without sudo):

The directory is created by your current user.

- It will be owned by your current user and your primary user group.

- Example: If your username is ubuntu and your primary group is ubuntu, then mkdir my_folder will result in my_folder being owned by ubuntu:ubuntu.

- The default permissions will typically grant full read/write/execute (rwx) access to you (the owner), and read/execute (r-x) to your group and others. This is usually what you want for your personal project directories.

- When you use sudo mkdir:

The mkdir command is executed with root privileges. It’s as if the root user is creating the directory.

- Therefore, the directory will be owned by the root user and the root group.

- Example: sudo mkdir my_root_folder will result in my_root_folder being owned by root:root.

- The default permissions will grant root full access (rwx), and typically read/execute (r-x) to the root group and others. This means your regular ubuntu user will not have write access to that directory, leading to the “Permission denied” error when you try to create files inside it without sudo.

**In essence:** Always ask yourself: “Do I want *me* to own this, or do I want *root* to own this?” before using sudo for directory creation. For your personal project folders, the answer is almost always “me.”

Understanding these fundamental Linux permission concepts will save you a lot of headache in the future. Happy coding!
