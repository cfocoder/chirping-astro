import { describe, expect, test } from 'bun:test';
import { unified } from 'unified';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import rehypeStringify from 'rehype-stringify';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import remarkMath from 'remark-math';
import { remarkAlert } from './remark-alert';
import { remarkAsHtml } from './remark-ashtml';

async function render(markdown: string, plugins: unknown[] = []): Promise<string> {
  const processor = unified().use(remarkParse);
  for (const plugin of plugins) processor.use(plugin as never);
  return String(
    await processor
      .use(remarkRehype, { allowDangerousHtml: true })
      .use(rehypeRaw)
      .use(rehypeKatex)
      .use(rehypeStringify)
      .process(markdown),
  );
}

describe('Markdown rendering fixtures', () => {
  test('renders alert fences as daisyUI alert HTML', async () => {
    const html = await render(
      '```alert\ntype: warning\ntitle: Check credentials\ndescription: Use a read-only account.\n```',
      [remarkAlert],
    );

    expect(html).toContain('role="alert"');
    expect(html).toContain('alert-warning');
    expect(html).toContain('Check credentials');
    expect(html).toContain('Use a read-only account.');
  });

  test('renders inline math as KaTeX HTML', async () => {
    const html = await render('Net sales are $sales - returns$.', [remarkMath]);

    expect(html).toContain('class="katex"');
    expect(html).toContain('sales');
    expect(html).toContain('returns');
  });

  test('passes ashtml fences through as raw HTML', async () => {
    const html = await render('```ashtml\n<div class="mermaid">flowchart TD\n```', [remarkAsHtml]);

    expect(html).toContain('<div class="mermaid">flowchart TD');
  });
});
