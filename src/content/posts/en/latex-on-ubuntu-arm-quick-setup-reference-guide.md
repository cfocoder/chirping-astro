---
title: 'LaTeX on Ubuntu ARM: Quick Setup & Reference Guide'
description: 'A streamlined guide to setting up LaTeX on Ubuntu ARM servers and using it with VS Code'
pubDate: 2025-10-12
heroImage: '/images/2025/10/LatEx.png'
heroImageAlt: 'LatEx'
categories: ['Data Science']
tags: []
toc: true
---

_A streamlined guide to setting up LaTeX on Ubuntu ARM servers and using it with VS Code_

## What is LaTeX?

LaTeX (pronounced “LAH-tech” or “LAY-tech”) is a high-quality typesetting system designed for the production of technical and scientific documents. Unlike traditional word processors like Microsoft Word, LaTeX uses a markup language approach where you write plain text with formatting commands, and the system compiles it into beautifully formatted PDFs.

### Why Use LaTeX?

- Professional Typography: Produces publication-quality documents with superior typography

- Mathematical Expressions: Unmatched support for complex mathematical formulas and equations

- Consistent Formatting: Automatic handling of numbering, cross-references, and citations

- Version Control Friendly: Plain text files work perfectly with Git and other version control systems

- Academic Standard: Widely used in academia, research, and scientific publishing

- Separation of Content and Style: Focus on writing while LaTeX handles the formatting

### LaTeX vs. Overleaf

While Overleaf is a popular online LaTeX editor, setting up LaTeX locally with VS Code offers several advantages:

- Offline Access: Work without internet connection

- Better Performance: No upload/download delays

- Full Control: Complete customization of your environment

- Integration: Seamless integration with your existing development workflow

- Privacy: Keep sensitive documents on your local machine

- Cost: Free alternative to Overleaf’s premium plans

## Quick Installation

### Prerequisites

```text
# Verify requirements
df -h /usr/local          # Need 5GB+ free space
sudo -v                   # Confirm sudo access
code --version            # Verify VS Code installed
```

### Installation (10 minutes)

```bash
# 1. Update and install LaTeX
sudo apt update
sudo apt install texlive-full

# 2. Install fonts for emoji and symbols
sudo apt install fonts-noto-color-emoji fonts-noto fonts-dejavu fonts-liberation

# 3. Refresh font cache
fc-cache -fv

# 4. Verify installation
pdflatex --version
lualatex --version
fc-list | grep -i emoji
```

### Install VS Code Extension

```text
# In VS Code Quick Open (Ctrl+P):
ext install James-Yu.latex-workshop
```

## VS Code Configuration

Create `.vscode/settings.json` in your project root:

```json
{
  // === Build Configuration ===
  "latex-workshop.latex.autoBuild.run": "onSave",
  "latex-workshop.latex.outDir": "./build",
  "latex-workshop.latex.autoClean.run": "onBuilt",

  // === CRITICAL: Force custom recipes ===
  "latex-workshop.latex.recipe.default": "lastUsed",
  "latex-workshop.latex.recipes": [
    {
      "name": "latexmk (lualatex)",
      "tools": ["lualatexmk"]
    },
    {
      "name": "latexmk (pdflatex)",
      "tools": ["pdflatexmk"]
    },
    {
      "name": "pdflatex ➞ bibtex ➞ pdflatex × 2",
      "tools": ["pdflatex", "bibtex", "pdflatex", "pdflatex"]
    }
  ],
  "latex-workshop.latex.tools": [
    {
      "name": "lualatexmk",
      "command": "latexmk",
      "args": [
        "-synctex=1",
        "-interaction=nonstopmode",
        "-file-line-error",
        "-lualatex",
        "-output-directory=%OUTDIR%",
        "%DOC%"
      ]
    },
    {
      "name": "pdflatexmk",
      "command": "latexmk",
      "args": [
        "-synctex=1",
        "-interaction=nonstopmode",
        "-file-line-error",
        "-pdf",
        "-output-directory=%OUTDIR%",
        "%DOC%"
      ]
    },
    {
      "name": "pdflatex",
      "command": "pdflatex",
      "args": [
        "-synctex=1",
        "-interaction=nonstopmode",
        "-file-line-error",
        "-output-directory=%OUTDIR%",
        "%DOC%"
      ]
    },
    {
      "name": "bibtex",
      "command": "bibtex",
      "args": ["%DOCFILE%"]
    }
  ],

  // === CRITICAL FIX: Prevent files in root ===
  "latex-workshop.latex.build.forceRecipeUsage": true,

  // === PDF Viewer ===
  "latex-workshop.view.pdf.viewer": "tab",

  // === Formatting ===
  "latex-workshop.formatting.latex": "latexindent",
  "latex-workshop.linting.chktex.enabled": true,

  // === IntelliSense ===
  "latex-workshop.intellisense.package.enabled": true,
  "latex-workshop.intellisense.citation.backend": "bibtex"
}
```

**Critical Setting**: `"latex-workshop.latex.build.forceRecipeUsage": true` ensures auxiliary files go to `build/` directory.

## Recommended Project Structure

```text
my-latex-project/
├── .vscode/
│   └── settings.json          # VS Code configuration
├── .gitignore                 # Exclude build files
├── main.tex                   # Main document
├── references.bib             # Bibliography
├── sections/                  # Document sections
│   ├── introduction.tex
│   ├── methodology.tex
│   └── conclusion.tex
├── figures/                   # Images and figures
│   └── diagram.pdf
└── build/                     # Auto-generated files (ignored by git)
    ├── main.pdf
    ├── main.aux
    └── main.log
```

### .gitignore

```text
# Build directory
build/

# LaTeX auxiliary files (if any escape to root)
*.aux
*.log
*.out
*.toc
*.lof
*.lot
*.fls
*.fdb_latexmk
*.synctex.gz
*.bbl
*.blg
*.bcf
*.run.xml
*.nav
*.snm
*.vrb

# Editor files
.vscode/
*.swp
*~
```

### Basic Document Template

```text
% main.tex
\documentclass[12pt,a4paper]{article}

% Essential packages
\usepackage[utf8]{inputenc}
\usepackage[margin=1in]{geometry}
\usepackage{graphicx}
\usepackage{amsmath}
\usepackage{hyperref}

% Document information
\title{Your Document Title}
\author{Your Name}
\date{\today}

\begin{document}

\maketitle

\section{Introduction}

Your content here.

\end{document}
```

### Two-Column Layout Template

```text
% two_column.tex
\documentclass[12pt, twocolumn]{article}

% Essential packages
\usepackage[margin=1in]{geometry}
\usepackage{amsmath, amssymb, amsthm}
\usepackage{graphicx}
\usepackage{wrapfig}              % Wrap text around figures
\usepackage{parskip}              % Better paragraph spacing
\usepackage{xcolor}               % Colors
\usepackage{tikz}                 % Graphics and diagrams

\title{Two-Column Document}
\author{Your Name}
\date{\today}

\begin{document}

\maketitle

\section{Introduction}

This document uses a two-column layout, common in academic papers and journals. The text flows naturally between columns.

\subsection{Colored Text}

You can add \textcolor{blue}{colored text} or \textcolor{red}{highlight important} information easily.

\section{Figures in Two Columns}

% Figure spanning one column
\begin{figure}[htbp]
  \centering
  \includegraphics[width=0.9\linewidth]{image.pdf}
  \caption{Single column figure}
  \label{fig:single}
\end{figure}

% Figure spanning both columns
\begin{figure*}[htbp]
  \centering
  \includegraphics[width=0.8\textwidth]{wide-image.pdf}
  \caption{Full-width figure spanning both columns}
  \label{fig:wide}
\end{figure*}

\section{TikZ Example}

\begin{tikzpicture}
  \draw[thick,->] (0,0) -- (2,0) node[right] {$x$};
  \draw[thick,->] (0,0) -- (0,2) node[above] {$y$};
  \draw[blue,thick] (0,0) circle (1cm);
  \fill[red] (0,0) circle (2pt);
\end{tikzpicture}

\end{document}
```

## LaTeX Command Cheat Sheet

### Document Structure

```text
\documentclass{article}              % article, book, report, beamer
\usepackage{packagename}             % Include package
\title{Title} \author{Name} \date{\today}
\maketitle                           % Generate title

\section{Section}                    % Numbered section
\section*{Unnumbered Section}        % Unnumbered
\subsection{Subsection}
\subsubsection{Subsubsection}
```

### Text Formatting

```text
\textbf{Bold}  \textit{Italic}  \underline{Underline}
\texttt{Monospace}  \emph{Emphasis}

% Font sizes
\tiny \small \normalsize \large \Large \LARGE \huge \Huge
```

### Lists

```text
% Unordered
\begin{itemize}
  \item First
  \item Second
\end{itemize}

% Ordered
\begin{enumerate}
  \item First
  \item Second
\end{enumerate}

% Description
\begin{description}
  \item[Term] Definition
\end{description}
```

### Mathematics

```powershell
% Inline math
$E = mc^2$

% Display math
\[ E = mc^2 \]

% Numbered equation
\begin{equation}
  E = mc^2
\end{equation}

% Common symbols
\alpha \beta \gamma \sum \int \frac{a}{b} \sqrt{x}
x^2  x_i  \leq \geq \neq \approx \infty
```

### Figures

```text
\begin{figure}[htbp]
  \centering
  \includegraphics[width=0.8\textwidth]{figures/image.pdf}
  \caption{Figure caption}
  \label{fig:label}
\end{figure}

% Reference: See Figure~\ref{fig:label}
```

### Tables

```text
\begin{table}[htbp]
  \centering
  \begin{tabular}{|l|c|r|}
    \hline
    Left & Center & Right \\
    \hline
    Data & Data & Data \\
    \hline
  \end{tabular}
  \caption{Table caption}
  \label{tab:label}
\end{table}
```

### Code Listings

````python
% Inline code
Use \texttt{print("Hello")} for output.

% Basic code block
\begin{verbatim}
def hello():
    print("Hello, World!")
\end{verbatim}

% Advanced with listings package
\usepackage{listings}
\usepackage{xcolor}

% Configure style
\lstset{
  language=Python,
  basicstyle=\ttfamily\small,
  keywordstyle=\color{blue},
  commentstyle=\color{gray},
  stringstyle=\color{red},
  numbers=left,
  numberstyle=\tiny\color{gray},
  stepnumber=1,
  frame=single,
  breaklines=true,
  showstringspaces=false
}

% Use in document
\begin{lstlisting}
def fibonacci(n):
    """Calculate Fibonacci number"""
    if n

## Emoji Support

### Setup for Emoji

Use LuaLaTeX engine (specify in VS Code or with magic comment):

```text
% !TEX program = lualatex
\documentclass{article}
\usepackage{fontspec}
\newfontfamily\emojifont{Noto Color Emoji}[Renderer=HarfBuzz]
\newcommand{\emoji}[1]{{\emojifont #1}}

\begin{document}

Regular text with emoji: \emoji{😀 💖 🎉 ✅ 🚀}

Math and emoji: The result is correct \emoji{✅} and \$E=mc^2\$

\end{document}
````

### Multi-File Projects with Emoji

In `main.tex`:

```text
% !TEX program = lualatex
\documentclass{article}
\usepackage{fontspec}
\newfontfamily\emojifont{Noto Color Emoji}[Renderer=HarfBuzz]
\newcommand{\emoji}[1]{{\emojifont #1}}

\begin{document}
\input{sections/introduction}
\end{document}
```

In `sections/introduction.tex`:

```text
\section{Introduction}
Use emoji directly: \emoji{🌟}
```

### Common Emoji Categories

```text
% Status & Feedback
\emoji{✅ ❌ ⚠️ ℹ️ ✓}

% Math & Science
\emoji{🔬 🧪 📊 📈 💡}

% Actions
\emoji{🎯 🚀 ⚡ 🔥 💪}

% Academic
\emoji{📚 📖 ✏️ 🎓 📝}
```

## Essential Keyboard Shortcuts

| Action           | Shortcut          | Description             |
| ---------------- | ----------------- | ----------------------- |
| Build Document   | Ctrl+Alt+B        | Compile LaTeX file      |
| View PDF         | Ctrl+Alt+V        | Open PDF preview        |
| Build & View     | Ctrl+Alt+J        | Compile and show PDF    |
| Clean Files      | Ctrl+Alt+C        | Remove auxiliary files  |
| Kill Process     | Ctrl+Alt+K        | Stop compilation        |
| SyncTeX Forward  | Ctrl+Alt+J        | Jump from source to PDF |
| SyncTeX Backward | Ctrl+Click in PDF | Jump from PDF to source |

## Common Issues & Solutions

### 1. Auxiliary Files in Root Directory

**Problem**: Files appear in project root instead of `build/` folder.

**Solution**:

```text
// Add to .vscode/settings.json
"latex-workshop.latex.build.forceRecipeUsage": true
```

Then clean and rebuild:

```bash
rm *.aux *.log *.pdf *.synctex.gz 2>/dev/null
# Reload VS Code (Ctrl+Shift+P → "Reload Window")
```

### 2. Emojis Not Rendering

**Checklist**:

- ✅ Using LuaLaTeX? Add % !TEX program = lualatex at top

- ✅ Fonts installed? Run fc-list | grep -i emoji

- ✅ Proper setup? Include fontspec and HarfBuzz renderer

- ✅ Using \emoji{} command for all emojis?

**Quick fix**:

```bash
sudo apt install fonts-noto-color-emoji
fc-cache -fv
```

### 3. Build Fails with “Package not found”

**Solution**:

```bash
# Install missing package
sudo apt install texlive-

# Or install everything
sudo apt install texlive-full
```

### 4. PDF Not Updating

**Solutions**:

- Save file again (Ctrl+S)

- Manual build (Ctrl+Alt+B)

- Kill and rebuild (Ctrl+Alt+K, then Ctrl+Alt+B)

- Close PDF viewer and reopen

- Reload VS Code window

### 5. SyncTeX Not Working

**Fix**: Ensure `-synctex=1` is in build args (already in config above)

### 6. Bibliography Not Appearing

**Solution**: Build sequence matters

```text
# Run in order:
pdflatex main.tex    # First pass
bibtex main          # Process bibliography
pdflatex main.tex    # Second pass (add citations)
pdflatex main.tex    # Third pass (resolve references)
```

Or use recipe: “pdflatex ➞ bibtex ➞ pdflatex × 2”

### 7. Permission Denied Error

**Solution**:

```bash
# Check permissions
ls -la build/

# Fix if needed
chmod -R u+w build/
```

### 8. Font Cache Issues

**Solution**:

```text
fc-cache -fv
sudo fc-cache -fv  # If above doesn't work
```

### 9. Memory Issues (Large Documents)

**Solutions**:

- Use \include{} instead of \input{} for chapters

- Compile individual chapters during editing

- Increase LaTeX memory in texmf.cnf (advanced)

### 10. Unicode/Special Characters Not Working

**Solution**: Use XeLaTeX or LuaLaTeX instead of pdfLaTeX:

```text
% !TEX program = lualatex  % or xelatex
\usepackage{fontspec}
```

## Changing Fonts

### Using Sans Serif Fonts (Arial, Roboto, etc.)

With LuaLaTeX or XeLaTeX, you can use any system font:

```text
% !TEX program = lualatex
\documentclass{article}
\usepackage{fontspec}

% Set main font to sans serif
\setmainfont{Arial}                    % or Roboto, Helvetica, etc.
% Alternative: Use system fonts
% \setmainfont{Liberation Sans}        % Open-source Arial alternative
% \setmainfont{Roboto}                 % Modern sans serif

% Or just switch to Computer Modern Sans
\renewcommand{\familydefault}{\sfdefault}

\begin{document}
This text will be in Arial (or your chosen font).
\end{document}
```

### With pdfLaTeX (limited options)

```text
\documentclass{article}
\usepackage[utf8]{inputenc}
\renewcommand{\familydefault}{\sfdefault}  % Use sans serif
\usepackage{helvet}                         % Helvetica-like font

\begin{document}
Sans serif document with pdfLaTeX.
\end{document}
```

### Check Available Fonts

```text
# List all installed fonts
fc-list : family | sort | uniq

# Search for specific font
fc-list | grep -i arial
fc-list | grep -i roboto
```

## Quick Test Document

Create `test.tex` to verify everything works:

```python
% !TEX program = lualatex
\documentclass{article}
\usepackage{fontspec}
\usepackage{amsmath}
\usepackage{listings}
\usepackage{xcolor}

% Set custom fonts
\setmainfont{Liberation Sans}              % Sans serif main font (Arial-like)
\setmonofont{Liberation Mono}              % Monospace font
\newfontfamily\emojifont{Noto Color Emoji}[Renderer=HarfBuzz]
\newcommand{\emoji}[1]{{\emojifont #1}}

% Configure code style
\lstset{
  basicstyle=\ttfamily\small,
  keywordstyle=\color{blue}\bfseries,
  commentstyle=\color{gray}\itshape,
  stringstyle=\color{red},
  numbers=left,
  numberstyle=\tiny\color{gray},
  frame=single,
  breaklines=true,
  showstringspaces=false
}

\begin{document}

\title{LaTeX Test Document}
\author{Test User}
\date{\today}
\maketitle

\section{Text Formatting}
\textbf{Bold}, \textit{italic}, and \texttt{monospace} text.

This document uses Liberation Sans (sans serif font similar to Arial).

\section{Mathematics}
Inline math: \$E = mc^2\$

Display math:
\[ \int_0^\infty e^{-x^2} dx = \frac{\sqrt{\pi}}{2} \]

\section{Emoji Test}
Status: \emoji{✅} Working! \emoji{🎉}

\section{Lists}
\begin{itemize}
  \item First item
  \item Second item
\end{itemize}

\section{Code Example}

Inline code: \texttt{print("Hello")}

Python code block:
\begin{lstlisting}[language=Python]
def calculate_sum(numbers):
    """Calculate sum of numbers"""
    total = 0
    for num in numbers:
        total += num
    return total

# Test function
data = [1, 2, 3, 4, 5]
result = calculate_sum(data)
print(f"Sum: {result}")
\end{lstlisting}

\section{Font Comparison}

% Switch between fonts
{\fontspec{Liberation Serif} This is Liberation Serif (default serif).}

{\fontspec{Liberation Sans} This is Liberation Sans (sans serif).}

{\fontspec{Liberation Mono} This is Liberation Mono (monospace).}

\end{document}
```

Build with `Ctrl+Alt+B` or save to auto-build.

## Useful Resources

- Official Documentation: LaTeX Project

- LaTeX Mathematical Symbols: Mathematical Symbols

- Package Search: CTAN

- Symbol Search: Detexify

- Table Generator: TablesGenerator

- LaTeX Workshop Docs: GitHub Wiki

- Stack Exchange: TeX.SE

_Last updated: October 2025 | For Ubuntu ARM with TeX Live_
