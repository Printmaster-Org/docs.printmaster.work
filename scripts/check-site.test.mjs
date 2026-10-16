import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { checkSite } from './check-site.mjs';

test('site validation catches broken paths and anchors, accepts escaped image names', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'printmaster-docs-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, 'guide'));
  fs.writeFileSync(path.join(root, 'index.html'), '<a href="/guide/#setup">Guide</a><img src="/a%20b.png"><a href="https://example.com/">External</a>');
  fs.writeFileSync(path.join(root, 'guide/index.html'), '<h2 id=setup>Setup</h2>');
  fs.writeFileSync(path.join(root, 'a b.png'), 'fixture');
  fs.writeFileSync(path.join(root, 'index.json'), JSON.stringify([{ title: 'Guide', text: 'Setup', url: '/guide/' }]));
  assert.deepEqual(checkSite(root).errors, []);
  fs.writeFileSync(path.join(root, 'index.html'), '<a href=/missing/>Missing</a><a href=/guide/#absent>Absent</a>');
  assert.equal(checkSite(root).errors.length, 2);
});

test('site validation catches searchable pages missing from the documentation tree', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'printmaster-docs-nav-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, 'guide'));
  fs.writeFileSync(path.join(root, 'guide/index.html'), '<h1>Guide</h1>');
  fs.writeFileSync(path.join(root, 'index.json'), JSON.stringify([{ title: 'Guide', text: 'Setup', url: '/guide/' }]));
  for (const id of ['sidebar', '"sidebar"', "'sidebar'"]) {
    fs.writeFileSync(path.join(root, 'index.html'), `<aside id=${id}><p>Empty navigation</p></aside>`);
    assert.deepEqual(checkSite(root).errors, ['Page missing from documentation navigation: /guide/']);
    fs.writeFileSync(path.join(root, 'index.html'), `<aside id=${id}><details><summary><a href="/guide/">Guide</a></summary></details></aside>`);
    assert.deepEqual(checkSite(root).errors, []);
  }
});