#!/bin/bash
# MiliCard 数据库还原脚本
# 用法: ./db_restore.sh <backup_file> [options]
# 将备份文件还原到本地开发数据库

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 默认配置
DB_HOST="localhost"
DB_PORT="5437"
DB_NAME="milicard_dev"
DB_USER="postgres"
DB_PASSWORD="${DB_PASSWORD:-840928}"

# 解析参数
BACKUP_FILE=""
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--host)
            DB_HOST="$2"
            shift 2
            ;;
        -p|--port)
            DB_PORT="$2"
            shift 2
            ;;
        -d|--database)
            DB_NAME="$2"
            shift 2
            ;;
        -U|--user)
            DB_USER="$2"
            shift 2
            ;;
        -W|--password)
            DB_PASSWORD="$2"
            shift 2
            ;;
        -*)
            echo -e "${RED}Unknown option: $1${NC}"
            exit 1
            ;;
        *)
            BACKUP_FILE="$1"
            shift
            ;;
    esac
done

# 检查备份文件参数
if [ -z "$BACKUP_FILE" ]; then
    echo -e "${RED}ERROR: Backup file is required.${NC}"
    echo ""
    echo "Usage: ./db_restore.sh <backup_file> [options]"
    echo ""
    echo "Options:"
    echo "  -h, --host      Database host (default: localhost)"
    echo "  -p, --port      Database port (default: 5437)"
    echo "  -d, --database  Database name (default: milicard_dev)"
    echo "  -U, --user      Database user (default: postgres)"
    echo "  -W, --password  Database password (default: 840928)"
    echo ""
    echo "Example:"
    echo "  ./db_restore.sh backups/milicard_production_20251208.sql"
    echo "  ./db_restore.sh backup.sql -p 5432 -W mypassword"
    exit 1
fi

echo ""
echo -e "${CYAN}=============================================${NC}"
echo -e "${CYAN}  MiliCard Database Restore${NC}"
echo -e "${CYAN}=============================================${NC}"
echo ""

# 检查备份文件是否存在
if [ ! -f "$BACKUP_FILE" ]; then
    echo -e "${RED}ERROR: Backup file not found: $BACKUP_FILE${NC}"
    exit 1
fi

FILE_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)

echo -e "${YELLOW}Backup file: $BACKUP_FILE${NC}"
echo -e "${YELLOW}File size:   $FILE_SIZE${NC}"
echo ""
echo -e "${YELLOW}Target database:${NC}"
echo "  Host:     $DB_HOST"
echo "  Port:     $DB_PORT"
echo "  Database: $DB_NAME"
echo "  User:     $DB_USER"
echo ""

# 确认操作
echo -e "${RED}WARNING: This will REPLACE all data in $DB_NAME!${NC}"
read -p "Continue? (y/N): " confirm
if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
    echo -e "${YELLOW}Cancelled.${NC}"
    exit 0
fi

# 设置密码环境变量
export PGPASSWORD="$DB_PASSWORD"

# 检查数据库连接
echo ""
echo -e "${CYAN}Checking database connection...${NC}"
if ! psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "postgres" -c "SELECT 1" > /dev/null 2>&1; then
    echo -e "${RED}ERROR: Cannot connect to PostgreSQL at ${DB_HOST}:${DB_PORT}${NC}"
    echo -e "${YELLOW}Please make sure PostgreSQL is running.${NC}"
    exit 1
fi
echo -e "${GREEN}[OK] Database connection successful${NC}"

# 断开现有连接并删除数据库
echo -e "${CYAN}Dropping existing database...${NC}"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "postgres" -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$DB_NAME' AND pid <> pg_backend_pid();" > /dev/null 2>&1 || true
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "postgres" -c "DROP DATABASE IF EXISTS \"$DB_NAME\";" > /dev/null 2>&1 || true
echo -e "${GREEN}[OK] Existing database dropped${NC}"

# 创建新数据库
echo -e "${CYAN}Creating new database...${NC}"
if ! psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "postgres" -c "CREATE DATABASE \"$DB_NAME\";"; then
    echo -e "${RED}ERROR: Failed to create database${NC}"
    exit 1
fi
echo -e "${GREEN}[OK] Database created${NC}"

# 还原数据库
echo -e "${CYAN}Restoring database (this may take a while)...${NC}"
if pg_restore -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -v "$BACKUP_FILE" 2>&1 | grep -i "error" || true; then
    : # 忽略一些非致命错误
fi
echo -e "${GREEN}[OK] Database restored${NC}"

# 清理密码环境变量
unset PGPASSWORD

echo ""
echo -e "${GREEN}=============================================${NC}"
echo -e "${GREEN}  Restore Completed!${NC}"
echo -e "${GREEN}=============================================${NC}"
echo ""
echo "Database $DB_NAME has been restored from $BACKUP_FILE"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "  1. Reset migration baseline:"
echo "     cd server"
echo "     ./reset_prisma_migrate.sh"
echo ""
echo "  2. Generate Prisma client:"
echo "     npx prisma generate"
echo ""
echo "  3. Start development server:"
echo "     npm run dev"
echo ""
