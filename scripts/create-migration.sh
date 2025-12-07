#!/bin/bash
# 创建数据库迁移文件
# 用法: ./scripts/create-migration.sh <迁移名称>
# 示例: ./scripts/create-migration.sh add_payable_feature

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 检查参数
if [ -z "$1" ]; then
    echo -e "${RED}错误: 请提供迁移名称${NC}"
    echo "用法: ./scripts/create-migration.sh <迁移名称>"
    echo "示例: ./scripts/create-migration.sh add_payable_feature"
    exit 1
fi

MIGRATION_NAME=$1

echo -e "${BLUE}=========================================="
echo "  创建数据库迁移"
echo "  迁移名称: $MIGRATION_NAME"
echo "==========================================${NC}"

cd "$(dirname "$0")/../server"

# 检查本地数据库是否运行
echo -e "${YELLOW}检查本地数据库连接...${NC}"
if ! npx prisma db execute --stdin <<< "SELECT 1" > /dev/null 2>&1; then
    echo -e "${RED}错误: 无法连接到本地数据库${NC}"
    echo "请确保本地 PostgreSQL 正在运行"
    echo "DATABASE_URL: $DATABASE_URL"
    exit 1
fi

echo -e "${GREEN}✓ 数据库连接正常${NC}"

# 显示当前迁移状态
echo -e "${YELLOW}当前迁移状态:${NC}"
npx prisma migrate status || true

echo ""
echo -e "${YELLOW}正在创建迁移文件...${NC}"

# 创建迁移
if npx prisma migrate dev --name "$MIGRATION_NAME"; then
    echo ""
    echo -e "${GREEN}=========================================="
    echo "  ✅ 迁移文件创建成功!"
    echo "==========================================${NC}"
    echo ""
    echo -e "${BLUE}下一步操作:${NC}"
    echo "1. 检查生成的迁移文件: prisma/migrations/"
    echo "2. 提交迁移文件到 Git"
    echo "3. 部署到生产环境: ./deploy.sh production"
    echo ""
    echo -e "${YELLOW}注意: 迁移文件一旦提交，不要修改！${NC}"
    echo "如需修改，请创建新的迁移文件。"
else
    echo ""
    echo -e "${RED}=========================================="
    echo "  ❌ 迁移创建失败"
    echo "==========================================${NC}"
    echo ""
    echo "可能的原因:"
    echo "1. schema.prisma 语法错误"
    echo "2. 迁移会导致数据丢失（需要手动处理）"
    echo "3. 数据库连接问题"
    exit 1
fi
