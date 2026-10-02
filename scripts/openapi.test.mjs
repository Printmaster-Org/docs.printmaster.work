import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import SwaggerParser from '@apidevtools/swagger-parser';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
test('OpenAPI validates and covers only reviewed server operations', async () => {
  const spec = await SwaggerParser.validate(path.join(root, 'static/openapi/server.yaml'));
  assert.equal(spec.openapi, '3.0.3');
  assert.deepEqual(Object.keys(spec.paths).sort(), ['/api/v1/agents/list', '/api/v1/auth/login', '/api/v1/auth/logout', '/api/v1/auth/me', '/api/v1/devices/list'].sort());
  assert.deepEqual(spec.paths['/api/v1/auth/login'].post.security, []);
  assert.equal(spec.components.securitySchemes.sessionCookie.name, 'pm_session');
  assert.equal(spec.components.securitySchemes.sessionBearer.scheme, 'bearer');
  const ids = Object.values(spec.paths).flatMap(item => Object.values(item).map(op => op.operationId));
  assert.equal(new Set(ids).size, ids.length);
});
test('public viewer cannot execute requests or send spec to external validator', () => {
  const js = fs.readFileSync(path.join(root, 'assets/js/openapi.js'), 'utf8');
  assert.ok(js.includes('supportedSubmitMethods: []'));
  assert.ok(js.includes('validatorUrl: null'));
  assert.ok(js.includes('persistAuthorization: false'));
});