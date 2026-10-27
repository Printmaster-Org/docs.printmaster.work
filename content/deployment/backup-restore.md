---
title: "Backup & restore"
description: "Back up and rehearse recovery for Docker-based PrintMaster Server deployments."
weight: 40
---

This guide covers the **Docker Server** and its database. It does not cover Agent databases or native Server installs. The commands below are source-reviewed but have not yet been rehearsed against a real deployment. A backup is not proven until it has been restored and checked in an isolated environment. Keep the existing deployment and its storage unchanged until that drill succeeds.

## Identify the database and persistent files

Before copying anything, identify the database driver, the exact SQLite path or PostgreSQL service, the Server image tag, and every mounted volume. Compose users can review `docker compose config` and `docker inspect printmaster-server`. The Server logs the selected driver and SQLite path at startup:

```bash
docker logs printmaster-server 2>&1 | grep "Using database"
```

For SQLite, do not assume the database is inside the mounted data directory. The current Server default can resolve to `/var/lib/printmaster/server.db`, while common Docker examples mount `/var/lib/printmaster/server`. For new deployments, set `SERVER_DB_PATH=/var/lib/printmaster/server/server.db`. For an existing deployment, back up the path shown in its startup log before changing configuration or recreating the container.

Protect the Compose file, `.env`, `config.toml`, TLS certificate/key files, and database dumps as sensitive data. They can contain credentials or private keys. Encrypt backups at rest, restrict access, and keep at least one copy outside the Docker host. Never attach a real backup to a public issue.

## SQLite

### Create a backup

The Server image includes the `sqlite3` CLI. Its `.backup` command uses SQLite's online backup API, so it can create a consistent snapshot while the Server is running. The commands below use the example container name `printmaster-server`; replace the database path with the exact path shown in your Server startup log.

```bash
set -e
mkdir -p backups
DB_PATH=/var/lib/printmaster/server/server.db
docker exec printmaster-server test -f "$DB_PATH"
docker exec printmaster-server rm -f /tmp/printmaster-server.db
docker exec printmaster-server sqlite3 "$DB_PATH" \
	".backup '/tmp/printmaster-server.db'"
integrity=$(docker exec printmaster-server sqlite3 /tmp/printmaster-server.db 'PRAGMA integrity_check;')
printf 'SQLite integrity check: %s\n' "$integrity"
test "$integrity" = "ok"
docker cp printmaster-server:/tmp/printmaster-server.db ./backups/server.db
docker exec printmaster-server rm /tmp/printmaster-server.db
```

The integrity check should print `ok`. Save `config.toml` and any TLS files from their mounted host paths separately; protect those files as secrets. Record the image tag, backup time, and exact database path. Do not use ordinary `cp` or `docker cp` on the live database file.

For a new Compose SQLite deployment, make the database location explicit on the Server service and retain its mounted data volume:

```yaml
services:
	printmaster-server:
		environment:
			SERVER_DB_DRIVER: sqlite
			SERVER_DB_PATH: /var/lib/printmaster/server/server.db
		volumes:
			- printmaster-data:/var/lib/printmaster/server
```

For an existing deployment using `/var/lib/printmaster/server.db`, do not just change the variable and restart: that would open a new, empty database. Stop the Server, copy the old file to the host, then copy it into the mounted directory in the same container:

```bash
docker compose stop server
mkdir -p backups
docker cp printmaster-server:/var/lib/printmaster/server.db ./backups/server.db
docker cp ./backups/server.db printmaster-server:/var/lib/printmaster/server/server.db
```

Set `SERVER_DB_PATH=/var/lib/printmaster/server/server.db` in the Compose configuration, then recreate the Server without removing its data volume:

```bash
docker compose up -d --force-recreate server
```

Check startup logs plus the inventory. Keep the pre-move backup until these checks pass. If they fail, stop the Server, restore the original configuration with `SERVER_DB_PATH=/var/lib/printmaster/server.db`, and start it against the original database.

### Restore and verify

Test restoration using a **new named volume** and a Server container with the same image version. Do not mount the recovery volume into production first.

1. Create a fresh volume and copy the saved SQLite snapshot into it:

```bash
docker volume create printmaster-server-restore
docker run --rm \
	-v printmaster-server-restore:/restore \
	-v "$PWD/backups:/backup:ro" \
	alpine:3.24 sh -c 'cp /backup/server.db /restore/server.db'
```

Add the matching `config.toml` and TLS files from their protected backup locations when the deployment uses them.

2. Start a test Server with no network access, no published ports, and the restore volume. Use the same image tag and database path as the source deployment:

```bash
IMAGE=ghcr.io/printmaster-org/printmaster-server:0.32.0
docker run -d --name printmaster-restore --network none \
	-v printmaster-server-restore:/var/lib/printmaster/server \
	-e DOCKER=true \
	-e SERVER_DB_DRIVER=sqlite \
	-e SERVER_DB_PATH=/var/lib/printmaster/server/server.db \
	-e BIND_ADDRESS=127.0.0.1 \
	"$IMAGE"
```

Replace the example image tag with the exact source version. For versions that do not support the shown `SERVER_DB_DRIVER` or `SERVER_DB_PATH` variables, use the matching config file instead.

3. Check startup logs and the built-in health probe. Then verify that expected users, tenants, agents, devices, and recent metrics are present. The isolated test has no network access, so agents cannot reconnect and configured external integrations cannot send data.

```bash
docker logs printmaster-restore
docker exec printmaster-restore /printmaster-server --health
```

Remove the test container and volume only after recording the result. For production recovery, stop the production Server, preserve its current volume as a separate rollback copy, switch to a copy of the tested restore volume, then start the same image version. Verify login and representative inventory before allowing Agents to reconnect. Roll back by switching to the preserved original volume; do not overwrite the only copy.

## PostgreSQL and TimescaleDB

The database is stored in the separate `db` service volume, not the Server's `/var/lib/printmaster/server` volume. Stop the Server to prevent writes, but leave the database running while taking a logical dump. Replace the example role/database names with the values in your Compose file.

```bash
set -e
mkdir -p backups/server-data
docker compose stop server
docker compose exec -T db pg_dump -U printmaster -d printmaster -Fc > backups/printmaster.dump
docker compose exec -T db pg_dumpall -U printmaster --globals-only > backups/postgres-globals.sql
docker cp printmaster-server:/var/lib/printmaster/server/. ./backups/server-data/
docker compose start server
```

Store the globals dump and Compose secrets securely. Record the PostgreSQL major version, exact database image tag/digest, and, for TimescaleDB, the extension version:

```bash
docker compose exec -T db psql -U printmaster -d printmaster \
	-c "SELECT extversion FROM pg_extension WHERE extname = 'timescaledb';"
```

Do not treat a live copy of the PostgreSQL data volume as a backup. A filesystem snapshot is valid only when the database is stopped and the storage platform guarantees a consistent snapshot. Keep the logical dump even if you also take volume snapshots.

### Test a PostgreSQL restore

For standard PostgreSQL without TimescaleDB, restore into a new database in an isolated test cluster. Do not restore over the production database. The example uses the same Compose `db` service and application role as the backup commands:

```bash
docker compose exec -T db createdb -U printmaster printmaster_restore_test
docker compose exec -T db pg_restore --no-owner --no-privileges \
	-U printmaster -d printmaster_restore_test < backups/printmaster.dump
docker compose exec -T db psql -U printmaster -d printmaster_restore_test -c '\dt'
```

Require `pg_restore` to exit successfully. Confirm the expected tables exist and compare key row counts with the source. Drop only the test database after recording the result:

```bash
docker compose exec -T db dropdb -U printmaster printmaster_restore_test
```

For TimescaleDB, use the same PostgreSQL major version and matching TimescaleDB extension version as the dump. Follow the version checks and `timescaledb_pre_restore()` / `timescaledb_post_restore()` sequence in [PostgreSQL and TimescaleDB upgrades](/deployment/database-upgrade/); do not ignore restore errors or apply the generic commands above to the TimescaleDB dump.

The globals dump contains role definitions and may include password hashes. Restore only the objects you need, with appropriate database-administrator privileges; do not blindly apply it over an existing production cluster.

## Recovery limits

- This guide is for Server data, not the Agent's local database or discovered-device cache.
- A container image rollback does not roll back a database schema migration. Follow the [database upgrade guide](/deployment/database-upgrade/) for PostgreSQL major-version changes and retain the original database volume until migration verification is complete.
- Do not run `docker compose down -v` during backup, restore, or rollback. It can delete named volumes.
- A successful dump or `integrity_check` is not a restore test. Record when the isolated recovery test last passed and repeat it after database, image, volume, or Compose changes.
