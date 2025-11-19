/**
 * 采购管理验证器
 */

import Joi from 'joi'
import { Request, Response, NextFunction } from 'express'
import { 
  PurchaseOrderStatus, 
  SupplierStatus, 
  PaymentTerm 
} from '../types/purchase'

// ================================
// 基础验证Schema
// ================================

/**
 * 供应商查询参数验证
 */
export const supplierQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  search: Joi.string().trim().max(100).optional(),
  status: Joi.string().valid(...Object.values(SupplierStatus)).optional(),
  paymentTerm: Joi.string().valid(...Object.values(PaymentTerm)).optional(),
  sortBy: Joi.string().valid('name', 'code', 'createdAt').default('createdAt'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc')
})

/**
 * 创建供应商验证
 */
export const createSupplierSchema = Joi.object({
  name: Joi.string().trim().min(1).max(100).required()
    .messages({
      'string.empty': '供应商名称不能为空',
      'string.max': '供应商名称不能超过100个字符'
    }),
  code: Joi.string().trim().min(1).max(50).required()
    .messages({
      'string.empty': '供应商编码不能为空',
      'string.max': '供应商编码不能超过50个字符'
    }),
  contactPerson: Joi.string().trim().max(50).optional().allow(''),
  contactPhone: Joi.string().trim().max(20).optional().allow(''),
  contactEmail: Joi.string().email().max(100).optional().allow(''),
  address: Joi.string().trim().max(200).optional().allow(''),
  taxNumber: Joi.string().trim().max(50).optional().allow(''),
  bankAccount: Joi.string().trim().max(100).optional().allow(''),
  paymentTerm: Joi.string().valid(...Object.values(PaymentTerm)).required()
    .messages({
      'any.only': '付款条件必须是有效值'
    }),
  creditLimit: Joi.number().min(0).optional(),
  notes: Joi.string().trim().max(500).optional().allow('')
})

/**
 * 更新供应商验证
 */
export const updateSupplierSchema = Joi.object({
  name: Joi.string().trim().min(1).max(100).optional(),
  code: Joi.string().trim().min(1).max(50).optional(),
  contactPerson: Joi.string().trim().max(50).optional().allow(''),
  contactPhone: Joi.string().trim().max(20).optional().allow(''),
  contactEmail: Joi.string().email().max(100).optional().allow(''),
  address: Joi.string().trim().max(200).optional().allow(''),
  taxNumber: Joi.string().trim().max(50).optional().allow(''),
  bankAccount: Joi.string().trim().max(100).optional().allow(''),
  paymentTerm: Joi.string().valid(...Object.values(PaymentTerm)).optional(),
  creditLimit: Joi.number().min(0).optional(),
  status: Joi.string().valid(...Object.values(SupplierStatus)).optional(),
  notes: Joi.string().trim().max(500).optional().allow('')
}).min(1)

/**
 * 采购订单查询参数验证
 */
export const purchaseOrderQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  search: Joi.string().trim().max(100).optional(),
  locationId: Joi.string().uuid().optional(),
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().min(Joi.ref('startDate')).optional(),
  sortBy: Joi.string().valid('orderNo', 'purchaseDate', 'totalAmount', 'createdAt').default('createdAt'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc')
})

/**
 * 采购订单项验证
 */
export const purchaseOrderItemSchema = Joi.object({
  goodsId: Joi.string().uuid().required()
    .messages({
      'string.guid': '商品ID格式无效'
    }),
  boxQuantity: Joi.number().integer().min(0).required()
    .messages({
      'number.min': '箱数不能小于0'
    }),
  packQuantity: Joi.number().integer().min(0).required()
    .messages({
      'number.min': '包数不能小于0'
    }),
  pieceQuantity: Joi.number().integer().min(0).required()
    .messages({
      'number.min': '个数不能小于0'
    }),
  unitPrice: Joi.number().min(0).precision(2).required()
    .messages({
      'number.min': '单价不能小于0'
    }),
  notes: Joi.string().trim().max(200).optional().allow('')
}).custom((value, helpers) => {
  // 验证至少有一种数量大于0
  if (value.boxQuantity === 0 && value.packQuantity === 0 && value.pieceQuantity === 0) {
    return helpers.error('custom.invalidQuantity')
  }
  return value
}).messages({
  'custom.invalidQuantity': '至少需要一种数量大于0'
})

/**
 * 创建采购订单验证
 */
export const createPurchaseOrderSchema = Joi.object({
  supplierName: Joi.string().trim().min(1).max(100).required()
    .messages({
      'string.empty': '供应商名称不能为空',
      'string.max': '供应商名称不能超过100个字符'
    }),
  targetLocationId: Joi.string().uuid().required()
    .messages({
      'string.guid': '目标仓库ID格式无效'
    }),
  purchaseDate: Joi.date().iso().required()
    .messages({
      'date.format': '采购日期格式无效'
    }),
  notes: Joi.string().trim().max(500).optional().allow(''),
  items: Joi.array().items(purchaseOrderItemSchema).min(1).required()
    .messages({
      'array.min': '至少需要一个采购项目'
    })
})

/**
 * 更新采购订单验证
 */
export const updatePurchaseOrderSchema = Joi.object({
  supplierName: Joi.string().trim().min(1).max(100).optional(),
  targetLocationId: Joi.string().uuid().optional(),
  purchaseDate: Joi.date().iso().optional(),
  notes: Joi.string().trim().max(500).optional().allow(''),
  items: Joi.array().items(purchaseOrderItemSchema).min(1).optional()
}).min(1)

/**
 * 采购订单审核验证
 */
export const approvePurchaseOrderSchema = Joi.object({
  approved: Joi.boolean().required()
    .messages({
      'boolean.base': '审核结果必须是布尔值'
    }),
  notes: Joi.string().trim().max(500).optional().allow('')
})

/**
 * 采购统计查询验证
 */
export const purchaseStatsQuerySchema = Joi.object({
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().min(Joi.ref('startDate')).optional(),
  supplierId: Joi.string().uuid().optional(),
  locationId: Joi.string().uuid().optional()
})

// ================================
// 验证中间件工厂
// ================================

/**
 * 创建验证中间件
 */
export const createValidationMiddleware = (schema: Joi.ObjectSchema, target: 'body' | 'query' | 'params' = 'body') => {
  return (req: Request, res: Response, next: NextFunction) => {
    const data = target === 'body' ? req.body : target === 'query' ? req.query : req.params
    
    const { error, value } = schema.validate(data, {
      abortEarly: false,
      stripUnknown: true,
      convert: true
    })

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }))

      return res.status(400).json({
        success: false,
        message: '数据验证失败',
        errors
      })
    }

    // 将验证后的数据重新赋值
    if (target === 'body') {
      req.body = value
    } else if (target === 'query') {
      req.query = value
    } else {
      req.params = value
    }

    next()
  }
}

// ================================
// 导出验证中间件
// ================================

export const validateSupplierQuery = createValidationMiddleware(supplierQuerySchema, 'query')
export const validateCreateSupplier = createValidationMiddleware(createSupplierSchema, 'body')
export const validateUpdateSupplier = createValidationMiddleware(updateSupplierSchema, 'body')

export const validatePurchaseOrderQuery = createValidationMiddleware(purchaseOrderQuerySchema, 'query')
export const validateCreatePurchaseOrder = createValidationMiddleware(createPurchaseOrderSchema, 'body')
export const validateUpdatePurchaseOrder = createValidationMiddleware(updatePurchaseOrderSchema, 'body')
export const validateApprovePurchaseOrder = createValidationMiddleware(approvePurchaseOrderSchema, 'body')

export const validatePurchaseStatsQuery = createValidationMiddleware(purchaseStatsQuerySchema, 'query')
