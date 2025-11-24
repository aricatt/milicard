# 数据库迁移检查清单

## 目的
确保数据库 Schema 修改安全、高效，避免数据丢失和长时间故障排查。

---

## 📋 迁移前检查（必须完成）

### 1. 影响范围评估
- [ ] 使用 `grep` 搜索所有受影响的字段
  ```bash
  # 示例：搜索所有 locationId 相关字段
  grep -rn "locationId" server/prisma/schema.prisma
  grep -rn "location_id" server/prisma/schema.prisma
  ```
- [ ] 列出所有需要修改的表和字段
- [ ] 评估数据量和迁移时间
- [ ] 确认是否需要数据迁移脚本（类型转换、数据清理等）

### 2. 备份数据
- [ ] 备份生产数据库
  ```bash
  pg_dump -U postgres -h localhost -p 5437 -d milicard_dev > backup_$(date +%Y%m%d_%H%M%S).sql
  ```
- [ ] 验证备份文件完整性
- [ ] 确认备份恢复流程

### 3. 测试环境验证
- [ ] 在测试环境执行迁移
- [ ] 验证所有 CRUD 操作
- [ ] 检查外键关系是否正常
- [ ] 运行自动化测试（如果有）

---

## 🔧 迁移执行步骤

### 1. 修改 Prisma Schema
- [ ] 一次性修改所有相关字段（避免遗漏）
- [ ] 使用 `replace_all` 批量替换（如果适用）
- [ ] 检查所有 `@relation` 定义是否匹配
- [ ] 验证 Schema 语法
  ```bash
  npx prisma validate
  ```

### 2. 清理缓存
- [ ] 停止所有 Node.js 进程
  ```bash
  # Windows
  taskkill /F /IM node.exe
  
  # Linux/Mac
  pkill -f node
  ```
- [ ] 删除 Prisma Client 缓存
  ```bash
  rm -rf node_modules/.prisma
  rm -rf node_modules/@prisma/client
  ```

### 3. 同步数据库
- [ ] 选择合适的同步方式：
  
  **方式 A：使用 db push（开发环境，可接受数据丢失）**
  ```bash
  npx prisma db push --accept-data-loss
  ```
  
  **方式 B：使用 migrate（生产环境，保留数据）**
  ```bash
  npx prisma migrate dev --name descriptive_migration_name
  ```

- [ ] 检查迁移输出，确认无错误
- [ ] 验证数据库表结构
  ```bash
  npx prisma studio
  ```

### 4. 重新生成 Prisma Client
- [ ] 生成新的 Prisma Client
  ```bash
  npx prisma generate
  ```
- [ ] 检查生成的类型定义

### 5. 重启服务
- [ ] 重启后端服务器
- [ ] 检查启动日志，确认无错误
- [ ] 验证数据库连接正常

---

## ✅ 迁移后验证

### 1. 功能测试
- [ ] 测试所有受影响的 API 接口
- [ ] 验证 CRUD 操作（创建、读取、更新、删除）
- [ ] 检查关联数据查询
- [ ] 测试边界条件和错误处理

### 2. 数据完整性检查
- [ ] 验证外键约束
- [ ] 检查数据类型是否正确
- [ ] 确认索引是否正常
- [ ] 验证唯一约束

### 3. 性能测试
- [ ] 检查查询性能
- [ ] 验证索引是否生效
- [ ] 监控数据库连接池

### 4. 前端验证
- [ ] 测试前端页面显示
- [ ] 验证表单提交
- [ ] 检查数据格式化

---

## 🚨 回滚计划

### 如果迁移失败
1. **立即停止服务**
   ```bash
   taskkill /F /IM node.exe
   ```

2. **恢复数据库备份**
   ```bash
   psql -U postgres -h localhost -p 5437 -d milicard_dev < backup_YYYYMMDD_HHMMSS.sql
   ```

3. **恢复 Schema 文件**
   ```bash
   git checkout HEAD -- server/prisma/schema.prisma
   ```

4. **重新生成 Prisma Client**
   ```bash
   npx prisma generate
   ```

5. **重启服务并验证**

---

## 📝 常见问题排查

### 问题 1：PrismaClientValidationError
**原因**：Prisma Client 类型定义与数据库不一致

**解决方案**：
```bash
# 1. 停止服务
taskkill /F /IM node.exe

# 2. 清理缓存
rm -rf node_modules/.prisma
rm -rf node_modules/@prisma/client

# 3. 重新生成
npx prisma generate

# 4. 重启服务
npm run dev
```

### 问题 2：外键约束错误
**原因**：关联字段类型不匹配

**解决方案**：
1. 检查所有 `@relation` 定义
2. 确保 `fields` 和 `references` 的类型一致
3. 使用 `grep` 搜索所有相关字段

### 问题 3：Schema 和数据库不同步
**原因**：误用 `db pull` 覆盖了 Schema

**解决方案**：
1. **永远不要在迁移过程中使用 `db pull`**
2. Schema 应该是唯一真实来源
3. 使用 `db push` 强制同步到数据库

### 问题 4：TypeScript 类型错误
**原因**：IDE 缓存了旧的类型定义

**解决方案**：
1. 重启 TypeScript 服务器（VSCode: Ctrl+Shift+P -> "TypeScript: Restart TS Server"）
2. 重启 IDE
3. 删除 `node_modules` 并重新安装

---

## 📚 参考资源

- [Prisma Migrate 官方文档](https://www.prisma.io/docs/concepts/components/prisma-migrate)
- [Prisma Schema 参考](https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference)
- [PostgreSQL 数据类型](https://www.postgresql.org/docs/current/datatype.html)

---

## 🎯 最佳实践

1. **永远先在测试环境验证**
2. **永远备份数据**
3. **一次性修改所有相关字段**
4. **使用版本控制跟踪 Schema 变更**
5. **编写迁移脚本而不是手动执行 SQL**
6. **记录每次迁移的原因和影响**
7. **保持 Schema 为唯一真实来源**
8. **定期清理 Prisma 缓存**

---

## 📊 迁移记录模板

```markdown
## 迁移记录：[迁移名称]

**日期**：YYYY-MM-DD
**执行人**：[姓名]
**环境**：开发/测试/生产

### 变更内容
- 修改了哪些表
- 修改了哪些字段
- 变更原因

### 影响范围
- 受影响的 API 接口
- 受影响的前端页面
- 数据迁移情况

### 执行结果
- [ ] 成功
- [ ] 失败（原因：___）

### 验证结果
- [ ] 功能测试通过
- [ ] 性能测试通过
- [ ] 数据完整性验证通过

### 备注
[其他需要记录的信息]
```

---

**最后更新**：2025-11-25
**维护者**：开发团队
