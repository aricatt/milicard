# MiliCard 服务器环境搭建指南

本文档记录如何在阿里云 Linux 服务器上部署 MiliCard 应用。

## 目录

1. [服务器要求](#服务器要求)
2. [基础环境配置](#基础环境配置)
3. [安装 Docker/Podman](#安装-dockerpodman)
4. [安装 Caddy（HTTPS 反向代理）](#安装-caddy)
5. [部署应用](#部署应用)
6. [域名和 SSL 配置](#域名和-ssl-配置)
7. [常用运维命令](#常用运维命令)
8. [故障排查](#故障排查)

---

## 服务器要求

| 项目 | 最低配置 | 推荐配置 |
|------|---------|---------|
| CPU | 1 核 | 2 核+ |
| 内存 | 2 GB | 4 GB+ |
| 硬盘 | 20 GB | 40 GB+ |
| 系统 | Alibaba Cloud Linux 3 / CentOS 7+ / Ubuntu 20.04+ | - |

---

## 基础环境配置

### 1. 更新系统

```bash
# Alibaba Cloud Linux / CentOS
sudo yum update -y

# Ubuntu
sudo apt update && sudo apt upgrade -y
```

### 2. 安装基础工具

```bash
# Alibaba Cloud Linux / CentOS
sudo yum install -y git curl wget vim

# Ubuntu
sudo apt install -y git curl wget vim
```

### 3. 配置低端口权限（允许非 root 用户使用 80/443 端口）

```bash
# 临时生效
sudo sysctl -w net.ipv4.ip_unprivileged_port_start=80

# 永久生效
echo 'net.ipv4.ip_unprivileged_port_start=80' | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

### 4. 创建部署用户（可选，推荐）

```bash
# 创建用户
sudo useradd -m -s /bin/bash deploy
sudo passwd deploy

# 添加到 docker 组（安装 docker 后执行）
sudo usermod -aG docker deploy
```

---

## 安装 Docker/Podman

### 方案 A：安装 Podman（阿里云 Linux 推荐）

Alibaba Cloud Linux 3 默认支持 Podman：

```bash
sudo yum install -y podman

# 验证安装
podman --version

# 设置 docker 别名（可选）
echo 'alias docker=podman' >> ~/.bashrc
source ~/.bashrc
```

### 方案 B：安装 Docker

```bash
# 安装 Docker
curl -fsSL https://get.docker.com | sh

# 启动 Docker
sudo systemctl start docker
sudo systemctl enable docker

# 将当前用户添加到 docker 组
sudo usermod -aG docker $USER

# 重新登录使组权限生效
exit
# 重新 SSH 登录
```

---

## 安装 Caddy

Caddy 用于反向代理和自动 HTTPS 证书管理。

### 安装方法 1：使用包管理器

```bash
# Alibaba Cloud Linux / CentOS
sudo yum install -y yum-plugin-copr
sudo yum copr enable @caddy/caddy -y
sudo yum install -y caddy
```

### 安装方法 2：直接下载二进制

```bash
# 下载最新版本
curl -OL https://github.com/caddyserver/caddy/releases/download/v2.7.6/caddy_2.7.6_linux_amd64.tar.gz

# 解压并安装
tar -xzf caddy_2.7.6_linux_amd64.tar.gz
sudo mv caddy /usr/bin/
sudo chmod +x /usr/bin/caddy

# 创建 systemd 服务
sudo tee /etc/systemd/system/caddy.service << 'EOF'
[Unit]
Description=Caddy
After=network.target

[Service]
User=root
ExecStart=/usr/bin/caddy run --config /etc/caddy/Caddyfile
ExecReload=/usr/bin/caddy reload --config /etc/caddy/Caddyfile
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOF

# 创建配置目录
sudo mkdir -p /etc/caddy
```

### 配置 Caddy

```bash
# 创建配置文件
sudo tee /etc/caddy/Caddyfile << 'EOF'
# 测试环境 - 使用子域名
# staging.yourdomain.com {
#     reverse_proxy localhost:8075
# }

# 生产环境 - 自动 HTTPS
# yourdomain.com {
#     reverse_proxy localhost:8175
# }

# 临时配置：直接使用 IP（无 HTTPS）
:80 {
    reverse_proxy localhost:8075
}
EOF

# 启动 Caddy
sudo systemctl daemon-reload
sudo systemctl enable caddy
sudo systemctl start caddy

# 检查状态
sudo systemctl status caddy
```

---

## 部署应用

### 1. 克隆代码

```bash
cd ~
git clone https://github.com/your-repo/milicard.git
cd milicard
```

### 2. 配置环境变量

```bash
# 创建测试环境配置
cat > .env.staging << 'EOF'
# MiliCard staging 环境配置

# 数据库密码（必填，请设置一个强密码）
DB_PASSWORD=your_secure_password_here

# JWT 密钥（必填，请设置一个随机字符串）
JWT_SECRET=your_jwt_secret_here

# 端口（可选，默认 8075）
# PORT=8075
EOF

# 创建生产环境配置
cat > .env.production << 'EOF'
# MiliCard production 环境配置

# 数据库密码（必填，请设置一个强密码）
DB_PASSWORD=your_secure_prod_password_here

# JWT 密钥（必填，请设置一个随机字符串）
JWT_SECRET=your_prod_jwt_secret_here

# 端口（可选，默认 8175）
# PORT=8175
EOF

# 设置文件权限
chmod 600 .env.staging .env.production
```

### 3. 部署

```bash
# 部署测试环境
./deploy.sh staging

# 部署生产环境
./deploy.sh production
```

### 4. 验证部署

```bash
# 检查容器状态
docker ps

# 查看日志
docker logs milicard-staging
docker logs milicard-prod

# 测试访问
curl http://localhost:8075/api/v1/health
curl http://localhost:8175/api/v1/health
```

---

## 域名和 SSL 配置

### 1. DNS 配置

在域名服务商处添加 A 记录：

| 主机记录 | 记录类型 | 记录值 |
|---------|---------|--------|
| @ | A | 你的服务器 IP |
| staging | A | 你的服务器 IP |

### 2. 更新 Caddy 配置

```bash
sudo tee /etc/caddy/Caddyfile << 'EOF'
# 测试环境
staging.yourdomain.com {
    reverse_proxy localhost:8075
}

# 生产环境
yourdomain.com {
    reverse_proxy localhost:8175
}

# www 重定向到主域名
www.yourdomain.com {
    redir https://yourdomain.com{uri} permanent
}
EOF

# 重载配置
sudo systemctl reload caddy
```

Caddy 会自动申请 Let's Encrypt SSL 证书。

### 3. 阿里云安全组配置

在阿里云控制台 → ECS → 安全组 → 配置规则，添加入方向规则：

| 端口范围 | 协议 | 授权对象 | 说明 |
|---------|------|---------|------|
| 80 | TCP | 0.0.0.0/0 | HTTP |
| 443 | TCP | 0.0.0.0/0 | HTTPS |
| 22 | TCP | 你的 IP | SSH（建议限制 IP） |

---

## 常用运维命令

### 容器管理

```bash
# 查看运行中的容器
docker ps

# 查看所有容器（包括停止的）
docker ps -a

# 查看容器日志
docker logs milicard-staging
docker logs --tail 100 milicard-staging  # 最后 100 行
docker logs -f milicard-staging          # 实时跟踪

# 进入容器
docker exec -it milicard-staging bash

# 重启容器
docker restart milicard-staging

# 停止容器
docker stop milicard-staging

# 删除容器
docker rm milicard-staging

# 查看容器资源使用
docker stats
```

### 数据库操作

```bash
# 进入容器
docker exec -it milicard-staging bash

# 连接数据库
su - postgres -c "psql -d milicard"

# 查看表结构
\d bases
\d users

# 退出
\q
exit
```

### 数据备份

```bash
# 备份数据库
docker exec milicard-staging su - postgres -c "pg_dump milicard" > backup_$(date +%Y%m%d).sql

# 恢复数据库
cat backup_20241130.sql | docker exec -i milicard-staging su - postgres -c "psql milicard"
```

### 更新部署

```bash
cd ~/milicard

# 拉取最新代码
git pull

# 重新部署
./deploy.sh staging
```

### Caddy 管理

```bash
# 查看状态
sudo systemctl status caddy

# 重载配置
sudo systemctl reload caddy

# 重启
sudo systemctl restart caddy

# 查看日志
sudo journalctl -u caddy -f
```

---

## 故障排查

### 1. 容器启动失败

```bash
# 查看详细日志
docker logs milicard-staging

# 检查是否有端口冲突
netstat -tlnp | grep 8075

# 检查磁盘空间
df -h

# 检查内存
free -h
```

### 2. 数据库连接失败

```bash
# 进入容器检查 PostgreSQL 状态
docker exec -it milicard-staging bash
su - postgres -c "pg_isready"

# 检查数据库日志
cat /var/log/supervisor/postgresql.log
```

### 3. 502 Bad Gateway

```bash
# 检查后端是否运行
docker exec milicard-staging supervisorctl status

# 查看后端日志
docker exec milicard-staging cat /var/log/supervisor/backend.log
docker exec milicard-staging cat /var/log/supervisor/backend_err.log
```

### 4. HTTPS 证书问题

```bash
# 检查 Caddy 日志
sudo journalctl -u caddy --since "1 hour ago"

# 手动测试证书申请
sudo caddy run --config /etc/caddy/Caddyfile
```

### 5. Podman 锁文件错误

```bash
# 错误：acquiring lock for container: file exists
# 解决：清理锁文件
rm -rf ~/.local/share/containers/storage/libpod/
podman system reset
```

---

## 环境变量说明

| 变量 | 必填 | 说明 | 示例 |
|------|------|------|------|
| DB_PASSWORD | ✅ | PostgreSQL 数据库密码 | `MySecurePass123!` |
| JWT_SECRET | ✅ | JWT 签名密钥 | `random-string-32-chars` |
| PORT | ❌ | 对外暴露端口 | `80`（默认 staging=8075, prod=8175） |

---

## 架构图

```
                    ┌─────────────────────────────────────┐
                    │           Caddy (反向代理)           │
                    │  - 自动 HTTPS 证书                   │
                    │  - 监听 80/443 端口                  │
                    └─────────────────────────────────────┘
                              ↓              ↓
              ┌───────────────────┐  ┌───────────────────┐
              │  milicard-staging │  │   milicard-prod   │
              │    端口: 8075     │  │    端口: 8175     │
              │  ┌─────────────┐  │  │  ┌─────────────┐  │
              │  │   Nginx     │  │  │  │   Nginx     │  │
              │  │   (80)      │  │  │  │   (80)      │  │
              │  └──────┬──────┘  │  │  └──────┬──────┘  │
              │         ↓         │  │         ↓         │
              │  ┌─────────────┐  │  │  ┌─────────────┐  │
              │  │   Backend   │  │  │  │   Backend   │  │
              │  │   (6801)    │  │  │  │   (6801)    │  │
              │  └──────┬──────┘  │  │  └──────┬──────┘  │
              │         ↓         │  │         ↓         │
              │  ┌─────────────┐  │  │  ┌─────────────┐  │
              │  │ PostgreSQL  │  │  │  │ PostgreSQL  │  │
              │  │   (5432)    │  │  │  │   (5432)    │  │
              │  └─────────────┘  │  │  └─────────────┘  │
              └───────────────────┘  └───────────────────┘
                      ↓                       ↓
              ┌───────────────────┐  ┌───────────────────┐
              │ Docker Volume     │  │ Docker Volume     │
              │ milicard_staging  │  │ milicard_prod     │
              │ _data             │  │ _data             │
              └───────────────────┘  └───────────────────┘
```

---

## 默认账号

首次部署后，系统会自动创建管理员账号：

- **用户名**: `admin`
- **密码**: `admin123`

⚠️ **请在首次登录后立即修改密码！**

---

## 更新日志

| 日期 | 更新内容 |
|------|---------|
| 2024-11-30 | 初始版本 |
