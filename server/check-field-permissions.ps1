# Field Permission Diagnostic Script
# Usage: .\check-field-permissions.ps1 -Resource "stockConsumption" -Field "unitPricePerBox" -RoleName "OPERATOR"

param(
    [Parameter(Mandatory=$false)]
    [string]$Resource = "stockConsumption",
    
    [Parameter(Mandatory=$false)]
    [string]$Field = "unitPricePerBox",
    
    [Parameter(Mandatory=$false)]
    [string]$RoleName = "YUNYINGHEXIN",
    
    [Parameter(Mandatory=$false)]
    [string]$DatabaseUrl = ""
)

# Fix output encoding for Chinese characters
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Field Permission Diagnostic Tool" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Read .env file to get database connection
if ([string]::IsNullOrEmpty($DatabaseUrl)) {
    $envFile = ".env"
    if (Test-Path $envFile) {
        Write-Host "[*] Reading database configuration from $envFile..." -ForegroundColor Yellow
        $envContent = Get-Content $envFile -Encoding UTF8
        $foundUrl = $false
        foreach ($line in $envContent) {
            # Skip comments and empty lines
            if ($line -match '^\s*#' -or $line -match '^\s*$') {
                continue
            }
            # Match DATABASE_URL with or without quotes
            if ($line -match '^DATABASE_URL\s*=\s*(.+)$') {
                $DatabaseUrl = $matches[1].Trim().Trim('"').Trim("'")
                $foundUrl = $true
                Write-Host "[DEBUG] Found DATABASE_URL in .env file" -ForegroundColor Gray
                break
            }
        }
        if (-not $foundUrl) {
            Write-Host "[WARNING] .env file exists but DATABASE_URL not found" -ForegroundColor Yellow
            Write-Host "[DEBUG] Checked file: $(Resolve-Path $envFile)" -ForegroundColor Gray
        }
    } else {
        Write-Host "[WARNING] .env file not found at: $(Join-Path (Get-Location) $envFile)" -ForegroundColor Yellow
    }
}

if ([string]::IsNullOrEmpty($DatabaseUrl)) {
    Write-Host "[ERROR] Cannot find database connection configuration" -ForegroundColor Red
    Write-Host "Please configure DATABASE_URL in .env file" -ForegroundColor Yellow
    Write-Host "" -ForegroundColor Yellow
    Write-Host "Expected format in .env file:" -ForegroundColor Cyan
    Write-Host 'DATABASE_URL="postgresql://user:password@host:port/database"' -ForegroundColor Gray
    exit 1
}

# Parse database connection string
if ($DatabaseUrl -match 'postgresql://([^:]+):([^@]+)@([^:]+):(\d+)/([^?]+)') {
    $dbUser = $matches[1]
    $dbPassword = $matches[2]
    $dbHost = $matches[3]
    $dbPort = $matches[4]
    $dbName = $matches[5]
    
    Write-Host "[OK] Database connection config:" -ForegroundColor Green
    Write-Host "   Host: ${dbHost}:${dbPort}" -ForegroundColor Gray
    Write-Host "   Database: $dbName" -ForegroundColor Gray
    Write-Host "   User: $dbUser" -ForegroundColor Gray
    Write-Host ""
} else {
    Write-Host "[ERROR] Cannot parse database connection string" -ForegroundColor Red
    exit 1
}

# Set PostgreSQL password environment variable
$env:PGPASSWORD = $dbPassword

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Check 1: Database Field Permissions" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Build SQL query
$sql = @"
SELECT 
  r.name as role_name,
  fp.resource,
  fp.field,
  fp.can_read,
  fp.can_write,
  fp.created_at
FROM field_permissions fp
JOIN roles r ON fp.role_id = r.id
WHERE fp.resource = '$Resource'
"@

if (![string]::IsNullOrEmpty($Field)) {
    $sql += " AND fp.field = '$Field'"
}

if (![string]::IsNullOrEmpty($RoleName)) {
    $sql += " AND r.name = '$RoleName'"
}

$sql += " ORDER BY r.name, fp.field;"

Write-Host "[*] Querying field permissions..." -ForegroundColor Yellow
Write-Host "   Resource: $Resource" -ForegroundColor Gray
if (![string]::IsNullOrEmpty($Field)) {
    Write-Host "   Field: $Field" -ForegroundColor Gray
}
if (![string]::IsNullOrEmpty($RoleName)) {
    Write-Host "   Role: $RoleName" -ForegroundColor Gray
}
Write-Host ""

# 执行查询
$result = & psql -h $dbHost -p $dbPort -U $dbUser -d $dbName -c $sql -t -A -F "|" 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Database query failed:" -ForegroundColor Red
    Write-Host $result -ForegroundColor Red
    exit 1
}

if ([string]::IsNullOrEmpty($result) -or $result -match "^\s*$") {
    Write-Host "[WARNING] No field permission configuration found" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Possible reasons:" -ForegroundColor Yellow
    Write-Host "  1. Resource has no field permissions configured" -ForegroundColor Gray
    Write-Host "  2. Role name is incorrect" -ForegroundColor Gray
    Write-Host "  3. Field name is incorrect" -ForegroundColor Gray
    Write-Host ""
} else {
    Write-Host "[OK] Found field permission configurations:" -ForegroundColor Green
    Write-Host ""
    Write-Host "Role Name | Resource | Field | Read | Write | Created At" -ForegroundColor Cyan
    Write-Host "----------|----------|-------|------|-------|------------" -ForegroundColor Cyan
    
    $lines = $result -split "`n"
    foreach ($line in $lines) {
        if (![string]::IsNullOrEmpty($line.Trim())) {
            $parts = $line -split "\|"
            if ($parts.Count -ge 5) {
                $roleName = $parts[0]
                $resource = $parts[1]
                $field = $parts[2]
                $canRead = if ($parts[3] -eq "t") { "YES" } else { "NO" }
                $canWrite = if ($parts[4] -eq "t") { "YES" } else { "NO" }
                $createdAt = $parts[5]
                
                $color = if ($parts[3] -eq "f") { "Red" } else { "Green" }
                Write-Host "$roleName | $resource | $field | $canRead | $canWrite | $createdAt" -ForegroundColor $color
            }
        }
    }
    Write-Host ""
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Check 2: Role List" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$roleSql = 'SELECT id, name, description FROM roles ORDER BY name;'
Write-Host "[*] Querying all roles in system..." -ForegroundColor Yellow
Write-Host ""

$roleResult = & psql -h $dbHost -p $dbPort -U $dbUser -d $dbName -c $roleSql -t -A -F "|" 2>&1

if ($LASTEXITCODE -eq 0 -and ![string]::IsNullOrEmpty($roleResult)) {
    Write-Host "Role ID | Role Name | Description" -ForegroundColor Cyan
    Write-Host "--------|-----------|-------------" -ForegroundColor Cyan
    
    $roleLines = $roleResult -split "`n"
    foreach ($line in $roleLines) {
        if (![string]::IsNullOrEmpty($line.Trim())) {
            $parts = $line -split "\|"
            if ($parts.Count -ge 2) {
                Write-Host "$($parts[0]) | $($parts[1]) | $($parts[2])" -ForegroundColor Gray
            }
        }
    }
    Write-Host ""
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  检查项目 3: 用户角色关联" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if (![string]::IsNullOrEmpty($RoleName)) {
    $userRoleSql = @"
SELECT 
  u.username,
  u.email,
  r.name as role_name
FROM users u
JOIN user_roles ur ON u.id = ur.user_id
JOIN roles r ON ur.role_id = r.id
WHERE r.name = '$RoleName'
ORDER BY u.username
"@
    
    Write-Host "[*] 查询拥有 '$RoleName' 角色的用户..." -ForegroundColor Yellow
    Write-Host ""
    
    $userRoleResult = & psql -h $dbHost -p $dbPort -U $dbUser -d $dbName -c $userRoleSql -t -A -F "|" 2>&1
    
    if ($LASTEXITCODE -eq 0 -and ![string]::IsNullOrEmpty($userRoleResult)) {
        Write-Host "用户名 | 邮箱 | 角色" -ForegroundColor Cyan
        Write-Host "-------|------|------" -ForegroundColor Cyan
        
        $userLines = $userRoleResult -split "`n"
        foreach ($line in $userLines) {
            if (![string]::IsNullOrEmpty($line.Trim())) {
                $parts = $line -split "\|"
                if ($parts.Count -ge 3) {
                    Write-Host "$($parts[0]) | $($parts[1]) | $($parts[2])" -ForegroundColor Gray
                }
            }
        }
        Write-Host ""
    } else {
        Write-Host "[WARNING] 没有找到拥有 '$RoleName' 角色的用户" -ForegroundColor Yellow
        Write-Host ""
    }
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  检查项目 4: 后端路由配置验证" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "[*] 需要检查的后端文件:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. 路由文件: server/src/routes/consumptionRoutes.ts" -ForegroundColor Cyan
Write-Host "   确认是否包含以下中间件:" -ForegroundColor Gray
Write-Host "   - injectDataPermission('stockConsumption')" -ForegroundColor Gray
Write-Host "   - filterResponseFields()" -ForegroundColor Gray
Write-Host ""

Write-Host "2. 权限中间件: server/src/middleware/permissionMiddleware.ts" -ForegroundColor Cyan
Write-Host "   确认 filterResponseFields 函数是否正确实现" -ForegroundColor Gray
Write-Host ""

Write-Host "3. 字段过滤工具: server/src/utils/fieldFilter.ts" -ForegroundColor Cyan
Write-Host "   确认 filterReadableFields 函数是否正确过滤字段" -ForegroundColor Gray
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  检查项目 5: 前端网络请求验证" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "[*] 如何检查前端网络请求:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. 打开浏览器开发者工具 (F12)" -ForegroundColor Cyan
Write-Host ""
Write-Host "2. 切换到 Network (网络) 标签" -ForegroundColor Cyan
Write-Host ""
Write-Host "3. 刷新 /inventory-consumption 页面" -ForegroundColor Cyan
Write-Host ""
Write-Host "4. 找到 API 请求: /api/v1/bases/{baseId}/consumptions" -ForegroundColor Cyan
Write-Host ""
Write-Host "5. 查看响应数据 (Response):" -ForegroundColor Cyan
Write-Host "   - 如果 unitPricePerBox 字段存在且有值 -> 后端没有过滤" -ForegroundColor Red
Write-Host "   - 如果 unitPricePerBox 字段不存在或为 null -> 后端已正确过滤" -ForegroundColor Green
Write-Host ""
Write-Host "6. 检查请求头 (Request Headers):" -ForegroundColor Cyan
Write-Host "   - 确认 Authorization token 是否正确" -ForegroundColor Gray
Write-Host "   - 确认用户是否使用了正确的角色登录" -ForegroundColor Gray
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  诊断完成 - 故障排查建议" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "[*] 根据检查结果，可能的问题和解决方案:" -ForegroundColor Yellow
Write-Host ""

Write-Host "问题 1: 当前登录用户是管理员角色" -ForegroundColor Red
Write-Host "  原因: SUPER_ADMIN 和 ADMIN 角色默认拥有所有权限" -ForegroundColor Gray
Write-Host "  解决: 使用 '$RoleName' 角色的用户登录测试" -ForegroundColor Green
Write-Host ""

Write-Host "问题 2: 后端中间件未正确配置" -ForegroundColor Red
Write-Host "  原因: 路由没有使用 filterResponseFields() 中间件" -ForegroundColor Gray
Write-Host "  解决: 在 consumptionRoutes.ts 中添加中间件" -ForegroundColor Green
Write-Host "  代码: router.get('/:baseId/consumptions', ..., filterResponseFields(), ...)" -ForegroundColor Cyan
Write-Host ""

Write-Host "问题 3: 前端列配置的 key 与字段名不匹配" -ForegroundColor Red
Write-Host "  原因: columns.tsx 中的 key 或 dataIndex 与数据库字段名不一致" -ForegroundColor Gray
Write-Host "  解决: 确保列定义为 { key: 'unitPricePerBox', dataIndex: 'unitPricePerBox' }" -ForegroundColor Green
Write-Host ""

Write-Host "问题 4: 前端缓存了旧数据" -ForegroundColor Red
Write-Host "  原因: 浏览器缓存或 React 状态缓存" -ForegroundColor Gray
Write-Host "  解决: 清除浏览器缓存，强制刷新页面 (Ctrl+Shift+R)" -ForegroundColor Green
Write-Host ""

Write-Host "[*] 推荐的调试步骤:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. 确认当前登录用户的角色 (检查上面的用户角色关联表)" -ForegroundColor Cyan
Write-Host "2. 使用 '$RoleName' 角色的用户重新登录" -ForegroundColor Cyan
Write-Host "3. 打开浏览器开发者工具，查看网络请求" -ForegroundColor Cyan
Write-Host "4. 检查 API 响应中是否包含 unitPricePerBox 字段" -ForegroundColor Cyan
Write-Host "5. 如果响应中仍有该字段，检查后端日志和路由配置" -ForegroundColor Cyan
Write-Host ""

# Clean up environment variable
$env:PGPASSWORD = ""
