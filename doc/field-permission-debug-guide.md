# 字段权限调试指南

## 问题背景

在开发过程中，字段权限配置可能不生效，导致：
- 某些字段应该被隐藏但仍然显示
- 不清楚当前页面使用了哪些字段权限配置
- 难以定位字段权限不生效的原因

## 调试工具

### 1. 后端调试信息

在开发环境下，后端API响应会自动附加字段权限调试信息：

```json
{
  "success": true,
  "data": [...],
  "_debug_fieldPermissions": {
    "readable": ["id", "name", "code", ...],
    "writable": ["name", "code", ...],
    "resource": "goodsLocalSetting",
    "relatedResources": ["goods", "category"],
    "message": "当前请求的字段权限配置"
  }
}
```

### 2. 前端调试面板

使用 `FieldPermissionDebugPanel` 组件在页面上显示字段权限信息。

#### 使用方法

**步骤1：导入组件和Hook**

```tsx
import FieldPermissionDebugPanel from '@/components/FieldPermissionDebugPanel';
import { useFieldPermissionDebug } from '@/hooks/useFieldPermissionDebug';
```

**步骤2：在组件中使用Hook**

```tsx
const YourComponent = () => {
  const { debugState, captureDebugInfo } = useFieldPermissionDebug();
  
  // ... 其他代码
};
```

**步骤3：在数据请求后捕获调试信息**

```tsx
const fetchData = async () => {
  const response = await request('/api/v1/goods-local-settings');
  
  // 捕获调试信息
  captureDebugInfo(response, '/api/v1/goods-local-settings');
  
  return response;
};
```

**步骤4：在页面中渲染调试面板**

```tsx
return (
  <PageContainer>
    {/* 你的页面内容 */}
    <ProTable ... />
    
    {/* 调试面板（仅开发环境显示） */}
    <FieldPermissionDebugPanel
      debugInfo={debugState.debugInfo}
      actualFields={debugState.actualFields}
      apiPath={debugState.apiPath}
    />
  </PageContainer>
);
```

### 3. 控制台调试

调试信息也会自动打印到浏览器控制台：

```
🔐 字段权限调试 - /api/v1/goods-local-settings
  📋 资源: goodsLocalSetting
  🔗 关联资源: goods, category
  ✅ 可读字段: (11) ['id', 'goodsId', 'baseId', 'alias', ...]
  ✏️  可写字段: (8) ['alias', 'retailPrice', ...]
  📦 实际返回字段: (15) ['id', 'goodsId', 'goods', 'packPrice', ...]
  ⚠️  这些字段不在可读列表中但仍然返回了: ['packPrice']
  💡 当前请求的字段权限配置
```

## 常见问题排查

### 问题1：字段应该被隐藏但仍然显示

**症状**：在前端取消勾选某个字段的"可查看"权限，但该字段仍然显示在列表中。

**排查步骤**：

1. 打开调试面板，查看"权限异常字段"部分
2. 检查是否有字段不在"可读字段"列表中但仍然返回
3. 查看"关联资源"，检查这些资源的字段权限配置

**常见原因**：

- **关联资源权限配置不当**：例如 `goodsLocalSetting` 的 `packPrice` 设置为不可读，但关联的 `goods` 资源的 `packPrice` 设置为可读，导致字段权限合并后该字段仍然可读。
- **数据库中有历史遗留配置**：前端字段定义已经移除某个字段，但数据库中仍有该字段的权限配置。

**解决方案**：

1. 使用"重置"功能清理关联资源的字段权限配置
2. 重新配置字段权限，确保主资源和关联资源的配置一致

### 问题2：不清楚当前使用了哪些资源

**解决方案**：查看调试面板的"基本信息"部分，会显示：
- 主资源名称
- 关联资源列表

### 问题3：字段权限合并逻辑

当API请求涉及多个资源时（主资源 + 关联资源），字段权限会按以下规则合并：

1. 先合并关联资源的字段权限
2. 再合并主资源的字段权限
3. 使用 `Set.add()` 方式合并，只会添加字段，不会删除

**注意**：如果关联资源的某个字段权限为 `true`，即使主资源的该字段权限为 `false`，最终该字段仍然可读。

## 生产环境

调试工具仅在开发环境（`NODE_ENV=development`）下启用，生产环境不会有任何性能影响。

## 示例

完整示例请参考：`client/src/pages/live-base/products/index.tsx`
