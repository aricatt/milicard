# Milicard 前端架构设计

## 1. 技术栈选择

### 1.1 最终方案

**保持 Ant Design Pro 作为前端框架：**

```
Client: Ant Design Pro (React + Umi + Ant Design)
Server: Express + TypeScript + Prisma + PostgreSQL
```

### 1.2 选择理由

**✅ 保持 Ant Design Pro 的优势：**
- 开箱即用的精美管理后台设计
- 完整的页面模板和业务组件
- ProTable、ProForm、ProLayout 等高级组件
- 统一的 Ant Design 设计语言
- 已有的项目投入和定制

**✅ 架构清晰：**
- 前后端职责分明
- 通过 HTTP API 通信
- 可以并行开发

## 2. 项目结构

### 2.1 目录结构

```
client/
├── src/
│   ├── components/          # 通用组件
│   ├── pages/              # 页面组件
│   │   ├── inventory/      # 库存管理页面
│   │   ├── sales/         # 销售管理页面
│   │   ├── finance/       # 财务管理页面
│   │   └── dashboard/     # 仪表板
│   ├── services/          # API服务层
│   ├── models/            # 数据模型
│   ├── utils/             # 工具函数
│   └── layouts/           # 布局组件
├── config/                # 配置文件
└── mock/                  # 模拟数据
```

### 2.2 核心页面模块

**基础数据模块：**
- 直播间/仓库列表
- 主播/仓管列表
- 商品列表
- 客户列表

**库存管理模块：**
- 采购管理
- 到货管理
- 调货管理
- 库存消耗

**销售管理模块：**
- 分销管理
- 出库管理

**财务管理模块：**
- 主播利润
- 应收管理
- 应付管理

## 3. 组件设计规范

### 3.1 页面组件模板

```typescript
// src/pages/inventory/goods/index.tsx
import React, { useRef } from 'react'
import { ProTable, ActionType, ProColumns } from '@ant-design/pro-components'
import { Button, Space, message } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { goodsService } from '@/services/goodsService'

const GoodsPage: React.FC = () => {
  const actionRef = useRef<ActionType>()

  const columns: ProColumns<GoodsItem>[] = [
    {
      title: '商品名称',
      dataIndex: 'name',
      key: 'name',
      search: { transform: (value) => ({ name: value }) }
    },
    {
      title: '零售价',
      dataIndex: 'retailPrice',
      key: 'retailPrice',
      valueType: 'money',
      hideInSearch: true,
      // 基于角色控制字段显示
      render: (_, record) => {
        if (hasPermission('view_price')) {
          return `¥${record.retailPrice}`
        }
        return '***'
      }
    },
    {
      title: '操作',
      valueType: 'option',
      render: (_, record) => [
        <Button key="edit" type="link" onClick={() => handleEdit(record)}>
          编辑
        </Button>,
        <Button key="delete" type="link" danger onClick={() => handleDelete(record)}>
          删除
        </Button>
      ]
    }
  ]

  return (
    <ProTable<GoodsItem>
      headerTitle="商品管理"
      actionRef={actionRef}
      rowKey="id"
      search={{ labelWidth: 'auto' }}
      toolBarRender={() => [
        <Button
          key="add"
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => handleAdd()}
        >
          新建商品
        </Button>
      ]}
      request={async (params) => {
        try {
          const response = await goodsService.getList(params)
          return {
            data: response.data,
            success: true,
            total: response.total
          }
        } catch (error) {
          message.error('获取数据失败')
          return { data: [], success: false, total: 0 }
        }
      }}
      columns={columns}
      pagination={{ pageSize: 20 }}
    />
  )
}

export default GoodsPage
```

### 3.2 表单组件模板

```typescript
// src/components/forms/GoodsForm.tsx
import React from 'react'
import { ProForm, ProFormText, ProFormDigit, ProFormSelect } from '@ant-design/pro-components'
import { message } from 'antd'
import { goodsService } from '@/services/goodsService'

interface GoodsFormProps {
  initialValues?: Partial<GoodsItem>
  onSuccess?: () => void
}

const GoodsForm: React.FC<GoodsFormProps> = ({ initialValues, onSuccess }) => {
  const handleSubmit = async (values: any) => {
    try {
      if (initialValues?.id) {
        await goodsService.update(initialValues.id, values)
        message.success('更新成功')
      } else {
        await goodsService.create(values)
        message.success('创建成功')
      }
      onSuccess?.()
    } catch (error) {
      message.error('操作失败')
    }
  }

  return (
    <ProForm
      initialValues={initialValues}
      onFinish={handleSubmit}
      layout="horizontal"
      labelCol={{ span: 6 }}
      wrapperCol={{ span: 18 }}
    >
      <ProFormText
        name="name"
        label="商品名称"
        rules={[{ required: true, message: '请输入商品名称' }]}
        placeholder="请输入商品名称"
      />
      
      <ProFormDigit
        name="retailPrice"
        label="零售价"
        rules={[{ required: true, message: '请输入零售价' }]}
        fieldProps={{
          precision: 2,
          min: 0,
          formatter: (value) => `¥ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ','),
          parser: (value) => value!.replace(/\¥\s?|(,*)/g, '')
        }}
      />

      <ProFormDigit
        name="purchasePrice"
        label="采购价"
        rules={[{ required: true, message: '请输入采购价' }]}
        fieldProps={{ precision: 2, min: 0 }}
      />

      <ProFormSelect
        name="unit"
        label="单位"
        options={[
          { label: '箱', value: 'box' },
          { label: '盒', value: 'pack' },
          { label: '包', value: 'piece' }
        ]}
        rules={[{ required: true, message: '请选择单位' }]}
      />
    </ProForm>
  )
}

export default GoodsForm
```

## 4. 状态管理

### 4.1 全局状态

使用 Umi 内置的 `useModel` 进行状态管理：

```typescript
// src/models/userModel.ts
import { useState, useCallback } from 'react'
import { authService } from '@/services/authService'

export default function useUserModel() {
  const [currentUser, setCurrentUser] = useState<UserInfo | null>(null)
  const [permissions, setPermissions] = useState<string[]>([])

  const login = useCallback(async (credentials: LoginParams) => {
    const response = await authService.login(credentials)
    setCurrentUser(response.user)
    setPermissions(response.permissions)
    localStorage.setItem('token', response.token)
  }, [])

  const logout = useCallback(() => {
    setCurrentUser(null)
    setPermissions([])
    localStorage.removeItem('token')
  }, [])

  const hasPermission = useCallback((permission: string) => {
    return permissions.includes(permission)
  }, [permissions])

  return {
    currentUser,
    permissions,
    login,
    logout,
    hasPermission
  }
}
```

### 4.2 权限控制

```typescript
// src/utils/permission.ts
import { useModel } from 'umi'

// 字段级权限控制
export const useFieldPermission = () => {
  const { hasPermission } = useModel('userModel')

  const canViewPrice = hasPermission('view_price')
  const canViewCost = hasPermission('view_cost')
  const canEditGoods = hasPermission('edit_goods')

  return {
    canViewPrice,
    canViewCost,
    canEditGoods
  }
}

// 页面级权限控制
export const PermissionWrapper: React.FC<{
  permission: string
  children: React.ReactNode
}> = ({ permission, children }) => {
  const { hasPermission } = useModel('userModel')

  if (!hasPermission(permission)) {
    return <div>无权限访问</div>
  }

  return <>{children}</>
}
```

## 5. API服务层

### 5.1 HTTP客户端配置

```typescript
// src/utils/request.ts
import { extend } from 'umi-request'
import { message } from 'antd'

const request = extend({
  prefix: '/api/v1',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 请求拦截器
request.interceptors.request.use((url, options) => {
  const token = localStorage.getItem('token')
  if (token) {
    options.headers = {
      ...options.headers,
      Authorization: `Bearer ${token}`
    }
  }
  
  // 添加请求ID用于错误追踪
  options.headers['x-request-id'] = generateRequestId()
  
  return { url, options }
})

// 响应拦截器
request.interceptors.response.use(
  (response) => {
    const { success, data, error } = response
    if (!success) {
      message.error(error?.message || '请求失败')
      throw new Error(error?.message)
    }
    return data
  },
  (error) => {
    // 错误信息记录到本地存储，供AI分析
    const errorInfo = {
      url: error.request?.url,
      method: error.request?.options?.method,
      status: error.response?.status,
      message: error.message,
      timestamp: new Date().toISOString(),
      requestId: error.request?.options?.headers?.['x-request-id']
    }
    
    localStorage.setItem(
      `api_error_${errorInfo.requestId}`, 
      JSON.stringify(errorInfo)
    )
    
    message.error(`请求失败 (ID: ${errorInfo.requestId})`)
    throw error
  }
)

export default request
```

### 5.2 服务层封装

```typescript
// src/services/goodsService.ts
import request from '@/utils/request'

export interface GoodsItem {
  id: string
  name: string
  retailPrice: number
  purchasePrice: number
  stock: number
  unit: string
  createdAt: string
  updatedAt: string
}

export interface GoodsListParams {
  current?: number
  pageSize?: number
  name?: string
  category?: string
}

class GoodsService {
  async getList(params: GoodsListParams) {
    return request<{
      data: GoodsItem[]
      total: number
    }>('/goods', {
      method: 'GET',
      params
    })
  }

  async getById(id: string) {
    return request<GoodsItem>(`/goods/${id}`)
  }

  async create(data: Omit<GoodsItem, 'id' | 'createdAt' | 'updatedAt'>) {
    return request<GoodsItem>('/goods', {
      method: 'POST',
      data
    })
  }

  async update(id: string, data: Partial<GoodsItem>) {
    return request<GoodsItem>(`/goods/${id}`, {
      method: 'PUT',
      data
    })
  }

  async delete(id: string) {
    return request(`/goods/${id}`, {
      method: 'DELETE'
    })
  }
}

export const goodsService = new GoodsService()
```

## 6. 主题和样式

### 6.1 主题定制

```typescript
// config/theme.ts
export const theme = {
  primaryColor: '#1890ff',
  borderRadius: 6,
  colorBgContainer: '#ffffff',
  colorBgLayout: '#f5f5f5',
  
  // 自定义组件样式
  components: {
    Layout: {
      headerBg: '#001529',
      siderBg: '#001529'
    },
    Menu: {
      darkItemBg: '#001529',
      darkSubMenuItemBg: '#000c17'
    }
  }
}
```

### 6.2 响应式设计

```less
// src/styles/responsive.less
@media (max-width: 768px) {
  .ant-pro-table-toolbar {
    flex-direction: column;
    
    .ant-pro-table-toolbar-title {
      margin-bottom: 16px;
    }
  }
  
  .ant-pro-table-search {
    .ant-form-item {
      margin-bottom: 16px;
    }
  }
}
```

## 7. 构建和部署

### 7.1 构建配置

```typescript
// config/config.ts
export default {
  base: '/',
  publicPath: '/',
  hash: true,
  
  // 代理配置
  proxy: {
    '/api': {
      target: 'http://localhost:3001',
      changeOrigin: true,
      pathRewrite: { '^/api': '/api/v1' }
    }
  },
  
  // 构建优化
  chunks: ['vendors', 'umi'],
  chainWebpack: function (config, { webpack }) {
    config.merge({
      optimization: {
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            vendors: {
              name: 'vendors',
              test: /[\\/]node_modules[\\/]/,
              priority: 10
            }
          }
        }
      }
    })
  }
}
```

### 7.2 Docker部署

```dockerfile
# 前端Dockerfile
FROM node:18-alpine as builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

---

**文档版本：** v1.0  
**创建时间：** 2025-11-16  
**最后更新：** 2025-11-16
