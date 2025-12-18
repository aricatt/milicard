# MiliCard 本地数据库孤立数据清理脚本
# 用法: .\cleanup_orphan_data_local.ps1 [-CleanUp]
# 不带参数只查询，带 -CleanUp 参数执行清理

param(
    [switch]$CleanUp,
    [string]$DbHost = "localhost",
    [int]$DbPort = 5437,
    [string]$DbName = "milicard_dev",
    [string]$DbUser = "postgres",
    [string]$DbPassword = "840928"
)

$env:PGPASSWORD = $DbPassword

Write-Host ""
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "  MiliCard Orphan Data Check" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Database: $DbHost`:$DbPort/$DbName" -ForegroundColor Yellow
Write-Host ""

# 定义所有需要检查的外键关系
$checks = @(
    @{ Table = "arrival_records"; FK = "purchase_order_id"; RefTable = "purchase_orders"; RefCol = "id" },
    @{ Table = "arrival_records"; FK = "goods_id"; RefTable = "goods"; RefCol = "id" },
    @{ Table = "arrival_records"; FK = "handler_id"; RefTable = "personnel"; RefCol = "id" },
    @{ Table = "arrival_records"; FK = "location_id"; RefTable = "locations"; RefCol = "id" },
    @{ Table = "arrival_records"; FK = "base_id"; RefTable = "bases"; RefCol = "id" },
    @{ Table = "purchase_order_items"; FK = "purchase_order_id"; RefTable = "purchase_orders"; RefCol = "id" },
    @{ Table = "purchase_order_items"; FK = "goods_id"; RefTable = "goods"; RefCol = "id" },
    @{ Table = "inventory"; FK = "goods_id"; RefTable = "goods"; RefCol = "id" },
    @{ Table = "inventory"; FK = "base_id"; RefTable = "bases"; RefCol = "id" },
    @{ Table = "inventory_ledger"; FK = "goods_id"; RefTable = "goods"; RefCol = "id" },
    @{ Table = "inventory_ledger"; FK = "location_id"; RefTable = "locations"; RefCol = "id" },
    @{ Table = "transfer_records"; FK = "goods_id"; RefTable = "goods"; RefCol = "id" },
    @{ Table = "transfer_records"; FK = "base_id"; RefTable = "bases"; RefCol = "id" },
    @{ Table = "stock_consumptions"; FK = "goods_id"; RefTable = "goods"; RefCol = "id" },
    @{ Table = "stock_consumptions"; FK = "location_id"; RefTable = "locations"; RefCol = "id" },
    @{ Table = "personnel"; FK = "base_id"; RefTable = "bases"; RefCol = "id" },
    @{ Table = "locations"; FK = "base_id"; RefTable = "bases"; RefCol = "id" },
    @{ Table = "purchase_orders"; FK = "base_id"; RefTable = "bases"; RefCol = "id" },
    @{ Table = "purchase_orders"; FK = "target_location_id"; RefTable = "locations"; RefCol = "id" },
    @{ Table = "goods_local_settings"; FK = "goods_id"; RefTable = "goods"; RefCol = "id" },
    @{ Table = "goods_local_settings"; FK = "base_id"; RefTable = "bases"; RefCol = "id" },
    @{ Table = "user_bases"; FK = "user_id"; RefTable = "users"; RefCol = "id" },
    @{ Table = "user_bases"; FK = "base_id"; RefTable = "bases"; RefCol = "id" }
)

Write-Host "Checking for orphan data..." -ForegroundColor Cyan
Write-Host ""

$totalOrphans = 0
$orphanRelations = @()

foreach ($check in $checks) {
    $query = "SELECT COUNT(*) FROM $($check.Table) WHERE $($check.FK) IS NOT NULL AND $($check.FK) NOT IN (SELECT $($check.RefCol) FROM $($check.RefTable))"
    $result = & psql -h $DbHost -p $DbPort -U $DbUser -d $DbName -t -c $query 2>$null
    $count = [int]($result.Trim())
    
    if ($count -gt 0) {
        Write-Host "  [!] $($check.Table).$($check.FK) -> $($check.RefTable): $count orphans" -ForegroundColor Red
        $totalOrphans += $count
        $orphanRelations += $check
    } else {
        Write-Host "  [OK] $($check.Table).$($check.FK) -> $($check.RefTable): 0 orphans" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "Total orphan records: $totalOrphans" -ForegroundColor $(if ($totalOrphans -gt 0) { "Red" } else { "Green" })
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

if ($totalOrphans -eq 0) {
    Write-Host "No orphan data found. Database is clean!" -ForegroundColor Green
    exit 0
}

if (-not $CleanUp) {
    Write-Host "To clean up orphan data, run:" -ForegroundColor Yellow
    Write-Host "  .\cleanup_orphan_data_local.ps1 -CleanUp" -ForegroundColor Gray
    Write-Host ""
    exit 0
}

# 执行清理
Write-Host "Cleaning up orphan data..." -ForegroundColor Cyan
Write-Host ""

foreach ($check in $orphanRelations) {
    $deleteQuery = "DELETE FROM $($check.Table) WHERE $($check.FK) IS NOT NULL AND $($check.FK) NOT IN (SELECT $($check.RefCol) FROM $($check.RefTable))"
    Write-Host "  Cleaning $($check.Table).$($check.FK)..." -ForegroundColor Gray
    & psql -h $DbHost -p $DbPort -U $DbUser -d $DbName -c $deleteQuery 2>$null | Out-Null
}

Write-Host ""
Write-Host "=============================================" -ForegroundColor Green
Write-Host "  Cleanup Completed!" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green
Write-Host ""

# 清理密码
$env:PGPASSWORD = $null
