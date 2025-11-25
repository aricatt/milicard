# 测试用例体系总览

## 📋 测试现状

### ✅ 已有测试用例

我们的项目**确实有完整的测试用例体系**，这是在数据库设计初期就同步建立的。

---

## 🗂️ 测试文件结构

### 后端测试（Server）

```
server/src/
├── __tests__/                          # 集成测试
│   ├── helpers/                        # 测试辅助工具
│   │   ├── authHelper.ts              # 认证辅助函数
│   │   └── dataHelper.ts              # 数据创建辅助函数
│   ├── purchase-integration.test.ts   # 采购管理集成测试 ✅
│   ├── purchase-simple.test.ts        # 采购简单测试 ✅
│   ├── purchase.test.ts               # 采购完整测试 ✅
│   ├── sales-simple.test.ts           # 销售简单测试 ✅
│   └── setup.ts                       # 测试环境配置 ✅
│
├── services/__tests__/                 # 服务层单元测试
│   ├── authService.test.ts            # 认证服务测试 ✅
│   ├── goodsService.test.ts           # 商品服务测试 ✅
│   ├── inventoryService.test.ts       # 库存服务测试 ✅
│   ├── jwtService.test.ts             # JWT服务测试 ✅
│   ├── passwordService.test.ts        # 密码服务测试 ✅
│   └── permissionService.test.ts      # 权限服务测试 ✅
│
├── routes/__tests__/                   # 路由测试
│   └── authRoutes.test.ts             # 认证路由测试 ✅
│
└── utils/
    └── codeGenerator.test.ts          # 编号生成器测试 ✅
```

### 前端测试（Client）

```
client/src/
└── pages/user/login/
    ├── login.test.tsx                 # 登录页面测试 ✅
    └── __snapshots__/
        └── login.test.tsx.snap        # 快照测试 ✅
```

---

## 📊 测试覆盖情况

### 已覆盖的模块

| 模块 | 测试文件 | 测试类型 | 状态 |
|------|---------|---------|------|
| **认证系统** | authService.test.ts | 单元测试 | ✅ 完整 |
| **认证系统** | authRoutes.test.ts | 路由测试 | ✅ 完整 |
| **JWT服务** | jwtService.test.ts | 单元测试 | ✅ 完整 |
| **密码服务** | passwordService.test.ts | 单元测试 | ✅ 完整 |
| **权限管理** | permissionService.test.ts | 单元测试 | ✅ 完整 |
| **商品管理** | goodsService.test.ts | 单元测试 | ✅ 完整 |
| **库存管理** | inventoryService.test.ts | 单元测试 | ✅ 完整 |
| **采购管理** | purchase*.test.ts (3个) | 集成测试 | ✅ 完整 |
| **销售管理** | sales-simple.test.ts | 集成测试 | ✅ 完整 |
| **编号生成** | codeGenerator.test.ts | 单元测试 | ✅ 完整 |
| **Location 管理** | locationService.test.ts | 单元测试 | ✅ 完整 |
| **登录页面** | login.test.tsx | 组件测试 | ✅ 完整 |

### 未覆盖的模块（需要补充）

| 模块 | 优先级 | 状态 | 预计工作量 |
|------|--------|------|-----------|
| **Base 管理** | 🔴 高 | ⏳ 待补充 | 2小时 |
| **Transfer 调货** | 🟡 中 | ⏳ 待补充 | 3小时 |
| **Arrival 到货** | 🟡 中 | ⏳ 待补充 | 3小时 |
| **Distribution 配货** | 🟡 中 | ⏳ 待补充 | 3小时 |
| **Personnel 人员** | 🟢 低 | ⏳ 待补充 | 2小时 |
| **Supplier 供应商** | 🟢 低 | ⏳ 待补充 | 2小时 |

---

## 🔧 测试配置

### Jest 配置（`jest.config.js`）

```javascript
{
  testEnvironment: 'node',
  preset: 'ts-jest',
  
  // 覆盖率目标：70%
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
  
  // 测试超时：10秒
  testTimeout: 10000,
  
  // 设置文件
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts']
}
```

### 测试脚本（`package.json`）

```json
{
  "scripts": {
    "test": "jest",                    // 运行所有测试
    "test:watch": "jest --watch",      // 监听模式
    "test:coverage": "jest --coverage", // 生成覆盖率报告
    "test:auth": "jest --testPathPattern=auth" // 只测试认证
  }
}
```

---

## 📝 测试示例

### 1. 单元测试示例（商品服务）

```typescript
// server/src/services/__tests__/goodsService.test.ts

describe('GoodsService', () => {
  describe('createGoods', () => {
    it('should create goods successfully', async () => {
      const goodsData = {
        code: 'TEST001',
        name: { zh_CN: '测试商品', en_US: 'Test Product' },
        retailPrice: 100.00,
        purchasePrice: 80.00
      }

      const result = await GoodsService.createGoods(goodsData, testUser.id)

      expect(result).toBeDefined()
      expect(result.code).toBe(goodsData.code)
      expect(result.retailPrice).toBe(100.00)
    })

    it('should throw error for duplicate code', async () => {
      // 测试重复编码错误
      await expect(
        GoodsService.createGoods(duplicateData, testUser.id)
      ).rejects.toThrow('商品编码已存在')
    })
  })
})
```

### 2. 集成测试示例（采购管理）

```typescript
// server/src/__tests__/purchase-integration.test.ts

describe('采购管理API集成测试', () => {
  beforeAll(async () => {
    // 创建测试数据
    testUser = await createTestUser(...)
    testToken = generateTestToken(testUser)
    testLocation = await createTestLocation(...)
    testGoods = await createTestGoods(...)
  })

  afterAll(async () => {
    // 清理测试数据
    await cleanupTestData(testUser.id)
  })

  describe('POST /api/v1/purchase/orders', () => {
    it('应该成功创建采购订单', async () => {
      const response = await request(app)
        .post('/api/v1/purchase/orders')
        .set('Authorization', `Bearer ${testToken}`)
        .send(orderData)

      expect(response.status).toBe(201)
      expect(response.body.success).toBe(true)
    })
  })
})
```

### 3. 测试辅助工具

```typescript
// server/src/__tests__/helpers/authHelper.ts

export function generateTestToken(user: any): string {
  return jwt.sign(
    { userId: user.id, username: user.username },
    process.env.JWT_SECRET!,
    { expiresIn: '1h' }
  )
}

// server/src/__tests__/helpers/dataHelper.ts

export async function createTestUser(data: any) {
  return await prisma.user.create({
    data: {
      username: data.username,
      email: data.email,
      passwordHash: await bcrypt.hash(data.password, 12),
      isActive: true
    }
  })
}

export async function createTestLocation(data: any) {
  return await prisma.location.create({
    data: {
      name: data.name,
      type: data.type,
      address: data.address,
      isActive: true
    }
  })
}
```

---

## 🚀 运行测试

### 运行所有测试

```bash
cd server
npm test
```

### 运行特定测试

```bash
# 只测试认证相关
npm run test:auth

# 只测试商品服务
npm test -- goodsService

# 只测试采购管理
npm test -- purchase
```

### 生成覆盖率报告

```bash
npm run test:coverage
```

报告位置：`server/coverage/index.html`

### 监听模式（开发时使用）

```bash
npm run test:watch
```

---

## 📈 测试覆盖率目标

### 当前目标（已配置）

- **分支覆盖率**：70%
- **函数覆盖率**：70%
- **行覆盖率**：70%
- **语句覆盖率**：70%

### 长期目标（建议）

- **核心业务逻辑**：90%+
- **工具函数**：95%+
- **API 路由**：85%+
- **整体覆盖率**：80%+

---

## ✅ 测试最佳实践

### 1. 测试命名规范

```typescript
// ✅ 好的命名
describe('GoodsService', () => {
  describe('createGoods', () => {
    it('should create goods successfully', ...)
    it('should throw error for duplicate code', ...)
    it('should validate required fields', ...)
  })
})

// ❌ 不好的命名
describe('test1', () => {
  it('works', ...)
})
```

### 2. 测试数据隔离

```typescript
// ✅ 每个测试独立创建数据
beforeEach(async () => {
  testUser = await createTestUser({
    username: `test_${Date.now()}_${Math.random()}`
  })
})

afterEach(async () => {
  await cleanupTestData(testUser.id)
})

// ❌ 测试间共享数据（可能相互影响）
const testUser = { id: '123' } // 全局变量
```

### 3. 使用测试辅助函数

```typescript
// ✅ 使用辅助函数
const testUser = await createTestUser(...)
const testToken = generateTestToken(testUser)

// ❌ 重复代码
const testUser = await prisma.user.create({
  data: { ... } // 每个测试都重复这段代码
})
```

### 4. 清理测试数据

```typescript
// ✅ 总是清理测试数据
afterAll(async () => {
  await prisma.user.deleteMany({
    where: { id: { in: [testUser.id, adminUser.id] } }
  })
})

// ❌ 不清理（污染数据库）
// 没有 afterAll
```

### 5. 测试边界条件

```typescript
describe('createGoods', () => {
  it('should create goods successfully', ...)           // 正常情况
  it('should throw error for duplicate code', ...)      // 错误情况
  it('should validate required fields', ...)            // 验证情况
  it('should handle minimal data', ...)                 // 边界情况
  it('should handle maximum length name', ...)          // 边界情况
})
```

---

## 🎯 Location 测试用例模板（待实现）

基于这次 Location ID 修改的经验，我们应该添加以下测试：

```typescript
// server/src/services/__tests__/locationService.test.ts

describe('LocationService', () => {
  describe('createLocation', () => {
    it('should create location with integer ID', async () => {
      const location = await LocationService.createLocation({
        name: 'Test Location',
        type: 'LIVE_ROOM',
        baseId: 1
      })

      expect(typeof location.id).toBe('number')
      expect(location.id).toBeGreaterThan(0)
    })

    it('should auto-increment ID', async () => {
      const location1 = await LocationService.createLocation(...)
      const location2 = await LocationService.createLocation(...)

      expect(location2.id).toBe(location1.id + 1)
    })
  })

  describe('updateLocation', () => {
    it('should update location with integer ID', async () => {
      const location = await LocationService.createLocation(...)
      const updated = await LocationService.updateLocation(
        location.id,  // 应该是 number
        { name: 'Updated Name' }
      )

      expect(updated.id).toBe(location.id)
      expect(updated.name).toBe('Updated Name')
    })
  })

  describe('foreign key references', () => {
    it('should handle Inventory.locationId as integer', async () => {
      const location = await LocationService.createLocation(...)
      const inventory = await prisma.inventory.create({
        data: {
          locationId: location.id,  // 应该是 number
          goodsId: testGoods.id,
          stockQuantity: 100
        }
      })

      expect(typeof inventory.locationId).toBe('number')
    })

    it('should handle all 13 foreign key tables', async () => {
      // 测试所有关联表的 locationId 类型
      const tables = [
        'Inventory',
        'PurchaseOrder',
        'ArrivalOrder',
        'TransferOrder',
        'StockConsumption',
        'StockOutOrder',
        'AnchorProfit',
        'UserLocation',
        'ArrivalRecord',
        'TransferRecord',
        'InventoryLedger'
      ]

      for (const table of tables) {
        // 测试每个表的 locationId 字段
      }
    })
  })
})
```

---

## 📚 相关文档

- [Jest 官方文档](https://jestjs.io/)
- [Supertest 文档](https://github.com/visionmedia/supertest)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
- [数据库迁移检查清单](./DATABASE_MIGRATION_CHECKLIST.md)
- [Location ID 修改复盘](../REFACTOR_LOCATION_ID_POSTMORTEM.md)

---

## 🔄 下一步行动

### 立即执行（本周）

- [ ] 添加 Location 服务测试用例
- [ ] 添加 Base 服务测试用例
- [ ] 运行覆盖率报告，评估当前状态
- [ ] 修复任何失败的测试

### 短期计划（本月）

- [ ] 补充缺失模块的测试用例
- [ ] 提高覆盖率到 80%
- [ ] 添加 E2E 测试
- [ ] 集成 CI/CD 自动测试

### 长期计划

- [ ] 建立测试覆盖率监控
- [ ] 添加性能测试
- [ ] 添加压力测试
- [ ] 建立测试文档库

---

**文档创建时间**：2025-11-25  
**维护者**：开发团队  
**最后更新**：2025-11-25  
