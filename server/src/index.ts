import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import dotenv from 'dotenv'
import 'express-async-errors'

import { logger } from './utils/logger'
import { errorHandler } from './middleware/errorHandler'
import { notFoundHandler } from './middleware/notFoundHandler'
import { requestLogger } from './middleware/requestLogger'
import { PermissionService } from './services/permissionService'

// 加载环境变量
dotenv.config()

const app = express()
const PORT = process.env.PORT || 6801

// 基础中间件
app.use(helmet())
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())
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
import authRoutes from './routes/authRoutes'
import translationRoutes from './routes/translationRoutes'
import permissionRoutes from './routes/permissionRoutes'
import goodsRoutes from './routes/goodsRoutes'
import inventoryRoutes from './routes/inventoryRoutes'
import purchaseRoutes from './routes/purchaseRoutes'
import salesRoutes from './routes/salesRoutes'
import baseRoutes from './routes/baseRoutes'
import goodsBaseRoutes from './routes/goodsBaseRoutes'
import inventoryBaseRoutes from './routes/inventoryBaseRoutes'
import purchaseBaseRoutes from './routes/purchaseBaseRoutes'
import salesBaseRoutes from './routes/salesBaseRoutes'
import personnelBaseRoutes from './routes/personnelBaseRoutes'

app.use('/api/v1/auth', authRoutes)
app.use('/api/v1/translations', translationRoutes)
app.use('/api/v1/permissions', permissionRoutes)
app.use('/api/v1/goods', goodsRoutes)
app.use('/api/v1/inventory', inventoryRoutes)
app.use('/api/v1/purchase', purchaseRoutes)
app.use('/api/v1/sales', salesRoutes)
app.use('/api/v1/live-base/bases', baseRoutes)
app.use('/api/v1/bases', goodsBaseRoutes)
app.use('/api/v1/bases', inventoryBaseRoutes)
app.use('/api/v1/bases', purchaseBaseRoutes)
app.use('/api/v1/bases', salesBaseRoutes)
app.use('/api/v1/bases', personnelBaseRoutes)

app.use('/api/v1', (req, res) => {
  res.json({ 
    message: 'Milicard API v1.0',
    endpoints: {
      auth: '/api/v1/auth',
      translations: '/api/v1/translations',
      permissions: '/api/v1/permissions',
      goods: '/api/v1/goods',
      inventory: '/api/v1/inventory',
      purchase: '/api/v1/purchase',
      sales: '/api/v1/sales',
      health: '/health'
    }
  })
})

// 错误处理中间件
app.use(notFoundHandler)
app.use(errorHandler)

// 导出app供测试使用
export { app }

// 启动服务器
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, async () => {
  logger.info(`🚀 Milicard Server running on port ${PORT}`)
  logger.info(`📝 Environment: ${process.env.NODE_ENV}`)
  logger.info(`🔗 Health check: http://localhost:${PORT}/health`)
  
  // 初始化权限系统
  try {
    await PermissionService.initialize()
    logger.info('🔐 权限系统初始化完成')
  } catch (error) {
    logger.error('❌ 权限系统初始化失败', { error })
    process.exit(1)
  }
  })
}

export default app
