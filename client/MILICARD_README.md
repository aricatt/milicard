# Milicard 前端项目

基于 **Ant Design Pro** 的企业级中后台前端解决方案

## 📋 项目概述

本项目是 Milicard 库存管理系统的前端部分，采用了成熟的 Ant Design Pro 脚手架，提供了完整的企业级中后台解决方案。

### 🛠️ 技术栈

- **React 19** - 最新的React版本
- **TypeScript** - 类型安全的JavaScript
- **Ant Design 5** - 企业级UI设计语言
- **Pro Components** - 基于Ant Design的高级组件
- **UmiJS 4** - 企业级前端应用框架
- **Vite** - 快速的构建工具

### 🏗️ 项目结构

```
client/
├── config/                 # 配置文件
│   ├── config.ts           # 主配置文件
│   ├── routes.ts           # 路由配置
│   ├── proxy.ts            # 代理配置
│   └── defaultSettings.ts  # 默认设置
├── src/
│   ├── components/         # 公共组件
│   ├── pages/              # 页面组件
│   │   ├── dashboard/      # 仪表板页面
│   │   ├── form/           # 表单页面
│   │   ├── list/           # 列表页面
│   │   ├── profile/        # 详情页面
│   │   ├── result/         # 结果页面
│   │   ├── exception/      # 异常页面
│   │   ├── user/           # 用户相关页面
│   │   ├── account/        # 账户设置页面
│   │   └── TemplateReference.tsx  # 模板参考页面
│   ├── services/           # API服务
│   ├── locales/            # 国际化文件
│   └── utils/              # 工具函数
├── mock/                   # Mock数据
├── public/                 # 静态资源
└── tests/                  # 测试文件
```

## 🚀 快速开始

### 环境要求

- Node.js >= 20.0.0
- npm 或 yarn

### 安装依赖

```bash
npm install
# 或
yarn install
```

### 启动开发服务器

```bash
npm start
# 或
yarn start
```

开发服务器将在 `http://localhost:8000` 启动

### 构建生产版本

```bash
npm run build
# 或
yarn build
```

## 🔧 配置说明

### 后端API代理

已配置开发环境代理，自动将前端API请求转发到后端服务器：

```typescript
// config/proxy.ts
dev: {
  '/api/': {
    target: 'http://localhost:6601',  // 后端API服务器
    changeOrigin: true,
  },
}
```

### 路由配置

所有路由配置在 `config/routes.ts` 中，包括：

- `/dashboard` - 仪表板相关页面
- `/form` - 表单相关页面  
- `/list` - 列表相关页面
- `/profile` - 详情页面
- `/result` - 结果页面
- `/exception` - 异常页面
- `/user` - 用户相关页面
- `/account` - 账户设置页面
- `/template-reference` - **模板参考页面** ⭐

### 国际化支持

支持多语言，默认中文，已配置：
- 中文 (zh-CN)
- 英文 (en-US)
- 其他语言文件在 `src/locales/` 目录

## 📚 模板参考页面

访问 `/template-reference` 可以查看所有官方提供的页面模板，包括：

### 🎛️ 仪表板模板
- **分析页** - 数据分析展示，包含各种图表和统计信息
- **监控页** - 系统监控，实时展示系统运行状态  
- **工作台** - 个人工作台，展示个人任务和项目信息

### 📝 表单模板
- **基础表单** - 标准表单页面，包含各种表单控件
- **分步表单** - 多步骤表单，适用于复杂的数据录入流程
- **高级表单** - 复杂表单页面，包含动态表单和复杂布局

### 📊 列表模板
- **标准列表** - 数据列表页面，包含搜索、筛选、分页
- **基础列表** - 简单的数据展示列表
- **卡片列表** - 卡片式列表，适用于图文混合内容
- **搜索列表** - 带搜索功能的列表，支持多种搜索方式

### 📄 其他模板
- **详情页** - 基础和高级详情展示页面
- **结果页** - 成功/失败结果页面
- **异常页** - 403/404/500错误页面
- **用户页** - 登录/注册页面
- **个人页** - 个人中心/设置页面

## 🔗 与后端集成

### API基础地址
- 开发环境：`http://localhost:8000/api/v1/`（通过代理转发到 `http://localhost:6601/api/v1/`）
- 生产环境：需要配置实际的API服务器地址

### 主要API端点
- `/api/v1/auth` - 认证相关
- `/api/v1/goods` - 商品管理
- `/api/v1/inventory` - 库存管理
- `/api/v1/purchase` - 采购管理
- `/api/v1/sales` - 销售管理

## 📝 开发计划

### 下一步开发任务

1. **API客户端封装**
   - 创建统一的HTTP客户端
   - 封装认证和错误处理
   - 实现API调用方法

2. **核心业务页面开发**
   - 商品管理页面
   - 库存管理页面  
   - 采购管理页面
   - 销售管理页面

3. **用户认证系统**
   - 登录页面改造
   - JWT token管理
   - 权限控制集成

## 🤝 开发规范

### 代码规范
- 使用 TypeScript 进行类型检查
- 遵循 ESLint 和 Prettier 规范
- 组件采用函数式组件 + Hooks

### 提交规范
- 使用 Conventional Commits 规范
- 通过 husky 和 lint-staged 进行代码检查

### 测试
- 使用 Jest 进行单元测试
- 使用 @testing-library/react 进行组件测试

## 📞 技术支持

如有问题，请参考：
- [Ant Design Pro 官方文档](https://pro.ant.design/)
- [UmiJS 官方文档](https://umijs.org/)
- [Ant Design 官方文档](https://ant.design/)

---

**注意：** 本项目基于 Ant Design Pro 官方脚手架，保留了所有官方模板页面作为开发参考。在实际业务开发中，可以基于这些模板快速构建符合需求的页面。
