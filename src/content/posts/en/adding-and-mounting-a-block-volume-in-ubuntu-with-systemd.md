---
title: "Adding and Mounting a Block Volume in Ubuntu (with systemd)"
description: "This guide explains how to add a new block storage volume (like an additional hard drive or a cloud-provided block storage device) to an Ubuntu system, format it, and mount it permanently. We’ll cover the steps for modern Ubuntu systems that use systemd, including the..."
pubDate: 2025-03-21
categories: ["Linux"]
tags: []
toc: true
---

**Introduction:**

This guide explains how to add a new block storage volume (like an additional hard drive or a cloud-provided block storage device) to an Ubuntu system, format it, and mount it permanently. We’ll cover the steps for modern Ubuntu systems that use systemd, including the crucial systemctl command. This process is common when you need more storage space than your initial system setup provides.

**Prerequisites:**

- An Ubuntu system (this guide was tested on Ubuntu 24.04, but it should work on other recent versions).

- A block storage device that has been attached to your system (either physically or virtually). This guide does not cover the physical attachment process.

- sudo privileges (or root access).

- Basic familiarity with the Linux command line.

**WARNING:** This process involves formatting a disk, which *will erase all data* on the target device. Be *absolutely certain* you’ve identified the correct device before proceeding. Double-check everything! Backups are essential.

## Table of Contents

- 1. Identify the Block Device:

- 2. Create a Partition (Recommended):

- 3. Verify the New Partition:

- 4. Format the Partition:

- 5. Create a Mount Point:

- 6. Mount the Partition (Temporary):

- 7. Verify the Mount:

- 8. Make the Mount Permanent (Edit /etc/fstab):

- 9. Reload systemd and Remount:

- 10. Verify Again:

- 11. Set Permissions:

- 12. Test with a Reboot (Recommended):

- 13. Accessing the Volume

## 1. Identify the Block Device:

Use the lsblk command to list all block devices:`lsblk`

- 

```text
lsblk
```

Carefully identify the new volume. It will likely be named something like /dev/sdb, /dev/sdc, etc. *Do not* use the device where your operating system is installed (usually /dev/sda). The output of lsblk shows the size of each device, which is a crucial clue. If your new volume is 150GB, look for a device of that size.

## 2. Create a Partition (Recommended):

We’ll use parted to create a partition table and a single partition spanning the entire disk. This is generally best practice.

```text
sudo parted /dev/sdb  # Replace /dev/sdb with the *correct* device name!
```

Inside the parted interactive shell:

```text
mklabel
gpt
mkpart primary ext4 0% 100%
print
quit
```

- mklabel: Creates a new disklabel.

- gpt: Specifies the GPT (GUID Partition Table) type, the modern standard.

- mkpart primary ext4 0% 100%: Creates a single primary partition using the entire disk, formatted with the ext4 filesystem. ext4 is a good, general-purpose filesystem for Linux.

- print: Displays the partition table to verify.

- quit: Exits parted.

## 3. Verify the New Partition:

Run lsblk again:

```text
lsblk
```

You should now see a partition, likely named /dev/sdb1 (or similar, depending on the device name). This is the partition you’ll format and mount.

## 4. Format the Partition:

Create the ext4 filesystem on the new partition:

- 

```text
sudo mkfs.ext4 /dev/sdb1  # Replace /dev/sdb1 with the *correct* partition name!
```

## 5. Create a Mount Point:

Choose a directory where you want the volume’s contents to be accessible. A common location is /mnt. We’ll create a directory called /mnt/myvolume (you can choose a different name):

```bash
sudo mkdir /mnt/myvolume
```

## 6. Mount the Partition (Temporary):

Mount the partition to the directory you just created:

```text
sudo mount /dev/sdb1 /mnt/myvolume
```

## 7. Verify the Mount:

Check that the mount was successful:

```bash
df -h
ls /mnt/myvolume
```

df -h should show the new partition mounted at /mnt/myvolume. ls /mnt/myvolume should initially show an empty directory.

## 8. Make the Mount Permanent (Edit /etc/fstab):

To make the mount survive reboots, add an entry to /etc/fstab.

First, get the UUID of the partition:

```text
sudo blkid /dev/sdb1
```

Copy the UUID=”…” value (including the quotes).

Then, edit /etc/fstab (as root or with sudo):

```text
sudo nano /etc/fstab
```

Add a line like this to the *end* of the file, replacing the example UUID with the actual UUID you copied:

```text
UUID="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"  /mnt/myvolume  ext4  defaults  0  2
```

- UUID: The unique identifier of your partition.

- /mnt/myvolume: Your chosen mount point.

- ext4: The filesystem type.

- defaults: Standard mount options.

- 0 2: Options for filesystem dumping and checking (see man fstab for details).

Save the file and exit the editor.

## 9. Reload systemd and Remount:

This is the crucial step for systemd-based systems:

```bash
sudo systemctl daemon-reload
sudo umount /mnt/myvolume  # Unmount first, to ensure a clean reload
sudo mount -a
```

- systemctl daemon-reload: Tells systemd to re-read its configuration, including /etc/fstab.

- mount -a: Mounts all filesystems listed in /etc/fstab.

## 10. Verify Again:

```bash
df -h
systemctl list-units --type=mount
```

df -h should show the volume, and check that systemctl shows your mount point.

## 11. Set Permissions:

Change the ownership of the mount point so your regular user account can access it:

```bash
sudo chown your_username:your_username /mnt/myvolume #Replace with your user
```

Replace your_username with your actual username.

## 12. Test with a Reboot (Recommended):

Reboot your system. After rebooting, use df -h and ls /mnt/myvolume to verify that the volume is still mounted correctly.

## 13. Accessing the Volume

Once mounted, you can access the volume’s contents just like any other directory:

```bash
cd /mnt/myvolume
```

You can now create files and directories, copy data, etc., within /mnt/myvolume.

**Troubleshooting:**

- Incorrect device/partition name: Double-check the output of lsblk very carefully.

- Typos in /etc/fstab: Carefully review the line you added, especially the UUID.

- Systemd issues: Use journalctl -xe | grep mount to check for systemd-related errors.

- Filesystem errors: If you suspect problems with the filesystem, run sudo fsck /dev/sdb1 (while the volume is unmounted).

**Advanced Topics (Optional):**

- LVM (Logical Volume Manager): For more flexible storage management, consider using LVM. This is especially useful if you might need to resize volumes or add more disks later.

- Different Filesystems: You could use XFS or Btrfs instead of ext4, depending on your specific needs.

- Mount Options: Explore different mount options in /etc/fstab (e.g., noatime, discard) to optimize performance.

- Disk Encryption: For sensitive data use a program like LUKS for disk encryption.

**Conclusion:**

This guide provides a step-by-step process for adding and mounting a block volume in Ubuntu. By following these instructions carefully, you can easily expand your system’s storage capacity. Remember to always double-check device names and commands to avoid data loss. Good luck!
