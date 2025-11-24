# 数据库安全迁移脚本 (Windows PowerShell 版本)
# 用途：自动化执行数据库迁移的标准流程
# 使用方法：.\scripts\migrate-safe.ps1 [-MigrationName "migration_name"]

param(
    [string]$MigrationName = "migration_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
)

$ErrorActionPreference = "Stop"

# 配置
$BackupDir = ".\backups"
$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"

Write-Host "========================================" -ForegroundColor Blue
Write-Host "数据库安全迁移脚本" -ForegroundColor Blue
Write-Host "========================================" -ForegroundColor Blue
Write-Host ""

# 检查是否在正确的目录
if (-not (Test-Path "package.json")) {
    Write-Host "错误：请在项目根目录运行此脚本" -ForegroundColor Red
    exit 1
}

# 检查是否有未提交的 schema 变更
$gitStatus = git status --porcelain server/prisma/schema.prisma
if ($gitStatus) {
    Write-Host "警告：检测到 schema.prisma 有未提交的变更" -ForegroundColor Yellow
    $continue = Read-Host "是否继续？(y/n)"
    if ($continue -ne "y") {
        Write-Host "迁移已取消" -ForegroundColor Red
        exit 1
    }
}

# 步骤 1：备份数据库
Write-Host "[1/7] 备份数据库..." -ForegroundColor Blue
if (-not (Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir | Out-Null
}

# 从 .env 文件读取数据库配置
$envFile = "server\.env"
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^([^#][^=]+)=(.+)$') {
            $name = $matches[1].Trim()
            $value = $matches[2].Trim()
            Set-Variable -Name $name -Value $value -Scope Script
        }
    }
}

$BackupFile = "$BackupDir\backup_$Timestamp.sql"

# 提取 PostgreSQL 连接信息
if ($DATABASE_URL -match 'postgresql://([^:]+):([^@]+)@([^:]+):(\d+)/([^?]+)') {
    $DB_USER = $matches[1]
    $DB_PASSWORD = $matches[2]
    $DB_HOST = $matches[3]
    $DB_PORT = $matches[4]
    $DB_NAME = $matches[5]
    
    Write-Host "正在备份 PostgreSQL 数据库: $DB_NAME"
    
    # 设置 PostgreSQL 密码环境变量
    $env:PGPASSWORD = $DB_PASSWORD
    
    # 执行备份
    & pg_dump -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME > $BackupFile
    
    if (Test-Path $BackupFile) {
        $BackupSize = (Get-Item $BackupFile).Length / 1KB
        Write-Host "✓ 备份完成：$BackupFile ($([math]::Round($BackupSize, 2)) KB)" -ForegroundColor Green
    } else {
        Write-Host "✗ 备份失败" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "错误：无法解析数据库连接字符串" -ForegroundColor Red
    exit 1
}

# 步骤 2：验证 Schema
Write-Host "[2/7] 验证 Prisma Schema..." -ForegroundColor Blue
Set-Location server
try {
    npx prisma validate
    Write-Host "✓ Schema 验证通过" -ForegroundColor Green
} catch {
    Write-Host "✗ Schema 验证失败" -ForegroundColor Red
    Set-Location ..
    exit 1
}

# 步骤 3：停止服务
Write-Host "[3/7] 停止 Node.js 服务..." -ForegroundColor Blue
try {
    taskkill /F /IM node.exe 2>$null
} catch {
    Write-Host "没有运行中的 Node.js 进程" -ForegroundColor Yellow
}
Start-Sleep -Seconds 2
Write-Host "✓ 服务已停止" -ForegroundColor Green

# 步骤 4：清理缓存
Write-Host "[4/7] 清理 Prisma Client 缓存..." -ForegroundColor Blue
if (Test-Path "node_modules\.prisma") {
    Remove-Item -Path "node_modules\.prisma" -Recurse -Force
}
if (Test-Path "node_modules\@prisma\client") {
    Remove-Item -Path "node_modules\@prisma\client" -Recurse -Force
}
Write-Host "✓ 缓存已清理" -ForegroundColor Green

# 步骤 5：执行迁移
Write-Host "[5/7] 执行数据库迁移..." -ForegroundColor Blue
Write-Host "请选择迁移方式：" -ForegroundColor Yellow
Write-Host "1) db push (开发环境，可接受数据丢失)"
Write-Host "2) migrate dev (生产环境，保留数据)"
$choice = Read-Host "选择 (1/2)"

if ($choice -eq "1") {
    Write-Host "警告：此操作可能导致数据丢失！" -ForegroundColor Yellow
    $confirm = Read-Host "确认执行 db push？(y/n)"
    if ($confirm -eq "y") {
        try {
            npx prisma db push --accept-data-loss
            Write-Host "✓ db push 完成" -ForegroundColor Green
        } catch {
            Write-Host "✗ db push 失败" -ForegroundColor Red
            Write-Host "正在恢复备份..." -ForegroundColor Yellow
            Set-Location ..
            $env:PGPASSWORD = $DB_PASSWORD
            & psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f $BackupFile
            exit 1
        }
    } else {
        Write-Host "迁移已取消" -ForegroundColor Red
        Set-Location ..
        exit 1
    }
} elseif ($choice -eq "2") {
    try {
        npx prisma migrate dev --name $MigrationName
        Write-Host "✓ migrate dev 完成" -ForegroundColor Green
    } catch {
        Write-Host "✗ migrate dev 失败" -ForegroundColor Red
        Write-Host "正在恢复备份..." -ForegroundColor Yellow
        Set-Location ..
        $env:PGPASSWORD = $DB_PASSWORD
        & psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f $BackupFile
        exit 1
    }
} else {
    Write-Host "无效的选择，迁移已取消" -ForegroundColor Red
    Set-Location ..
    exit 1
}

# 步骤 6：重新生成 Prisma Client
Write-Host "[6/7] 重新生成 Prisma Client..." -ForegroundColor Blue
try {
    npx prisma generate
    Write-Host "✓ Prisma Client 生成完成" -ForegroundColor Green
} catch {
    Write-Host "✗ Prisma Client 生成失败" -ForegroundColor Red
    Set-Location ..
    exit 1
}

# 步骤 7：重启服务
Write-Host "[7/7] 重启服务..." -ForegroundColor Blue
Write-Host "请手动启动服务：npm run dev" -ForegroundColor Yellow
Write-Host ""

Set-Location ..

# 完成
Write-Host "========================================" -ForegroundColor Green
Write-Host "迁移完成！" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "备份文件：$BackupFile" -ForegroundColor Blue
Write-Host "迁移名称：$MigrationName" -ForegroundColor Blue
Write-Host ""
Write-Host "下一步：" -ForegroundColor Yellow
Write-Host "1. 启动服务：npm run dev"
Write-Host "2. 验证功能是否正常"
Write-Host "3. 运行测试：npm test"
Write-Host "4. 如果有问题，使用备份恢复："
Write-Host "   `$env:PGPASSWORD='$DB_PASSWORD'; psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f $BackupFile"
Write-Host ""
