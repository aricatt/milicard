# 点位到访/回访功能 - 安装和配置指南

## 快速开始

### 1. 安装后端依赖

```bash
cd server
npm install ali-oss@6.18.1 multer@1.4.5-lts.1 node-cron@3.0.3
npm install --save-dev @types/multer @types/node-cron
```

### 2. 运行数据库迁移

```bash
cd server
npx prisma migrate dev
npx prisma generate
```

### 3. 配置阿里云OSS

在 `server/.env` 文件中添加以下配置：

```env
# 阿里云OSS配置（点位拜访图片上传）
OSS_REGION=oss-cn-hangzhou
OSS_ACCESS_KEY_ID=your-oss-access-key-id
OSS_ACCESS_KEY_SECRET=your-oss-access-key-secret
OSS_BUCKET=your-bucket-name
OSS_ENDPOINT=oss-cn-hangzhou.aliyuncs.com
```

### 4. 注册路由和启动定时任务

在 `server/src/index.ts` 中添加：

```typescript
// 导入路由和定时任务
import pointVisitRoutes from './routes/pointVisitRoutes';
import { startCleanupVisitsJob } from './jobs/cleanupVisitsJob';

// 注册路由（在其他路由之后）
app.use('/api/v1', pointVisitRoutes);

// 启动定时任务（在服务器启动后）
startCleanupVisitsJob();
```

### 5. 启动服务器

```bash
cd server
npm run dev
```

## 阿里云OSS配置步骤

### 1. 创建OSS Bucket

1. 登录阿里云控制台
2. 进入对象存储OSS服务
3. 创建新的Bucket
   - 名称：例如 `milicard-uploads`
   - 区域：选择就近区域（如 `华东1（杭州）`）
   - 读写权限：**私有**（推荐）或公共读
   - 存储类型：标准存储

### 2. 配置CORS规则

在Bucket设置中添加CORS规则：

```xml
<CORSRule>
  <AllowedOrigin>http://localhost:8075</AllowedOrigin>
  <AllowedOrigin>https://your-production-domain.com</AllowedOrigin>
  <AllowedMethod>GET</AllowedMethod>
  <AllowedMethod>POST</AllowedMethod>
  <AllowedMethod>PUT</AllowedMethod>
  <AllowedMethod>DELETE</AllowedMethod>
  <AllowedHeader>*</AllowedHeader>
  <ExposeHeader>ETag</ExposeHeader>
  <MaxAgeSeconds>3600</MaxAgeSeconds>
</CORSRule>
```

### 3. 创建RAM用户（推荐）

为了安全，建议创建专门的RAM用户：

1. 进入访问控制（RAM）
2. 创建新用户
3. 勾选"编程访问"
4. 保存AccessKey ID和AccessKey Secret
5. 为用户添加权限：`AliyunOSSFullAccess` 或自定义策略

**自定义策略示例**（最小权限）：

```json
{
  "Version": "1",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "oss:PutObject",
        "oss:GetObject",
        "oss:DeleteObject"
      ],
      "Resource": [
        "acs:oss:*:*:your-bucket-name/*"
      ]
    }
  ]
}
```

## API测试

### 测试OSS配置

```bash
# 创建测试拜访记录（带图片）
curl -X POST http://localhost:6801/api/v1/points/{pointId}/visits \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "visitorName=测试人员" \
  -F "customerName=测试客户" \
  -F "notes=测试备注" \
  -F "images=@test-image.jpg"
```

### 获取最新拜访记录

```bash
curl -X GET http://localhost:6801/api/v1/points/{pointId}/visits/latest \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 手动触发清理任务

```bash
curl -X POST http://localhost:6801/api/v1/admin/visits/cleanup \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 移动端地理位置支持

### 浏览器兼容性

| 浏览器 | 支持情况 | 注意事项 |
|--------|---------|---------|
| iOS Safari | ✅ 支持 | 需要HTTPS |
| Android Chrome | ✅ 支持 | 需要HTTPS |
| Android Firefox | ✅ 支持 | 需要HTTPS |
| 微信浏览器 | ✅ 支持 | 需要HTTPS |
| 支付宝浏览器 | ✅ 支持 | 需要HTTPS |

### 前端实现示例

```typescript
// 获取地理位置
const getLocation = (): Promise<{ latitude: number; longitude: number }> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('浏览器不支持地理位置'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => {
        let message = '获取位置失败';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            message = '用户拒绝了位置权限';
            break;
          case error.POSITION_UNAVAILABLE:
            message = '位置信息不可用';
            break;
          case error.TIMEOUT:
            message = '获取位置超时';
            break;
        }
        reject(new Error(message));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  });
};
```

## 定时清理任务

### 配置说明

- **执行时间**: 每天凌晨2:00
- **清理规则**: 删除创建时间超过7天的拜访记录
- **清理内容**: 数据库记录 + OSS图片文件

### 修改清理时间

编辑 `server/src/jobs/cleanupVisitsJob.ts`:

```typescript
// 修改cron表达式
// 格式: 秒 分 时 日 月 周
cron.schedule('0 2 * * *', async () => {
  // 每天凌晨2:00执行
});

// 其他示例：
// '0 0 * * *'  - 每天凌晨0:00
// '0 */6 * * *' - 每6小时执行一次
// '0 0 * * 0'  - 每周日凌晨0:00
```

### 修改保留天数

编辑 `server/src/services/pointVisitService.ts`:

```typescript
// 在 cleanupOldVisits() 方法中修改
const sevenDaysAgo = new Date();
sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7); // 修改这里的天数
```

## 故障排查

### 1. OSS上传失败

**问题**: 图片上传返回错误

**检查项**:
- [ ] OSS配置是否正确（Region、AccessKey、Bucket）
- [ ] RAM用户权限是否足够
- [ ] Bucket是否存在
- [ ] CORS规则是否配置
- [ ] 网络连接是否正常

**查看日志**:
```bash
# 查看服务器日志
tail -f server/logs/app.log
```

### 2. 地理位置获取失败

**问题**: 移动端无法获取位置

**检查项**:
- [ ] 是否使用HTTPS协议
- [ ] 用户是否授权位置权限
- [ ] 浏览器是否支持Geolocation API
- [ ] GPS是否开启

### 3. 图片无法显示

**问题**: 上传成功但图片无法显示

**检查项**:
- [ ] Bucket读写权限设置
- [ ] 图片URL是否正确
- [ ] CORS规则是否配置
- [ ] 图片是否已被清理

### 4. 定时任务未执行

**问题**: 旧记录没有被清理

**检查项**:
- [ ] 服务器是否持续运行
- [ ] 定时任务是否已启动
- [ ] 查看日志确认执行情况

**手动执行清理**:
```bash
curl -X POST http://localhost:6801/api/v1/admin/visits/cleanup \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 性能优化建议

### 1. 图片压缩

前端上传前压缩图片：

```typescript
import imageCompression from 'browser-image-compression';

const compressImage = async (file: File) => {
  const options = {
    maxSizeMB: 1,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
  };
  return await imageCompression(file, options);
};
```

### 2. CDN加速

为OSS Bucket配置CDN加速域名，提升图片加载速度。

### 3. 图片懒加载

在列表页面使用图片懒加载：

```tsx
<Image
  src={imageUrl}
  lazy
  placeholder={<Spin />}
/>
```

## 安全建议

1. **使用RAM用户**: 不要使用主账号AccessKey
2. **最小权限原则**: 只授予必要的OSS权限
3. **定期轮换密钥**: 定期更换AccessKey
4. **HTTPS传输**: 生产环境必须使用HTTPS
5. **文件类型验证**: 后端验证上传文件类型
6. **文件大小限制**: 限制单个文件最大10MB
7. **防盗链**: 配置OSS Referer白名单

## 监控和日志

### 查看OSS使用情况

1. 登录阿里云控制台
2. 进入OSS服务
3. 查看Bucket统计信息
   - 存储量
   - 请求次数
   - 流量使用

### 应用日志

```bash
# 查看拜访记录相关日志
cd server
grep "PointVisit" logs/app.log

# 查看清理任务日志
grep "CleanupVisitsJob" logs/app.log
```

## 下一步：前端实现

后端API已完成，接下来需要实现前端页面：

1. 创建拜访记录表单组件
2. 实现图片上传和预览
3. 集成地理位置获取
4. 在点位详情页面添加"到访/回访情况"Tab
5. 实现拜访记录列表展示

详细前端实现请参考 `FEATURE_POINT_VISIT_TRACKING.md` 文档。
