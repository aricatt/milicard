# 前端商品页面更新指南

## 📋 更新概述

由于后端已从多对多关系（GoodsBase）重构为阿米巴模式的一对多关系（直接baseId），前端商品页面已相应更新。

## ✅ 已完成的更新

### 1. 后端API更新

#### 新的控制器
- **文件**: `server/src/controllers/goodsController.ts`
- **功能**: 完全重写以支持阿米巴模式

#### 更新的路由
- **文件**: `server/src/routes/goodsBaseRoutes.ts`
- **变更**: 
  - 移除了旧的GoodsBaseController
  - 使用新的GoodsController
  - 所有路由都添加了认证中间件

#### API端点

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/bases/:baseId/goods` | 获取基地商品列表 |
| GET | `/api/v1/bases/:baseId/goods/stats` | 获取基地商品统计 |
| GET | `/api/v1/bases/:baseId/goods/:goodsId` | 获取商品详情 |
| POST | `/api/v1/bases/:baseId/goods` | 创建基地商品 |
| PUT | `/api/v1/bases/:baseId/goods/:goodsId` | 更新商品 |
| DELETE | `/api/v1/bases/:baseId/goods/:goodsId` | 删除商品 |

### 2. 前端页面更新

#### 文件
- `client/src/pages/live-base/products/index.tsx`

#### 主要变更

**1. API参数名称调整**
```typescript
// 旧的参数名
current: pagination.current.toString()

// 新的参数名
page: pagination.current.toString()
```

**2. 响应格式调整**
```typescript
// 旧的响应格式
result.total

// 新的响应格式
result.pagination?.total
```

**3. 添加认证头**
```typescript
headers: {
  'Authorization': `Bearer ${localStorage.getItem('token')}`
}
```

**4. 修复编辑URL**
```typescript
// 旧的URL（错误）
`/api/v1/bases/goods/${editingRecord.id}`

// 新的URL（正确）
`/api/v1/bases/${currentBase.id}/goods/${editingRecord.id}`
```

**5. 移除冗余的baseId参数**
```typescript
// 旧的请求体
{
  ...values,
  ...(isEditing ? {} : { baseId: currentBase.id })
}

// 新的请求体（baseId从URL路径获取）
values
```

## 🎯 关键特性

### 阿米巴模式特点

1. **基地级数据隔离**
   - 每个商品只属于一个基地
   - URL路径中包含baseId确保数据隔离
   - 后端自动验证商品是否属于指定基地

2. **自动编号生成**
   - 商品编号自动生成：`GOODS-XXXXXXXXXXX`
   - 前端不需要提供code字段

3. **必填字段**
   - 厂家名称（manufacturer）：必填
   - 零售价（retailPrice）：必填
   - 包装规格（packPerBox, piecePerPack）：必填

4. **固定字段**
   - 箱装数量（boxQuantity）：固定为1

## 📊 数据流

### 获取商品列表
```
前端 → GET /api/v1/bases/:baseId/goods?page=1&pageSize=20
     ← { success: true, data: [...], pagination: {...} }
```

### 创建商品
```
前端 → POST /api/v1/bases/:baseId/goods
       Body: { name, manufacturer, retailPrice, ... }
     ← { success: true, data: {...}, message: "商品创建成功" }
```

### 更新商品
```
前端 → PUT /api/v1/bases/:baseId/goods/:goodsId
       Body: { name, retailPrice, ... }
     ← { success: true, data: {...}, message: "商品更新成功" }
```

### 删除商品
```
前端 → DELETE /api/v1/bases/:baseId/goods/:goodsId
     ← { success: true, message: "商品删除成功" }
```

## ⚠️ 注意事项

### 1. 认证要求
所有API请求都需要包含JWT token：
```typescript
headers: {
  'Authorization': `Bearer ${localStorage.getItem('token')}`
}
```

### 2. 基地上下文
确保在调用API前已选择基地：
```typescript
if (!currentBase) {
  message.warning('请先选择基地');
  return;
}
```

### 3. 错误处理
后端返回的错误格式：
```typescript
{
  success: false,
  message: "错误信息"
}
```

### 4. 数据类型
前端Product接口已更新，确保与后端GoodsResponse匹配：
```typescript
interface Product {
  id: string;
  code: string;
  name: string;
  manufacturer: string;
  retailPrice: number;
  packPerBox: number;
  piecePerPack: number;
  boxQuantity: number;  // 固定为1
  baseId: number;       // 所属基地ID
  isActive: boolean;
  // ... 其他字段
}
```

## 🧪 测试建议

### 1. 功能测试
- [ ] 商品列表加载
- [ ] 商品搜索和筛选
- [ ] 创建新商品
- [ ] 编辑现有商品
- [ ] 删除商品
- [ ] 商品统计显示

### 2. 基地隔离测试
- [ ] 切换基地后数据正确更新
- [ ] 不同基地的商品数据互不干扰
- [ ] 无法访问其他基地的商品

### 3. 边界测试
- [ ] 未选择基地时的提示
- [ ] 网络错误处理
- [ ] 权限不足的错误处理
- [ ] 空数据状态显示

## 🚀 部署检查清单

- [x] 后端服务已更新
- [x] 数据库迁移已执行
- [x] Prisma客户端已重新生成
- [x] 后端路由已更新
- [x] 前端API调用已更新
- [ ] 前端代码已测试
- [ ] 文档已更新

## 📝 相关文档

- [阿米巴重构总结](./AMOEBA_REFACTOR_SUMMARY.md)
- [商品列表PRD](./doc/prd/01_live_base/02_inventory/01_goods_list.md)

---

**更新日期**: 2024-11-24
**更新人员**: AI Assistant
**状态**: ✅ 完成
