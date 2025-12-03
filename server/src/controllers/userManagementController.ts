import { Request, Response } from 'express';
import { UserService } from '../services/userService';
import { logger } from '../utils/logger';

/**
 * 用户管理控制器
 * 处理用户管理相关的 API 请求
 */
export class UserManagementController {
  /**
   * 获取用户列表
   * GET /api/v1/users
   * 根据当前用户角色层级过滤：只能看到同级或更低级别的用户
   */
  static async getUserList(req: Request, res: Response) {
    try {
      const { page, pageSize, keyword, isActive, roleId } = req.query;
      const currentUserId = req.user?.id;

      const result = await UserService.getUserList({
        page: page ? parseInt(page as string) : 1,
        pageSize: pageSize ? parseInt(pageSize as string) : 10,
        keyword: keyword as string,
        isActive: isActive !== undefined ? isActive === 'true' : undefined,
        roleId: roleId as string,
        currentUserId, // 传递当前用户ID用于层级过滤
      });

      res.json({
        success: true,
        data: result.data,
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
      });
    } catch (error) {
      logger.error('获取用户列表失败', {
        error: error instanceof Error ? error.message : String(error),
      });

      res.status(500).json({
        success: false,
        message: '获取用户列表失败',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * 获取用户详情
   * GET /api/v1/users/:id
   */
  static async getUserById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const user = await UserService.getUserById(id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: '用户不存在',
        });
      }

      res.json({
        success: true,
        data: user,
      });
    } catch (error) {
      logger.error('获取用户详情失败', {
        error: error instanceof Error ? error.message : String(error),
      });

      res.status(500).json({
        success: false,
        message: '获取用户详情失败',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * 创建用户
   * POST /api/v1/users
   * 只能分配同级或更低级别的角色，只能分配自己有权限的基地
   */
  static async createUser(req: Request, res: Response) {
    try {
      const { username, password, name, email, phone, roleIds, baseIds } = req.body;
      const currentUserId = req.user?.id;

      // 参数验证
      if (!username || !password || !name) {
        return res.status(400).json({
          success: false,
          message: '用户名、密码和姓名不能为空',
        });
      }

      const user = await UserService.createUser({
        username,
        password,
        name,
        email,
        currentUserId, // 传递当前用户ID用于权限验证
        phone,
        roleIds,
        baseIds,
      });

      res.status(201).json({
        success: true,
        data: user,
        message: '创建用户成功',
      });
    } catch (error) {
      logger.error('创建用户失败', {
        error: error instanceof Error ? error.message : String(error),
      });

      const statusCode = (error as Error).message.includes('已存在') ? 400 : 500;

      res.status(statusCode).json({
        success: false,
        message: error instanceof Error ? error.message : '创建用户失败',
      });
    }
  }

  /**
   * 更新用户
   * PUT /api/v1/users/:id
   */
  static async updateUser(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { name, email, phone, isActive, password, roleIds, baseIds } = req.body;

      const user = await UserService.updateUser(id, {
        name,
        email,
        phone,
        isActive,
        password,
        roleIds,
        baseIds,
      });

      res.json({
        success: true,
        data: user,
        message: '更新用户成功',
      });
    } catch (error) {
      logger.error('更新用户失败', {
        error: error instanceof Error ? error.message : String(error),
      });

      const statusCode = (error as Error).message.includes('不存在') ? 404 : 500;

      res.status(statusCode).json({
        success: false,
        message: error instanceof Error ? error.message : '更新用户失败',
      });
    }
  }

  /**
   * 删除用户
   * DELETE /api/v1/users/:id
   */
  static async deleteUser(req: Request, res: Response) {
    try {
      const { id } = req.params;

      await UserService.deleteUser(id);

      res.json({
        success: true,
        message: '删除用户成功',
      });
    } catch (error) {
      logger.error('删除用户失败', {
        error: error instanceof Error ? error.message : String(error),
      });

      const statusCode = (error as Error).message.includes('不存在') ? 404 : 500;

      res.status(statusCode).json({
        success: false,
        message: error instanceof Error ? error.message : '删除用户失败',
      });
    }
  }

  /**
   * 重置用户密码
   * POST /api/v1/users/:id/reset-password
   */
  static async resetPassword(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { newPassword } = req.body;

      if (!newPassword) {
        return res.status(400).json({
          success: false,
          message: '新密码不能为空',
        });
      }

      await UserService.resetPassword(id, newPassword);

      res.json({
        success: true,
        message: '重置密码成功',
      });
    } catch (error) {
      logger.error('重置密码失败', {
        error: error instanceof Error ? error.message : String(error),
      });

      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '重置密码失败',
      });
    }
  }

  /**
   * 获取角色列表
   * GET /api/v1/roles
   */
  static async getRoleList(req: Request, res: Response) {
    try {
      const roles = await UserService.getRoleList();

      res.json({
        success: true,
        data: roles,
      });
    } catch (error) {
      logger.error('获取角色列表失败', {
        error: error instanceof Error ? error.message : String(error),
      });

      res.status(500).json({
        success: false,
        message: '获取角色列表失败',
      });
    }
  }

  /**
   * 获取用户统计信息
   * GET /api/v1/users/stats
   */
  static async getUserStats(req: Request, res: Response) {
    try {
      const stats = await UserService.getUserStats();

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error('获取用户统计失败', {
        error: error instanceof Error ? error.message : String(error),
      });

      res.status(500).json({
        success: false,
        message: '获取用户统计失败',
      });
    }
  }

  /**
   * 创建角色
   * POST /api/v1/roles
   */
  static async createRole(req: Request, res: Response) {
    try {
      const { name, description, permissions, level } = req.body;

      if (!name) {
        return res.status(400).json({
          success: false,
          message: '角色名称不能为空',
        });
      }

      const role = await UserService.createRole({
        name,
        description,
        permissions,
        level: level ?? 3, // 默认等级为3
      });

      res.status(201).json({
        success: true,
        data: role,
        message: '创建角色成功',
      });
    } catch (error) {
      logger.error('创建角色失败', {
        error: error instanceof Error ? error.message : String(error),
      });

      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : '创建角色失败',
      });
    }
  }

  /**
   * 更新角色
   * PUT /api/v1/roles/:roleId
   */
  static async updateRole(req: Request, res: Response) {
    try {
      const { roleId } = req.params;
      const { name, description, permissions } = req.body;

      const role = await UserService.updateRole(roleId, {
        name,
        description,
        permissions,
      });

      res.json({
        success: true,
        data: role,
        message: '更新角色成功',
      });
    } catch (error) {
      logger.error('更新角色失败', {
        error: error instanceof Error ? error.message : String(error),
      });

      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : '更新角色失败',
      });
    }
  }

  /**
   * 删除角色
   * DELETE /api/v1/roles/:roleId
   */
  static async deleteRole(req: Request, res: Response) {
    try {
      const { roleId } = req.params;

      await UserService.deleteRole(roleId);

      res.json({
        success: true,
        message: '删除角色成功',
      });
    } catch (error) {
      logger.error('删除角色失败', {
        error: error instanceof Error ? error.message : String(error),
      });

      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : '删除角色失败',
      });
    }
  }

}
