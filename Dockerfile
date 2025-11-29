# 多阶段构建 - 阶段1: 构建前端
FROM node:20-alpine AS frontend-builder

WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci --registry=https://registry.npmmirror.com --legacy-peer-deps
COPY client/ ./
RUN npm run build

# 多阶段构建 - 阶段2: 构建后端
FROM node:20-alpine AS backend-builder

WORKDIR /app/server
COPY server/package*.json ./
COPY server/prisma ./prisma/
RUN npm ci --registry=https://registry.npmmirror.com
# 生成 Prisma Client
RUN npx prisma generate
COPY server/ ./
RUN npm run build

# 最终镜像
FROM ubuntu:22.04

# 避免交互式安装
ENV DEBIAN_FRONTEND=noninteractive

# 安装必要软件
RUN apt-get update && apt-get install -y \
    curl \
    gnupg \
    lsb-release \
    nginx \
    supervisor \
    postgresql \
    postgresql-contrib \
    && rm -rf /var/lib/apt/lists/*

# 安装 Node.js 20
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# 创建应用目录
WORKDIR /app

# 复制前端构建产物
COPY --from=frontend-builder /app/client/dist /app/client/dist

# 复制后端构建产物和依赖
COPY --from=backend-builder /app/server/dist /app/server/dist
COPY --from=backend-builder /app/server/node_modules /app/server/node_modules
COPY --from=backend-builder /app/server/package.json /app/server/
COPY --from=backend-builder /app/server/prisma /app/server/prisma

# 复制配置文件
COPY docker/nginx.conf /etc/nginx/sites-available/default
COPY docker/supervisord.conf /etc/supervisor/conf.d/supervisord.conf
COPY docker/init-db.sh /app/init-db.sh
COPY docker/entrypoint.sh /app/entrypoint.sh

# 设置执行权限
RUN chmod +x /app/init-db.sh /app/entrypoint.sh

# 创建必要目录
RUN mkdir -p /var/log/supervisor /run/postgresql \
    && chown -R postgres:postgres /run/postgresql

# 暴露端口
EXPOSE 80

# 数据卷 - PostgreSQL 数据目录
VOLUME ["/var/lib/postgresql/data"]

# 启动入口
ENTRYPOINT ["/app/entrypoint.sh"]
