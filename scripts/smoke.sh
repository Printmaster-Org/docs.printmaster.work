#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
image="${1:-printmaster-docs:local}"
container=$(docker run -d --read-only --tmpfs /tmp:uid=101,gid=101,mode=1777 \
  --cap-drop ALL --security-opt no-new-privileges:true "$image")
trap 'docker rm -f "$container" >/dev/null' EXIT
docker cp "$container:/usr/share/nginx/html/." ./public
node scripts/check-site.mjs public
docker exec "$container" nginx -t
docker exec "$container" wget -q -O - http://127.0.0.1:8080/healthz
docker exec "$container" wget -q -O - http://127.0.0.1:8080/guides/install/ >/dev/null
docker exec "$container" wget -q -O - http://127.0.0.1:8080/index.json >/dev/null
docker exec "$container" sh -c 'if wget -q -O /dev/null http://127.0.0.1:8080/not-a-doc/; then exit 1; fi'
echo 'Container smoke checks passed: read-only/non-root runtime, health, docs, search, real 404.'