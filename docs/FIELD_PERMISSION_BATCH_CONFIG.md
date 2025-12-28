# 批量字段权限配置方案

## 待处理的5个页面

### 1. Base（基地管理）

**前端页面**: `client/src/pages/live-base/base-data/bases/`
**API路径**: `/api/v1/live-base/bases`
**后端路由**: `server/src/routes/baseRoutes.ts`
**数据模型**: `Base`

**字段列表** (15个字段):
- id (number)
- code (string)
- name (string)
- description (string)
- address (string)
- contactPerson (string)
- contactPhone (string)
- contactEmail (string)
- currency (string)
- language (string)
- type (string)
- isActive (boolean)
- createdBy (string)
- updatedBy (string)
- createdAt (date)
- updatedAt (date)

**需要添加的中间件**:
```typescript
router.get('/', injectDataPermission('base'), filterResponseFields(), BaseController.getBaseList);
router.get('/:id', injectDataPermission('base'), filterResponseFields(), BaseController.getBaseById);
```

---

### 2. Location（直播间/仓库）

**前端页面**: 
- 线上: `client/src/pages/live-base/base-data/locations/`
- 线下: 可能共用同一个页面

**API路径**: `/api/v1/bases/:baseId/locations`
**后端路由**: `server/src/routes/locationBaseRoutes.ts`
**数据模型**: `Location`

**字段列表** (12个字段):
- id (number)
- code (string)
- name (string)
- type (string) - LocationType enum
- description (string)
- address (string)
- contactPerson (string)
- contactPhone (string)
- baseId (number)
- isActive (boolean)
- createdAt (date)
- updatedAt (date)

**需要添加的中间件**:
```typescript
router.get('/', injectDataPermission('location'), filterResponseFields(), LocationController.list);
router.get('/:id', injectDataPermission('location'), filterResponseFields(), LocationController.getById);
```

---

### 3. Personnel（人员管理）

**前端页面**: 
- 线上: `client/src/pages/live-base/base-data/personnel/`
- 线下: 可能共用同一个页面

**API路径**: `/api/v1/bases/:baseId/personnel`
**后端路由**: `server/src/routes/personnelBaseRoutes.ts`
**数据模型**: `Personnel`

**字段列表** (13个字段):
- id (string)
- code (string)
- name (string)
- role (string) - PersonnelRole enum
- phone (string)
- email (string)
- notes (string)
- operatorId (string)
- baseId (number)
- isActive (boolean)
- createdBy (string)
- updatedBy (string)
- createdAt (date)
- updatedAt (date)

**需要添加的中间件**:
```typescript
router.get('/', injectDataPermission('personnel'), filterResponseFields(), PersonnelController.list);
router.get('/:id', injectDataPermission('personnel'), filterResponseFields(), PersonnelController.getById);
```

---

### 4. Supplier（供应商管理）

**前端页面**: 需要查找
**API路径**: 需要查找（可能是 `/api/v1/suppliers` 或 `/api/v1/bases/:baseId/suppliers`）
**后端路由**: 需要查找
**数据模型**: `Supplier`

**字段列表** (14个字段):
- id (string)
- code (string)
- name (string)
- contactPerson (string)
- phone (string)
- email (string)
- address (string)
- taxNumber (string)
- bankAccount (string)
- bankName (string)
- notes (string)
- isActive (boolean)
- createdAt (date)
- updatedAt (date)

**需要添加的中间件**: 待确认路由后添加

---

### 5. Products（商品设置/基地商品）

**前端页面**: `client/src/pages/live-base/products/`
**API路径**: `/api/v1/bases/:baseId/goods-settings` 或 `/api/v1/bases/:baseId/goods`
**后端路由**: `server/src/routes/goodsBaseRoutes.ts` (已处理)
**数据模型**: `GoodsLocalSetting` + `Goods`

**状态**: ✅ 已在之前处理完成

---

## 实施步骤

### 步骤1: 更新前端字段权限配置

文件: `client/src/pages/system/roles/components/FieldPermissionConfig.tsx`

添加以下资源配置:

```typescript
// 基地管理
{
  key: 'base',
  label: '基地管理',
  fields: [
    { key: 'id', label: 'ID', type: 'number' },
    { key: 'code', label: '基地编号', type: 'string' },
    { key: 'name', label: '基地名称', type: 'string' },
    { key: 'description', label: '描述', type: 'string' },
    { key: 'address', label: '地址', type: 'string' },
    { key: 'contactPerson', label: '联系人', type: 'string' },
    { key: 'contactPhone', label: '联系电话', type: 'string' },
    { key: 'contactEmail', label: '联系邮箱', type: 'string' },
    { key: 'currency', label: '货币', type: 'string' },
    { key: 'language', label: '语言', type: 'string' },
    { key: 'type', label: '类型', type: 'string' },
    { key: 'isActive', label: '状态', type: 'boolean' },
    { key: 'createdBy', label: '创建人', type: 'string' },
    { key: 'updatedBy', label: '更新人', type: 'string' },
    { key: 'createdAt', label: '创建时间', type: 'date' },
    { key: 'updatedAt', label: '更新时间', type: 'date' },
  ],
},

// 直播间/仓库
{
  key: 'location',
  label: '直播间/仓库',
  fields: [
    { key: 'id', label: 'ID', type: 'number' },
    { key: 'code', label: '编号', type: 'string' },
    { key: 'name', label: '名称', type: 'string' },
    { key: 'type', label: '类型', type: 'string' },
    { key: 'description', label: '描述', type: 'string' },
    { key: 'address', label: '地址', type: 'string' },
    { key: 'contactPerson', label: '联系人', type: 'string' },
    { key: 'contactPhone', label: '联系电话', type: 'string' },
    { key: 'baseId', label: '基地ID', type: 'number' },
    { key: 'isActive', label: '状态', type: 'boolean' },
    { key: 'createdAt', label: '创建时间', type: 'date' },
    { key: 'updatedAt', label: '更新时间', type: 'date' },
  ],
},

// 人员管理
{
  key: 'personnel',
  label: '人员管理',
  fields: [
    { key: 'id', label: 'ID', type: 'string' },
    { key: 'code', label: '人员编号', type: 'string' },
    { key: 'name', label: '姓名', type: 'string' },
    { key: 'role', label: '角色', type: 'string' },
    { key: 'phone', label: '电话', type: 'string' },
    { key: 'email', label: '邮箱', type: 'string' },
    { key: 'notes', label: '备注', type: 'string' },
    { key: 'operatorId', label: '操作员ID', type: 'string' },
    { key: 'baseId', label: '基地ID', type: 'number' },
    { key: 'isActive', label: '状态', type: 'boolean' },
    { key: 'createdBy', label: '创建人', type: 'string' },
    { key: 'updatedBy', label: '更新人', type: 'string' },
    { key: 'createdAt', label: '创建时间', type: 'date' },
    { key: 'updatedAt', label: '更新时间', type: 'date' },
  ],
},

// 供应商管理
{
  key: 'supplier',
  label: '供应商管理',
  fields: [
    { key: 'id', label: 'ID', type: 'string' },
    { key: 'code', label: '供应商编号', type: 'string' },
    { key: 'name', label: '供应商名称', type: 'string' },
    { key: 'contactPerson', label: '联系人', type: 'string' },
    { key: 'phone', label: '电话', type: 'string' },
    { key: 'email', label: '邮箱', type: 'string' },
    { key: 'address', label: '地址', type: 'string' },
    { key: 'taxNumber', label: '税号', type: 'string' },
    { key: 'bankAccount', label: '银行账号', type: 'string' },
    { key: 'bankName', label: '开户行', type: 'string' },
    { key: 'notes', label: '备注', type: 'string' },
    { key: 'isActive', label: '状态', type: 'boolean' },
    { key: 'createdAt', label: '创建时间', type: 'date' },
    { key: 'updatedAt', label: '更新时间', type: 'date' },
  ],
},
```

### 步骤2: 更新后端路由中间件

#### 2.1 baseRoutes.ts
```typescript
import { injectDataPermission, filterResponseFields } from '../middleware/permissionMiddleware';

router.get('/', injectDataPermission('base'), filterResponseFields(), BaseController.getBaseList);
router.get('/:id', injectDataPermission('base'), filterResponseFields(), BaseController.getBaseById);
```

#### 2.2 locationBaseRoutes.ts
```typescript
import { injectDataPermission, filterResponseFields } from '../middleware/permissionMiddleware';

// 添加到所有 GET 路由
```

#### 2.3 personnelBaseRoutes.ts
```typescript
import { injectDataPermission, filterResponseFields } from '../middleware/permissionMiddleware';

// 添加到所有 GET 路由
```

#### 2.4 supplierRoutes.ts (待确认)
```typescript
import { injectDataPermission, filterResponseFields } from '../middleware/permissionMiddleware';

// 添加到所有 GET 路由
```

### 步骤3: 验证测试

1. 重启后端服务
2. 刷新前端页面
3. 配置字段权限
4. 测试每个页面的字段过滤效果
5. 确认线上线下页面都生效

---

## 注意事项

1. **线上线下页面**: 需要确认 locations 和 personnel 是否有独立的线上线下页面，还是共用同一个页面
2. **供应商路由**: 需要先查找供应商管理的实际路由和前端页面
3. **响应格式**: 确认每个API的响应格式是否兼容字段权限过滤中间件
4. **字段名称**: 确保前端配置的字段名与后端返回的字段名完全一致
