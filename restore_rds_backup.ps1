# MiliCard RDS备份还原脚本
# 用法: .\restore_rds_backup.ps1 -BackupFile "backuprds\milicard_prod_20260114_145452.sql"
# 将RDS生产环境备份还原到本地开发数据库

param(
    [Parameter(Mandatory=$false)]
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
Write-Host "  MiliCard RDS Backup Restore" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

# 如果没有指定备份文件，列出可用的备份文件
if (-not $BackupFile) {
    Write-Host "Available backup files:" -ForegroundColor Yellow
    Write-Host ""
    
    $backupFiles = @()
    
    # 查找 backuprds 目录下的备份文件
    if (Test-Path "backuprds") {
        $backupFiles += Get-ChildItem "backuprds\*.sql" -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending
        $backupFiles += Get-ChildItem "backuprds\*.sql.gz" -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending
    }
    
    if ($backupFiles.Count -eq 0) {
        Write-Host "No backup files found in backuprds directory." -ForegroundColor Red
        Write-Host ""
        Write-Host "Usage: .\restore_rds_backup.ps1 -BackupFile <path_to_backup_file>" -ForegroundColor Yellow
        exit 1
    }
    
    # 显示备份文件列表
    for ($i = 0; $i -lt $backupFiles.Count; $i++) {
        $file = $backupFiles[$i]
        $size = [math]::Round($file.Length / 1MB, 2)
        $date = $file.LastWriteTime.ToString("yyyy-MM-dd HH:mm:ss")
        Write-Host "  [$($i+1)] $($file.Name)" -ForegroundColor White
        Write-Host "      Size: $size MB | Modified: $date" -ForegroundColor Gray
    }
    
    Write-Host ""
    $selection = Read-Host "Select a backup file (1-$($backupFiles.Count)) or press Enter to cancel"
    
    if ([string]::IsNullOrWhiteSpace($selection)) {
        Write-Host "Cancelled." -ForegroundColor Yellow
        exit 0
    }
    
    $index = [int]$selection - 1
    if ($index -lt 0 -or $index -ge $backupFiles.Count) {
        Write-Host "Invalid selection." -ForegroundColor Red
        exit 1
    }
    
    $BackupFile = $backupFiles[$index].FullName
}

# 检查备份文件是否存在
if (-not (Test-Path $BackupFile)) {
    Write-Host "ERROR: Backup file not found: $BackupFile" -ForegroundColor Red
    exit 1
}

# 如果是压缩文件，先解压
$originalFile = $BackupFile
$needsCleanup = $false

if ($BackupFile -match "\.gz$") {
    Write-Host "Detected compressed file, decompressing..." -ForegroundColor Cyan
    
    # 检查是否有 7z 或 gzip
    $decompressed = $BackupFile -replace "\.gz$", ""
    
    try {
        # 尝试使用 7z
        if (Get-Command "7z" -ErrorAction SilentlyContinue) {
            & 7z e $BackupFile -o"$(Split-Path $BackupFile)" -y | Out-Null
            $BackupFile = $decompressed
            $needsCleanup = $true
            Write-Host "[OK] File decompressed" -ForegroundColor Green
        }
        # 尝试使用 PowerShell 内置解压（需要 .NET）
        elseif (Get-Command "Expand-Archive" -ErrorAction SilentlyContinue) {
            # gzip 不能用 Expand-Archive，需要手动处理
            Write-Host "ERROR: Cannot decompress .gz file. Please install 7-Zip or decompress manually." -ForegroundColor Red
            Write-Host "Download 7-Zip: https://www.7-zip.org/" -ForegroundColor Yellow
            exit 1
        }
        else {
            Write-Host "ERROR: No decompression tool found. Please install 7-Zip." -ForegroundColor Red
            exit 1
        }
    } catch {
        Write-Host "ERROR: Failed to decompress file" -ForegroundColor Red
        Write-Host $_.Exception.Message -ForegroundColor Red
        exit 1
    }
}

$fileSize = (Get-Item $BackupFile).Length
$fileSizeMB = [math]::Round($fileSize / 1MB, 2)

Write-Host ""
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
Write-Host "         All existing data will be LOST!" -ForegroundColor Red
$confirm = Read-Host "Continue? (y/N)"
if ($confirm -ne "y" -and $confirm -ne "Y") {
    Write-Host "Cancelled." -ForegroundColor Yellow
    
    # 清理解压的文件
    if ($needsCleanup -and (Test-Path $BackupFile)) {
        Remove-Item $BackupFile -Force
    }
    
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
    
    # 清理解压的文件
    if ($needsCleanup -and (Test-Path $BackupFile)) {
        Remove-Item $BackupFile -Force
    }
    
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
    
    # 清理解压的文件
    if ($needsCleanup -and (Test-Path $BackupFile)) {
        Remove-Item $BackupFile -Force
    }
    
    exit 1
}

# 还原数据库
Write-Host "Restoring database from RDS backup..." -ForegroundColor Cyan
Write-Host "This may take several minutes depending on database size..." -ForegroundColor Gray
Write-Host ""

$startTime = Get-Date

try {
    # 设置所有必要的环境变量
    $env:PGCLIENTENCODING = "UTF8"
    $env:LC_ALL = "en_US.UTF-8"
    
    # RDS导出的都是SQL文本格式
    Write-Host "Using psql to restore SQL file..." -ForegroundColor Gray
    
    # 使用管道方式恢复，避免文件编码问题
    Get-Content $BackupFile -Encoding UTF8 | & psql --host=$DbHost --port=$DbPort --username=$DbUser --dbname=$DbName --quiet --set=client_encoding=UTF8 --set=ON_ERROR_STOP=off 2>&1 | ForEach-Object {
        $line = $_.ToString()
        if ($line -match "ERROR" -and $line -notmatch "already exists") {
            Write-Host $line -ForegroundColor Red
        }
    }
    
    if ($LASTEXITCODE -ne 0 -and $LASTEXITCODE -ne 3) {
        # 退出码3通常表示有一些非致命错误，可以忽略
        Write-Host "Warning: psql exited with code $LASTEXITCODE, but continuing..." -ForegroundColor Yellow
    }
    
    # 清理环境变量
    $env:PGCLIENTENCODING = $null
    $env:LC_ALL = $null
    
    $endTime = Get-Date
    $duration = ($endTime - $startTime).TotalSeconds
    
    Write-Host ""
    Write-Host "[OK] Database restored successfully in $([math]::Round($duration, 1)) seconds" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Failed to restore database" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    
    # 清理解压的文件
    if ($needsCleanup -and (Test-Path $BackupFile)) {
        Remove-Item $BackupFile -Force
    }
    
    exit 1
}

# 清理密码环境变量
$env:PGPASSWORD = $null

# 清理解压的文件
if ($needsCleanup -and (Test-Path $BackupFile)) {
    Write-Host "Cleaning up decompressed file..." -ForegroundColor Gray
    Remove-Item $BackupFile -Force
}

# 验证还原结果
Write-Host ""
Write-Host "Verifying restore..." -ForegroundColor Cyan
try {
    $env:PGPASSWORD = $DbPassword
    
    # 检查表数量
    $tableCount = & psql -h $DbHost -p $DbPort -U $DbUser -d $DbName -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>$null
    $tableCount = $tableCount.Trim()
    
    # 检查用户数量
    $userCount = & psql -h $DbHost -p $DbPort -U $DbUser -d $DbName -t -c "SELECT COUNT(*) FROM users;" 2>$null
    $userCount = $userCount.Trim()
    
    Write-Host "[OK] Verification complete" -ForegroundColor Green
    Write-Host "     Tables: $tableCount" -ForegroundColor Gray
    Write-Host "     Users:  $userCount" -ForegroundColor Gray
    
    $env:PGPASSWORD = $null
} catch {
    Write-Host "[WARN] Could not verify restore" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=============================================" -ForegroundColor Green
Write-Host "  Restore Completed!" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green
Write-Host ""
Write-Host "Database $DbName has been restored from RDS backup" -ForegroundColor White
Write-Host "Original file: $originalFile" -ForegroundColor Gray
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Update .env.local with database connection:" -ForegroundColor White
Write-Host "     DATABASE_URL=`"postgresql://${DbUser}:${DbPassword}@${DbHost}:${DbPort}/${DbName}?schema=public`"" -ForegroundColor Gray
Write-Host ""
Write-Host "  2. Generate Prisma client:" -ForegroundColor White
Write-Host "     cd server" -ForegroundColor Gray
Write-Host "     npx prisma generate" -ForegroundColor Gray
Write-Host ""
Write-Host "  3. Start development server:" -ForegroundColor White
Write-Host "     npm run dev" -ForegroundColor Gray
Write-Host ""
Write-Host "  4. Test the restored data:" -ForegroundColor White
Write-Host "     - Login with production credentials" -ForegroundColor Gray
Write-Host "     - Verify data integrity" -ForegroundColor Gray
Write-Host "     - Test the issue you're debugging" -ForegroundColor Gray
Write-Host ""
