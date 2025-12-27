# 全局基地访问权限实现方案

## 需求背景

用户希望有一个独立的"全局基地访问"选项，区别于：
- **特定基地关联**：用户只能访问指定的基地
- **无关联**：用户没有关联任何基地，无法访问任何数据
- **全局访问**：用户可以访问所有基地（新增功能）

## 设计方案

在 `users` 表中添加 `has_global_base_access` 布尔字段：
- `true`：用户可以访问所有基地
- `false`：用户只能访问 `user_bases` 表中关联的基地

### 优势
1. **语义清晰**：一个字段明确表达全局访问权限
2. **独立选项**：前端可以显示为独立的复选框/开关
3. **性能优秀**：简单的布尔字段查询，无需复杂 JOIN
4. **与 Casbin 解耦**：不依赖 Casbin 的 `*` 基地域配置

## 实现步骤

### 1. 数据库迁移

文件：`server/prisma/migrations/20251227_add_global_base_access/migration.sql`

```sql
-- 添加字段
ALTER TABLE "users" ADD COLUMN "has_global_base_access" BOOLEAN NOT NULL DEFAULT false;

-- 为 level 0-1 用户自动设置
UPDATE "users" u SET "has_global_base_access" = true
WHERE EXISTS (
  SELECT 1 FROM "user_roles" ur
  JOIN "roles" r ON ur."role_id" = r.id
  WHERE ur."user_id" = u.id AND ur."is_active" = true AND r."level" <= 1
);

-- 为有 Casbin * 基地域的用户设置
UPDATE "users" u SET "has_global_base_access" = true
WHERE EXISTS (
  SELECT 1 FROM "casbin_rule" cr
  WHERE cr."ptype" = 'g' AND cr."v0" = u.id AND cr."v2" = '*'
);

-- 添加索引
CREATE INDEX "idx_users_has_global_base_access" ON "users"("has_global_base_access");
```

### 2. Prisma Schema 更新

在 `User` 模型中添加字段：
```prisma
model User {
  // ... 其他字段
  hasGlobalBaseAccess    Boolean             @default(false) @map("has_global_base_access")
  // ... 其他字段
  
  @@index([hasGlobalBaseAccess])
}
```

### 3. 后端服务更新

#### BaseService.getBaseList
```typescript
if (userLevel > 1) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { hasGlobalBaseAccess: true },
  });
  
  if (user?.hasGlobalBaseAccess) {
    // 返回所有基地
  } else {
    // 只返回关联的基地
  }
}
```

#### UserService.createUser / updateUser
添加 `hasGlobalBaseAccess` 参数处理：
```typescript
static async createUser(data: {
  // ... 其他参数
  hasGlobalBaseAccess?: boolean;
}) {
  const user = await prisma.user.create({
    data: {
      // ... 其他字段
      hasGlobalBaseAccess: hasGlobalBaseAccess || false,
    },
  });
  
  // 同步到 Casbin
  if (hasGlobalBaseAccess) {
    for (const role of roles) {
      await casbinService.addRoleForUser(user.id, role.name, '*');
    }
  }
}
```

### 4. 前端界面更新

#### 用户管理页面
添加"全局基地访问"开关：
```tsx
<Form.Item
  name="hasGlobalBaseAccess"
  label="全局基地访问"
  valuePropName="checked"
  tooltip="开启后，用户可以访问所有基地，无需单独关联"
>
  <Switch />
</Form.Item>

<Form.Item
  noStyle
  shouldUpdate={(prevValues, currentValues) => 
    prevValues.hasGlobalBaseAccess !== currentValues.hasGlobalBaseAccess
  }
>
  {({ getFieldValue }) => {
    const hasGlobalAccess = getFieldValue('hasGlobalBaseAccess');
    return (
      <Form.Item
        name="baseIds"
        label="关联基地"
        tooltip={hasGlobalAccess ? "已开启全局访问，无需选择基地" : "选择用户可访问的基地"}
      >
        <Select
          mode="multiple"
          disabled={hasGlobalAccess}
          placeholder={hasGlobalAccess ? "全局访问已开启" : "请选择基地"}
        >
          {/* 基地选项 */}
        </Select>
      </Form.Item>
    );
  }}
</Form.Item>
```

### 5. API 接口更新

#### 创建用户
```typescript
POST /api/v1/users
{
  "username": "test",
  "name": "测试用户",
  "roleIds": ["role-id"],
  "hasGlobalBaseAccess": true,  // 新增字段
  "baseIds": []  // 全局访问时可以为空
}
```

#### 更新用户
```typescript
PUT /api/v1/users/:id
{
  "hasGlobalBaseAccess": true,
  "baseIds": []  // 切换为全局访问时清空基地关联
}
```

## 数据一致性

### Casbin 同步规则
- `hasGlobalBaseAccess = true` → Casbin 中设置 `v2 = '*'`
- `hasGlobalBaseAccess = false` → Casbin 中设置 `v2 = baseId`

### 更新时的处理
1. 开启全局访问：清空 `user_bases` 表中的记录，在 Casbin 中设置 `*` 基地域
2. 关闭全局访问：删除 Casbin 中的 `*` 基地域，根据 `baseIds` 创建具体关联

## 权限检查流程

```
用户请求访问基地 X
  ↓
检查用户角色 level
  ↓
level <= 1? → 是 → 允许访问所有基地
  ↓ 否
检查 hasGlobalBaseAccess
  ↓
true? → 是 → 允许访问所有基地
  ↓ 否
检查 user_bases 表
  ↓
基地 X 在关联列表中? → 是 → 允许访问
  ↓ 否
拒绝访问
```

## 测试用例

1. **创建全局访问用户**
   - 设置 `hasGlobalBaseAccess = true`
   - 不关联任何基地
   - 验证可以看到所有基地列表

2. **切换为全局访问**
   - 原有用户关联了基地 A、B
   - 开启全局访问
   - 验证可以看到所有基地（包括 C、D）

3. **关闭全局访问**
   - 全局访问用户
   - 关闭全局访问，关联基地 A
   - 验证只能看到基地 A

4. **权限检查**
   - 全局访问用户访问任意基地的数据
   - 验证 Casbin 权限检查通过

## 部署步骤

1. 运行数据库迁移
2. 重新生成 Prisma 客户端
3. 重启后端服务
4. 更新前端代码
5. 测试验证
