---
title: 'Six Practical Ways to Install Apps on Ubuntu (Beginner-Friendly Guide)'
description: 'Ubuntu offers several ways to install applications. Understanding each method helps you pick the right tool, avoid duplicates, and maintain a clean system. This guide covers six installation methods, includes Windows, iOS App Store, and Android Play Store analogies, plus...'
pubDate: 2025-11-16
heroImage: '/images/2025/11/ubuntu_apps3.png'
heroImageAlt: 'ubuntu apps3'
categories: ['Linux']
tags: ['Ubuntu', 'Linux']
toc: true
---

Ubuntu offers several ways to install applications. Understanding each method helps you pick the right tool, avoid duplicates, and maintain a clean system. This guide covers six installation methods, includes Windows, iOS App Store, and Android Play Store analogies, plus terminal examples where relevant.

## 1. Ubuntu App Center (Graphical Store)

The App Center is simply the storefront, not a packaging format.

### When to use it

- You want the simplest point-and-click experience

- You don’t care whether apps install as Snap, DEB, or Flatpak

- You’re new to Linux and prefer a familiar app store interface

### Pros

- Easy to use

- Integrated updates

- Good for beginners

- Ubuntu 24.04+ includes Flatpak support

### Cons

- Often installs Snap versions without warning

- Not always the latest builds

### Windows Analogy

Ubuntu App Center ≈ Microsoft Store

### Mobile Analogy

≈ App Store (iOS) or Play Store (Android) — a graphical front-end listing apps, regardless of how they’re packaged.

## 2. APT (Ubuntu’s Package Manager)

APT is Ubuntu’s primary command-line package manager. It installs DEB packages from official Ubuntu repositories and handles all dependencies automatically.

### When to use it

- You’re following a tutorial that uses apt commands

- You want system-integrated software with automatic dependency management

- You need command-line tools or development packages

- You want the most stable, tested versions

### Pros

- Automatic dependency resolution

- Pulls from trusted Ubuntu repositories

- Fast and lightweight

- Easy updates with sudo apt update && sudo apt upgrade

- Most reliable method for system utilities

### Cons

- Requires terminal/command line

- Sometimes has older versions than Snap or Flatpak

- Repositories might not include niche applications

### Windows Analogy

APT ≈ Windows Package Manager (winget) — command-line installer from official repositories

### Mobile Analogy

Installing from the official App Store/Play Store via command line (if that were possible)

### Terminal Examples

**Installing:**

```bash
# Update package lists first
sudo apt update

# Install a package
sudo apt install

# Search for packages
apt search
```

**Upgrading:**

```bash
# Update package lists
sudo apt update

# Upgrade a specific package
sudo apt install --only-upgrade

# Upgrade all installed packages
sudo apt upgrade

# Full system upgrade (handles dependency changes)
sudo apt full-upgrade
```

**Uninstalling:**

```bash
# Remove package but keep configuration files
sudo apt remove

# Remove package and configuration files
sudo apt purge

# Remove unused dependencies
sudo apt autoremove
```

## 3. DEB Packages (Manual Installation)

DEB is the classic installer format used by Debian- and Ubuntu-based systems. You download a `.deb` file directly from a developer’s website and install it manually.

### When to use it

- The developer provides an official .deb download on their website

- The software isn’t available in Ubuntu repositories

- You want native performance

- You prefer non-containerized apps

### Pros

- Fast and lightweight

- Uses system libraries

- Direct from the developer

### Cons

- Updates require manual downloads (unless the DEB adds a repository)

- Can break if dependencies aren’t available

- Security risk if downloading from untrusted sources

### Windows Analogy

DEB ≈ EXE installers — system-integrated, not containerized

### Mobile Analogy

Closest equivalent: APK sideloading on Android (installing a standalone app package directly)

### Where .deb files are stored

Usually in: `~/Downloads`

### Should you delete the .deb afterwards?

Yes. It’s only the installer.

### Important Security Note

Only download `.deb` files from official developer websites or trusted sources. Verify checksums when provided.

### Terminal Examples

**Installing:**

```bash
sudo dpkg -i file.deb
```

If you encounter dependency errors:

```bash
sudo apt --fix-broken install
```

**Installing via GUI:**

Double-click the `.deb` file in your file manager, and it will open in the App Center or Software Install tool.

**Upgrading:**

Manual DEB packages don’t auto-update. You need to:

- Download the new .deb file from the developer’s website

- Install it the same way (it will upgrade the existing version)

Some DEB packages add repositories during installation, enabling auto-updates via APT.

**Uninstalling:**

```bash
# Find the exact package name
dpkg -l | grep

# Remove the package
sudo apt remove

# Or remove with configuration files
sudo apt purge
```

You can also uninstall via the App Center GUI.

## 4. Snap Packages (Canonical’s Format)

Snap is a packaging and sandboxing format used heavily by Ubuntu.

### When to use it

- The app is officially distributed as Snap

- You want auto-updates

- You need an isolated/sandboxed application

### Pros

- Safe (sandboxed)

- Auto-updates

- Easy rollback to previous versions

- Cross-distro compatibility

### Cons

- Often slower to launch

- Larger disk footprint

- Some file system access limitations due to sandboxing

### Windows Analogy

Snap ≈ MSIX (self-contained, auto-updating, sandboxed)

### Mobile Analogy

Similar to how iOS/Android install apps with bundled dependencies, ensuring consistent behavior across devices.

### Terminal Examples

**Installing:**

```text
sudo snap install
```

**Upgrading:**

```text
# Snaps auto-update by default, but you can manually update
sudo snap refresh

# Update all snaps
sudo snap refresh

# Check for available updates
snap refresh --list
```

**Uninstalling:**

```text
sudo snap remove

# Remove a snap and its saved data
sudo snap remove --purge
```

**Listing installed:**

```text
snap list
```

## 5. Flatpak (with Flathub)

Flatpak is a cross-distro packaging system that competes with Snap.

### When to use it

- You want the newest versions

- You want apps isolated from system dependencies

- You prefer Flathub’s large catalog

- The app isn’t available via APT or Snap

### Pros

- Updated frequently

- Huge catalog on Flathub

- Works across almost all Linux distros

- Good sandboxing

### Cons

- May require adding Flathub manually (on older Ubuntu versions)

- Larger disk usage than DEB

- Can have similar startup delays as Snap

### Windows Analogy

Flatpak ≈ MSIX packages distributed outside the Microsoft Store

### Mobile Analogy

Equivalent to enabling a trusted external app repository, similar to:

- Adding TestFlight sources (iOS, conceptually)

- Adding external stores like F-Droid (Android)

### Terminal Examples

**One-time setup (if Flathub not already configured):**

```text
sudo flatpak remote-add --if-not-exists flathub https://flathub.org/repo/flathub.flatpakrepo
```

**Installing:**

```text
# Install an app
flatpak install flathub md.obsidian.Obsidian

# Search for apps
flatpak search
```

**Upgrading:**

```text
# Update a specific app
flatpak update md.obsidian.Obsidian

# Update all Flatpak apps
flatpak update

# Check for available updates
flatpak remote-ls --updates
```

**Uninstalling:**

```text
# Remove an app
flatpak uninstall md.obsidian.Obsidian

# Remove unused runtimes and dependencies
flatpak uninstall --unused
```

**Running and listing:**

```text
# Run an app
flatpak run md.obsidian.Obsidian

# List installed apps
flatpak list
```

**Note:** Ubuntu 24.04+ includes Flatpak support in the App Center, so you can install, update, and remove Flatpak apps graphically without terminal commands.

## 6. AppImage (Portable Executables)

AppImage is a single-file portable app that requires no installation.

### When to use it

- You want a fully portable app

- You don’t want changes to your system

- You want to try beta versions safely

- You need multiple versions of the same app

### Pros

- No installation required

- No dependencies

- Works across most Linux distros

- Fully portable (can run from USB drive)

### Cons

- No automatic updates

- Not added to the app menu automatically

- No centralized management

### Windows Analogy

AppImage ≈ portable ZIP folder containing a portable EXE

### Mobile Analogy

There is no iOS equivalent (iOS doesn’t allow portable apps).

Closest Android comparison: running a standalone APK extracted from a ZIP, but even that isn’t truly portable.

### Where AppImages are stored

Usually downloaded to: `~/Downloads`

Users often move them to custom folders like:

- ~/Applications

- ~/AppImages

(you create these folders manually)

### Should you delete the AppImage?

No. The file _is_ the app.

### Integrating AppImages into your app menu

Consider using **AppImageLauncher**, which automatically integrates AppImages into your system menu.

**Note:** The PPA is deprecated. Instead, download the `.deb` package directly:

- Visit the AppImageLauncher releases page

- Download the appropriate .deb file for your system (usually amd64 for most computers)

- Install it:

```bash
cd ~/Downloads
sudo dpkg -i appimagelauncher_*.deb
```

If you encounter dependency errors, run:

```bash
sudo apt install -f
```

**How AppImageLauncher works:**

AppImageLauncher is not an app you open directly – it’s a background helper that automatically activates when you interact with AppImage files.

When you download an AppImage and double-click it (or try to run it), AppImageLauncher will intercept it and show a dialog asking:

- “Do you want to integrate this AppImage into your system?”

- Options to integrate it (moves it to ~/Applications and adds it to your app menu) or just run it once

**To verify it’s installed:**

```text
which AppImageLauncher
# Should show: /usr/bin/AppImageLauncher
```

**To see integrated AppImages:**

```bash
ls ~/Applications
```

Note: The `~/Applications` folder is created automatically the first time you integrate an AppImage. If you haven’t integrated any AppImages yet, this folder won’t exist.

**Alternative: AppImageLauncher Lite**

If you prefer not to install system-wide, try **AppImageLauncher Lite**, which is an AppImage itself and doesn’t require root access:

- Download appimagelauncher-lite\*.AppImage from the releases page

- Make it executable: chmod +x appimagelauncher-lite\*.AppImage

- Run: ./appimagelauncher-lite\*.AppImage install

### Important: Installing FUSE (Required for AppImages)

AppImages require FUSE (Filesystem in Userspace) to run. On newer Ubuntu versions, you may need to install it manually:

```bash
sudo apt install libfuse2
```

**Common error without FUSE:**

```text
dlopen(): error loading libfuse.so.2
AppImages require FUSE to run.
```

If you see this error, install `libfuse2` as shown above.

### Terminal Examples

**Installing/Running:**

Make it executable (first time only):

```bash
chmod +x MyApp.AppImage
```

Run it:

```text
./MyApp.AppImage
```

**If you get a FUSE error:**

```bash
sudo apt install libfuse2
```

**Upgrading:**

AppImages don’t auto-update. To upgrade:

- Download the new version from the developer’s website

- Delete or rename the old AppImage

- Make the new one executable and run it

Some AppImages have built-in update checkers that will notify you.

**Uninstalling:**

Simply delete the AppImage file:

```bash
rm ~/Applications/MyApp.AppImage
```

If you used AppImageLauncher, right-click the app in your menu and select “Remove”.

## Summary Table

| Method       | Ubuntu Concept           | Windows Analogy    | iOS/Android Analogy      | Best For                |
| ------------ | ------------------------ | ------------------ | ------------------------ | ----------------------- |
| App Center   | Storefront               | Microsoft Store    | App Store / Play Store   | Beginners, GUI users    |
| APT          | System package manager   | winget             | Official store CLI       | System tools, CLI users |
| DEB (manual) | Native installer         | EXE installer      | APK sideload             | Developer downloads     |
| Snap         | Modern sandboxed apps    | MSIX               | Standard mobile app      | Auto-updating apps      |
| Flatpak      | Universal sandboxed apps | External MSIX      | F-Droid / external repos | Latest versions         |
| AppImage     | Portable executable      | Portable ZIP + EXE | No real equivalent       | Portable apps, testing  |

## Practical Recommendations

**For complete beginners:**

- Start with App Center for most apps

- Learn APT for following tutorials and installing development tools

**For daily desktop apps:**

- Flatpak (Flathub) for the latest versions

- APT for system utilities and command-line tools

**For official developer downloads:**

- DEB packages from trusted sources

**For portable/testing apps:**

- AppImage when you need something temporary or portable

**For Snap:**

- Only use if no alternative exists, or if the app’s official distribution is Snap-only

## Quick Decision Guide

**“I want to install Firefox/LibreOffice/GIMP”**
→ Use **App Center** or **APT**

**“I’m following a tutorial that says `sudo apt install`“**
→ Use **APT** in the terminal

**“I need the absolute latest version of OBS Studio”**
→ Use **Flatpak** from Flathub

**“The developer’s website has a .deb download”**
→ Download the **DEB** and install it

**“I want to test beta software without affecting my system”**
→ Use **AppImage**

**“I need multiple versions of the same app”**
→ Use **AppImage** or **Flatpak**

## Avoiding Duplicates

You can have the same app installed multiple ways simultaneously (e.g., Firefox as both a Snap and DEB). To avoid confusion:

**Check what’s installed:**

```bash
# List APT packages
dpkg -l | grep

# List Snaps
snap list

# List Flatpaks
flatpak list

# Check for AppImages
ls ~/Applications ~/AppImages
```

**Remove duplicates** by uninstalling the versions you don’t want using the appropriate method.

## Final Thoughts

Ubuntu’s flexibility in installation methods can seem overwhelming at first, but each serves a specific purpose. Start with the App Center and APT for everyday needs, then explore Flatpak and AppImages as you become more comfortable. Understanding these options will help you maintain a cleaner, more organized system.

Happy installing!
