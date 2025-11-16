# Milicard 数据库表结构设计

## 📋 设计原则

1. **字段精度**：价格使用 Decimal(12,2)，库存使用整数
2. **单位管理**：枚举方式，支持箱/盒/包换算
3. **权限模型**：多对多用户角色关系，支持时效
4. **业务流程**：无状态流转，专注数据录入和统计
5. **库存维度**：商品+地点二维库存

## 🗄️ 核心表结构

### 1. 用户权限模块

#### 1.1 用户表 (users)
```sql
CREATE TABLE users (
  id                VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  username          VARCHAR(50) UNIQUE NOT NULL,
  email             VARCHAR(100) UNIQUE,
  password_hash     VARCHAR(255) NOT NULL,
  name              VARCHAR(100) NOT NULL,
  phone             VARCHAR(20),
  is_active         BOOLEAN DEFAULT true,
  last_login_at     TIMESTAMP,
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_username (username),
  INDEX idx_email (email),
  INDEX idx_is_active (is_active)
);
```

#### 1.2 角色表 (roles)
```sql
CREATE TABLE roles (
  id                VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  name              VARCHAR(50) UNIQUE NOT NULL,
  description       TEXT,
  permissions       JSON NOT NULL, -- 权限代码数组
  is_system         BOOLEAN DEFAULT false, -- 是否系统预设角色
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_name (name),
  INDEX idx_is_system (is_system)
);
```

#### 1.3 用户角色关联表 (user_roles)
```sql
CREATE TABLE user_roles (
  id                VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id           VARCHAR(36) NOT NULL,
  role_id           VARCHAR(36) NOT NULL,
  assigned_by       VARCHAR(36) NOT NULL, -- 分配人
  assigned_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at        TIMESTAMP NULL, -- 过期时间，NULL表示永久
  is_active         BOOLEAN DEFAULT true,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_by) REFERENCES users(id),
  
  UNIQUE KEY uk_user_role_active (user_id, role_id, is_active),
  INDEX idx_user_id (user_id),
  INDEX idx_role_id (role_id),
  INDEX idx_expires_at (expires_at),
  INDEX idx_is_active (is_active)
);
```

### 2. 基础数据模块

#### 2.1 直播间/仓库表 (locations)
```sql
CREATE TABLE locations (
  id                VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  name              VARCHAR(100) NOT NULL,
  type              ENUM('warehouse', 'live_room') NOT NULL,
  description       TEXT,
  address           VARCHAR(255),
  contact_person    VARCHAR(50),
  contact_phone     VARCHAR(20),
  is_active         BOOLEAN DEFAULT true,
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_name (name),
  INDEX idx_type (type),
  INDEX idx_is_active (is_active)
);
```

#### 2.2 用户地点关联表 (user_locations)
```sql
CREATE TABLE user_locations (
  id                VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id           VARCHAR(36) NOT NULL,
  location_id       VARCHAR(36) NOT NULL,
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE,
  
  UNIQUE KEY uk_user_location (user_id, location_id),
  INDEX idx_user_id (user_id),
  INDEX idx_location_id (location_id)
);
```

#### 2.3 客户表 (customers)
```sql
CREATE TABLE customers (
  id                VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  name              VARCHAR(100) NOT NULL,
  contact_person    VARCHAR(50),
  phone             VARCHAR(20),
  email             VARCHAR(100),
  address           VARCHAR(255),
  notes             TEXT,
  is_active         BOOLEAN DEFAULT true,
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_name (name),
  INDEX idx_phone (phone),
  INDEX idx_is_active (is_active)
);
```

#### 2.4 商品表 (goods)
```sql
CREATE TABLE goods (
  id                VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  code              VARCHAR(50) UNIQUE NOT NULL, -- 系统自动生成
  name              VARCHAR(200) NOT NULL,
  description       TEXT,
  
  -- 价格信息 (Decimal 12,2)
  retail_price      DECIMAL(12,2) NOT NULL DEFAULT 0, -- 零售价
  purchase_price    DECIMAL(12,2) NOT NULL DEFAULT 0, -- 采购价
  
  -- 单位换算信息
  box_quantity      INT DEFAULT 1, -- 箱数量（固定为1）
  pack_per_box      INT NOT NULL DEFAULT 1, -- 一箱包含多少盒
  piece_per_pack    INT NOT NULL DEFAULT 1, -- 一盒包含多少包
  
  -- 基本信息
  image_url         VARCHAR(500),
  notes             TEXT,
  is_active         BOOLEAN DEFAULT true,
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_code (code),
  INDEX idx_name (name),
  INDEX idx_is_active (is_active)
);
```

### 3. 库存管理模块

#### 3.1 库存表 (inventory)
```sql
CREATE TABLE inventory (
  id                VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  goods_id          VARCHAR(36) NOT NULL,
  location_id       VARCHAR(36) NOT NULL,
  
  -- 库存数量（按最小单位包计算）
  stock_quantity    INT NOT NULL DEFAULT 0,
  
  -- 成本信息
  average_cost      DECIMAL(12,2) DEFAULT 0, -- 加权平均成本
  
  updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (goods_id) REFERENCES goods(id) ON DELETE CASCADE,
  FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE,
  
  UNIQUE KEY uk_goods_location (goods_id, location_id),
  INDEX idx_goods_id (goods_id),
  INDEX idx_location_id (location_id)
);
```

#### 3.2 采购单表 (purchase_orders)
```sql
CREATE TABLE purchase_orders (
  id                VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  order_no          VARCHAR(50) UNIQUE NOT NULL, -- 采购单号
  supplier_name     VARCHAR(100) NOT NULL, -- 供应商名称
  target_location_id VARCHAR(36) NOT NULL, -- 目标仓库
  
  -- 日期信息
  purchase_date     DATE NOT NULL, -- 采购日期
  
  -- 金额信息
  total_amount      DECIMAL(12,2) NOT NULL DEFAULT 0,
  
  -- 基本信息
  notes             TEXT,
  created_by        VARCHAR(36) NOT NULL,
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (target_location_id) REFERENCES locations(id),
  FOREIGN KEY (created_by) REFERENCES users(id),
  
  INDEX idx_order_no (order_no),
  INDEX idx_supplier_name (supplier_name),
  INDEX idx_target_location_id (target_location_id),
  INDEX idx_purchase_date (purchase_date),
  INDEX idx_created_by (created_by)
);
```

#### 3.3 采购单明细表 (purchase_order_items)
```sql
CREATE TABLE purchase_order_items (
  id                VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  purchase_order_id VARCHAR(36) NOT NULL,
  goods_id          VARCHAR(36) NOT NULL,
  
  -- 数量信息（按截图显示需要记录箱盒包）
  box_quantity      INT NOT NULL DEFAULT 0, -- 箱数
  pack_quantity     INT NOT NULL DEFAULT 0, -- 盒数  
  piece_quantity    INT NOT NULL DEFAULT 0, -- 包数
  total_pieces      INT NOT NULL, -- 总包数（系统计算）
  
  -- 价格信息
  unit_price        DECIMAL(12,2) NOT NULL, -- 单价（每包）
  total_price       DECIMAL(12,2) NOT NULL, -- 小计
  
  notes             TEXT,
  
  FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
  FOREIGN KEY (goods_id) REFERENCES goods(id),
  
  INDEX idx_purchase_order_id (purchase_order_id),
  INDEX idx_goods_id (goods_id)
);
```

#### 3.4 到货单表 (arrival_orders)
```sql
CREATE TABLE arrival_orders (
  id                VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  arrival_no        VARCHAR(50) UNIQUE NOT NULL, -- 到货单号
  purchase_order_id VARCHAR(36) NOT NULL, -- 关联采购单
  location_id       VARCHAR(36) NOT NULL, -- 到货地点
  
  arrival_date      DATE NOT NULL, -- 到货日期
  notes             TEXT,
  created_by        VARCHAR(36) NOT NULL,
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id),
  FOREIGN KEY (location_id) REFERENCES locations(id),
  FOREIGN KEY (created_by) REFERENCES users(id),
  
  INDEX idx_arrival_no (arrival_no),
  INDEX idx_purchase_order_id (purchase_order_id),
  INDEX idx_location_id (location_id),
  INDEX idx_arrival_date (arrival_date)
);
```

#### 3.5 到货单明细表 (arrival_order_items)
```sql
CREATE TABLE arrival_order_items (
  id                VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  arrival_order_id  VARCHAR(36) NOT NULL,
  goods_id          VARCHAR(36) NOT NULL,
  
  -- 到货数量（按包计算）
  quantity          INT NOT NULL,
  unit_cost         DECIMAL(12,2) NOT NULL, -- 单位成本
  
  notes             TEXT,
  
  FOREIGN KEY (arrival_order_id) REFERENCES arrival_orders(id) ON DELETE CASCADE,
  FOREIGN KEY (goods_id) REFERENCES goods(id),
  
  INDEX idx_arrival_order_id (arrival_order_id),
  INDEX idx_goods_id (goods_id)
);
```

#### 3.6 调货单表 (transfer_orders)
```sql
CREATE TABLE transfer_orders (
  id                VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  transfer_no       VARCHAR(50) UNIQUE NOT NULL, -- 调货单号
  from_location_id  VARCHAR(36) NOT NULL, -- 调出地点
  to_location_id    VARCHAR(36) NOT NULL, -- 调入地点
  
  transfer_date     DATE NOT NULL, -- 调货日期
  notes             TEXT,
  created_by        VARCHAR(36) NOT NULL,
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (from_location_id) REFERENCES locations(id),
  FOREIGN KEY (to_location_id) REFERENCES locations(id),
  FOREIGN KEY (created_by) REFERENCES users(id),
  
  INDEX idx_transfer_no (transfer_no),
  INDEX idx_from_location_id (from_location_id),
  INDEX idx_to_location_id (to_location_id),
  INDEX idx_transfer_date (transfer_date)
);
```

#### 3.7 调货单明细表 (transfer_order_items)
```sql
CREATE TABLE transfer_order_items (
  id                VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  transfer_order_id VARCHAR(36) NOT NULL,
  goods_id          VARCHAR(36) NOT NULL,
  
  -- 调货数量（按包计算）
  quantity          INT NOT NULL,
  
  notes             TEXT,
  
  FOREIGN KEY (transfer_order_id) REFERENCES transfer_orders(id) ON DELETE CASCADE,
  FOREIGN KEY (goods_id) REFERENCES goods(id),
  
  INDEX idx_transfer_order_id (transfer_order_id),
  INDEX idx_goods_id (goods_id)
);
```

#### 3.8 库存消耗表 (stock_consumption)
```sql
CREATE TABLE stock_consumption (
  id                VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  location_id       VARCHAR(36) NOT NULL, -- 直播间
  goods_id          VARCHAR(36) NOT NULL,
  consumption_date  DATE NOT NULL, -- 消耗日期
  
  -- 期初库存（按包计算，前端显示时转换为箱盒包）
  opening_stock     INT NOT NULL DEFAULT 0, -- 期初库存总包数
  
  -- 期末库存（按包计算，前端显示时转换为箱盒包）  
  closing_stock     INT NOT NULL DEFAULT 0, -- 期末库存总包数
  
  -- 流转数量（系统自动计算，按包）
  arrival_quantity  INT DEFAULT 0, -- 到货数量
  transfer_in       INT DEFAULT 0, -- 调入数量
  transfer_out      INT DEFAULT 0, -- 调出数量
  stock_out         INT DEFAULT 0, -- 出库数量
  
  -- 消耗计算（按截图需要显示消耗单价）
  consumption       INT DEFAULT 0, -- 消耗数量（包）
  consumption_unit_price DECIMAL(12,2) DEFAULT 0, -- 消耗单价（每包）
  consumption_value DECIMAL(12,2) DEFAULT 0, -- 消耗金额
  
  notes             TEXT,
  created_by        VARCHAR(36) NOT NULL,
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (location_id) REFERENCES locations(id),
  FOREIGN KEY (goods_id) REFERENCES goods(id),
  FOREIGN KEY (created_by) REFERENCES users(id),
  
  UNIQUE KEY uk_location_goods_date (location_id, goods_id, consumption_date),
  INDEX idx_location_id (location_id),
  INDEX idx_goods_id (goods_id),
  INDEX idx_consumption_date (consumption_date)
);
```

### 4. 销售管理模块

#### 4.1 分销单表 (distribution_orders)
```sql
CREATE TABLE distribution_orders (
  id                VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  order_no          VARCHAR(50) UNIQUE NOT NULL, -- 分销单号
  customer_id       VARCHAR(36) NOT NULL, -- 客户
  
  -- 金额信息
  total_amount      DECIMAL(12,2) NOT NULL DEFAULT 0,
  discount_percent  DECIMAL(5,2) DEFAULT 0, -- 折扣百分比
  final_amount      DECIMAL(12,2) NOT NULL DEFAULT 0, -- 最终金额
  
  -- 基本信息
  order_date        DATE NOT NULL,
  notes             TEXT,
  created_by        VARCHAR(36) NOT NULL,
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (customer_id) REFERENCES customers(id),
  FOREIGN KEY (created_by) REFERENCES users(id),
  
  INDEX idx_order_no (order_no),
  INDEX idx_customer_id (customer_id),
  INDEX idx_order_date (order_date),
  INDEX idx_created_by (created_by)
);
```

#### 4.2 分销单明细表 (distribution_order_items)
```sql
CREATE TABLE distribution_order_items (
  id                VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  distribution_order_id VARCHAR(36) NOT NULL,
  goods_id          VARCHAR(36) NOT NULL,
  
  -- 数量和价格（按包计算）
  quantity          INT NOT NULL,
  unit_price        DECIMAL(12,2) NOT NULL, -- 零售单价
  discount_percent  DECIMAL(5,2) DEFAULT 0, -- 折扣
  final_unit_price  DECIMAL(12,2) NOT NULL, -- 结算单价
  total_price       DECIMAL(12,2) NOT NULL, -- 小计
  
  -- 出库状态
  pending_quantity  INT NOT NULL, -- 待出库数量（系统计算）
  
  notes             TEXT,
  
  FOREIGN KEY (distribution_order_id) REFERENCES distribution_orders(id) ON DELETE CASCADE,
  FOREIGN KEY (goods_id) REFERENCES goods(id),
  
  INDEX idx_distribution_order_id (distribution_order_id),
  INDEX idx_goods_id (goods_id)
);
```

#### 4.3 出库单表 (stock_out_orders)
```sql
CREATE TABLE stock_out_orders (
  id                VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  out_no            VARCHAR(50) UNIQUE NOT NULL, -- 出库单号
  distribution_order_id VARCHAR(36) NOT NULL, -- 关联分销单
  location_id       VARCHAR(36) NOT NULL, -- 出库仓库
  
  out_date          DATE NOT NULL, -- 出库日期
  notes             TEXT,
  created_by        VARCHAR(36) NOT NULL,
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (distribution_order_id) REFERENCES distribution_orders(id),
  FOREIGN KEY (location_id) REFERENCES locations(id),
  FOREIGN KEY (created_by) REFERENCES users(id),
  
  INDEX idx_out_no (out_no),
  INDEX idx_distribution_order_id (distribution_order_id),
  INDEX idx_location_id (location_id),
  INDEX idx_out_date (out_date)
);
```

#### 4.4 出库单明细表 (stock_out_order_items)
```sql
CREATE TABLE stock_out_order_items (
  id                VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  stock_out_order_id VARCHAR(36) NOT NULL,
  goods_id          VARCHAR(36) NOT NULL,
  
  -- 出库数量（按包计算）
  quantity          INT NOT NULL,
  
  -- 快照数据（出库前的待出库数量）
  pending_before    INT NOT NULL, -- 出库前待出库数量
  
  notes             TEXT,
  
  FOREIGN KEY (stock_out_order_id) REFERENCES stock_out_orders(id) ON DELETE CASCADE,
  FOREIGN KEY (goods_id) REFERENCES goods(id),
  
  INDEX idx_stock_out_order_id (stock_out_order_id),
  INDEX idx_goods_id (goods_id)
);
```

### 5. 财务管理模块

#### 5.1 主播利润表 (anchor_profits)
```sql
CREATE TABLE anchor_profits (
  id                VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  location_id       VARCHAR(36) NOT NULL, -- 直播间
  profit_date       DATE NOT NULL, -- 利润日期
  
  -- 收入数据（手动录入）
  gmv_amount        DECIMAL(12,2) DEFAULT 0, -- GMV金额
  refund_amount     DECIMAL(12,2) DEFAULT 0, -- 退款金额
  offline_amount    DECIMAL(12,2) DEFAULT 0, -- 走水金额
  
  -- 成本数据
  consumption_value DECIMAL(12,2) DEFAULT 0, -- 实际消耗货值（系统计算）
  ad_cost           DECIMAL(12,2) DEFAULT 0, -- 投流费用（手动录入）
  platform_fee_rate DECIMAL(5,2) DEFAULT 0, -- 平台扣点比例
  platform_fee      DECIMAL(12,2) DEFAULT 0, -- 平台扣点（系统计算）
  
  -- 计算结果
  daily_sales       DECIMAL(12,2) DEFAULT 0, -- 当日销售额
  profit_amount     DECIMAL(12,2) DEFAULT 0, -- 利润金额
  profit_rate       DECIMAL(5,2) DEFAULT 0,  -- 毛利率
  
  notes             TEXT,
  created_by        VARCHAR(36) NOT NULL,
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (location_id) REFERENCES locations(id),
  FOREIGN KEY (created_by) REFERENCES users(id),
  
  UNIQUE KEY uk_location_date (location_id, profit_date),
  INDEX idx_location_id (location_id),
  INDEX idx_profit_date (profit_date)
);
```

#### 5.2 应收账款表 (receivables)
```sql
CREATE TABLE receivables (
  id                VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  distribution_order_id VARCHAR(36) NOT NULL, -- 关联分销单
  customer_id       VARCHAR(36) NOT NULL, -- 客户
  
  -- 金额信息
  total_amount      DECIMAL(12,2) NOT NULL, -- 应收总金额
  received_amount   DECIMAL(12,2) DEFAULT 0, -- 已收金额
  pending_amount    DECIMAL(12,2) NOT NULL, -- 未收金额（计算字段）
  
  -- 基本信息
  due_date          DATE, -- 应收日期
  notes             TEXT,
  created_by        VARCHAR(36) NOT NULL,
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (distribution_order_id) REFERENCES distribution_orders(id),
  FOREIGN KEY (customer_id) REFERENCES customers(id),
  FOREIGN KEY (created_by) REFERENCES users(id),
  
  INDEX idx_distribution_order_id (distribution_order_id),
  INDEX idx_customer_id (customer_id),
  INDEX idx_due_date (due_date)
);
```

#### 5.3 应收收款记录表 (receivable_payments)
```sql
CREATE TABLE receivable_payments (
  id                VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  receivable_id     VARCHAR(36) NOT NULL,
  
  -- 收款信息
  payment_amount    DECIMAL(12,2) NOT NULL, -- 收款金额
  payment_date      DATE NOT NULL, -- 收款日期
  payment_method    VARCHAR(50), -- 收款方式
  
  notes             TEXT,
  created_by        VARCHAR(36) NOT NULL,
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (receivable_id) REFERENCES receivables(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id),
  
  INDEX idx_receivable_id (receivable_id),
  INDEX idx_payment_date (payment_date)
);
```

#### 5.4 应付账款表 (payables)
```sql
CREATE TABLE payables (
  id                VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  purchase_order_id VARCHAR(36) NOT NULL, -- 关联采购单
  supplier_name     VARCHAR(100) NOT NULL, -- 供应商
  
  -- 金额信息
  total_amount      DECIMAL(12,2) NOT NULL, -- 应付总金额
  paid_amount       DECIMAL(12,2) DEFAULT 0, -- 已付金额
  pending_amount    DECIMAL(12,2) NOT NULL, -- 未付金额（计算字段）
  
  -- 基本信息
  due_date          DATE, -- 应付日期
  notes             TEXT,
  created_by        VARCHAR(36) NOT NULL,
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id),
  FOREIGN KEY (created_by) REFERENCES users(id),
  
  INDEX idx_purchase_order_id (purchase_order_id),
  INDEX idx_supplier_name (supplier_name),
  INDEX idx_due_date (due_date)
);
```

#### 5.5 应付付款记录表 (payable_payments)
```sql
CREATE TABLE payable_payments (
  id                VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  payable_id        VARCHAR(36) NOT NULL,
  
  -- 付款信息
  payment_amount    DECIMAL(12,2) NOT NULL, -- 付款金额
  payment_date      DATE NOT NULL, -- 付款日期
  payment_method    VARCHAR(50), -- 付款方式
  
  notes             TEXT,
  created_by        VARCHAR(36) NOT NULL,
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (payable_id) REFERENCES payables(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id),
  
  INDEX idx_payable_id (payable_id),
  INDEX idx_payment_date (payment_date)
);
```

## 🔧 Prisma Schema 示例

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

model User {
  id            String   @id @default(uuid())
  username      String   @unique
  email         String?  @unique
  passwordHash  String   @map("password_hash")
  name          String
  phone         String?
  isActive      Boolean  @default(true) @map("is_active")
  lastLoginAt   DateTime? @map("last_login_at")
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  // 关联关系
  userRoles     UserRole[]
  userLocations UserLocation[]
  
  @@map("users")
  @@index([username])
  @@index([email])
}

model Role {
  id          String   @id @default(uuid())
  name        String   @unique
  description String?
  permissions Json     // 权限代码数组
  isSystem    Boolean  @default(false) @map("is_system")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  // 关联关系
  userRoles   UserRole[]
  
  @@map("roles")
}

model UserRole {
  id         String    @id @default(uuid())
  userId     String    @map("user_id")
  roleId     String    @map("role_id")
  assignedBy String    @map("assigned_by")
  assignedAt DateTime  @default(now()) @map("assigned_at")
  expiresAt  DateTime? @map("expires_at")
  isActive   Boolean   @default(true) @map("is_active")

  // 关联关系
  user       User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  role       Role      @relation(fields: [roleId], references: [id], onDelete: Cascade)
  
  @@map("user_roles")
  @@unique([userId, roleId, isActive], name: "uk_user_role_active")
}

model Goods {
  id            String  @id @default(uuid())
  code          String  @unique
  name          String
  description   String?
  retailPrice   Decimal @default(0) @map("retail_price") @db.Decimal(12, 2)
  purchasePrice Decimal @default(0) @map("purchase_price") @db.Decimal(12, 2)
  boxQuantity   Int     @default(1) @map("box_quantity")
  packPerBox    Int     @default(1) @map("pack_per_box")
  piecePerPack  Int     @default(1) @map("piece_per_pack")
  imageUrl      String? @map("image_url")
  notes         String?
  isActive      Boolean @default(true) @map("is_active")
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  // 关联关系
  inventory     Inventory[]
  
  @@map("goods")
  @@index([code])
  @@index([name])
}

// ... 其他模型定义
```

## 📝 使用说明

1. **单位换算逻辑**：所有库存数量统一按"包"为最小单位存储
2. **价格精度**：使用 Decimal(12,2) 支持千万级金额，保留2位小数
3. **权限集成**：预留 Casbin 权限检查的用户角色数据
4. **数据一致性**：通过外键约束保证数据完整性
5. **索引优化**：为常用查询字段添加索引提升性能

## 🔄 前端显示转换逻辑

### **箱盒包显示转换**
数据库存储总包数，前端显示时需要转换：

```typescript
// 将总包数转换为箱盒包显示
function convertToBoxPackPiece(totalPieces: number, goods: Goods) {
  const { packPerBox, piecePerPack } = goods
  
  const boxes = Math.floor(totalPieces / (packPerBox * piecePerPack))
  const remainingAfterBoxes = totalPieces % (packPerBox * piecePerPack)
  
  const packs = Math.floor(remainingAfterBoxes / piecePerPack)
  const pieces = remainingAfterBoxes % piecePerPack
  
  return { boxes, packs, pieces }
}

// 将箱盒包转换为总包数存储
function convertToTotalPieces(boxes: number, packs: number, pieces: number, goods: Goods) {
  const { packPerBox, piecePerPack } = goods
  return boxes * packPerBox * piecePerPack + packs * piecePerPack + pieces
}
```

### **采购单数量处理**
采购单明细表同时存储箱盒包和总包数：
- `box_quantity`, `pack_quantity`, `piece_quantity`：用户输入的箱盒包数量
- `total_pieces`：系统计算的总包数，用于库存计算

### **库存消耗显示**
库存消耗表的期初期末库存按包存储，前端显示时转换为"X箱Y盒Z包"格式

---

**文档版本：** v1.0  
**创建时间：** 2025-11-16  
**最后更新：** 2025-11-16
