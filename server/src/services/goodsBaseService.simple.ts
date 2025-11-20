import { prisma } from '../utils/database';
import { logger } from '../utils/logger';

/**
 * 简化的基地商品服务 - 专注于核心功能测试
 */
export class GoodsBaseServiceSimple {
  /**
   * 获取基地的商品列表 - 简化版本
   */
  static async getBaseGoodsList(baseId: number, params: any = {}) {
    try {
      const { current = 1, pageSize = 10, name, code } = params;
      const skip = (current - 1) * pageSize;

      // 简化查询：获取在该基地配置的商品
      const goodsBaseConfigs = await prisma.goodsBase.findMany({
        where: {
          baseId: baseId,
          isActive: true,
          ...(name && {
            goods: {
              name: {
                contains: name,
                mode: 'insensitive'
              }
            }
          }),
          ...(code && {
            goods: {
              code: {
                contains: code,
                mode: 'insensitive'
              }
            }
          })
        },
        include: {
          goods: true
        },
        skip,
        take: pageSize,
        orderBy: {
          createdAt: 'desc'
        }
      });

      // 获取总数
      const total = await prisma.goodsBase.count({
        where: {
          baseId: baseId,
          isActive: true
        }
      });

      // 转换数据格式
      const data = goodsBaseConfigs.map(config => ({
        id: config.goods.id,
        code: config.goods.code,
        name: config.goods.name,
        description: config.goods.description,
        retailPrice: config.retailPrice || config.goods.retailPrice,
        purchasePrice: config.purchasePrice || config.goods.purchasePrice,
        boxQuantity: config.goods.boxQuantity,
        packPerBox: config.goods.packPerBox,
        piecePerPack: config.goods.piecePerPack,
        imageUrl: config.goods.imageUrl,
        notes: config.notes || config.goods.notes,
        isActive: config.isActive,
        createdAt: config.goods.createdAt.toISOString(),
        updatedAt: config.goods.updatedAt.toISOString(),
        baseConfigId: config.id
      }));

      logger.info('获取基地商品列表成功', {
        service: 'milicard-api',
        baseId,
        count: data.length,
        total
      });

      return {
        success: true,
        data,
        total,
        current,
        pageSize
      };
    } catch (error) {
      logger.error('获取基地商品列表失败', { error, baseId, params, service: 'milicard-api' });
      throw error;
    }
  }

  /**
   * 将现有商品添加到基地
   */
  static async addGoodsToBase(goodsId: string, baseId: number, config: any = {}) {
    try {
      // 检查商品是否存在
      const goods = await prisma.goods.findUnique({
        where: { id: goodsId }
      });

      if (!goods) {
        throw new Error('商品不存在');
      }

      // 检查基地是否存在
      const base = await prisma.base.findUnique({
        where: { id: baseId }
      });

      if (!base) {
        throw new Error('基地不存在');
      }

      // 检查是否已经存在配置
      const existingConfig = await prisma.goodsBase.findUnique({
        where: {
          goodsId_baseId: {
            goodsId,
            baseId
          }
        }
      });

      if (existingConfig) {
        throw new Error('商品已在该基地配置');
      }

      // 创建商品基地配置
      const goodsBaseConfig = await prisma.goodsBase.create({
        data: {
          goodsId,
          baseId,
          isActive: config.isActive ?? true,
          retailPrice: config.retailPrice,
          purchasePrice: config.purchasePrice,
          notes: config.notes
        }
      });

      logger.info('商品添加到基地成功', {
        service: 'milicard-api',
        goodsId,
        baseId,
        configId: goodsBaseConfig.id
      });

      return {
        success: true,
        data: goodsBaseConfig
      };
    } catch (error) {
      logger.error('商品添加到基地失败', { error, goodsId, baseId, config, service: 'milicard-api' });
      throw error;
    }
  }

  /**
   * 获取所有商品（用于添加到基地）
   */
  static async getAllGoods(params: any = {}) {
    try {
      const { current = 1, pageSize = 10, name, code } = params;
      const skip = (current - 1) * pageSize;

      const where: any = {
        isActive: true
      };

      if (name) {
        where.name = {
          contains: name,
          mode: 'insensitive'
        };
      }

      if (code) {
        where.code = {
          contains: code,
          mode: 'insensitive'
        };
      }

      const [goods, total] = await Promise.all([
        prisma.goods.findMany({
          where,
          skip,
          take: pageSize,
          orderBy: {
            createdAt: 'desc'
          }
        }),
        prisma.goods.count({ where })
      ]);

      const data = goods.map(item => ({
        id: item.id,
        code: item.code,
        name: item.name,
        description: item.description,
        retailPrice: item.retailPrice,
        purchasePrice: item.purchasePrice,
        isActive: item.isActive,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString()
      }));

      return {
        success: true,
        data,
        total,
        current,
        pageSize
      };
    } catch (error) {
      logger.error('获取商品列表失败', { error, params, service: 'milicard-api' });
      throw error;
    }
  }
}
