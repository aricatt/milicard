# Google Maps API 配置指南（越南部署）

## 当前状态

您的应用部署在越南，可以访问Google Maps服务。当前逆地理编码功能已切换为Google Maps API。

## 为什么需要配置API Key？

Google Maps Geocoding API 有以下限制：

### 无API Key的情况：
- ❌ 可能无法使用或受到严格限制
- ❌ 每天配额很少
- ❌ 可能返回 `REQUEST_DENIED` 错误

### 配置API Key后：
- ✅ 每月 $200 免费额度（约28,500次请求）
- ✅ 稳定可靠的服务
- ✅ 更详细的地址信息
- ✅ 支持多语言（越南语、中文、英文等）

## 快速配置步骤

### 1. 创建Google Cloud项目

1. 访问 [Google Cloud Console](https://console.cloud.google.com/)
2. 登录您的Google账号
3. 点击顶部的项目选择器
4. 点击"新建项目"
5. 输入项目名称（如"MiliCard-Vietnam"）
6. 点击"创建"

### 2. 启用Geocoding API

1. 在左侧菜单中，选择"API和服务" > "库"
2. 搜索"Geocoding API"
3. 点击"Geocoding API"
4. 点击"启用"按钮

### 3. 创建API凭据

1. 在左侧菜单中，选择"API和服务" > "凭据"
2. 点击"创建凭据" > "API密钥"
3. 复制生成的API密钥（类似：`AIzaSyD...`）
4. 点击"限制密钥"进行安全配置

### 4. 配置API密钥限制（重要！）

为了安全，建议配置以下限制：

#### 应用限制：
- 选择"HTTP引用站点（网站）"
- 添加您的域名：
  ```
  https://yourdomain.com/*
  https://*.yourdomain.com/*
  ```
- 如果是测试环境，也可以添加：
  ```
  http://localhost:8075/*
  http://localhost:*
  ```

#### API限制：
- 选择"限制密钥"
- 勾选"Geocoding API"
- 点击"保存"

### 5. 配置到前端项目

#### 方法1：环境变量配置（推荐）

在 `client/.env` 文件中添加：

```env
# Google Maps API Key（越南部署）
GOOGLE_MAPS_API_KEY=AIzaSyD...你的API密钥
```

在 `client/.env.production` 文件中添加：

```env
# 生产环境 Google Maps API Key
GOOGLE_MAPS_API_KEY=AIzaSyD...你的API密钥
```

#### 方法2：直接在代码中配置（不推荐）

如果不想使用环境变量，可以直接修改代码：

编辑 `client/src/pages/offline-region/points/components/VisitForm.tsx`：

```typescript
// 将这一行：
const apiKey = process.env.GOOGLE_MAPS_API_KEY || '';

// 改为：
const apiKey = 'AIzaSyD...你的API密钥';
```

**注意**：直接在代码中配置API Key有安全风险，不推荐用于生产环境。

### 6. 重启前端服务

```bash
cd client
npm run start:dev
```

## 验证配置

### 1. 测试逆地理编码

1. 打开浏览器开发者工具（F12）
2. 切换到"Console"标签
3. 访问点位管理页面，打开拜访记录表单
4. 点击"点击定位"按钮
5. 查看控制台输出：

**成功示例**：
```
逆地理编码成功: 123 Đường Nguyễn Huệ, Quận 1, Thành phố Hồ Chí Minh, Việt Nam
```

**失败示例**：
```
Google Maps API请求被拒绝，可能需要配置API Key
错误信息: The provided API key is invalid.
```

### 2. 检查API调用

在浏览器开发者工具的"Network"标签中：
1. 筛选"geocode"
2. 查看请求URL
3. 查看响应状态

**成功响应示例**：
```json
{
  "status": "OK",
  "results": [
    {
      "formatted_address": "123 Đường Nguyễn Huệ, Quận 1, Thành phố Hồ Chí Minh, Việt Nam",
      "address_components": [...]
    }
  ]
}
```

## 费用说明

### 免费额度

Google Maps Platform 提供每月 $200 免费额度：

- **Geocoding API**: $5 / 1000次请求
- **免费额度**: $200 / $5 = 40,000次请求/月
- **每天平均**: 约1,333次请求

### 预估使用量

假设您的系统有：
- 100个活跃用户
- 每人每天拜访5个点位
- 每次拜访调用1次API

**每月使用量** = 100 × 5 × 30 = 15,000次

**结论**：完全在免费额度内，无需付费！

### 设置预算提醒

为了避免意外费用，建议设置预算提醒：

1. 访问 [Google Cloud Console](https://console.cloud.google.com/)
2. 选择"结算" > "预算和提醒"
3. 点击"创建预算"
4. 设置预算金额（如$10）
5. 设置提醒阈值（如50%、90%、100%）

## 地址显示效果

### 配置前（当前状态）：
```
📍 已获取位置
22.533320, 113.930410
经纬度: 22.533320, 113.930410
```

### 配置后（预期效果）：
```
📍 已获取位置
123 Đường Nguyễn Huệ, Quận 1, Thành phố Hồ Chí Minh, Việt Nam
经纬度: 22.533320, 113.930410
```

## 多语言支持

Google Maps API支持多种语言，可以根据需要调整：

### 越南语（当前配置）：
```typescript
`https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&language=vi&key=${apiKey}`
```

### 中文：
```typescript
`https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&language=zh-CN&key=${apiKey}`
```

### 英文：
```typescript
`https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&language=en&key=${apiKey}`
```

如需修改语言，编辑 `VisitForm.tsx` 中的 `language` 参数。

## 故障排查

### 问题1：显示经纬度而非地址

**可能原因**：
- API Key未配置或配置错误
- API Key权限不足
- 超出免费配额

**解决方法**：
1. 检查浏览器控制台错误信息
2. 验证API Key是否正确
3. 确认Geocoding API已启用
4. 检查API Key限制设置

### 问题2：REQUEST_DENIED错误

**可能原因**：
- API Key无效
- Geocoding API未启用
- HTTP引用站点限制不匹配

**解决方法**：
1. 重新生成API Key
2. 确认Geocoding API已启用
3. 检查HTTP引用站点配置
4. 临时移除所有限制测试

### 问题3：OVER_QUERY_LIMIT错误

**可能原因**：
- 超出每日配额
- 请求频率过高

**解决方法**：
1. 检查Google Cloud Console的配额使用情况
2. 考虑升级到付费计划
3. 实现客户端缓存减少重复请求

## 安全建议

### 1. 使用环境变量
- ✅ 不要将API Key提交到Git仓库
- ✅ 在 `.gitignore` 中添加 `.env` 文件
- ✅ 使用不同的Key用于开发和生产环境

### 2. 配置API限制
- ✅ 限制HTTP引用站点
- ✅ 限制API范围（仅Geocoding API）
- ✅ 定期轮换API Key

### 3. 监控使用情况
- ✅ 设置预算提醒
- ✅ 定期检查API使用统计
- ✅ 监控异常请求

## 备选方案

如果不想使用Google Maps API，也可以考虑：

### 1. OpenStreetMap Nominatim（免费）
- ✅ 完全免费
- ✅ 无需API Key
- ⚠️ 请求频率限制（1次/秒）
- ⚠️ 地址详细度可能不如Google

### 2. Mapbox Geocoding API
- ✅ 每月100,000次免费请求
- ✅ 地址质量高
- ⚠️ 需要注册账号

### 3. 仅显示经纬度（当前降级方案）
- ✅ 无需配置
- ✅ 永远可用
- ❌ 用户体验较差

## 总结

**推荐配置Google Maps API Key**：
- ✅ 免费额度充足（每月40,000次）
- ✅ 地址准确详细
- ✅ 支持越南语
- ✅ 配置简单快速

**配置步骤**：
1. 创建Google Cloud项目（5分钟）
2. 启用Geocoding API（1分钟）
3. 创建API Key（1分钟）
4. 配置环境变量（1分钟）
5. 重启服务（1分钟）

**总耗时**：约10分钟

配置完成后，拜访记录将显示完整的越南语地址，用户体验大幅提升！

## 相关文档

- [Google Maps Platform 文档](https://developers.google.com/maps/documentation/geocoding)
- [定价说明](https://developers.google.com/maps/billing-and-pricing/pricing)
- [API Key最佳实践](https://developers.google.com/maps/api-security-best-practices)
