# 投流记录（GMV-ADS统计）功能说明

## 功能概述

投流记录页面用于统计和分析主播的GMV与ADS投流数据，支持按月查看，可以选择多个日期和多个主播进行数据分析。

## 数据库迁移

在使用此功能前，需要先运行数据库迁移：

```powershell
# 进入服务器目录
cd server

# 运行 Prisma 迁移
npx prisma migrate dev --name add_anchor_monthly_ads

# 生成 Prisma 客户端
npx prisma generate
```

## 功能特性

### 1. 数据表设计
- **表名**: `anchor_monthly_ads`
- **存储内容**: 每个主播每月每天的ADS投流金额
- **字段**: 
  - 基础字段：id, baseId, month, handlerId, handlerName
  - 每日ADS：day1Ads ~ day31Ads（31个字段）
  - 时间戳：createdAt, updatedAt

### 2. 页面功能
- **月份选择**: 选择要查看的月份
- **主播多选**: 可以选择多个主播进行筛选
- **日期多选**: 通过日历组件选择多个日期（连续或跳跃）
- **动态列**: 根据月份自动生成1-31号的GMV和ADS列
- **统计字段**:
  - 累计GMV：选中日期的GMV总和
  - 投流金额：选中日期的ADS总和
  - GMV占比：投流金额 / 累计GMV × 100%
  - 直播天数：选中日期中GMV > 0的天数
  - 日均GMV：累计GMV / 直播天数

### 3. API接口

#### 获取月度统计数据
```
GET /api/v1/anchor-gmv-ads/:baseId/stats
Query参数:
  - month: 月份 (YYYY-MM)
  - handlerIds: 主播ID列表（逗号分隔）
  - selectedDates: 选中的日期列表（逗号分隔）
```

#### 创建/更新ADS记录
```
POST /api/v1/anchor-gmv-ads/:baseId
Body:
{
  "month": "2026-01",
  "handlerId": "xxx",
  "handlerName": "主播名",
  "day1Ads": 1000.00,
  "day2Ads": 1500.00,
  ...
}
```

#### 获取主播列表
```
GET /api/v1/anchor-gmv-ads/:baseId/handlers
```

#### 删除ADS记录
```
DELETE /api/v1/anchor-gmv-ads/:baseId/:id
```

## 数据来源

### GMV数据
从 `anchor_profits` 表读取，按主播和日期聚合

### ADS数据
从 `anchor_monthly_ads` 表读取，需要手动录入

## 使用流程

1. **录入ADS数据**
   - 点击"新增记录"按钮
   - 选择月份和主播
   - 填写每天的投流金额
   - 保存

2. **查看统计数据**
   - 选择月份
   - 选择主播（可多选）
   - 点击"选择日期"按钮，在日历中选择要统计的日期
   - 查看列表中的统计结果

3. **分析数据**
   - 查看累计GMV和投流金额
   - 分析GMV占比（投流效率）
   - 查看直播天数和日均GMV
   - 对比不同主播的数据

## 注意事项

1. **月份格式**: 必须为 YYYY-MM 格式（如 2026-01）
2. **主播类型**: 只显示角色为 ANCHOR 的人员
3. **数据隔离**: 数据按基地ID严格隔离
4. **GMV数据**: 自动从主播利润表读取，无需手动录入
5. **ADS数据**: 需要手动录入到系统中

## 路由和菜单

- **路由**: `/live-base/ads-record`
- **菜单位置**: 直播基地 > 投流记录（在"主播利润"后面）
- **权限**: 使用 `canAccessAnchorProfit` 权限

## 技术栈

### 后端
- Node.js + Express
- Prisma ORM
- PostgreSQL
- TypeScript

### 前端
- React + Ant Design Pro
- ProTable（数据表格）
- Calendar（日历多选）
- dayjs（日期处理）

## 开发文件清单

### 后端
- `server/prisma/schema.prisma` - 数据模型定义
- `server/src/services/anchorGmvAdsService.ts` - 业务逻辑
- `server/src/controllers/anchorGmvAdsController.ts` - 控制器
- `server/src/routes/anchorGmvAdsRoutes.ts` - 路由定义

### 前端
- `client/src/pages/live-base/ads-record/index.tsx` - 主页面
- `client/src/pages/live-base/ads-record/types.ts` - 类型定义
- `client/src/pages/live-base/ads-record/components/MultiDateCalendar.tsx` - 日历组件
- `client/src/services/adsRecord.ts` - API服务
- `client/config/routes.ts` - 路由配置
- `client/src/locales/zh-CN/menu.ts` - 菜单翻译
- `client/src/locales/zh-CN/business.ts` - 业务翻译
