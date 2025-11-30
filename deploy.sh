#!/bin/bash
set -e

# MiliCard 一键部署脚本
# 用法: ./deploy.sh [staging|production]

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 默认配置
ENV=${1:-staging}
IMAGE_NAME="milicard"

# 根据环境设置配置
if [ "$ENV" = "production" ]; then
    CONTAINER_NAME="milicard-prod"
    DEFAULT_PORT=8175
    VOLUME_NAME="milicard_prod_data"
    echo -e "${GREEN}Deploying PRODUCTION environment${NC}"
elif [ "$ENV" = "staging" ]; then
    CONTAINER_NAME="milicard-staging"
    DEFAULT_PORT=8075
    VOLUME_NAME="milicard_staging_data"
    echo -e "${YELLOW}Deploying STAGING environment${NC}"
else
    echo -e "${RED}Invalid environment: $ENV${NC}"
    echo "Usage: ./deploy.sh [staging|production]"
    exit 1
fi

# 检查环境变量文件
ENV_FILE=".env.${ENV}"
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${YELLOW}Environment file $ENV_FILE not found. Creating template...${NC}"
    cat > "$ENV_FILE" << EOF
# MiliCard ${ENV} 环境配置
# 请修改以下配置后重新运行部署脚本

# 数据库密码（必填，请设置一个强密码）
DB_PASSWORD=your_secure_password_here

# JWT 密钥（必填，请设置一个随机字符串）
JWT_SECRET=your_jwt_secret_here_$(openssl rand -hex 16)
EOF
    echo -e "${RED}Please edit $ENV_FILE and set DB_PASSWORD and JWT_SECRET${NC}"
    exit 1
fi

# 加载环境变量
source "$ENV_FILE"

# 验证必要的环境变量
if [ "$DB_PASSWORD" = "your_secure_password_here" ] || [ -z "$DB_PASSWORD" ]; then
    echo -e "${RED}ERROR: Please set DB_PASSWORD in $ENV_FILE${NC}"
    exit 1
fi

if [ -z "$JWT_SECRET" ]; then
    echo -e "${RED}ERROR: Please set JWT_SECRET in $ENV_FILE${NC}"
    exit 1
fi

# 使用环境变量中的端口，如果没有则使用默认值
PORT=${PORT:-$DEFAULT_PORT}

echo "=========================================="
echo "  Environment: $ENV"
echo "  Container:   $CONTAINER_NAME"
echo "  Port:        $PORT"
echo "  Volume:      $VOLUME_NAME"
echo "=========================================="

# 构建镜像
echo -e "${GREEN}Building Docker image...${NC}"
docker build -t ${IMAGE_NAME}:${ENV} .

# 停止并删除旧容器（如果存在）
if [ "$(docker ps -aq -f name=${CONTAINER_NAME})" ]; then
    echo -e "${YELLOW}Stopping existing container...${NC}"
    docker stop ${CONTAINER_NAME} || true
    docker rm ${CONTAINER_NAME} || true
fi

# 创建数据卷（如果不存在）
if ! docker volume inspect ${VOLUME_NAME} > /dev/null 2>&1; then
    echo -e "${GREEN}Creating data volume...${NC}"
    docker volume create ${VOLUME_NAME}
fi

# 运行新容器
echo -e "${GREEN}Starting new container...${NC}"
docker run -d \
    --name ${CONTAINER_NAME} \
    --restart unless-stopped \
    -p ${PORT}:80 \
    -v ${VOLUME_NAME}:/var/lib/postgresql/data \
    -e DB_PASSWORD="${DB_PASSWORD}" \
    -e JWT_SECRET="${JWT_SECRET}" \
    -e NODE_ENV="${ENV}" \
    ${IMAGE_NAME}:${ENV}

# 等待容器启动
echo -e "${YELLOW}Waiting for container to start...${NC}"
sleep 10

# 检查容器状态
if [ "$(docker ps -q -f name=${CONTAINER_NAME})" ]; then
    echo -e "${GREEN}=========================================="
    echo "  Deployment successful!"
    echo "  Access URL: http://localhost:${PORT}"
    echo "  Container:  ${CONTAINER_NAME}"
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
