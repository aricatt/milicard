#!/bin/bash
# MiliCard 数据库导出脚本
# 用法: ./db_export.sh [staging|production]
# 从 Docker 容器中导出数据库备份

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 默认环境
ENV=${1:-production}

# 验证环境参数
if [ "$ENV" != "staging" ] && [ "$ENV" != "production" ]; then
    echo -e "${RED}Invalid environment: $ENV${NC}"
    echo "Usage: ./db_export.sh [staging|production]"
    exit 1
fi

# 配置
if [ "$ENV" = "production" ]; then
    CONTAINER_NAME="milicard-prod"
else
    CONTAINER_NAME="milicard-staging"
fi

BACKUP_DIR="backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="milicard_${ENV}_${TIMESTAMP}.sql"

echo ""
echo -e "${CYAN}=============================================${NC}"
echo -e "${CYAN}  MiliCard Database Export${NC}"
echo -e "${CYAN}=============================================${NC}"
echo ""
echo -e "${YELLOW}Environment: $ENV${NC}"
echo -e "${YELLOW}Container:   $CONTAINER_NAME${NC}"
echo ""

# 检查容器是否运行
if ! docker ps --filter "name=$CONTAINER_NAME" --format "{{.Names}}" | grep -q "$CONTAINER_NAME"; then
    echo -e "${RED}ERROR: Container $CONTAINER_NAME is not running.${NC}"
    echo -e "${YELLOW}Please start the container first: ./deploy.sh $ENV${NC}"
    exit 1
fi

# 创建备份目录
if [ ! -d "$BACKUP_DIR" ]; then
    mkdir -p "$BACKUP_DIR"
    echo -e "${GREEN}Created backup directory: $BACKUP_DIR${NC}"
fi

# 导出数据库
echo -e "${CYAN}Exporting database...${NC}"
if docker exec "$CONTAINER_NAME" su - postgres -c "pg_dump -Fc milicard" > "$BACKUP_DIR/$BACKUP_FILE"; then
    FILE_SIZE=$(du -h "$BACKUP_DIR/$BACKUP_FILE" | cut -f1)
    
    echo ""
    echo -e "${GREEN}=============================================${NC}"
    echo -e "${GREEN}  Export Completed!${NC}"
    echo -e "${GREEN}=============================================${NC}"
    echo ""
    echo "Backup file: $BACKUP_DIR/$BACKUP_FILE"
    echo "File size:   $FILE_SIZE"
    echo ""
    echo -e "${YELLOW}To restore to local dev environment:${NC}"
    echo "  ./db_restore.sh \"$BACKUP_DIR/$BACKUP_FILE\""
    echo ""
else
    echo -e "${RED}ERROR: Failed to export database.${NC}"
    exit 1
fi
