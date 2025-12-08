# MiliCard 数据库导出脚本
# 用法: .\db_export.ps1 [staging|production]
# 从 Docker 容器中导出数据库备份

param(
    [ValidateSet("staging", "production")]
    [string]$Env = "production"
)

$ErrorActionPreference = "Stop"

# 配置
if ($Env -eq "production") {
    $CONTAINER_NAME = "milicard-prod"
} else {
    $CONTAINER_NAME = "milicard-staging"
}

$BACKUP_DIR = "backups"
$TIMESTAMP = Get-Date -Format "yyyyMMdd_HHmmss"
$BACKUP_FILE = "milicard_${Env}_${TIMESTAMP}.sql"

Write-Host ""
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "  MiliCard Database Export" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Environment: $Env" -ForegroundColor Yellow
Write-Host "Container:   $CONTAINER_NAME" -ForegroundColor Yellow
Write-Host ""

# 检查容器是否运行
$containerRunning = docker ps --filter "name=$CONTAINER_NAME" --format "{{.Names}}" 2>$null
if (-not $containerRunning) {
    Write-Host "ERROR: Container $CONTAINER_NAME is not running." -ForegroundColor Red
    Write-Host "Please start the container first: .\deploy.ps1 $Env" -ForegroundColor Yellow
    exit 1
}

# 创建备份目录
if (-not (Test-Path $BACKUP_DIR)) {
    New-Item -ItemType Directory -Path $BACKUP_DIR | Out-Null
    Write-Host "Created backup directory: $BACKUP_DIR" -ForegroundColor Green
}

# 导出数据库
Write-Host "Exporting database..." -ForegroundColor Cyan
try {
    docker exec $CONTAINER_NAME su - postgres -c "pg_dump -Fc milicard" > "$BACKUP_DIR\$BACKUP_FILE"
    
    $fileSize = (Get-Item "$BACKUP_DIR\$BACKUP_FILE").Length
    $fileSizeMB = [math]::Round($fileSize / 1MB, 2)
    
    Write-Host ""
    Write-Host "=============================================" -ForegroundColor Green
    Write-Host "  Export Completed!" -ForegroundColor Green
    Write-Host "=============================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Backup file: $BACKUP_DIR\$BACKUP_FILE" -ForegroundColor White
    Write-Host "File size:   $fileSizeMB MB" -ForegroundColor White
    Write-Host ""
    Write-Host "To restore to local dev environment:" -ForegroundColor Yellow
    Write-Host "  .\db_restore.ps1 -BackupFile `"$BACKUP_DIR\$BACKUP_FILE`"" -ForegroundColor White
    Write-Host ""
} catch {
    Write-Host "ERROR: Failed to export database." -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}
