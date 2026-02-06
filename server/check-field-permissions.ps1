# Field Permission Diagnostic Script
# Usage: .\check-field-permissions.ps1 -Resource "stockConsumption" -Field "unitPricePerBox" -RoleName "OPERATOR"

param(
    [Parameter(Mandatory=$false)]
    [string]$Resource = "purchaseOrder",
    
    [Parameter(Mandatory=$false)]
    [string]$Field = "unitPriceBox",
    
    [Parameter(Mandatory=$false)]
    [string]$RoleName = "YUNYING",
    
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
        Write-Host "[WARNING] not found '$RoleName' user" -ForegroundColor Yellow
        Write-Host ""
    }
}



# Clean up environment variable
$env:PGPASSWORD = ""
