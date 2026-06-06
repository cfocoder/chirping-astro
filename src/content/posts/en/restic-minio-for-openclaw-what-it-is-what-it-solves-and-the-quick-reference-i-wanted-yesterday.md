---
title: 'Restic + MinIO for OpenClaw: What It Is, What It Solves, and the Quick Reference I Wanted Yesterday'
description: 'Yesterday I spent part of the day optimizing my OpenClaw setup and cleaning up the way I protect its operational state.'
pubDate: 2026-03-16
heroImage: '/images/2026/03/restic_minio.png'
heroImageAlt: 'restic minio'
categories: ['Linux']
tags: []
toc: true
---

## A bit of personal context

Yesterday I spent part of the day optimizing my OpenClaw setup and cleaning up the way I protect its operational state.

At one point, I realized something important: the local workspace was no longer just “scratch space.” It already contained memory, credentials, agent configuration, scripts, cron definitions, and utility code that I would absolutely want back if I had to rebuild the machine.

That changed the question from:

“Do I need a backup?”

to:

“What is the simplest backup system that I can trust, automate, and restore quickly?”

The answer I chose was `restic`, using `MinIO` as the storage backend.

This post is both an explanation of what `restic` is and a practical reference based on what I implemented yesterday for OpenClaw. If six months from now I need to rebuild the same setup, this is the document I want waiting for me.

## What is Restic?

`restic` is a modern backup tool designed to create encrypted, deduplicated, snapshot-based backups.

That sentence sounds compact, but each part matters:

- Encrypted means your backup data is protected before it leaves your machine.

- Deduplicated means unchanged data is not uploaded again and again.

- Snapshot-based means every backup becomes a point-in-time view of your files.

In practice, `restic` gives you something very useful:

You can run backups repeatedly without treating them like giant full copies every time, and you can restore either a full snapshot or a single file when needed.

That is exactly the kind of behavior I wanted for OpenClaw.

## Why I used Restic instead of a plain folder copy

A plain copy with `cp`, `rsync`, or a tarball can work for simple situations, but it becomes clumsy once your system starts evolving.

What I needed was:

- A repeatable backup command

- Versioned snapshots

- A clean restore path

- Storage outside the main machine

- Minimal operational friction

`restic` checks all of those boxes.

It also has a very practical mental model:

- You define a repository

- You point backups to that repository

- Every run creates a snapshot

- You keep only the snapshots you want

- You restore either everything or only what matters

That model is much simpler than many traditional enterprise backup products, and at the same time more robust than ad hoc shell scripts.

## Why pair Restic with MinIO?

`MinIO` is an S3-compatible object storage server. In plain English, it behaves like Amazon S3, but you can self-host it.

That combination is powerful because `restic` already knows how to talk to S3-compatible backends.

So if you already have `MinIO`, you get:

- A backup destination outside your main application directories

- A clean repository model

- Easy automation through environment variables

- The flexibility to move later to real S3 if needed

In my case, this was ideal because I wanted OpenClaw backups to live as snapshots in object storage, not as loose folders mixed into the host filesystem.

## What I decided to back up in OpenClaw

This was the most important design decision.

I did **not** want to back up everything blindly. That creates noisy, bloated snapshots and makes restores less useful.

Instead, I used the criterion:

- back up restorable state

- exclude runtime noise

For OpenClaw, that meant including:

- ~/.openclaw/openclaw.json

- ~/.openclaw/.env

- ~/.openclaw/credentials/

- ~/.openclaw/identity/

- ~/.openclaw/agents/\*/agent/

- ~/.openclaw/scripts/

- ~/.openclaw/cron/jobs.json

- ~/.openclaw/workspace/

- ~/.mcporter/ state that mattered operationally

That `workspace` backup scope is important because it includes the parts I would actually miss in a rebuild, including:

- ~/.openclaw/workspace/memory/

- ~/.openclaw/workspace/MEMORY.md

And excluding things like:

- logs

- browser state

- quarantine folders

- backup residue

- generated charts and reports

- cache directories

- virtual environments

- agent session history

That produced a backup strategy that I would describe as:

- clean, but fast to restore

Not a byte-for-byte resurrection of every transient artifact, but a practical restore of the machine’s useful memory and state.

## The core idea: snapshot the state, not the noise

This distinction is worth making explicit.

When people start backing up developer systems, they often copy too much:

- temporary files

- build outputs

- caches

- generated media

- old backup files

All of that inflates snapshots without making recovery better.

The better question is:

“If this machine died tonight, what files would actually matter tomorrow morning?”

That is the right lens for `restic`.

In my OpenClaw case, the answer was configuration, credentials, agent definitions, workspace material, and a few operational support files.

## The setup I used

I stored the repository in MinIO through the S3 backend.

The environment file followed this pattern:

```text
RESTIC_REPOSITORY=s3:http://minio-host:9000/restic-openclaw
RESTIC_PASSWORD=your-strong-repository-password
AWS_ACCESS_KEY_ID=your-minio-access-key
AWS_SECRET_ACCESS_KEY=your-minio-secret-key
AWS_DEFAULT_REGION=us-east-1
AWS_S3_FORCE_PATH_STYLE=true
```

Then I kept the include list and exclude list in dedicated text files, and wrapped the backup logic in shell scripts so the process would stay consistent.

That matters more than it sounds. Once backup commands become manual and improvised, they drift.

One important clarification here:

`openclaw_restic_env` is not only for the first initialization.

It provides two different kinds of information:

- Restic repository settings: where the repository lives and what password protects it

- MinIO / S3 access settings: how restic authenticates to the object storage backend

So even after the repository has already been initialized, you still need these values for normal operations against the remote backend, including:

- restic backup

- restic snapshots

- restic ls

- restic find

- restic dump

- restic restore

- restic forget --prune

What changes after initialization is not the need for credentials. What changes is simply that you do **not** run `restic init` again on the same repository unless you are creating a brand new repository from scratch.

## One-time initialization

Initialization has two parts:

- Create the bucket in MinIO

- Initialize the restic repository inside that bucket

### Step 1: Create the bucket in MinIO

`restic` can create its internal repository structure, but it should not be treated as the tool that creates the MinIO bucket itself.

If your repository is:

```text
RESTIC_REPOSITORY=s3:http://minio-host:9000/restic-openclaw
```

then `restic-openclaw` is the bucket name, and that bucket should exist first.

You can create it either from the MinIO web console or with the MinIO Client (`mc`).

Example with `mc`:

```text
mc alias set local http://minio-host:9000 MINIO_ACCESS_KEY MINIO_SECRET_KEY
mc mb local/restic-openclaw
```

If you prefer to keep more than one repository inside the same bucket, you can also use a path prefix, for example:

```text
RESTIC_REPOSITORY=s3:http://minio-host:9000/backups/openclaw
```

In that case:

- backups is the bucket

- openclaw is the prefix inside the bucket

### Step 2: Initialize the Restic repository

Once the bucket exists and your environment variables are ready, initialize the repository once:

```text
source /path/to/openclaw_restic_env
restic init
```

What `restic init` does is create the internal repository structure inside the target bucket or bucket prefix.

In practice, this means it writes the metadata and key material that `restic` needs in order to store encrypted snapshots later.

You can think of it this way:

- MinIO provides the storage container

- restic init turns that location into a valid restic repository

After that, the repository is ready to receive snapshots.

After that, future backups only need the normal `restic backup` flow, but they still need the same repository and MinIO environment variables so `restic` can find and authenticate to that already-initialized repository.

### A practical mental model

This is the simplest way to remember it:

- mc mb creates the bucket

- restic init creates the repository inside the bucket

- restic backup creates snapshots inside the repository

Three layers, three different responsibilities.

Here is the visual model:

![](/images/2026/03/restic-repository-layout.png)

The key idea is that the environment file is still needed after initialization because `restic` must keep authenticating to MinIO and opening the same remote repository before it can read or write snapshots.

## The actual backup command

This is the base pattern I used:

```text
restic backup \
  --files-from /home/ubuntu/Documents/openclaw_mantenimiento/openclaw_restic_include.txt \
  --exclude-file /home/ubuntu/Documents/openclaw_mantenimiento/openclaw_restic_exclude.txt \
  --tag openclaw \
  --tag cfocoder3 \
  --tag stateful \
  --verbose
```

### Why this structure works well

- --files-from keeps the backup scope explicit

- --exclude-file avoids snapshot bloat

- --tag makes snapshots easier to identify and filter

- --verbose helps when you want to validate exactly what happened

I also wrapped this in a script so I could log execution and schedule it in cron without retyping the command each time.

## What happened in my first real backup

The first successful backup I ran for this setup completed on **March 15, 2026 at 20:32:52 -06:00**.

The relevant numbers were:

- 6977 new files

- 1223 new directories

- 220.423 MiB processed

- 198.166 MiB added logically

- 116.720 MiB stored after deduplication/compression effects

- snapshot id: 1977bf5b

This was a good sign for two reasons:

- The snapshot size was reasonable for the amount of operational state I wanted to preserve.

- The result confirmed that the include/exclude strategy was selective enough to avoid obvious garbage.

## Listing snapshots

Once you start taking backups, you need a fast way to inspect what exists:

```text
restic snapshots
```

If you are using tags:

```text
restic snapshots --tag openclaw
```

This is the command you will use most often before restore operations.

## Restoring a full snapshot

The restore pattern I used was:

```text
restic restore latest --target /tmp/openclaw-restore-test
```

Or for a specific snapshot:

```text
restic restore 1977bf5b --target /tmp/openclaw-restore-test
```

This is an important practice:

Do not restore blindly on top of your live directories unless you are absolutely sure that is what you want. Restore first into a temporary path, inspect the result, and then copy back only what should return to production.

That is also how I validated the system.

My test restore completed on **March 15, 2026 at 20:34:05 -06:00**, restoring `8208` files and directories (`220.423 MiB`) into `/tmp/openclaw-restore-test`.

That gave me confidence that this was not just a theoretical backup, but a working recovery path.

## How to restore specific files

This is the part many people need most urgently in real life.

Most of the time, you do not want to restore the whole snapshot. You want one file:

- a deleted config

- a broken .env

- one credential file

- one script you overwrote by mistake

There are several practical ways to do this with `restic`.

## Option 1: Restore only one file into a temporary directory

```text
restic restore latest \
  --target /tmp/openclaw-single-file-restore \
  --include /home/ubuntu/.openclaw/openclaw.json
```

After that, the file will appear under:

```text
/tmp/openclaw-single-file-restore/home/ubuntu/.openclaw/openclaw.json
```

Then you can inspect it and copy it back if appropriate.

This is usually the safest method.

## Option 2: Restore one directory only

For example, if you only want agent definitions:

```text
restic restore latest \
  --target /tmp/openclaw-agents-restore \
  --include /home/ubuntu/.openclaw/agents/main/agent
```

Or only the credentials folder:

```text
restic restore latest \
  --target /tmp/openclaw-credentials-restore \
  --include /home/ubuntu/.openclaw/credentials
```

## Option 3: Search for a file path first

If you are not sure where the file lives in the repository:

```text
restic find openclaw.json
```

Or:

```text
restic find jobs.json
```

This is useful when you remember the filename but not the full path.

## Option 4: Inspect snapshot contents before restoring

To list files inside a snapshot:

```text
restic ls latest
```

Or for a specific snapshot:

```text
restic ls 1977bf5b
```

If the output is too long, filter it:

```text
restic ls latest | grep openclaw.json
```

## Option 5: Dump one file directly

For text files, `restic dump` is extremely convenient:

```text
restic dump latest /home/ubuntu/.openclaw/openclaw.json > /tmp/openclaw.json.restored
```

You can do the same with `.env` files:

```text
restic dump latest /home/ubuntu/.openclaw/.env > /tmp/openclaw.env.restored
```

This method is excellent when you want to compare the restored version before replacing anything.

## My recommended restore workflow

When something breaks, I recommend this order:

- List snapshots

- Identify the candidate snapshot

- Inspect or search the path

- Restore into /tmp

- Compare restored vs current

- Copy back only the file or directory you actually want

In practice, that looks like this:

```text
source /home/ubuntu/Documents/openclaw_mantenimiento/openclaw_restic_env
restic snapshots --tag openclaw
restic ls latest | grep openclaw.json
restic restore latest --target /tmp/openclaw-restore --include /home/ubuntu/.openclaw/openclaw.json
diff -u /home/ubuntu/.openclaw/openclaw.json /tmp/openclaw-restore/home/ubuntu/.openclaw/openclaw.json
```

That workflow is much safer than restoring the entire tree directly onto the live machine.

## Retention: keeping backups under control

Backups are only useful if they remain sustainable.

If you never prune old snapshots, the repository grows forever.

The retention policy I prepared for this setup was:

- 7 daily snapshots

- 4 weekly snapshots

- 6 monthly snapshots

The corresponding command is:

```text
restic forget \
  --prune \
  --keep-daily 7 \
  --keep-weekly 4 \
  --keep-monthly 6 \
  --tag openclaw \
  --verbose
```

This is a good middle ground for a stateful personal system:

- enough short-term history for mistakes

- enough medium-term history for regressions

- not so much that the repository becomes undisciplined

## Cron automation

I also wanted the process to happen without human memory being part of the system.

The cron schedule I prepared was:

```text
# Daily backup at 01:15
15 1 * * * /home/ubuntu/Documents/openclaw_mantenimiento/openclaw_restic_backup.sh >> /home/ubuntu/Documents/openclaw_mantenimiento/logs/openclaw_restic_backup_cron.log 2>&1

# Weekly retention/prune on Sundays at 04:30
30 4 * * 0 /home/ubuntu/Documents/openclaw_mantenimiento/openclaw_restic_forget_prune.sh >> /home/ubuntu/Documents/openclaw_mantenimiento/logs/openclaw_restic_forget_prune_cron.log 2>&1
```

That is exactly the kind of automation I like:

- simple

- visible

- inspectable with logs

- easy to debug

## Quick Reference: the commands I actually want to keep handy

### Initialize repository

```text
source /home/ubuntu/Documents/openclaw_mantenimiento/openclaw_restic_env
restic init
```

### Run backup

```text
/home/ubuntu/Documents/openclaw_mantenimiento/openclaw_restic_backup.sh
```

### List snapshots

```text
/home/ubuntu/Documents/openclaw_mantenimiento/openclaw_restic_list_snapshots.sh
```

Or:

```text
restic snapshots --tag openclaw
```

### Apply retention

```text
/home/ubuntu/Documents/openclaw_mantenimiento/openclaw_restic_forget_prune.sh
```

### Restore latest snapshot into a temp path

```text
/home/ubuntu/Documents/openclaw_mantenimiento/openclaw_restic_restore.sh /tmp/openclaw-restore-test
```

### Restore a specific snapshot

```text
/home/ubuntu/Documents/openclaw_mantenimiento/openclaw_restic_restore.sh /tmp/openclaw-restore-test 1977bf5b
```

### Restore one specific file

```text
restic restore latest \
  --target /tmp/openclaw-single-file \
  --include /home/ubuntu/.openclaw/openclaw.json
```

### Dump one specific file without full restore

```text
restic dump latest /home/ubuntu/.openclaw/.env > /tmp/openclaw.env.restored
```

### Search for a filename across snapshots

```text
restic find openclaw.json
```

### Inspect files in a snapshot

```text
restic ls latest
```

## What I like most about Restic after this implementation

What I appreciated most yesterday is that `restic` feels serious without feeling heavy.

It gives me:

- encryption

- snapshot history

- deduplication

- selective restore

- simple automation

But it still fits cleanly into a shell-script workflow.

That matters to me. I do not want a backup system that requires a dashboard, a proprietary agent, and a week of remembering how it works every time I need to restore one file.

`restic` is much closer to the Unix ideal:

- one clear tool

- one clear repository

- commands that compose well

- outputs that are easy to reason about

## Final reflection

The real lesson from yesterday was not just “install `restic`.”

It was this:

Backups become truly useful when you define the restore story first.

Once I clarified that OpenClaw needed a restoreable operational snapshot instead of a blind filesystem copy, the design became obvious:

- restic for snapshots

- MinIO for storage

- explicit include/exclude rules

- cron for repetition

- restore tests into /tmp

That is a system I trust much more than “I think I copied the important folders somewhere.”

If you are running a local AI workspace, a personal server, or any stateful developer environment, I think `restic` deserves serious consideration.

Not because it is flashy, but because it solves the real problem cleanly.

## References

- Restic documentation: https://restic.readthedocs.io/

- Restic GitHub repository: https://github.com/restic/restic

- MinIO documentation: https://min.io/docs/

_Installation validated from my OpenClaw maintenance work completed on March 15, 2026, including a real backup and a successful restore test to a temporary directory._
