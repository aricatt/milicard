// 库存管理验证器

import Joi from 'joi'
import { Request, Response, NextFunction } from 'express'
import { InventoryOperationType, TransferOrderStatus } from '../types/inventory'

// ================================
// 基础验证schemas
// ================================

// UUID验证
const uuidSchema = Joi.string().uuid().required()

// 日期验证
const dateSchema = Joi.string().isoDate().required()

// 分页验证
const paginationSchema = {
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20)
}

// 排序验证
const sortSchema = {
  sortBy: Joi.string().valid('goodsCode', 'stockQuantity', 'averageCost', 'updatedAt').default('updatedAt'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc')
}

// ================================
// 库存查询验证
// ================================

export const inventoryQuerySchema = Joi.object({
  goodsId: Joi.string().uuid().optional(),
  locationId: Joi.string().uuid().optional(),
  goodsCode: Joi.string().trim().optional(),
  search: Joi.string().trim().min(1).max(100).optional(),
  minStock: Joi.number().integer().min(0).optional(),
  maxStock: Joi.number().integer().min(0).optional(),
  ...paginationSchema,
  ...sortSchema
}).custom((value, helpers) => {
  // 如果设置了minStock和maxStock，确保minStock <= maxStock
  if (value.minStock !== undefined && value.maxStock !== undefined) {
    if (value.minStock > value.maxStock) {
      return helpers.error('custom.invalidStockRange')
    }
  }
  return value
}).messages({
  'custom.invalidStockRange': '最小库存不能大于最大库存'
})

// ================================
// 到货入库验证
// ================================

export const arrivalOrderItemSchema = Joi.object({
  goodsId: uuidSchema,
  quantity: Joi.number().integer().min(1).required(),
  unitCost: Joi.number().precision(2).min(0).required(),
  notes: Joi.string().trim().max(500).optional()
})

export const createArrivalOrderSchema = Joi.object({
  arrivalNo: Joi.string().trim().min(1).max(50).optional(),
  purchaseOrderId: uuidSchema,
  locationId: uuidSchema,
  arrivalDate: dateSchema,
  notes: Joi.string().trim().max(1000).optional(),
  items: Joi.array().items(arrivalOrderItemSchema).min(1).max(100).required()
})

// ================================
// 调拨管理验证
// ================================

export const transferOrderItemSchema = Joi.object({
  goodsId: uuidSchema,
  quantity: Joi.number().integer().min(1).required(),
  notes: Joi.string().trim().max(500).optional()
})

export const createTransferOrderSchema = Joi.object({
  transferNo: Joi.string().trim().min(1).max(50).optional(),
  fromLocationId: uuidSchema,
  toLocationId: uuidSchema,
  transferDate: dateSchema,
  notes: Joi.string().trim().max(1000).optional(),
  items: Joi.array().items(transferOrderItemSchema).min(1).max(100).required()
}).custom((value, helpers) => {
  // 确保调出和调入仓库不同
  if (value.fromLocationId === value.toLocationId) {
    return helpers.error('custom.sameLocation')
  }
  return value
}).messages({
  'custom.sameLocation': '调出仓库和调入仓库不能相同'
})

export const updateTransferOrderStatusSchema = Joi.object({
  status: Joi.string().valid(...Object.values(TransferOrderStatus)).required(),
  notes: Joi.string().trim().max(1000).optional()
})

// ================================
// 库存调整验证
// ================================

export const inventoryAdjustmentItemSchema = Joi.object({
  goodsId: uuidSchema,
  currentQuantity: Joi.number().integer().min(0).required(),
  adjustedQuantity: Joi.number().integer().min(0).required(),
  reason: Joi.string().trim().max(200).optional()
})

export const inventoryAdjustmentSchema = Joi.object({
  locationId: uuidSchema,
  adjustments: Joi.array().items(inventoryAdjustmentItemSchema).min(1).max(100).required(),
  reason: Joi.string().trim().min(1).max(200).required(),
  notes: Joi.string().trim().max(1000).optional()
}).custom((value, helpers) => {
  // 检查是否有重复的商品ID
  const goodsIds = value.adjustments.map((item: any) => item.goodsId)
  const uniqueGoodsIds = [...new Set(goodsIds)]
  if (goodsIds.length !== uniqueGoodsIds.length) {
    return helpers.error('custom.duplicateGoods')
  }
  return value
}).messages({
  'custom.duplicateGoods': '调整列表中不能包含重复的商品'
})

// ================================
// 库存统计验证
// ================================

export const inventoryStatsSchema = Joi.object({
  locationId: Joi.string().uuid().optional(),
  goodsId: Joi.string().uuid().optional(),
  startDate: Joi.string().isoDate().optional(),
  endDate: Joi.string().isoDate().optional()
}).custom((value, helpers) => {
  // 如果设置了开始和结束日期，确保开始日期不晚于结束日期
  if (value.startDate && value.endDate) {
    if (new Date(value.startDate) > new Date(value.endDate)) {
      return helpers.error('custom.invalidDateRange')
    }
  }
  return value
}).messages({
  'custom.invalidDateRange': '开始日期不能晚于结束日期'
})

// ================================
// 库存盘点验证
// ================================

export const stockTakeItemSchema = Joi.object({
  goodsId: uuidSchema,
  systemQuantity: Joi.number().integer().min(0).required(),
  actualQuantity: Joi.number().integer().min(0).required(),
  notes: Joi.string().trim().max(500).optional()
})

export const createStockTakeSchema = Joi.object({
  locationId: uuidSchema,
  takeDate: dateSchema,
  notes: Joi.string().trim().max(1000).optional(),
  items: Joi.array().items(stockTakeItemSchema).min(1).max(500).required()
}).custom((value, helpers) => {
  // 检查是否有重复的商品ID
  const goodsIds = value.items.map((item: any) => item.goodsId)
  const uniqueGoodsIds = [...new Set(goodsIds)]
  if (goodsIds.length !== uniqueGoodsIds.length) {
    return helpers.error('custom.duplicateGoods')
  }
  return value
}).messages({
  'custom.duplicateGoods': '盘点列表中不能包含重复的商品'
})

export const updateStockTakeStatusSchema = Joi.object({
  status: Joi.string().valid('draft', 'confirmed', 'completed').required(),
  notes: Joi.string().trim().max(1000).optional()
})

// ================================
// 批量操作验证
// ================================

export const batchInventoryOperationSchema = Joi.object({
  operation: Joi.string().valid(...Object.values(InventoryOperationType)).required(),
  locationId: uuidSchema,
  operationDate: dateSchema,
  items: Joi.array().items(Joi.object({
    goodsId: uuidSchema,
    quantity: Joi.number().integer().min(1).required(),
    unitCost: Joi.number().precision(2).min(0).optional(),
    notes: Joi.string().trim().max(500).optional()
  })).min(1).max(100).required(),
  notes: Joi.string().trim().max(1000).optional()
})

// ================================
// 验证中间件工厂
// ================================

export function validateRequest(schema: Joi.ObjectSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
      convert: true
    })

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }))

      return res.status(400).json({
        success: false,
        message: '数据验证失败',
        errors
      })
    }

    // 将验证后的数据替换原始数据
    req.body = value
    next()
  }
}

export function validateQuery(schema: Joi.ObjectSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
      convert: true
    })

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }))

      return res.status(400).json({
        success: false,
        message: '查询参数验证失败',
        errors
      })
    }

    // 将验证后的数据替换原始数据
    req.query = value as any
    next()
  }
}

// ================================
// 参数验证中间件
// ================================

export const validateUuidParam = (paramName: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const paramValue = req.params[paramName]
    const { error } = Joi.string().uuid().required().validate(paramValue)

    if (error) {
      return res.status(400).json({
        success: false,
        message: `无效的${paramName}参数`,
        error: error.message
      })
    }

    next()
  }
}
