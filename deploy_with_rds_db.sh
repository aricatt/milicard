#!/bin/bash
set -e

# MiliCard 一键部署脚本 (阿里云RDS版本)
# 用法: ./deploy_with_rds_db.sh [staging|production] [--systemd]
# 
# 此脚本用于部署使用外部阿里云RDS数据库的版本
# 容器内不包含PostgreSQL，数据库由阿里云RDS提供
#
# 选项:
#   --systemd    安装为系统服务（推荐，防止用户会话超时导致容器停止）
#   --user       作为用户容器运行（默认，但可能因会话超时而停止）
#
# 数据库安全策略:
#   - staging 环境: 使用 db push（灵活，适合开发）
#   - production 环境: 使用 migrate deploy（安全，RDS自动备份）
#
# 生产环境部署流程:
#   1. 本地开发: 修改 schema.prisma
#   2. 创建迁移: ./scripts/create-migration.sh <迁移名称>
#   3. 提交代码: git add . && git commit
#   4. 部署生产: ./deploy_with_rds_db.sh production
#
# RDS备份管理:
#   - 阿里云RDS控制台管理自动备份
#   - 手动备份: 使用阿里云控制台或pg_dump连接RDS

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 解析参数
USE_SYSTEMD=false
ENV=${1:-staging}
if [ "$2" = "--systemd" ] || [ "$1" = "--systemd" ]; then
    USE_SYSTEMD=true
    if [ "$1" = "--systemd" ]; then
        ENV="staging"
    fi
fi

IMAGE_NAME="milicard-rds"

# 根据环境设置配置
if [ "$ENV" = "production" ]; then
    CONTAINER_NAME="milicard-prod"
    DEFAULT_PORT=8175
    echo -e "${GREEN}Deploying PRODUCTION environment (RDS)${NC}"
elif [ "$ENV" = "staging" ]; then
    CONTAINER_NAME="milicard-staging"
    DEFAULT_PORT=8275
    echo -e "${YELLOW}Deploying STAGING environment (RDS)${NC}"
else
    echo -e "${RED}Invalid environment: $ENV${NC}"
    echo "Usage: ./deploy_with_rds_db.sh [staging|production]"
    exit 1
fi

# 检查环境变量文件
ENV_FILE=".env.${ENV}.rds"
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${YELLOW}Environment file $ENV_FILE not found. Creating template...${NC}"
    cat > "$ENV_FILE" << 'EOF'
# MiliCard RDS 环境配置
# 请修改以下配置后重新运行部署脚本

# ============================================
# 阿里云RDS数据库配置（必填）
# ============================================
# RDS实例ID（用于创建快照备份，可选）
# 在阿里云RDS控制台 -> 实例列表 -> 基本信息中获取
# 格式：rm-xxxxxxxxxxxxxx
RDS_INSTANCE_ID=

# RDS实例内网地址（在阿里云RDS控制台获取）
RDS_HOST=rm-xxxxxx.pg.rds.aliyuncs.com

# RDS端口（默认5432）
RDS_PORT=5432

# 数据库名称
RDS_DATABASE=milicard

# 数据库用户名
RDS_USER=milicard

# 数据库密码（必填，请设置一个强密码）
RDS_PASSWORD=your_secure_password_here

# 完整的DATABASE_URL（自动生成，无需修改）
# DATABASE_URL=postgresql://${RDS_USER}:${RDS_PASSWORD}@${RDS_HOST}:${RDS_PORT}/${RDS_DATABASE}?schema=public

# ============================================
# 应用配置
# ============================================
# JWT 密钥（必填，请设置一个随机字符串）
JWT_SECRET=your_jwt_secret_here

# 物流查询AppCode（可选）
LOGISTICS_APPCODE=

# ============================================
# 文件上传配置
# ============================================
# 服务器访问地址（必填，用于生成图片URL）
BASE_URL=http://your-server-ip:8175

# 阿里云OSS配置（点位拜访图片上传）
OSS_REGION=oss-ap-southeast-7
OSS_ACCESS_KEY_ID=
OSS_ACCESS_KEY_SECRET=
OSS_BUCKET=milisystem-bucket
OSS_ENDPOINT=oss-ap-southeast-7.aliyuncs.com
# OSS_USE_SIGNED_URL=true  # true=私有Bucket使用签名URL(默认), false=公共读Bucket使用普通URL
EOF
    echo -e "${RED}Please edit $ENV_FILE and configure RDS connection${NC}"
    echo -e "${CYAN}Required settings:${NC}"
    echo "  - RDS_HOST: Your RDS instance endpoint"
    echo "  - RDS_PORT: RDS port (default 5432)"
    echo "  - RDS_DATABASE: Database name"
    echo "  - RDS_USER: Database username"
    echo "  - RDS_PASSWORD: Database password"
    echo "  - JWT_SECRET: JWT secret key"
    exit 1
fi

# 加载环境变量
source "$ENV_FILE"

# 验证必要的环境变量
if [ -z "$RDS_HOST" ] || [ "$RDS_HOST" = "rm-xxxxxx.pg.rds.aliyuncs.com" ]; then
    echo -e "${RED}ERROR: Please set RDS_HOST in $ENV_FILE${NC}"
    exit 1
fi

if [ -z "$RDS_PASSWORD" ] || [ "$RDS_PASSWORD" = "your_secure_password_here" ]; then
    echo -e "${RED}ERROR: Please set RDS_PASSWORD in $ENV_FILE${NC}"
    exit 1
fi

if [ -z "$JWT_SECRET" ] || [ "$JWT_SECRET" = "your_jwt_secret_here" ]; then
    echo -e "${RED}ERROR: Please set JWT_SECRET in $ENV_FILE${NC}"
    exit 1
fi

# 设置默认值
RDS_PORT=${RDS_PORT:-5432}
RDS_DATABASE=${RDS_DATABASE:-milicard}
RDS_USER=${RDS_USER:-milicard}

# 构建DATABASE_URL
DATABASE_URL="postgresql://${RDS_USER}:${RDS_PASSWORD}@${RDS_HOST}:${RDS_PORT}/${RDS_DATABASE}?schema=public"

# 使用环境变量中的端口，如果没有则使用默认值
PORT=${PORT:-$DEFAULT_PORT}

echo "=========================================="
echo "  Environment:  $ENV"
echo "  Container:    $CONTAINER_NAME"
echo "  Port:         $PORT"
echo "  Database:     RDS (External)"
echo "  RDS Host:     $RDS_HOST"
echo "  RDS Database: $RDS_DATABASE"
echo "=========================================="

# 检查磁盘空间
echo -e "${YELLOW}Checking disk space...${NC}"
ROOT_USAGE=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
ROOT_AVAIL=$(df -BG / | awk 'NR==2 {print $4}' | sed 's/G//')

echo "Root partition usage: ${ROOT_USAGE}%"
echo "Available space: ${ROOT_AVAIL}GB"

# 检查是否空间不足（使用率>90% 或 可用空间<5GB）
if [ "$ROOT_USAGE" -gt 90 ] || [ "$ROOT_AVAIL" -lt 5 ]; then
    echo -e "${RED}=========================================="
    echo "  ❌ INSUFFICIENT DISK SPACE!"
    echo "=========================================="
    echo "  Root partition usage: ${ROOT_USAGE}%"
    echo "  Available space: ${ROOT_AVAIL}GB"
    echo ""
    echo -e "${YELLOW}Deployment aborted to prevent build failure.${NC}"
    echo ""
    echo -e "${CYAN}Recommended actions (in order):${NC}"
    echo ""
    echo "  1. Clean up dangling images (fast, no impact on build speed):"
    echo -e "     ${GREEN}podman image prune -f${NC}"
    echo "     This removes temporary build layers only"
    echo ""
    echo "  2. If still not enough, clean up all unused images:"
    echo -e "     ${GREEN}podman image prune -a -f${NC}"
    echo "     ⚠️  Warning: Next build will be slower (need to re-download base images)"
    echo ""
    echo "  3. Clean up system resources:"
    echo -e "     ${GREEN}podman system prune -f --volumes${NC}"
    echo "     This removes unused containers, networks, and volumes"
    echo ""
    echo "  3. Clean up system logs:"
    echo -e "     ${GREEN}sudo journalctl --vacuum-time=7d${NC}"
    echo "     This will keep only last 7 days of logs"
    echo ""
    echo "  4. Check disk usage:"
    echo -e "     ${GREEN}df -h${NC}"
    echo -e "     ${GREEN}du -h / --max-depth=1 | sort -rh | head -20${NC}"
    echo ""
    echo -e "${CYAN}After cleanup, run this script again.${NC}"
    echo "==========================================${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Disk space check passed${NC}"
echo ""

# 测试RDS连接（可选，需要安装psql）
echo -e "${YELLOW}Testing RDS connection...${NC}"
if command -v psql &> /dev/null; then
    PGPASSWORD="$RDS_PASSWORD" psql -h "$RDS_HOST" -p "$RDS_PORT" -U "$RDS_USER" -d "$RDS_DATABASE" -c "SELECT 1" > /dev/null 2>&1 && {
        echo -e "${GREEN}✅ RDS connection successful${NC}"
    } || {
        echo -e "${RED}❌ RDS connection failed!${NC}"
        echo "Please check:"
        echo "  1. RDS instance is running"
        echo "  2. Security group allows connection from this server"
        echo "  3. RDS credentials are correct"
        echo "  4. Database '$RDS_DATABASE' exists"
        read -p "Continue anyway? (y/N) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    }
else
    echo -e "${YELLOW}psql not installed, skipping connection test${NC}"
fi

# 部署前备份数据库（使用阿里云 RDS 快照）
echo -e "${YELLOW}=========================================="
echo "  创建部署前数据库备份 (RDS 快照)"
echo "==========================================${NC}"

# 检查是否安装了阿里云 CLI
if command -v aliyun &> /dev/null; then
    # 从环境变量或配置文件读取 RDS 实例 ID
    if [ -n "$RDS_INSTANCE_ID" ]; then
        echo -e "${YELLOW}正在创建 RDS 物理快照备份...${NC}"
        echo "实例 ID: $RDS_INSTANCE_ID"
        
        # 检查是否有正在进行的备份任务
        echo -e "${CYAN}检查备份任务状态...${NC}"
        BACKUP_CHECK=$(timeout 10 aliyun rds DescribeBackups \
            --DBInstanceId "$RDS_INSTANCE_ID" \
            --BackupStatus Running \
            2>&1 || echo "")
        
        if echo "$BACKUP_CHECK" | grep -q "BackupId"; then
            echo -e "${YELLOW}⚠️  检测到正在进行的备份任务${NC}"
            echo "跳过创建新备份，使用现有备份任务"
            echo ""
        else
            # 创建物理快照备份（添加超时控制）
            echo -e "${CYAN}正在调用阿里云 API 创建备份...${NC}"
            
            # 使用 timeout 命令防止卡死，最多等待 30 秒
            if command -v timeout &> /dev/null; then
                BACKUP_RESULT=$(timeout 30 aliyun rds CreateBackup \
                    --DBInstanceId "$RDS_INSTANCE_ID" \
                    --BackupMethod Physical \
                    2>&1)
                EXIT_CODE=$?
            else
                # 如果没有 timeout 命令，直接执行
                BACKUP_RESULT=$(aliyun rds CreateBackup \
                    --DBInstanceId "$RDS_INSTANCE_ID" \
                    --BackupMethod Physical \
                    2>&1)
                EXIT_CODE=$?
            fi
            
            if [ $EXIT_CODE -eq 0 ]; then
                echo -e "${GREEN}✅ RDS 快照备份已创建${NC}"
                echo "$BACKUP_RESULT"
                echo ""
                echo -e "${CYAN}提示：可以在阿里云 RDS 控制台查看备份进度${NC}"
            elif [ $EXIT_CODE -eq 124 ]; then
                echo -e "${YELLOW}⚠️  RDS 快照创建超时（30秒）${NC}"
                echo ""
                echo -e "${CYAN}说明：${NC}"
                echo "  阿里云 API 响应超时，但备份任务可能已在后台创建"
                echo "  请在阿里云 RDS 控制台确认备份状态"
                echo ""
                read -p "继续部署? (y/N) " -n 1 -r
                echo
                if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                    exit 1
                fi
            else
                echo -e "${YELLOW}⚠️  RDS 快照创建失败${NC}"
                echo "$BACKUP_RESULT"
                echo ""
                echo -e "${YELLOW}可能的原因:${NC}"
                echo "  1. 阿里云 CLI 未正确配置（需要 AccessKey）"
                echo "  2. RDS_INSTANCE_ID 不正确（应该是 pgm-xxx 格式）"
                echo "  3. 账号权限不足"
                echo "  4. 区域配置不匹配"
                echo ""
                echo -e "${CYAN}临时方案：${NC}"
                echo "  1. 在阿里云 RDS 控制台手动创建备份"
                echo "  2. RDS 有自动备份功能，可以依赖自动备份"
                read -p "继续部署? (y/N) " -n 1 -r
                echo
                if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                    exit 1
                fi
            fi
        fi
    else
        echo -e "${YELLOW}未配置 RDS_INSTANCE_ID，跳过快照备份${NC}"
        echo ""
        echo -e "${CYAN}建议：${NC}"
        echo "  1. 在 $ENV_FILE 中添加 RDS_INSTANCE_ID 配置"
        echo "  2. 或在阿里云 RDS 控制台手动创建备份"
        echo "  3. RDS 有自动备份功能，也可以依赖自动备份"
        echo ""
        read -p "继续部署? (y/N) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
else
    echo -e "${YELLOW}阿里云 CLI 未安装，跳过快照备份${NC}"
    echo ""
    echo -e "${CYAN}安装阿里云 CLI:${NC}"
    echo "  wget https://aliyuncli.alicdn.com/aliyun-cli-linux-latest-amd64.tgz"
    echo "  tar xzvf aliyun-cli-linux-latest-amd64.tgz"
    echo "  sudo mv aliyun /usr/local/bin/"
    echo "  aliyun configure"
    echo ""
    echo -e "${CYAN}或者：${NC}"
    echo "  1. 在阿里云 RDS 控制台手动创建备份"
    echo "  2. RDS 有自动备份功能，可以依赖自动备份"
    echo ""
    read -p "继续部署? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi
echo ""

# 构建镜像（使用RDS专用Dockerfile）
echo -e "${GREEN}Building Docker image (RDS version)...${NC}"
DOCKERFILE="Dockerfile.rds"
if [ ! -f "$DOCKERFILE" ]; then
    echo -e "${YELLOW}Creating Dockerfile.rds (without PostgreSQL)...${NC}"
    # 如果没有RDS专用Dockerfile，使用默认的但跳过PostgreSQL相关步骤
    DOCKERFILE="Dockerfile"
fi
docker build -t ${IMAGE_NAME}:${ENV} -f ${DOCKERFILE} .

# 停止并删除旧容器（如果存在）
if [ "$(docker ps -aq -f name=${CONTAINER_NAME})" ]; then
    echo -e "${YELLOW}Stopping existing container...${NC}"
    docker stop ${CONTAINER_NAME} || true
    docker rm ${CONTAINER_NAME} || true
fi

# 运行新容器（不需要数据卷，数据在RDS）
echo -e "${GREEN}Starting new container...${NC}"
docker run -d \
    --name ${CONTAINER_NAME} \
    --restart unless-stopped \
    -p ${PORT}:80 \
    -e DATABASE_URL="${DATABASE_URL}" \
    -e JWT_SECRET="${JWT_SECRET}" \
    -e NODE_ENV="${ENV}" \
    -e LOGISTICS_APPCODE="${LOGISTICS_APPCODE:-}" \
    -e BASE_URL="${BASE_URL:-}" \
    -e OSS_REGION="${OSS_REGION:-}" \
    -e OSS_ACCESS_KEY_ID="${OSS_ACCESS_KEY_ID:-}" \
    -e OSS_ACCESS_KEY_SECRET="${OSS_ACCESS_KEY_SECRET:-}" \
    -e OSS_BUCKET="${OSS_BUCKET:-}" \
    -e OSS_ENDPOINT="${OSS_ENDPOINT:-}" \
    -e OSS_USE_SIGNED_URL="${OSS_USE_SIGNED_URL:-true}" \
    -e USE_EXTERNAL_DB="true" \
    ${IMAGE_NAME}:${ENV}

# 等待容器启动
echo -e "${YELLOW}Waiting for container to start...${NC}"
sleep 10

# 如果使用 systemd，则安装系统服务
if [ "$USE_SYSTEMD" = true ]; then
    echo -e "${GREEN}Installing as systemd service...${NC}"
    
    # 检查是否为 root
    if [ "$EUID" -ne 0 ]; then
        echo -e "${YELLOW}Systemd service requires root privileges. Running with sudo...${NC}"
        sudo bash docker/install-service.sh "$ENV"
    else
        bash docker/install-service.sh "$ENV"
    fi
    
    echo -e "${GREEN}=========================================="
    echo "  Systemd service installed! (RDS)"
    echo "  Service:    milicard-${ENV}"
    echo "  Access URL: http://localhost:${PORT}"
    echo "  Database:   RDS ($RDS_HOST)"
    echo ""
    echo "  Useful commands:"
    echo "    journalctl -u milicard-${ENV} -f    # View logs"
    echo "    systemctl status milicard-${ENV}    # Check status"
    echo "    systemctl restart milicard-${ENV}   # Restart service"
    echo "==========================================${NC}"
    exit 0
fi

# 检查容器状态
if [ "$(docker ps -q -f name=${CONTAINER_NAME})" ]; then
    echo -e "${GREEN}=========================================="
    echo "  Deployment successful! (RDS)"
    echo "  Access URL: http://localhost:${PORT}"
    echo "  Container:  ${CONTAINER_NAME}"
    echo "  Database:   RDS ($RDS_HOST)"
    echo ""
    echo -e "${CYAN}  RDS Database Info:"
    echo "    Host:     $RDS_HOST"
    echo "    Port:     $RDS_PORT"
    echo "    Database: $RDS_DATABASE"
    echo "    User:     $RDS_USER"
    echo ""
    echo -e "${YELLOW}  ⚠️  WARNING: User session timeout issue detected!"
    echo "  Your container may stop after ~7 hours due to systemd user session timeout."
    echo ""
    echo "  Recommended solutions:"
    echo "    1. Redeploy as systemd service (recommended):"
    echo "       ./deploy_with_rds_db.sh ${ENV} --systemd"
    echo ""
    echo "    2. Enable user linger (temporary fix):"
    echo "       sudo loginctl enable-linger \$(whoami)"
    echo "==========================================${NC}"
    
    # 显示容器日志
    echo ""
    echo "Recent logs:"
    docker logs --tail 20 ${CONTAINER_NAME}
else
    echo -e "${RED}=========================================="
    echo "  Deployment failed!"
    echo "  Check logs: docker logs ${CONTAINER_NAME}"
    echo "==========================================${NC}"
    exit 1
fi
