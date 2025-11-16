# Milicard 后端架构设计

## 1. 架构选择

### 1.1 技术栈决策

经过对比分析，最终选择 **Express + TypeScript + Prisma + PostgreSQL** 作为后端技术栈：

**对比方案：**
- ❌ Spring Cloud Alibaba：学习曲线陡峭，AI友好度低，配置复杂
- ❌ Next.js Full-Stack：与现有 Ant Design Pro 前端重复
- ✅ **Express + TypeScript**：AI友好，简单易维护，专注API服务

### 1.2 架构模式

采用 **模块化单体架构 (Modular Monolith)**：

```
milicard-server/
├── src/
│   ├── modules/              # 业务模块
│   │   ├── inventory/        # 库存模块
│   │   ├── sales/           # 销售模块
│   │   ├── finance/         # 财务模块
│   │   └── shared/          # 共享模块
│   ├── routes/              # API路由
│   ├── middleware/          # 中间件
│   ├── utils/              # 工具函数
│   └── types/              # 类型定义
```

**选择理由：**
- 适合中小型团队（1-5人）
- 单一代码库，易于维护
- AI友好的代码结构
- 支持未来微服务拆分

### 1.3 并发能力评估

**系统规模预估：**
- 同时在线用户：< 100人
- QPS：100-1000
- 日活用户：1000-10000人

**单体架构完全满足需求：**
- Express + PostgreSQL 可支持 QPS 5000+
- 并发用户数 1000+
- 通过数据库事务和乐观锁处理并发冲突

## 2. 数据库设计

### 2.1 ORM选择

使用 **Prisma** 作为数据库ORM：

```typescript
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Goods {
  id          String   @id @default(cuid())
  name        String
  price       Decimal
  stock       Int
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  version     Int      @default(1) // 乐观锁
}
```

### 2.2 并发控制

**乐观锁实现：**
```typescript
// 库存扣减示例
async function reduceStock(goodsId: string, quantity: number) {
  return await prisma.$transaction(async (tx) => {
    const goods = await tx.goods.findUnique({ 
      where: { id: goodsId } 
    })
    
    if (goods.stock < quantity) {
      throw new Error('库存不足')
    }
    
    return await tx.goods.update({
      where: { 
        id: goodsId,
        version: goods.version 
      },
      data: { 
        stock: goods.stock - quantity,
        version: goods.version + 1
      }
    })
  })
}
```

## 3. API设计规范

### 3.1 RESTful API

```typescript
// 标准API响应格式
interface APIResponse<T> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: any
  }
  meta?: {
    pagination?: {
      page: number
      limit: number
      total: number
    }
  }
}
```

### 3.2 路由结构

```
/api/v1/
├── /auth          # 认证相关
├── /inventory/    # 库存模块
│   ├── /goods     # 商品管理
│   ├── /purchase  # 采购管理
│   └── /transfer  # 调货管理
├── /sales/        # 销售模块
└── /finance/      # 财务模块
```

## 4. 安全设计

### 4.1 认证授权

```typescript
// JWT认证中间件
export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1]
  
  if (!token) {
    return res.status(401).json({ 
      success: false, 
      error: { message: '未提供认证令牌' } 
    })
  }
  
  jwt.verify(token, process.env.JWT_SECRET!, (err, user) => {
    if (err) {
      return res.status(403).json({ 
        success: false, 
        error: { message: '令牌无效' } 
      })
    }
    req.user = user
    next()
  })
}
```

### 4.2 字段级权限控制

```typescript
// 基于角色的字段过滤
export const filterFieldsByRole = (data: any, userRole: string) => {
  const rolePermissions = {
    'finance': ['price', 'cost', 'profit'], // 财务可见价格
    'warehouse': ['stock', 'location'],     // 仓管可见库存
    'anchor': ['name', 'description']       // 主播只能看基本信息
  }
  
  const allowedFields = rolePermissions[userRole] || []
  return filterObject(data, allowedFields)
}
```

## 5. 性能优化

### 5.1 数据库优化

```sql
-- 关键索引
CREATE INDEX idx_goods_name ON goods(name);
CREATE INDEX idx_purchase_date ON purchase_orders(created_at);
CREATE INDEX idx_user_role ON users(role);
```

### 5.2 缓存策略

```typescript
// Redis缓存热点数据
import Redis from 'ioredis'

const redis = new Redis(process.env.REDIS_URL)

export const cacheMiddleware = (ttl: number = 300) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const key = `cache:${req.method}:${req.path}:${JSON.stringify(req.query)}`
    
    const cached = await redis.get(key)
    if (cached) {
      return res.json(JSON.parse(cached))
    }
    
    // 缓存响应
    const originalSend = res.json
    res.json = function(data) {
      redis.setex(key, ttl, JSON.stringify(data))
      return originalSend.call(this, data)
    }
    
    next()
  }
}
```

## 6. 部署架构

### 6.1 容器化部署

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3001
CMD ["npm", "start"]
```

### 6.2 Docker Compose

```yaml
# docker-compose.yml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3001:3001"
    environment:
      - DATABASE_URL=postgresql://user:pass@db:5432/milicard
      - JWT_SECRET=your-secret-key
    depends_on:
      - db
      - redis

  db:
    image: postgres:15
    environment:
      - POSTGRES_DB=milicard
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    
volumes:
  postgres_data:
```

## 7. 扩展规划

### 7.1 微服务迁移路径

当业务增长需要时，可按以下顺序拆分：

1. **数据库拆分** - 按模块拆分数据库
2. **服务拆分** - 将核心模块独立为微服务
3. **API网关** - 统一入口管理

### 7.2 性能扩展

- **水平扩展**：负载均衡 + 多实例
- **读写分离**：主从数据库
- **分库分表**：按业务维度分片

---

**文档版本：** v1.0  
**创建时间：** 2025-11-16  
**最后更新：** 2025-11-16
