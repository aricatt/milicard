# Prisma 迁移指南

## 概述

本项目使用 Prisma 进行数据库管理。提供了迁移基线重置脚本，用于在以下场景同步开发环境与生产环境：

- 从 `db push` 模式切换到 `migrate` 模式
- 生产环境数据库还原到本地后，重新对齐迁移基线
- 迁移历史混乱需要重置

## 脚本文件

| 文件 | 平台 | 说明 |
|------|------|------|
| `reset_prisma_migrate.bat` | Windows | 迁移基线重置脚本 |
| `reset_prisma_migrate.sh` | Linux/macOS | 迁移基线重置脚本 |

## 脚本执行流程

```
1/6. 备份数据库
     └── 生成 milicard_dev_backup_YYYYMMDD_HHMMSS.sql

2/6. 从数据库拉取 schema
     └── prisma db pull → 更新 schema.prisma

3/6. 清空本地迁移目录
     └── 删除 prisma/migrations/

4/6. 生成初始迁移 SQL
     └── prisma migrate diff → 生成完整建表 SQL

5/6. 清空迁移历史表
     └── DELETE FROM _prisma_migrations

6/6. 标记迁移为已应用
     └── prisma migrate resolve --applied
```

## 使用方法

### Windows

```cmd
cd server
reset_prisma_migrate.bat
```

### Linux/macOS

```bash
cd server
chmod +x reset_prisma_migrate.sh
./reset_prisma_migrate.sh
```

## 数据库配置

脚本默认使用以下配置：

| 参数 | 值 |
|------|-----|
| Host | localhost |
| Port | 5437 |
| Database | milicard_dev |
| User | postgres |
| Password | 840928 |

如需修改密码：
- **Windows**: 修改 `reset_prisma_migrate.bat` 中的 `set PGPASSWORD=你的密码`
- **Linux/macOS**: 运行前执行 `export DB_PASSWORD="你的密码"`

## 常见场景

### 场景 1：从生产环境同步到本地

```bash
# 1. 从生产环境备份
pg_dump -h 生产服务器 -U postgres -d milicard_prod > prod_backup.sql

# 2. 还原到本地
psql -h localhost -p 5437 -U postgres -d milicard_dev < prod_backup.sql

# 3. 重置迁移基线
reset_prisma_migrate.bat
```

### 场景 2：首次启用迁移系统

如果项目之前一直使用 `db push`，现在想切换到 `migrate`：

```bash
# 直接运行脚本即可
reset_prisma_migrate.bat
```

### 场景 3：日常开发新功能

迁移基线建立后，正常使用 Prisma 迁移命令：

```bash
# 修改 schema.prisma 后
npx prisma migrate dev --name add_new_feature

# 查看迁移状态
npx prisma migrate status

# 生产环境部署
npx prisma migrate deploy
```

## 生成的文件

| 文件/目录 | 说明 |
|----------|------|
| `milicard_dev_backup_*.sql` | 数据库备份文件（可删除） |
| `prisma/migrations/` | 迁移目录 |
| `prisma/migrations/migration_lock.toml` | 数据库类型锁定文件 |
| `prisma/migrations/YYYYMMDDHHMMSS_init_from_db/` | 初始迁移目录 |
| `prisma/migrations/.../migration.sql` | 迁移 SQL 文件 |

## 注意事项

1. **不会丢失数据** - 脚本只操作迁移历史，不修改业务数据
2. **不会修改表结构** - 只是记录当前结构作为基线
3. **备份文件** - 脚本会自动备份数据库，备份成功后可手动删除
4. **Git 提交** - 执行后记得提交 `prisma/migrations/` 目录

## 部署流程

### 统一迁移策略

**Staging 和 Production 环境现在使用相同的迁移逻辑：**

```
容器启动
    │
    ▼
检查是否有迁移文件？
    │
    ├─ 否 ──► 使用 db push（兼容旧版本）
    │
    └─ 是 ──► 检查 _prisma_migrations 表
                │
                ├─ 存在 ──► migrate deploy（只执行未应用的迁移）
                │
                └─ 不存在 ──► 检查数据库是否为空？
                              │
                              ├─ 空 ──► 执行所有迁移
                              │
                              └─ 有表 ──► 自动基线化
                                         1. db push 同步结构
                                         2. 标记所有迁移为已应用
```

### 开发工作流

```bash
# 1. 修改 schema.prisma

# 2. 创建迁移
npx prisma migrate dev --name add_new_feature

# 3. 提交代码（包含 prisma/migrations/ 目录）
git add .
git commit -m "feat: add new feature"

# 4. 部署
./deploy.ps1 staging      # 测试环境
./deploy.ps1 production   # 生产环境
```

### 部署时的数据库更新

部署脚本会自动：
1. 备份数据库（非首次运行时）
2. 检测并应用新的迁移
3. 保留所有业务数据

## 故障排除

### 备份失败

如果看到 `[WARN] Backup failed`，可能是：
- PostgreSQL 未安装 `pg_dump` 命令
- 密码不正确
- 数据库连接问题

备份失败不影响后续步骤，可以继续执行。

### migration_lock.toml 格式错误

如果看到 `P3019` 错误，检查 `prisma/migrations/migration_lock.toml` 文件内容是否为：

```toml
provider = "postgresql"
```

### 迁移标记失败

如果最后一步失败，可以手动执行：

```bash
npx prisma migrate resolve --applied "迁移目录名"
```
