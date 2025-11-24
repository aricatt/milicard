# 退出登录功能修复

## 🐛 问题描述

用户点击退出登录时出现三个问题：

### 1. API 404错误
```
POST http://localhost:8075/api/login/outLogin 404 (Not Found)
```

### 2. Antd警告
```
Warning: [antd: message] Static function can not consume context like dynamic theme. 
Please use 'App' component instead.
```

### 3. 基地选择缓存未清除 ⭐ 新发现
退出登录后重新登录，不会进入基地选择界面，而是直接显示上次选择的基地数据页面。

## 🔍 问题分析

### 问题1: API路径不匹配

**前端调用**:
```typescript
// client/src/services/ant-design-pro/api.ts
export async function outLogin(options?: { [key: string]: any }) {
  return request<Record<string, any>>('/api/login/outLogin', {
    method: 'POST',
    ...(options || {}),
  });
}
```

**后端路由**:
```typescript
// server/src/routes/authRoutes.ts
router.post('/logout',
  authenticateToken,
  AuthController.logout
)
// 完整路径: POST /api/v1/auth/logout
```

**原因**: 前端使用的是旧的API路径`/api/login/outLogin`，但后端实际路径是`/api/v1/auth/logout`

### 问题2: Antd静态方法警告

**原因**: 
- 代码中使用了`message.success()`、`message.error()`等静态方法
- Antd v5推荐使用`App`组件提供的上下文方法以支持动态主题

**影响**: 
- 仅为警告，不影响功能
- 在动态主题切换时可能无法正确应用主题样式

## ✅ 解决方案

### 1. 修复API路径 ✅

**修改文件**: `client/src/services/ant-design-pro/api.ts`

```typescript
/** 退出登录接口 POST /api/v1/auth/logout */
export async function outLogin(options?: { [key: string]: any }) {
  return request<Record<string, any>>('/api/v1/auth/logout', {
    method: 'POST',
    ...(options || {}),
  });
}
```

### 1.5 清除基地选择缓存 ✅ 新增

**修改文件1**: `client/src/contexts/BaseContext.tsx`

添加可选Hook：
```typescript
export const useBaseOptional = (): BaseContextType | null => {
  const context = useContext(BaseContext);
  return context || null;
};
```

**修改文件2**: `client/src/components/RightContent/AvatarDropdown.tsx`

**导入 useBaseOptional**:
```typescript
import { useBaseOptional } from '@/contexts/BaseContext';
```

**在退出登录时安全地清除基地上下文**:
```typescript
export const AvatarDropdown: React.FC<GlobalHeaderRightProps> = ({
  menu,
  children,
}) => {
  const baseContext = useBaseOptional();  // ✅ 使用可选Hook
  
  const loginOut = async () => {
    await outLogin();
    
    // ✅ 清除基地上下文（包括localStorage中的选中基地）
    if (baseContext?.clearBaseContext) {
      baseContext.clearBaseContext();
    }
    
    // ... 其余代码
  };
  
  // ... 其余代码
};
```

> **注意**: 使用`useBaseOptional`而不是`useBase`，因为`AvatarDropdown`可能在非`BaseProvider`环境中渲染（如登录页）。

### 2. Antd警告处理 (可选)

这个警告不影响功能，但如果要完全消除，需要：

**方案A: 使用App组件包裹** (推荐)
```tsx
import { App } from 'antd';

const MyComponent = () => {
  const { message } = App.useApp();
  
  const handleClick = () => {
    message.success('操作成功');
  };
  
  return <button onClick={handleClick}>点击</button>;
};
```

**方案B: 在根组件包裹App**
```tsx
import { App } from 'antd';

function RootApp() {
  return (
    <App>
      {/* 其他组件 */}
    </App>
  );
}
```

## 🧪 测试验证

### 测试步骤
1. 登录系统
2. 点击右上角用户头像
3. 点击"退出登录"
4. 验证是否成功退出并跳转到登录页

### 预期结果
- ✅ 不再出现404错误
- ✅ 成功退出登录
- ✅ 跳转到登录页面
- ✅ 基地选择缓存被清除
- ✅ 重新登录后进入基地选择页面
- ⚠️ Antd警告仍存在（不影响功能）

## 📊 影响范围

### 已修复
- ✅ 退出登录功能正常工作
- ✅ API路径正确
- ✅ 基地选择缓存清除正常

### 待优化
- ⏳ Antd静态方法警告（低优先级）
- ⏳ 其他页面可能也有类似的静态方法使用

### 相关文档
- 📄 详细的基地缓存问题分析：`BUGFIX_LOGOUT_BASE_CACHE.md`

## 🔗 相关文件

### 前端
- `client/src/services/ant-design-pro/api.ts` - API定义
- `client/src/components/RightContent/AvatarDropdown.tsx` - 退出登录组件
- `client/src/contexts/BaseContext.tsx` - 基地上下文管理

### 后端
- `server/src/routes/authRoutes.ts` - 认证路由
- `server/src/controllers/authController.ts` - 认证控制器

## 📝 备注

### 关于Antd警告
- 这是Antd v5的最佳实践建议
- 不影响现有功能
- 建议在后续重构时统一处理
- 可以创建一个全局的message hook来统一管理

### 建议的后续工作
1. 创建全局message hook
2. 替换所有静态message调用
3. 在根组件添加App包裹
4. 测试动态主题切换

---

**修复日期**: 2024-11-24  
**修复人员**: AI Assistant  
**状态**: ✅ 已修复（API路径 + 基地缓存清除）  
**优先级**: 高（功能性问题 + 用户体验问题）
