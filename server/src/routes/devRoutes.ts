import { Router, Request, Response } from 'express';
import { JwtService } from '../services/jwtService';
import { logger } from '../utils/logger';
import { prisma } from '../utils/database';

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
    const devUserId = 'dev-user-001';

    // 确保开发用户在数据库中存在
    let devUser = await prisma.user.findUnique({
      where: { id: devUserId },
      include: {
        userRoles: {
          include: {
            role: true
          }
        }
      }
    });

    if (!devUser) {
      // 创建开发用户
      logger.info('创建开发环境用户');
      
      // 首先确保ADMIN角色存在
      let adminRole = await prisma.role.findUnique({
        where: { name: 'ADMIN' }
      });

      if (!adminRole) {
        adminRole = await prisma.role.create({
          data: {
            name: 'ADMIN',
            description: '管理员角色',
            permissions: {},
            isSystem: false
          }
        });
      }

      // 创建开发用户
      devUser = await prisma.user.create({
        data: {
          id: devUserId,
          username: username,
          email: 'dev@example.com',
          passwordHash: 'dev-password-hash', // 开发环境不需要真实密码
          name: 'Developer',
          isActive: true,
          userRoles: {
            create: {
              roleId: adminRole.id,
              assignedBy: devUserId // 自己分配给自己
            }
          }
        },
        include: {
          userRoles: {
            include: {
              role: true
            }
          }
        }
      });

      logger.info('开发环境用户创建成功', { userId: devUserId });
    }

    // 确保devUser存在（TypeScript类型检查）
    if (!devUser) {
      throw new Error('开发用户创建失败');
    }

    // 创建token payload
    const payload = {
      userId: devUser.id,
      username: devUser.username,
      email: devUser.email || 'dev@example.com',
      displayName: devUser.name,
      roles: devUser.userRoles.map(ur => ur.role.name),
      isActive: devUser.isActive
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
      message: '生成token失败',
      error: process.env.NODE_ENV === 'development' ? error : undefined
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
