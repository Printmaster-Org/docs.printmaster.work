import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('CI pin and standalone Docker Hugo default stay identical', () => {
  const version = read('.hugo-version').trim();
  assert.match(version, /^\d+\.\d+\.\d+$/);
  assert.ok(read('Dockerfile').includes(`ARG HUGO_VERSION=${version}`));
});

test('every imported page has its own route and retains source metadata', () => {
  const manifest = JSON.parse(read('migration-manifest.json'));
  assert.equal(manifest.pages.length, 47);
  assert.equal(new Set(manifest.pages.map(page => page.url)).size, 47);
  for (const page of manifest.pages) {
    const content = read(page.destination);
    assert.ok(content.includes(`source: ${JSON.stringify(page.source)}`), page.source);
    assert.ok(content.includes(`sourceCommit: ${JSON.stringify(manifest.sourceCommit)}`), page.source);
  }
  for (const asset of manifest.assets) assert.ok(fs.existsSync(path.join(root, asset.destination)), asset.source);
});