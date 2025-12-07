#!/bin/bash
set -e

echo "=========================================="
echo "  MiliCard Docker Container Starting"
echo "=========================================="

# 确保日志目录存在且有正确权限
mkdir -p /var/log/supervisor
chmod 777 /var/log/supervisor

# 检查必要的环境变量
if [ -z "$DB_PASSWORD" ]; then
    echo "ERROR: DB_PASSWORD environment variable is required"
    exit 1
fi

if [ -z "$JWT_SECRET" ]; then
    echo "ERROR: JWT_SECRET environment variable is required"
    exit 1
fi

# 初始化 PostgreSQL 数据目录（如果不存在）
FIRST_RUN=false
if [ ! -f /var/lib/postgresql/data/PG_VERSION ]; then
    echo "Initializing PostgreSQL data directory..."
    FIRST_RUN=true
    chown -R postgres:postgres /var/lib/postgresql/data
    su - postgres -c "/usr/lib/postgresql/14/bin/initdb -D /var/lib/postgresql/data"
    
    # 配置 PostgreSQL 允许本地连接
    echo "host all all 127.0.0.1/32 md5" >> /var/lib/postgresql/data/pg_hba.conf
    echo "local all all trust" >> /var/lib/postgresql/data/pg_hba.conf
fi

# 确保目录权限正确
chown -R postgres:postgres /var/lib/postgresql/data
chown -R postgres:postgres /run/postgresql

# 先启动 PostgreSQL 进行初始化
echo "Starting PostgreSQL for initialization..."
su - postgres -c "/usr/lib/postgresql/14/bin/pg_ctl -D /var/lib/postgresql/data -l /var/log/supervisor/postgresql_init.log start"

# 等待 PostgreSQL 就绪
echo "Waiting for PostgreSQL to be ready..."
until su - postgres -c "pg_isready -h localhost -p 5432" > /dev/null 2>&1; do
    sleep 1
done
echo "PostgreSQL is ready."

# 初始化数据库用户和数据库
/app/init-db.sh

# 设置 DATABASE_URL 环境变量用于 Prisma
export DATABASE_URL="postgresql://milicard:${DB_PASSWORD}@localhost:5432/milicard?schema=public"

# 创建备份目录
BACKUP_DIR="/var/lib/postgresql/backups"
mkdir -p $BACKUP_DIR

# 同步数据库 schema
echo "Syncing database schema..."
cd /app/server

if [ "$NODE_ENV" = "production" ]; then
    # 生产环境：使用安全的迁移方式
    echo "Production mode: Using safe migration strategy..."
    
    # 如果不是首次运行，先备份数据库
    if [ "$FIRST_RUN" = false ]; then
        BACKUP_FILE="$BACKUP_DIR/backup_$(date +%Y%m%d_%H%M%S).sql"
        echo "Creating database backup: $BACKUP_FILE"
        PGPASSWORD="${DB_PASSWORD}" pg_dump -h localhost -U milicard milicard > "$BACKUP_FILE"
        
        # 保留最近 10 个备份
        ls -t $BACKUP_DIR/backup_*.sql 2>/dev/null | tail -n +11 | xargs -r rm
        echo "Backup created successfully."
    fi
    
    # 检查是否有迁移文件
    if [ -d "prisma/migrations" ] && [ "$(ls -A prisma/migrations 2>/dev/null)" ]; then
        echo "Found migration files, checking migration status..."
        
        # 检查 _prisma_migrations 表是否存在
        MIGRATIONS_TABLE_EXISTS=$(PGPASSWORD="${DB_PASSWORD}" psql -h localhost -U milicard -d milicard -tAc "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = '_prisma_migrations')")
        
        if [ "$MIGRATIONS_TABLE_EXISTS" = "t" ]; then
            # 迁移表存在，正常应用迁移
            echo "Migration history found, applying pending migrations..."
            npx prisma migrate status || true
            
            if npx prisma migrate deploy; then
                echo "✅ Database migrations applied successfully."
            else
                echo "⚠️ Migration deploy failed. Check the error above."
                echo "You may need to manually resolve with: npx prisma migrate resolve"
                exit 1
            fi
        else
            # 迁移表不存在，检查数据库是否为空
            TABLE_COUNT=$(PGPASSWORD="${DB_PASSWORD}" psql -h localhost -U milicard -d milicard -tAc "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'")
            
            if [ "$TABLE_COUNT" = "0" ]; then
                # 数据库为空，正常执行迁移
                echo "Empty database, applying all migrations..."
                if npx prisma migrate deploy; then
                    echo "✅ Database migrations applied successfully."
                else
                    echo "⚠️ Migration failed, falling back to db push..."
                    npx prisma db push --accept-data-loss
                fi
            else
                # 数据库有表但没有迁移历史（可能之前用 db push 创建的）
                echo "⚠️ Database has tables but no migration history."
                echo "This usually means the database was created with 'db push'."
                echo "Baselining the database with current migrations..."
                
                # 使用 db push 确保 schema 同步，然后标记迁移为已应用
                npx prisma db push --accept-data-loss
                
                # 创建迁移历史表并标记所有迁移为已应用
                for migration_dir in prisma/migrations/*/; do
                    if [ -d "$migration_dir" ]; then
                        migration_name=$(basename "$migration_dir")
                        if [ "$migration_name" != "migration_lock.toml" ]; then
                            echo "Marking migration as applied: $migration_name"
                            npx prisma migrate resolve --applied "$migration_name" 2>/dev/null || true
                        fi
                    fi
                done
                
                echo "✅ Database baselined successfully."
            fi
        fi
    else
        echo "No migration files found, using db push..."
        npx prisma db push --accept-data-loss
    fi
else
    # 开发/测试环境：使用 db push（更灵活）
    echo "Development mode: Using db push..."
    npx prisma db push --accept-data-loss
fi

# 首次运行时执行数据库种子初始化
if [ "$FIRST_RUN" = true ]; then
    echo "Running database seed..."
    npx prisma db seed
fi

# 停止 PostgreSQL（supervisor 会重新启动它）
echo "Stopping PostgreSQL (will be managed by supervisor)..."
su - postgres -c "/usr/lib/postgresql/14/bin/pg_ctl -D /var/lib/postgresql/data stop"

sleep 2

echo "Starting all services via supervisor..."
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf
