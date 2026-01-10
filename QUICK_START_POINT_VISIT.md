# 点位到访/回访功能 - 快速开始指南

## 功能说明

在点位详情页面新增"到访/回访情况"Tab，支持：
- ✅ 上传最多3张现场照片
- ✅ 记录拜访人员和客户信息
- ✅ 移动端自动获取地理位置（需HTTPS）
- ✅ 显示最新拜访记录
- ✅ 查看历史拜访记录
- ✅ 自动清理7天前的旧记录

## 当前状态：OSS未配置，使用本地存储

由于阿里云OSS暂未开通，系统已配置为**自动使用本地文件存储**作为备选方案：
- 图片保存在服务器本地：`./uploads/point-visits/`
- 功能完全可用，无需等待OSS配置
- 后续开通OSS后，只需配置环境变量即可自动切换

## 安装步骤（5分钟）

### 1. 安装依赖包

```bash
# 后端依赖（必需）
cd server
npm install multer@1.4.5-lts.1

# 前端无需额外依赖（已使用Ant Design）
```

**注意**：`ali-oss` 和 `node-cron` 是可选的，不安装也不影响功能使用。

### 2. 运行数据库迁移

```bash
cd server
npx prisma migrate dev
npx prisma generate
```

### 3. 配置环境变量（可选）

在 `server/.env` 中添加（如果没有配置OSS，会自动使用本地存储）：

```env
# 本地文件上传路径（默认值）
UPLOAD_PATH=./uploads/point-visits

# 服务器基础URL（用于生成图片访问链接）
BASE_URL=http://localhost:6801

# 阿里云OSS配置（可选，暂时不配置也能正常使用）
# OSS_REGION=oss-cn-hangzhou
# OSS_ACCESS_KEY_ID=your-key-id
# OSS_ACCESS_KEY_SECRET=your-key-secret
# OSS_BUCKET=your-bucket-name
```

### 4. 注册路由和静态文件服务

在 `server/src/index.ts` 中添加：

```typescript
import express from 'express';
import path from 'path';
import pointVisitRoutes from './routes/pointVisitRoutes';
import { startCleanupVisitsJob } from './jobs/cleanupVisitsJob';

// 静态文件服务（用于访问本地上传的图片）
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// 注册拜访记录路由
app.use('/api/v1', pointVisitRoutes);

// 启动定时清理任务（可选）
startCleanupVisitsJob();
```

### 5. 启动服务

```bash
# 启动后端
cd server
npm run dev

# 启动前端
cd client
npm run start:dev
```

## 使用方法

### 1. 访问点位管理页面

前端地址：`http://localhost:8075/offline-region/points`

### 2. 查看点位详情

点击任意点位的"查看"按钮，在弹出的详情抽屉中切换到**"到访/回访情况"**Tab。

### 3. 记录拜访

点击"新增拜访记录"按钮，填写表单：

- **拜访人员姓名**（自动填充）：
  - 系统自动填充当前登录用户的姓名
  - 可根据实际情况修改
  
- **客户名字/店名**（自动填充）：
  - 系统自动填充当前点位的名称
  - 可根据需要修改
  
- **现场打卡**（智能定位）：
  - 点击"点击定位"按钮
  - 浏览器会请求位置权限
  - 允许后自动获取GPS坐标
  - **系统自动将经纬度转换为详细地址**（如"上海市黄浦区南京东路100号"）
  - 地址更直观，同时保留经纬度供参考
  - 移动端效果最佳（需HTTPS）
- **拜访现场拍照记录**：
  - 点击上传区域选择图片
  - 最多上传3张
  - 每张不超过10MB
  - 支持jpg、png、gif等常见格式
- **拜访备注**（可选）：输入拜访的详细情况

### 4. 查看拜访记录

- **最新记录**：自动显示在页面顶部
- **历史记录**：下方列表显示所有历史记录
- **图片预览**：点击图片可放大查看

## 功能特性

### ✅ 已实现

1. **完整的拜访记录管理**
   - 创建拜访记录
   - 查看最新记录
   - 查看历史记录列表
   - 分页展示

2. **图片上传和展示**
   - 最多3张图片
   - 实时预览
   - 点击放大查看
   - 自动保存到本地

3. **地理位置获取**
   - HTML5 Geolocation API
   - 自动获取GPS坐标
   - 显示经纬度信息
   - 移动端完美支持

4. **自动清理机制**
   - 每天凌晨2点自动执行
   - 删除7天前的记录
   - 同时删除关联图片

5. **本地存储备选方案**
   - OSS未配置时自动使用本地存储
   - 功能完全不受影响
   - 后续可无缝切换到OSS

### 📋 待优化（可选）

1. 地图显示拜访位置
2. 拜访路线轨迹
3. 拜访统计报表
4. 导出拜访记录

## 移动端使用

### 浏览器支持

| 浏览器 | 地理定位 | 图片上传 | 说明 |
|--------|---------|---------|------|
| iOS Safari | ✅ | ✅ | 需要HTTPS |
| Android Chrome | ✅ | ✅ | 需要HTTPS |
| 微信浏览器 | ✅ | ✅ | 需要HTTPS |
| 支付宝浏览器 | ✅ | ✅ | 需要HTTPS |

### 使用建议

1. **生产环境必须使用HTTPS**：地理位置API要求HTTPS协议
2. **首次使用需授权**：浏览器会请求位置权限，需要用户允许
3. **确保GPS开启**：手机需要开启GPS定位服务
4. **网络连接稳定**：上传图片需要良好的网络环境

## 故障排查

### 问题1：图片上传失败

**可能原因**：
- 文件太大（超过10MB）
- 文件类型不支持
- 服务器磁盘空间不足

**解决方法**：
- 压缩图片后重试
- 只上传jpg、png等常见格式
- 检查服务器磁盘空间

### 问题2：无法获取位置

**可能原因**：
- 浏览器不支持Geolocation API
- 用户拒绝了位置权限
- 未使用HTTPS协议
- GPS未开启

**解决方法**：
- 使用现代浏览器（Chrome、Safari等）
- 重新授权位置权限
- 生产环境配置HTTPS
- 开启手机GPS

### 问题3：图片无法显示

**可能原因**：
- 静态文件服务未配置
- 图片路径错误
- 图片已被清理

**解决方法**：
- 检查 `app.use('/uploads', ...)` 是否已添加
- 查看浏览器控制台错误信息
- 确认图片文件是否存在

### 问题4：定时清理未执行

**可能原因**：
- `node-cron` 未安装
- 定时任务未启动
- 服务器未持续运行

**解决方法**：
- 安装 `node-cron`：`npm install node-cron`
- 确认 `startCleanupVisitsJob()` 已调用
- 保持服务器持续运行

## 后续升级到OSS

当阿里云OSS开通后，只需3步即可切换：

### 1. 安装OSS依赖

```bash
cd server
npm install ali-oss@6.18.1
```

### 2. 配置环境变量

在 `server/.env` 中添加：

```env
OSS_REGION=oss-cn-hangzhou
OSS_ACCESS_KEY_ID=your-access-key-id
OSS_ACCESS_KEY_SECRET=your-access-key-secret
OSS_BUCKET=your-bucket-name
OSS_ENDPOINT=oss-cn-hangzhou.aliyuncs.com
```

### 3. 重启服务

```bash
cd server
npm run dev
```

系统会自动检测OSS配置，如果配置完整则自动使用OSS，否则继续使用本地存储。

## 文件清单

### 后端文件

```
server/
├── prisma/
│   ├── schema.prisma                          # 数据库模型（已添加PointVisit）
│   └── migrations/
│       └── 20250110091000_add_point_visit_tracking/
│           └── migration.sql                   # 数据库迁移
├── src/
│   ├── services/
│   │   ├── ossService.ts                      # OSS/本地存储服务
│   │   └── pointVisitService.ts              # 拜访记录服务
│   ├── controllers/
│   │   └── pointVisitController.ts           # 拜访记录控制器
│   ├── routes/
│   │   └── pointVisitRoutes.ts               # 拜访记录路由
│   ├── types/
│   │   └── pointVisit.ts                     # 类型定义
│   └── jobs/
│       └── cleanupVisitsJob.ts               # 定时清理任务
└── .env.example                               # 环境变量示例
```

### 前端文件

```
client/
└── src/
    ├── services/
    │   └── pointVisit.ts                      # API服务
    └── pages/
        └── offline-region/
            └── points/
                ├── index.tsx                   # 点位列表页（已集成）
                └── components/
                    ├── VisitForm.tsx          # 拜访记录表单
                    └── VisitTab.tsx           # 拜访记录Tab
```

## 技术栈

- **后端**：Node.js + Express + Prisma + Multer
- **前端**：React + Ant Design + UmiJS
- **数据库**：PostgreSQL
- **文件存储**：本地存储（可选升级到阿里云OSS）
- **地理定位**：HTML5 Geolocation API

## 总结

✅ **功能已完全实现**，无需等待OSS配置即可使用  
✅ **前后端已完整集成**，只需安装依赖和运行迁移  
✅ **移动端完美支持**，地理定位和图片上传均可用  
✅ **自动清理机制**，7天后自动删除旧记录  
✅ **平滑升级路径**，后续可无缝切换到OSS

如有问题，请参考详细文档：
- `FEATURE_POINT_VISIT_TRACKING.md` - 完整功能设计文档
- `POINT_VISIT_SETUP.md` - 详细配置和故障排查指南
