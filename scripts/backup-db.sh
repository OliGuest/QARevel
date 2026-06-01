#!/usr/bin/env bash
#
# QARevel PostgreSQL backup
# --------------------------
# Dumps the qarevel database from the running postgres container, gzips it,
# and prunes backups older than RETENTION_DAYS.
#
# Usage:   ./scripts/backup-db.sh
# Cron:    0 3 * * *  /home/revelapps/qarevel/scripts/backup-db.sh >> /home/revelapps/qarevel/backups/backup.log 2>&1
#
# Env overrides:
#   BACKUP_DIR       (default: <repo>/backups)
#   PG_CONTAINER     (default: docker-postgres-1)
#   DB_NAME          (default: qarevel)
#   DB_USER          (default: qarevel)
#   RETENTION_DAYS   (default: 14)

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/backups}"
PG_CONTAINER="${PG_CONTAINER:-docker-postgres-1}"
DB_NAME="${DB_NAME:-qarevel}"
DB_USER="${DB_USER:-qarevel}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"

timestamp="$(date +%Y%m%d-%H%M%S)"
outfile="${BACKUP_DIR}/qarevel-${timestamp}.sql.gz"

mkdir -p "${BACKUP_DIR}"

# Fail loudly if the postgres container isn't running.
if ! docker ps --format '{{.Names}}' | grep -qx "${PG_CONTAINER}"; then
  echo "[$(date -Is)] ERROR: container '${PG_CONTAINER}' is not running; aborting backup." >&2
  exit 1
fi

echo "[$(date -Is)] Dumping ${DB_NAME} from ${PG_CONTAINER} -> ${outfile}"
# pg_dump streams to stdout; gzip on the host. --clean lets the dump be restored
# onto an existing database. Pipe status is checked via pipefail.
docker exec "${PG_CONTAINER}" pg_dump -U "${DB_USER}" --clean --if-exists "${DB_NAME}" \
  | gzip > "${outfile}"

size="$(du -h "${outfile}" | cut -f1)"
echo "[$(date -Is)] Backup complete: ${outfile} (${size})"

# Prune old backups.
deleted="$(find "${BACKUP_DIR}" -name 'qarevel-*.sql.gz' -type f -mtime "+${RETENTION_DAYS}" -print -delete | wc -l | tr -d ' ')"
echo "[$(date -Is)] Pruned ${deleted} backup(s) older than ${RETENTION_DAYS} days."

# To restore:  gunzip -c <file>.sql.gz | docker exec -i docker-postgres-1 psql -U qarevel -d qarevel
