---
title: 'Cloud-Powered Dictation: Fast STT for Old Linux Hardware with Copilot & Claude'
description: 'I work daily with GitHub Copilot and Claude Code, and like many developers, I often think faster than I type. Speech‑to‑Text (STT) is an obvious productivity multiplier — but there’s a catch:'
pubDate: 2025-12-23
heroImage: '/images/2025/12/cloud_powered_dictation.png'
heroImageAlt: 'cloud powered dictation'
categories: ['Cloud', 'Linux']
tags: []
toc: true
---

## Context

I work daily with **GitHub Copilot** and **Claude Code**, and like many developers, I often think faster than I type. Speech‑to‑Text (STT) is an obvious productivity multiplier — but there’s a catch:

Unlike traditional local STT solutions that struggle on weak hardware, this approach leverages cloud processing for near-instant results.

- My main Linux laptop is old (Dell Vostro 14‑3468)

- CPU is weak, no GPU acceleration

- I want speed and accuracy, not fancy UI

- I want it to work everywhere, not inside a specific app

This post documents a **minimal, fast, and reliable STT setup** that works perfectly on old hardware and integrates seamlessly into a modern coding workflow.

## Design Goals

Before touching any tools, I defined strict constraints:

- ⚡ Low latency (sub‑second for short dictations)

- 🧠 High accuracy (English & Spanish)

- 🖥️ Works on old CPUs

- ⌨️ Keyboard‑driven (no mouse, no UI)

- 🌍 Global (works in Copilot, Claude Code, editors, terminals)

- 🧩 Wayland‑compatible (no X11 hacks)

Offline STT was *nice to have*, but **not required**.

## Why Local Whisper GUIs Didn’t Work

I tested several local Whisper-based tools (GUI and CLI wrappers). They *worked*, but:

- ❌ Slow on CPU‑only machines

- ❌ Heavy UIs

- ❌ Poor integration with keyboard workflows

On old hardware, **local inference is the bottleneck**, not disk or RAM.

So instead of fighting physics, I changed the architecture.

## Architecture: Thin Client + API STT

The winning approach:

```text
Mic → WAV → OpenAI STT API → Clipboard → Paste Anywhere
```

Key idea:

Let the laptop do *only* audio capture. Let the cloud do inference.

This gives:

- Near‑instant transcription for short prompts

- Consistent accuracy

- Minimal local resource usage

## Core Tools

- Ubuntu Linux (Wayland)

- sox (rec, play) for audio capture & beeps

- OpenAI STT API (gpt-4o-mini-transcribe)

- wl-copy for clipboard integration

- Keyboard shortcuts (system‑level)

No window focus tricks. No UI automation. No hacks.

## The Dictation Script

This Python script does exactly one thing:

- Record audio until I stop it

- Transcribe it

- Put the text in the clipboard

- Signal readiness with a sound

```sql
import subprocess
import tempfile
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()
client = OpenAI()

def beep(freq, dur=0.12):
    subprocess.run(
        ["play", "-nq", "synth", str(dur), "sine", str(freq)],
        check=False,
    )

with tempfile.NamedTemporaryFile(suffix=".wav") as f:
    beep(1200)  # start recording

    try:
        subprocess.run(
            ["rec", "-q", f.name, "rate", "16000", "channels", "1"],
            check=True,
        )
    except KeyboardInterrupt:
        pass

    beep(600)  # stop recording

    with open(f.name, "rb") as audio:
        r = client.audio.transcriptions.create(
            model="gpt-4o-mini-transcribe",
            file=audio,
        )
        text = r.text.strip()

subprocess.run(
    ["wl-copy"],
    input=text,
    text=True,
    check=True,
)

beep(1500)  # clipboard ready
```

## Push‑to‑Talk With Two Shortcuts

To make this frictionless, I use **two global keyboard shortcuts**:

### ▶ Start Dictation

```bash
#!/usr/bin/env bash
source ~/tools/stt-dictation/.venv/bin/activate
python ~/tools/stt-dictation/dictate.py
```

Shortcut example:

- Super + D

### ⏹ Stop Dictation

```bash
#!/usr/bin/env bash
pkill -INT rec
```

Shortcut example:

- Super + S

This cleanly stops recording without killing Python, allowing transcription to finish.

## Audio Feedback (Why It Matters)

I intentionally avoided notifications or UI.

Instead, **sound cues** communicate state instantly:

- 🔊 High beep → recording started

- 🔊 Low beep → recording stopped

- 🔔 Single high beep → text ready to paste

This avoids a classic failure mode:

Pasting *before* transcription finishes.

With the final beep, I know **exactly** when `Ctrl+V` is safe.

Sound cues work particularly well for coding workflows because they don’t require visual attention or interrupt your focus on the screen.

## Performance & Cost

For short prompts (

- ⏱️ End‑to‑end latency: ~1 second

- 💲 Cost per dictation: ~\$0.0005 (at \$0.006 per minute for gpt-4o-mini-transcribe, a 5-second dictation costs ~\$0.0005)

Even with heavy daily usage, monthly cost is negligible.

At this scale, **latency matters far more than cost**.

## Why This Works Well for Copilot & Claude Code

- Global clipboard → works everywhere

- No dependency on editor plugins

- Perfect for:

Long prompts

- Refactoring instructions

- Natural language problem descriptions

It feels like **talking to the IDE**, not typing into it.

## Lessons Learned

- Old hardware is fine if you keep it thin

- Cloud inference beats local CPU every time

- Keyboard‑first workflows matter

- Audio feedback > visual feedback

- Simple pipelines beat complex tools

## Final Thoughts

This setup turned an aging laptop into a **high‑quality dictation workstation** for modern AI‑assisted development.

No heavyweight apps. No vendor lock‑in. No UI friction.

Just:

Think → Speak → Paste → Code

### Key Takeaways:

- Cloud processing beats local CPU for speed on old hardware

- Keyboard-driven workflows integrate seamlessly with coding

- Audio feedback provides instant state awareness

- Minimalist design ensures reliability and low maintenance

If you’re working on Linux with limited hardware and heavy AI usage, this approach is worth copying.
