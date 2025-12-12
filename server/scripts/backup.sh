#!/bin/sh
# ExcaliNote CouchDB Backup Script
# Wird vom Backup-Container per Cron ausgeführt

set -e

BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/excalinote_backup_${DATE}.tar.gz"

echo "[$(date)] Starting backup..."

# CouchDB Daten sichern
tar -czf "${BACKUP_FILE}" -C /data couchdb

# Alte Backups löschen (Standard: 30 Tage)
find "${BACKUP_DIR}" -name "excalinote_backup_*.tar.gz" -mtime +${BACKUP_RETENTION_DAYS:-30} -delete

echo "[$(date)] Backup completed: ${BACKUP_FILE}"
echo "[$(date)] Backup size: $(du -h ${BACKUP_FILE} | cut -f1)"

# Liste verbleibender Backups
echo "[$(date)] Current backups:"
ls -lh "${BACKUP_DIR}"/excalinote_backup_*.tar.gz 2>/dev/null || echo "No backups found"
