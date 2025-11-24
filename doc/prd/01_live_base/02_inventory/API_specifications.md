# 库存管理模块 - API 规范

本文档定义了库存管理相关模块的完整API规范，包括采购、到货、调货、库存消耗等功能。

---

## 1. 采购管理 API

### 1.1 获取采购订单列表
```http
GET /api/v1/bases/{baseId}/purchase-orders
```

**查询参数:**
- `current`: 页码 (默认: 1)
- `pageSize`: 每页数量 (默认: 10)
- `orderNo`: 订单编号 (模糊搜索)
- `supplierName`: 供应商名称 (模糊搜索)
- `startDate`: 开始日期 (YYYY-MM-DD)
- `endDate`: 结束日期 (YYYY-MM-DD)

**响应:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "orderNo": "PO-2024001",
      "supplierName": "优质供应商A",
      "targetLocationId": 1,
      "baseId": 1,
      "purchaseDate": "2024-01-15",
      "totalAmount": 15000,
      "notes": "春节前备货",
      "createdBy": "user1",
      "createdAt": "2024-01-15T10:00:00Z",
      "updatedAt": "2024-01-15T10:00:00Z",
      "locationName": "主仓库",
      "locationType": "仓库",
      "baseName": "杭州基地"
    }
  ],
  "total": 50,
  "current": 1,
  "pageSize": 10
}
```

### 1.2 创建采购订单
```http
POST /api/v1/bases/{baseId}/purchase-orders
```

**请求体:**
```json
{
  "orderNo": "PO-2024001",
  "supplierName": "优质供应商A",
  "targetLocationId": 1,
  "purchaseDate": "2024-01-15",
  "totalAmount": 15000,
  "notes": "春节前备货",
  "items": [
    {
      "goodsId": 1,
      "boxQuantity": 10,
      "packQuantity": 5,
      "pieceQuantity": 100,
      "totalPieces": 115,
      "unitPrice": 50.00,
      "totalPrice": 5750.00,
      "notes": "主推商品"
    }
  ]
}
```

### 1.3 获取采购统计
```http
GET /api/v1/bases/{baseId}/purchase-orders/stats
```

**响应:**
```json
{
  "success": true,
  "data": {
    "totalOrders": 25,
    "totalAmount": 125000.00,
    "uniqueSuppliers": 8,
    "averageAmount": 5000.00
  }
}
```

### 1.4 获取基地供应商列表
```http
GET /api/v1/bases/{baseId}/suppliers
```

**响应:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "优质供应商A",
      "contactPerson": "张经理",
      "contactPhone": "13800138001",
      "address": "北京市朝阳区"
    }
  ]
}
```

---

## 2. 到货管理 API

### 2.1 获取到货记录列表
```http
GET /api/v1/bases/{baseId}/arrivals
```

**查询参数:**
- `current`: 页码 (默认: 1)
- `pageSize`: 每页数量 (默认: 10)
- `warehouseId`: 仓库ID
- `purchaseOrderId`: 采购订单ID
- `goodsId`: 商品ID
- `handlerId`: 经手人ID
- `startDate`: 开始日期 (YYYY-MM-DD)
- `endDate`: 结束日期 (YYYY-MM-DD)

**响应:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "arrivalDate": "2024-01-16",
      "purchaseOrderNo": "PO-2024001",
      "goodsName": "苹果手机壳",
      "warehouseName": "主仓库",
      "handlerName": "张三",
      "boxQuantity": 5,
      "packQuantity": 2,
      "pieceQuantity": 50,
      "notes": "质量良好",
      "createdAt": "2024-01-16T09:30:00Z"
    }
  ],
  "total": 30,
  "current": 1,
  "pageSize": 10
}
```

### 2.2 创建到货记录
```http
POST /api/v1/bases/{baseId}/arrivals
```

**请求体:**
```json
{
  "arrivalDate": "2024-01-16",
  "purchaseOrderId": 1,
  "goodsId": 1,
  "warehouseId": 1,
  "handlerId": 1,
  "boxQuantity": 5,
  "packQuantity": 2,
  "pieceQuantity": 50,
  "notes": "质量良好"
}
```

### 2.3 删除到货记录
```http
DELETE /api/v1/bases/{baseId}/arrivals/{arrivalId}
```

---

## 3. 调货管理 API

### 3.1 获取调货记录列表
```http
GET /api/v1/bases/{baseId}/transfers
```

**查询参数:**
- `current`: 页码 (默认: 1)
- `pageSize`: 每页数量 (默认: 10)
- `sourceLocationId`: 调出地点ID
- `destinationLocationId`: 调入地点ID
- `goodsId`: 商品ID
- `handlerId`: 经手人ID
- `startDate`: 开始日期 (YYYY-MM-DD)
- `endDate`: 结束日期 (YYYY-MM-DD)
- `status`: 状态 (PENDING, COMPLETED, CANCELLED)

**响应:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "transferDate": "2024-01-15",
      "goodsName": "苹果手机壳",
      "fromLocationName": "主仓库",
      "toLocationName": "直播间A",
      "handlerName": "张三",
      "boxQuantity": 2,
      "packQuantity": 0,
      "pieceQuantity": 50,
      "status": "COMPLETED",
      "notes": "直播需要",
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ],
  "total": 20,
  "current": 1,
  "pageSize": 10
}
```

### 3.2 创建调货记录
```http
POST /api/v1/bases/{baseId}/transfers
```

**请求体:**
```json
{
  "transferDate": "2024-01-15",
  "goodsId": 1,
  "sourceLocationId": 1,
  "destinationLocationId": 2,
  "handlerId": 1,
  "boxQuantity": 2,
  "packQuantity": 0,
  "pieceQuantity": 50,
  "status": "PENDING",
  "notes": "直播需要"
}
```

### 3.3 更新调货状态
```http
PATCH /api/v1/bases/{baseId}/transfers/{transferId}/status
```

**请求体:**
```json
{
  "status": "COMPLETED"
}
```

### 3.4 删除调货记录
```http
DELETE /api/v1/bases/{baseId}/transfers/{transferId}
```

---

## 4. 库存消耗管理 API

### 4.1 获取库存记录列表
```http
GET /api/v1/bases/{baseId}/inventory-ledger
```

**查询参数:**
- `current`: 页码 (默认: 1)
- `pageSize`: 每页数量 (默认: 10)
- `liveRoomId`: 直播间ID
- `anchorId`: 主播ID
- `goodsId`: 商品ID
- `startDate`: 开始日期 (YYYY-MM-DD)
- `endDate`: 结束日期 (YYYY-MM-DD)

**响应:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "date": "2024-01-15",
      "goodsName": "苹果手机壳",
      "liveRoomName": "直播间A",
      "anchorName": "主播小王",
      "openingStockBox": 10,
      "openingStockPack": 5,
      "openingStockPiece": 100,
      "arrivalBox": 2,
      "arrivalPack": 0,
      "arrivalPiece": 20,
      "transferInBox": 1,
      "transferInPack": 0,
      "transferInPiece": 10,
      "transferOutBox": 0,
      "transferOutPack": 1,
      "transferOutPiece": 5,
      "consumptionBox": 3,
      "consumptionPack": 2,
      "consumptionPiece": 45,
      "consumptionValue": 2250.00,
      "notes": "销售火爆"
    }
  ],
  "total": 100,
  "current": 1,
  "pageSize": 10
}
```

### 4.2 创建库存记录
```http
POST /api/v1/bases/{baseId}/inventory-ledger
```

**请求体:**
```json
{
  "date": "2024-01-15",
  "goodsId": 1,
  "liveRoomId": 1,
  "anchorId": 1,
  "openingStockBox": 10,
  "openingStockPack": 5,
  "openingStockPiece": 100,
  "closingStockBox": 7,
  "closingStockPack": 2,
  "closingStockPiece": 80,
  "notes": "销售火爆"
}
```

### 4.3 更新库存记录
```http
PUT /api/v1/bases/{baseId}/inventory-ledger/{ledgerId}
```

### 4.4 删除库存记录
```http
DELETE /api/v1/bases/{baseId}/inventory-ledger/{ledgerId}
```

### 4.5 获取消耗统计
```http
GET /api/v1/bases/{baseId}/inventory-ledger/consumption-stats
```

**查询参数:**
- `liveRoomId`: 直播间ID
- `anchorId`: 主播ID
- `startDate`: 开始日期 (YYYY-MM-DD)
- `endDate`: 结束日期 (YYYY-MM-DD)

**响应:**
```json
{
  "success": true,
  "data": {
    "totalConsumptionValue": 125000.00,
    "totalConsumptionQuantity": 2500,
    "averageDailyConsumption": 4166.67,
    "topConsumptionGoods": [
      {
        "goodsName": "苹果手机壳",
        "consumptionValue": 45000.00,
        "consumptionQuantity": 900
      }
    ]
  }
}
```

---

## 5. 通用响应格式

### 5.1 成功响应
```json
{
  "success": true,
  "data": {},
  "message": "操作成功"
}
```

### 5.2 错误响应
```json
{
  "success": false,
  "message": "错误描述",
  "code": "ERROR_CODE",
  "details": {}
}
```

### 5.3 分页响应
```json
{
  "success": true,
  "data": [],
  "total": 100,
  "current": 1,
  "pageSize": 10,
  "totalPages": 10
}
```

---

## 6. 状态码说明

- `200`: 成功
- `201`: 创建成功
- `400`: 请求参数错误
- `401`: 未授权
- `403`: 权限不足
- `404`: 资源不存在
- `409`: 资源冲突
- `500`: 服务器内部错误

---

## 7. 认证说明

所有API请求都需要在请求头中包含认证信息：

```http
Authorization: Bearer {token}
Content-Type: application/json
```

---

## 8. 数据验证规则

### 8.1 基础验证
- 所有必填字段不能为空
- 数量字段必须为非负数
- 日期格式必须为 YYYY-MM-DD
- 金额字段保留两位小数

### 8.2 业务验证
- 到货数量不能超过采购数量
- 调货数量不能超过库存数量
- 基地ID必须与当前用户有权限访问的基地匹配
- 删除操作需要检查关联数据的完整性

---

## 9. 错误码定义

| 错误码 | 描述 |
|--------|------|
| `VALIDATION_ERROR` | 数据验证失败 |
| `RESOURCE_NOT_FOUND` | 资源不存在 |
| `INSUFFICIENT_STOCK` | 库存不足 |
| `DUPLICATE_RECORD` | 重复记录 |
| `PERMISSION_DENIED` | 权限不足 |
| `BASE_ACCESS_DENIED` | 基地访问权限不足 |
