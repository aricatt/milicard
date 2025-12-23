#!/bin/bash
set -e

echo "=========================================="
echo "  MiliCard Docker Container Starting"
echo "  (RDS External Database Version)"
echo "=========================================="

# 确保日志目录存在且有正确权限
mkdir -p /var/log/supervisor
chmod 777 /var/log/supervisor

# 检查必要的环境变量
if [ -z "$DATABASE_URL" ]; then
    echo "ERROR: DATABASE_URL environment variable is required"
    echo "Format: postgresql://user:password@host:port/database?schema=public"
    exit 1
fi

if [ -z "$JWT_SECRET" ]; then
    echo "ERROR: JWT_SECRET environment variable is required"
    exit 1
fi

echo "Database: External RDS"
echo "DATABASE_URL: ${DATABASE_URL%%@*}@***" # 隐藏密码部分

# 等待RDS数据库就绪
echo "Waiting for RDS database to be ready..."
MAX_RETRIES=30
RETRY_COUNT=0

# 从DATABASE_URL提取连接信息用于测试
# 格式: postgresql://user:password@host:port/database?schema=public
DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')

if [ -z "$DB_HOST" ] || [ -z "$DB_PORT" ]; then
    echo "Warning: Could not parse DATABASE_URL for connection test"
    echo "Proceeding without connection test..."
else
    echo "Testing connection to $DB_HOST:$DB_PORT..."
    while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
        # 使用 timeout + bash /dev/tcp 检测端口
        if timeout 3 bash -c "echo > /dev/tcp/$DB_HOST/$DB_PORT" 2>/dev/null; then
            echo "✅ RDS database is reachable at $DB_HOST:$DB_PORT"
            break
        fi
        RETRY_COUNT=$((RETRY_COUNT + 1))
        echo "Waiting for RDS... ($RETRY_COUNT/$MAX_RETRIES)"
        sleep 2
    done

    if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
        echo "⚠️ Warning: Could not verify RDS connection after $MAX_RETRIES attempts"
        echo "Proceeding anyway - Prisma will handle connection..."
    fi
fi

# 同步数据库 schema
echo "Syncing database schema with RDS..."
cd /app/server

# 检查是否有迁移文件
if [ -d "prisma/migrations" ] && [ "$(ls -A prisma/migrations 2>/dev/null)" ]; then
    echo "Found migration files, applying migrations to RDS..."
    
    # 显示迁移状态
    npx prisma migrate status || true
    
    # 应用迁移
    if npx prisma migrate deploy; then
        echo "✅ Database migrations applied successfully to RDS."
    else
        echo "⚠️ Migration deploy failed."
        echo "This might be because:"
        echo "  1. RDS database is not accessible"
        echo "  2. Migration conflicts exist"
        echo "  3. Database needs to be baselined"
        echo ""
        echo "Attempting db push as fallback..."
        if npx prisma db push --accept-data-loss; then
            echo "✅ Database schema synced via db push."
        else
            echo "❌ Database sync failed. Please check RDS connection and credentials."
            exit 1
        fi
    fi
else
    # 没有迁移文件，使用 db push
    echo "No migration files found, using db push..."
    if npx prisma db push --accept-data-loss; then
        echo "✅ Database schema synced via db push."
    else
        echo "❌ Database sync failed. Please check RDS connection and credentials."
        exit 1
    fi
fi

# 检查是否需要执行种子数据（首次部署）
# 通过检查users表是否为空来判断
echo "Checking if database needs seeding..."
USER_COUNT=$(npx prisma db execute --stdin <<< "SELECT COUNT(*) FROM users" 2>/dev/null | grep -o '[0-9]*' | head -1 || echo "0")

if [ "$USER_COUNT" = "0" ] || [ -z "$USER_COUNT" ]; then
    echo "Database appears empty, running seed..."
    npx prisma db seed || {
        echo "⚠️ Seed failed, but continuing..."
    }
else
    echo "Database already has data, skipping seed."
fi

echo ""
echo "=========================================="
echo "  Starting all services via supervisor"
echo "=========================================="
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf
