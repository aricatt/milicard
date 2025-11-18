import { Request, Response } from 'express'
import { PermissionService } from '../services/permissionService'
import { PermissionError } from '../types/permission'
import { logger } from '../utils/logger'
import { prisma } from '../utils/database'

export class PermissionController {
  /**
   * 获取用户权限信息
   */
  static async getUserPermissions(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.params.userId || req.user?.id

      if (!userId) {
        res.status(400).json({
          success: false,
          message: '用户ID不能为空'
        })
        return
      }

      // 获取用户角色
      const roles = await PermissionService.getRolesForUser(userId)

      // 获取角色权限
      const permissions: string[][] = []
      for (const role of roles) {
        const rolePermissions = await PermissionService.getPermissionsForRole(role)
        permissions.push(...rolePermissions)
      }

      res.json({
        success: true,
        data: {
          userId,
          roles,
          permissions
        }
      })
    } catch (error) {
      logger.error('获取用户权限失败', {
        error: error instanceof Error ? error.message : String(error),
        userId: req.params.userId
      })

      res.status(500).json({
        success: false,
        message: '获取用户权限失败'
      })
    }
  }

  /**
   * 为用户分配角色
   */
  static async assignRole(req: Request, res: Response): Promise<void> {
    try {
      const { userId, roleId } = req.body

      if (!userId || !roleId) {
        res.status(400).json({
          success: false,
          message: '用户ID和角色ID不能为空'
        })
        return
      }

      // 检查用户是否存在
      const user = await prisma.user.findUnique({
        where: { id: userId }
      })

      if (!user) {
        res.status(404).json({
          success: false,
          message: '用户不存在'
        })
        return
      }

      // 检查角色是否存在
      const role = await prisma.role.findUnique({
        where: { id: roleId }
      })

      if (!role) {
        res.status(404).json({
          success: false,
          message: '角色不存在'
        })
        return
      }

      // 在数据库中创建用户角色关系
      await prisma.userRole.create({
        data: {
          userId,
          roleId,
          assignedBy: req.user?.id || userId,
          isActive: true
        }
      })

      // 在Casbin中添加角色
      const success = await PermissionService.addRoleForUser(userId, role.name)

      if (success) {
        res.json({
          success: true,
          message: '角色分配成功'
        })
      } else {
        res.status(500).json({
          success: false,
          message: '角色分配失败'
        })
      }
    } catch (error) {
      logger.error('分配角色失败', {
        error: error instanceof Error ? error.message : String(error),
        body: req.body
      })

      res.status(500).json({
        success: false,
        message: '分配角色失败'
      })
    }
  }

  /**
   * 移除用户角色
   */
  static async removeRole(req: Request, res: Response): Promise<void> {
    try {
      const { userId, roleId } = req.body

      if (!userId || !roleId) {
        res.status(400).json({
          success: false,
          message: '用户ID和角色ID不能为空'
        })
        return
      }

      // 获取角色信息
      const role = await prisma.role.findUnique({
        where: { id: roleId }
      })

      if (!role) {
        res.status(404).json({
          success: false,
          message: '角色不存在'
        })
        return
      }

      // 在数据库中删除用户角色关系
      await prisma.userRole.deleteMany({
        where: {
          userId,
          roleId,
          isActive: true
        }
      })

      // 在Casbin中删除角色
      const success = await PermissionService.deleteRoleForUser(userId, role.name)

      if (success) {
        res.json({
          success: true,
          message: '角色移除成功'
        })
      } else {
        res.status(500).json({
          success: false,
          message: '角色移除失败'
        })
      }
    } catch (error) {
      logger.error('移除角色失败', {
        error: error instanceof Error ? error.message : String(error),
        body: req.body
      })

      res.status(500).json({
        success: false,
        message: '移除角色失败'
      })
    }
  }

  /**
   * 检查权限
   */
  static async checkPermission(req: Request, res: Response): Promise<void> {
    try {
      const { userId, resource, action } = req.query

      if (!userId || !resource || !action) {
        res.status(400).json({
          success: false,
          message: '用户ID、资源和操作不能为空'
        })
        return
      }

      const result = await PermissionService.checkPermission(
        userId as string,
        resource as string,
        action as string
      )

      res.json({
        success: true,
        data: result
      })
    } catch (error) {
      logger.error('检查权限失败', {
        error: error instanceof Error ? error.message : String(error),
        query: req.query
      })

      res.status(500).json({
        success: false,
        message: '检查权限失败'
      })
    }
  }

  /**
   * 获取所有角色
   */
  static async getRoles(req: Request, res: Response): Promise<void> {
    try {
      const roles = await prisma.role.findMany({
        select: {
          id: true,
          name: true,
          description: true,
          isSystem: true,
          createdAt: true,
          _count: {
            select: {
              userRoles: {
                where: {
                  isActive: true
                }
              }
            }
          }
        },
        orderBy: {
          name: 'asc'
        }
      })

      res.json({
        success: true,
        data: roles.map(role => ({
          ...role,
          userCount: role._count.userRoles
        }))
      })
    } catch (error) {
      logger.error('获取角色列表失败', {
        error: error instanceof Error ? error.message : String(error)
      })

      res.status(500).json({
        success: false,
        message: '获取角色列表失败'
      })
    }
  }

  /**
   * 获取角色详情
   */
  static async getRoleDetail(req: Request, res: Response): Promise<void> {
    try {
      const { roleId } = req.params

      const role = await prisma.role.findUnique({
        where: { id: roleId },
        include: {
          userRoles: {
            where: { isActive: true },
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  name: true,
                  email: true
                }
              }
            }
          }
        }
      })

      if (!role) {
        res.status(404).json({
          success: false,
          message: '角色不存在'
        })
        return
      }

      // 获取角色权限
      const permissions = await PermissionService.getPermissionsForRole(role.name)

      res.json({
        success: true,
        data: {
          ...role,
          permissions,
          users: role.userRoles.map(ur => ur.user)
        }
      })
    } catch (error) {
      logger.error('获取角色详情失败', {
        error: error instanceof Error ? error.message : String(error),
        roleId: req.params.roleId
      })

      res.status(500).json({
        success: false,
        message: '获取角色详情失败'
      })
    }
  }

  /**
   * 为角色添加权限
   */
  static async addPermissionToRole(req: Request, res: Response): Promise<void> {
    try {
      const { roleId, resource, action } = req.body

      if (!roleId || !resource || !action) {
        res.status(400).json({
          success: false,
          message: '角色ID、资源和操作不能为空'
        })
        return
      }

      // 获取角色信息
      const role = await prisma.role.findUnique({
        where: { id: roleId }
      })

      if (!role) {
        res.status(404).json({
          success: false,
          message: '角色不存在'
        })
        return
      }

      // 添加权限
      const success = await PermissionService.addPermissionForRole(role.name, resource, action)

      if (success) {
        res.json({
          success: true,
          message: '权限添加成功'
        })
      } else {
        res.status(500).json({
          success: false,
          message: '权限添加失败'
        })
      }
    } catch (error) {
      logger.error('添加角色权限失败', {
        error: error instanceof Error ? error.message : String(error),
        body: req.body
      })

      res.status(500).json({
        success: false,
        message: '添加角色权限失败'
      })
    }
  }

  /**
   * 从角色删除权限
   */
  static async removePermissionFromRole(req: Request, res: Response): Promise<void> {
    try {
      const { roleId, resource, action } = req.body

      if (!roleId || !resource || !action) {
        res.status(400).json({
          success: false,
          message: '角色ID、资源和操作不能为空'
        })
        return
      }

      // 获取角色信息
      const role = await prisma.role.findUnique({
        where: { id: roleId }
      })

      if (!role) {
        res.status(404).json({
          success: false,
          message: '角色不存在'
        })
        return
      }

      // 删除权限
      const success = await PermissionService.deletePermissionForRole(role.name, resource, action)

      if (success) {
        res.json({
          success: true,
          message: '权限删除成功'
        })
      } else {
        res.status(500).json({
          success: false,
          message: '权限删除失败'
        })
      }
    } catch (error) {
      logger.error('删除角色权限失败', {
        error: error instanceof Error ? error.message : String(error),
        body: req.body
      })

      res.status(500).json({
        success: false,
        message: '删除角色权限失败'
      })
    }
  }

  /**
   * 重新加载权限策略
   */
  static async reloadPolicy(req: Request, res: Response): Promise<void> {
    try {
      await PermissionService.reloadPolicy()

      res.json({
        success: true,
        message: '权限策略重新加载成功'
      })
    } catch (error) {
      logger.error('重新加载权限策略失败', {
        error: error instanceof Error ? error.message : String(error)
      })

      res.status(500).json({
        success: false,
        message: '重新加载权限策略失败'
      })
    }
  }
}
