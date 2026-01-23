# 系统预置参数功能

## 概述

全局配置表支持两种类型的参数：
- **系统预置参数**：由系统预定义，不可删除，只能修改值
- **自定义参数**：用户创建，可以自由增删改

## 系统预置参数

系统预置参数通过 `isSystem` 字段标识，具有以下特点：

### 保护机制
1. ✅ **不可删除**：前端隐藏删除按钮，后端拒绝删除请求
2. ✅ **键名不可修改**：后端拒绝修改 `key` 字段
3. ✅ **值可以修改**：允许修改 `value`、`description`、`category`、`isActive` 等字段
4. ✅ **视觉标识**：前端显示橙色"系统"标签

### 预置参数列表

| 键名 | 默认值 | 说明 | 分类 |
|------|--------|------|------|
| `system.default_currency` | `"CNY"` | 系统默认货币代码 | system |
| `system.max_upload_size` | `10485760` | 文件上传最大大小（字节） | system |
| `system.session_timeout` | `3600` | 用户会话超时时间（秒） | system |
| `business.default_tax_rate` | `0.13` | 默认税率 | business |
| `business.low_stock_threshold` | `10` | 低库存预警阈值 | business |
| `notification.email_enabled` | `false` | 是否启用邮件通知 | notification |
| `notification.sms_enabled` | `false` | 是否启用短信通知 | notification |

## 初始化系统参数

### 方法 1：使用种子脚本（推荐）

```bash
cd server
npx ts-node prisma/seed-global-settings.ts
```

脚本会自动：
- 检查参数是否已存在
- 创建不存在的系统参数
- 将已存在的参数标记为系统参数

### 方法 2：手动创建

通过 API 创建参数时，设置 `isSystem: true`：

```typescript
await prisma.globalSetting.create({
  data: {
    key: 'system.my_param',
    value: 'value',
    isSystem: true,
    createdBy: userId,
  },
});
```

## 使用系统参数

### 后端获取参数值

```typescript
import { GlobalSettingService } from '../services/globalSettingService';

// 获取单个参数
const currency = await GlobalSettingService.getValue('system.default_currency');
// 返回: "CNY"

// 批量获取参数
const settings = await GlobalSettingService.getValues([
  'system.default_currency',
  'business.default_tax_rate',
]);
// 返回: { "system.default_currency": "CNY", "business.default_tax_rate": 0.13 }
```

### 前端获取参数值

```typescript
import { request } from '@umijs/max';

// 获取单个参数
const response = await request('/api/v1/global-settings/value/system.default_currency');
const currency = response.data;

// 批量获取参数
const response = await request('/api/v1/global-settings/values', {
  method: 'POST',
  data: {
    keys: ['system.default_currency', 'business.default_tax_rate'],
  },
});
const settings = response.data;
```

## 添加新的系统参数

### 步骤 1：在种子脚本中添加

编辑 `server/prisma/seed-global-settings.ts`：

```typescript
const SYSTEM_SETTINGS = [
  // ... 现有参数
  {
    key: 'system.new_param',
    value: 'default_value',
    description: '新参数说明',
    category: 'system',
  },
];
```

### 步骤 2：运行种子脚本

```bash
npx ts-node prisma/seed-global-settings.ts
```

### 步骤 3：在代码中使用

```typescript
const newParam = await GlobalSettingService.getValue('system.new_param');
```

## 数据库结构

```sql
CREATE TABLE "global_settings" (
  "id" TEXT PRIMARY KEY,
  "key" TEXT UNIQUE NOT NULL,
  "value" JSONB NOT NULL,
  "description" TEXT,
  "category" TEXT,
  "is_system" BOOLEAN DEFAULT false,  -- 系统参数标识
  "is_active" BOOLEAN DEFAULT true,
  "created_by" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE INDEX "global_settings_is_system_idx" ON "global_settings"("is_system");
```

## API 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/global-settings` | 获取配置列表 |
| GET | `/api/v1/global-settings/:id` | 获取单个配置 |
| GET | `/api/v1/global-settings/value/:key` | 获取配置值 |
| POST | `/api/v1/global-settings/values` | 批量获取配置值 |
| POST | `/api/v1/global-settings` | 创建配置 |
| PUT | `/api/v1/global-settings/:id` | 更新配置 |
| DELETE | `/api/v1/global-settings/:id` | 删除配置（系统参数会被拒绝） |

## 错误处理

### 尝试删除系统参数

```
HTTP 400 Bad Request
{
  "error": "系统预置参数不允许删除"
}
```

### 尝试修改系统参数的键名

```
HTTP 400 Bad Request
{
  "error": "系统预置参数不允许修改键名"
}
```

## 最佳实践

1. **命名规范**：使用点分隔的命名空间，如 `category.subcategory.param_name`
2. **分类组织**：使用 `category` 字段对参数进行分组
3. **文档说明**：为每个参数添加清晰的 `description`
4. **类型安全**：使用 TypeScript 定义参数键名常量
5. **缓存策略**：对频繁访问的参数进行缓存

## 示例：定义参数常量

```typescript
// server/src/constants/settings.ts
export const SYSTEM_SETTINGS = {
  DEFAULT_CURRENCY: 'system.default_currency',
  MAX_UPLOAD_SIZE: 'system.max_upload_size',
  SESSION_TIMEOUT: 'system.session_timeout',
  DEFAULT_TAX_RATE: 'business.default_tax_rate',
  LOW_STOCK_THRESHOLD: 'business.low_stock_threshold',
} as const;

// 使用
import { SYSTEM_SETTINGS } from '../constants/settings';
const currency = await GlobalSettingService.getValue(SYSTEM_SETTINGS.DEFAULT_CURRENCY);
```

## 迁移说明

### 从旧版本升级

如果你的数据库中已有全局配置数据，运行以下步骤：

1. **应用数据库迁移**：
   ```bash
   cd server
   npx prisma migrate deploy
   ```

2. **运行种子脚本**：
   ```bash
   npx ts-node prisma/seed-global-settings.ts
   ```

3. **验证**：
   - 访问前端页面 `/global-info/global-setting`
   - 确认系统参数显示橙色"系统"标签
   - 确认系统参数没有删除按钮

## 相关文件

- Schema: `server/prisma/schema.prisma`
- 迁移: `server/prisma/migrations/20260123153413_add_is_system_to_global_setting/`
- 种子脚本: `server/prisma/seed-global-settings.ts`
- 服务层: `server/src/services/globalSettingService.ts`
- 控制器: `server/src/controllers/globalSettingController.ts`
- 前端页面: `client/src/pages/global-info/global-setting/index.tsx`
