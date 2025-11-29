@echo off
setlocal enabledelayedexpansion

:: MiliCard Windows 一键部署脚本
:: 用法: deploy.bat [staging|production]
:: 需要: Docker Desktop for Windows

set ENV=%1
if "%ENV%"=="" set ENV=staging

set IMAGE_NAME=milicard

if "%ENV%"=="production" (
    set CONTAINER_NAME=milicard-prod
    set PORT=8175
    set VOLUME_NAME=milicard_prod_data
    echo [92mDeploying PRODUCTION environment[0m
) else if "%ENV%"=="staging" (
    set CONTAINER_NAME=milicard-staging
    set PORT=8075
    set VOLUME_NAME=milicard_staging_data
    echo [93mDeploying STAGING environment[0m
) else (
    echo [91mInvalid environment: %ENV%[0m
    echo Usage: deploy.bat [staging^|production]
    exit /b 1
)

:: 检查 Docker 是否运行
docker info >nul 2>&1
if errorlevel 1 (
    echo [91mERROR: Docker is not running. Please start Docker Desktop.[0m
    exit /b 1
)

:: 检查环境变量文件
set ENV_FILE=.env.%ENV%
if not exist "%ENV_FILE%" (
    echo [93mEnvironment file %ENV_FILE% not found. Creating template...[0m
    (
        echo # MiliCard %ENV% 环境配置
        echo # 请修改以下配置后重新运行部署脚本
        echo.
        echo # 数据库密码（必填，请设置一个强密码）
        echo DB_PASSWORD=your_secure_password_here
        echo.
        echo # JWT 密钥（必填，请设置一个随机字符串）
        echo JWT_SECRET=change_this_to_random_string_12345
    ) > "%ENV_FILE%"
    echo [91mPlease edit %ENV_FILE% and set DB_PASSWORD and JWT_SECRET[0m
    exit /b 1
)

:: 加载环境变量
for /f "usebackq tokens=1,* delims==" %%a in ("%ENV_FILE%") do (
    set line=%%a
    if not "!line:~0,1!"=="#" (
        set "%%a=%%b"
    )
)

:: 验证必要的环境变量
if "%DB_PASSWORD%"=="your_secure_password_here" (
    echo [91mERROR: Please set DB_PASSWORD in %ENV_FILE%[0m
    exit /b 1
)
if "%DB_PASSWORD%"=="" (
    echo [91mERROR: Please set DB_PASSWORD in %ENV_FILE%[0m
    exit /b 1
)
if "%JWT_SECRET%"=="" (
    echo [91mERROR: Please set JWT_SECRET in %ENV_FILE%[0m
    exit /b 1
)

echo ==========================================
echo   Environment: %ENV%
echo   Container:   %CONTAINER_NAME%
echo   Port:        %PORT%
echo   Volume:      %VOLUME_NAME%
echo ==========================================

:: 构建镜像
echo [92mBuilding Docker image...[0m
docker build -t %IMAGE_NAME%:%ENV% .
if errorlevel 1 (
    echo [91mERROR: Docker build failed[0m
    exit /b 1
)

:: 停止并删除旧容器（如果存在）
for /f %%i in ('docker ps -aq -f "name=%CONTAINER_NAME%"') do (
    echo [93mStopping existing container...[0m
    docker stop %CONTAINER_NAME% >nul 2>&1
    docker rm %CONTAINER_NAME% >nul 2>&1
)

:: 创建数据卷（如果不存在）
docker volume inspect %VOLUME_NAME% >nul 2>&1
if errorlevel 1 (
    echo [92mCreating data volume...[0m
    docker volume create %VOLUME_NAME%
)

:: 运行新容器
echo [92mStarting new container...[0m
docker run -d ^
    --name %CONTAINER_NAME% ^
    --restart unless-stopped ^
    -p %PORT%:80 ^
    -v %VOLUME_NAME%:/var/lib/postgresql/data ^
    -e "DB_PASSWORD=%DB_PASSWORD%" ^
    -e "JWT_SECRET=%JWT_SECRET%" ^
    -e "NODE_ENV=%ENV%" ^
    %IMAGE_NAME%:%ENV%

if errorlevel 1 (
    echo [91mERROR: Failed to start container[0m
    exit /b 1
)

:: 等待容器启动
echo [93mWaiting for container to start...[0m
timeout /t 10 /nobreak >nul

:: 检查容器状态
for /f %%i in ('docker ps -q -f "name=%CONTAINER_NAME%"') do set RUNNING=%%i
if defined RUNNING (
    echo [92m==========================================[0m
    echo [92m  Deployment successful![0m
    echo [92m  Access URL: http://localhost:%PORT%[0m
    echo [92m  Container:  %CONTAINER_NAME%[0m
    echo [92m==========================================[0m
    echo.
    echo Recent logs:
    docker logs --tail 20 %CONTAINER_NAME%
) else (
    echo [91m==========================================[0m
    echo [91m  Deployment failed![0m
    echo [91m  Check logs: docker logs %CONTAINER_NAME%[0m
    echo [91m==========================================[0m
    exit /b 1
)

endlocal
