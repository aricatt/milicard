import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import dotenv from 'dotenv'
import path from 'path'
import 'express-async-errors'

import { logger } from './utils/logger'
import { errorHandler } from './middleware/errorHandler'
import { notFoundHandler } from './middleware/notFoundHandler'
import { requestLogger } from './middleware/requestLogger'
// PermissionService 已被 casbinService 替代

// 加载环境变量
dotenv.config()

const app = express()
const PORT = process.env.PORT || 6801

// 基础中间件
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}))
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())
app.use(requestLogger)

// 静态文件服务 - 提供上传文件访问
app.use('/uploads', express.static(path.join(__dirname, '../uploads')))

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
// import goodsRoutes from './routes/goodsRoutes' // 已废弃，使用goodsBaseRoutes（阿米巴模式）
import inventoryRoutes from './routes/inventoryRoutes'
import purchaseRoutes from './routes/purchaseRoutes'
import salesRoutes from './routes/salesRoutes'
import baseRoutes from './routes/baseRoutes'
import goodsBaseRoutes from './routes/goodsBaseRoutes'
import inventoryBaseRoutes from './routes/inventoryBaseRoutes'
import purchaseBaseRoutes from './routes/purchaseBaseRoutes'
import salesBaseRoutes from './routes/salesBaseRoutes'
import personnelBaseRoutes from './routes/personnelBaseRoutes'
import locationBaseRoutes from './routes/locationBaseRoutes'
import arrivalRoutes from './routes/arrivalRoutes'
import transferRoutes from './routes/transferRoutes'
import consumptionRoutes from './routes/consumptionRoutes'
import anchorProfitRoutes from './routes/anchorProfitRoutes'
import anchorGmvAdsRoutes from './routes/anchorGmvAdsRoutes'
import userRoutes from './routes/userRoutes'
import userManagementRoutes from './routes/userManagementRoutes'
import roleRoutes from './routes/roleRoutes'
import devRoutes from './routes/devRoutes'
import pointRoutes from './routes/pointRoutes'
import pointOrderRoutes from './routes/pointOrderRoutes'
import dataPermissionRoutes from './routes/dataPermissionRoutes'
import stockOutRoutes from './routes/stockOutRoutes'
import stockRoutes from './routes/stockRoutes'
import locationProfitRoutes from './routes/locationProfitRoutes'
import payableRoutes from './routes/payableRoutes'
import globalGoodsRoutes from './routes/globalGoodsRoutes'
import goodsLocalSettingRoutes from './routes/goodsLocalSettingRoutes'
import categoryRoutes from './routes/categoryRoutes'
import currencyRateRoutes from './routes/currencyRateRoutes'
import internationalLogisticsRoutes from './routes/internationalLogisticsRoutes'
import pointVisitRoutes from './routes/pointVisitRoutes'
import globalSettingRoutes from './routes/globalSettingRoutes'

app.use('/api/v1/auth', authRoutes)
app.use('/api/v1/translations', translationRoutes)
app.use('/api/v1/permissions', permissionRoutes)
// app.use('/api/v1/goods', goodsRoutes) // 已废弃，使用goodsBaseRoutes（阿米巴模式）
app.use('/api/v1/inventory', inventoryRoutes)
app.use('/api/v1/purchase', purchaseRoutes)
app.use('/api/v1/sales', salesRoutes)
app.use('/api/v1/live-base/bases', baseRoutes)
app.use('/api/v1/bases', goodsBaseRoutes)
app.use('/api/v1/bases', locationBaseRoutes)  // 必须在 inventoryBaseRoutes 之前，避免路由冲突
app.use('/api/v1/bases', inventoryBaseRoutes)
app.use('/api/v1/bases', purchaseBaseRoutes)
app.use('/api/v1/bases', salesBaseRoutes)
app.use('/api/v1/bases', personnelBaseRoutes)
app.use('/api/v1/bases', arrivalRoutes)
app.use('/api/v1/bases', transferRoutes)
app.use('/api/v1/bases', consumptionRoutes)
app.use('/api/v1/bases', anchorProfitRoutes)
app.use('/api/v1/anchor-gmv-ads', anchorGmvAdsRoutes)
app.use('/api', userRoutes)
app.use('/api/v1/users', userManagementRoutes)
app.use('/api/v1/roles', roleRoutes)
app.use('/api/v1/data-permissions', dataPermissionRoutes)
app.use('/api/v1/bases', pointRoutes)
app.use('/api/v1/bases', pointOrderRoutes)
app.use('/api/v1/bases', stockOutRoutes)
app.use('/api/v1/bases', stockRoutes)
app.use('/api/v1/bases/:baseId/location-profits', locationProfitRoutes)
app.use('/api/v1/bases', payableRoutes)
app.use('/api/v1/global-goods', globalGoodsRoutes)
app.use('/api/v1/bases/:baseId/goods-settings', goodsLocalSettingRoutes)
app.use('/api/v1/categories', categoryRoutes)
app.use('/api/v1/currency-rates', currencyRateRoutes)
app.use('/api/v1/global-settings', globalSettingRoutes)
app.use('/api/v1/bases', internationalLogisticsRoutes)
app.use('/api/v1', pointVisitRoutes)

// 开发环境路由（仅在开发环境下启用）
if (process.env.NODE_ENV === 'development') {
  app.use('/api/v1/dev', devRoutes)
}

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
  
  // 初始化 Casbin 权限系统
  try {
    const { casbinService } = await import('./services/casbinService')
    await casbinService.initialize()
    logger.info('🔐 Casbin 权限系统初始化完成')
  } catch (error) {
    logger.error('❌ Casbin 权限系统初始化失败', { error })
    process.exit(1)
  }
  })
}

export default app
