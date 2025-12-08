# MiliCard 部署指南

## 服务器要求

- **操作系统**: Alibaba Cloud Linux 3 / Ubuntu 22.04 / CentOS 8+
- **内存**: 最低 2GB，推荐 4GB
- **硬盘**: 最低 20GB
- **Docker**: 20.10+

## 一、首次部署

### 1. 安装 Docker

**Alibaba Cloud Linux / CentOS:**
```bash
# 安装 Docker
sudo yum install -y docker
sudo systemctl start docker
sudo systemctl enable docker

# 将当前用户加入 docker 组（免 sudo）
sudo usermod -aG docker $USER
# 重新登录生效
```

**Ubuntu:**
```bash
# 安装 Docker
curl -fsSL https://get.docker.com | sh
sudo systemctl start docker
sudo systemctl enable docker

# 将当前用户加入 docker 组
sudo usermod -aG docker $USER
# 重新登录生效
```

### 2. 获取代码

```bash
# 克隆仓库
git clone <你的仓库地址> milicard
cd milicard

# 设置脚本可执行
chmod +x deploy.sh
```

### 3. 配置环境变量

```bash
# 部署测试服
./deploy.sh staging
# 首次运行会生成 .env.staging 文件，请编辑它

# 编辑配置
nano .env.staging
```

修改以下内容：
```
DB_PASSWORD=设置一个强密码
JWT_SECRET=设置一个随机字符串
```

### 4. 执行部署

```bash
# 部署测试服
./deploy.sh staging

# 部署生产服
./deploy.sh production
```

## 二、更新版本

```bash
cd milicard

# 拉取最新代码
git pull

# 重新部署
./deploy.sh staging    # 或 production
```

## 三、常用命令

### 查看运行状态
```bash
docker ps
```

### 查看日志
```bash
# 查看所有日志
docker logs milicard-staging

# 实时查看日志
docker logs -f milicard-staging

# 查看最近100行
docker logs --tail 100 milicard-staging
```

### 进入容器
```bash
docker exec -it milicard-staging bash

# 查看后端日志
cat /var/log/supervisor/backend.log

# 查看数据库日志
cat /var/log/supervisor/postgresql.log

# 查看 nginx 日志
cat /var/log/supervisor/nginx.log
```

### 重启服务
```bash
# 重启整个容器
docker restart milicard-staging

# 只重启后端（进入容器后）
docker exec milicard-staging supervisorctl restart backend
```

### 停止服务
```bash
docker stop milicard-staging
```

### 删除容器（保留数据）
```bash
docker rm milicard-staging
```

### 完全清除（包括数据）
```bash
# 危险操作！会删除所有数据
docker rm milicard-staging
docker volume rm milicard_staging_data
```

## 四、端口说明

| 环境 | 端口 | 容器名 | 数据卷 |
|------|------|--------|--------|
| 测试服 | 8275 | milicard-staging | milicard_staging_data |
| 生产服 | 8175 | milicard-prod | milicard_prod_data |

## 五、访问地址

- 测试服: `http://服务器IP:8275`
- 生产服: `http://服务器IP:8175`

## 六、数据备份

```bash
# 备份数据库
docker exec milicard-staging su - postgres -c "pg_dump milicard" > backup_$(date +%Y%m%d).sql

# 恢复数据库
cat backup_20241128.sql | docker exec -i milicard-staging su - postgres -c "psql milicard"
```

## 七、故障排查

### 容器启动失败
```bash
# 查看详细日志
docker logs milicard-staging

# 检查端口占用
netstat -tlnp | grep 8275
```

### 数据库连接失败
```bash
# 进入容器检查数据库
docker exec -it milicard-staging bash
su - postgres -c "psql -l"
```

### 前端页面空白
```bash
# 检查前端文件是否存在
docker exec milicard-staging ls -la /app/client/dist
```

## 八、默认管理员账号

首次部署时会自动创建管理员账号：

| 项目 | 值 |
|------|------|
| 用户名 | admin |
| 密码 | admin123 |
| 邮箱 | admin@milicard.com |

⚠️ **重要**: 首次登录后请立即修改密码！

## 九、安全建议

1. **修改默认密码**: 首次部署后立即修改 admin 密码
2. **防火墙配置**: 只开放需要的端口（8275/8175）
3. **定期备份**: 建议每天自动备份数据库
4. **HTTPS**: 生产环境建议配置 HTTPS（可用阿里云 SLB 或 Nginx 反向代理）
