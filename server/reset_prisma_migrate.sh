#!/bin/bash

echo
echo "============================================="
echo "Prisma 迁移基线重置脚本"
echo "将从现有数据库创建新的迁移基线"
echo "保留数据库数据，清空旧迁移历史"
echo "============================================="
echo

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未找到，请先安装 Node.js"
    exit 1
fi

# 检查 npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm 未找到，请先安装 npm"
    exit 1
fi

echo "✅ 检测到 Node.js 和 npm"

# 确认
read -p "⚠️  此操作将清空本地迁移历史并从现有数据库创建新的基线迁移。是否继续？(y/N): " confirm
if [[ ! $confirm =~ ^[Yy]$ ]]; then
    echo "❌ 操作已取消"
    exit 0
fi

echo
echo "1/6. 备份数据库..."
timestamp=$(date +%Y%m%d_%H%M%S)
pg_dump -h localhost -p 5437 -d milicard_dev -U postgres > "milicard_dev_backup_${timestamp}.sql" 2>/dev/null
if [ $? -ne 0 ]; then
    echo "⚠️  备份失败（可能需要输入密码或数据库连接问题）"
    echo "    但继续执行..."
fi

echo
echo "2/6. 从现有数据库反向生成 schema.prisma..."
npx prisma db pull
if [ $? -ne 0 ]; then
    echo "❌ prisma db pull 失败"
    exit 1
fi

echo
echo "3/6. 清空本地迁移目录..."
if [ -d "prisma/migrations" ]; then
    rm -rf prisma/migrations
fi
mkdir -p prisma/migrations

echo
echo "4/6. 生成初始迁移 SQL 文件..."
temp_migration_dir="prisma/migrations/temp_migration"
mkdir -p "$temp_migration_dir"

# 生成迁移 SQL
npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > "$temp_migration_dir/migration.sql"
if [ $? -ne 0 ]; then
    echo "❌ 生成迁移 SQL 失败"
    exit 1
fi

# 创建时间戳目录
timestamp=$(date +%Y%m%d%H%M%S)
init_migration_dir="prisma/migrations/${timestamp}_init_from_db"
mkdir -p "$init_migration_dir"

cp "$temp_migration_dir/migration.sql" "$init_migration_dir/migration.sql"
if [ $? -ne 0 ]; then
    echo "❌ 复制迁移文件失败"
    exit 1
fi

# 创建 steps.json
echo "{}" > "$init_migration_dir/steps.json"

# 清理临时目录
rm -rf "$temp_migration_dir"

echo
echo "5/6. 清空数据库中的 _prisma_migrations 表..."
echo "DELETE FROM _prisma_migrations;" | psql -h localhost -p 5437 -d milicard_dev -U postgres 2>/dev/null
if [ $? -ne 0 ]; then
    echo "⚠️  清空 _prisma_migrations 表失败（可能需要手动执行）"
    echo "    请在数据库中执行: DELETE FROM _prisma_migrations;"
fi

echo
echo "6/6. 标记初始迁移为已应用..."
migration_name="${timestamp}_init_from_db"
npx prisma migrate resolve --applied "$migration_name"
if [ $? -ne 0 ]; then
    echo "❌ 标记迁移为已应用失败"
    exit 1
fi

echo
echo "============================================="
echo "✅ 操作完成！"
echo
echo "📁 本地迁移目录已重建"
echo "🗃️  数据库结构已与 schema.prisma 同步"
echo "💾 数据库数据已保留"
echo "🔄 现在可以正常使用 npx prisma migrate dev"
echo "============================================="
echo
echo "📝 生成的初始迁移: $init_migration_dir"
echo "📝 迁移已标记为应用: $migration_name"
echo