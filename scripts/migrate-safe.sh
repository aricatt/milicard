#!/bin/bash

# 数据库安全迁移脚本
# 用途：自动化执行数据库迁移的标准流程
# 使用方法：./scripts/migrate-safe.sh [migration-name]

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置
BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
MIGRATION_NAME=${1:-"migration_${TIMESTAMP}"}

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}数据库安全迁移脚本${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# 检查是否在正确的目录
if [ ! -f "package.json" ]; then
    echo -e "${RED}错误：请在项目根目录运行此脚本${NC}"
    exit 1
fi

# 检查是否有未提交的 schema 变更
if ! git diff --quiet server/prisma/schema.prisma; then
    echo -e "${YELLOW}警告：检测到 schema.prisma 有未提交的变更${NC}"
    read -p "是否继续？(y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${RED}迁移已取消${NC}"
        exit 1
    fi
fi

# 步骤 1：备份数据库
echo -e "${BLUE}[1/7] 备份数据库...${NC}"
mkdir -p ${BACKUP_DIR}

# 从 .env 文件读取数据库配置
if [ -f "server/.env" ]; then
    export $(cat server/.env | grep -v '^#' | xargs)
fi

BACKUP_FILE="${BACKUP_DIR}/backup_${TIMESTAMP}.sql"

# 根据数据库类型选择备份命令
if [[ $DATABASE_URL == postgresql* ]]; then
    # 提取 PostgreSQL 连接信息
    DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
    DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
    DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')
    DB_USER=$(echo $DATABASE_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
    
    echo "正在备份 PostgreSQL 数据库: ${DB_NAME}"
    PGPASSWORD=${DB_PASSWORD} pg_dump -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d ${DB_NAME} > ${BACKUP_FILE}
else
    echo -e "${RED}错误：不支持的数据库类型${NC}"
    exit 1
fi

if [ -f "${BACKUP_FILE}" ]; then
    BACKUP_SIZE=$(du -h ${BACKUP_FILE} | cut -f1)
    echo -e "${GREEN}✓ 备份完成：${BACKUP_FILE} (${BACKUP_SIZE})${NC}"
else
    echo -e "${RED}✗ 备份失败${NC}"
    exit 1
fi

# 步骤 2：验证 Schema
echo -e "${BLUE}[2/7] 验证 Prisma Schema...${NC}"
cd server
if npx prisma validate; then
    echo -e "${GREEN}✓ Schema 验证通过${NC}"
else
    echo -e "${RED}✗ Schema 验证失败${NC}"
    exit 1
fi

# 步骤 3：停止服务
echo -e "${BLUE}[3/7] 停止 Node.js 服务...${NC}"
if command -v taskkill &> /dev/null; then
    # Windows
    taskkill //F //IM node.exe 2>/dev/null || echo "没有运行中的 Node.js 进程"
else
    # Linux/Mac
    pkill -f node || echo "没有运行中的 Node.js 进程"
fi
sleep 2
echo -e "${GREEN}✓ 服务已停止${NC}"

# 步骤 4：清理缓存
echo -e "${BLUE}[4/7] 清理 Prisma Client 缓存...${NC}"
rm -rf node_modules/.prisma
rm -rf node_modules/@prisma/client
echo -e "${GREEN}✓ 缓存已清理${NC}"

# 步骤 5：执行迁移
echo -e "${BLUE}[5/7] 执行数据库迁移...${NC}"
echo -e "${YELLOW}请选择迁移方式：${NC}"
echo "1) db push (开发环境，可接受数据丢失)"
echo "2) migrate dev (生产环境，保留数据)"
read -p "选择 (1/2): " -n 1 -r
echo

if [[ $REPLY == "1" ]]; then
    echo -e "${YELLOW}警告：此操作可能导致数据丢失！${NC}"
    read -p "确认执行 db push？(y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        if npx prisma db push --accept-data-loss; then
            echo -e "${GREEN}✓ db push 完成${NC}"
        else
            echo -e "${RED}✗ db push 失败${NC}"
            echo -e "${YELLOW}正在恢复备份...${NC}"
            PGPASSWORD=${DB_PASSWORD} psql -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d ${DB_NAME} < ../${BACKUP_FILE}
            exit 1
        fi
    else
        echo -e "${RED}迁移已取消${NC}"
        exit 1
    fi
elif [[ $REPLY == "2" ]]; then
    if npx prisma migrate dev --name ${MIGRATION_NAME}; then
        echo -e "${GREEN}✓ migrate dev 完成${NC}"
    else
        echo -e "${RED}✗ migrate dev 失败${NC}"
        echo -e "${YELLOW}正在恢复备份...${NC}"
        PGPASSWORD=${DB_PASSWORD} psql -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d ${DB_NAME} < ../${BACKUP_FILE}
        exit 1
    fi
else
    echo -e "${RED}无效的选择，迁移已取消${NC}"
    exit 1
fi

# 步骤 6：重新生成 Prisma Client
echo -e "${BLUE}[6/7] 重新生成 Prisma Client...${NC}"
if npx prisma generate; then
    echo -e "${GREEN}✓ Prisma Client 生成完成${NC}"
else
    echo -e "${RED}✗ Prisma Client 生成失败${NC}"
    exit 1
fi

# 步骤 7：重启服务
echo -e "${BLUE}[7/7] 重启服务...${NC}"
echo -e "${YELLOW}请手动启动服务：npm run dev${NC}"
echo ""

# 完成
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}迁移完成！${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}备份文件：${BACKUP_FILE}${NC}"
echo -e "${BLUE}迁移名称：${MIGRATION_NAME}${NC}"
echo ""
echo -e "${YELLOW}下一步：${NC}"
echo "1. 启动服务：npm run dev"
echo "2. 验证功能是否正常"
echo "3. 运行测试：npm test"
echo "4. 如果有问题，使用备份恢复："
echo "   psql -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d ${DB_NAME} < ${BACKUP_FILE}"
echo ""
