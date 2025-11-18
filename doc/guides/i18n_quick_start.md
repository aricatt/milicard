# 国际化快速入门指南

## 🚀 5分钟上手多语言

### 第一步：了解两种翻译方式

```typescript
// 1. 系统固定文字 - 使用翻译键
'role.super_admin' → '超级管理员' (中文)
'role.super_admin' → 'Super Administrator' (英文)
'role.super_admin' → 'Quản trị viên cấp cao' (越南文)

// 2. 业务动态内容 - 使用JSON字段
{
  "zh_CN": "苹果iPhone 15",
  "en_US": "Apple iPhone 15", 
  "vi_VN": "Apple iPhone 15",
  "th_TH": "Apple iPhone 15"
}
```

### 第二步：API使用示例

```bash
# 获取越南文翻译
curl "http://localhost:3001/api/v1/translations/role.super_admin" \
  -H "Accept-Language: vi-VN"

# 获取泰文商品列表
curl "http://localhost:3001/api/v1/goods" \
  -H "Accept-Language: th-TH"
```

### 第三步：添加新语言

```bash
# 一行命令添加日语支持
npm run add-language ja-JP

# 重启服务器
npm run dev

# 测试新语言
curl "http://localhost:3001/api/v1/translations/role.super_admin" \
  -H "Accept-Language: ja-JP"
```

## 📝 开发者使用指南

### 添加新的翻译键

```typescript
// 1. 在翻译种子文件中添加
const newTranslations = [
  {
    key: 'button.export',
    translations: {
      'zh-CN': '导出',
      'en-US': 'Export',
      'vi-VN': 'Xuất khẩu',
      'th-TH': 'ส่งออก'
    },
    namespace: 'button',
    description: '导出按钮'
  }
]

// 2. 运行种子脚本
npm run translate:seed
```

### 创建多语言商品

```typescript
// API请求示例
POST /api/v1/goods
{
  "code": "PRODUCT001",
  "name": {
    "zh_CN": "新产品",
    "en_US": "New Product",
    "vi_VN": "Sản phẩm mới",
    "th_TH": "ผลิตภัณฑ์ใหม่"
  },
  "description": {
    "zh_CN": "这是一个新产品",
    "en_US": "This is a new product",
    "vi_VN": "Đây là một sản phẩm mới", 
    "th_TH": "นี่คือผลิตภัณฑ์ใหม่"
  }
}
```

### 前端集成 (Ant Design Pro)

#### 1. 配置国际化
```typescript
// config/config.ts
export default {
  locale: {
    default: 'zh-CN',
    antd: true,
    title: false,
    baseNavigator: true,
  },
}
```

#### 2. 创建翻译文件
```typescript
// src/locales/zh-CN/pages.ts
export default {
  'pages.goods.title': '商品管理',
  'pages.goods.create': '新建商品',
  'pages.goods.name': '商品名称',
}

// src/locales/en-US/pages.ts
export default {
  'pages.goods.title': 'Goods Management',
  'pages.goods.create': 'Create Goods',
  'pages.goods.name': 'Goods Name',
}
```

#### 3. 组件中使用
```typescript
import { useIntl, FormattedMessage } from '@umijs/max'
import { Button, Table } from 'antd'

function GoodsManagement() {
  const intl = useIntl()
  
  const columns = [
    {
      title: intl.formatMessage({ id: 'pages.goods.name' }),
      dataIndex: 'nameLocalized', // 后端自动返回本地化字段
      key: 'name',
    },
  ]
  
  return (
    <div>
      <Button type="primary">
        <FormattedMessage id="pages.goods.create" />
      </Button>
      <Table columns={columns} dataSource={goods} />
    </div>
  )
}
```

#### 4. 多语言表单输入
```typescript
// 自定义多语言输入组件
const MultilingualInput = ({ value, onChange }) => {
  const languages = [
    { key: 'zh-CN', label: '中文' },
    { key: 'en-US', label: 'English' },
    { key: 'vi-VN', label: 'Tiếng Việt' },
    { key: 'th-TH', label: 'ไทย' },
  ]
  
  const items = languages.map(lang => ({
    key: lang.key,
    label: lang.label,
    children: (
      <Input
        value={value?.[lang.key.replace('-', '_')] || ''}
        onChange={(e) => onChange({
          ...value,
          [lang.key.replace('-', '_')]: e.target.value
        })}
      />
    )
  }))
  
  return <Tabs items={items} />
}

// 在表单中使用
<Form.Item name="name" label="商品名称">
  <MultilingualInput />
</Form.Item>
```

#### 5. API请求自动语言处理
```typescript
// src/services/request.ts
import { request } from '@umijs/max'
import { getLocale } from '@umijs/max'

// 自动添加语言头
request.interceptors.request.use((config) => {
  config.headers['Accept-Language'] = getLocale()
  return config
})
```

## 🔧 常用命令

```bash
# 数据库相关
npm run db:push              # 推送数据库结构
npm run db:seed              # 初始化基础数据
npm run translate:seed       # 初始化翻译数据

# 语言管理
npm run add-language ja-JP   # 添加日语支持
npm run add-language ko-KR   # 添加韩语支持

# 开发调试
npm run dev                  # 启动开发服务器
npm run db:studio           # 打开数据库管理界面
```

## 📊 翻译状态检查

```bash
# 检查翻译完成度
curl "http://localhost:3001/api/v1/translations/stats/overview"

# 返回示例
{
  "zh-CN": {"total": 156, "approved": 156, "pending": 0},
  "en-US": {"total": 156, "approved": 145, "pending": 11},
  "vi-VN": {"total": 156, "approved": 120, "pending": 36},
  "th-TH": {"total": 156, "approved": 98, "pending": 58}
}
```

## ❓ 常见问题

### Q: 如何修改现有翻译？
```bash
# 通过API更新
POST /api/v1/translations
{
  "key": "role.super_admin",
  "language": "vi-VN",
  "value": "Quản trị viên tối cao"  # 新的翻译
}
```

### Q: 如何批量导入翻译？
```bash
# 使用批量API
POST /api/v1/translations/batch
{
  "translations": [
    {"key": "role.admin", "language": "ja-JP", "value": "管理者"},
    {"key": "role.user", "language": "ja-JP", "value": "ユーザー"}
  ]
}
```

### Q: 如何处理缺失的翻译？
系统会自动回退到中文，不会出现空白或错误。

### Q: 性能会受影响吗？
不会，系统使用了多级缓存和批量获取策略，性能优异。

## 🎯 最佳实践

1. **优先翻译核心功能**：先翻译用户最常用的界面文字
2. **保持翻译一致性**：相同含义的词汇使用相同翻译
3. **定期审核翻译质量**：特别是AI生成的翻译
4. **测试多语言界面**：确保不同语言下界面显示正常

## 📞 获取帮助

- 查看完整文档：`doc/architecture/04_internationalization.md`
- 数据库设计：`doc/database/schema_design.md`
- API接口文档：`doc/api/README.md`
