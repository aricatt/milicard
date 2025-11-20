# 基地中心化架构实施路线图

## 📋 文档概述

本文档提供了基地中心化架构重构的详细实施计划，包括时间安排、任务分解和风险控制。

**创建时间**: 2025-11-20  
**版本**: v1.0  
**状态**: 执行计划

---

## 🎯 实施策略

### 核心原则
1. **分阶段实施**: 降低风险，确保每个阶段都可以独立验证
2. **向后兼容**: 在过渡期保持系统可用性
3. **数据安全**: 确保数据迁移过程中的完整性和安全性
4. **性能优先**: 重点关注查询性能和用户体验

### 实施方式
- **蓝绿部署**: 使用蓝绿部署策略降低风险
- **功能开关**: 使用特性开关控制新功能的启用
- **渐进式迁移**: 逐步迁移各个模块，而非一次性全部更改

---

## 📅 时间计划

### 总体时间安排: 15-20个工作日

```
第一周 (5天)     第二周 (5天)     第三周 (5天)     第四周 (5天)
├─ 阶段1: 基础   ├─ 阶段2: 核心   ├─ 阶段3: 前端   ├─ 阶段4: 测试
│  数据模型      │  业务重构      │  界面重构      │  优化部署
└─ 数据库迁移    └─ API重构       └─ 权限系统      └─ 文档完善
```

---

## 🏗️ 阶段一: 基础架构重构 (第1-2天)

### 目标
- 完成数据库Schema设计和迁移
- 建立基地相关的基础数据结构
- 确保数据完整性和性能

### 任务清单

#### Day 1: 数据库设计和迁移准备
- [ ] **上午**: 完善Prisma Schema设计
  - 更新现有模型，添加基地关联
  - 设计新的基地相关模型
  - 验证模型关系的正确性
  
- [ ] **下午**: 准备迁移脚本
  - 编写数据库迁移脚本
  - 在开发环境测试迁移
  - 准备回滚方案

#### Day 2: 执行数据库迁移
- [ ] **上午**: 执行迁移
  - 备份当前数据库
  - 执行迁移脚本
  - 验证数据完整性
  
- [ ] **下午**: 基础数据准备
  - 创建默认基地
  - 迁移现有数据到默认基地
  - 生成新的Prisma Client

### 关键文件
```
server/
├── prisma/
│   ├── schema.prisma           # 更新的数据模型
│   └── migrations/             # 迁移脚本
├── src/types/
│   └── base.ts                 # 基地相关类型定义
└── src/utils/
    └── migration.ts            # 迁移工具函数
```

---

## 🔧 阶段二: 核心业务重构 (第3-7天)

### 目标
- 重构所有核心业务Service层
- 更新Controller层，增加基地上下文
- 实现基地级别的权限控制

### Day 3: 基地管理模块
- [ ] **上午**: 基地Service和Controller
  ```typescript
  // 完成文件
  - src/services/baseService.ts
  - src/controllers/baseController.ts
  - src/routes/baseRoutes.ts
  ```
  
- [ ] **下午**: 基地权限中间件
  ```typescript
  // 新增文件
  - src/middleware/baseContext.ts
  - src/middleware/basePermission.ts
  ```

### Day 4: 用户和权限系统重构
- [ ] **上午**: 用户基地关系管理
  ```typescript
  // 更新文件
  - src/services/authService.ts
  - src/services/permissionService.ts
  ```
  
- [ ] **下午**: JWT Token增加基地信息
  ```typescript
  // 更新文件
  - src/services/jwtService.ts
  - src/middleware/auth.ts
  ```

### Day 5: 商品管理系统重构
- [ ] **上午**: 商品Service重构
  ```typescript
  // 更新文件
  - src/services/goodsService.ts
  - src/controllers/goodsController.ts
  ```
  
- [ ] **下午**: 商品基地配置API
  ```typescript
  // 新增功能
  - 商品在各基地的启用/禁用
  - 基地特定价格配置
  ```

### Day 6: 库存管理系统重构
- [ ] **上午**: 库存Service重构
  ```typescript
  // 更新文件
  - src/services/inventoryService.ts
  - src/controllers/inventoryController.ts
  ```
  
- [ ] **下午**: 基地间库存转移
  ```typescript
  // 新增功能
  - 跨基地库存查询限制
  - 基地内库存转移
  ```

### Day 7: 采购和销售系统重构
- [ ] **上午**: 采购系统重构
  ```typescript
  // 更新文件
  - src/services/purchaseService.ts
  - src/controllers/purchaseController.ts
  ```
  
- [ ] **下午**: 销售系统重构
  ```typescript
  // 更新文件
  - src/services/salesService.ts
  - src/controllers/salesController.ts
  ```

---

## 🎨 阶段三: 前端重构 (第8-12天)

### 目标
- 实现基地上下文管理
- 重构所有页面组件
- 实现基地选择和切换功能

### Day 8: 基地上下文和路由
- [ ] **上午**: 基地上下文Provider
  ```typescript
  // 新增文件
  - client/src/contexts/BaseContext.tsx
  - client/src/hooks/useBaseContext.ts
  ```
  
- [ ] **下午**: 路由系统调整
  ```typescript
  // 更新文件
  - client/config/routes.ts
  - client/src/app.tsx
  ```

### Day 9: 基地选择器和导航
- [ ] **上午**: 基地选择组件
  ```typescript
  // 新增文件
  - client/src/components/BaseSelector/index.tsx
  - client/src/components/BaseSelector/style.less
  ```
  
- [ ] **下午**: 导航栏集成
  ```typescript
  // 更新文件
  - client/src/components/GlobalHeader/index.tsx
  ```

### Day 10: 基地管理页面
- [ ] **上午**: 基地列表页面
  ```typescript
  // 完善文件
  - client/src/pages/live-base/base-data/bases/index.tsx
  - client/src/pages/live-base/base-data/bases/service.ts
  ```
  
- [ ] **下午**: 基地详情和编辑
  ```typescript
  // 新增文件
  - client/src/pages/live-base/base-data/bases/detail.tsx
  - client/src/pages/live-base/base-data/bases/components/
  ```

### Day 11: 核心业务页面重构
- [ ] **上午**: 商品管理页面
  ```typescript
  // 更新文件
  - client/src/pages/goods/list/index.tsx
  - client/src/pages/goods/list/service.ts
  ```
  
- [ ] **下午**: 库存管理页面
  ```typescript
  // 更新文件
  - client/src/pages/inventory/list/index.tsx
  - client/src/pages/inventory/list/service.ts
  ```

### Day 12: 采购销售页面重构
- [ ] **上午**: 采购管理页面
  ```typescript
  // 更新文件
  - client/src/pages/purchase/list/index.tsx
  - client/src/pages/purchase/list/service.ts
  ```
  
- [ ] **下午**: 销售管理页面
  ```typescript
  // 更新文件
  - client/src/pages/sales/list/index.tsx
  - client/src/pages/sales/list/service.ts
  ```

---

## 🧪 阶段四: 测试和优化 (第13-15天)

### 目标
- 完整的功能测试
- 性能优化和调试
- 文档更新和部署准备

### Day 13: 单元测试和集成测试
- [ ] **上午**: 后端测试更新
  ```typescript
  // 更新文件
  - server/src/__tests__/base.test.ts
  - server/src/__tests__/goods.test.ts
  - server/src/__tests__/inventory.test.ts
  ```
  
- [ ] **下午**: 前端测试更新
  ```typescript
  // 更新文件
  - client/src/pages/__tests__/
  - client/src/components/__tests__/
  ```

### Day 14: 性能优化和调试
- [ ] **上午**: 数据库性能优化
  - 查询性能分析
  - 索引优化
  - 缓存策略实施
  
- [ ] **下午**: 前端性能优化
  - 组件渲染优化
  - API调用优化
  - 用户体验改进

### Day 15: 文档和部署
- [ ] **上午**: 文档更新
  - API文档更新
  - 用户手册更新
  - 开发文档完善
  
- [ ] **下午**: 部署准备
  - 生产环境配置
  - 部署脚本准备
  - 监控配置

---

## 🔍 质量控制

### 每日检查点
1. **代码审查**: 每天提交的代码必须经过审查
2. **功能测试**: 每个完成的功能必须通过测试
3. **性能监控**: 关键操作的性能指标监控
4. **数据完整性**: 每天验证数据迁移的完整性

### 阶段验收标准

#### 阶段一验收
- [ ] 数据库迁移成功，无数据丢失
- [ ] 所有现有数据正确分配到默认基地
- [ ] 新的Prisma Client正常工作
- [ ] 基础API (基地CRUD) 功能正常

#### 阶段二验收
- [ ] 所有核心业务API支持基地过滤
- [ ] 权限系统正确实施基地级别控制
- [ ] 跨基地操作被正确限制
- [ ] API响应时间在可接受范围内

#### 阶段三验收
- [ ] 基地选择器功能正常
- [ ] 所有页面正确显示当前基地数据
- [ ] 基地切换功能流畅
- [ ] 用户界面友好，无明显体验问题

#### 阶段四验收
- [ ] 所有测试用例通过
- [ ] 系统性能满足要求
- [ ] 文档完整准确
- [ ] 生产环境部署就绪

---

## ⚠️ 风险管控

### 高风险项目
1. **数据迁移风险**
   - 风险: 数据丢失或损坏
   - 缓解: 完整备份 + 测试环境验证 + 分步迁移

2. **性能下降风险**
   - 风险: 增加基地过滤导致查询变慢
   - 缓解: 索引优化 + 查询优化 + 缓存策略

3. **用户体验风险**
   - 风险: 基地切换影响操作流畅性
   - 缓解: 智能默认基地 + 快速切换 + 状态保持

### 应急预案
1. **数据回滚**: 准备完整的数据库回滚脚本
2. **功能降级**: 准备功能开关，可快速禁用新功能
3. **性能监控**: 实时监控系统性能，及时发现问题

---

## 📊 进度跟踪

### 每日进度报告模板
```markdown
## 日期: YYYY-MM-DD

### 已完成任务
- [ ] 任务1: 描述
- [ ] 任务2: 描述

### 遇到的问题
- 问题1: 描述 + 解决方案
- 问题2: 描述 + 解决方案

### 明日计划
- [ ] 任务1: 描述
- [ ] 任务2: 描述

### 风险提醒
- 风险1: 描述 + 缓解措施
```

### 里程碑检查
- **第2天**: 数据库迁移完成 ✅
- **第7天**: 后端重构完成 ✅  
- **第12天**: 前端重构完成 ✅
- **第15天**: 测试和部署就绪 ✅

---

## 🎯 成功标准

### 功能标准
- [ ] 基地管理功能完整可用
- [ ] 所有业务数据按基地正确隔离
- [ ] 用户权限按基地正确控制
- [ ] 基地切换功能流畅易用

### 性能标准
- [ ] 列表查询响应时间 < 500ms
- [ ] 基地切换响应时间 < 200ms
- [ ] 数据库查询命中率 > 95%
- [ ] 系统整体可用性 > 99.9%

### 质量标准
- [ ] 代码测试覆盖率 > 80%
- [ ] 所有API文档完整准确
- [ ] 用户操作文档清晰易懂
- [ ] 系统监控和告警完善

---

**文档状态**: ✅ 完成  
**下一步**: 开始阶段一的具体实施工作

---

## 📋 快速启动清单

准备开始实施时，请确认以下条件：

### 环境准备
- [ ] 开发环境数据库备份完成
- [ ] 测试环境准备就绪
- [ ] 代码仓库创建feature分支
- [ ] 团队成员了解实施计划

### 工具准备
- [ ] Prisma CLI 工具可用
- [ ] 数据库管理工具准备
- [ ] 性能监控工具配置
- [ ] 代码质量检查工具就绪

### 开始实施
准备就绪后，从阶段一第一天开始执行！
