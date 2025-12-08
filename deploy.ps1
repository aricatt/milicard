# MiliCard Windows 一键部署脚本
# 用法: .\deploy.ps1 [staging|production]
# 需要: Docker Desktop for Windows

param(
    [ValidateSet("staging", "production")]
    [string]$Env = "staging"
)

$ErrorActionPreference = "Stop"

# 配置
$IMAGE_NAME = "milicard"

if ($Env -eq "production") {
    $CONTAINER_NAME = "milicard-prod"
    $DEFAULT_PORT = 8175
    $VOLUME_NAME = "milicard_prod_data"
    Write-Host "Deploying PRODUCTION environment" -ForegroundColor Green
} else {
    $CONTAINER_NAME = "milicard-staging"
    $DEFAULT_PORT = 8275
    $VOLUME_NAME = "milicard_staging_data"
    Write-Host "Deploying STAGING environment" -ForegroundColor Yellow
}

# 检查 Docker 是否运行
try {
    docker info | Out-Null
} catch {
    Write-Host "ERROR: Docker is not running. Please start Docker Desktop." -ForegroundColor Red
    exit 1
}

# 检查环境变量文件
$ENV_FILE = ".env.$Env"
if (-not (Test-Path $ENV_FILE)) {
    Write-Host "Environment file $ENV_FILE not found. Creating template..." -ForegroundColor Yellow
    
    # 生成随机 JWT 密钥
    $randomBytes = New-Object byte[] 32
    [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($randomBytes)
    $jwtSecret = [Convert]::ToBase64String($randomBytes)
    
    @"
# MiliCard $Env 环境配置
# 请修改以下配置后重新运行部署脚本

# 数据库密码（必填，请设置一个强密码）
DB_PASSWORD=your_secure_password_here

# JWT 密钥（必填，请设置一个随机字符串）
JWT_SECRET=$jwtSecret
"@ | Out-File -FilePath $ENV_FILE -Encoding UTF8
    
    Write-Host "Please edit $ENV_FILE and set DB_PASSWORD" -ForegroundColor Red
    exit 1
}

# 加载环境变量
$envContent = Get-Content $ENV_FILE | Where-Object { $_ -match "^\s*[^#]" }
$DB_PASSWORD = ""
$JWT_SECRET = ""

foreach ($line in $envContent) {
    if ($line -match "^\s*DB_PASSWORD\s*=\s*(.+)$") {
        $DB_PASSWORD = $Matches[1].Trim()
    }
    if ($line -match "^\s*JWT_SECRET\s*=\s*(.+)$") {
        $JWT_SECRET = $Matches[1].Trim()
    }
    if ($line -match "^\s*PORT\s*=\s*(.+)$") {
        $PORT = $Matches[1].Trim()
    }
}

# 使用环境变量中的端口，如果没有则使用默认值
if (-not $PORT) {
    $PORT = $DEFAULT_PORT
}

# 验证必要的环境变量
if ($DB_PASSWORD -eq "your_secure_password_here" -or [string]::IsNullOrEmpty($DB_PASSWORD)) {
    Write-Host "ERROR: Please set DB_PASSWORD in $ENV_FILE" -ForegroundColor Red
    exit 1
}

if ([string]::IsNullOrEmpty($JWT_SECRET)) {
    Write-Host "ERROR: Please set JWT_SECRET in $ENV_FILE" -ForegroundColor Red
    exit 1
}

Write-Host "=========================================="
Write-Host "  Environment: $Env"
Write-Host "  Container:   $CONTAINER_NAME"
Write-Host "  Port:        $PORT"
Write-Host "  Volume:      $VOLUME_NAME"
Write-Host "=========================================="

# 构建镜像
# BUILD_ENV: staging 显示模板参考菜单，production(prod) 隐藏
$BUILD_ENV = if ($Env -eq "production") { "prod" } else { "staging" }
Write-Host "Building Docker image (BUILD_ENV=$BUILD_ENV)..." -ForegroundColor Green
docker build --build-arg BUILD_ENV=$BUILD_ENV -t "${IMAGE_NAME}:${Env}" .
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Docker build failed" -ForegroundColor Red
    exit 1
}

# 停止并删除旧容器（如果存在）
$existingContainer = docker ps -aq -f "name=$CONTAINER_NAME" 2>$null
if ($existingContainer) {
    Write-Host "Stopping existing container..." -ForegroundColor Yellow
    docker stop $CONTAINER_NAME 2>$null
    docker rm $CONTAINER_NAME 2>$null
}

# 创建数据卷（如果不存在）
$volumeExists = docker volume ls -q -f "name=$VOLUME_NAME" 2>$null
if (-not $volumeExists) {
    Write-Host "Creating data volume..." -ForegroundColor Green
    docker volume create $VOLUME_NAME | Out-Null
}
Write-Host "Using volume: $VOLUME_NAME" -ForegroundColor Cyan

# 运行新容器
Write-Host "Starting new container..." -ForegroundColor Green
docker run -d `
    --name $CONTAINER_NAME `
    --restart unless-stopped `
    -p "${PORT}:80" `
    -v "${VOLUME_NAME}:/var/lib/postgresql/data" `
    -e "DB_PASSWORD=$DB_PASSWORD" `
    -e "JWT_SECRET=$JWT_SECRET" `
    -e "NODE_ENV=$Env" `
    "${IMAGE_NAME}:${Env}"

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to start container" -ForegroundColor Red
    exit 1
}

# 等待容器启动
Write-Host "Waiting for container to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# 检查容器状态
$runningContainer = docker ps -q -f "name=$CONTAINER_NAME"
if ($runningContainer) {
    Write-Host "==========================================" -ForegroundColor Green
    Write-Host "  Deployment successful!" -ForegroundColor Green
    Write-Host "  Access URL: http://localhost:$PORT" -ForegroundColor Green
    Write-Host "  Container:  $CONTAINER_NAME" -ForegroundColor Green
    Write-Host "==========================================" -ForegroundColor Green
    
    # 显示容器日志
    Write-Host ""
    Write-Host "Recent logs:"
    docker logs --tail 20 $CONTAINER_NAME
} else {
    Write-Host "==========================================" -ForegroundColor Red
    Write-Host "  Deployment failed!" -ForegroundColor Red
    Write-Host "  Check logs: docker logs $CONTAINER_NAME" -ForegroundColor Red
    Write-Host "==========================================" -ForegroundColor Red
    exit 1
}
