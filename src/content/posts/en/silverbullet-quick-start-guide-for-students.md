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

> [!NOTE]
> In SilverBullet queries (based on Lua), you use `==` for equality comparisons, not `=` like in SQL. This is important when writing query conditions.

### Basic queries

Use the `query` command to find tagged items:

```markdown
```query
page where tags == "todo"
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
item where tags == "statistics" and tags == "week-02"
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

````

### Federation

SilverBullet can **federate** with other SilverBullet instances. This means you can link to notes on other people's servers, creating a distributed knowledge network.

### Custom CSS

You can customize the appearance with **Space Styles**. Add custom CSS blocks to change fonts, colors, or layout.

## 11. Data Science Specific Workflow (Advanced)

The following sections are specifically tailored for **Data Science master's students** and complement the basic workflow above with advanced features for mathematical notation, scientific diagrams, and research paper management.

### Mathematical Notation with LaTeX

For data science coursework, mathematical notation is essential. Enable the **KaTeX** or `silverbullet-math` plugin for elegant math rendering:

- **Inline formulas**: Wrap with single dollar signs `$`
  - Example: The gradient descent algorithm is defined as $\theta_{t+1} = \theta_t - \eta \nabla_\theta J(\theta)$
- **Block equations**: Wrap with double dollar signs `$$`
  - Example (Binary Cross-Entropy Loss):

$$\mathcal{L}(\theta) = -\frac{1}{N} \sum_{i=1}^N \left[ y_i \log(\hat{y}_i) + (1-y_i) \log(1-\hat{y}_i) \right]$$

  - Example (Multivariate Normal Distribution):

$$f(\mathbf{x}) = \frac{1}{\sqrt{(2\pi)^k |\boldsymbol{\Sigma}|}} \exp\left( -\frac{1}{2} (\mathbf{x} - \boldsymbol{\mu})^T \boldsymbol{\Sigma}^{-1} (\mathbf{x} - \boldsymbol{\mu}) \right)$$

### Scientific Diagrams with Mermaid

Install the `silverbullet-mermaid` plugin to draw architecture diagrams directly in your notes:

#### ML Pipeline Flow

```mermaid
graph TD
    A[Raw Data Sources] --> B(ETL / Cleaning Process)
    B --> C{Data Split}
    C -->|80% Training| D[Feature Engineering]
    C -->|20% Test| E[Model Evaluation]
    D --> F[Model Training]
    F --> G[Model Serialization .pkl]
    G --> E
    E --> H{Meets Business Metrics?}
    H -->|Yes| I[Deploy to API / Cloud]
    H -->|No| D
````

#### Neural Network Architecture

```mermaid
graph LR
    subgraph Input Layer
        X1(x1)
        X2(x2)
    end
    subgraph Hidden Layer
        H1((h1))
        H2((h2))
        H3((h3))
    end
    subgraph Output Layer
        Y((y_hat))
    end
    X1 --> H1
    X1 --> H2
    X1 --> H3
    X2 --> H1
    X2 --> H2
    X2 --> H3
    H1 --> Y
    H2 --> Y
    H3 --> Y
```

### Research Paper Management

For tracking academic papers during your master's program:

1. **Create a note per paper** with frontmatter:

```yaml
---
type: paper
course: 'Machine Learning'
semester: 2
tags: [machine-learning, clustering, unsupervised]
status: pending
year: 2024
---
```

2. **Link the PDF** directly:

```markdown
Read the full PDF of [Attention Is All You Need (PDF)](papers/pdfs/attention_is_all_you_need.pdf)
```

3. **Query pending papers** dynamically:

````markdown
### Papers in Review

```query
from page
where type == "paper" and status == "pending"
select name, course, year
order by year desc
```
````

````

### Dynamic Counters with LIQ

Use inline query expressions to display live counts in your text:

```markdown
Currently I have **${query[[from page where type == "paper" and status == "pending"]]:length}** research papers pending for my projects.
````

### Task Management for Coursework

SilverBullet indexes task checkboxes automatically. Use metadata-rich tasks:

```markdown
- [ ] Solve Logistic Regression Practice [deadline: 2026-06-15] #prioritario
- [x] Submit Final Project Progress #completed
```

Query all pending tasks across your entire space:

````markdown
### Pending Master's Tasks

```query
from index.tag "task"
where completed == false
select name, page, deadline
order by deadline asc
```
````

````

### Proposed Workspace Structure

For a data science master's program, organize your space like this:

```text
notas-maestria/
├── clases/
│   ├── Machine_Learning.md
│   └── Multivariate_Statistics.md
├── proyectos/
│   └── Anomaly_Detection/
│       ├── research.md
│       └── pipeline_architecture.md
├── papers/
│   ├── Vaswani2017_Transformer.md
│   └── pdfs/
│       └── Vaswani2017_Transformer.pdf
├── templates/
│   ├── class_template.md
│   └── paper_template.md
└── index.md (Dashboard)
````

## 12. Code Snippets and Executable Programming

As a data science student, you will document algorithms in code and automate calculations in your notes. SilverBullet offers static syntax highlighting and dynamic scripting environments (**Space Lua** and **Space Script**).

### Static Code Snippets

Use standard code blocks with the language specified for syntax highlighting:

**Python (Scikit-Learn Training):**

```python
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score

# Fit logistic regression
model = LogisticRegression()
model.fit(X_train, y_train)

# Evaluate performance
predictions = model.predict(X_test)
acc = accuracy_score(y_test, predictions)
print(f"Accuracy: {acc:.4f}")
```

**SQL (Analytical Query):**

```sql
SELECT
    course_name,
    COUNT(student_id) AS total_students,
    AVG(final_grade) AS average_grade
FROM master_grades
GROUP BY course_name
HAVING AVG(final_grade) >= 8.5;
```

### Space Lua

Space Lua is the ideal environment for creating mathematical functions or formatting utilities that you can invoke anywhere in your notes. Write your code in a `space-lua` block and it loads automatically:

````markdown
```space-lua
-- Lua function to calculate F1-Score in your notes
function F1Score(precision, recall)
  if (precision + recall) == 0 then return 0 end
  return 2 * (precision * recall) / (precision + recall)
end
```
````

````

To use this function anywhere in your notes, invoke it with the expression syntax `${...}`:

- **Usage:** The resulting F1-Score for the evaluated model is **${F1Score(0.85, 0.78)}** (computed on the fly).

### Space Script

If you prefer JavaScript for registering advanced editor commands or macros, use the `space-script` block:

```markdown
```space-script
silverbullet.registerFunction({name: "studentGreeting"}, (name) => {
  return `Hello, ${name}! Good luck with your study session today.`;
})
````

```

> [!TIP]
> Remember to run the **`System: Reload`** command (`Ctrl+Alt+R` or via `Ctrl+K` / `Cmd+K`) every time you make changes to your `space-script` or `space-lua` blocks to update their references in the editor.

## Final Tips

- **Start simple**: Do not try to build a perfect system on day one. Start with basic pages and outlines, then add tagging and queries as needed.
- **Use the command palette**: It is the fastest way to discover features.
- **Link aggressively**: Every time you mention a concept, link it. Your future self will thank you.
- **Review backlinks**: Check the "Linked Mentions" section at the bottom of pages. It often reveals connections you did not notice.
- **Backup your space**: Since everything is plain files, you can back up the entire `/space` directory with `rsync`, Git, or any backup tool.
- **Keep plugins updated**: Press `Ctrl+K` and type `Plugs: Update` to stay current with extensions.
- **Use Space Lua for automation**: Create custom functions for repetitive tasks like formatting citations or generating report summaries.

## Resources

- [Welcome to SilverBullet Video Series](https://www.youtube.com/playlist?list=PLxFAb_vXRcEp4465MVI6Ha9wzNiX5VevQ) by Zef Hemel
- [SilverBullet Official Documentation](https://silverbullet.md)
- [SilverBullet Community Forum](https://community.silverbullet.md)
- [My Installation Guide](/posts/why-i-switched-from-obsidian-to-silverbullet/) for the server setup

---

This guide is a living document. As I use SilverBullet more during my master's program, I will update it with new tips and workflows. If you have questions, feel free to reach out.
```
