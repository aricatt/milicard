# MiliCard 数据库还原脚本
# 用法: .\db_restore.ps1 -BackupFile "backups\milicard_production_xxx.sql"
# 将备份文件还原到本地开发数据库

param(
    [Parameter(Mandatory=$true)]
    [string]$BackupFile,
    
    [string]$DbHost = "localhost",
    [int]$DbPort = 5437,
    [string]$DbName = "milicard_dev",
    [string]$DbUser = "postgres",
    [string]$DbPassword = "840928"
)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "  MiliCard Database Restore" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

# 检查备份文件是否存在
if (-not (Test-Path $BackupFile)) {
    Write-Host "ERROR: Backup file not found: $BackupFile" -ForegroundColor Red
    exit 1
}

$fileSize = (Get-Item $BackupFile).Length
$fileSizeMB = [math]::Round($fileSize / 1MB, 2)

Write-Host "Backup file: $BackupFile" -ForegroundColor Yellow
Write-Host "File size:   $fileSizeMB MB" -ForegroundColor Yellow
Write-Host ""
Write-Host "Target database:" -ForegroundColor Yellow
Write-Host "  Host:     $DbHost" -ForegroundColor White
Write-Host "  Port:     $DbPort" -ForegroundColor White
Write-Host "  Database: $DbName" -ForegroundColor White
Write-Host "  User:     $DbUser" -ForegroundColor White
Write-Host ""

# 确认操作
Write-Host "WARNING: This will REPLACE all data in $DbName!" -ForegroundColor Red
$confirm = Read-Host "Continue? (y/N)"
if ($confirm -ne "y" -and $confirm -ne "Y") {
    Write-Host "Cancelled." -ForegroundColor Yellow
    exit 0
}

# 设置密码环境变量
$env:PGPASSWORD = $DbPassword

# 检查数据库连接
Write-Host ""
Write-Host "Checking database connection..." -ForegroundColor Cyan
try {
    & psql -h $DbHost -p $DbPort -U $DbUser -d "postgres" -c "SELECT 1" 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw "Connection failed"
    }
    Write-Host "[OK] Database connection successful" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Cannot connect to PostgreSQL at ${DbHost}:${DbPort}" -ForegroundColor Red
    Write-Host "Please make sure PostgreSQL is running." -ForegroundColor Yellow
    exit 1
}

# 断开现有连接并删除数据库
Write-Host "Dropping existing database..." -ForegroundColor Cyan
try {
    # 断开所有连接
    & psql -h $DbHost -p $DbPort -U $DbUser -d "postgres" -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$DbName' AND pid <> pg_backend_pid();" 2>$null
    
    # 删除数据库
    & psql -h $DbHost -p $DbPort -U $DbUser -d "postgres" -c "DROP DATABASE IF EXISTS `"$DbName`";" 2>$null
    Write-Host "[OK] Existing database dropped" -ForegroundColor Green
} catch {
    Write-Host "[WARN] Could not drop database (may not exist)" -ForegroundColor Yellow
}

# 创建新数据库
Write-Host "Creating new database..." -ForegroundColor Cyan
try {
    & psql -h $DbHost -p $DbPort -U $DbUser -d "postgres" -c "CREATE DATABASE `"$DbName`";"
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to create database"
    }
    Write-Host "[OK] Database created" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Failed to create database" -ForegroundColor Red
    exit 1
}

# 还原数据库
Write-Host "Restoring database (this may take a while)..." -ForegroundColor Cyan
try {
    & pg_restore -h $DbHost -p $DbPort -U $DbUser -d $DbName -v $BackupFile 2>&1 | ForEach-Object {
        if ($_ -match "error|ERROR") {
            Write-Host $_ -ForegroundColor Yellow
        }
    }
    Write-Host "[OK] Database restored" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Failed to restore database" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}

# 清理密码环境变量
$env:PGPASSWORD = $null

Write-Host ""
Write-Host "=============================================" -ForegroundColor Green
Write-Host "  Restore Completed!" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green
Write-Host ""
Write-Host "Database $DbName has been restored from $BackupFile" -ForegroundColor White
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Reset migration baseline:" -ForegroundColor White
Write-Host "     cd server" -ForegroundColor Gray
Write-Host "     .\reset_prisma_migrate.bat" -ForegroundColor Gray
Write-Host ""
Write-Host "  2. Generate Prisma client:" -ForegroundColor White
Write-Host "     npx prisma generate" -ForegroundColor Gray
Write-Host ""
Write-Host "  3. Start development server:" -ForegroundColor White
Write-Host "     npm run dev" -ForegroundColor Gray
Write-Host ""
