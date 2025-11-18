import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import dotenv from 'dotenv'
import 'express-async-errors'

import { logger } from './utils/logger'
import { errorHandler } from './middleware/errorHandler'
import { notFoundHandler } from './middleware/notFoundHandler'
import { requestLogger } from './middleware/requestLogger'

// 加载环境变量
dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

// 基础中间件
app.use(helmet())
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))
app.use(requestLogger)

// 健康检查端点
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0'
  })
})

// API路由
import translationRoutes from './routes/translationRoutes'

app.use('/api/v1/translations', translationRoutes)

app.use('/api/v1', (req, res) => {
  res.json({ 
    message: 'Milicard API v1.0',
    endpoints: {
      translations: '/api/v1/translations',
      health: '/health'
    }
  })
})

// 错误处理中间件
app.use(notFoundHandler)
app.use(errorHandler)

// 启动服务器
app.listen(PORT, () => {
  logger.info(`🚀 Milicard Server running on port ${PORT}`)
  logger.info(`📝 Environment: ${process.env.NODE_ENV}`)
  logger.info(`🔗 Health check: http://localhost:${PORT}/health`)
})

export default app
