import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import SwaggerParser from '@apidevtools/swagger-parser';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
test('Server OpenAPI validates and covers reviewed integration operations', async () => {
  const spec = await SwaggerParser.validate(path.join(root, 'static/openapi/server.yaml'));
  assert.equal(spec.openapi, '3.0.3');
  assert.deepEqual(Object.keys(spec.paths).sort(), ['/api/v1/agents/list', '/api/v1/auth/login', '/api/v1/auth/logout', '/api/v1/auth/me', '/api/v1/devices/list', '/api/v1/devices/index', '/api/v1/devices/rows', '/api/v1/devices/metrics/query', '/api/devices/metrics/history', '/api/devices/metrics/bounds', '/api/v1/alerts', '/api/v1/alerts/summary', '/api/v1/reports', '/api/v1/reports/types', '/api/v1/reports/summary', '/api/v1/tenants', '/api/v1/tenants/{tenantID}/sites'].sort());
  assert.deepEqual(spec.paths['/api/v1/auth/login'].post.security, []);
  assert.equal(spec.components.securitySchemes.sessionCookie.name, 'pm_session');
  assert.equal(spec.components.securitySchemes.sessionBearer.scheme, 'bearer');
  const ids = Object.values(spec.paths).flatMap(item => Object.values(item).map(op => op.operationId));
  assert.equal(new Set(ids).size, ids.length);
});
test('Agent OpenAPI uses local credentials, independent routes, and public version only', async () => {
  const spec = await SwaggerParser.validate(path.join(root, 'static/openapi/agent.yaml'));
  assert.deepEqual(Object.keys(spec.paths).sort(), ['/devices/list', '/devices/discovered', '/api/devices/profile', '/api/devices/metrics/latest', '/api/devices/metrics/history', '/api/devices/metrics/bounds', '/api/version'].sort());
  assert.ok(Object.values(spec.components.securitySchemes).some(scheme => scheme.in === 'cookie' && scheme.name === 'pm_agent_session'));
  assert.ok(!Object.values(spec.components.securitySchemes).some(scheme => scheme.scheme === 'bearer'));
  assert.deepEqual(spec.paths['/api/version'].get.security, []);
  for (const [route, item] of Object.entries(spec.paths)) {
    if (route !== '/api/version') assert.notDeepEqual(item.get.security, []);
  }
});
test('Server inventory addition records committed provenance and explicit operation scope', async () => {
  const spec = await SwaggerParser.validate(path.join(root, 'static/openapi/server.yaml'));
  assert.equal(spec.info.version, '0.3.0');
  assert.equal(spec['x-reviewed-commit'], 'bdf1f8fea22e91d490238d9ab266f2690070c82d');
  assert.match(spec['x-review-notes'], /committed PrintMaster security hardening/);
  assert.match(spec['x-review-notes'], /source revision, not a release/);
  assert.doesNotMatch(spec['x-review-notes'], /uncommitted|working.tree|source base/);
  assert.equal(Object.keys(spec.paths).length, 17);
  for (const route of ['/api/v1/alerts', '/api/v1/reports', '/api/v1/reports/types', '/api/v1/reports/summary']) {
    assert.ok(spec.paths[route].get.responses['403'], `${route} needs denial response`);
  }
  assert.match(spec.paths['/api/v1/devices/list'].get.description, /zero matching agents/);
  assert.match(spec.paths['/api/v1/alerts'].get.description, /before pagination and totals/);
  assert.match(spec.paths['/api/v1/reports'].get.description, /every stored tenant ID/);
  assert.match(spec.paths['/api/v1/reports/summary'].get.description, /Legacy\/unmarked and global runs are admin-only/);
  for (const [route, collection] of [['/api/v1/alerts', 'alerts'], ['/api/v1/reports', 'reports']]) {
    const schema = spec.paths[route].get.responses['200'].content['application/json'].schema.properties[collection];
    assert.equal(schema.type, 'array');
    assert.notEqual(schema.nullable, true);
  }
  const denied = spec.paths['/api/v1/alerts'].get.responses['403'].content;
  assert.ok(denied['text/plain']);
  assert.ok(denied['application/json']);
  const summary = spec.paths['/api/v1/alerts/summary'].get;
  assert.equal(summary.parameters[0].name, 'tenant_id');
  assert.match(summary.description, /Empty restricted/);
});
test('progressive inventory separates lightweight index, row data and lazy metrics', async () => {
  const spec = await SwaggerParser.validate(path.join(root, 'static/openapi/server.yaml'));
  const revision = 'bdf1f8fea22e91d490238d9ab266f2690070c82d';
  const legacy = spec.paths['/api/v1/devices/list'].get;
  assert.deepEqual(legacy['x-source'], {path: 'server/main.go', handler: 'handleDevicesList', commit: revision});
  assert.match(spec['x-review-notes'], /Other operations retain the 864fc3ee040bbb28f25d779c69512c5b6999d421 review/);
  for (const [route, method] of [['/api/v1/devices/index', 'get'], ['/api/v1/devices/rows', 'post'], ['/api/v1/devices/metrics/query', 'post']]) {
    const op = spec.paths[route][method];
    assert.equal(op['x-source'].path, 'server/inventory_api.go');
    assert.equal(op['x-source'].commit, revision);
    assert.equal(op['x-source'].handler, {'/api/v1/devices/index': 'handleDevicesIndex', '/api/v1/devices/rows': 'handleDevicesRows', '/api/v1/devices/metrics/query': 'handleDevicesMetricsQuery'}[route]);
    assert.equal(op.responses['200'].content['application/json'].schema.type, 'array');
    assert.notEqual(op.responses['200'].content['application/json'].schema.nullable, true);
    for (const code of ['401', '403', '405', '500']) assert.ok(op.responses[code]);
    assert.match(op.description, /[Vv]iewer/);
    if (method === 'post') {
      assert.ok(op.responses['400']);
      const keys = op.requestBody.content['application/json'].schema;
      assert.deepEqual(keys.required, ['serials']);
      assert.equal(keys.additionalProperties, false);
      assert.equal(keys.properties.serials['x-max-distinct-items'], 100);
      assert.equal(keys.properties.serials.uniqueItems, undefined);
      assert.equal(keys.properties.serials.maxItems, undefined, 'duplicates do not consume distinct-key limit');
      assert.equal(keys.properties.serials.items.minLength, 1);
      assert.equal(keys.properties.serials.items.pattern, '\\S');
      assert.match(op.requestBody.description, /65536 bytes/);
    }
  }
  const index = spec.components.schemas.DeviceIndex;
  assert.deepEqual(Object.keys(index.properties).sort(), ['serial', 'agent_id', 'ip', 'manufacturer', 'model', 'hostname', 'location', 'asset_number', 'last_seen', 'status_messages', 'device_type', 'source_type', 'is_usb', 'spooler_status', 'page_count'].sort());
  assert.deepEqual(index.required.sort(), Object.keys(index.properties).sort());
  assert.equal(index.additionalProperties, false);
  assert.equal(index.properties.page_count.type, 'integer');
  assert.equal(index.properties.status_messages.type, 'array');
  assert.equal(index.properties.raw_data, undefined);
  assert.equal(index.properties.toner_levels, undefined);
  const row = spec.components.schemas.DeviceRow;
  assert.deepEqual(row.required, ['serial', 'agent_id', 'ip', 'last_seen', 'first_seen', 'created_at']);
  assert.deepEqual(Object.keys(row.properties).sort(), ['serial', 'agent_id', 'ip', 'manufacturer', 'model', 'hostname', 'firmware', 'mac_address', 'subnet_mask', 'gateway', 'consumables', 'status_messages', 'last_seen', 'first_seen', 'created_at', 'discovery_method', 'asset_number', 'location', 'description', 'web_ui_url', 'raw_data', 'device_type', 'source_type', 'is_usb', 'port_name', 'driver_name', 'is_default', 'is_shared', 'spooler_status', 'usb_webui_available', 'page_count'].sort());
  assert.ok(row.properties.raw_data);
  for (const field of ['toner_levels', 'color_pages', 'mono_pages', 'scan_count', 'last_metrics_at']) assert.equal(row.properties[field], undefined);
  assert.match(spec.paths['/api/v1/devices/list'].get.description, /SQL tenant predicate/);
  assert.match(spec.paths['/api/v1/devices/metrics/query'].post.description, /serial AND current agent_id/);
  const metrics = spec.components.schemas.InventoryMetrics;
  assert.equal(metrics.additionalProperties, false);
  assert.deepEqual(metrics.required, ['id', 'serial', 'timestamp']);
  assert.deepEqual(Object.keys(metrics.properties).sort(), ['id', 'serial', 'agent_id', 'timestamp', 'page_count', 'color_pages', 'mono_pages', 'scan_count', 'toner_levels'].sort());
  assert.deepEqual(metrics.properties.id.enum, [0]);
  assert.deepEqual(spec.paths['/api/v1/devices/metrics/query'].post.responses['200'].content['application/json'].schema.items, metrics);
  assert.equal(legacy.responses['200'].content['application/json'].schema.oneOf[0].nullable, undefined);
  assert.deepEqual(legacy.responses['200'].content['application/json'].schema.oneOf[1].allOf[0].required, ['total_count', 'has_more', 'limit', 'offset']);
});
test('Server editorial coverage and revision match the inventory contract', async () => {
  const spec = await SwaggerParser.validate(path.join(root, 'static/openapi/server.yaml'));
  const methods = new Set(['get', 'post', 'put', 'patch', 'delete', 'head', 'options']);
  const count = Object.values(spec.paths).reduce((total, item) => total + Object.keys(item).filter(method => methods.has(method)).length, 0);
  assert.equal(count, 17);
  for (const file of ['README.md', 'API_MAINTENANCE.md', 'content/api/_index.md', 'content/api/openapi.md', 'content/api/inventory.md', 'content/guides/tenant-isolation.md']) {
    const text = fs.readFileSync(path.join(root, file), 'utf8');
    assert.match(text, /17(?:-operation| operations)|Seventeen operations/, file);
    assert.ok(text.includes(spec['x-reviewed-commit']), `${file}: missing newly reviewed revision`);
    assert.ok(text.includes(spec.info.version), `${file}: stale contract version`);
  }
});
test('both contracts retain per-operation source provenance and unique IDs', async () => {
  for (const name of ['server', 'agent']) {
    const spec = await SwaggerParser.validate(path.join(root, `static/openapi/${name}.yaml`));
    assert.match(spec['x-reviewed-commit'], /^[a-f0-9]{40}$/);
    const ids = [];
    for (const item of Object.values(spec.paths)) {
      for (const [method, op] of Object.entries(item)) {
        if (!['get', 'post', 'put', 'patch', 'delete'].includes(method)) continue;
        assert.ok(op['x-source']?.path);
        assert.ok(op['x-source']?.handler);
        ids.push(op.operationId);
      }
    }
    assert.equal(new Set(ids).size, ids.length);
  }
});
test('each reference selects its own local specification', () => {
  assert.ok(fs.readFileSync(path.join(root, 'layouts/_default/openapi.html'), 'utf8').includes('.Params.spec'));
  assert.ok(fs.readFileSync(path.join(root, 'content/api/agent.md'), 'utf8').includes('spec: openapi/agent.yaml'));
  assert.ok(fs.readFileSync(path.join(root, 'content/api/openapi.md'), 'utf8').includes('spec: openapi/server.yaml'));
});
test('public viewer cannot execute requests or send spec to external validator', () => {
  const js = fs.readFileSync(path.join(root, 'assets/js/openapi.js'), 'utf8');
  assert.ok(js.includes('supportedSubmitMethods: []'));
  assert.ok(js.includes('validatorUrl: null'));
  assert.ok(js.includes('persistAuthorization: false'));
});