# 退出登录基地缓存清除修复

## 🐛 问题描述

用户退出登录后，重新登录时不会进入基地选择界面，而是直接显示上次选择的基地数据页面。

### 期望行为
- 退出登录 → 清除所有状态
- 重新登录 → 进入基地选择界面
- 选择基地 → 进入对应基地的数据页面

### 实际行为
- 退出登录 → **基地选择被缓存**
- 重新登录 → **直接进入上次选择的基地**
- 跳过基地选择步骤

## 🔍 问题分析

### 基地上下文缓存机制

**BaseContext.tsx** 使用 `localStorage` 持久化当前选择的基地：

```typescript
// 本地存储键名
const STORAGE_KEY = 'milicard_current_base';

// 设置当前基地
const setCurrentBase = (base: BaseInfo | null) => {
  setCurrentBaseState(base);
  if (base) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(base));  // ✅ 保存到localStorage
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
};

// 从本地存储恢复基地信息
useEffect(() => {
  const savedBase = localStorage.getItem(STORAGE_KEY);
  if (savedBase) {
    try {
      const base = JSON.parse(savedBase);
      setCurrentBaseState(base);  // ✅ 自动恢复上次选择的基地
    } catch (error) {
      console.error('恢复基地信息失败:', error);
      localStorage.removeItem(STORAGE_KEY);
    }
  }
}, []);
```

### 退出登录流程缺陷

**AvatarDropdown.tsx** 原有的退出登录逻辑：

```typescript
const loginOut = async () => {
  await outLogin();  // ✅ 调用后端登出API
  
  // ❌ 没有清除基地上下文
  // ❌ localStorage中的基地信息仍然存在
  
  const { search, pathname } = window.location;
  const urlParams = new URL(window.location.href).searchParams;
  const searchParams = new URLSearchParams({
    redirect: pathname + search,
  });
  
  if (window.location.pathname !== '/user/login' && !redirect) {
    history.replace({
      pathname: '/user/login',
      search: searchParams.toString(),
    });
  }
};
```

### 问题根源

1. **退出登录时**：只清除了用户信息，没有清除基地选择
2. **重新登录时**：`BaseContext` 自动从 `localStorage` 恢复上次选择的基地
3. **路由跳转**：因为有 `currentBase`，直接进入基地数据页面，跳过基地选择

## ⚠️ 遇到的问题

### React Hook 调用错误

在实现过程中遇到了一个错误：

```
Error: useBase must be used within a BaseProvider
```

**原因**：
- `AvatarDropdown`组件在某些页面（如登录页）可能不在`BaseProvider`的包裹范围内
- 直接调用`useBase()`会抛出错误
- React Hooks不能在try-catch中调用（违反Hooks规则）

**解决方案**：
- 创建`useBaseOptional` Hook，返回`BaseContextType | null`
- 在`AvatarDropdown`中使用`useBaseOptional`替代`useBase`
- 使用可选链`?.`安全调用`clearBaseContext`

## ✅ 解决方案

### 修改文件1：`client/src/contexts/BaseContext.tsx`

添加可选的Hook，允许在非`BaseProvider`环境中安全使用：

```typescript
// 可选的基地上下文Hook（如果不在Provider中返回null）
export const useBaseOptional = (): BaseContextType | null => {
  const context = useContext(BaseContext);
  return context || null;
};
```

### 修改文件2：`client/src/components/RightContent/AvatarDropdown.tsx`

#### 1. 导入 `useBaseOptional`

```typescript
import { useBaseOptional } from '@/contexts/BaseContext';
```

#### 2. 在退出登录时安全地清除基地上下文

```typescript
export const AvatarDropdown: React.FC<GlobalHeaderRightProps> = ({
  menu,
  children,
}) => {
  // ✅ 使用可选Hook，避免在非BaseProvider环境中报错
  const baseContext = useBaseOptional();
  
  const loginOut = async () => {
    await outLogin();
    
    // ✅ 清除基地上下文（包括localStorage中的选中基地）
    // 使用可选链，只在BaseProvider中才执行清除
    if (baseContext?.clearBaseContext) {
      baseContext.clearBaseContext();
    }
    
    const { search, pathname } = window.location;
    const urlParams = new URL(window.location.href).searchParams;
    const searchParams = new URLSearchParams({
      redirect: pathname + search,
    });
    
    if (window.location.pathname !== '/user/login' && !redirect) {
      history.replace({
        pathname: '/user/login',
        search: searchParams.toString(),
      });
    }
  };
  
  // ... 其余代码
};
```

### clearBaseContext 方法

**BaseContext.tsx** 中已有的清除方法：

```typescript
// 清除基地上下文
const clearBaseContext = () => {
  setCurrentBase(null);      // ✅ 清除内存中的基地
  setBaseList([]);           // ✅ 清除基地列表
  // setCurrentBase(null) 会自动调用 localStorage.removeItem(STORAGE_KEY)
};
```

## 🔄 完整的登录退出流程

### 退出登录流程（修复后）

```
用户点击退出
    ↓
调用 outLogin() API
    ↓
清除用户信息 (setInitialState)
    ↓
清除基地上下文 (clearBaseContext)  ← ✅ 新增
    ↓
  - 清除 currentBase
  - 清除 baseList
  - 删除 localStorage['milicard_current_base']
    ↓
跳转到登录页
```

### 重新登录流程

```
用户输入账号密码
    ↓
登录成功
    ↓
保存 token
    ↓
获取用户信息 (fetchUserInfo)
    ↓
跳转到首页 (/)
    ↓
BaseContext 初始化
    ↓
检查 localStorage['milicard_current_base']  ← ✅ 已被清除
    ↓
currentBase = null
    ↓
BaseGuard 检测到无基地
    ↓
重定向到基地选择页面 (/base-selector)  ← ✅ 符合预期
```

## 🧪 测试验证

### 测试步骤

1. **登录系统**
   - 访问登录页面
   - 输入账号密码登录

2. **选择基地**
   - 进入基地选择页面
   - 选择一个基地（如"测试基地A"）

3. **访问数据页面**
   - 查看商品管理页面
   - 确认显示"测试基地A"的数据

4. **退出登录**
   - 点击右上角用户头像
   - 点击"退出登录"
   - 确认跳转到登录页面

5. **重新登录**
   - 输入账号密码登录
   - **验证点**：应该进入基地选择页面
   - **验证点**：不应该直接显示"测试基地A"的数据

6. **选择不同基地**
   - 选择另一个基地（如"测试基地B"）
   - 确认显示"测试基地B"的数据

### 预期结果

- ✅ 退出登录后，`localStorage['milicard_current_base']` 被删除
- ✅ 重新登录后，进入基地选择页面
- ✅ 不会自动进入上次选择的基地
- ✅ 每次登录都需要重新选择基地

## 📊 影响范围

### 修改的文件
- `client/src/components/RightContent/AvatarDropdown.tsx`

### 影响的功能
- ✅ 退出登录流程
- ✅ 基地选择流程
- ✅ 用户体验优化

### 不影响的功能
- ✅ 登录功能
- ✅ 基地切换功能（在已登录状态下）
- ✅ 其他业务功能

## 🔗 相关文件

### 核心文件
- `client/src/contexts/BaseContext.tsx` - 基地上下文管理
- `client/src/components/RightContent/AvatarDropdown.tsx` - 退出登录组件
- `client/src/components/BaseGuard.tsx` - 基地守卫（检查是否选择基地）
- `client/src/pages/BaseSelector.tsx` - 基地选择页面

### 相关API
- `POST /api/v1/auth/logout` - 退出登录API
- `GET /api/v1/live-base/bases` - 获取基地列表API

## 💡 设计思路

### 为什么要缓存基地选择？

**优点**：
- 用户刷新页面时不需要重新选择基地
- 提升用户体验，减少重复操作

**缺点**：
- 退出登录后仍保留缓存，导致混淆
- 不同用户可能看到上一个用户选择的基地

### 为什么退出登录要清除缓存？

**安全性**：
- 防止下一个用户看到上一个用户的基地数据
- 确保每次登录都是干净的状态

**用户体验**：
- 退出登录应该清除所有状态
- 重新登录应该从基地选择开始，符合用户预期

**数据隔离**：
- 阿米巴模式下，基地数据严格隔离
- 退出登录必须清除基地上下文

## 📝 最佳实践

### 状态清除原则

退出登录时应该清除的状态：
1. ✅ 用户信息 (`currentUser`)
2. ✅ 认证令牌 (`token`)
3. ✅ 基地选择 (`currentBase`)
4. ✅ 其他业务缓存

### 缓存策略

| 数据类型 | 缓存位置 | 退出时清除 | 刷新时保留 |
|---------|---------|-----------|-----------|
| 用户信息 | initialState | ✅ | ❌ |
| 认证令牌 | localStorage | ✅ | ✅ |
| 基地选择 | localStorage | ✅ | ✅ |
| 主题设置 | localStorage | ❌ | ✅ |

## 🎯 总结

### 问题
退出登录后，基地选择被缓存在 `localStorage` 中，导致重新登录时直接进入上次选择的基地。

### 原因
退出登录逻辑中没有调用 `clearBaseContext()` 清除基地上下文。

### 解决
在 `AvatarDropdown.tsx` 的 `loginOut()` 方法中添加 `clearBaseContext()` 调用。

### 效果
- ✅ 退出登录后完全清除状态
- ✅ 重新登录后进入基地选择页面
- ✅ 符合用户预期和安全要求

---

**修复日期**: 2024-11-24  
**修复人员**: AI Assistant  
**状态**: ✅ 已修复  
**优先级**: 高（用户体验问题）
