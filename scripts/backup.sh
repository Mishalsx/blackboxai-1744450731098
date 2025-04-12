#!/bin/sh

# Configuration
BACKUP_DIR="/backups"
MONGODB_URI=${MONGODB_URI:-"mongodb://mongodb:27017/mazufa-records"}
BACKUP_RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-7}
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="backup_${DATE}"
LOG_FILE="${BACKUP_DIR}/backup.log"

# Ensure backup directory exists
mkdir -p ${BACKUP_DIR}

# Log function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a ${LOG_FILE}
}

# Cleanup old backups
cleanup_old_backups() {
    log "Cleaning up backups older than ${BACKUP_RETENTION_DAYS} days..."
    find ${BACKUP_DIR} -type f -name "backup_*" -mtime +${BACKUP_RETENTION_DAYS} -delete
    find ${BACKUP_DIR} -type f -name "*.log" -mtime +${BACKUP_RETENTION_DAYS} -delete
}

# Backup function
perform_backup() {
    log "Starting MongoDB backup..."
    
    # Create backup
    mongodump --uri="${MONGODB_URI}" \
              --gzip \
              --archive="${BACKUP_DIR}/${BACKUP_NAME}.gz" \
              --excludeCollection=system.profile \
              2>> ${LOG_FILE}

    if [ $? -eq 0 ]; then
        log "Backup completed successfully: ${BACKUP_NAME}.gz"
        
        # Calculate backup size
        BACKUP_SIZE=$(du -h "${BACKUP_DIR}/${BACKUP_NAME}.gz" | cut -f1)
        log "Backup size: ${BACKUP_SIZE}"

        # Create checksum
        cd ${BACKUP_DIR}
        sha256sum "${BACKUP_NAME}.gz" > "${BACKUP_NAME}.gz.sha256"
        log "Checksum created: ${BACKUP_NAME}.gz.sha256"

        # Upload to S3 if configured
        if [ ! -z "${AWS_S3_BUCKET}" ]; then
            log "Uploading backup to S3..."
            aws s3 cp "${BACKUP_DIR}/${BACKUP_NAME}.gz" \
                "s3://${AWS_S3_BUCKET}/mongodb-backups/${BACKUP_NAME}.gz" \
                --storage-class STANDARD_IA \
                2>> ${LOG_FILE}

            aws s3 cp "${BACKUP_DIR}/${BACKUP_NAME}.gz.sha256" \
                "s3://${AWS_S3_BUCKET}/mongodb-backups/${BACKUP_NAME}.gz.sha256" \
                2>> ${LOG_FILE}

            if [ $? -eq 0 ]; then
                log "Backup uploaded to S3 successfully"
            else
                log "Error uploading backup to S3"
            fi
        fi

    else
        log "Error creating backup"
        exit 1
    fi
}

# Verify backup function
verify_backup() {
    log "Verifying backup integrity..."
    
    cd ${BACKUP_DIR}
    if sha256sum -c "${BACKUP_NAME}.gz.sha256"; then
        log "Backup verification successful"
    else
        log "Backup verification failed"
        exit 1
    fi

    # Test restore to temporary database
    log "Testing backup restore..."
    mongorestore --uri="${MONGODB_URI}_test" \
                --gzip \
                --archive="${BACKUP_DIR}/${BACKUP_NAME}.gz" \
                --drop \
                2>> ${LOG_FILE}

    if [ $? -eq 0 ]; then
        log "Backup restore test successful"
    else
        log "Backup restore test failed"
        exit 1
    fi
}

# Send notification function
send_notification() {
    if [ ! -z "${NOTIFICATION_URL}" ]; then
        log "Sending backup notification..."
        
        # Prepare notification payload
        PAYLOAD=$(cat <<EOF
{
    "backup": "${BACKUP_NAME}",
    "size": "${BACKUP_SIZE}",
    "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
    "status": "$1",
    "message": "$2"
}
EOF
)

        # Send notification
        curl -X POST \
             -H "Content-Type: application/json" \
             -d "${PAYLOAD}" \
             ${NOTIFICATION_URL} \
             2>> ${LOG_FILE}
    fi
}

# Main backup process
main() {
    # Start backup process
    log "=== Starting backup process ==="

    # Cleanup old backups
    cleanup_old_backups

    # Perform backup
    perform_backup

    # Verify backup
    verify_backup

    # Send success notification
    send_notification "success" "Backup completed successfully"

    log "=== Backup process completed ==="
}

# Error handler
handle_error() {
    log "Error occurred in backup process"
    send_notification "error" "Backup failed: $1"
    exit 1
}

# Set error handler
trap 'handle_error "$BASH_COMMAND"' ERR

# Run main process
main

# If BACKUP_CRON_SCHEDULE is set, start cron daemon
if [ ! -z "${BACKUP_CRON_SCHEDULE}" ]; then
    log "Starting cron daemon with schedule: ${BACKUP_CRON_SCHEDULE}"
    echo "${BACKUP_CRON_SCHEDULE} /backup.sh" > /etc/crontabs/root
    crond -f -l 2
else
    log "No cron schedule set, exiting after single backup"
fi
