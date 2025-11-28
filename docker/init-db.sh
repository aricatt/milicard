#!/bin/bash
set -e

# 等待 PostgreSQL 启动
echo "Waiting for PostgreSQL to start..."
until pg_isready -h localhost -p 5432 -U postgres; do
    sleep 1
done

# 检查数据库是否已存在
if ! su - postgres -c "psql -lqt | cut -d \| -f 1 | grep -qw milicard"; then
    echo "Creating database and user..."
    
    su - postgres -c "psql -c \"CREATE USER milicard WITH PASSWORD '${DB_PASSWORD}';\""
    su - postgres -c "psql -c \"CREATE DATABASE milicard OWNER milicard;\""
    su - postgres -c "psql -c \"GRANT ALL PRIVILEGES ON DATABASE milicard TO milicard;\""
    
    echo "Database created successfully."
    
    # 标记需要创建管理员
    touch /app/.need_admin
else
    echo "Database already exists, skipping creation."
fi

echo "Database initialization completed."
