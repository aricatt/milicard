import { Router } from 'express'
import { AuthController } from '../controllers/authController'
import { 
  validateRequest, 
  validateParams,
  loginRequestSchema,
  registerRequestSchema,
  passwordChangeRequestSchema,
  refreshTokenRequestSchema,
  userIdSchema
} from '../validators/authValidators'
import { 
  authenticateToken, 
  optionalAuthentication,
  checkTokenRefresh
} from '../middleware/authMiddleware'

const router = Router()

/**
 * @route POST /api/v1/auth/register
 * @desc 用户注册
 * @access Public
 */
router.post('/register', 
  validateRequest(registerRequestSchema),
  AuthController.register
)

/**
 * @route POST /api/v1/auth/login
 * @desc 用户登录
 * @access Public
 */
router.post('/login',
  validateRequest(loginRequestSchema),
  AuthController.login
)

/**
 * @route POST /api/v1/auth/refresh
 * @desc 刷新访问令牌
 * @access Public
 */
router.post('/refresh',
  validateRequest(refreshTokenRequestSchema),
  AuthController.refreshToken
)

/**
 * @route POST /api/v1/auth/logout
 * @desc 用户登出
 * @access Private
 */
router.post('/logout',
  authenticateToken,
  AuthController.logout
)

/**
 * @route GET /api/v1/auth/me
 * @desc 获取当前用户信息
 * @access Private
 */
router.get('/me',
  authenticateToken,
  checkTokenRefresh,
  AuthController.getMe
)

/**
 * @route PUT /api/v1/auth/password
 * @desc 修改密码
 * @access Private
 */
router.put('/password',
  authenticateToken,
  validateRequest(passwordChangeRequestSchema),
  AuthController.changePassword
)

/**
 * @route GET /api/v1/auth/check-username/:username
 * @desc 检查用户名是否可用
 * @access Public
 */
router.get('/check-username/:username',
  AuthController.checkUsername
)

/**
 * @route GET /api/v1/auth/validate
 * @desc 验证令牌有效性
 * @access Private
 */
router.get('/validate',
  authenticateToken,
  checkTokenRefresh,
  AuthController.validateToken
)

export default router
