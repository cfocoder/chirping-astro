---
title: 'SilverBullet Quick Start Guide for Students: A Practical Workflow for Master Classes'
description: |
  A practical guide to getting productive with SilverBullet for academic work. Based on the official video series by Zef Hemel.
pubDate: 2026-06-11
heroImage: '/images/2026/06/silverbullet-master-guide.jpg'
heroImageAlt: 'A productive academic workspace illustration with note-taking, study elements, and a laptop'
categories: ['Productivity', 'Education']
tags:
  [
    'SilverBullet',
    'Note-Taking',
    'Students',
    'Master Degree',
    'PKM',
    'Markdown',
    'Academic Workflow',
  ]
toc: true
---

After getting SilverBullet running on my own server, the next challenge was learning how to actually use it for my **master's classes**. I spent time with the official ["Welcome to SilverBullet" video series](https://www.youtube.com/playlist?list=PLxFAb_vXRcEp4465MVI6Ha9wzNiX5VevQ) by Zef Hemel (the creator of SilverBullet) and distilled the essential workflow into this practical guide.

If you are a student or anyone who needs to organize notes, tasks, and references efficiently, this guide is for you.

## 1. The Core Philosophy: Markdown as a First-Class Citizen

SilverBullet is built entirely on **Markdown**. Every page you create is a plain text file with `.md` extension. This means:

- **No lock-in**: Your notes are portable. You can open them in any text editor, VS Code, or even Obsidian.
- **Git-friendly**: You can version control your entire knowledge base with Git.
- **Future-proof**: Markdown is not going anywhere.

SilverBullet renders Markdown in a **live preview** mode. When you place your cursor on a line, you see the raw Markdown syntax. When you move away, it renders beautifully. This is the same WYSIWYG approach popularized by Obsidian, but web-based.

## 2. Essential Keyboard Shortcuts

Before anything else, learn these shortcuts. They will speed up your workflow dramatically:

| Shortcut                               | Action                        |
| -------------------------------------- | ----------------------------- |
| `Ctrl+K` / `Cmd+K`                     | Page picker (open any page)   |
| `Ctrl+Shift+P` / `Cmd+Shift+P`         | Command palette               |
| `Ctrl+Enter` / `Cmd+Enter`             | Navigate to link under cursor |
| `Ctrl+Slash` / `Cmd+Slash`             | Toggle fold on outline item   |
| `Ctrl+Shift+Slash` / `Cmd+Shift+Slash` | Fold all / Unfold all         |

The command palette is your best friend. Type any command name and SilverBullet will find it. You can also search for commands by typing keywords like `outline`, `upload`, `sync`, etc.

## 3. Creating and Navigating Pages

### Creating a new page

There are several ways:

1. **Click the page icon** (book) in the top right → "New Page"
2. **Use the page picker** (`Ctrl+K`) and type a page name that does not exist yet
3. **Create a link** from another page: type `[[New Page Name]]` and press `Ctrl+Enter`

The third method is the most powerful. It is how you organically grow your knowledge base.

### Naming conventions for classes

For my master's coursework, I use a simple naming convention:

```
MCD-2026-Spring/Statistics/Week-03-Hypothesis-Testing
MCD-2026-Spring/Optimization/Week-05-Linear-Programming
MCD-2026-Spring/Projects/Final-Report
```

This creates a natural folder structure without actual folders. The forward slashes organize pages visually in the page picker.

### Navigation

- **Page picker** (`Ctrl+K`): Shows all pages. Type to filter.
- **Click links**: Any `[[Page Name]]` link is clickable.
- **Linked mentions**: At the bottom of every page, you see a list of all pages that link back to it. This is bidirectional linking at work.

## 4. Outlining: The Killer Feature for Lectures

This is the feature I use the most during live lectures. SilverBullet has powerful **outline support** that makes it ideal for taking structured notes quickly.

### Basic outlining

Use `-` or `*` to create bullet points. Press `Tab` to indent (create a child) and `Shift+Tab` to outdent (promote to parent).

```markdown
- Introduction to Linear Programming
  - Definition: optimization of a linear objective function
  - Constraints: linear inequalities
  - Standard form: maximize c^T x subject to Ax <= b
    - Example: diet problem
    - Example: production planning
  - Solution methods
    - Graphical method (2 variables)
    - Simplex method
```

### Folding and unfolding

During a lecture, you want to capture everything. Later, you want to review only the top-level structure. Use:

- **Fold**: `Ctrl+Slash` on any item to collapse its children
- **Fold all**: `Ctrl+Shift+Slash` to collapse everything and see only the structure
- **Unfold**: Press `Ctrl+Slash` again to expand

This lets you take **dense notes** during class and **review them hierarchically** afterward.

### Promoting and demoting

If you realize an item should be at a different level:

- **Demote** (make it a child): `Tab` or use the command palette
- **Promote** (make it a sibling): `Shift+Tab`

## 5. Tagging and Structuring Your Space

Tags are the backbone of organizing non-hierarchical content. SilverBullet supports tags at three levels:

### Page-level tags

Add a tag at the top of a page:

```markdown
---
title: 'Week 03: Hypothesis Testing'
description: 'Notes on hypothesis testing for the Statistics course'
tags: ['statistics', 'mcd-2026-spring', 'week-03']
---
```

Or inline anywhere:

```markdown
# Week 03: Hypothesis Testing

#statistics #mcd-2026-spring #week-03
```

### Item-level tags

You can tag individual outline items:

```markdown
- Read chapter 4 of the textbook #todo
- Review the lecture recording #todo
- Ask professor about the p-value interpretation #question
```

### Data objects

For structured data, use YAML blocks inside code fences:

````markdown
```yaml
#contact
name: 'Dr. Smith'
email: 'smith@university.edu'
office: 'Building A, Room 302'
```
````

````

This creates a structured data object that can be queried and displayed in tables.

## 6. Querying Your Notes

Once you have tagged pages and items, you can query them dynamically. This is where SilverBullet becomes more than a note-taking app.

### Basic queries

Use the `query` command to find tagged items:

```markdown
```query
page where tags = "todo"
````

````

This will show all pages tagged with `#todo`.

### Task tracking

For coursework, I track tasks with a simple system:

```markdown
- [ ] Read chapter 3 #statistics #week-02
- [ ] Complete problem set 2 #statistics #week-02
- [ ] Email professor about office hours #admin
````

Then query them:

````markdown
```query
item where tags = "statistics" and tags = "week-02"
```
````

````

### Live templates

SilverBullet supports **live templates** that auto-update. For example, you can create a "Current Tasks" page that always shows open todos.

## 7. Working with Attachments

For my classes, I need to include screenshots, diagrams, and PDFs.

### Uploading images

1. **Copy-paste**: Take a screenshot and paste it directly into a page (`Ctrl+V`). SilverBullet will prompt you for a file name and save it.
2. **Drag and drop**: Drag an image from your file manager onto the page.
3. **Command palette**: `Upload: File` command.

Pasted images are saved as files in your space and embedded as Markdown:

```markdown
![[MCD-2026-Spring/Statistics/Week-03-diagram.png]]
````

### Important: If you use Cloudflare Access

If you protect your SilverBullet instance with Cloudflare Access (as I do), you must add a **bypass rule** for `/.fs/*` in your Cloudflare Access application. Otherwise, images will not render in Chrome, Brave, or Opera. Firefox handles it differently, but Chromium-based browsers need this bypass.

See my installation guide for the exact Cloudflare Access configuration.

## 8. PWA and Offline Work

SilverBullet is a **Progressive Web App (PWA)**. This means:

- **Install it**: In Chrome or Edge, click the install icon in the address bar. It will appear as a standalone app.
- **Offline mode**: Once installed, you can take notes without an internet connection. Changes sync when you reconnect.
- **Mobile-friendly**: The PWA works on phones and tablets.

### Installing the PWA

1. Open your SilverBullet instance in Chrome or Edge.
2. Click the **install icon** (usually in the top-right of the address bar).
3. It will appear as a standalone app on your desktop or phone.

## 9. A Sample Workflow for a Week of Classes

Here is how I structure a typical week:

### Monday: Pre-class preparation

1. Create a page for the week's topic: `MCD-2026-Spring/Statistics/Week-04`
2. Add a basic outline with headings from the syllabus.
3. Tag it: `#statistics #week-04 #todo`

### Tuesday: Live lecture

1. Open the page in the PWA.
2. Take **outline notes** during class. Capture everything.
3. Use **folding** after class to collapse dense sections and review the structure.
4. Tag open questions with `#question`.

### Wednesday: Review and consolidation

1. Re-read the notes.
2. Add **wiki-links** to related pages from previous weeks.
3. Add screenshots or diagrams.
4. Update `#todo` items to `#done`.

### Weekend: Deep work

1. Query all `#question` items across the semester.
2. Research answers and update the notes.
3. Create a **summary page** linking to all weekly notes.

## 10. Advanced Features for Power Users

Once you are comfortable with the basics, explore these features:

### Space Lua

SilverBullet has a built-in scripting language called **Space Lua** (based on Lua). You can write custom functions to automate tasks, transform text, or generate dynamic content.

### Templates

Create reusable templates for recurring structures:

````markdown
```template
## Lecture Notes

### Date: {{today}}
### Topic: {{topic}}

- Key concepts
  -
- Questions
  -
- References
  -
```
````

```

### Federation

SilverBullet can **federate** with other SilverBullet instances. This means you can link to notes on other people's servers, creating a distributed knowledge network.

### Custom CSS

You can customize the appearance with **Space Styles**. Add custom CSS blocks to change fonts, colors, or layout.

## Final Tips

- **Start simple**: Do not try to build a perfect system on day one. Start with basic pages and outlines, then add tagging and queries as needed.
- **Use the command palette**: It is the fastest way to discover features.
- **Link aggressively**: Every time you mention a concept, link it. Your future self will thank you.
- **Review backlinks**: Check the "Linked Mentions" section at the bottom of pages. It often reveals connections you did not notice.
- **Backup your space**: Since everything is plain files, you can back up the entire `/space` directory with `rsync`, Git, or any backup tool.

## Resources

- [Welcome to SilverBullet Video Series](https://www.youtube.com/playlist?list=PLxFAb_vXRcEp4465MVI6Ha9wzNiX5VevQ) by Zef Hemel
- [SilverBullet Official Documentation](https://silverbullet.md)
- [SilverBullet Community Forum](https://community.silverbullet.md)
- [My Installation Guide](/posts/why-i-switched-from-obsidian-to-silverbullet/) for the server setup

---

This guide is a living document. As I use SilverBullet more during my master's program, I will update it with new tips and workflows. If you have questions, feel free to reach out.
```
