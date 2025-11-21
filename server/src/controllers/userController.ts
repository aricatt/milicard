import { Request, Response } from 'express';
import { logger } from '../utils/logger';

/**
 * 用户控制器
 * 处理用户相关的API请求
 */
export class UserController {
  /**
   * 获取当前用户信息
   * 临时实现，返回模拟用户数据
   */
  static async getCurrentUser(req: Request, res: Response) {
    try {
      logger.info('获取当前用户信息', {
        service: 'milicard-api',
        ip: req.ip,
        userAgent: req.get('User-Agent'),
      });

      // 临时返回模拟用户数据
      const mockUser = {
        id: 1,
        username: 'admin',
        name: '管理员',
        email: 'admin@milicard.com',
        avatar: 'https://gw.alipayobjects.com/zos/antfincdn/XAosXuNZyF/BiazfanxmamNRoxxVxka.png',
        roles: ['ADMIN'],
        permissions: ['*'],
        baseId: 1,
        baseName: '默认基地',
      };

      logger.info('返回当前用户信息', {
        service: 'milicard-api',
        userId: mockUser.id,
        username: mockUser.username,
      });

      res.json({
        success: true,
        data: mockUser,
      });
    } catch (error) {
      logger.error('获取当前用户信息失败', {
        service: 'milicard-api',
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });

      res.status(500).json({
        success: false,
        message: '获取用户信息失败',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * 用户登录
   * 临时实现，直接返回成功
   */
  static async login(req: Request, res: Response) {
    try {
      const { username, password } = req.body;

      logger.info('用户登录请求', {
        service: 'milicard-api',
        username,
        ip: req.ip,
      });

      // 临时实现：任何用户名密码都能登录成功
      if (!username || !password) {
        return res.status(400).json({
          success: false,
          message: '用户名和密码不能为空',
        });
      }

      const mockUser = {
        id: 1,
        username,
        name: username === 'admin' ? '管理员' : '用户',
        email: `${username}@milicard.com`,
        avatar: 'https://gw.alipayobjects.com/zos/antfincdn/XAosXuNZyF/BiazfanxmamNRoxxVxka.png',
        roles: username === 'admin' ? ['ADMIN'] : ['USER'],
        permissions: username === 'admin' ? ['*'] : ['read'],
        baseId: 1,
        baseName: '默认基地',
      };

      // 模拟JWT token
      const token = `mock_token_${Date.now()}_${username}`;

      logger.info('用户登录成功', {
        service: 'milicard-api',
        userId: mockUser.id,
        username: mockUser.username,
      });

      res.json({
        success: true,
        data: {
          user: mockUser,
          token,
          type: 'Bearer',
        },
      });
    } catch (error) {
      logger.error('用户登录失败', {
        service: 'milicard-api',
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });

      res.status(500).json({
        success: false,
        message: '登录失败',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * 用户登出
   */
  static async logout(req: Request, res: Response) {
    try {
      logger.info('用户登出', {
        service: 'milicard-api',
        ip: req.ip,
      });

      res.json({
        success: true,
        message: '登出成功',
      });
    } catch (error) {
      logger.error('用户登出失败', {
        service: 'milicard-api',
        error: error instanceof Error ? error.message : String(error),
      });

      res.status(500).json({
        success: false,
        message: '登出失败',
      });
    }
  }
}
