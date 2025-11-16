# 项目总览 (Overview)

本文档是 **电商后台管理系统** 的顶层设计文档，旨在为所有模块的需求、设计和开发提供统一的指导原则和规范。

---

## 1. 项目目标

本项目旨在开发一个功能全面的电商后台管理系统，以支持“直播基地”业务的全流程管理。系统将覆盖从基础数据配置、库存管理、销售流程到财务核算等多个核心环节，旨在提升运营效率，实现数据驱动的精细化管理。

未来，系统将具备良好的可扩展性，以支持“线下区域”等新业务模式的接入。

---

## 2. 技术栈约定

为保证开发效率和项目质量，建议采用以下技术栈：

- **前端**:
  - **框架**: React (v18+)
  - **语言**: TypeScript
  - **UI 库**: Ant Design (AntD)
  - **状态管理**: Redux Toolkit 或 Zustand
  - **路由**: React Router
  - **数据请求**: Axios 或 TanStack Query (React Query)
- **后端**:
  - (待定，可根据团队熟悉度选择 Node.js/Express, Go/Gin, Java/Spring Boot 等)
- **数据库**:
  - (待定，可根据业务需求选择 PostgreSQL, MySQL 等)

---

## 3. 通用设计规范

### 3.1 UI/UX 规范

- **统一布局**: 所有页面采用统一的顶部导航和侧边栏菜单布局。
- **表格 (Table)**:
  - **分页**: 所有数据量可能较大的表格必须提供分页功能，默认每页10或20条。
  - **加载状态**: 数据加载过程中，表格应显示加载中（Loading）状态。
  - **空状态**: 当没有数据时，表格应显示统一的空状态提示。
- **操作确认**: 所有“删除”或具有破坏性的操作，必须弹出二次确认对话框（例如 AntD 的 `Modal.confirm`），以防止用户误操作。
- **日期/时间**: 所有在界面上展示的日期和时间，应统一格式为 `YYYY-MM-DD HH:mm:ss`。

### 3.2 API 设计约定

- **RESTful 风格**: API 端点应遵循 RESTful 设计风格。
  - `GET /api/v1/goods`: 获取商品列表
  - `GET /api/v1/goods/{id}`: 获取单个商品详情
  - `POST /api/v1/goods`: 创建新商品
  - `PUT /api/v1/goods/{id}`: 更新单个商品
  - `DELETE /api/v1/goods/{id}`: 删除单个商品
- **URL 命名**: 使用小写字母和连字符（kebab-case），例如 `/live-base/anchor-profit`。
- **数据格式**: 所有请求和响应体均使用 JSON 格式。
- **错误处理**: 定义统一的错误响应结构。
- **数据校验**: 所有传入后端的数据都必须经过严格的校验。

---

## 4. 全局数据模型

### 4.1 分页响应结构

所有返回列表数据的 API 均应遵循以下分页结构：

```typescript
// file: src/models/common.ts

export interface PaginatedResponse<T> {
  items: T[]; // 当前页的数据列表
  meta: {
    totalItems: number; // 总记录数
    itemCount: number; // 当前页的记录数
    itemsPerPage: number; // 每页记录数
    totalPages: number; // 总页数
    currentPage: number; // 当前页码
  };
}
```
