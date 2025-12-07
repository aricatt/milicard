#!/bin/bash
# 数据库备份和恢复工具
# 用法: 
#   ./scripts/db-backup.sh list                    - 列出所有备份
#   ./scripts/db-backup.sh create                  - 创建新备份
#   ./scripts/db-backup.sh restore <备份文件名>    - 恢复备份
#   ./scripts/db-backup.sh download <备份文件名>   - 下载备份到本地

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 默认环境
ENV=${2:-production}
if [ "$ENV" = "production" ]; then
    CONTAINER_NAME="milicard-prod"
else
    CONTAINER_NAME="milicard-staging"
fi

BACKUP_DIR="/var/lib/postgresql/backups"

# 检查容器是否运行
check_container() {
    if ! docker ps -q -f name=${CONTAINER_NAME} > /dev/null 2>&1; then
        echo -e "${RED}错误: 容器 ${CONTAINER_NAME} 未运行${NC}"
        exit 1
    fi
}

# 列出备份
list_backups() {
    echo -e "${BLUE}=========================================="
    echo "  数据库备份列表 (${ENV})"
    echo "==========================================${NC}"
    
    check_container
    
    docker exec ${CONTAINER_NAME} ls -lh ${BACKUP_DIR} 2>/dev/null || echo "暂无备份文件"
}

# 创建备份
create_backup() {
    echo -e "${BLUE}=========================================="
    echo "  创建数据库备份 (${ENV})"
    echo "==========================================${NC}"
    
    check_container
    
    BACKUP_FILE="backup_manual_$(date +%Y%m%d_%H%M%S).sql"
    
    echo -e "${YELLOW}正在创建备份: ${BACKUP_FILE}${NC}"
    
    docker exec ${CONTAINER_NAME} bash -c "PGPASSWORD=\$DB_PASSWORD pg_dump -h localhost -U milicard milicard > ${BACKUP_DIR}/${BACKUP_FILE}"
    
    echo -e "${GREEN}✅ 备份创建成功: ${BACKUP_FILE}${NC}"
    
    # 显示备份大小
    docker exec ${CONTAINER_NAME} ls -lh ${BACKUP_DIR}/${BACKUP_FILE}
}

# 恢复备份
restore_backup() {
    BACKUP_FILE=$1
    
    if [ -z "$BACKUP_FILE" ]; then
        echo -e "${RED}错误: 请指定备份文件名${NC}"
        echo "用法: ./scripts/db-backup.sh restore <备份文件名>"
        list_backups
        exit 1
    fi
    
    echo -e "${RED}=========================================="
    echo "  ⚠️  警告: 即将恢复数据库!"
    echo "  环境: ${ENV}"
    echo "  备份文件: ${BACKUP_FILE}"
    echo "  这将覆盖当前所有数据!"
    echo "==========================================${NC}"
    
    read -p "确认恢复? (输入 YES 继续): " confirm
    if [ "$confirm" != "YES" ]; then
        echo "已取消"
        exit 0
    fi
    
    check_container
    
    echo -e "${YELLOW}正在恢复数据库...${NC}"
    
    # 先创建当前状态的备份
    echo "创建恢复前备份..."
    docker exec ${CONTAINER_NAME} bash -c "PGPASSWORD=\$DB_PASSWORD pg_dump -h localhost -U milicard milicard > ${BACKUP_DIR}/backup_before_restore_$(date +%Y%m%d_%H%M%S).sql"
    
    # 恢复数据库
    docker exec ${CONTAINER_NAME} bash -c "PGPASSWORD=\$DB_PASSWORD psql -h localhost -U milicard milicard < ${BACKUP_DIR}/${BACKUP_FILE}"
    
    echo -e "${GREEN}✅ 数据库恢复成功${NC}"
}

# 下载备份到本地
download_backup() {
    BACKUP_FILE=$1
    
    if [ -z "$BACKUP_FILE" ]; then
        echo -e "${RED}错误: 请指定备份文件名${NC}"
        list_backups
        exit 1
    fi
    
    check_container
    
    LOCAL_DIR="./backups"
    mkdir -p $LOCAL_DIR
    
    echo -e "${YELLOW}正在下载备份文件...${NC}"
    docker cp ${CONTAINER_NAME}:${BACKUP_DIR}/${BACKUP_FILE} ${LOCAL_DIR}/${BACKUP_FILE}
    
    echo -e "${GREEN}✅ 备份已下载到: ${LOCAL_DIR}/${BACKUP_FILE}${NC}"
    ls -lh ${LOCAL_DIR}/${BACKUP_FILE}
}

# 主逻辑
case "$1" in
    list)
        list_backups
        ;;
    create)
        create_backup
        ;;
    restore)
        restore_backup "$3"
        ;;
    download)
        download_backup "$3"
        ;;
    *)
        echo -e "${BLUE}数据库备份工具${NC}"
        echo ""
        echo "用法:"
        echo "  ./scripts/db-backup.sh list [staging|production]              - 列出所有备份"
        echo "  ./scripts/db-backup.sh create [staging|production]            - 创建新备份"
        echo "  ./scripts/db-backup.sh restore [staging|production] <文件名>  - 恢复备份"
        echo "  ./scripts/db-backup.sh download [staging|production] <文件名> - 下载备份"
        echo ""
        echo "示例:"
        echo "  ./scripts/db-backup.sh list production"
        echo "  ./scripts/db-backup.sh create production"
        echo "  ./scripts/db-backup.sh restore production backup_20241207_120000.sql"
        ;;
esac
