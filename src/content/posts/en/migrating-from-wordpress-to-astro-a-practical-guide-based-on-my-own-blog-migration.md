---
title: 'Migrating from WordPress to Astro: A Practical Guide Based on My Own Blog Migration'
description: 'How I moved CFOCoder from WordPress to Astro, preserved posts and images, kept redirects working, and ended up with a faster, safer static blog.'
pubDate: 2026-06-06
heroImage: '/images/2026/06/wordpress-to-astro-migration.jpg'
heroImageAlt: 'WordPress to Astro static blog migration'
categories: ['Blog']
tags: ['WordPress', 'Astro']
toc: true
---

## Introduction

For years, this blog ran on WordPress.

That was not a bad decision. WordPress is popular for a reason: it is easy to start, has a huge plugin ecosystem, supports media uploads, handles themes, and gives you a complete publishing interface without writing code.

But as my blog became more technical and my infrastructure became more self-hosted, WordPress started to feel heavier than what I actually needed.

My use case is simple:

- I write technical posts.

- I publish mostly static content.

- I use images, code blocks, tables, and references.

- I do not need comments, plugins, user registration, or a dynamic database-driven CMS.

At the same time, the WordPress installation was running on valuable ARM server resources that I could use for more important workloads: AI tools, automation, data projects, observability, and self-hosted services.

That led to the obvious question:

**Why keep a dynamic WordPress stack alive for a blog that is mostly static?**

The answer was to migrate the blog to a static site.

This post documents the migration from WordPress to Astro, not as a theoretical comparison, but as a practical guide based on the actual process used to move CFOCoder.

## Why I Wanted to Move Away from WordPress

The main reason was not that WordPress is bad.

The problem was that WordPress was more infrastructure than I needed.

A typical WordPress setup needs several moving parts:

- A PHP runtime

- A database, usually MySQL or MariaDB

- A web server or reverse proxy

- Plugins

- Themes

- Updates

- Backups

- Security hardening

- Login protection

- Database maintenance

For a business site with editors, forms, commerce, memberships, or complex workflows, that may be justified.

For a personal technical blog, it starts to feel expensive in operational terms.

The main pain points were:

### 1. Security exposure

WordPress is one of the most attacked platforms on the internet because it is everywhere.

Even a small blog attracts automated scans against:

- `/wp-admin`

- `/wp-login.php`

- vulnerable plugins

- outdated themes

- XML-RPC endpoints

- exposed REST API routes

A static site removes almost all of that attack surface.

There is no login page.

There is no PHP runtime.

There is no database.

There are no plugins to exploit.

The deployed site becomes mostly HTML, CSS, JavaScript, images, RSS, and search index files.

That is a much simpler security model.

### 2. Server resources

My WordPress blog was running on an ARM server that also supports other self-hosted workloads.

Keeping WordPress alive meant allocating resources to:

- PHP workers

- MariaDB

- reverse proxy configuration

- background jobs

- plugin overhead

- backups

- monitoring

Once the blog became static, those resources could be freed.

This matters a lot on small ARM machines. They are powerful, but I prefer using them for workloads that actually need compute, not for rendering the same blog post repeatedly.

### 3. Performance

WordPress can be fast with caching, a CDN, image optimization, and careful plugin selection.

But a static site starts from a better baseline.

A static page does not need to query a database before it is served. It does not need to execute PHP. It does not need to assemble templates dynamically on every request.

The build happens once.

After that, Cloudflare Pages serves prebuilt files from the edge.

That is exactly the kind of architecture a technical blog deserves.

## What is Astro?

[Astro](https://astro.build/) is a modern static site framework focused on content-driven websites.

It can be used for documentation sites, blogs, marketing pages, portfolios, and even more advanced web applications. But one of its strongest use cases is exactly this kind of project: a fast technical blog written in Markdown.

The key idea is simple:

Astro builds the site ahead of time and ships as little JavaScript as possible to the browser.

That is different from many modern JavaScript frameworks that send a lot of client-side JavaScript by default.

With Astro, a regular blog post can be mostly static HTML.

That gives you:

- Fast page loads

- Good SEO

- Low hosting cost

- Simple deployment

- Markdown-based authoring

- Component-based layouts when needed

- Strong support for technical content

For my use case, Astro was a good fit because I wanted a static blog but still wanted a modern developer experience.

## Why I Chose Astro Instead of Hugo

Hugo was the first static site generator I had in mind.

That makes sense. Hugo is extremely fast, mature, and widely used. It is written in Go, ships as a single binary, and is a great choice for many blogs.

But after comparing options, I chose Astro for this migration.

The reasons were practical:

### 1. Better fit for a modern technical blog

Astro works naturally with Markdown, components, image handling, RSS, sitemap generation, and modern frontend tooling.

For a blog that contains technical guides, code blocks, tables, screenshots, and future custom components, Astro gives me more room to grow.

### 2. Theme and layout flexibility

The new blog uses a clean Astro theme that already supports:

- Post lists

- Categories

- Tags

- Archives

- RSS

- Table of contents

- Featured images

- Search indexing with Pagefind

- Responsive layout

That was close to what I wanted out of the box.

### 3. Static output with modern ergonomics

Astro gives me the benefits of a static site without feeling like I am working with an old static generator.

I can keep writing Markdown, but I can also extend the site later with components if needed.

That balance is important.

### 4. Good deployment story with Cloudflare Pages

Astro builds to a `dist/` folder.

Cloudflare Pages can deploy that directly.

The production pipeline is simple:

```bash
npm run build
```

Then Cloudflare Pages serves the output globally.

No PHP.

No database.

No server process.

## Migration Goals

Before migrating, I defined a few goals.

The migration would only be successful if the new site preserved the important parts of the old one.

The goals were:

- Migrate all WordPress posts.

- Preserve titles, dates, categories, tags, and descriptions.

- Download and serve images locally from the static site.

- Preserve featured images as Astro hero images.

- Keep old WordPress URLs working through redirects.

- Avoid broken images.

- Avoid broken posts.

- Remove WordPress-specific noise from the content.

- Deploy to Cloudflare Pages.

- Cut over `cfocoder.com` only after verifying the preview site.

In this migration, the final audit covered 86 WordPress posts.

The final Astro build generated 114 pages, including posts, indexes, categories, tags, RSS, sitemap, and support pages.

## Step 1: Export the WordPress Content

The first step was to extract the content from WordPress.

For this kind of migration, the WordPress REST API is very useful.

A typical endpoint looks like this:

```text
https://example.com/wp-json/wp/v2/posts
```

The API can return posts with fields like:

- `id`

- `date`

- `slug`

- `title`

- `content`

- `excerpt`

- `featured_media`

- `categories`

- `tags`

- `link`

The important lesson is this:

**Do not assume `per_page=100` will always return 100 posts.**

Some WordPress configurations or plugins can affect pagination behavior. A safer strategy is to check the total and iterate page by page.

Example:

```bash
curl -sI "https://example.com/wp-json/wp/v2/posts?per_page=1" \
  | grep -i x-wp-total
```

Then fetch pages explicitly:

```bash
curl -s "https://example.com/wp-json/wp/v2/posts?per_page=1&page=1" \
  -o post-1.json
```

For a real migration, I prefer saving raw JSON first and converting later. That gives you a repeatable source of truth if the conversion script needs to be improved.

## Step 2: Export Categories, Tags, and Media

Posts alone are not enough.

The migration also needs:

- Category names

- Tag names

- Featured image metadata

- Media URLs

- Image alt text when available

For media, WordPress exposes another REST API endpoint:

```text
https://example.com/wp-json/wp/v2/media
```

The important field is usually `source_url`.

A WordPress image URL often looks like this:

```text
https://example.com/wp-content/uploads/2026/04/example-image.png
```

In the static site, I wanted the same asset to become:

```text
/images/2026/04/example-image.png
```

That keeps the image library organized by year and month, which is already how WordPress stores uploads.

## Step 3: Convert HTML to Markdown

WordPress stores post content as HTML.

Astro content is much easier to maintain as Markdown.

So the migration needed an HTML-to-Markdown conversion step.

This is where most of the real work happens.

The converter needs to handle:

- Headings

- Paragraphs

- Lists

- Code blocks

- Tables

- Images

- Links

- Bold and italic text

- Captions

- WordPress-specific wrappers

- Shortcodes or plugin artifacts

A simple HTML stripper is not enough.

If you strip tags too early, you lose structure.

A better order is:

1. Convert code blocks.

2. Convert headings.

3. Convert images.

4. Convert links.

5. Convert tables.

6. Convert lists.

7. Convert inline formatting.

8. Strip remaining HTML.

That order matters.

For example, a technical post with code blocks should become this:

````markdown
```bash
sudo apt update
sudo apt install docker.io
```
````

not plain text mixed into the paragraph body.

## Step 4: Preserve Featured Images

One of the first issues I noticed after the migration was that some posts did not show their images correctly.

The reason was simple:

WordPress featured images are not always inside the post body.

They are often stored as metadata using the `featured_media` field.

So even if the body conversion works perfectly, the Astro post may still miss its hero image unless the converter maps `featured_media` to the new frontmatter.

The final Astro frontmatter uses this pattern:

```yaml
heroImage: '/images/2026/04/hadoop_hive_coolify.png'
heroImageAlt: 'hadoop hive coolify'
```

That makes the image appear both on the post page and in listing cards.

This was one of the most important quality checks in the migration.

A blog can technically work without featured images, but it feels incomplete.

## Step 5: Create Astro Frontmatter

Each migrated Markdown post needs frontmatter.

For this blog, the structure looks like this:

```yaml
title: 'Example Post Title'
description: 'Short post description'
pubDate: 2026-06-06
heroImage: '/images/2026/06/example-image.jpg'
heroImageAlt: 'example image'
categories: ['Blog']
tags: ['Astro', 'WordPress']
toc: true
```

The frontmatter is important because it powers:

- The post title

- SEO metadata

- RSS output

- Category pages

- Tag pages

- Featured images

- Table of contents behavior

- Reading time

If frontmatter is inconsistent, the site may still build but behave poorly.

## Step 6: Preserve Old URLs with Redirects

This was non-negotiable.

The old WordPress URLs were in this style:

```text
https://cfocoder.com/python_practical_reference_guide/
```

The new Astro URLs use:

```text
https://cfocoder.com/posts/python_practical_reference_guide/
```

If I had ignored redirects, old bookmarks and search engine results would break.

The solution was a Cloudflare Pages `_redirects` file.

Example:

```text
/python_practical_reference_guide/ /posts/python_practical_reference_guide/ 301
/about-me/ /about/ 301
/privacy-policy/ /privacy/ 301
```

After deployment, I verified that old URLs redirected correctly.

For example:

```text
https://cfocoder.com/python_practical_reference_guide/
```

now resolves to:

```text
https://cfocoder.com/posts/python_practical_reference_guide/
```

This is one of the most important parts of any WordPress-to-static migration.

A migration is not complete until the old URLs are respected.

## Step 7: Clean WordPress Artifacts

After the first successful migration, the site worked, but there were still a few WordPress artifacts to clean up.

The biggest one was imported table of contents blocks.

Some WordPress posts had content like this inside the article body:

```markdown
## Table of Contents

- Introduction
- Step 1
- Step 2
- Conclusion
```

But the Astro theme already generates its own table of contents.

That meant visitors could see duplicated or noisy navigation.

The fix was to remove the imported WordPress table of contents blocks from the Markdown files and let Astro generate the TOC automatically.

In this migration, that cleanup removed imported TOC blocks from 52 posts.

That made long posts cleaner and easier to read.

Another cleanup item was broken iframes.

One old WordPress post had an embedded iframe that already showed a 404 in WordPress. I did not preserve that broken embed in Astro because migrating broken content does not make the new site better.

The rule I would use in future migrations is:

**If an embed is already broken in WordPress, do not blindly migrate it. Replace it with a stable link or remove it.**

## Step 8: Build and Verify Locally

Once the content was migrated, I built the Astro site locally.

The build command was:

```bash
npm run build
```

The final build generated:

```text
114 pages
```

The search index was generated with Pagefind:

```text
Indexed 114 pages
```

I also checked for:

- Missing posts

- Broken local image references

- Missing featured images

- Broken redirects

- RSS output

- Sitemap output

- Article rendering issues

The important point is that a successful build is necessary, but not sufficient.

You still need to inspect the generated site like a visitor.

## Step 9: Compare Old vs New Post by Post

Before switching the domain, I compared the old WordPress blog against the new Astro site post by post.

The audit checked:

- Whether every WordPress post existed in Astro

- Whether the new post returned HTTP 200

- Whether the title matched

- Whether the text length was reasonable

- Whether article images loaded

- Whether old URLs redirected

- Whether obvious 404 markers appeared

The result was:

```text
WordPress posts: 86
Migrated posts: 86
Missing posts: 0
Broken article images: 0
```

That gave me confidence to proceed with the cutover.

This is a step I would not skip in future migrations.

Automated comparison is not perfect, but it catches the big mistakes quickly.

## Step 10: Deploy to Cloudflare Pages

The new site is hosted on Cloudflare Pages.

The deployment model is simple:

1. Push the Astro project to GitHub.

2. Connect the repository to Cloudflare Pages.

3. Set the build command.

4. Set the output directory.

5. Add the custom domain.

For Astro, the important values are usually:

```text
Build command: npm run build
Output directory: dist
```

Once the preview site looked correct, I added the custom domain:

```text
cfocoder.com
```

After that, I verified the live domain directly:

```text
https://cfocoder.com/
https://cfocoder.com/about/
https://cfocoder.com/posts/
https://cfocoder.com/rss.xml
```

I also tested an old WordPress URL:

```text
https://cfocoder.com/python_practical_reference_guide/
```

and confirmed it redirected to the new Astro path.

## The Final Result

The blog is now static.

That means:

- No WordPress runtime is needed.

- No database is needed to serve posts.

- No plugin attack surface exists on the public site.

- Pages are served quickly from Cloudflare.

- The ARM server can be freed for more valuable workloads.

- Posts are now Markdown files in Git.

- The site is easier to rebuild, audit, and version control.

The most satisfying part is that the migration did not require sacrificing the existing content.

The posts, images, redirects, RSS feed, categories, and overall navigation all survived the move.

## Practical Checklist for Future Migrations

Here is the checklist I would use next time.

### Before migration

- Confirm the current WordPress URL structure.

- Count posts and media items.

- Back up the WordPress database.

- Export posts, categories, tags, and media metadata.

- Identify plugins that affect content rendering.

- Check for shortcodes, iframes, code block plugins, and table of contents plugins.

### During conversion

- Convert WordPress HTML to Markdown.

- Preserve code blocks with language hints when possible.

- Download images locally.

- Map featured images to Astro hero images.

- Generate frontmatter consistently.

- Preserve categories and tags.

- Generate redirects from old URLs to new URLs.

### After conversion

- Build the Astro site locally.

- Check posts visually.

- Check images.

- Check RSS and sitemap.

- Remove imported WordPress TOC blocks if the Astro theme generates its own.

- Remove or replace broken iframes.

- Compare old vs new post by post.

### Before DNS cutover

- Deploy to a preview URL.

- Test the homepage.

- Test a recent post.

- Test an old post.

- Test a post with many images.

- Test a post with tables and code blocks.

- Test an old WordPress URL redirect.

- Test RSS.

- Test the custom domain only after the preview looks right.

### After DNS cutover

- Verify the apex domain.

- Verify `www` behavior.

- Verify redirects.

- Verify images.

- Verify that WordPress is no longer serving the domain.

- Keep the old WordPress system available briefly as a rollback option.

- Shut WordPress down only after the static site is stable.

## Lessons Learned

The migration was successful, but the main lesson is that static site migrations are not just about converting content.

They are about preserving the reader experience.

The most important details were:

- Featured images need explicit handling.

- Redirects are part of the migration, not an optional cleanup.

- A static build must be checked from the browser, not only from the terminal.

- WordPress artifacts can make migrated Markdown noisy.

- Broken embeds should not be preserved just because they existed in the old site.

- Cloudflare Pages is a very good fit for this type of blog.

- A static blog is much easier to secure and operate.

## Conclusion

Moving CFOCoder from WordPress to Astro was the right decision.

WordPress helped me publish for years, but the blog had reached a point where a static architecture made more sense.

Astro gave me a modern Markdown-based publishing workflow, Cloudflare Pages gave me a simple global deployment target, and the migration freed server resources that can now be used for workloads that actually need a running machine.

The final result is faster, simpler, safer, and easier to maintain.

For future blog migrations, this is the path I would follow again:

1. Export WordPress through the REST API.

2. Convert posts carefully to Markdown.

3. Download and remap images.

4. Preserve featured images.

5. Generate redirects.

6. Clean WordPress artifacts.

7. Build and audit locally.

8. Deploy to Cloudflare Pages.

9. Verify old and new URLs.

10. Only then retire WordPress.

That last point matters.

A good migration is not finished when the new site builds.

It is finished when a visitor can open the old URLs, see the right content, load the images, read the posts comfortably, and never notice how much infrastructure disappeared behind the scenes.
