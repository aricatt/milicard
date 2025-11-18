import { Request, Response, NextFunction } from 'express'
import { logger } from '../utils/logger'

export interface ApiError extends Error {
  statusCode?: number
  code?: string
}

export const errorHandler = (
  error: ApiError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  logger.error('API Error:', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  })

  // Prisma错误处理
  if (error.code === 'P2002') {
    return res.status(409).json({
      error: 'Conflict',
      message: 'Resource already exists',
      code: 'DUPLICATE_RESOURCE'
    })
  }

  if (error.code === 'P2025') {
    return res.status(404).json({
      error: 'Not Found',
      message: 'Resource not found',
      code: 'RESOURCE_NOT_FOUND'
    })
  }

  // JWT错误处理
  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid token',
      code: 'INVALID_TOKEN'
    })
  }

  if (error.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Token expired',
      code: 'TOKEN_EXPIRED'
    })
  }

  // 验证错误处理
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Bad Request',
      message: error.message,
      code: 'VALIDATION_ERROR'
    })
  }

  // 默认错误处理
  const statusCode = error.statusCode || 500
  const message = statusCode === 500 ? 'Internal Server Error' : error.message

  res.status(statusCode).json({
    error: statusCode === 500 ? 'Internal Server Error' : 'Error',
    message,
    code: error.code || 'UNKNOWN_ERROR',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  })
}
