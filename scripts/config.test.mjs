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

test('Pages publication is explicitly opt-in and production-only', () => {
  const workflow = read('.github/workflows/site.yml');
  const job = workflow.split('  deploy-pages:')[1]?.split('\n  publish:')[0];
  assert.ok(job, 'Pages job exists');
  assert.ok(job.includes("vars.ENABLE_GITHUB_PAGES == 'true'"));
  assert.ok(job.includes("github.event_name != 'pull_request'"));
  assert.ok(job.includes("github.ref == 'refs/heads/main'"));
  assert.ok(job.includes('needs: validate'));
  assert.ok(job.includes('name: documentation-site'));
  assert.ok(job.includes('pages: write'));
  assert.ok(job.includes('id-token: write'));
  assert.ok(job.includes('cancel-in-progress: false'));
  assert.ok(!job.includes('enablement: true'), 'Do not automatically enable public hosting');
});

test('all workflow actions remain pinned to immutable commits', () => {
  const workflow = read('.github/workflows/site.yml');
  for (const match of workflow.matchAll(/uses:\s+(\S+)/g)) {
    assert.match(match[1], /^[\w-]+\/[\w-]+@[a-f0-9]{40}$/);
  }
});