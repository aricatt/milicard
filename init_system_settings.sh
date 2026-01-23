#!/bin/bash
set -e

# 初始化系统参数脚本
# 用法: ./init_system_settings.sh [staging|production]

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

ENV=${1:-production}

echo -e "${CYAN}=========================================="
echo "  初始化系统参数"
echo "  环境: $ENV"
echo "==========================================${NC}"

# 容器名称
if [ "$ENV" = "production" ]; then
    CONTAINER_NAME="milicard-prod"
elif [ "$ENV" = "staging" ]; then
    CONTAINER_NAME="milicard-staging"
else
    echo -e "${RED}错误: 无效的环境 $ENV${NC}"
    echo "用法: ./init_system_settings.sh [staging|production]"
    exit 1
fi

# 检查容器是否运行
if [ ! "$(docker ps -q -f name=${CONTAINER_NAME})" ]; then
    echo -e "${RED}错误: 容器 ${CONTAINER_NAME} 未运行${NC}"
    exit 1
fi

echo -e "${YELLOW}在容器 ${CONTAINER_NAME} 中运行种子脚本...${NC}"

# 在容器中运行种子脚本
docker exec ${CONTAINER_NAME} bash -c "cd /app/server && npx ts-node prisma/seed-global-settings.ts"

echo ""
echo -e "${GREEN}=========================================="
echo "  ✅ 系统参数初始化完成！"
echo "==========================================${NC}"
echo ""
echo -e "${CYAN}验证参数:${NC}"
echo "访问: http://your-server:port/global-info/global-setting"
echo "查找: business.profit_margin_threshold"
echo ""
