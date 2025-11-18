import { PermissionService } from '../permissionService'
import { ResourceModule, PermissionAction } from '../../types/permission'
import { createTestUser, createTestRole, testPrisma } from '../../__tests__/setup'
import { faker } from '@faker-js/faker'

// 模拟文件系统路径
jest.mock('path', () => ({
  join: jest.fn(() => './config/casbin_model.conf'),
  basename: jest.fn((path) => path.split('/').pop()),
  dirname: jest.fn((path) => path.split('/').slice(0, -1).join('/')),
  extname: jest.fn((path) => {
    const parts = path.split('.')
    return parts.length > 1 ? '.' + parts.pop() : ''
  })
}))

// 模拟Casbin
jest.mock('casbin', () => ({
  newEnforcer: jest.fn(() => ({
    enableAutoSave: jest.fn(),
    enforce: jest.fn(),
    addRoleForUser: jest.fn(),
    deleteRoleForUser: jest.fn(),
    getRolesForUser: jest.fn(),
    getUsersForRole: jest.fn(),
    addPermissionForUser: jest.fn(),
    deletePermissionForUser: jest.fn(),
    getPermissionsForUser: jest.fn(),
    addPolicies: jest.fn(),
    getPolicy: jest.fn(),
    loadPolicy: jest.fn(),
    clearPolicy: jest.fn()
  }))
}))

describe('PermissionService', () => {
  let mockEnforcer: any

  beforeEach(async () => {
    // 重置模拟的enforcer
    const { newEnforcer } = require('casbin')
    mockEnforcer = {
      enableAutoSave: jest.fn(),
      enforce: jest.fn(),
      addRoleForUser: jest.fn(),
      deleteRoleForUser: jest.fn(),
      getRolesForUser: jest.fn(),
      getUsersForRole: jest.fn(),
      addPermissionForUser: jest.fn(),
      deletePermissionForUser: jest.fn(),
      getPermissionsForUser: jest.fn(),
      addPolicies: jest.fn(),
      getPolicy: jest.fn().mockResolvedValue([]), // 返回空策略，跳过初始化
      loadPolicy: jest.fn(),
      clearPolicy: jest.fn()
    }
    
    newEnforcer.mockResolvedValue(mockEnforcer)
    
    // 初始化权限服务
    await PermissionService.initialize()
  })

  describe('initialize', () => {
    it('should initialize permission service successfully', async () => {
      // 验证初始化过程
      expect(mockEnforcer.enableAutoSave).toHaveBeenCalledWith(true)
    })
  })

  describe('checkPermission', () => {
    it('should check permission correctly', async () => {
      const userId = faker.string.uuid()
      const resource = 'goods'
      const action = 'read'

      mockEnforcer.enforce.mockResolvedValue(true)

      const result = await PermissionService.checkPermission(userId, resource, action)

      expect(result.allowed).toBe(true)
      expect(mockEnforcer.enforce).toHaveBeenCalledWith(userId, resource, action)
    })

    it('should deny permission when not allowed', async () => {
      const userId = faker.string.uuid()
      const resource = 'goods'
      const action = 'delete'

      mockEnforcer.enforce.mockResolvedValue(false)

      const result = await PermissionService.checkPermission(userId, resource, action)

      expect(result.allowed).toBe(false)
      expect(result.reason).toBe('权限不足')
    })

    it('should handle errors gracefully', async () => {
      const userId = faker.string.uuid()
      const resource = 'goods'
      const action = 'read'

      mockEnforcer.enforce.mockRejectedValue(new Error('Casbin error'))

      const result = await PermissionService.checkPermission(userId, resource, action)

      expect(result.allowed).toBe(false)
      expect(result.reason).toBe('权限检查异常')
    })
  })

  describe('hasPermission', () => {
    it('should check permission string correctly', async () => {
      const userId = faker.string.uuid()
      const permission = `${ResourceModule.GOODS}:${PermissionAction.READ}`

      mockEnforcer.enforce.mockResolvedValue(true)

      const result = await PermissionService.hasPermission(userId, permission as any)

      expect(result).toBe(true)
      expect(mockEnforcer.enforce).toHaveBeenCalledWith(userId, 'goods', 'read')
    })

    it('should handle field-level permissions', async () => {
      const userId = faker.string.uuid()
      const permission = `${ResourceModule.GOODS}:${PermissionAction.READ}:price`

      mockEnforcer.enforce.mockResolvedValue(true)

      const result = await PermissionService.hasPermission(userId, permission as any)

      expect(result).toBe(true)
      expect(mockEnforcer.enforce).toHaveBeenCalledWith(userId, 'goods:price', 'read')
    })
  })

  describe('hasAllPermissions', () => {
    it('should check all permissions successfully', async () => {
      const userId = faker.string.uuid()
      const permissions = [
        `${ResourceModule.GOODS}:${PermissionAction.READ}`,
        `${ResourceModule.GOODS}:${PermissionAction.UPDATE}`
      ]

      mockEnforcer.enforce.mockResolvedValue(true)

      const result = await PermissionService.hasAllPermissions(userId, permissions as any)

      expect(result.allowed).toBe(true)
      expect(result.missingPermissions).toBeUndefined()
    })

    it('should return missing permissions when some are denied', async () => {
      const userId = faker.string.uuid()
      const permissions = [
        `${ResourceModule.GOODS}:${PermissionAction.READ}`,
        `${ResourceModule.GOODS}:${PermissionAction.DELETE}`
      ]

      mockEnforcer.enforce
        .mockResolvedValueOnce(true)  // READ allowed
        .mockResolvedValueOnce(false) // DELETE denied

      const result = await PermissionService.hasAllPermissions(userId, permissions as any)

      expect(result.allowed).toBe(false)
      expect(result.missingPermissions).toContain(`${ResourceModule.GOODS}:${PermissionAction.DELETE}`)
    })
  })

  describe('hasAnyPermission', () => {
    it('should return true if any permission is allowed', async () => {
      const userId = faker.string.uuid()
      const permissions = [
        `${ResourceModule.GOODS}:${PermissionAction.READ}`,
        `${ResourceModule.GOODS}:${PermissionAction.DELETE}`
      ]

      mockEnforcer.enforce
        .mockResolvedValueOnce(true)  // READ allowed
        .mockResolvedValueOnce(false) // DELETE denied (but won't be called)

      const result = await PermissionService.hasAnyPermission(userId, permissions as any)

      expect(result).toBe(true)
    })

    it('should return false if no permissions are allowed', async () => {
      const userId = faker.string.uuid()
      const permissions = [
        `${ResourceModule.GOODS}:${PermissionAction.DELETE}`,
        `${ResourceModule.GOODS}:${PermissionAction.MANAGE}`
      ]

      mockEnforcer.enforce.mockResolvedValue(false)

      const result = await PermissionService.hasAnyPermission(userId, permissions as any)

      expect(result).toBe(false)
    })
  })

  describe('role management', () => {
    it('should add role for user successfully', async () => {
      const userId = faker.string.uuid()
      const role = 'USER'

      mockEnforcer.addRoleForUser.mockResolvedValue(true)

      const result = await PermissionService.addRoleForUser(userId, role)

      expect(result).toBe(true)
      expect(mockEnforcer.addRoleForUser).toHaveBeenCalledWith(userId, role)
    })

    it('should delete role for user successfully', async () => {
      const userId = faker.string.uuid()
      const role = 'USER'

      mockEnforcer.deleteRoleForUser.mockResolvedValue(true)

      const result = await PermissionService.deleteRoleForUser(userId, role)

      expect(result).toBe(true)
      expect(mockEnforcer.deleteRoleForUser).toHaveBeenCalledWith(userId, role)
    })

    it('should get roles for user', async () => {
      const userId = faker.string.uuid()
      const roles = ['USER', 'ADMIN']

      mockEnforcer.getRolesForUser.mockResolvedValue(roles)

      const result = await PermissionService.getRolesForUser(userId)

      expect(result).toEqual(roles)
      expect(mockEnforcer.getRolesForUser).toHaveBeenCalledWith(userId)
    })

    it('should get users for role', async () => {
      const role = 'ADMIN'
      const users = [faker.string.uuid(), faker.string.uuid()]

      mockEnforcer.getUsersForRole.mockResolvedValue(users)

      const result = await PermissionService.getUsersForRole(role)

      expect(result).toEqual(users)
      expect(mockEnforcer.getUsersForRole).toHaveBeenCalledWith(role)
    })
  })

  describe('permission management', () => {
    it('should add permission for role successfully', async () => {
      const role = 'USER'
      const resource = 'goods'
      const action = 'read'

      mockEnforcer.addPermissionForUser.mockResolvedValue(true)

      const result = await PermissionService.addPermissionForRole(role, resource, action)

      expect(result).toBe(true)
      expect(mockEnforcer.addPermissionForUser).toHaveBeenCalledWith(role, resource, action)
    })

    it('should delete permission for role successfully', async () => {
      const role = 'USER'
      const resource = 'goods'
      const action = 'read'

      mockEnforcer.deletePermissionForUser.mockResolvedValue(true)

      const result = await PermissionService.deletePermissionForRole(role, resource, action)

      expect(result).toBe(true)
      expect(mockEnforcer.deletePermissionForUser).toHaveBeenCalledWith(role, resource, action)
    })

    it('should get permissions for role', async () => {
      const role = 'USER'
      const permissions = [['goods', 'read'], ['goods', 'update']]

      mockEnforcer.getPermissionsForUser.mockResolvedValue(permissions)

      const result = await PermissionService.getPermissionsForRole(role)

      expect(result).toEqual(permissions)
      expect(mockEnforcer.getPermissionsForUser).toHaveBeenCalledWith(role)
    })
  })

  describe('generateDataFilter', () => {
    it('should return empty filter for manage permission', async () => {
      const userId = faker.string.uuid()
      const filter = {
        userId,
        roles: ['ADMIN'],
        resource: ResourceModule.GOODS,
        action: PermissionAction.READ
      }

      // Mock manage permission
      mockEnforcer.enforce
        .mockResolvedValueOnce(true) // manage permission

      const result = await PermissionService.generateDataFilter(filter)

      expect(result).toEqual({})
    })

    it('should return user-specific filter for basic permission', async () => {
      const userId = faker.string.uuid()
      const filter = {
        userId,
        roles: ['USER'],
        resource: ResourceModule.GOODS,
        action: PermissionAction.READ
      }

      mockEnforcer.enforce
        .mockResolvedValueOnce(false) // no manage permission
        .mockResolvedValueOnce(true)  // has basic permission

      const result = await PermissionService.generateDataFilter(filter)

      expect(result).toEqual({
        OR: [
          { createdBy: userId },
          { userId: userId }
        ]
      })
    })

    it('should return impossible filter for no permission', async () => {
      const userId = faker.string.uuid()
      const filter = {
        userId,
        roles: ['USER'],
        resource: ResourceModule.GOODS,
        action: PermissionAction.DELETE
      }

      mockEnforcer.enforce.mockResolvedValue(false) // no permissions

      const result = await PermissionService.generateDataFilter(filter)

      expect(result).toEqual({
        id: 'impossible-id-that-never-exists'
      })
    })
  })

  describe('policy management', () => {
    it('should reload policy successfully', async () => {
      mockEnforcer.loadPolicy.mockResolvedValue(undefined)

      await PermissionService.reloadPolicy()

      expect(mockEnforcer.loadPolicy).toHaveBeenCalled()
    })

    it('should clear policy successfully', async () => {
      mockEnforcer.clearPolicy.mockResolvedValue(undefined)

      await PermissionService.clearPolicy()

      expect(mockEnforcer.clearPolicy).toHaveBeenCalled()
    })
  })
})
