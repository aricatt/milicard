# 权限系统设计文档

## 概述

本系统采用 **Casbin + 自定义数据权限** 的混合方案，实现完整的 RBAC（基于角色的访问控制）+ 数据权限系统。

## 架构

```
┌─────────────────────────────────────────────────────────────────┐
│                        前端应用                                  │
├─────────────────────────────────────────────────────────────────┤
│  路由守卫（access.ts）  │  权限组件  │  usePermission Hook       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        API 网关层                                │
├─────────────────────────────────────────────────────────────────┤
│  authenticateToken  │  checkPermission  │  injectDataPermission │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Service 层                                │
├─────────────────────────────────────────────────────────────────┤
│  CasbinService  │  DataPermissionService  │  业务 Service        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        数据层                                    │
├─────────────────────────────────────────────────────────────────┤
│  casbin_rules  │  data_permission_rules  │  field_permissions   │
└─────────────────────────────────────────────────────────────────┘
```

## 权限类型

### 1. 功能权限（Casbin）

控制用户能否访问某个功能/操作。

**模型定义** (`config/casbin_model.conf`):
```ini
[request_definition]
r = sub, dom, obj, act

[policy_definition]
p = sub, dom, obj, act, eft

[role_definition]
g = _, _, _

[policy_effect]
e = some(where (p.eft == allow)) && !some(where (p.eft == deny))

[matchers]
m = g(r.sub, p.sub, r.dom) && (r.dom == p.dom || p.dom == "*") && keyMatch2(r.obj, p.obj) && regexMatch(r.act, p.act)
```

**参数说明**:
- `sub` - 主体（用户ID 或 角色名）
- `dom` - 域（基地ID，支持多基地隔离）
- `obj` - 资源对象（如 `point`, `order`）
- `act` - 操作（如 `read`, `create`, `update`, `delete`）
- `eft` - 效果（`allow` 或 `deny`）

**策略示例**:
```
p, ADMIN, *, *, .*, allow           # 管理员拥有所有权限
p, POINT_OWNER, *, point, read|update, allow  # 点位老板可读取和更新点位
g, user_001, ADMIN, *               # 用户 user_001 在所有基地是管理员
g, user_002, POINT_OWNER, 1         # 用户 user_002 在基地1是点位老板
```

### 2. 数据权限（自定义）

控制用户能看到哪些数据（行级过滤）。

**数据库模型** (`DataPermissionRule`):
```prisma
model DataPermissionRule {
  id          String   @id
  roleId      String
  resource    String   // 资源类型: point, order
  field       String   // 过滤字段: ownerId, dealerId
  operator    String   // 操作符: eq, in, contains
  valueType   String   // 值类型: currentUser, currentUserPoints
  fixedValue  String?  // 固定值
  isActive    Boolean
}
```

**值类型**:
| 类型 | 说明 | 示例 |
|------|------|------|
| `currentUser` | 当前登录用户ID | `ownerId = 当前用户` |
| `currentBase` | 当前基地ID | `baseId = 当前基地` |
| `currentUserPoints` | 用户拥有的点位ID列表 | `pointId IN (用户的点位)` |
| `currentUserDealerPoints` | 用户负责的点位ID列表 | `pointId IN (用户负责的点位)` |
| `fixed` | 固定值 | `status = 'ACTIVE'` |

### 3. 字段权限（自定义）

控制用户能看到/修改哪些字段。

**数据库模型** (`FieldPermission`):
```prisma
model FieldPermission {
  id          String   @id
  roleId      String
  resource    String   // 资源类型
  field       String   // 字段名
  canRead     Boolean  // 可读
  canWrite    Boolean  // 可写
}
```

## 使用方法

### 后端

#### 1. 路由中使用权限中间件

```typescript
import { checkPermission, injectDataPermission, filterResponseFields } from '../middleware/permissionMiddleware';

router.get('/:baseId/points', 
  authenticateToken,                    // 认证
  checkPermission('point', 'read'),     // 功能权限检查
  injectDataPermission('point'),        // 数据权限注入
  filterResponseFields(),               // 字段过滤
  PointController.getList
);
```

#### 2. Controller 中使用数据过滤

```typescript
static async getList(req: Request, res: Response) {
  const dataFilter = req.permissionContext?.dataFilter || {};
  
  const result = await PointService.getList({
    ...params,
    dataFilter,  // 传递数据权限过滤条件
  });
}
```

#### 3. Service 中应用过滤条件

```typescript
static async getList(params: PointListParams) {
  const { dataFilter = {} } = params;
  
  const where = {
    baseId,
    ...dataFilter,  // 应用数据权限过滤
  };
  
  return prisma.point.findMany({ where });
}
```

### 前端

#### 1. 路由权限控制 (`config/routes.ts`)

```typescript
{
  path: '/system/users',
  component: './system/users',
  access: 'canManageUsers',  // 权限标识
}
```

#### 2. 权限配置 (`src/access.ts`)

```typescript
export default function access(initialState) {
  const roles = initialState?.currentUser?.roles;
  
  return {
    canManageUsers: isAdmin(roles) || hasPermission(roles, 'user:manage'),
    canCreatePoint: hasPermission(roles, 'point:create'),
  };
}
```

#### 3. 组件中使用权限

```tsx
import { useAccess } from '@umijs/max';

const MyComponent = () => {
  const access = useAccess();
  
  return (
    <>
      {access.canCreatePoint && <Button>新建</Button>}
      {access.canDeletePoint && <Button danger>删除</Button>}
    </>
  );
};
```

#### 4. 使用权限组件

```tsx
import { Permission, AdminOnly } from '@/components/Permission';

<Permission permission="point:create">
  <Button>新建点位</Button>
</Permission>

<AdminOnly>
  <Button danger>危险操作</Button>
</AdminOnly>
```

## 预设角色

| 角色 | 说明 | 功能权限 | 数据权限 |
|------|------|----------|----------|
| `SUPER_ADMIN` | 超级管理员 | 所有 | 无限制 |
| `ADMIN` | 管理员 | 所有 | 无限制 |
| `MANAGER` | 经理 | 大部分 | 无限制 |
| `OPERATOR` | 操作员 | 基本操作 | 无限制 |
| `VIEWER` | 查看者 | 只读 | 无限制 |
| `POINT_OWNER` | 点位老板 | 点位相关 | 只能看自己的点位 |
| `DEALER` | 经销商 | 点位相关 | 只能看负责的点位 |

## API 端点

### 功能权限

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/v1/roles` | GET | 获取角色列表 |
| `/api/v1/roles/:roleId/permissions` | GET | 获取角色权限 |
| `/api/v1/roles/:roleId/permissions` | PUT | 更新角色权限 |

### 数据权限

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/v1/data-permissions/metadata` | GET | 获取配置元数据 |
| `/api/v1/roles/:roleId/data-permissions` | GET | 获取角色数据权限规则 |
| `/api/v1/roles/:roleId/data-permissions` | POST | 创建数据权限规则 |
| `/api/v1/data-permissions/:ruleId` | PUT | 更新数据权限规则 |
| `/api/v1/data-permissions/:ruleId` | DELETE | 删除数据权限规则 |

### 字段权限

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/v1/roles/:roleId/field-permissions` | GET | 获取角色字段权限 |
| `/api/v1/roles/:roleId/field-permissions` | PUT | 更新角色字段权限 |

## 初始化脚本

```bash
# 初始化角色
npx ts-node scripts/init-roles.ts

# 初始化 Casbin 策略
npx ts-node scripts/init-casbin-policies.ts

# 同步用户角色到 Casbin
npx ts-node scripts/sync-user-roles-to-casbin.ts
```

## 测试

```bash
# 运行 Casbin 服务测试
npm test -- casbinService

# 运行数据权限服务测试
npm test -- dataPermissionService

# 运行权限集成测试
npm test -- permissionIntegration
```
