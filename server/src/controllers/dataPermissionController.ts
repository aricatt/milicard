/**
 * 数据权限控制器
 * 管理数据权限规则和字段权限
 */
import { Request, Response } from 'express';
import { dataPermissionService } from '../services/dataPermissionService';
import { logger } from '../utils/logger';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 可用的值类型
const VALUE_TYPES = [
  { key: 'currentUser', label: '当前用户', description: '当前登录用户的ID' },
  { key: 'currentBase', label: '当前基地', description: '当前选择的基地ID' },
  { key: 'currentUserBases', label: '用户关联基地', description: '当前用户关联的所有基地' },
  { key: 'currentUserPoints', label: '用户拥有的点位', description: '当前用户作为老板的所有点位' },
  { key: 'currentUserDealerPoints', label: '用户负责的点位', description: '当前用户作为经销商的所有点位' },
  { key: 'fixed', label: '固定值', description: '指定的固定值' },
];

// 可用的操作符
const OPERATORS = [
  { key: 'eq', label: '等于', description: '字段值等于指定值' },
  { key: 'in', label: '包含于', description: '字段值在指定列表中' },
  { key: 'contains', label: '包含', description: '字段值包含指定字符串' },
  { key: 'notEq', label: '不等于', description: '字段值不等于指定值' },
];

// 可用的资源及其字段
const RESOURCES = [
  // ========== 基地管理 ==========
  {
    key: 'base',
    label: '基地',
    fields: [
      { key: 'id', label: '基地ID', type: 'number' },
      { key: 'createdBy', label: '创建人ID', type: 'string' },
    ],
  },
  {
    key: 'location',
    label: '直播间/仓库',
    fields: [
      { key: 'baseId', label: '基地ID', type: 'number' },
      { key: 'type', label: '类型', type: 'string' },
      { key: 'managerId', label: '负责人ID', type: 'string' },
    ],
  },
  {
    key: 'personnel',
    label: '人员',
    fields: [
      { key: 'baseId', label: '基地ID', type: 'number' },
      { key: 'type', label: '类型', type: 'string' },
      { key: 'userId', label: '用户ID', type: 'string' },
    ],
  },
  // ========== 点位管理 ==========
  {
    key: 'point',
    label: '点位',
    fields: [
      { key: 'ownerId', label: '老板ID', type: 'string' },
      { key: 'dealerId', label: '经销商ID', type: 'string' },
      { key: 'baseId', label: '基地ID', type: 'number' },
      { key: 'isActive', label: '是否启用', type: 'boolean' },
    ],
  },
  {
    key: 'pointOrder',
    label: '点位订单',
    fields: [
      { key: 'pointId', label: '点位ID', type: 'string' },
      { key: 'createdBy', label: '创建人ID', type: 'string' },
      { key: 'baseId', label: '基地ID', type: 'number' },
    ],
  },
  {
    key: 'pointInventory',
    label: '点位库存',
    fields: [
      { key: 'pointId', label: '点位ID', type: 'string' },
    ],
  },
  // ========== 商品管理 ==========
  {
    key: 'goods',
    label: '商品',
    fields: [
      { key: 'id', label: '商品ID', type: 'string' },
      { key: 'code', label: '商品编号', type: 'string' },
      { key: 'name', label: '商品名称', type: 'string' },
      { key: 'nameI18n', label: '商品名称(多语言)', type: 'string' },
      { key: 'manufacturer', label: '厂家名称', type: 'string' },
      { key: 'category', label: '品类', type: 'string' },
      { key: 'categoryId', label: '品类ID', type: 'string' },
      { key: 'packPerBox', label: '每箱盒数', type: 'number' },
      { key: 'piecePerPack', label: '每盒包数', type: 'number' },
      { key: 'description', label: '描述', type: 'string' },
      { key: 'imageUrl', label: '图片', type: 'string' },
      { key: 'isActive', label: '状态', type: 'boolean' },
      { key: 'baseId', label: '基地ID', type: 'number' },
      { key: 'createdBy', label: '创建人ID', type: 'string' },
      { key: 'createdAt', label: '创建时间', type: 'date' },
      { key: 'updatedAt', label: '更新时间', type: 'date' },
    ],
  },
  {
    key: 'goodsLocalSetting',
    label: '商品设置',
    fields: [
      { key: 'id', label: 'ID', type: 'string' },
      { key: 'goodsId', label: '商品ID', type: 'string' },
      { key: 'baseId', label: '基地ID', type: 'number' },
      { key: 'alias', label: '别名', type: 'string' },
      { key: 'retailPrice', label: '零售价(一箱)', type: 'number' },
      { key: 'packPrice', label: '平拆价(一包)', type: 'number' },
      { key: 'purchasePrice', label: '采购价', type: 'number' },
      { key: 'isActive', label: '状态', type: 'boolean' },
      { key: 'goods', label: '商品信息', type: 'object' },
      { key: 'createdAt', label: '创建时间', type: 'date' },
      { key: 'updatedAt', label: '更新时间', type: 'date' },
    ],
  },
  {
    key: 'category',
    label: '商品分类',
    fields: [
      { key: 'id', label: '分类ID', type: 'string' },
      { key: 'code', label: '分类编号', type: 'string' },
      { key: 'name', label: '分类名称', type: 'string' },
      { key: 'nameI18n', label: '分类名称(多语言)', type: 'string' },
      { key: 'baseId', label: '基地ID', type: 'number' },
    ],
  },
  // ========== 库存管理 ==========
  {
    key: 'inventory',
    label: '库存',
    fields: [
      { key: 'locationId', label: '位置ID', type: 'number' },
      { key: 'baseId', label: '基地ID', type: 'number' },
    ],
  },
  {
    key: 'purchaseOrder',
    label: '采购订单',
    fields: [
      { key: 'baseId', label: '基地ID', type: 'number' },
      { key: 'createdBy', label: '创建人ID', type: 'string' },
      { key: 'targetLocationId', label: '目标位置ID', type: 'number' },
    ],
  },
  {
    key: 'arrivalOrder',
    label: '到货单',
    fields: [
      { key: 'baseId', label: '基地ID', type: 'number' },
      { key: 'createdBy', label: '创建人ID', type: 'string' },
      { key: 'locationId', label: '位置ID', type: 'number' },
    ],
  },
  {
    key: 'transferOrder',
    label: '调货单',
    fields: [
      { key: 'baseId', label: '基地ID', type: 'number' },
      { key: 'createdBy', label: '创建人ID', type: 'string' },
      { key: 'fromLocationId', label: '来源位置ID', type: 'number' },
      { key: 'toLocationId', label: '目标位置ID', type: 'number' },
    ],
  },
  {
    key: 'stockConsumption',
    label: '消耗记录',
    fields: [
      { key: 'baseId', label: '基地ID', type: 'number' },
      { key: 'createdBy', label: '创建人ID', type: 'string' },
      { key: 'locationId', label: '位置ID', type: 'number' },
      { key: 'personnelId', label: '人员ID', type: 'string' },
    ],
  },
  {
    key: 'stockOutOrder',
    label: '出库单',
    fields: [
      { key: 'baseId', label: '基地ID', type: 'number' },
      { key: 'createdBy', label: '创建人ID', type: 'string' },
      { key: 'locationId', label: '位置ID', type: 'number' },
    ],
  },
  // ========== 用户管理 ==========
  {
    key: 'user',
    label: '用户',
    fields: [
      { key: 'id', label: '用户ID', type: 'string' },
      { key: 'createdBy', label: '创建人ID', type: 'string' },
    ],
  },
];

export class DataPermissionController {
  /**
   * 获取配置元数据
   * GET /api/v1/data-permissions/metadata
   */
  static async getMetadata(req: Request, res: Response) {
    res.json({
      success: true,
      data: {
        valueTypes: VALUE_TYPES,
        operators: OPERATORS,
        resources: RESOURCES,
      },
    });
  }

  /**
   * 获取角色的数据权限规则
   * GET /api/v1/roles/:roleId/data-permissions
   */
  static async getRoleDataRules(req: Request, res: Response) {
    try {
      const { roleId } = req.params;

      const rules = await dataPermissionService.getRoleDataRules(roleId);

      res.json({
        success: true,
        data: rules,
      });
    } catch (error) {
      logger.error('获取角色数据权限规则失败', {
        error: error instanceof Error ? error.message : String(error),
        roleId: req.params.roleId,
      });

      res.status(500).json({
        success: false,
        message: '获取数据权限规则失败',
      });
    }
  }

  /**
   * 创建数据权限规则
   * POST /api/v1/roles/:roleId/data-permissions
   */
  static async createRule(req: Request, res: Response) {
    try {
      const { roleId } = req.params;
      const { resource, field, operator, valueType, fixedValue, description } = req.body;

      // 验证必填字段
      if (!resource || !field || !operator || !valueType) {
        return res.status(400).json({
          success: false,
          message: '缺少必填字段',
        });
      }

      // 验证角色存在
      const role = await prisma.role.findUnique({ where: { id: roleId } });
      if (!role) {
        return res.status(404).json({
          success: false,
          message: '角色不存在',
        });
      }

      const rule = await dataPermissionService.createRule({
        roleId,
        resource,
        field,
        operator,
        valueType,
        fixedValue,
        description,
      });

      res.status(201).json({
        success: true,
        data: rule,
        message: '创建数据权限规则成功',
      });
    } catch (error) {
      logger.error('创建数据权限规则失败', {
        error: error instanceof Error ? error.message : String(error),
        roleId: req.params.roleId,
        body: req.body,
      });

      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : '创建数据权限规则失败',
      });
    }
  }

  /**
   * 更新数据权限规则
   * PUT /api/v1/data-permissions/:ruleId
   */
  static async updateRule(req: Request, res: Response) {
    try {
      const { ruleId } = req.params;
      const { operator, valueType, fixedValue, description, isActive } = req.body;

      const rule = await prisma.dataPermissionRule.update({
        where: { id: ruleId },
        data: {
          operator,
          valueType,
          fixedValue,
          description,
          isActive,
        },
      });

      res.json({
        success: true,
        data: rule,
        message: '更新数据权限规则成功',
      });
    } catch (error) {
      logger.error('更新数据权限规则失败', {
        error: error instanceof Error ? error.message : String(error),
        ruleId: req.params.ruleId,
      });

      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : '更新数据权限规则失败',
      });
    }
  }

  /**
   * 删除数据权限规则
   * DELETE /api/v1/data-permissions/:ruleId
   */
  static async deleteRule(req: Request, res: Response) {
    try {
      const { ruleId } = req.params;

      await dataPermissionService.deleteRule(ruleId);

      res.json({
        success: true,
        message: '删除数据权限规则成功',
      });
    } catch (error) {
      logger.error('删除数据权限规则失败', {
        error: error instanceof Error ? error.message : String(error),
        ruleId: req.params.ruleId,
      });

      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : '删除数据权限规则失败',
      });
    }
  }

  /**
   * 获取角色的字段权限
   * GET /api/v1/roles/:roleId/field-permissions
   */
  static async getRoleFieldPermissions(req: Request, res: Response) {
    try {
      const { roleId } = req.params;

      const permissions = await dataPermissionService.getRoleFieldPermissions(roleId);

      res.json({
        success: true,
        data: permissions,
      });
    } catch (error) {
      logger.error('获取角色字段权限失败', {
        error: error instanceof Error ? error.message : String(error),
        roleId: req.params.roleId,
      });

      res.status(500).json({
        success: false,
        message: '获取字段权限失败',
      });
    }
  }

  /**
   * 更新角色的字段权限
   * PUT /api/v1/roles/:roleId/field-permissions
   */
  static async updateFieldPermissions(req: Request, res: Response) {
    try {
      const { roleId } = req.params;
      const { permissions } = req.body;

      if (!Array.isArray(permissions)) {
        return res.status(400).json({
          success: false,
          message: 'permissions 必须是数组',
        });
      }

      // 批量更新字段权限
      const results = [];
      for (const perm of permissions) {
        const result = await dataPermissionService.updateFieldPermission({
          roleId,
          resource: perm.resource,
          field: perm.field,
          canRead: perm.canRead ?? true,
          canWrite: perm.canWrite ?? true,
        });
        results.push(result);
      }

      res.json({
        success: true,
        data: results,
        message: `更新了 ${results.length} 条字段权限`,
      });
    } catch (error) {
      logger.error('更新角色字段权限失败', {
        error: error instanceof Error ? error.message : String(error),
        roleId: req.params.roleId,
      });

      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : '更新字段权限失败',
      });
    }
  }

  /**
   * 重置指定资源的字段权限（清理所有配置）
   * DELETE /api/v1/roles/:roleId/field-permissions/:resource
   */
  static async resetResourceFieldPermissions(req: Request, res: Response) {
    try {
      const { roleId, resource } = req.params;

      const deleted = await dataPermissionService.deleteResourceFieldPermissions(roleId, resource);

      res.json({
        success: true,
        data: { count: deleted.count },
        message: `已清理 ${deleted.count} 条字段权限配置`,
      });
    } catch (error) {
      logger.error('重置资源字段权限失败', {
        error: error instanceof Error ? error.message : String(error),
        roleId: req.params.roleId,
        resource: req.params.resource,
      });

      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : '重置字段权限失败',
      });
    }
  }
}
