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

# 首次运行时创建管理员账号和角色
if [ "$FIRST_RUN" = true ]; then
    echo "Creating admin user, roles and permissions..."
    node -e "
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createAdminWithRole() {
    // 1. 创建 SUPER_ADMIN 角色（如果不存在）
    let superAdminRole = await prisma.role.findUnique({
        where: { name: 'SUPER_ADMIN' }
    });
    
    if (!superAdminRole) {
        superAdminRole = await prisma.role.create({
            data: {
                name: 'SUPER_ADMIN',
                description: '超级管理员',
                isSystem: true,
                permissions: ['*']
            }
        });
        console.log('SUPER_ADMIN role created.');
    }
    
    // 2. 创建 admin 用户（如果不存在）
    let admin = await prisma.user.findUnique({
        where: { username: 'admin' }
    });
    
    if (!admin) {
        const passwordHash = await bcrypt.hash('admin123', 12);
        admin = await prisma.user.create({
            data: {
                username: 'admin',
                email: 'admin@milicard.com',
                passwordHash: passwordHash,
                name: '超级管理员',
                isActive: true
            }
        });
        console.log('Admin user created: admin / admin123');
        console.log('⚠️  Please change the password after first login!');
    } else {
        console.log('Admin user already exists.');
    }
    
    // 3. 分配 SUPER_ADMIN 角色给 admin 用户（如果未分配）
    const existingUserRole = await prisma.userRole.findFirst({
        where: {
            userId: admin.id,
            roleId: superAdminRole.id
        }
    });
    
    if (!existingUserRole) {
        await prisma.userRole.create({
            data: {
                userId: admin.id,
                roleId: superAdminRole.id,
                isActive: true
            }
        });
        console.log('SUPER_ADMIN role assigned to admin user.');
    }
    
    // 4. 初始化 Casbin 策略 - 为 SUPER_ADMIN 角色添加全局权限
    // 检查是否已存在 SUPER_ADMIN 的全局策略
    const existingPolicy = await prisma.casbinRule.findFirst({
        where: {
            ptype: 'p',
            v0: 'SUPER_ADMIN',
            v1: '*'
        }
    });
    
    if (!existingPolicy) {
        // 添加 SUPER_ADMIN 角色的全局权限策略
        await prisma.casbinRule.create({
            data: {
                ptype: 'p',
                v0: 'SUPER_ADMIN',
                v1: '*',      // 所有基地
                v2: '*',      // 所有资源
                v3: '*',      // 所有操作
                v4: 'allow'   // 允许
            }
        });
        console.log('SUPER_ADMIN global permission policy created.');
    }
    
    // 5. 将 admin 用户添加到 SUPER_ADMIN 角色（Casbin g 策略）
    const existingGroupPolicy = await prisma.casbinRule.findFirst({
        where: {
            ptype: 'g',
            v0: admin.id,
            v1: 'SUPER_ADMIN'
        }
    });
    
    if (!existingGroupPolicy) {
        await prisma.casbinRule.create({
            data: {
                ptype: 'g',
                v0: admin.id,
                v1: 'SUPER_ADMIN',
                v2: '*'       // 所有基地
            }
        });
        console.log('Admin user added to SUPER_ADMIN role in Casbin.');
    }
    
    await prisma.\$disconnect();
    console.log('');
    console.log('========================================');
    console.log('  Admin account initialized!');
    console.log('  Username: admin');
    console.log('  Password: admin123');
    console.log('  ⚠️  Please change password after login!');
    console.log('========================================');
}

createAdminWithRole().catch(console.error);
"
fi

# 停止 PostgreSQL（supervisor 会重新启动它）
echo "Stopping PostgreSQL (will be managed by supervisor)..."
su - postgres -c "/usr/lib/postgresql/14/bin/pg_ctl -D /var/lib/postgresql/data stop"

sleep 2

echo "Starting all services via supervisor..."
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf
