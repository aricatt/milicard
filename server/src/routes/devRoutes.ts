import { Router, Request, Response } from 'express';
import { JwtService } from '../services/jwtService';
import { logger } from '../utils/logger';

const router = Router();

/**
 * 开发环境专用路由
 * 仅在开发环境下启用
 */

/**
 * 获取开发环境测试token
 * POST /api/v1/dev/token
 */
router.post('/token', async (req: Request, res: Response) => {
  try {
    // 只在开发环境下允许
    if (process.env.NODE_ENV !== 'development') {
      return res.status(404).json({
        success: false,
        message: 'Not found'
      });
    }

    const { username = 'developer' } = req.body;

    // 创建开发用户的payload
    const payload = {
      userId: 'dev-user-001',
      username: username,
      email: 'dev@example.com',
      displayName: 'Developer',
      roles: ['ADMIN', 'USER'],
      isActive: true
    };

    // 生成真正的JWT token
    const token = JwtService.generateAccessToken(payload);

    logger.info('生成开发环境token', { 
      userId: payload.userId, 
      username: payload.username 
    });

    res.json({
      success: true,
      data: {
        token,
        user: payload
      },
      message: '开发环境token生成成功'
    });

  } catch (error) {
    logger.error('生成开发环境token失败', { error });
    res.status(500).json({
      success: false,
      message: '生成token失败'
    });
  }
});

/**
 * 获取开发环境用户信息
 * GET /api/v1/dev/user
 */
router.get('/user', async (req: Request, res: Response) => {
  try {
    // 只在开发环境下允许
    if (process.env.NODE_ENV !== 'development') {
      return res.status(404).json({
        success: false,
        message: 'Not found'
      });
    }

    const devUser = {
      id: 'dev-user-001',
      username: 'developer',
      email: 'dev@example.com',
      name: 'Developer',
      displayName: 'Developer',
      roles: ['ADMIN', 'USER'],
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    res.json({
      success: true,
      data: devUser,
      message: '获取开发用户信息成功'
    });

  } catch (error) {
    logger.error('获取开发用户信息失败', { error });
    res.status(500).json({
      success: false,
      message: '获取用户信息失败'
    });
  }
});

export default router;
