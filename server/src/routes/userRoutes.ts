import { Router } from 'express';
import { UserController } from '../controllers/userController';

const router = Router();

/**
 * 用户相关路由
 * 处理用户认证和信息管理
 */

// 获取当前用户信息
router.get('/currentUser', UserController.getCurrentUser);

// 用户登录
router.post('/login', UserController.login);

// 用户登出
router.post('/logout', UserController.logout);

export default router;
