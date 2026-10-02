import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.dirname(require.resolve('swagger-ui-dist/package.json'));
const target = path.join(root, 'static/vendor/swagger-ui');
fs.mkdirSync(target, { recursive: true });
for (const file of ['swagger-ui.css', 'swagger-ui-bundle.js', 'LICENSE', 'NOTICE']) {
  if (fs.existsSync(path.join(source, file))) fs.copyFileSync(path.join(source, file), path.join(target, file));
}
console.log('Swagger UI assets and licensing copied locally; no CDN or external validator.');