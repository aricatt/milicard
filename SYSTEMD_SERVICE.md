# 系统服务部署指南

## 问题说明

你遇到的容器在 **7小时后自动停止** 的问题是由于 **systemd 用户会话超时** 导致的：

```
Nov 30 20:07:41 - 用户会话启动
Dec 01 03:08:14 - 7小时后，systemd 认为会话空闲
Dec 01 03:09:45 - 自动退出会话，杀死所有用户进程（包括容器）
```

## 解决方案对比

### ✅ 方案1：系统服务（推荐）

**优点：**
- ✅ 不受用户会话影响，永久运行
- ✅ 开机自动启动
- ✅ 自动重启（崩溃后）
- ✅ 资源限制和监控
- ✅ 标准化的日志管理

**缺点：**
- ❌ 需要 root 权限

### ⚠️ 方案2：用户 Linger（临时方案）

**优点：**
- ✅ 不需要 root 权限（首次启用需要）
- ✅ 快速修复

**缺点：**
- ❌ 仍然依赖用户服务
- ❌ 不如系统服务稳定
- ❌ 缺少资源限制

## 快速部署

### 使用系统服务部署（推荐）

```bash
# 1. 构建并安装为系统服务
./deploy.sh staging --systemd

# 或生产环境
./deploy.sh production --systemd
```

### 手动安装系统服务

```bash
# 1. 设置环境变量
export DB_PASSWORD="your_secure_password"
export JWT_SECRET="your_jwt_secret"

# 2. 运行安装脚本（需要 root）
sudo bash docker/install-service.sh staging

# 或生产环境
sudo bash docker/install-service.sh production
```

## 服务管理命令

### 查看服务状态
```bash
systemctl status milicard-staging
```

### 查看实时日志
```bash
journalctl -u milicard-staging -f
```

### 重启服务
```bash
sudo systemctl restart milicard-staging
```

### 停止服务
```bash
sudo systemctl stop milicard-staging
```

### 启动服务
```bash
sudo systemctl start milicard-staging
```

### 禁用开机自启
```bash
sudo systemctl disable milicard-staging
```

### 启用开机自启
```bash
sudo systemctl enable milicard-staging
```

## 临时方案：启用 Linger

如果你暂时不想使用系统服务：

```bash
# 启用当前用户的 linger
sudo loginctl enable-linger $(whoami)

# 验证
loginctl show-user $(whoami) | grep Linger
# 应该显示: Linger=yes
```

## 服务配置文件位置

- **服务文件**: `/etc/systemd/system/milicard-staging.service`
- **环境变量**: `/etc/milicard/staging.env`
- **日志**: `journalctl -u milicard-staging`

## 资源限制

系统服务默认配置了资源限制：

- **内存限制**: 2GB
- **CPU 限制**: 200% (2个核心)
- **自动重启**: 崩溃后10秒重启
- **重启限制**: 5分钟内最多重启5次

修改限制：
```bash
sudo nano /etc/systemd/system/milicard-staging.service

# 修改这些行：
MemoryLimit=2G
CPUQuota=200%

# 重载配置
sudo systemctl daemon-reload
sudo systemctl restart milicard-staging
```

## 故障排查

### 服务无法启动

```bash
# 查看详细错误
journalctl -u milicard-staging -n 50 --no-pager

# 检查服务配置
systemctl cat milicard-staging

# 检查环境变量
sudo cat /etc/milicard/staging.env
```

### 容器无法访问

```bash
# 检查容器是否运行
podman ps | grep milicard

# 检查端口占用
ss -tlnp | grep 8075

# 查看容器日志
podman logs milicard-staging
```

### 服务频繁重启

```bash
# 查看重启历史
systemctl status milicard-staging

# 查看详细日志
journalctl -u milicard-staging --since "1 hour ago"
```

## 迁移现有容器

如果你已经有运行中的容器：

```bash
# 1. 停止现有容器
podman stop milicard-staging
podman rm milicard-staging

# 2. 部署为系统服务
./deploy.sh staging --systemd

# 数据卷会自动保留，无需担心数据丢失
```

## 卸载系统服务

```bash
# 1. 停止并禁用服务
sudo systemctl stop milicard-staging
sudo systemctl disable milicard-staging

# 2. 删除服务文件
sudo rm /etc/systemd/system/milicard-staging.service
sudo rm /etc/milicard/staging.env

# 3. 重载 systemd
sudo systemctl daemon-reload

# 4. 删除容器和数据（可选）
podman stop milicard-staging
podman rm milicard-staging
podman volume rm milicard_staging_data  # 警告：会删除数据库数据
```

## 监控和告警

### 设置邮件告警（可选）

```bash
# 安装邮件工具
sudo apt-get install mailutils

# 创建告警脚本
sudo nano /usr/local/bin/milicard-alert.sh

# 添加到 systemd 服务
sudo nano /etc/systemd/system/milicard-staging.service

# 在 [Service] 部分添加：
OnFailure=milicard-alert@%n.service
```

### 使用监控脚本

```bash
# 后台运行监控
nohup bash docker/monitor.sh milicard-staging > /tmp/monitor.log 2>&1 &

# 查看监控日志
tail -f /tmp/monitor.log
```

## 性能优化

### 调整数据库连接池

编辑 `docker/supervisord.conf`：

```ini
environment=...,DATABASE_URL="postgresql://...?connection_limit=20&pool_timeout=60"
```

### 调整资源限制

```bash
sudo nano /etc/systemd/system/milicard-staging.service

# 增加内存限制
MemoryLimit=4G

# 增加 CPU 限制
CPUQuota=400%

sudo systemctl daemon-reload
sudo systemctl restart milicard-staging
```

## 总结

**推荐做法：**
1. ✅ 使用 `./deploy.sh staging --systemd` 部署为系统服务
2. ✅ 定期查看日志 `journalctl -u milicard-staging -f`
3. ✅ 设置资源限制防止 OOM
4. ✅ 配置自动备份数据库

**不推荐：**
- ❌ 使用用户容器（会因会话超时停止）
- ❌ 手动启动容器（无法开机自启）
- ❌ 不设置资源限制（可能导致 OOM）
