---
title: "Avoiding the Pitfalls: A Smoother Guide to Restoring OCI Instances"
description: "Restoring a virtual machine instance from a custom image or backup in Oracle Cloud Infrastructure (OCI) should be straightforward. You click a few buttons, and presto, your server is back, right? Well, as many of us discover, the reality can involve frustrating SSH..."
pubDate: 2025-03-29
categories: ["Linux"]
tags: []
toc: true
---

Restoring a virtual machine instance from a custom image or backup in Oracle Cloud Infrastructure (OCI) *should* be straightforward. You click a few buttons, and presto, your server is back, right? Well, as many of us discover, the reality can involve frustrating SSH timeouts, cryptic known_hosts errors, and even the dreaded “Emergency Mode.”

I recently went through this exact process while trying to restore an Ubuntu VM configured with Docker, WordPress, Nginx, SSL, and an attached block volume. The path was bumpy, but the lessons learned can pave the way for a much smoother experience next time. This guide details the common pitfalls and the correct steps to restore your OCI instance reliably.

**The Goal:** Restore an OCI instance from a custom image (or boot volume backup) while ensuring SSH access works immediately and attached block volumes mount correctly without sending the system into emergency mode.

**Prerequisites:**

- A Custom Image or Boot Volume Backup of your instance in OCI.

- Access to the OCI Console.

- The SSH Private Key corresponding to the public key embedded in your image/backup.

**The Restoration Process: Step-by-Step (Avoiding the Traps)**

We’ll focus on creating a **New Instance** from your backup, as this is generally cleaner than trying an in-place restore.

## Table of Contents

- Step 1: Create the New Instance

- Step 2: Handle the IP Address (Pitfall #1)

- Step 3: Verify Network Security (Pitfall #2)

- Step 4: Attach Block Volumes (The Right Way)

- Step 5: First SSH Connection Attempt (Pitfall #3)

- Step 6: Handle Block Volume Inside the OS (Pitfall #4 & #5)

- Step 7: Post-Restoration Checks

- Step 8: Clean Up

## Step 1: Create the New Instance

- Locate Backup: Find your Custom Image (Compute -> Custom Images) or Boot Volume Backup (Storage -> Boot Volume Backups).

- Initiate Creation:

From Custom Image: Click image name -> Create Instance.

- From Boot Volume Backup: Click backup -> Create Boot Volume -> Wait -> Go to Compute -> Instances -> Create Instance -> Change Image -> Select the restored Boot Volume.

- Configure Key Instance Details:

Name: Give it a clear name (e.g., my-server-restored).

- Compartment: Select the correct one.

- Shape: Crucially, select the same shape (e.g., VM.Standard.A1.Flex for ARM) as the original instance.

- Networking: Select the correct VCN and Subnet (usually your public subnet). Ensure Assign a public IPv4 address is checked UNLESS you plan to use a Reserved IP immediately (see Step 2).

- SSH Keys: This is vital! Select Paste public keys and paste the exact contents of the SSH public key file (e.g., id_rsa.pub, mxcfo.key.pub) that matches the private key you’ll use to connect.

- Create: Click Create and wait for the instance state to become “Running”.

## Step 2: Handle the IP Address (Pitfall #1)

- New Instance = New IP (Usually): Unless you specifically assign a Reserved Public IP you already own during creation or immediately after, the new instance will get a NEW ephemeral Public IP Address. Do NOT try to use the old instance’s IP.

- Find the New IP: In the OCI Console, go to the details page for your newly created instance. Note the Public IP Address listed under “Instance access”.

- Reserved IP Users: If you detached a Reserved IP from the old instance and attached it to the new one, then yes, the IP will be the same. Verify this on the instance details page.

## Step 3: Verify Network Security (Pitfall #2)

- Before Connecting: Ensure your network rules allow SSH traffic (TCP Port 22). Check both potential layers:

Subnet Security List: Navigate to Networking -> VCNs -> Your VCN -> Your Subnet -> Security Lists. Check the Ingress Rules for a rule allowing TCP traffic on destination port 22 from source 0.0.0.0/0 (any IP) or your specific home/office IP (/32).

- Network Security Group (NSG): If your instance uses NSGs (check the “Attached VNICs” section on the instance details page), examine the associated NSG’s Ingress Rules for the same port 22 allowance.

- Add Rule if Missing: If the rule isn’t there, add it.

## Step 4: Attach Block Volumes (The Right Way)

- Stop Old Instance (Optional): Stop the original instance if it’s still running.

- Detach Volume: If your required block volume is still attached to the old instance, go to Storage -> Block Volumes -> Find Volume -> Actions (…) -> Detach. Wait for detachment.

- Attach Volume to New Instance: Click Actions (…) on the now detached volume -> Attach to Instance.

Select your new instance.

- CRITICAL – Attachment Type: Choose the same attachment type you used originally. Was it Paravirtualized or iSCSI? This determines how the OS sees the disk! Check the old instance or volume details if unsure.

- Select Access: Read/Write.

- Click Attach and wait for the state to show “Attached” in the OCI console.

## Step 5: First SSH Connection Attempt (Pitfall #3)

- Use Correct IP: Use the NEW Public IP (or your confirmed Reserved IP) from Step 2.

- Use Correct Key: ssh -i /path/to/your/private_key ubuntu@ (Replace ubuntu if your image uses a different default user).

- Expect KNOWN_HOSTS Warning: You will almost certainly see this:

```text
@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
@    WARNING: REMOTE HOST IDENTIFICATION HAS CHANGED!     @
@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
IT IS POSSIBLE THAT SOMEONE IS DOING SOMETHING NASTY!
...
Host key verification failed.
```

This is **NORMAL** because the new instance has new host keys. Your local machine remembers the old key for that IP.

4. **Fix known_hosts:** Run the command provided in the error message on your *local* machine. It looks like:

```bash
ssh-keygen -f '/home/your_user/.ssh/known_hosts' -R ''
```

5. **Retry SSH:** Run the ssh command again. You’ll be asked to confirm the new host key fingerprint. Type yes and press Enter. You should now be logged in!

## Step 6: Handle Block Volume Inside the OS (Pitfall #4 & #5)

This is where “Emergency Mode” often strikes if not handled correctly.

**Check Disk Visibility:** Once logged in via SSH, run:

```text
sudo lsblk
```

- Scenario A: Disk Visible (Paravirtualized Attachment / iSCSI Commands Already Run)

You should see your attached volume listed (e.g., /dev/sdb).

- Proceed to “Fixing fstab” below.

- Scenario B: Disk NOT Visible (Likely iSCSI Attachment)

This means the OS needs the iSCSI connection commands.

- Get Commands: Go back to the OCI Console -> Storage -> Block Volumes -> Your Volume -> Attached Instances -> Actions (…) -> iSCSI Commands & Information.

- Run Commands: Copy and paste the Connect commands one by one into your SSH session.

- Verify: Run sudo lsblk again. The disk (e.g., /dev/sdb) should now appear.

- Fixing fstab (Crucial for Preventing Emergency Mode):

Identify Device: Note the device name from lsblk (e.g., /dev/sdb1).

- Find UUID: Get the unique identifier: sudo blkid /dev/sdb1 (use correct device). Copy the UUID=”…” value.

- Edit fstab: sudo nano /etc/fstab

- Find the Line: Locate the line for /mnt/myvolume (or your mount point). It might be commented out (#) if you fixed emergency mode previously, or it might have the wrong device/UUID.

- Correct the Line:

Ensure it’s uncommented (no leading #).

- Use the correct UUID= you found with blkid.

- Ensure the mount point (/mnt/myvolume) and filesystem type (ext4) are correct.

- Add _netdev option: For BOTH iSCSI and Paravirtualized volumes on OCI, it’s safest to add _netdev to the mount options. This prevents the system from trying to mount it before networking is fully ready. Change defaults to defaults,_netdev.

- The final line should look like: UUID=”” /mnt/myvolume ext4 defaults,_netdev 0 2

- Save and Close: Ctrl+X, Y, Enter.

- Test fstab:

sudo mkdir -p /mnt/myvolume

- sudo umount /mnt/myvolume (ignore errors if not mounted)

- sudo mount -a (This attempts to mount everything in fstab. It should run without errors).

- df -h | grep /mnt/myvolume (Verify it’s mounted correctly).

## Step 7: Post-Restoration Checks

- Verify your core services are running (e.g., sudo systemctl status docker, sudo systemctl status nginx, sudo systemctl status ssh).

- Test your application (WordPress, etc.) by browsing to the IP address initially.

- Update DNS: Go to your DNS provider and update the A records for your domain(s) (cfocoder.com, www.cfocoder.com, etc.) to point to the NEW Public IP (or your Reserved IP). Wait for propagation.

- Test SSL: Once DNS propagates, check HTTPS access. You might need to run sudo certbot renew –force-renewal if the IP change caused validation issues, but often a simple reload or just waiting works.

## Step 8: Clean Up

- Once you are 100% certain the new instance is working perfectly, terminate the old instance in the OCI console to avoid extra charges.

**Conclusion:**

Restoring OCI instances doesn’t have to be a headache. By carefully managing the **IP address**, verifying **network security rules**, understanding **block volume attachment types** (especially iSCSI commands), fixing the **known_hosts** entry, and configuring **/etc/fstab** correctly (using UUIDs and _netdev), you can achieve a much smoother and faster recovery. Happy restoring!
