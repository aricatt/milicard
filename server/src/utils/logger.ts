import winston from 'winston'

const logLevel = process.env.LOG_LEVEL || 'info'

export const logger = winston.createLogger({
  level: logLevel,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'milicard-api' },
  transports: [
    // 错误日志：最多保留 10MB，轮转 5 个文件
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error',
      maxsize: 10485760, // 10MB
      maxFiles: 5,
      tailable: true
    }),
    // 完整日志：最多保留 20MB，轮转 3 个文件
    new winston.transports.File({ 
      filename: 'logs/combined.log',
      maxsize: 20971520, // 20MB
      maxFiles: 3,
      tailable: true
    })
  ]
})

// 控制台输出配置
if (process.env.NODE_ENV !== 'production') {
  // 开发环境：输出所有日志到控制台
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple(),
      winston.format.printf(({ timestamp, level, message, ...meta }) => {
        return `${timestamp} [${level}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''}`
      })
    )
  }))
} else {
  // 生产环境：只输出错误日志到控制台（减少磁盘和性能开销）
  logger.add(new winston.transports.Console({
    level: 'error',
    format: winston.format.combine(
      winston.format.simple(),
      winston.format.printf(({ timestamp, level, message, ...meta }) => {
        return `${timestamp} [${level}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''}`
      })
    )
  }))
}
