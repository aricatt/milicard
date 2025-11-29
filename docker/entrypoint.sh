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

# 同步数据库 schema
echo "Syncing database schema..."
cd /app/server
npx prisma db push --accept-data-loss

# 首次运行时创建管理员账号
if [ "$FIRST_RUN" = true ]; then
    echo "Creating admin user..."
    node -e "
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createAdmin() {
    const existingAdmin = await prisma.user.findUnique({
        where: { username: 'admin' }
    });
    
    if (!existingAdmin) {
        const passwordHash = await bcrypt.hash('admin123', 12);
        await prisma.user.create({
            data: {
                username: 'admin',
                email: 'admin@milicard.com',
                passwordHash: passwordHash,
                name: '系统管理员',
                isActive: true
            }
        });
        console.log('Admin user created: admin / admin123');
        console.log('⚠️  Please change the password after first login!');
    } else {
        console.log('Admin user already exists.');
    }
    
    await prisma.\$disconnect();
}

createAdmin().catch(console.error);
"
fi

# 停止 PostgreSQL（supervisor 会重新启动它）
echo "Stopping PostgreSQL (will be managed by supervisor)..."
su - postgres -c "/usr/lib/postgresql/14/bin/pg_ctl -D /var/lib/postgresql/data stop"

sleep 2

echo "Starting all services via supervisor..."
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf
