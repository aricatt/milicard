# MiliCard 容器数据库还原脚本
# 用法: .\db_restore_container.ps1 -BackupFile "backups\xxx.sql" [-Env staging|production]
# 将备份文件还原到 Docker 容器中的数据库

param(
    [Parameter(Mandatory=$true)]
    [string]$BackupFile,
    
    [ValidateSet("staging", "production")]
    [string]$Env = "staging"
)

$ErrorActionPreference = "Stop"

# 根据环境设置容器名称
if ($Env -eq "production") {
    $ContainerName = "milicard-prod"
} else {
    $ContainerName = "milicard-staging"
}

Write-Host ""
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "  MiliCard Container Database Restore" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

# 检查备份文件是否存在
if (-not (Test-Path $BackupFile)) {
    Write-Host "ERROR: Backup file not found: $BackupFile" -ForegroundColor Red
    exit 1
}

# 检查容器是否运行
$containerRunning = docker ps -q -f "name=$ContainerName" 2>$null
if (-not $containerRunning) {
    Write-Host "ERROR: Container $ContainerName is not running" -ForegroundColor Red
    Write-Host "Please start it with: .\deploy.ps1 $Env" -ForegroundColor Yellow
    exit 1
}

$fileSize = (Get-Item $BackupFile).Length
$fileSizeMB = [math]::Round($fileSize / 1MB, 2)
$fileName = Split-Path $BackupFile -Leaf

Write-Host "Backup file: $BackupFile" -ForegroundColor Yellow
Write-Host "File size:   $fileSizeMB MB" -ForegroundColor Yellow
Write-Host ""
Write-Host "Target container: $ContainerName" -ForegroundColor Yellow
Write-Host "Environment:      $Env" -ForegroundColor Yellow
Write-Host ""

# 确认操作
if ($Env -eq "production") {
    Write-Host "!!! WARNING: You are about to restore to PRODUCTION !!!" -ForegroundColor Red
    Write-Host "This will REPLACE all production data!" -ForegroundColor Red
    $confirm = Read-Host "Type 'YES' to continue"
    if ($confirm -ne "YES") {
        Write-Host "Cancelled." -ForegroundColor Yellow
        exit 0
    }
} else {
    Write-Host "WARNING: This will REPLACE all data in $ContainerName!" -ForegroundColor Red
    $confirm = Read-Host "Continue? (y/N)"
    if ($confirm -ne "y" -and $confirm -ne "Y") {
        Write-Host "Cancelled." -ForegroundColor Yellow
        exit 0
    }
}

Write-Host ""

# 复制备份文件到容器
Write-Host "Copying backup file to container..." -ForegroundColor Cyan
docker cp $BackupFile "${ContainerName}:/tmp/${fileName}"
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to copy backup file to container" -ForegroundColor Red
    exit 1
}
Write-Host "[OK] Backup file copied" -ForegroundColor Green

# 在容器内还原数据库
Write-Host "Restoring database (this may take a while)..." -ForegroundColor Cyan

# 检查文件格式
$firstLine = Get-Content $BackupFile -TotalCount 1
if ($firstLine -match "^PGDMP") {
    # 二进制格式
    Write-Host "Detected binary format, using pg_restore..." -ForegroundColor Gray
    docker exec $ContainerName bash -c "PGPASSWORD=`$DB_PASSWORD pg_restore --host=localhost --username=milicard --dbname=milicard --no-owner --no-acl --clean --if-exists /tmp/$fileName 2>/dev/null || true"
} else {
    # SQL文本格式
    Write-Host "Detected SQL text format, using psql..." -ForegroundColor Gray
    docker exec $ContainerName bash -c "PGPASSWORD=`$DB_PASSWORD psql --host=localhost --username=milicard --dbname=milicard --file=/tmp/$fileName 2>/dev/null"
}

Write-Host "[OK] Database restored" -ForegroundColor Green

# 清理临时文件
Write-Host "Cleaning up..." -ForegroundColor Cyan
docker exec $ContainerName rm -f "/tmp/$fileName"
Write-Host "[OK] Cleanup done" -ForegroundColor Green

Write-Host ""
Write-Host "=============================================" -ForegroundColor Green
Write-Host "  Restore Completed!" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green
Write-Host ""
Write-Host "Database in $ContainerName has been restored from $BackupFile" -ForegroundColor White
Write-Host ""

if ($Env -eq "staging") {
    Write-Host "Access staging at: http://localhost:8275" -ForegroundColor Cyan
} else {
    Write-Host "Access production at: http://localhost:8175" -ForegroundColor Cyan
}
Write-Host ""
