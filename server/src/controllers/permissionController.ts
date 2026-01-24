import { Request, Response } from 'express'
import { PermissionService } from '../services/permissionService'
import { PermissionError, ResourceModule, PermissionAction, SYSTEM_ROLE_PERMISSIONS } from '../types/permission'
import { logger } from '../utils/logger'
import { prisma } from '../utils/database'

// 权限模块的中文名称映射
const MODULE_NAMES: Record<string, string> = {
  system: '系统管理',
  user: '用户管理',
  role: '角色管理',
  permission: '权限管理',
  base: '基地管理',
  location: '地点管理',
  personnel: '人员管理',
  customer: '客户管理',
  supplier: '供应商管理',
  goods: '全局商品',
  category: '商品品类',
  global_setting: '全局配置',
  goods_local_setting: '基地商品设置',
  inventory: '实时库存',
  purchase_order: '采购管理',
  arrival_order: '到货管理',
  stock_transfer: '调货管理',
  stock_out: '出库管理',
  stock_consumption: '消耗管理',
  anchor_profit: '主播利润',
  receivable: '应收管理',
  point: '点位管理',
  point_order: '点位订单',
  point_inventory: '点位库存',
  location_profit: '点位利润',
  translation: '翻译管理',
  currency_rate: '货币汇率',
}

// 权限操作的中文名称映射
const ACTION_NAMES: Record<string, string> = {
  create: '新增',
  read: '查看',
  update: '编辑',
  delete: '删除',
  manage: '管理',
  export: '导出',
  import: '导入',
  // 点位订单专用操作
  confirm: '确认订单',
  ship: '发货',
  deliver: '确认送达',
  payment: '确认收款',
  complete: '完成订单',
  receive: '确认收货',
}

// 权限树节点类型
interface PermissionTreeNode {
  key: string
  title: string
  children?: PermissionTreeNode[]
}

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

  /**
   * 获取权限树（用于前端权限配置页面）
   */
  static async getPermissionTree(req: Request, res: Response): Promise<void> {
    try {
      const tree: PermissionTreeNode[] = []

      // 按模块分组构建权限树
      for (const module of Object.values(ResourceModule)) {
        const moduleName = MODULE_NAMES[module] || module
        const moduleNode: PermissionTreeNode = {
          key: module,
          title: moduleName,
          children: []
        }

        // 添加该模块下的所有操作
        for (const action of Object.values(PermissionAction)) {
          const actionName = ACTION_NAMES[action] || action
          const permissionKey = `${module}:${action}`
          
          moduleNode.children!.push({
            key: permissionKey,
            title: `${actionName}`
          })
        }

        tree.push(moduleNode)
      }

      res.json({
        success: true,
        data: tree
      })
    } catch (error) {
      logger.error('获取权限树失败', {
        error: error instanceof Error ? error.message : String(error)
      })

      res.status(500).json({
        success: false,
        message: '获取权限树失败'
      })
    }
  }

  /**
   * 获取角色的权限列表（返回权限 key 数组）
   * 直接从 Casbin 策略读取，不再使用 Role.permissions 字段
   */
  static async getRolePermissions(req: Request, res: Response): Promise<void> {
    try {
      const { roleId } = req.params

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

      // 使用 casbinService 获取角色权限策略
      const { casbinService } = await import('../services/casbinService')
      const policies = await casbinService.getRolePolicies(role.name)
      
      // 策略格式: [role, domain, resource, action, effect]
      // 转换为权限 key 数组：['resource:action', ...]
      const permissionKeys = policies.map(p => `${p[2]}:${p[3]}`)

      res.json({
        success: true,
        data: {
          roleId: role.id,
          roleName: role.name,
          permissions: permissionKeys
        }
      })
    } catch (error) {
      logger.error('获取角色权限失败', {
        error: error instanceof Error ? error.message : String(error),
        roleId: req.params.roleId
      })

      res.status(500).json({
        success: false,
        message: '获取角色权限失败'
      })
    }
  }

  /**
   * 批量更新角色权限
   * 直接操作 Casbin 策略，不再使用 Role.permissions 字段
   */
  static async updateRolePermissions(req: Request, res: Response): Promise<void> {
    try {
      const { roleId } = req.params
      const { permissions } = req.body  // 权限 key 数组：['module:action', ...]
      const currentUserId = req.user?.id

      if (!Array.isArray(permissions)) {
        res.status(400).json({
          success: false,
          message: '权限列表格式错误'
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

      // 获取当前用户的角色等级
      const currentUserRoles = await prisma.userRole.findMany({
        where: { userId: currentUserId, isActive: true },
        include: { role: true }
      })
      const currentUserLevel = currentUserRoles.length > 0
        ? Math.min(...currentUserRoles.map(ur => ur.role.level))
        : 999

      // 检查目标角色等级：只能配置比自己等级低的角色
      if (role.level <= currentUserLevel) {
        res.status(403).json({
          success: false,
          message: '无法配置同级或更高级别角色的权限'
        })
        return
      }

      // 获取当前用户拥有的所有权限（用于验证）
      const { casbinService } = await import('../services/casbinService')
      let currentUserPermissions = new Set<string>()
      
      // 超级管理员（level 0）可以配置所有权限
      if (currentUserLevel > 0) {
        for (const ur of currentUserRoles) {
          const policies = await casbinService.getRolePolicies(ur.role.name)
          policies.forEach(p => currentUserPermissions.add(`${p[2]}:${p[3]}`))
        }
        
        // 验证用户只能配置自己拥有的权限
        const unauthorizedPermissions = (permissions as string[]).filter(
          perm => !currentUserPermissions.has(perm)
        )
        
        if (unauthorizedPermissions.length > 0) {
          res.status(403).json({
            success: false,
            message: '无法授予您没有的权限',
            data: { unauthorizedPermissions }
          })
          return
        }
      }

      // 使用 casbinService 获取当前角色的所有权限策略
      const currentPolicies = await casbinService.getRolePolicies(role.name)
      
      // 当前权限格式: [role, domain, resource, action, effect]
      // 转换为 key 格式: resource:action
      const currentKeys = new Set(currentPolicies.map(p => `${p[2]}:${p[3]}`))
      const newKeys = new Set(permissions as string[])

      // 计算需要删除和添加的权限
      const toDelete = [...currentKeys].filter(k => !newKeys.has(k))
      const toAdd = [...newKeys].filter(k => !currentKeys.has(k))

      // 删除权限（从 Casbin）
      for (const key of toDelete) {
        const [resource, action] = key.split(':')
        await casbinService.removePolicy(role.name, '*', resource, action, 'allow')
      }

      // 添加权限（到 Casbin）
      for (const key of toAdd) {
        const [resource, action] = key.split(':')
        // 使用通配符域 '*' 表示全局权限
        await casbinService.addPolicy(role.name, '*', resource, action, 'allow')
      }

      logger.info('角色权限更新成功', {
        roleId,
        roleName: role.name,
        added: toAdd.length,
        deleted: toDelete.length
      })

      res.json({
        success: true,
        message: '权限更新成功',
        data: {
          added: toAdd.length,
          deleted: toDelete.length
        }
      })
    } catch (error) {
      logger.error('更新角色权限失败', {
        error: error instanceof Error ? error.message : String(error),
        roleId: req.params.roleId
      })

      res.status(500).json({
        success: false,
        message: '更新角色权限失败'
      })
    }
  }

  /**
   * 获取预设角色权限（用于重置或参考）
   */
  static async getPresetPermissions(req: Request, res: Response): Promise<void> {
    try {
      const { roleName } = req.params

      const presetPermissions = SYSTEM_ROLE_PERMISSIONS[roleName]

      if (!presetPermissions) {
        res.status(404).json({
          success: false,
          message: '未找到该角色的预设权限'
        })
        return
      }

      res.json({
        success: true,
        data: presetPermissions
      })
    } catch (error) {
      logger.error('获取预设权限失败', {
        error: error instanceof Error ? error.message : String(error),
        roleName: req.params.roleName
      })

      res.status(500).json({
        success: false,
        message: '获取预设权限失败'
      })
    }
  }

  /**
   * 重置角色权限为预设值
   */
  static async resetRolePermissions(req: Request, res: Response): Promise<void> {
    try {
      const { roleId } = req.params

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

      const presetPermissions = SYSTEM_ROLE_PERMISSIONS[role.name]

      if (!presetPermissions) {
        res.status(400).json({
          success: false,
          message: '该角色没有预设权限配置'
        })
        return
      }

      // 清除当前角色的所有权限
      const currentPermissions = await PermissionService.getPermissionsForRole(role.name)
      for (const p of currentPermissions) {
        await PermissionService.deletePermissionForRole(role.name, p[1], p[2])
      }

      // 添加预设权限
      for (const permission of presetPermissions) {
        const parts = permission.split(':')
        const resource = parts.slice(0, -1).join(':')  // 处理 module:action:field 格式
        const action = parts[parts.length - 1]
        await PermissionService.addPermissionForRole(role.name, resource, action)
      }

      logger.info('角色权限重置成功', {
        roleId,
        roleName: role.name,
        permissionCount: presetPermissions.length
      })

      res.json({
        success: true,
        message: '权限已重置为预设值',
        data: {
          permissionCount: presetPermissions.length
        }
      })
    } catch (error) {
      logger.error('重置角色权限失败', {
        error: error instanceof Error ? error.message : String(error),
        roleId: req.params.roleId
      })

      res.status(500).json({
        success: false,
        message: '重置角色权限失败'
      })
    }
  }
}
