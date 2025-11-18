import Joi from 'joi'
import { GoodsStatus, GoodsUnit } from '../types/goods'
import { SupportedLanguage } from '../types/i18n'

// 多语言文本验证模式
const multilingualTextSchema = Joi.object({
  'zh-CN': Joi.string().optional(),
  'en-US': Joi.string().optional(),
  'vi-VN': Joi.string().optional(),
  'th-TH': Joi.string().optional(),
  'ja-JP': Joi.string().optional(),
  'ko-KR': Joi.string().optional(),
  'id-ID': Joi.string().optional(),
  'ms-MY': Joi.string().optional()
}).min(1).messages({
  'object.min': '至少需要提供一种语言的文本'
})

// 商品创建验证
export const createGoodsSchema = Joi.object({
  code: Joi.string()
    .trim()
    .min(2)
    .max(50)
    .pattern(/^[A-Z0-9_-]+$/)
    .required()
    .messages({
      'string.pattern.base': '商品编码只能包含大写字母、数字、下划线和连字符',
      'string.min': '商品编码至少需要2个字符',
      'string.max': '商品编码不能超过50个字符'
    }),

  name: multilingualTextSchema.required(),

  description: multilingualTextSchema.optional(),

  categoryId: Joi.string()
    .uuid()
    .optional()
    .messages({
      'string.guid': '分类ID格式无效'
    }),

  supplierId: Joi.string()
    .uuid()
    .optional()
    .messages({
      'string.guid': '供应商ID格式无效'
    }),

  unit: Joi.string()
    .valid(...Object.values(GoodsUnit))
    .required()
    .messages({
      'any.only': `单位必须是以下值之一: ${Object.values(GoodsUnit).join(', ')}`
    }),

  costPrice: Joi.number()
    .min(0)
    .precision(2)
    .optional()
    .messages({
      'number.min': '成本价不能为负数',
      'number.precision': '成本价最多保留2位小数'
    }),

  sellingPrice: Joi.number()
    .min(0)
    .precision(2)
    .optional()
    .messages({
      'number.min': '销售价不能为负数',
      'number.precision': '销售价最多保留2位小数'
    }),

  minStock: Joi.number()
    .integer()
    .min(0)
    .optional()
    .messages({
      'number.integer': '最小库存必须是整数',
      'number.min': '最小库存不能为负数'
    }),

  maxStock: Joi.number()
    .integer()
    .min(0)
    .optional()
    .when('minStock', {
      is: Joi.exist(),
      then: Joi.number().min(Joi.ref('minStock')).messages({
        'number.min': '最大库存不能小于最小库存'
      })
    }),

  barcode: Joi.string()
    .trim()
    .max(50)
    .optional()
    .messages({
      'string.max': '条形码不能超过50个字符'
    }),

  images: Joi.array()
    .items(Joi.string().uri())
    .max(10)
    .optional()
    .messages({
      'array.max': '最多只能上传10张图片',
      'string.uri': '图片URL格式无效'
    }),

  tags: Joi.array()
    .items(Joi.string().trim().min(1).max(20))
    .max(20)
    .optional()
    .messages({
      'array.max': '最多只能添加20个标签',
      'string.min': '标签不能为空',
      'string.max': '标签长度不能超过20个字符'
    }),

  specifications: Joi.object()
    .pattern(Joi.string(), Joi.any())
    .optional(),

  status: Joi.string()
    .valid(...Object.values(GoodsStatus))
    .default(GoodsStatus.ACTIVE)
    .messages({
      'any.only': `状态必须是以下值之一: ${Object.values(GoodsStatus).join(', ')}`
    })
})

// 商品更新验证
export const updateGoodsSchema = Joi.object({
  name: multilingualTextSchema.optional(),
  description: multilingualTextSchema.optional(),
  categoryId: Joi.string().uuid().allow(null).optional(),
  supplierId: Joi.string().uuid().allow(null).optional(),
  unit: Joi.string().valid(...Object.values(GoodsUnit)).optional(),
  costPrice: Joi.number().min(0).precision(2).allow(null).optional(),
  sellingPrice: Joi.number().min(0).precision(2).allow(null).optional(),
  minStock: Joi.number().integer().min(0).allow(null).optional(),
  maxStock: Joi.number().integer().min(0).allow(null).optional(),
  barcode: Joi.string().trim().max(50).allow(null).optional(),
  images: Joi.array().items(Joi.string().uri()).max(10).optional(),
  tags: Joi.array().items(Joi.string().trim().min(1).max(20)).max(20).optional(),
  specifications: Joi.object().pattern(Joi.string(), Joi.any()).optional(),
  status: Joi.string().valid(...Object.values(GoodsStatus)).optional()
}).min(1).messages({
  'object.min': '至少需要提供一个要更新的字段'
})

// 商品查询参数验证
export const goodsQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  search: Joi.string().trim().max(100).optional(),
  categoryId: Joi.string().uuid().optional(),
  supplierId: Joi.string().uuid().optional(),
  status: Joi.string().valid(...Object.values(GoodsStatus)).optional(),
  unit: Joi.string().valid(...Object.values(GoodsUnit)).optional(),
  minPrice: Joi.number().min(0).precision(2).optional(),
  maxPrice: Joi.number().min(0).precision(2).optional()
    .when('minPrice', {
      is: Joi.exist(),
      then: Joi.number().min(Joi.ref('minPrice')).messages({
        'number.min': '最大价格不能小于最小价格'
      })
    }),
  hasStock: Joi.boolean().optional(),
  sortBy: Joi.string().valid('name', 'code', 'price', 'stock', 'createdAt').default('createdAt'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
  language: Joi.string().valid('zh-CN', 'en-US', 'vi-VN', 'th-TH', 'ja-JP', 'ko-KR', 'id-ID', 'ms-MY').optional()
})

// 批量操作验证
export const bulkOperationSchema = Joi.object({
  operation: Joi.string()
    .valid('UPDATE_STATUS', 'UPDATE_CATEGORY', 'UPDATE_SUPPLIER', 'DELETE')
    .required(),
  
  goodsIds: Joi.array()
    .items(Joi.string().uuid())
    .min(1)
    .max(100)
    .required()
    .messages({
      'array.min': '至少需要选择一个商品',
      'array.max': '一次最多只能操作100个商品'
    }),
  
  data: Joi.object({
    status: Joi.string().valid(...Object.values(GoodsStatus)).optional(),
    categoryId: Joi.string().uuid().allow(null).optional(),
    supplierId: Joi.string().uuid().allow(null).optional()
  }).optional()
}).custom((value, helpers) => {
  const { operation, data } = value
  
  // 根据操作类型验证必需的数据
  if (operation === 'UPDATE_STATUS' && (!data || !data.status)) {
    return helpers.error('custom.missingStatus')
  }
  
  if (operation === 'UPDATE_CATEGORY' && (!data || data.categoryId === undefined)) {
    return helpers.error('custom.missingCategory')
  }
  
  if (operation === 'UPDATE_SUPPLIER' && (!data || data.supplierId === undefined)) {
    return helpers.error('custom.missingSupplier')
  }
  
  return value
}, 'Bulk operation validation').messages({
  'custom.missingStatus': '更新状态操作需要提供status字段',
  'custom.missingCategory': '更新分类操作需要提供categoryId字段',
  'custom.missingSupplier': '更新供应商操作需要提供supplierId字段'
})

// 商品导入数据验证
export const goodsImportSchema = Joi.object({
  code: Joi.string().trim().min(2).max(50).pattern(/^[A-Z0-9_-]+$/).required(),
  name_zh: Joi.string().trim().max(200).optional(),
  name_en: Joi.string().trim().max(200).optional(),
  name_vi: Joi.string().trim().max(200).optional(),
  name_th: Joi.string().trim().max(200).optional(),
  description_zh: Joi.string().trim().max(1000).optional(),
  description_en: Joi.string().trim().max(1000).optional(),
  description_vi: Joi.string().trim().max(1000).optional(),
  description_th: Joi.string().trim().max(1000).optional(),
  categoryCode: Joi.string().trim().max(50).optional(),
  supplierCode: Joi.string().trim().max(50).optional(),
  unit: Joi.string().valid(...Object.values(GoodsUnit)).required(),
  costPrice: Joi.number().min(0).precision(2).optional(),
  sellingPrice: Joi.number().min(0).precision(2).optional(),
  minStock: Joi.number().integer().min(0).optional(),
  maxStock: Joi.number().integer().min(0).optional(),
  barcode: Joi.string().trim().max(50).optional(),
  tags: Joi.string().trim().max(500).optional(), // 逗号分隔的标签
  status: Joi.string().valid(...Object.values(GoodsStatus)).default(GoodsStatus.ACTIVE)
}).custom((value, helpers) => {
  // 至少需要一个语言的名称
  const hasName = value.name_zh || value.name_en || value.name_vi || value.name_th
  if (!hasName) {
    return helpers.error('custom.missingName')
  }
  
  // 验证库存范围
  if (value.minStock && value.maxStock && value.maxStock < value.minStock) {
    return helpers.error('custom.invalidStockRange')
  }
  
  return value
}).messages({
  'custom.missingName': '至少需要提供一种语言的商品名称',
  'custom.invalidStockRange': '最大库存不能小于最小库存'
})

// 价格更新验证
export const priceUpdateSchema = Joi.object({
  costPrice: Joi.number().min(0).precision(2).optional(),
  sellingPrice: Joi.number().min(0).precision(2).optional(),
  changeReason: Joi.string().trim().max(200).optional()
}).min(1).messages({
  'object.min': '至少需要提供一个价格字段'
})

// 库存查询验证
export const stockQuerySchema = Joi.object({
  locationId: Joi.string().uuid().optional(),
  includeReserved: Joi.boolean().default(false),
  includeHistory: Joi.boolean().default(false)
})

// 通用验证中间件工厂
export const validateRequest = (schema: Joi.ObjectSchema, source: 'body' | 'query' | 'params' = 'body') => {
  return (req: any, res: any, next: any) => {
    const data = req[source]
    const { error, value } = schema.validate(data, {
      abortEarly: false,
      stripUnknown: true,
      convert: true
    })

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        code: detail.type
      }))

      return res.status(400).json({
        success: false,
        message: '请求数据验证失败',
        errors
      })
    }

    // 将验证后的数据替换原始数据
    req[source] = value
    next()
  }
}
