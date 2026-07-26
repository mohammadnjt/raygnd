#!/bin/bash

# =======================
# Configuration
# =======================
BACKUP_DIR="/root/backups/mongodb"
CONTAINER_NAME="mongodb"
DATABASE_NAME="effi"
RETENTION_DAYS=3
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_PATH="$BACKUP_DIR/backup_$TIMESTAMP"
SCRIPT_PATH="/root/mongodb_backup.sh"
CRON_JOB="0 */6 * * * $SCRIPT_PATH >> /var/log/mongodb_backup.log 2>&1"

MONGO_IMAGE="mongo:latest"
MONGO_USER="admin"
MONGO_PASS="11112222"

ACCESS_FLAG_FILE="/root/mongodb_access_status"

# =======================
# Colors & Logging
# =======================
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${GREEN}[$(date '+%F %T')]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }

# =======================
# Utils
# =======================
container_exists() {
  docker ps -a --format '{{.Names}}' | grep -q "^$CONTAINER_NAME$"
}

container_running() {
  docker ps --format '{{.Names}}' | grep -q "^$CONTAINER_NAME$"
}

# =======================
# Backup
# =======================
backup_mongodb() {
  log "Starting backup..."
  mkdir -p "$BACKUP_PATH"

  docker exec "$CONTAINER_NAME" mongodump \
    --db="$DATABASE_NAME" \
    --username="$MONGO_USER" \
    --password="$MONGO_PASS" \
    --authenticationDatabase=admin \
    --out=/tmp/backup || return 1

  docker cp "$CONTAINER_NAME":/tmp/backup "$BACKUP_PATH"
  docker exec "$CONTAINER_NAME" rm -rf /tmp/backup

  tar -czf "$BACKUP_DIR/backup_$TIMESTAMP.tar.gz" -C "$BACKUP_PATH" .
  rm -rf "$BACKUP_PATH"

  ln -sf "$BACKUP_DIR/backup_$TIMESTAMP.tar.gz" "$BACKUP_DIR/latest_backup.tar.gz"
  log "Backup completed"
}

# =======================
# Restore
# =======================
restore_mongodb() {
  [ ! -f "$BACKUP_DIR/latest_backup.tar.gz" ] && error "No backup found" && exit 1

  RESTORE_DIR="$BACKUP_DIR/restore_$TIMESTAMP"
  mkdir -p "$RESTORE_DIR"
  tar -xzf "$BACKUP_DIR/latest_backup.tar.gz" -C "$RESTORE_DIR"

  docker stop "$CONTAINER_NAME"

  docker start "$CONTAINER_NAME"
  sleep 3

  docker cp "$RESTORE_DIR" "$CONTAINER_NAME":/tmp/restore
  docker exec "$CONTAINER_NAME" mongorestore \
    --drop \
    --db="$DATABASE_NAME" \
    --username="$MONGO_USER" \
    --password="$MONGO_PASS" \
    --authenticationDatabase=admin \
    /tmp/restore

  docker exec "$CONTAINER_NAME" rm -rf /tmp/restore
  rm -rf "$RESTORE_DIR"

  log "Restore completed"
}

# =======================
# Port Toggle (🔥 NEW)
# =======================
recreate_container() {
  MODE=$1
  log "Switching MongoDB access mode: $MODE"

  docker stop "$CONTAINER_NAME" 2>/dev/null
  docker rm "$CONTAINER_NAME" 2>/dev/null

  if [ "$MODE" = "external" ]; then
    docker run -d \
      --name "$CONTAINER_NAME" \
      --restart unless-stopped \
      -p 27017:27017 \
      -e MONGO_INITDB_ROOT_USERNAME="$MONGO_USER" \
      -e MONGO_INITDB_ROOT_PASSWORD="$MONGO_PASS" \
      "$MONGO_IMAGE"

    echo "EXTERNAL" > "$ACCESS_FLAG_FILE"

  else
    docker run -d \
      --name "$CONTAINER_NAME" \
      --restart unless-stopped \
      -p 127.0.0.1:27017:27017 \
      -e MONGO_INITDB_ROOT_USERNAME="$MONGO_USER" \
      -e MONGO_INITDB_ROOT_PASSWORD="$MONGO_PASS" \
      "$MONGO_IMAGE"

    echo "LOCAL" > "$ACCESS_FLAG_FILE"
  fi

  log "MongoDB restarted in $MODE mode"
}

# =======================
# Cleanup
# =======================
clean_old_backups() {
  find "$BACKUP_DIR" -name "backup_*.tar.gz" -mtime +$RETENTION_DAYS -delete
}

# =======================
# Status
# =======================
status() {
  log "MongoDB Status"
  container_running && log "✓ Container running" || error "✗ Container stopped"
  [ -f "$ACCESS_FLAG_FILE" ] && log "Access: $(cat $ACCESS_FLAG_FILE)" || warn "Unknown access mode"
}

# =======================
# Cron
# =======================
setup_cron() {
  chmod +x "$SCRIPT_PATH"
  (crontab -l 2>/dev/null | grep -v "$SCRIPT_PATH"; echo "$CRON_JOB") | crontab -
  log "Cron job installed"
}

remove_cron() {
  (crontab -l 2>/dev/null | grep -v "$SCRIPT_PATH") | crontab -
  log "Cron job removed"
}

# =======================
# Main
# =======================
case "$1" in
  backup|"")
    backup_mongodb
    clean_old_backups
    ;;
  restore)
    restore_mongodb
    ;;
  external)
    recreate_container external
    ;;
  local)
    recreate_container local
    ;;
  status)
    status
    ;;
  cron-start)
    setup_cron
    ;;
  cron-stop)
    remove_cron
    ;;
  *)
    echo "Usage:"
    echo "  backup | restore"
    echo "  external | local"
    echo "  status"
    echo "  cron-start | cron-stop"
    ;;
esac

