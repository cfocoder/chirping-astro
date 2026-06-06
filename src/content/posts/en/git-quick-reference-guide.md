---
title: "Git Quick Reference Guide"
description: "This is a quick reference guide about Git so I can have it at hand. I took the data from the official documentation located at: https://git-scm.com/docs"
pubDate: 2024-09-05
categories: ["Data Science"]
tags: []
toc: true
---

This is a quick reference guide about Git so I can have it at hand. I took the data from the official documentation located at: [https://git-scm.com/docs](https://git-scm.com/docs)

| Command | Description | Common Variants | Example |
|---|---|---|---|
| git init | Initializes a new Git repository in the current directory. |  | git init |
| git clone | Copies a repository from a remote location to your local machine. | git clone  --branch | git clone https://github.com/user/repo.git |
| git status | Shows the current state of the working directory and the staging area. |  | git status |
| git add | Adds changes from the working directory to the staging area. | git add . (adds all changes) | git add filename.txt |
| git restore –staged . | The recommended modern way to undo git add is using git restore |  | git restore --staged . |
| git remote -v | This will show you the list of remotes configured for your repository. Typically, the default remote is called ‘origin’. |  | git remote -v |
| git remote add | Adds a new remote repository URL. | git remote add | git remote add origin https://github.com/user/repo.git |
| git remote remove | Removes remote | git remote remove | git remote remove main |
| git commit | Saves changes from the staging area to the repository with a descriptive message. | git commit -am "Message" (adds and commits) | git commit -m "Initial commit" |
| git push | Uploads local repository changes to a remote repository. It can also delete a remote branchCommand Breakdowngit push: The basic command to upload local repository content to a remote repositoryorigin: This is the default name for the remote repository you cloned from or added as a remote master:main: This syntax specifies pushing from your local master branch to the remote main branch | git push origin ————————git push --delete | 1) git push origin main2) git push origin master:main3) git push origin --delete feature-branch |
| git pull | Fetches and integrates changes from a remote repository into the local branch. | git pull --rebase (rebases instead of merging) | 1) git pull origin main2) git pull origin main:master |
| git fetch | Downloads updates from a remote repository but does not merge them. |  | git fetch origin |
| git merge | Combines changes from different branches into the current branch. |  | git merge feature-branch |
| git branch | Lists, creates, or deletes branches in the repository.It will show an asterisk (*) next to the current branch. | git branch -d branch-name (delete branch)————————-git branch -a (list all branches including remotes) | git branch new-feature |
| git checkout | Switches between branches or restores files. | git checkout -b new-branch (create and switch) | git checkout main |
| git log | Displays a history of commits in the repository. | git log --graph (show commit graph) | git log --oneline |
| git diff | Shows the differences between files in the working directory and the repository. | git diff --staged (show staged changes) | git diff HEAD |
| git reset | Resets the state of the working directory to a previous commit. | git reset HEAD  (unstage changes) | git reset --hard HEAD~1(It effectively “undoes” the last commit and all changes since then)———————-git reset --soft HEAD~1(moves the HEAD and branch pointer back one commit, but keeps the changes in the staging area) |
| git restore | Allows us to abandon all changes since the last commit in a specific file | git restore . | git restore filename.txt |
| git rebase | Reapplies commits on top of another base tip, used to clean up commit history. | git rebase -i HEAD~3 (interactive rebase) | git rebase main |
| git rm | Removes files from the working directory and the index (staging area). | git rm --cached filename.txt (unstage file) | git rm filename.txt |
