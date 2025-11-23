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
      const currentNum = parseInt(current) || 1;
      const pageSizeNum = parseInt(pageSize) || 10;
      const skip = (currentNum - 1) * pageSizeNum;

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
        take: pageSizeNum,
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
        alias: config.goods.alias,
        manufacturer: config.goods.manufacturer,
        description: config.goods.description,
        retailPrice: config.retailPrice || config.goods.retailPrice,
        packPrice: config.goods.packPrice,
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
        current: currentNum,
        pageSize: pageSizeNum
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
      const currentNum = parseInt(current) || 1;
      const pageSizeNum = parseInt(pageSize) || 10;
      const skip = (currentNum - 1) * pageSizeNum;

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
          take: pageSizeNum,
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
        alias: item.alias,
        manufacturer: item.manufacturer,
        description: item.description,
        retailPrice: item.retailPrice,
        packPrice: item.packPrice,
        purchasePrice: item.purchasePrice,
        boxQuantity: item.boxQuantity,
        packPerBox: item.packPerBox,
        piecePerPack: item.piecePerPack,
        isActive: item.isActive,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString()
      }));

      return {
        success: true,
        data,
        total,
        current: currentNum,
        pageSize: pageSizeNum
      };
    } catch (error) {
      logger.error('获取商品列表失败', { error, params, service: 'milicard-api' });
      throw error;
    }
  }

  /**
   * 更新商品信息
   */
  static async updateGoods(goodsId: string, updateData: any) {
    try {
      // 检查商品是否存在
      const existingGoods = await prisma.goods.findUnique({
        where: { id: goodsId }
      });

      if (!existingGoods) {
        throw new Error('商品不存在');
      }

      // 使用事务同时更新商品表和基地商品配置表
      const result = await prisma.$transaction(async (tx) => {
        // 更新商品基本信息
        const updatedGoods = await tx.goods.update({
          where: { id: goodsId },
          data: {
            name: updateData.name,
            alias: updateData.alias,
            manufacturer: updateData.manufacturer,
            description: updateData.description,
            retailPrice: updateData.retailPrice,
            packPrice: updateData.packPrice,
            purchasePrice: updateData.purchasePrice,
            boxQuantity: updateData.boxQuantity,
            packPerBox: updateData.packPerBox,
            piecePerPack: updateData.piecePerPack,
            updatedAt: new Date()
          }
        });

        // 更新所有基地的商品配置（如果存在零售价或采购价的话）
        if (updateData.retailPrice !== undefined || updateData.purchasePrice !== undefined) {
          await tx.goodsBase.updateMany({
            where: { goodsId: goodsId },
            data: {
              ...(updateData.retailPrice !== undefined && { retailPrice: updateData.retailPrice }),
              ...(updateData.purchasePrice !== undefined && { purchasePrice: updateData.purchasePrice }),
              updatedAt: new Date()
            }
          });
        }

        return updatedGoods;
      });

      return result;
    } catch (error) {
      logger.error('更新商品失败', { error, goodsId, updateData, service: 'milicard-api' });
      throw error;
    }
  }

  /**
   * 从基地删除商品
   */
  static async deleteGoodsFromBase(baseId: number, goodsId: string) {
    try {
      // 检查基地商品配置是否存在
      const goodsBaseConfig = await prisma.goodsBase.findFirst({
        where: {
          goodsId: goodsId,
          baseId: baseId
        }
      });

      if (!goodsBaseConfig) {
        throw new Error('该商品未在此基地配置');
      }

      // 删除基地商品配置
      await prisma.goodsBase.delete({
        where: {
          id: goodsBaseConfig.id
        }
      });

      return { message: '商品已从基地移除' };
    } catch (error) {
      logger.error('删除基地商品失败', { error, baseId, goodsId, service: 'milicard-api' });
      throw error;
    }
  }
}
