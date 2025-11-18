import Joi from 'joi'
import { LoginRequest, RegisterRequest, PasswordChangeRequest, RefreshTokenRequest } from '../types/auth'

// 用户名验证规则
const usernameSchema = Joi.string()
  .alphanum()
  .min(3)
  .max(30)
  .required()
  .messages({
    'string.alphanum': '用户名只能包含字母和数字',
    'string.min': '用户名至少需要3个字符',
    'string.max': '用户名不能超过30个字符',
    'any.required': '用户名是必填项'
  })

// 密码验证规则
const passwordSchema = Joi.string()
  .min(8)
  .max(128)
  .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
  .required()
  .messages({
    'string.min': '密码至少需要8个字符',
    'string.max': '密码不能超过128个字符',
    'string.pattern.base': '密码必须包含至少一个大写字母、一个小写字母和一个数字',
    'any.required': '密码是必填项'
  })

// 邮箱验证规则
const emailSchema = Joi.string()
  .email()
  .max(255)
  .required()
  .messages({
    'string.email': '请输入有效的邮箱地址',
    'string.max': '邮箱地址不能超过255个字符',
    'any.required': '邮箱是必填项'
  })

// 显示名称验证规则
const displayNameSchema = Joi.string()
  .min(1)
  .max(100)
  .optional()
  .messages({
    'string.min': '显示名称不能为空',
    'string.max': '显示名称不能超过100个字符'
  })

// 登录请求验证
export const loginRequestSchema = Joi.object<LoginRequest>({
  username: usernameSchema,
  password: Joi.string().required().messages({
    'any.required': '密码是必填项'
  })
})

// 注册请求验证
export const registerRequestSchema = Joi.object<RegisterRequest>({
  username: usernameSchema,
  password: passwordSchema,
  email: emailSchema,
  displayName: displayNameSchema
})

// 密码修改请求验证
export const passwordChangeRequestSchema = Joi.object<PasswordChangeRequest>({
  currentPassword: Joi.string().required().messages({
    'any.required': '当前密码是必填项'
  }),
  newPassword: passwordSchema
})

// 刷新令牌请求验证
export const refreshTokenRequestSchema = Joi.object<RefreshTokenRequest>({
  refreshToken: Joi.string().required().messages({
    'any.required': '刷新令牌是必填项'
  })
})

// 用户ID验证（用于路径参数）
export const userIdSchema = Joi.string()
  .uuid()
  .required()
  .messages({
    'string.guid': '用户ID格式无效',
    'any.required': '用户ID是必填项'
  })

// 验证中间件工厂函数
export const validateRequest = (schema: Joi.ObjectSchema) => {
  return (req: any, res: any, next: any) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false, // 返回所有验证错误
      stripUnknown: true // 移除未知字段
    })

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }))

      return res.status(400).json({
        success: false,
        message: '请求数据验证失败',
        errors
      })
    }

    // 将验证后的数据替换原始请求体
    req.body = value
    next()
  }
}

// 验证路径参数中间件工厂函数
export const validateParams = (schema: Joi.ObjectSchema) => {
  return (req: any, res: any, next: any) => {
    const { error, value } = schema.validate(req.params, {
      abortEarly: false,
      stripUnknown: true
    })

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }))

      return res.status(400).json({
        success: false,
        message: '路径参数验证失败',
        errors
      })
    }

    req.params = value
    next()
  }
}

// 验证查询参数中间件工厂函数
export const validateQuery = (schema: Joi.ObjectSchema) => {
  return (req: any, res: any, next: any) => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true
    })

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }))

      return res.status(400).json({
        success: false,
        message: '查询参数验证失败',
        errors
      })
    }

    req.query = value
    next()
  }
}
