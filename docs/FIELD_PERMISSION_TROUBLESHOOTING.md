# 字段权限不生效排查指南

## 问题：全局商品的"箱规"字段取消勾选后仍然可见

### 排查步骤

#### 步骤1：确认后端服务已重启 ⚠️ **最重要**

```bash
# 停止后端服务
# 按 Ctrl+C 停止正在运行的服务

# 重新启动后端服务
cd x:\Gits\_ari_milicard\server
npm run dev
```

**原因**：我们修改了 `goodsBaseRoutes.ts` 路由文件，添加了字段权限过滤中间件。这些修改需要重启后端服务才能生效。

---

#### 步骤2：确认前端已刷新

```bash
# 在浏览器中
1. 按 F12 打开开发者工具
2. 右键点击刷新按钮
3. 选择"清空缓存并硬性重新加载"
```

---

#### 步骤3：检查字段权限配置是否正确保存

1. **进入角色管理页面**
2. **选择要测试的角色**
3. **点击"字段权限配置"标签**
4. **选择"全局商品"资源**
5. **检查字段列表**：
   - 应该能看到 21 个字段
   - 找到"箱规(盒/箱)"字段
   - 确认其对应的字段名是 `packPerBox`

6. **重新配置并保存**：
   - 先**全选所有字段**（点击"可查看"列的全选框）
   - 然后**取消勾选"箱规(盒/箱)"的"可查看"**
   - 点击**保存**按钮
   - 等待提示"保存成功"

---

#### 步骤4：检查数据库中的字段权限记录

```sql
-- 连接到数据库
psql -h localhost -p 5437 -U postgres -d milicard_dev

-- 查询 goods 资源的字段权限配置
SELECT 
  r.name as role_name,
  fp.field,
  fp.can_read,
  fp.can_write
FROM field_permissions fp
JOIN roles r ON fp.role_id = r.id
WHERE fp.resource = 'goods'
ORDER BY r.name, fp.field;

-- 查询 packPerBox 字段的权限
SELECT 
  r.name as role_name,
  fp.can_read,
  fp.can_write
FROM field_permissions fp
JOIN roles r ON fp.role_id = r.id
WHERE fp.resource = 'goods' AND fp.field = 'packPerBox';
```

**预期结果**：
- 应该看到该角色的 `packPerBox` 字段记录
- `can_read` 应该是 `false`
- 应该有 21 条 `goods` 资源的字段权限记录（不是只有 1 条）

---

#### 步骤5：测试字段权限过滤

1. **用配置了字段权限的角色登录**
2. **访问全局商品页面**（基地商品设置）
3. **查看列表**：
   - "箱规"列应该**不显示**
   - 其他字段应该正常显示

---

#### 步骤6：检查后端日志

查看后端控制台输出，应该能看到类似的调试日志：

```
[DEBUG] injectDataPermission - 字段权限 {
  resource: 'goods',
  roles: ['ROLE_NAME'],
  readable: ['id', 'code', 'name', ...],  // 不包含 packPerBox
  writable: [...]
}

[DEBUG] 字段权限过滤 {
  readable: ['id', 'code', 'name', ...],  // 不包含 packPerBox
  url: '/api/v1/bases/1/goods',
  method: 'GET'
}
```

---

### 常见问题

#### Q1: 保存后提示成功，但数据库中只有 1 条记录

**原因**：前端保存逻辑有问题，只保存了修改的字段。

**解决方案**：
1. 确认前端代码已更新（`FieldPermissionConfig.tsx` 的保存逻辑）
2. 刷新前端页面
3. 重新进入字段权限配置页面
4. **先全选所有字段**，再取消勾选特定字段
5. 保存

---

#### Q2: 后端日志显示 `readable: ['*']`

**原因**：没有找到字段权限配置，默认允许所有字段。

**可能的原因**：
1. 数据库中没有该角色的字段权限记录
2. 资源名称不匹配（前端配置的是 `goods`，但后端查询的是其他名称）
3. 角色名称不匹配

**解决方案**：
- 检查数据库中的字段权限记录
- 确认资源名称一致
- 确认角色名称一致

---

#### Q3: 字段权限配置页面看不到"箱规"字段

**原因**：字段权限配置定义不完整。

**解决方案**：
- 检查 `FieldPermissionConfig.tsx` 中 `goods` 资源的字段定义
- 应该包含 `{ key: 'packPerBox', label: '箱规(盒/箱)', type: 'number' }`

---

#### Q4: 前端页面显示的字段名称和配置的不一致

**原因**：前端页面使用的是嵌套字段（如 `goods.packPerBox`），但后端返回的是扁平字段（`packPerBox`）。

**解决方案**：
- 全局商品页面使用 `/api/v1/bases/:baseId/goods` 接口
- 这个接口返回的是扁平结构，字段名就是 `packPerBox`
- 字段权限配置中应该使用 `packPerBox`，不是 `goods.packPerBox`

---

### 完整的验证流程

```bash
# 1. 停止后端服务（Ctrl+C）

# 2. 重新启动后端服务
cd x:\Gits\_ari_milicard\server
npm run dev

# 3. 等待服务启动完成（看到 "Server is running on port 6801"）

# 4. 刷新前端页面（Ctrl+Shift+R 或 清空缓存并硬性重新加载）

# 5. 配置字段权限
- 进入角色管理 → 选择角色 → 字段权限配置
- 选择"全局商品"
- 先全选所有字段
- 取消勾选"箱规(盒/箱)"
- 保存

# 6. 测试
- 用该角色用户登录
- 访问全局商品页面
- 检查"箱规"列是否不显示
```

---

### 如果以上步骤都完成了还是不生效

请提供以下信息：

1. **后端日志输出**（特别是包含 `injectDataPermission` 和 `字段权限过滤` 的日志）
2. **数据库查询结果**（`field_permissions` 表中 `goods` 资源的记录）
3. **浏览器开发者工具 Network 标签**：
   - 查看 `/api/v1/bases/:baseId/goods` 请求的响应
   - 检查返回的数据中是否包含 `packPerBox` 字段
4. **使用的角色名称**
5. **前端页面的 URL**

---

### 技术细节

**字段权限过滤流程**：

```
1. 请求到达 → goodsBaseRoutes.ts
2. authenticateToken → 验证用户身份
3. checkPermission('goods', 'read') → 检查模块权限
4. injectDataPermission('goods') → 注入字段权限上下文
   - 查询用户角色
   - 查询该角色对 goods 资源的字段权限
   - 生成 readable 和 writable 字段列表
5. filterResponseFields() → 过滤响应字段
   - 拦截 res.json()
   - 根据 readable 字段列表过滤数据
   - 移除不在 readable 列表中的字段
6. Controller 返回数据 → 经过过滤后返回给前端
```

**关键代码位置**：
- 路由：`server/src/routes/goodsBaseRoutes.ts:23`
- 中间件：`server/src/middleware/permissionMiddleware.ts:152-203` (injectDataPermission)
- 中间件：`server/src/middleware/permissionMiddleware.ts:662-709` (filterResponseFields)
- 服务：`server/src/services/dataPermissionService.ts:175-200` (getFieldPermissions)
- 前端配置：`client/src/pages/system/roles/components/FieldPermissionConfig.tsx:137-163`
