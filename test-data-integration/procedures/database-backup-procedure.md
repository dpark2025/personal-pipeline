# Database Backup and Recovery Procedure

## Purpose
Create reliable database backups and validate recovery procedures.

## Prerequisites
- Database administrative access
- Sufficient storage space for backup
- Maintenance window scheduled
- Application write access coordination

## Procedure Steps

### Step 1: Pre-Backup Preparation (5 minutes)
```bash
# Check database status
mysql -e "SHOW PROCESSLIST;"
mysql -e "SHOW ENGINE INNODB STATUS\G" | grep -A 20 "TRANSACTIONS"

# Verify disk space
df -h /backup/location

# Stop application writes (coordinate with team)
curl -X POST http://application:8080/maintenance/start
```

**Expected Outcome**: Database ready for backup, application in maintenance mode
**Success Criteria**: No active long-running transactions, sufficient disk space

### Step 2: Create Database Backup (15 minutes)
```bash
# Create timestamped backup
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="/backup/db_backup_${TIMESTAMP}.sql"

# Perform backup with consistency
mysqldump --single-transaction --routines --triggers --all-databases > $BACKUP_FILE

# Compress backup
gzip $BACKUP_FILE

# Verify backup file created
ls -lh "${BACKUP_FILE}.gz"
```

**Expected Outcome**: Complete database backup created and compressed
**Success Criteria**: Backup file exists and has reasonable size

### Step 3: Backup Validation (10 minutes)
```bash
# Check backup integrity
gunzip -t "${BACKUP_FILE}.gz"

# Verify backup contents
zcat "${BACKUP_FILE}.gz" | head -50
zcat "${BACKUP_FILE}.gz" | tail -50

# Test restore on test database (if available)
mysql test_db < <(zcat "${BACKUP_FILE}.gz")
mysql test_db -e "SELECT COUNT(*) FROM important_table;"
```

**Expected Outcome**: Backup integrity confirmed
**Success Criteria**: Backup can be read and contains expected data

### Step 4: Secure Backup Storage (5 minutes)
```bash
# Copy to secure location
rsync -av "${BACKUP_FILE}.gz" backup-server:/secure/backups/

# Verify remote copy
ssh backup-server "ls -lh /secure/backups/db_backup_${TIMESTAMP}.sql.gz"

# Set proper permissions
chmod 600 "${BACKUP_FILE}.gz"
ssh backup-server "chmod 600 /secure/backups/db_backup_${TIMESTAMP}.sql.gz"
```

**Expected Outcome**: Backup securely stored in multiple locations
**Success Criteria**: Backup available on primary and backup storage

### Step 5: Resume Operations (2 minutes)
```bash
# Resume application writes
curl -X POST http://application:8080/maintenance/stop

# Verify application functionality
curl -f http://application:8080/health
curl -f http://application:8080/api/test

# Check database performance
mysql -e "SHOW PROCESSLIST;"
```

**Expected Outcome**: Normal operations resumed
**Success Criteria**: Application responding normally, database performance good

## Recovery Procedure

### Emergency Recovery Steps
```bash
# Stop application
curl -X POST http://application:8080/maintenance/start

# Restore from backup
zcat /backup/db_backup_${TIMESTAMP}.sql.gz | mysql

# Verify data integrity
mysql -e "CHECK TABLE important_table;"

# Resume application
curl -X POST http://application:8080/maintenance/stop
```

## Success Criteria
- [ ] Backup completed without errors
- [ ] Backup integrity verified
- [ ] Backup stored securely
- [ ] Application downtime minimized
- [ ] Recovery procedure tested
- [ ] Documentation updated

## Monitoring and Alerting
- Backup completion notification
- Backup size monitoring
- Automated integrity checking
- Recovery time objectives met

## Disaster Recovery Integration
- Offsite backup replication
- Cross-region backup storage
- Automated recovery testing
- Business continuity planning
