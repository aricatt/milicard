#!/bin/bash
set -e

# 修复 point_visit_tracking 迁移的时间戳错误
# 用法: ./fix_migration_timestamp.sh [staging|production]

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

ENV=${1:-production}

echo -e "${CYAN}=========================================="
echo "  修复迁移时间戳"
echo "  环境: $ENV"
echo "==========================================${NC}"

# 检查环境变量文件
ENV_FILE=".env.${ENV}.rds"
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}错误: 找不到环境配置文件 $ENV_FILE${NC}"
    exit 1
fi

# 加载环境变量
source "$ENV_FILE"

# 验证必要的环境变量
if [ -z "$RDS_HOST" ] || [ -z "$RDS_PASSWORD" ]; then
    echo -e "${RED}错误: 请在 $ENV_FILE 中配置 RDS 连接信息${NC}"
    exit 1
fi

# 设置默认值
RDS_PORT=${RDS_PORT:-5432}
RDS_DATABASE=${RDS_DATABASE:-milicard}
RDS_USER=${RDS_USER:-milicard}

echo "RDS 连接信息:"
echo "  Host:     $RDS_HOST"
echo "  Port:     $RDS_PORT"
echo "  Database: $RDS_DATABASE"
echo "  User:     $RDS_USER"
echo ""

# 检查 psql 是否安装
if ! command -v psql &> /dev/null; then
    echo -e "${RED}错误: 未安装 psql 命令${NC}"
    echo "请先安装 PostgreSQL 客户端:"
    echo "  Ubuntu/Debian: sudo apt-get install postgresql-client"
    echo "  CentOS/RHEL:   sudo yum install postgresql"
    exit 1
fi

# 测试连接
echo -e "${YELLOW}测试 RDS 连接...${NC}"
if ! PGPASSWORD="$RDS_PASSWORD" psql -h "$RDS_HOST" -p "$RDS_PORT" -U "$RDS_USER" -d "$RDS_DATABASE" -c "SELECT 1" > /dev/null 2>&1; then
    echo -e "${RED}错误: 无法连接到 RDS 数据库${NC}"
    echo "请检查:"
    echo "  1. RDS 实例是否运行"
    echo "  2. 安全组是否允许当前服务器连接"
    echo "  3. 数据库凭据是否正确"
    exit 1
fi
echo -e "${GREEN}✅ RDS 连接成功${NC}"
echo ""

# 查看当前迁移记录
echo -e "${CYAN}当前的迁移记录:${NC}"
PGPASSWORD="$RDS_PASSWORD" psql -h "$RDS_HOST" -p "$RDS_PORT" -U "$RDS_USER" -d "$RDS_DATABASE" -c "
SELECT migration_name, finished_at 
FROM _prisma_migrations 
WHERE migration_name LIKE '%point_visit%'
ORDER BY finished_at;
"
echo ""

# 确认操作
echo -e "${YELLOW}即将执行以下操作:${NC}"
echo "  1. 将迁移文件夹重命名: 20250110091000_add_point_visit_tracking"
echo "                    → 20260110091000_add_point_visit_tracking"
echo "  2. 更新数据库中的迁移记录"
echo ""
read -p "确认执行? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "操作已取消"
    exit 0
fi

# 步骤 1: 重命名迁移文件夹
echo -e "${YELLOW}步骤 1: 重命名迁移文件夹...${NC}"
MIGRATION_DIR="server/prisma/migrations"
OLD_NAME="20250110091000_add_point_visit_tracking"
NEW_NAME="20260110091000_add_point_visit_tracking"

if [ -d "$MIGRATION_DIR/$OLD_NAME" ]; then
    mv "$MIGRATION_DIR/$OLD_NAME" "$MIGRATION_DIR/$NEW_NAME"
    echo -e "${GREEN}✅ 迁移文件夹已重命名${NC}"
else
    echo -e "${YELLOW}⚠️  迁移文件夹不存在或已经重命名${NC}"
fi
echo ""

# 步骤 2: 更新数据库记录
echo -e "${YELLOW}步骤 2: 更新数据库迁移记录...${NC}"
PGPASSWORD="$RDS_PASSWORD" psql -h "$RDS_HOST" -p "$RDS_PORT" -U "$RDS_USER" -d "$RDS_DATABASE" << EOF
-- 更新迁移名称
UPDATE _prisma_migrations 
SET migration_name = '20260110091000_add_point_visit_tracking' 
WHERE migration_name = '20250110091000_add_point_visit_tracking';

-- 显示更新结果
SELECT migration_name, finished_at 
FROM _prisma_migrations 
WHERE migration_name LIKE '%point_visit%'
ORDER BY finished_at;
EOF

echo ""
echo -e "${GREEN}=========================================="
echo "  ✅ 迁移时间戳修复完成！"
echo "==========================================${NC}"
echo ""
echo -e "${CYAN}后续步骤:${NC}"
echo "  1. 提交代码变更: git add . && git commit -m 'fix: 修正迁移时间戳'"
echo "  2. 推送到仓库: git push"
echo "  3. 在服务器上拉取最新代码: git pull"
echo ""
