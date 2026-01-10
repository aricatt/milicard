# 点位到访/回访情况追踪功能实施文档

## 功能概述

在点位管理的详情页面中增加"到访/回访情况"分页，支持：
- 上传最多3张图片到阿里云OSS
- 记录拜访备注信息
- 显示最近一次拜访记录
- 自动清理7天前的旧记录和图片
- 支持地理位置定位（移动端浏览器）

## 数据库设计

### PointVisit 表结构

```prisma
model PointVisit {
  id            String   @id @default(uuid())
  pointId       String   @map("point_id")
  visitDate     DateTime @map("visit_date") @db.Timestamp(6)
  visitorName   String   @map("visitor_name")              // 拜访人员姓名
  customerName  String?  @map("customer_name")             // 客户名字/店名
  latitude      Decimal? @db.Decimal(10, 7)                // 纬度
  longitude     Decimal? @db.Decimal(11, 7)                // 经度
  locationName  String?  @map("location_name")             // 地理位置名称
  images        String[] @default([])                      // 图片OSS URLs（最多3张）
  notes         String?                                    // 拜访备注
  createdBy     String   @map("created_by")
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")
}
```

### 字段说明

- **pointId**: 关联的点位ID
- **visitDate**: 拜访时间（记录创建时自动生成）
- **visitorName**: 拜访人员姓名（必填）
- **customerName**: 客户名字/店名（可选）
- **latitude/longitude**: GPS坐标（可选，移动端自动获取）
- **locationName**: 地理位置名称（可选）
- **images**: 图片URL数组，存储在阿里云OSS（最多3张）
- **notes**: 拜访备注（可选）

## 后端实现

### 1. 阿里云OSS服务 (`ossService.ts`)

**功能**:
- 文件上传到阿里云OSS
- 批量文件上传
- 文件删除
- 批量文件删除

**配置**:
```env
OSS_REGION=oss-cn-hangzhou
OSS_ACCESS_KEY_ID=your-access-key-id
OSS_ACCESS_KEY_SECRET=your-access-key-secret
OSS_BUCKET=your-bucket-name
OSS_ENDPOINT=oss-cn-hangzhou.aliyuncs.com
```

### 2. 点位拜访服务 (`pointVisitService.ts`)

**核心方法**:
- `createVisit()` - 创建拜访记录
- `getLatestVisit()` - 获取最新拜访记录
- `getVisitList()` - 分页查询拜访记录
- `updateVisit()` - 更新拜访记录
- `deleteVisit()` - 删除拜访记录（同时删除OSS图片）
- `cleanupOldVisits()` - 清理7天前的旧记录

### 3. API路由 (`pointVisitRoutes.ts`)

```
GET    /api/v1/points/:pointId/visits/latest     获取最新拜访记录
GET    /api/v1/points/:pointId/visits            分页查询拜访记录
POST   /api/v1/points/:pointId/visits            创建拜访记录（支持图片上传）
PUT    /api/v1/visits/:visitId                   更新拜访记录
DELETE /api/v1/visits/:visitId                   删除拜访记录
POST   /api/v1/admin/visits/cleanup              手动清理旧记录（管理员）
```

### 4. 定时任务 (`cleanupVisitsJob.ts`)

- 每天凌晨2点自动运行
- 清理创建时间超过7天的拜访记录
- 同时删除OSS上的关联图片

## 前端实现

### 1. 点位详情页面集成

在点位详情页面添加新的Tab：

```tsx
<Tabs>
  <TabPane tab="基本信息" key="basic" />
  <TabPane tab="商品配置" key="goods" />
  <TabPane tab="订单记录" key="orders" />
  <TabPane tab="到访/回访情况" key="visits" />  {/* 新增 */}
</Tabs>
```

### 2. 拜访记录表单组件

**字段**:
- 拜访人员姓名（必填）
- 客户名字/店名（可选）
- 现场打卡（地理位置，移动端自动获取）
- 拜访现场拍照记录（最多3张图片）
- 拜访备注（可选）

**功能**:
- 图片上传预览
- 地理位置自动获取（移动端）
- 表单验证
- 提交后显示最新记录

### 3. 地理位置获取

使用HTML5 Geolocation API:

```typescript
if (navigator.geolocation) {
  navigator.geolocation.getCurrentPosition(
    (position) => {
      const { latitude, longitude } = position.coords;
      // 使用坐标
    },
    (error) => {
      console.error('获取位置失败:', error);
    }
  );
}
```

**移动浏览器支持**:
- ✅ iOS Safari (需要HTTPS)
- ✅ Android Chrome
- ✅ Android Firefox
- ✅ 微信浏览器
- ✅ 大部分现代移动浏览器

**注意事项**:
- 必须使用HTTPS协议
- 需要用户授权位置权限
- 首次访问会弹出权限请求

### 4. 拜访记录展示

**最新记录显示**:
- 拜访时间
- 拜访人员
- 客户名称
- 地理位置
- 图片（最多3张）
- 拜访备注

**历史记录列表**:
- 分页展示
- 按时间倒序
- 支持日期筛选

## 安装依赖

### 后端依赖

```bash
cd server
npm install ali-oss multer node-cron
npm install --save-dev @types/multer @types/node-cron
```

### 前端依赖

```bash
cd client
npm install antd @ant-design/pro-components
```

## 部署步骤

### 1. 数据库迁移

```bash
cd server
npx prisma migrate dev
npx prisma generate
```

### 2. 配置环境变量

复制 `.env.example` 到 `.env` 并配置阿里云OSS:

```env
OSS_REGION=oss-cn-hangzhou
OSS_ACCESS_KEY_ID=your-access-key-id
OSS_ACCESS_KEY_SECRET=your-access-key-secret
OSS_BUCKET=your-bucket-name
OSS_ENDPOINT=oss-cn-hangzhou.aliyuncs.com
```

### 3. 注册路由

在 `server/src/index.ts` 中添加:

```typescript
import pointVisitRoutes from './routes/pointVisitRoutes';
import { startCleanupVisitsJob } from './jobs/cleanupVisitsJob';

// 注册路由
app.use('/api/v1', pointVisitRoutes);

// 启动定时任务
startCleanupVisitsJob();
```

### 4. 启动服务

```bash
# 后端
cd server
npm run dev

# 前端
cd client
npm run start:dev
```

## API使用示例

### 创建拜访记录

```bash
curl -X POST http://localhost:6801/api/v1/points/{pointId}/visits \
  -H "Authorization: Bearer {token}" \
  -F "visitorName=张三" \
  -F "customerName=ABC商店" \
  -F "latitude=31.230416" \
  -F "longitude=121.473701" \
  -F "locationName=上海市黄浦区" \
  -F "notes=客户反馈良好，需要补货" \
  -F "images=@photo1.jpg" \
  -F "images=@photo2.jpg" \
  -F "images=@photo3.jpg"
```

### 获取最新拜访记录

```bash
curl -X GET http://localhost:6801/api/v1/points/{pointId}/visits/latest \
  -H "Authorization: Bearer {token}"
```

### 分页查询拜访记录

```bash
curl -X GET "http://localhost:6801/api/v1/points/{pointId}/visits?page=1&limit=10" \
  -H "Authorization: Bearer {token}"
```

## 测试清单

### 后端测试

- [ ] OSS文件上传功能
- [ ] OSS文件删除功能
- [ ] 创建拜访记录（带图片）
- [ ] 创建拜访记录（不带图片）
- [ ] 获取最新拜访记录
- [ ] 分页查询拜访记录
- [ ] 更新拜访记录
- [ ] 删除拜访记录
- [ ] 定时清理旧记录

### 前端测试

- [ ] 拜访表单显示正常
- [ ] 图片上传预览功能
- [ ] 地理位置获取（移动端）
- [ ] 表单验证
- [ ] 提交成功后显示最新记录
- [ ] 历史记录列表展示
- [ ] 分页功能
- [ ] 日期筛选功能

### 移动端测试

- [ ] iOS Safari 地理位置获取
- [ ] Android Chrome 地理位置获取
- [ ] 微信浏览器地理位置获取
- [ ] 图片上传（相机/相册）
- [ ] 响应式布局

## 注意事项

1. **HTTPS要求**: 地理位置API在生产环境必须使用HTTPS
2. **权限授权**: 首次使用需要用户授权位置权限
3. **图片限制**: 最多3张图片，每张最大10MB
4. **自动清理**: 7天前的记录会被自动删除
5. **OSS配置**: 确保OSS Bucket配置了正确的CORS规则
6. **数据隔离**: 拜访记录按点位隔离，只能查看所属点位的记录

## 文件清单

### 后端文件

- `server/prisma/schema.prisma` - 数据库模型
- `server/prisma/migrations/20250110091000_add_point_visit_tracking/migration.sql` - 数据库迁移
- `server/src/services/ossService.ts` - OSS服务
- `server/src/services/pointVisitService.ts` - 拜访记录服务
- `server/src/controllers/pointVisitController.ts` - 控制器
- `server/src/routes/pointVisitRoutes.ts` - 路由
- `server/src/types/pointVisit.ts` - 类型定义
- `server/src/jobs/cleanupVisitsJob.ts` - 定时清理任务
- `server/.env.example` - 环境变量示例

### 前端文件（待实现）

- `client/src/pages/point-management/point-detail/VisitTab.tsx` - 拜访记录Tab
- `client/src/pages/point-management/point-detail/VisitForm.tsx` - 拜访表单
- `client/src/pages/point-management/point-detail/VisitList.tsx` - 拜访记录列表
- `client/src/services/pointVisit.ts` - API服务
- `client/src/types/pointVisit.ts` - 类型定义

## 后续优化

1. 支持视频上传
2. 地图显示拜访轨迹
3. 拜访统计报表
4. 拜访提醒功能
5. 离线拜访记录（PWA）
