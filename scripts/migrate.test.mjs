import test from 'node:test';
import assert from 'node:assert/strict';
import { destination, pageURL, transformMarkdown, firstHeading } from './migrate.mjs';

test('documentation routes preserve hierarchy and map READMEs to sections', () => {
  assert.equal(destination('docs/INSTALL.md'), 'guides/install.md');
  assert.equal(destination('docs/deployment/docker.md'), 'deployment/docker.md');
  assert.equal(destination('docs/dev/vendor/EPSON_OID_MAPPING.md'), 'development/vendor/epson-oid-mapping.md');
  assert.equal(destination('agent/scanner/capabilities/README.md'), 'components/agent/scanner/capabilities/_index.md');
  assert.equal(pageURL('api/_index.md'), '/api/');
  assert.equal(pageURL('guides/install.md'), '/guides/install/');
  assert.notEqual(destination('docs/dev/TESTING.md').replace('.md', ''), destination('tests/README.md').replace('/_index.md', ''));
});

test('migration rewrites authored links and HTML but preserves code examples', () => {
  const source = '[Guide](INSTALL.md#docker)\n<img src="images/banner.png">\n`[Example](INSTALL.md)`\n```md\n[Example](INSTALL.md)\n```\n~~~md\n[Example](INSTALL.md)\n~~~';
  const result = transformMarkdown(source, target => `/new/${target}`);
  assert.ok(result.includes('[Guide](/new/INSTALL.md#docker)'));
  assert.ok(result.includes('src="/new/images/banner.png"'));
  assert.ok(result.includes('`[Example](INSTALL.md)`'));
  assert.ok(result.includes('```md\n[Example](INSTALL.md)\n```'));
  assert.ok(result.includes('~~~md\n[Example](INSTALL.md)\n~~~'));
});

test('nonexistent historical documents are labeled rather than published as dead links', () => {
  assert.equal(transformMarkdown('[Old plan](missing.md)', () => null), 'Old plan (legacy document unavailable)');
});

test('badge outer links are migrated along with images', () => {
  assert.equal(transformMarkdown('[![License](https://example.com/badge)](LICENSE)', target => target === 'LICENSE' ? 'https://example.com/license' : target), '[![License](https://example.com/badge)](https://example.com/license)');
});

test('shell comments inside fenced examples never become page headings', () => {
  assert.equal(firstHeading('```sh\n# Install as service\n```'), undefined);
  assert.deepEqual(firstHeading('```sh\n# Install\n```\n# Real heading'), { line: 3, title: 'Real heading' });
});

test('inline-code labels do not prevent migrating their link destinations', () => {
  assert.equal(transformMarkdown('[`Guide.md`](Guide.md)', () => '/guide/'), '[`Guide.md`](/guide/)');
});