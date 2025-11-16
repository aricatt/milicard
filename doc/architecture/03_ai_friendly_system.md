# AI友好的开发维护系统

## 1. 设计原则

### 1.1 核心目标
- 尽可能让AI能形成从开发到维护的自动流程闭环
- 减少人类开发者的工作量
- 让错误信息结构化、上下文化、可追踪

### 1.2 AI自动化闭环流程
```
开发阶段 → 测试阶段 → 部署阶段 → 运行监控 → 错误分析 → 自动修复建议 → 代码生成 → 回到开发阶段
```

## 2. 结构化日志系统

### 2.1 后端日志配置
```typescript
// server/src/utils/logger.ts
import winston from 'winston'

const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
    winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
      return JSON.stringify({
        timestamp,
        level,
        message,
        stack,
        requestId: meta.requestId,
        userId: meta.userId,
        action: meta.action,
        module: meta.module,
        context: meta.context,
        ...meta
      })
    })
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console()
  ]
})
```

### 2.2 智能错误中间件
```typescript
// server/src/middleware/errorHandler.ts
export const errorHandler = (error: Error, req: Request, res: Response, next: NextFunction) => {
  const context = {
    requestId: req.headers['x-request-id'] || generateRequestId(),
    userId: req.user?.id,
    action: `${req.method} ${req.path}`,
    module: getModuleFromPath(req.path),
    input: req.body,
    timestamp: new Date().toISOString()
  }

  logger.error('API Error', {
    ...context,
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack
    },
    request: {
      headers: req.headers,
      query: req.query,
      params: req.params,
      body: sanitizeBody(req.body)
    }
  })

  res.status(500).json({
    success: false,
    error: {
      id: context.requestId,
      message: error.message,
      module: context.module,
      action: context.action,
      timestamp: context.timestamp
    }
  })
}
```

## 3. 前端错误捕获

### 3.1 全局错误边界
```typescript
// client/src/components/ErrorBoundary.tsx
class ErrorBoundary extends React.Component {
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const errorData = {
      errorId: generateErrorId(),
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      userId: getCurrentUserId(),
      action: 'React Component Error',
      componentStack: errorInfo.componentStack
    }

    // 发送到后端
    fetch('/api/errors/frontend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error, context: errorData })
    })

    // 本地存储，方便AI分析
    localStorage.setItem(`error_${errorData.errorId}`, JSON.stringify({
      error, context: errorData, errorInfo
    }))
  }
}
```

### 3.2 API调用错误拦截
```typescript
// client/src/utils/request.ts
request.interceptors.response.use(
  response => response,
  error => {
    const errorContext = {
      requestId: error.config?.headers['x-request-id'],
      url: error.config?.url,
      method: error.config?.method,
      data: error.config?.data,
      timestamp: new Date().toISOString(),
      status: error.response?.status,
      responseData: error.response?.data
    }

    localStorage.setItem(`api_error_${errorContext.requestId}`, JSON.stringify(errorContext))
    message.error(`请求失败 (ID: ${errorContext.requestId})`)
    return Promise.reject(error)
  }
)
```

## 4. AI辅助诊断工具

### 4.1 错误分析API
```typescript
// server/src/routes/debug.ts
router.get('/recent-errors', async (req, res) => {
  const logs = fs.readFileSync('logs/error.log', 'utf8')
    .split('\n')
    .filter(line => line.trim())
    .slice(-50)
    .map(line => JSON.parse(line))

  res.json({
    success: true,
    data: {
      errors: logs,
      summary: generateErrorSummary(logs),
      aiPrompt: generateAIPrompt(logs)
    }
  })
})

function generateAIPrompt(errors: any[]) {
  return `
请分析以下错误日志，找出可能的问题原因和解决方案：

错误统计：
- 总错误数：${errors.length}
- 错误类型：${getErrorTypes(errors)}
- 影响模块：${getAffectedModules(errors)}

详细错误日志：
${JSON.stringify(errors, null, 2)}

请提供：
1. 问题根本原因分析
2. 具体的修复建议
3. 预防措施
4. 需要检查的代码位置
`
}
```

### 4.2 一键错误导出工具
```typescript
// client/src/utils/errorExporter.ts
export const exportErrorsForAI = () => {
  const errors = []
  
  // 收集前端错误
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key?.startsWith('error_') || key?.startsWith('api_error_')) {
      errors.push({
        type: 'frontend',
        key,
        data: JSON.parse(localStorage.getItem(key) || '{}')
      })
    }
  }

  // 获取后端错误并下载
  fetch('/api/debug/recent-errors')
    .then(res => res.json())
    .then(backendErrors => {
      const allErrors = {
        frontend: errors,
        backend: backendErrors.data,
        exportTime: new Date().toISOString(),
        aiPrompt: backendErrors.data.aiPrompt
      }

      const blob = new Blob([JSON.stringify(allErrors, null, 2)], {
        type: 'application/json'
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `milicard-errors-${Date.now()}.json`
      a.click()
    })
}
```

## 5. 自动化修复建议

### 5.1 修复建议生成器
```typescript
// server/src/utils/autoFixSuggester.ts
export class AutoFixSuggester {
  static async generateFixSuggestions(errorData: any) {
    const suggestions = {
      immediate: [],
      shortTerm: [],
      longTerm: [],
      codeChanges: [],
      aiPrompt: ''
    }

    switch (errorData.type) {
      case 'DATABASE_ERROR':
        suggestions.immediate.push('检查数据库连接')
        suggestions.codeChanges.push(this.generateDBFixCode(errorData))
        break
      
      case 'VALIDATION_ERROR':
        suggestions.codeChanges.push(this.generateValidationFixCode(errorData))
        break
    }

    suggestions.aiPrompt = this.generateComprehensivePrompt(errorData, suggestions)
    return suggestions
  }

  static generateComprehensivePrompt(errorData: any, suggestions: any) {
    return `
系统检测到问题，请提供完整的解决方案：

问题详情：${JSON.stringify(errorData, null, 2)}

初步建议：
立即行动: ${suggestions.immediate.join(', ')}
短期优化: ${suggestions.shortTerm.join(', ')}

请提供：
1. 完整的代码修复方案
2. 测试用例确保修复有效
3. 部署步骤和注意事项
4. 预防类似问题的建议
`
  }
}
```

## 6. 使用流程

### 6.1 日常开发流程
1. **遇到错误时** - 系统自动记录结构化日志
2. **点击"导出错误"** - 一键生成AI分析文件
3. **复制给AI** - 包含完整上下文的错误信息
4. **AI分析** - 获得具体的修复建议
5. **应用修复** - 根据建议修改代码

### 6.2 AI分析示例
当导出错误文件给AI时，AI会看到：
```json
{
  "error": "ValidationError: 商品名称不能为空",
  "context": {
    "module": "inventory",
    "action": "POST /api/goods",
    "userId": "user123",
    "input": { "name": "", "price": 100 },
    "timestamp": "2025-11-16T01:05:00Z"
  },
  "aiPrompt": "用户在商品管理模块创建商品时，提交了空的商品名称..."
}
```

## 7. 监控和预警

### 7.1 实时错误监控
```typescript
// 开发环境错误监控组件
const ErrorMonitor = () => {
  const [errors, setErrors] = useState([])
  
  useEffect(() => {
    const ws = new WebSocket('ws://localhost:3001/debug/errors')
    ws.onmessage = (event) => {
      const error = JSON.parse(event.data)
      setErrors(prev => [error, ...prev.slice(0, 19)])
    }
  }, [])

  return (
    <Card title="实时错误监控">
      {errors.map(error => (
        <div key={error.id}>
          <Text type="danger">{error.message}</Text>
          <Button onClick={() => copyErrorForAI(error)}>复制给AI</Button>
        </div>
      ))}
    </Card>
  )
}
```

---

**文档版本：** v1.0  
**创建时间：** 2025-11-16
