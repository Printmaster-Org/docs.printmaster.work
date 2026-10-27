import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('primary navigation follows reader tasks rather than implementation modules', () => {
  const config = read('hugo.toml');
  const refs = [...config.matchAll(/pageRef = '([^']+)'/g)].map(match => match[1]);
  assert.deepEqual(refs, ['/start-here', '/guides', '/scanning', '/printers', '/deployment', '/api', '/guides/security']);
  for (const ref of refs) {
    const contentPath = path.join(root, 'content', ref);
    assert.ok(fs.existsSync(path.join(contentPath, '_index.md')) || fs.existsSync(`${contentPath}.md`), ref);
  }
  assert.equal(fs.existsSync(path.join(root, 'content/development/_index.md')), false);
  assert.equal(fs.existsSync(path.join(root, 'content/components/_index.md')), false);
});

test('reverse proxy guidance is curated near the top of deployment navigation', () => {
  const section = read('content/deployment/_index.md');
  assert.match(section, /pages: \["\/deployment\/reverse-proxy",/);
  const guide = read('content/deployment/reverse-proxy.md');
  for (const product of ['Nginx', 'Nginx Proxy Manager', 'Caddy', 'Traefik', 'Apache', 'HAProxy', 'IIS']) {
    assert.ok(guide.includes(product), product);
  }
  assert.ok(guide.includes('WebSocket'));
  assert.ok(guide.includes('TRUSTED_PROXIES'));
});

test('relocated guides preserve published routes and imported provenance', () => {
  for (const [file, url] of [
    ['start-here/install.md', '/guides/install/'],
    ['start-here/first-steps.md', '/guides/getting-started/'],
    ['scanning/printmaster-scans.md', '/guides/scans/'],
    ['scanning/windows-manual.md', '/guides/manual-smb-setup/'],
  ]) {
    assert.ok(read(`content/${file}`).includes(`url: "${url}"`));
  }
  const manifest = JSON.parse(read('migration-manifest.json'));
  for (const file of ['content/start-here/install.md', 'content/start-here/first-steps.md']) {
    assert.ok(manifest.pages.some(page => page.destination === file));
    assert.ok(read(file).includes(`sourceCommit: "${manifest.sourceCommit}"`));
  }
});

test('every brand has an independent hub and an explicitly scoped SMB guide', () => {
  const brands = fs.readdirSync(path.join(root, 'content/printers'), { withFileTypes: true }).filter(entry => entry.isDirectory());
  for (const name of ['brother', 'canon', 'epson', 'hp', 'konica-minolta', 'kyocera', 'lexmark', 'ricoh', 'sharp', 'toshiba', 'xerox']) {
    assert.ok(brands.some(brand => brand.name === name), `Missing initial brand hub: ${name}`);
  }
  for (const { name } of brands) {
    const hub = read(`content/printers/${name}/_index.md`);
    assert.match(hub, /^brand: ".+"$/m, name);
    const smb = read(`content/printers/${name}/scan-to-smb.md`);
    if (/^status: needs-validation$/m.test(smb)) {
      assert.match(smb, /## Model and verification scope/, name);
      assert.match(smb, /Not performed/, name);
      assert.match(smb, /delivery-test-pending label/, name);
    } else {
      assert.match(smb, /^status: planned$/m, name);
    }
    assert.ok(smb.includes('](/scanning/)'), name);
    assert.ok(smb.includes('](/scanning/copier-setup/)'), name);
    assert.ok(smb.includes('{{< image-placeholder title='), name);
  }
});

test('Epson walkthrough records inspected firmware, fixed UNC prefix, real screenshots and untested delivery', () => {
  const content = read('content/printers/epson/scan-to-smb.md');
  assert.match(content, /^status: needs-validation$/m);
  for (const fact of ['ST-C8090 Series', '03.97.OJ19PB', 'October 16, 2026', 'fixed prefix outside the Save to box', 'Apply was not selected', 'manual-documented, not hands-on tested']) {
    assert.ok(content.includes(fact), fact);
  }
  for (const name of ['st-c8090-scan-navigation.png', 'st-c8090-smb-contact.png', 'st-c8090-scan-defaults.png']) {
    assert.ok(content.includes(`](/images/epson/${name})`), name);
    const image = fs.readFileSync(path.join(root, 'static/images/epson', name));
    assert.equal(image.subarray(1, 4).toString(), 'PNG', name);
    assert.ok(image.readUInt32BE(16) >= 250 && image.readUInt32BE(20) >= 300, name);
  }
  assert.ok(content.includes('3038483/Epson-St-C8090.html?page=184'));
  assert.ok(content.includes('3038483/Epson-St-C8090.html?page=187'));
});

function searchHarness(index, fetchIndex = async () => ({ ok: true, json: async () => index })) {
  const element = () => ({
    children: [],
    textContent: '',
    listeners: {},
    classList: { toggle: () => false, contains: () => false },
    setAttribute() {},
    addEventListener(name, handler) { this.listeners[name] = handler; },
    append(child) { this.children.push(child); },
    replaceChildren() { this.children = []; this.textContent = ''; },
  });
  const elements = Object.fromEntries(['#theme-toggle', '#menu-toggle', '#sidebar', '#search', '#search-results'].map(id => [id, element()]));
  elements['#search'].dataset = { index: '/index.json' };
  const document = { querySelector: id => elements[id], createElement: element, body: element() };
  vm.runInNewContext(read('assets/js/docs.js'), {
    document,
    localStorage: { getItem: () => null, setItem() {} },
    matchMedia: () => ({ matches: false }),
    fetch: fetchIndex,
  });
  return {
    results: elements['#search-results'],
    input(value) {
      elements['#search'].value = value;
      return elements['#search'].listeners.input();
    },
  };
}

test('search ranks finished guides before equally relevant placeholders and historical notes', async () => {
  const harness = searchHarness([
    { title: 'SMB setup', text: 'Guide', url: '/planned/', status: 'planned', context: 'Printers / Brand' },
    { title: 'SMB setup', text: 'Guide', url: '/historical/', legacy: true },
    { title: 'SMB setup', text: 'Guide', url: '/ready/', context: 'Scanning & SMB' },
  ]);
  await harness.input('smb');
  assert.deepEqual(harness.results.children.map(link => link.href), ['/ready/', '/planned/', '/historical/']);
  assert.equal(harness.results.children[1].children[0].textContent, 'Printers / Brand · Documentation planned');
  assert.equal(harness.results.children[2].children[0].textContent, 'Historical reference');
});

test('specific brand matches outrank generic text and search retains all-word matching', async () => {
  const harness = searchHarness([
    { title: 'Copier setup', text: 'Kyocera SMB setup', url: '/generic/' },
    { title: 'Kyocera scan-to-SMB', text: 'Coverage', url: '/brand/', status: 'planned' },
    { title: 'Kyocera printing', text: 'Drivers', url: '/printing/' },
  ]);
  await harness.input('kyocera smb');
  assert.deepEqual(harness.results.children.map(link => link.href), ['/brand/', '/generic/']);
  await harness.input('not found');
  assert.equal(harness.results.textContent, 'No matching docs.');
  await harness.input('k');
  assert.equal(harness.results.children.length, 0);
  assert.equal(harness.results.textContent, '');
});

test('search failures remain visible and can be retried', async () => {
  let calls = 0;
  const harness = searchHarness([], async () => {
    if (++calls === 1) throw new Error('Offline');
    return { ok: true, json: async () => [{ title: 'SMB guide', text: 'Setup', url: '/guide/' }] };
  });

  await harness.input('smb');
  assert.equal(harness.results.textContent, 'Search unavailable. Browse sections below.');
  await harness.input('smb');
  assert.equal(harness.results.children[0].href, '/guide/');
});

test('search labels inspected walkthroughs without claiming successful scan delivery', async () => {
  const harness = searchHarness([
    { title: 'Epson scan-to-SMB', text: 'ST-C8090', url: '/printers/epson/scan-to-smb/', status: 'needs-validation', context: 'Printers & copiers / Epson' },
  ]);
  await harness.input('epson smb');
  assert.equal(harness.results.children[0].children[0].textContent, 'Printers & copiers / Epson · Delivery test pending');
});
