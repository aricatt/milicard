# Milicard 国际化(i18n)架构设计

## 📋 概述

Milicard 系统采用分层的国际化策略，支持多语言环境下的高效运营。系统设计支持中文、英文、越南文、泰文等多种语言，并具备良好的扩展性。

## 🎯 设计原则

### 1. 分层翻译策略
- **系统固定文字**：使用翻译键 + 数据库存储
- **业务动态内容**：使用多字段JSON存储

### 2. 性能优化
- **批量获取**：避免单个字段的重复API调用
- **多级缓存**：内存缓存 + 数据库查询
- **按需加载**：只加载当前语言的翻译

### 3. 扩展性设计
- **类型安全**：TypeScript类型定义
- **自动化脚本**：一键添加新语言支持
- **向后兼容**：新增语言不影响现有功能

## 🌍 支持的语言

| 语言代码 | 语言名称 | 状态 | 备注 |
|---------|---------|------|------|
| zh-CN | 中文(简体) | ✅ 完整 | 默认语言 |
| en-US | 英文(美国) | ✅ 完整 | 主要国际语言 |
| vi-VN | 越南文 | ✅ 完整 | 东南亚市场 |
| th-TH | 泰文 | ✅ 完整 | 东南亚市场 |
| ja-JP | 日文 | 🔄 扩展中 | 可选支持 |
| ko-KR | 韩文 | 🔄 扩展中 | 可选支持 |
| id-ID | 印尼文 | 🔄 扩展中 | 可选支持 |
| ms-MY | 马来文 | 🔄 扩展中 | 可选支持 |

## 🏗️ 架构设计

### 数据库设计

#### 1. 翻译表 (translations)
```sql
CREATE TABLE translations (
  id UUID PRIMARY KEY,
  key VARCHAR(255) NOT NULL,           -- 翻译键，如 'role.super_admin'
  language VARCHAR(10) NOT NULL,       -- 语言代码，如 'zh-CN'
  value TEXT NOT NULL,                 -- 翻译值
  namespace VARCHAR(100),              -- 命名空间，如 'role', 'goods'
  description TEXT,                    -- 翻译说明
  is_system BOOLEAN DEFAULT FALSE,     -- 是否为系统内置翻译
  is_ai_generated BOOLEAN DEFAULT FALSE, -- 是否为AI生成
  review_status VARCHAR(20) DEFAULT 'pending', -- 审核状态
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID,
  updated_by UUID,
  
  UNIQUE(key, language)
);
```

#### 2. 多语言业务数据
```sql
-- 商品表
CREATE TABLE goods (
  id UUID PRIMARY KEY,
  code VARCHAR(100) UNIQUE,
  name JSONB,                         -- 多语言名称
  description JSONB,                  -- 多语言描述
  retail_price DECIMAL(12,2),
  -- 其他字段...
);

-- 客户表
CREATE TABLE customers (
  id UUID PRIMARY KEY,
  name JSONB,                         -- 多语言名称
  address JSONB,                      -- 多语言地址
  phone VARCHAR(50),
  -- 其他字段...
);
```

### 类型定义

#### 1. 支持的语言类型
```typescript
export type SupportedLanguage = 
  | 'zh-CN'  // 中文
  | 'en-US'  // 英文
  | 'vi-VN'  // 越南文
  | 'th-TH'  // 泰文
  | 'ja-JP'  // 日文
  | 'ko-KR'  // 韩文
  | 'id-ID'  // 印尼文
  | 'ms-MY'  // 马来文
```

#### 2. 多语言文本接口
```typescript
export interface MultilingualText {
  zh_CN: string    // 中文（必填，作为默认语言）
  en_US?: string   // 英文
  vi_VN?: string   // 越南文
  th_TH?: string   // 泰文
  ja_JP?: string   // 日文
  ko_KR?: string   // 韩文
  id_ID?: string   // 印尼文
  ms_MY?: string   // 马来文
}
```

## 🛠️ 实现方案

### 1. 系统固定文字翻译

#### 翻译键命名规范
```typescript
// 命名格式：模块.功能.具体项
'role.super_admin'              // 角色：超级管理员
'role.super_admin.description'  // 角色描述
'module.inventory'              // 模块：库存管理
'button.save'                   // 按钮：保存
'error.invalid_input'           // 错误：输入无效
'status.pending'                // 状态：待处理
```

#### 使用示例
```typescript
// 获取单个翻译
const translation = await translationManager.getTranslation(
  'role.super_admin', 
  'vi-VN'
)

// 批量获取翻译
const translations = await translationManager.getTranslations([
  'role.super_admin',
  'role.boss',
  'role.finance'
], 'vi-VN')
```

### 2. 业务动态内容翻译

#### 数据存储格式
```typescript
// 商品数据示例
const goods = {
  id: "goods-001",
  code: "IPHONE15",
  name: {
    "zh_CN": "苹果iPhone 15 Pro 256GB 深空黑色",
    "en_US": "Apple iPhone 15 Pro 256GB Space Black",
    "vi_VN": "Apple iPhone 15 Pro 256GB Đen Không Gian",
    "th_TH": "Apple iPhone 15 Pro 256GB สีดำสเปซ"
  },
  description: {
    "zh_CN": "最新款苹果手机，配备A17 Pro芯片",
    "en_US": "Latest iPhone with A17 Pro chip",
    "vi_VN": "iPhone mới nhất với chip A17 Pro",
    "th_TH": "iPhone รุ่นล่าสุดพร้อมชิป A17 Pro"
  }
}
```

#### API响应处理
```typescript
// 自动本地化中间件
app.get('/api/v1/goods', 
  languageMiddleware,
  withMultilingualResponse(['name', 'description']),
  goodsController.list
)

// 响应示例（越南文）
{
  "data": [
    {
      "id": "goods-001",
      "code": "IPHONE15",
      "name": {...},  // 完整多语言对象
      "nameLocalized": "Apple iPhone 15 Pro 256GB Đen Không Gian",
      "description": {...},
      "descriptionLocalized": "iPhone mới nhất với chip A17 Pro"
    }
  ]
}
```

## 🔧 核心服务

### 1. 翻译管理服务 (TranslationManager)

```typescript
export class TranslationManager {
  // 获取单个翻译
  async getTranslation(key: string, language: SupportedLanguage): Promise<string>
  
  // 批量获取翻译
  async getTranslations(keys: string[], language: SupportedLanguage): Promise<Record<string, string>>
  
  // 创建或更新翻译
  async upsertTranslation(key: string, language: SupportedLanguage, value: string, options?: any)
  
  // 批量创建翻译
  async batchUpsertTranslations(translations: any[], options?: any)
  
  // 获取翻译统计
  async getTranslationStats()
  
  // 清除缓存
  clearCache(language?: SupportedLanguage)
}
```

### 2. 多语言数据处理工具 (MultilingualHelper)

```typescript
export class MultilingualHelper {
  // 创建多语言文本对象
  static createMultilingualText(zhText: string, translations?: any): MultilingualText
  
  // 获取指定语言的文本
  static getText(multilingualText: MultilingualText, language: SupportedLanguage): string
  
  // 更新多语言文本
  static updateText(multilingualText: MultilingualText, language: SupportedLanguage, newText: string): MultilingualText
  
  // 检查翻译完整性
  static isComplete(multilingualText: MultilingualText): boolean
  
  // 获取缺失的语言
  static getMissingLanguages(multilingualText: MultilingualText): SupportedLanguage[]
  
  // 处理API响应
  static processApiResponse(data: any, multilingualFields: string[], language: SupportedLanguage)
}
```

## 📡 API设计

### 翻译管理API

```typescript
// 获取单个翻译
GET /api/v1/translations/:key
Headers: Accept-Language: vi-VN

// 批量获取翻译
GET /api/v1/translations?keys=role.super_admin,role.boss&language=vi-VN

// 创建或更新翻译
POST /api/v1/translations
{
  "key": "role.new_role",
  "language": "vi-VN", 
  "value": "Vai trò mới",
  "namespace": "role",
  "description": "新角色"
}

// 批量创建翻译
POST /api/v1/translations/batch
{
  "translations": [
    {"key": "role.admin", "language": "ja-JP", "value": "管理者"},
    {"key": "role.user", "language": "ja-JP", "value": "ユーザー"}
  ],
  "isSystem": true
}

// 获取翻译统计
GET /api/v1/translations/stats/overview

// 清除缓存
DELETE /api/v1/translations/cache?language=vi-VN
```

### 业务API自动本地化

```typescript
// 商品API
GET /api/v1/goods
Headers: Accept-Language: th-TH

// 自动返回泰文本地化数据
{
  "data": [
    {
      "id": "goods-001",
      "nameLocalized": "Apple iPhone 15 Pro 256GB สีดำสเปซ",
      "descriptionLocalized": "iPhone รุ่นล่าสุดพร้อมชิป A17 Pro"
    }
  ]
}
```

## 🚀 扩展新语言

### 自动化扩展流程

```bash
# 1. 添加新语言支持（一行命令）
npm run add-language ja-JP

# 2. 重启服务器
npm run dev

# 3. 验证新语言
curl "http://localhost:3001/api/v1/translations/role.super_admin" \
  -H "Accept-Language: ja-JP"
```

### 扩展脚本功能

1. **自动创建翻译条目**：为所有现有翻译键创建新语言版本
2. **更新业务数据**：为现有商品、客户等添加新语言字段
3. **标记AI翻译**：新翻译标记为待AI处理状态
4. **保持数据完整性**：确保扩展过程不影响现有数据

### 扩展后处理

```typescript
// 新语言翻译状态
{
  "ja-JP": {
    "total": 156,      // 总翻译数
    "approved": 0,     // 已审核
    "pending": 156,    // 待审核（AI生成）
    "rejected": 0      // 已拒绝
  }
}
```

## 🎨 前端集成

### Ant Design Pro 国际化方案

#### 1. 配置文件结构
```
client/src/locales/
├── zh-CN/
│   ├── menu.ts          # 菜单翻译
│   ├── pages.ts         # 页面翻译
│   ├── component.ts     # 组件翻译
│   └── globalHeader.ts  # 全局头部翻译
├── en-US/
│   ├── menu.ts
│   ├── pages.ts
│   ├── component.ts
│   └── globalHeader.ts
├── vi-VN/
│   └── ... (同上结构)
└── th-TH/
    └── ... (同上结构)
```

#### 2. 语言配置 (config/config.ts)
```typescript
export default {
  locale: {
    default: 'zh-CN',
    antd: true,
    title: false,
    baseNavigator: true,
    baseSeparator: '-',
  },
  // 其他配置...
}
```

#### 3. 翻译文件示例

**菜单翻译 (locales/zh-CN/menu.ts)**
```typescript
export default {
  'menu.welcome': '欢迎',
  'menu.inventory': '库存管理',
  'menu.inventory.goods': '商品管理',
  'menu.inventory.purchase': '采购管理',
  'menu.inventory.arrival': '到货管理',
  'menu.inventory.transfer': '调货管理',
  'menu.inventory.consumption': '库存消耗',
  'menu.sales': '销售管理',
  'menu.sales.distribution': '分销管理',
  'menu.sales.stockout': '出库管理',
  'menu.finance': '财务管理',
  'menu.finance.profit': '主播利润',
  'menu.finance.receivables': '应收管理',
  'menu.finance.payables': '应付管理',
}
```

**页面翻译 (locales/zh-CN/pages.ts)**
```typescript
export default {
  // 商品管理页面
  'pages.goods.title': '商品管理',
  'pages.goods.create': '新建商品',
  'pages.goods.edit': '编辑商品',
  'pages.goods.code': '商品编码',
  'pages.goods.name': '商品名称',
  'pages.goods.description': '商品描述',
  'pages.goods.retailPrice': '零售价',
  'pages.goods.purchasePrice': '采购价',
  
  // 采购管理页面
  'pages.purchase.title': '采购管理',
  'pages.purchase.create': '新建采购单',
  'pages.purchase.orderNo': '采购单号',
  'pages.purchase.supplier': '供应商',
  'pages.purchase.targetLocation': '目标仓库',
  'pages.purchase.purchaseDate': '采购日期',
  
  // 通用操作
  'pages.common.save': '保存',
  'pages.common.cancel': '取消',
  'pages.common.delete': '删除',
  'pages.common.edit': '编辑',
  'pages.common.view': '查看',
  'pages.common.search': '搜索',
  'pages.common.reset': '重置',
  'pages.common.export': '导出',
  'pages.common.import': '导入',
}
```

#### 4. 组件中使用翻译

**使用 useIntl Hook**
```typescript
import { useIntl } from '@umijs/max'
import { Button, Table } from 'antd'

const GoodsManagement: React.FC = () => {
  const intl = useIntl()
  
  const columns = [
    {
      title: intl.formatMessage({ id: 'pages.goods.code' }),
      dataIndex: 'code',
      key: 'code',
    },
    {
      title: intl.formatMessage({ id: 'pages.goods.name' }),
      dataIndex: 'nameLocalized', // 后端返回的本地化字段
      key: 'name',
    },
    {
      title: intl.formatMessage({ id: 'pages.goods.retailPrice' }),
      dataIndex: 'retailPrice',
      key: 'retailPrice',
    },
  ]
  
  return (
    <div>
      <Button type="primary">
        {intl.formatMessage({ id: 'pages.goods.create' })}
      </Button>
      <Table columns={columns} dataSource={goods} />
    </div>
  )
}
```

**使用 FormattedMessage 组件**
```typescript
import { FormattedMessage } from '@umijs/max'

const GoodsForm: React.FC = () => {
  return (
    <Form>
      <Form.Item 
        label={<FormattedMessage id="pages.goods.name" />}
        name="name"
      >
        <Input placeholder={intl.formatMessage({ id: 'pages.goods.name.placeholder' })} />
      </Form.Item>
    </Form>
  )
}
```

### 语言切换组件

#### 全局语言切换器
```typescript
import { SelectLang } from '@umijs/max'
import { GlobalOutlined } from '@ant-design/icons'

// 在 GlobalHeader 中使用
<SelectLang 
  icon={<GlobalOutlined />}
  onItemClick={(params) => {
    // 切换语言时同时更新API请求头
    localStorage.setItem('umi_locale', params.key)
    window.location.reload()
  }}
/>
```

#### 自定义语言切换器
```typescript
import { useModel, setLocale, getLocale } from '@umijs/max'
import { Dropdown, Button } from 'antd'

const LanguageSwitcher: React.FC = () => {
  const currentLocale = getLocale()
  
  const languages = [
    { key: 'zh-CN', label: '简体中文', icon: '🇨🇳' },
    { key: 'en-US', label: 'English', icon: '🇺🇸' },
    { key: 'vi-VN', label: 'Tiếng Việt', icon: '🇻🇳' },
    { key: 'th-TH', label: 'ไทย', icon: '🇹🇭' },
  ]
  
  const handleLanguageChange = (locale: string) => {
    setLocale(locale, false) // false 表示不刷新页面
    // 更新API请求的默认语言头
    updateApiLanguage(locale)
  }
  
  const items = languages.map(lang => ({
    key: lang.key,
    label: (
      <span>
        {lang.icon} {lang.label}
      </span>
    ),
    onClick: () => handleLanguageChange(lang.key)
  }))
  
  return (
    <Dropdown menu={{ items }} placement="bottomRight">
      <Button icon={<GlobalOutlined />}>
        {languages.find(lang => lang.key === currentLocale)?.icon}
      </Button>
    </Dropdown>
  )
}
```

### API请求语言处理

#### 请求拦截器设置
```typescript
// src/services/request.ts
import { request } from '@umijs/max'
import { getLocale } from '@umijs/max'

// 请求拦截器
request.interceptors.request.use((config) => {
  const locale = getLocale()
  config.headers['Accept-Language'] = locale
  return config
})

// 响应拦截器处理多语言数据
request.interceptors.response.use((response) => {
  // 后端返回的数据已经包含 nameLocalized, descriptionLocalized 等字段
  return response
})
```

#### 业务数据获取
```typescript
// src/services/goods.ts
import { request } from '@umijs/max'

export async function getGoodsList(params?: any) {
  return request('/api/v1/goods', {
    method: 'GET',
    params,
    // Accept-Language 头会自动添加
  })
}

// 返回的数据格式
interface GoodsItem {
  id: string
  code: string
  name: MultilingualText        // 完整多语言对象
  nameLocalized: string         // 当前语言的本地化文本
  description: MultilingualText
  descriptionLocalized: string
  retailPrice: number
  // ...其他字段
}
```

### 表单多语言输入

#### 多语言表单组件
```typescript
import { Tabs, Input, Form } from 'antd'
import { useIntl } from '@umijs/max'

interface MultilingualInputProps {
  value?: Record<string, string>
  onChange?: (value: Record<string, string>) => void
  languages?: string[]
}

const MultilingualInput: React.FC<MultilingualInputProps> = ({
  value = {},
  onChange,
  languages = ['zh-CN', 'en-US', 'vi-VN', 'th-TH']
}) => {
  const intl = useIntl()
  
  const languageLabels = {
    'zh-CN': '中文',
    'en-US': 'English', 
    'vi-VN': 'Tiếng Việt',
    'th-TH': 'ไทย'
  }
  
  const handleChange = (lang: string, text: string) => {
    onChange?.({
      ...value,
      [lang.replace('-', '_')]: text
    })
  }
  
  const items = languages.map(lang => ({
    key: lang,
    label: languageLabels[lang],
    children: (
      <Input
        value={value[lang.replace('-', '_')] || ''}
        onChange={(e) => handleChange(lang, e.target.value)}
        placeholder={`请输入${languageLabels[lang]}内容`}
      />
    )
  }))
  
  return <Tabs items={items} />
}

// 在表单中使用
const GoodsForm: React.FC = () => {
  return (
    <Form>
      <Form.Item 
        label={<FormattedMessage id="pages.goods.name" />}
        name="name"
        rules={[{ required: true }]}
      >
        <MultilingualInput />
      </Form.Item>
    </Form>
  )
}
```

### 数据展示优化

#### 智能语言回退
```typescript
// 工具函数：获取最佳显示文本
const getBestText = (multilingualText: any, fallback: string = '') => {
  const currentLocale = getLocale()
  const localeKey = currentLocale.replace('-', '_')
  
  // 优先使用当前语言
  if (multilingualText?.[localeKey]) {
    return multilingualText[localeKey]
  }
  
  // 回退到中文
  if (multilingualText?.zh_CN) {
    return multilingualText.zh_CN
  }
  
  // 最后使用第一个可用的文本
  const firstAvailable = Object.values(multilingualText || {})
    .find(text => text && typeof text === 'string')
  
  return firstAvailable || fallback
}

// 在组件中使用
const ProductCard: React.FC<{ product: any }> = ({ product }) => {
  return (
    <Card>
      <h3>{product.nameLocalized || getBestText(product.name, product.code)}</h3>
      <p>{product.descriptionLocalized || getBestText(product.description)}</p>
    </Card>
  )
}
```

## 📊 性能优化

### 缓存策略

```typescript
// 三级缓存架构
1. 内存缓存 (5分钟) - 最快访问
2. Redis缓存 (1小时) - 中等速度  
3. 数据库查询 - 最慢但最准确
```

### 批量优化

```typescript
// ❌ 低效方式：每个字段单独调用
for (const item of items) {
  item.nameLocalized = await getTranslation(item.nameKey)
}

// ✅ 高效方式：批量获取
const keys = items.map(item => item.nameKey)
const translations = await getTranslations(keys, language)
items.forEach(item => {
  item.nameLocalized = translations[item.nameKey]
})
```

### 预加载策略

```typescript
// 页面级预加载
app.use('/api/v1/roles', preloadTranslations([
  'role.super_admin',
  'role.boss', 
  'role.finance'
]))
```

## 🔍 监控和维护

### 翻译质量监控

```typescript
// 翻译完成度统计
GET /api/v1/translations/stats/overview
{
  "zh-CN": {"total": 156, "approved": 156, "pending": 0},
  "en-US": {"total": 156, "approved": 145, "pending": 11},
  "vi-VN": {"total": 156, "approved": 120, "pending": 36},
  "th-TH": {"total": 156, "approved": 98, "pending": 58}
}
```

### 缺失翻译检测

```typescript
// 检测缺失翻译
const missingTranslations = await findMissingTranslations('vi-VN')
// 返回需要翻译的键列表
```

### 翻译审核工作流

```typescript
// 翻译审核状态
- pending: 待审核（新创建或AI生成）
- approved: 已审核通过
- rejected: 审核拒绝，需要重新翻译
- needs_revision: 需要修订
```

## 🛡️ 最佳实践

### 1. 翻译键设计
- 使用层级命名：`module.feature.item`
- 保持简洁明确：避免过长的键名
- 统一命名规范：团队遵循相同的命名约定

### 2. 内容管理
- 中文作为基准：所有翻译以中文为准
- 渐进式翻译：优先翻译核心功能
- 质量控制：AI翻译需要人工审核

### 3. 性能考虑
- 批量操作：避免单个字段的重复查询
- 合理缓存：平衡内存使用和查询性能
- 按需加载：只加载当前需要的语言

### 4. 扩展规划
- 类型安全：使用TypeScript确保类型正确
- 向后兼容：新增语言不影响现有功能
- 自动化工具：使用脚本简化扩展流程

## 📚 相关文档

- [数据库设计文档](./database/schema_design.md)
- [API接口文档](./api/README.md)
- [前端集成指南](./frontend/i18n_integration.md)
- [部署配置说明](./deployment/i18n_setup.md)

## 🔄 更新日志

| 版本 | 日期 | 更新内容 |
|------|------|----------|
| 1.0.0 | 2025-11-18 | 初始版本，支持中英越泰四种语言 |
| 1.1.0 | 计划中 | 添加日韩印马四种语言支持 |
| 1.2.0 | 计划中 | 集成AI自动翻译功能 |
| 2.0.0 | 计划中 | 翻译管理后台界面 |
