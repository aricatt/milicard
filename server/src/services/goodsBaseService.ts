import { prisma } from '../utils/database';
import { logger } from '../utils/logger';
import {
  CreateGoodsRequest,
  UpdateGoodsRequest,
  GoodsQueryParams,
  GoodsResponse,
  GoodsListResponse,
  GoodsError,
  GoodsErrorType
} from '../types/goods';

/**
 * 基地感知的商品服务类
 * 处理商品在特定基地的配置和管理
 */
export class GoodsBaseService {
  /**
   * 获取基地的商品列表
   */
  static async getBaseGoodsList(baseId: number, params: GoodsQueryParams): Promise<GoodsListResponse> {
    try {
      const { current = 1, pageSize = 10, name, code, isActive } = params;
      const skip = (current - 1) * pageSize;

      // 构建查询条件 - 只查询在该基地启用的商品
      const where: any = {
        goodsBases: {
          some: {
            baseId: baseId,
            isActive: isActive !== undefined ? isActive : true
          }
        }
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

      // 查询商品和总数
      const [goods, total] = await Promise.all([
        prisma.goods.findMany({
          where,
          skip,
          take: pageSize,
          include: {
            goodsBases: {
              where: { baseId },
              select: {
                isActive: true,
                retailPrice: true,
                purchasePrice: true,
                notes: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        }),
        prisma.goods.count({ where })
      ]);

      // 转换数据格式，包含基地特定信息
      const data = goods.map(goods => {
        const baseConfig = goods.goodsBases[0];
        return {
          id: goods.id,
          code: goods.code,
          name: goods.name,
          description: goods.description,
          retailPrice: baseConfig?.retailPrice || goods.retailPrice,
          purchasePrice: baseConfig?.purchasePrice || goods.purchasePrice,
          boxQuantity: goods.boxQuantity,
          packPerBox: goods.packPerBox,
          piecePerPack: goods.piecePerPack,
          imageUrl: goods.imageUrl,
          notes: baseConfig?.notes || goods.notes,
          isActive: baseConfig?.isActive || false,
          createdAt: goods.createdAt.toISOString(),
          updatedAt: goods.updatedAt.toISOString(),
          baseConfig: baseConfig
        };
      });

      logger.info('获取基地商品列表成功', {
        service: 'milicard-api',
        baseId,
        count: goods.length,
        total,
        params
      });

      return {
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
   * 将商品添加到基地
   */
  static async addGoodsToBase(
    goodsId: string, 
    baseId: number, 
    config: {
      retailPrice?: number;
      purchasePrice?: number;
      notes?: string;
      isActive?: boolean;
    }
  ): Promise<void> {
    try {
      // 检查商品是否存在
      const goods = await prisma.goods.findUnique({
        where: { id: goodsId }
      });

      if (!goods) {
        throw new GoodsError(
          GoodsErrorType.GOODS_NOT_FOUND,
          '商品不存在',
          404
        );
      }

      // 检查基地是否存在
      const base = await prisma.base.findUnique({
        where: { id: baseId }
      });

      if (!base) {
        throw new GoodsError(
          GoodsErrorType.INVALID_BASE,
          '基地不存在',
          404
        );
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
        throw new GoodsError(
          GoodsErrorType.GOODS_BASE_EXISTS,
          '商品已在该基地配置',
          409
        );
      }

      // 创建商品基地配置
      await prisma.goodsBase.create({
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
        config
      });
    } catch (error) {
      logger.error('商品添加到基地失败', { error, goodsId, baseId, config, service: 'milicard-api' });
      throw error;
    }
  }

  /**
   * 更新商品在基地的配置
   */
  static async updateGoodsBaseConfig(
    goodsId: string,
    baseId: number,
    config: {
      retailPrice?: number;
      purchasePrice?: number;
      notes?: string;
      isActive?: boolean;
    }
  ): Promise<void> {
    try {
      // 检查配置是否存在
      const existingConfig = await prisma.goodsBase.findUnique({
        where: {
          goodsId_baseId: {
            goodsId,
            baseId
          }
        }
      });

      if (!existingConfig) {
        throw new GoodsError(
          GoodsErrorType.GOODS_BASE_NOT_FOUND,
          '商品基地配置不存在',
          404
        );
      }

      // 更新配置
      await prisma.goodsBase.update({
        where: {
          goodsId_baseId: {
            goodsId,
            baseId
          }
        },
        data: {
          ...config,
          updatedAt: new Date()
        }
      });

      logger.info('商品基地配置更新成功', {
        service: 'milicard-api',
        goodsId,
        baseId,
        config
      });
    } catch (error) {
      logger.error('商品基地配置更新失败', { error, goodsId, baseId, config, service: 'milicard-api' });
      throw error;
    }
  }

  /**
   * 从基地移除商品
   */
  static async removeGoodsFromBase(goodsId: string, baseId: number): Promise<void> {
    try {
      // 检查配置是否存在
      const existingConfig = await prisma.goodsBase.findUnique({
        where: {
          goodsId_baseId: {
            goodsId,
            baseId
          }
        }
      });

      if (!existingConfig) {
        throw new GoodsError(
          GoodsErrorType.GOODS_BASE_NOT_FOUND,
          '商品基地配置不存在',
          404
        );
      }

      // 删除配置
      await prisma.goodsBase.delete({
        where: {
          goodsId_baseId: {
            goodsId,
            baseId
          }
        }
      });

      logger.info('商品从基地移除成功', {
        service: 'milicard-api',
        goodsId,
        baseId
      });
    } catch (error) {
      logger.error('商品从基地移除失败', { error, goodsId, baseId, service: 'milicard-api' });
      throw error;
    }
  }

  /**
   * 获取商品在各个基地的配置
   */
  static async getGoodsBaseConfigs(goodsId: string): Promise<any[]> {
    try {
      const configs = await prisma.goodsBase.findMany({
        where: { goodsId },
        include: {
          base: {
            select: {
              id: true,
              code: true,
              name: true,
              isActive: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      return configs.map(config => ({
        baseId: config.baseId,
        baseName: config.base.name,
        baseCode: config.base.code,
        isActive: config.isActive,
        retailPrice: config.retailPrice,
        purchasePrice: config.purchasePrice,
        notes: config.notes,
        createdAt: config.createdAt.toISOString(),
        updatedAt: config.updatedAt.toISOString()
      }));
    } catch (error) {
      logger.error('获取商品基地配置失败', { error, goodsId, service: 'milicard-api' });
      throw error;
    }
  }
}
