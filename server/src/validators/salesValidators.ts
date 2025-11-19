/**
 * 销售管理验证器
 */

import Joi from 'joi'
import { Request, Response, NextFunction } from 'express'
import { 
  SalesOrderStatus, 
  CustomerStatus, 
  CustomerType,
  PaymentMethod
} from '../types/sales'

// ================================
// 基础验证Schema
// ================================

/**
 * 客户查询参数验证
 */
export const customerQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  search: Joi.string().trim().max(100).optional(),
  type: Joi.string().valid(...Object.values(CustomerType)).optional(),
  status: Joi.string().valid(...Object.values(CustomerStatus)).optional(),
  sortBy: Joi.string().valid('name', 'code', 'createdAt').default('createdAt'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc')
})

/**
 * 创建客户验证
 */
export const createCustomerSchema = Joi.object({
  name: Joi.string().trim().min(1).max(100).required()
    .messages({
      'string.empty': '客户名称不能为空',
      'string.max': '客户名称不能超过100个字符'
    }),
  code: Joi.string().trim().min(1).max(50).required()
    .messages({
      'string.empty': '客户编码不能为空',
      'string.max': '客户编码不能超过50个字符'
    }),
  type: Joi.string().valid(...Object.values(CustomerType)).required()
    .messages({
      'any.only': '客户类型必须是有效值'
    }),
  contactPerson: Joi.string().trim().max(50).optional().allow(''),
  contactPhone: Joi.string().trim().max(20).optional().allow(''),
  contactEmail: Joi.string().email().max(100).optional().allow(''),
  address: Joi.string().trim().max(200).optional().allow(''),
  taxNumber: Joi.string().trim().max(50).optional().allow(''),
  creditLimit: Joi.number().min(0).optional(),
  notes: Joi.string().trim().max(500).optional().allow('')
})

/**
 * 更新客户验证
 */
export const updateCustomerSchema = Joi.object({
  name: Joi.string().trim().min(1).max(100).optional(),
  code: Joi.string().trim().min(1).max(50).optional(),
  type: Joi.string().valid(...Object.values(CustomerType)).optional(),
  contactPerson: Joi.string().trim().max(50).optional().allow(''),
  contactPhone: Joi.string().trim().max(20).optional().allow(''),
  contactEmail: Joi.string().email().max(100).optional().allow(''),
  address: Joi.string().trim().max(200).optional().allow(''),
  taxNumber: Joi.string().trim().max(50).optional().allow(''),
  creditLimit: Joi.number().min(0).optional(),
  status: Joi.string().valid(...Object.values(CustomerStatus)).optional(),
  notes: Joi.string().trim().max(500).optional().allow('')
}).min(1)

/**
 * 销售订单查询参数验证
 */
export const salesOrderQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  search: Joi.string().trim().max(100).optional(),
  customerId: Joi.string().uuid().optional(),
  locationId: Joi.string().uuid().optional(),
  status: Joi.string().valid(...Object.values(SalesOrderStatus)).optional(),
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().min(Joi.ref('startDate')).optional(),
  sortBy: Joi.string().valid('orderNo', 'orderDate', 'finalAmount', 'createdAt').default('createdAt'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc')
})

/**
 * 销售订单项验证
 */
export const salesOrderItemSchema = Joi.object({
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
  discount: Joi.number().min(0).max(100).precision(2).optional()
    .messages({
      'number.min': '折扣不能小于0',
      'number.max': '折扣不能大于100'
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
 * 创建销售订单验证
 */
export const createSalesOrderSchema = Joi.object({
  customerId: Joi.string().uuid().required()
    .messages({
      'string.guid': '客户ID格式无效'
    }),
  sourceLocationId: Joi.string().uuid().required()
    .messages({
      'string.guid': '源仓库ID格式无效'
    }),
  orderDate: Joi.date().iso().required()
    .messages({
      'date.format': '订单日期格式无效'
    }),
  deliveryDate: Joi.date().iso().min(Joi.ref('orderDate')).optional()
    .messages({
      'date.min': '交货日期不能早于订单日期'
    }),
  discountAmount: Joi.number().min(0).precision(2).optional()
    .messages({
      'number.min': '折扣金额不能小于0'
    }),
  notes: Joi.string().trim().max(500).optional().allow(''),
  items: Joi.array().items(salesOrderItemSchema).min(1).required()
    .messages({
      'array.min': '至少需要一个销售项目'
    })
})

/**
 * 更新销售订单验证
 */
export const updateSalesOrderSchema = Joi.object({
  customerId: Joi.string().uuid().optional(),
  sourceLocationId: Joi.string().uuid().optional(),
  orderDate: Joi.date().iso().optional(),
  deliveryDate: Joi.date().iso().optional(),
  discountAmount: Joi.number().min(0).precision(2).optional(),
  status: Joi.string().valid(...Object.values(SalesOrderStatus)).optional(),
  notes: Joi.string().trim().max(500).optional().allow(''),
  items: Joi.array().items(salesOrderItemSchema).min(1).optional()
}).min(1)

/**
 * 销售订单审核验证
 */
export const approveSalesOrderSchema = Joi.object({
  approved: Joi.boolean().required()
    .messages({
      'boolean.base': '审核结果必须是布尔值'
    }),
  notes: Joi.string().trim().max(500).optional().allow('')
})

/**
 * 销售统计查询验证
 */
export const salesStatsQuerySchema = Joi.object({
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().min(Joi.ref('startDate')).optional(),
  customerId: Joi.string().uuid().optional(),
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

export const validateCustomerQuery = createValidationMiddleware(customerQuerySchema, 'query')
export const validateCreateCustomer = createValidationMiddleware(createCustomerSchema, 'body')
export const validateUpdateCustomer = createValidationMiddleware(updateCustomerSchema, 'body')

export const validateSalesOrderQuery = createValidationMiddleware(salesOrderQuerySchema, 'query')
export const validateCreateSalesOrder = createValidationMiddleware(createSalesOrderSchema, 'body')
export const validateUpdateSalesOrder = createValidationMiddleware(updateSalesOrderSchema, 'body')
export const validateApproveSalesOrder = createValidationMiddleware(approveSalesOrderSchema, 'body')

export const validateSalesStatsQuery = createValidationMiddleware(salesStatsQuerySchema, 'query')
