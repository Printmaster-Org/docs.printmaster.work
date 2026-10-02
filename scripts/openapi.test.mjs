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
  assert.deepEqual(Object.keys(spec.paths).sort(), ['/api/v1/agents/list', '/api/v1/auth/login', '/api/v1/auth/logout', '/api/v1/auth/me', '/api/v1/devices/list', '/api/devices/metrics/history', '/api/devices/metrics/bounds', '/api/v1/alerts', '/api/v1/alerts/summary', '/api/v1/reports', '/api/v1/reports/types', '/api/v1/reports/summary', '/api/v1/tenants', '/api/v1/tenants/{tenantID}/sites'].sort());
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