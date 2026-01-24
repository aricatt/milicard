import { prisma } from '../utils/database';
import { logger } from '../utils/logger';
import { BaseError, BaseErrorType } from '../types/base';
import { buildGoodsSearchConditions } from '../utils/multilingualHelper';

export interface ConsumptionQueryParams {
  current?: number;
  pageSize?: number;
  goodsId?: string;
  goodsName?: string;
  locationId?: number;
  handlerId?: string;
  startDate?: string;
  endDate?: string;
}

export interface CreateConsumptionRequest {
  consumptionDate: string;
  goodsId: string;
  locationId: number;
  handlerId: string;
  // 期初（调入总量）
  openingBoxQty: number;
  openingPackQty: number;
  openingPieceQty: number;
  // 期末（用户填写的剩余）
  closingBoxQty: number;
  closingPackQty: number;
  closingPieceQty: number;
  notes?: string;
}

export interface NameI18n {
  en?: string;
  th?: string;
  vi?: string;
  [key: string]: string | undefined;
}

export interface ConsumptionResponse {
  id: string;
  consumptionDate: string;
  goodsId: string;
  goodsCode?: string;
  goodsName?: string;
  goodsNameI18n?: NameI18n | null;
  packPerBox?: number;
  piecePerPack?: number;
  locationId: number;
  locationName?: string;
  handlerId: string;
  handlerName?: string;
  baseId: number;
  baseName?: string;
  // 期初
  openingBoxQty: number;
  openingPackQty: number;
  openingPieceQty: number;
  // 期末
  closingBoxQty: number;
  closingPackQty: number;
  closingPieceQty: number;
  // 消耗
  boxQuantity: number;
  packQuantity: number;
  pieceQuantity: number;
  // 平均单价/箱
  unitPricePerBox: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export class ConsumptionService {
  /**
   * 获取基地消耗记录列表
   */
  static async getConsumptionList(
    baseId: number,
    params: ConsumptionQueryParams
  ): Promise<{ success: boolean; data: ConsumptionResponse[]; total: number }> {
    try {
      const { current = 1, pageSize = 10, goodsId, goodsName, locationId, handlerId, startDate, endDate } = params;
      const skip = (current - 1) * pageSize;

      const where: any = { baseId };

      if (goodsId) {
        where.goodsId = goodsId;
      }

      if (goodsName) {
        where.goods = {
          OR: buildGoodsSearchConditions(goodsName, false)
        };
      }

      if (locationId) {
        where.locationId = locationId;
      }

      if (handlerId) {
        where.handlerId = handlerId;
      }

      if (startDate || endDate) {
        where.consumptionDate = {};
        if (startDate) {
          where.consumptionDate.gte = new Date(startDate);
        }
        if (endDate) {
          where.consumptionDate.lte = new Date(endDate);
        }
      }

      const [records, total] = await Promise.all([
        prisma.stockConsumption.findMany({
          where,
          include: {
            goods: { 
              select: { 
                id: true, code: true, name: true, nameI18n: true, packPerBox: true, piecePerPack: true,
                category: { select: { code: true, name: true, nameI18n: true } },
                localSettings: {
                  where: { baseId },
                  select: {
                    packPrice: true, // 注意：packPrice 字段实际存储的是 piecePrice（每包的价格），历史原因字段名未修改
                  }
                }
              } 
            },
            location: { select: { id: true, name: true } },
            handler: { select: { id: true, name: true } },
            base: { select: { id: true, name: true } }
          },
          orderBy: [
            { consumptionDate: 'desc' },
            { createdAt: 'desc' }
          ],
          skip,
          take: pageSize
        }),
        prisma.stockConsumption.count({ where })
      ]);

      const data = records.map(record => {
        // 计算拿货价（基于 packPrice）
        let calculatedCostPrice = 0;
        const packPerBox = Number(record.goods?.packPerBox) || 1;
        const piecePerPack = Number(record.goods?.piecePerPack) || 1;
        const packPrice = (record.goods as any)?.localSettings?.[0]?.packPrice;
        
        if (packPrice) {
          // packPrice 实际是 piecePrice（每包的价格）
          const unitPricePerPiece = Number(packPrice);
          const unitPricePerPack = unitPricePerPiece * piecePerPack;  // 单价/盒 = 单价/包 × 多少包1盒
          const unitPricePerBox = unitPricePerPack * packPerBox;      // 单价/箱 = 单价/盒 × 多少盒1箱
          
          // 拿货价 = 箱数×单价/箱 + 盒数×单价/盒 + 包数×单价/包
          calculatedCostPrice = 
            Number(record.boxQuantity) * unitPricePerBox +
            Number(record.packQuantity) * unitPricePerPack +
            Number(record.pieceQuantity) * unitPricePerPiece;
        }
        
        return {
          id: record.id,
          consumptionDate: record.consumptionDate.toISOString().split('T')[0],
          goodsId: record.goodsId,
          goodsCode: record.goods?.code || '',
          goodsName: record.goods?.name || '',
          goodsNameI18n: record.goods?.nameI18n as any,
          categoryCode: (record.goods as any)?.category?.code || '',
          categoryName: (record.goods as any)?.category?.name || '',
          categoryNameI18n: (record.goods as any)?.category?.nameI18n as any,
          packPerBox: record.goods?.packPerBox || 1,
          piecePerPack: record.goods?.piecePerPack || 1,
          locationId: record.locationId,
          locationName: record.location?.name || '',
          handlerId: record.handlerId,
          handlerName: record.handler?.name || '',
          baseId: record.baseId,
          baseName: record.base?.name || '',
          openingBoxQty: record.openingBoxQty,
          openingPackQty: record.openingPackQty,
          openingPieceQty: record.openingPieceQty,
          closingBoxQty: record.closingBoxQty,
          closingPackQty: record.closingPackQty,
          closingPieceQty: record.closingPieceQty,
          boxQuantity: record.boxQuantity,
          packQuantity: record.packQuantity,
          pieceQuantity: record.pieceQuantity,
          unitPricePerBox: Number(record.unitPricePerBox),
          calculatedCostPrice, // 新增：基于 packPrice 计算的拿货价
          notes: record.notes || undefined,
          createdAt: record.createdAt.toISOString(),
          updatedAt: record.updatedAt.toISOString()
        };
      });

      return { success: true, data, total };

    } catch (error) {
      logger.error('获取消耗记录列表失败', {
        error: error instanceof Error ? error.message : String(error),
        baseId,
        params,
        service: 'milicard-api'
      });
      throw new BaseError('获取消耗记录列表失败', BaseErrorType.DATABASE_ERROR);
    }
  }

  /**
   * 创建消耗记录
   */
  static async createConsumption(
    baseId: number,
    data: CreateConsumptionRequest,
    userId: string
  ): Promise<ConsumptionResponse> {
    try {
      // 验证必填字段
      if (!data.consumptionDate || !data.goodsId || !data.locationId || !data.handlerId) {
        throw new BaseError('缺少必填字段', BaseErrorType.VALIDATION_ERROR);
      }

      // 验证商品是否存在且在该基地有配置
      const goodsSetting = await prisma.goodsLocalSetting.findFirst({
        where: {
          goodsId: data.goodsId,
          baseId: baseId,
          isActive: true
        },
        include: {
          goods: true
        }
      });
      if (!goodsSetting || !goodsSetting.goods) {
        throw new BaseError('商品不存在或未在该基地启用', BaseErrorType.RESOURCE_NOT_FOUND);
      }
      const goods = goodsSetting.goods;

      // 验证位置是否存在
      const location = await prisma.location.findFirst({
        where: { id: data.locationId, baseId }
      });
      if (!location) {
        throw new BaseError('直播间/仓库不存在或不属于该基地', BaseErrorType.RESOURCE_NOT_FOUND);
      }

      // 验证主播是否存在
      const handler = await prisma.personnel.findFirst({
        where: { id: data.handlerId, baseId }
      });
      if (!handler) {
        throw new BaseError('主播不存在或不属于该基地', BaseErrorType.RESOURCE_NOT_FOUND);
      }

      // 获取平均单价/箱（从Inventory获取）
      const inventory = await prisma.inventory.findFirst({
        where: { goodsId: data.goodsId, baseId }
      });
      const unitPricePerBox = inventory?.averageCost || 0;

      // 获取换算关系
      const packPerBox = goods.packPerBox || 1;
      const piecePerPack = goods.piecePerPack || 1;
      const piecesPerBox = packPerBox * piecePerPack;

      // 将期初和期末转换为总包数（最小单位）
      const openingTotal = data.openingBoxQty * piecesPerBox + data.openingPackQty * piecePerPack + data.openingPieceQty;
      const closingTotal = data.closingBoxQty * piecesPerBox + data.closingPackQty * piecePerPack + data.closingPieceQty;

      // 验证期末不能超过期初
      if (closingTotal > openingTotal) {
        throw new BaseError(
          `期末数量(${data.closingBoxQty}箱${data.closingPackQty}盒${data.closingPieceQty}包)超过期初数量(${data.openingBoxQty}箱${data.openingPackQty}盒${data.openingPieceQty}包)`,
          BaseErrorType.VALIDATION_ERROR
        );
      }

      const consumptionTotal = openingTotal - closingTotal;

      // 将消耗总量转换回箱-盒-包
      const boxQuantity = Math.floor(consumptionTotal / piecesPerBox);
      const remainingAfterBox = consumptionTotal % piecesPerBox;
      const packQuantity = Math.floor(remainingAfterBox / piecePerPack);
      const pieceQuantity = remainingAfterBox % piecePerPack;

      // 创建消耗记录
      const record = await prisma.stockConsumption.create({
        data: {
          consumptionDate: new Date(data.consumptionDate),
          goodsId: data.goodsId,
          locationId: data.locationId,
          handlerId: data.handlerId,
          baseId,
          openingBoxQty: data.openingBoxQty,
          openingPackQty: data.openingPackQty,
          openingPieceQty: data.openingPieceQty,
          closingBoxQty: data.closingBoxQty,
          closingPackQty: data.closingPackQty,
          closingPieceQty: data.closingPieceQty,
          boxQuantity,
          packQuantity,
          pieceQuantity,
          unitPricePerBox,
          notes: data.notes,
          createdBy: userId,
          updatedBy: userId
        },
        include: {
          goods: { select: { id: true, code: true, name: true, nameI18n: true, packPerBox: true, piecePerPack: true } },
          location: { select: { id: true, name: true } },
          handler: { select: { id: true, name: true } },
          base: { select: { id: true, name: true } }
        }
      });

      logger.info('消耗记录创建成功', {
        recordId: record.id,
        baseId,
        userId,
        service: 'milicard-api'
      });

      return {
        id: record.id,
        consumptionDate: record.consumptionDate.toISOString().split('T')[0],
        goodsId: record.goodsId,
        goodsCode: record.goods?.code || '',
        goodsName: record.goods?.name || '',
        goodsNameI18n: record.goods?.nameI18n as any,
        packPerBox: record.goods?.packPerBox || 1,
        piecePerPack: record.goods?.piecePerPack || 1,
        locationId: record.locationId,
        locationName: record.location?.name || '',
        handlerId: record.handlerId,
        handlerName: record.handler?.name || '',
        baseId: record.baseId,
        baseName: record.base?.name || '',
        openingBoxQty: record.openingBoxQty,
        openingPackQty: record.openingPackQty,
        openingPieceQty: record.openingPieceQty,
        closingBoxQty: record.closingBoxQty,
        closingPackQty: record.closingPackQty,
        closingPieceQty: record.closingPieceQty,
        boxQuantity: record.boxQuantity,
        packQuantity: record.packQuantity,
        pieceQuantity: record.pieceQuantity,
        unitPricePerBox: Number(record.unitPricePerBox),
        notes: record.notes || undefined,
        createdAt: record.createdAt.toISOString(),
        updatedAt: record.updatedAt.toISOString()
      };

    } catch (error) {
      logger.error('创建消耗记录失败', {
        error: error instanceof Error ? error.message : String(error),
        baseId,
        data,
        userId,
        service: 'milicard-api'
      });
      // 处理唯一约束冲突错误
      if (error instanceof Error && error.message.includes('Unique constraint failed')) {
        throw new BaseError(
          '该日期已存在相同商品、直播间、主播的消耗记录，请勿重复录入',
          BaseErrorType.VALIDATION_ERROR
        );
      }
      throw error;
    }
  }

  /**
   * 获取期初数据（调入总量 - 已消耗量）
   * 按主播查询某商品调入给该主播的总量，并扣减已录入的消耗记录
   * 注意：直播间的货物归属是人，所以按 handlerId 查询
   */
  static async getOpeningStock(
    baseId: number,
    goodsId: string,
    handlerId: string
  ): Promise<{
    success: boolean;
    data: {
      openingBoxQty: number;
      openingPackQty: number;
      openingPieceQty: number;
      unitPricePerBox: number;
      packPerBox: number;
      piecePerPack: number;
    };
  }> {
    try {
      // 查询调入给该主播的调货记录（目标主播是该人）
      const transferRecords = await prisma.transferRecord.findMany({
        where: {
          baseId,
          destinationHandlerId: handlerId,
          goodsId
        },
        select: {
          boxQuantity: true,
          packQuantity: true,
          pieceQuantity: true
        }
      });

      // 计算调入总量
      const transferInBoxQty = transferRecords.reduce((sum, r) => sum + r.boxQuantity, 0);
      const transferInPackQty = transferRecords.reduce((sum, r) => sum + r.packQuantity, 0);
      const transferInPieceQty = transferRecords.reduce((sum, r) => sum + r.pieceQuantity, 0);

      // 查询该主播调出的调货记录（源主播是该人，且源位置是直播间类型）
      // 注意：只有从直播间调出时才扣减主播库存，从仓库调出时货物属于仓库而非经办人
      const transferOutRecords = await prisma.transferRecord.findMany({
        where: {
          baseId,
          sourceHandlerId: handlerId,
          goodsId,
          sourceLocation: {
            type: 'LIVE_ROOM'  // 只有从直播间调出才算主播的调出
          }
        },
        select: {
          boxQuantity: true,
          packQuantity: true,
          pieceQuantity: true
        }
      });

      // 计算调出总量
      const transferOutBoxQty = transferOutRecords.reduce((sum, r) => sum + r.boxQuantity, 0);
      const transferOutPackQty = transferOutRecords.reduce((sum, r) => sum + r.packQuantity, 0);
      const transferOutPieceQty = transferOutRecords.reduce((sum, r) => sum + r.pieceQuantity, 0);

      // 查询该主播已录入的消耗记录
      const consumptionRecords = await prisma.stockConsumption.findMany({
        where: {
          baseId,
          handlerId,
          goodsId
        },
        select: {
          boxQuantity: true,
          packQuantity: true,
          pieceQuantity: true
        }
      });

      // 计算已消耗总量
      const consumedBoxQty = consumptionRecords.reduce((sum, r) => sum + r.boxQuantity, 0);
      const consumedPackQty = consumptionRecords.reduce((sum, r) => sum + r.packQuantity, 0);
      const consumedPieceQty = consumptionRecords.reduce((sum, r) => sum + r.pieceQuantity, 0);

      // 获取商品信息（换算关系）
      const goods = await prisma.goods.findUnique({
        where: { id: goodsId },
        select: { packPerBox: true, piecePerPack: true }
      });
      const packPerBox = goods?.packPerBox || 1;
      const piecePerPack = goods?.piecePerPack || 1;
      const piecesPerBox = packPerBox * piecePerPack;

      // 将调入、调出和消耗都转换为总包数（最小单位）
      const transferInTotal = transferInBoxQty * piecesPerBox + transferInPackQty * piecePerPack + transferInPieceQty;
      const transferOutTotal = transferOutBoxQty * piecesPerBox + transferOutPackQty * piecePerPack + transferOutPieceQty;
      const consumedTotal = consumedBoxQty * piecesPerBox + consumedPackQty * piecePerPack + consumedPieceQty;
      
      // 计算期初总量（包）= 调入 - 调出 - 已消耗
      const openingTotal = transferInTotal - transferOutTotal - consumedTotal;

      // 将期初总量转换回箱-盒-包
      const openingBoxQty = Math.floor(openingTotal / piecesPerBox);
      const remainingAfterBox = openingTotal % piecesPerBox;
      const openingPackQty = Math.floor(remainingAfterBox / piecePerPack);
      const openingPieceQty = remainingAfterBox % piecePerPack;

      // 获取平均单价/箱（从Inventory获取）
      const inventory = await prisma.inventory.findFirst({
        where: { goodsId, baseId }
      });
      const unitPricePerBox = inventory?.averageCost ? Number(inventory.averageCost) : 0;

      return {
        success: true,
        data: {
          openingBoxQty,
          openingPackQty,
          openingPieceQty,
          unitPricePerBox,
          packPerBox,
          piecePerPack
        }
      };

    } catch (error) {
      logger.error('获取期初数据失败', {
        error: error instanceof Error ? error.message : String(error),
        baseId,
        goodsId,
        handlerId,
        service: 'milicard-api'
      });
      throw new BaseError('获取期初数据失败', BaseErrorType.DATABASE_ERROR);
    }
  }

  /**
   * 导入消耗记录（通过名称匹配）
   * 与"添加消耗记录"表单规则一致：
   * - 用户提供期末数量（剩余数量）
   * - 系统动态计算期初数量和消耗数量
   */
  static async importConsumption(
    baseId: number,
    data: {
      consumptionDate: string;
      goodsName: string;
      locationName: string;
      handlerName: string;
      // 期末数量（用户填写的剩余数量）
      closingBoxQty?: number;
      closingPackQty?: number;
      closingPieceQty?: number;
      notes?: string;
    },
    userId: string
  ): Promise<ConsumptionResponse> {
    try {
      // 验证必填字段
      if (!data.consumptionDate || !data.goodsName || !data.locationName || !data.handlerName) {
        throw new BaseError('缺少必填字段', BaseErrorType.VALIDATION_ERROR);
      }

      // 根据名称查找商品（通过基地配置）
      const goodsSetting = await prisma.goodsLocalSetting.findFirst({
        where: {
          baseId: baseId,
          isActive: true,
          goods: {
            name: data.goodsName
          }
        },
        include: {
          goods: true
        }
      });
      if (!goodsSetting || !goodsSetting.goods) {
        throw new BaseError(`商品不存在或未在该基地启用: ${data.goodsName}`, BaseErrorType.RESOURCE_NOT_FOUND);
      }
      const goods = goodsSetting.goods;

      // 根据名称查找位置
      const location = await prisma.location.findFirst({
        where: { name: data.locationName, baseId }
      });
      if (!location) {
        throw new BaseError(`直播间不存在: ${data.locationName}`, BaseErrorType.RESOURCE_NOT_FOUND);
      }

      // 根据名称查找主播
      const handler = await prisma.personnel.findFirst({
        where: { name: data.handlerName, baseId }
      });
      if (!handler) {
        throw new BaseError(`主播不存在: ${data.handlerName}`, BaseErrorType.RESOURCE_NOT_FOUND);
      }

      // 动态获取期初数据（与添加消耗记录表单一致）
      const openingStockResult = await this.getOpeningStock(baseId, goods.id, handler.id);
      const { openingBoxQty, openingPackQty, openingPieceQty, unitPricePerBox } = openingStockResult.data;

      // 期末数量（用户填写的剩余数量）
      const closingBoxQty = data.closingBoxQty || 0;
      const closingPackQty = data.closingPackQty || 0;
      const closingPieceQty = data.closingPieceQty || 0;

      // 获取换算关系
      const packPerBox = goods.packPerBox || 1;
      const piecePerPack = goods.piecePerPack || 1;
      const piecesPerBox = packPerBox * piecePerPack;

      // 将期初和期末转换为总包数（最小单位）
      const openingTotal = openingBoxQty * piecesPerBox + openingPackQty * piecePerPack + openingPieceQty;
      const closingTotal = closingBoxQty * piecesPerBox + closingPackQty * piecePerPack + closingPieceQty;

      // 验证期末不能超过期初
      if (closingTotal > openingTotal) {
        throw new BaseError(
          `期末数量(${closingBoxQty}箱${closingPackQty}盒${closingPieceQty}包)超过期初数量(${openingBoxQty}箱${openingPackQty}盒${openingPieceQty}包)`,
          BaseErrorType.VALIDATION_ERROR
        );
      }

      const consumptionTotal = openingTotal - closingTotal;

      // 将消耗总量转换回箱-盒-包
      const boxQuantity = Math.floor(consumptionTotal / piecesPerBox);
      const remainingAfterBox = consumptionTotal % piecesPerBox;
      const packQuantity = Math.floor(remainingAfterBox / piecePerPack);
      const pieceQuantity = remainingAfterBox % piecePerPack;

      // 创建消耗记录
      const record = await prisma.stockConsumption.create({
        data: {
          consumptionDate: new Date(data.consumptionDate),
          goodsId: goods.id,
          locationId: location.id,
          handlerId: handler.id,
          baseId,
          openingBoxQty,
          openingPackQty,
          openingPieceQty,
          closingBoxQty,
          closingPackQty,
          closingPieceQty,
          boxQuantity,
          packQuantity,
          pieceQuantity,
          unitPricePerBox,
          notes: data.notes,
          createdBy: userId,
          updatedBy: userId
        },
        include: {
          goods: { select: { id: true, code: true, name: true, nameI18n: true, packPerBox: true, piecePerPack: true } },
          location: { select: { id: true, name: true } },
          handler: { select: { id: true, name: true } },
          base: { select: { id: true, name: true } }
        }
      });

      logger.info('消耗记录导入成功', {
        recordId: record.id,
        goodsName: data.goodsName,
        baseId,
        userId,
        service: 'milicard-api'
      });

      return {
        id: record.id,
        consumptionDate: record.consumptionDate.toISOString().split('T')[0],
        goodsId: record.goodsId,
        goodsCode: record.goods?.code || '',
        goodsName: record.goods?.name || '',
        goodsNameI18n: record.goods?.nameI18n as any,
        packPerBox: record.goods?.packPerBox || 1,
        piecePerPack: record.goods?.piecePerPack || 1,
        locationId: record.locationId,
        locationName: record.location?.name || '',
        handlerId: record.handlerId,
        handlerName: record.handler?.name || '',
        baseId: record.baseId,
        baseName: record.base?.name || '',
        openingBoxQty: record.openingBoxQty,
        openingPackQty: record.openingPackQty,
        openingPieceQty: record.openingPieceQty,
        closingBoxQty: record.closingBoxQty,
        closingPackQty: record.closingPackQty,
        closingPieceQty: record.closingPieceQty,
        boxQuantity: record.boxQuantity,
        packQuantity: record.packQuantity,
        pieceQuantity: record.pieceQuantity,
        unitPricePerBox: Number(record.unitPricePerBox),
        notes: record.notes || undefined,
        createdAt: record.createdAt.toISOString(),
        updatedAt: record.updatedAt.toISOString()
      };

    } catch (error) {
      logger.error('导入消耗记录失败', {
        error: error instanceof Error ? error.message : String(error),
        baseId,
        data,
        userId,
        service: 'milicard-api'
      });
      throw error;
    }
  }

  /**
   * 删除消耗记录
   */
  static async deleteConsumption(baseId: number, recordId: string): Promise<void> {
    try {
      const record = await prisma.stockConsumption.findFirst({
        where: { id: recordId, baseId },
        include: {
          anchorProfit: true, // 检查是否有关联的利润记录
        }
      });

      if (!record) {
        throw new BaseError('消耗记录不存在', BaseErrorType.RESOURCE_NOT_FOUND);
      }

      // 检查是否有关联的利润数据
      if (record.anchorProfit) {
        throw new BaseError(
          '该消耗记录已关联主播利润数据，无法删除。请先删除关联的利润记录。',
          BaseErrorType.VALIDATION_ERROR
        );
      }

      await prisma.stockConsumption.delete({
        where: { id: recordId }
      });

      logger.info('消耗记录删除成功', {
        recordId,
        baseId,
        service: 'milicard-api'
      });

    } catch (error) {
      logger.error('删除消耗记录失败', {
        error: error instanceof Error ? error.message : String(error),
        baseId,
        recordId,
        service: 'milicard-api'
      });
      throw error;
    }
  }

  /**
   * 更新消耗记录
   */
  static async updateConsumption(
    baseId: number,
    recordId: string,
    data: CreateConsumptionRequest,
    userId: string
  ): Promise<ConsumptionResponse> {
    try {
      // 验证记录是否存在
      const existingRecord = await prisma.stockConsumption.findFirst({
        where: { id: recordId, baseId }
      });

      if (!existingRecord) {
        throw new BaseError('消耗记录不存在', BaseErrorType.RESOURCE_NOT_FOUND);
      }

      // 验证必填字段
      if (!data.consumptionDate || !data.goodsId || !data.locationId || !data.handlerId) {
        throw new BaseError('缺少必填字段', BaseErrorType.VALIDATION_ERROR);
      }

      // 验证商品是否存在且在该基地有配置
      const goodsSetting = await prisma.goodsLocalSetting.findFirst({
        where: {
          goodsId: data.goodsId,
          baseId: baseId,
          isActive: true
        },
        include: {
          goods: true
        }
      });
      if (!goodsSetting || !goodsSetting.goods) {
        throw new BaseError('商品不存在或未在该基地启用', BaseErrorType.RESOURCE_NOT_FOUND);
      }
      const goods = goodsSetting.goods;

      // 验证位置是否存在
      const location = await prisma.location.findFirst({
        where: { id: data.locationId, baseId }
      });
      if (!location) {
        throw new BaseError('直播间/仓库不存在或不属于该基地', BaseErrorType.RESOURCE_NOT_FOUND);
      }

      // 验证主播是否存在
      const handler = await prisma.personnel.findFirst({
        where: { id: data.handlerId, baseId }
      });
      if (!handler) {
        throw new BaseError('主播不存在或不属于该基地', BaseErrorType.RESOURCE_NOT_FOUND);
      }

      // 获取平均单价/箱（从Inventory获取）
      const inventory = await prisma.inventory.findFirst({
        where: { goodsId: data.goodsId, baseId }
      });
      const unitPricePerBox = inventory?.averageCost || 0;

      // 获取换算关系
      const packPerBox = goods.packPerBox || 1;
      const piecePerPack = goods.piecePerPack || 1;
      const piecesPerBox = packPerBox * piecePerPack;

      // 将期初和期末转换为总包数（最小单位）
      const openingTotal = data.openingBoxQty * piecesPerBox + data.openingPackQty * piecePerPack + data.openingPieceQty;
      const closingTotal = data.closingBoxQty * piecesPerBox + data.closingPackQty * piecePerPack + data.closingPieceQty;

      // 验证期末不能超过期初
      if (closingTotal > openingTotal) {
        throw new BaseError(
          `期末数量(${data.closingBoxQty}箱${data.closingPackQty}盒${data.closingPieceQty}包)超过期初数量(${data.openingBoxQty}箱${data.openingPackQty}盒${data.openingPieceQty}包)`,
          BaseErrorType.VALIDATION_ERROR
        );
      }

      const consumptionTotal = openingTotal - closingTotal;

      // 将消耗总量转换回箱-盒-包
      const boxQuantity = Math.floor(consumptionTotal / piecesPerBox);
      const remainingAfterBox = consumptionTotal % piecesPerBox;
      const packQuantity = Math.floor(remainingAfterBox / piecePerPack);
      const pieceQuantity = remainingAfterBox % piecePerPack;

      // 更新消耗记录
      const record = await prisma.stockConsumption.update({
        where: { id: recordId },
        data: {
          consumptionDate: new Date(data.consumptionDate),
          goodsId: data.goodsId,
          locationId: data.locationId,
          handlerId: data.handlerId,
          openingBoxQty: data.openingBoxQty,
          openingPackQty: data.openingPackQty,
          openingPieceQty: data.openingPieceQty,
          closingBoxQty: data.closingBoxQty,
          closingPackQty: data.closingPackQty,
          closingPieceQty: data.closingPieceQty,
          boxQuantity,
          packQuantity,
          pieceQuantity,
          unitPricePerBox,
          notes: data.notes,
          updatedBy: userId
        },
        include: {
          goods: { select: { id: true, code: true, name: true, nameI18n: true, packPerBox: true, piecePerPack: true } },
          location: { select: { id: true, name: true } },
          handler: { select: { id: true, name: true } },
          base: { select: { id: true, name: true } }
        }
      });

      logger.info('消耗记录更新成功', {
        recordId: record.id,
        baseId,
        userId,
        service: 'milicard-api'
      });

      return {
        id: record.id,
        consumptionDate: record.consumptionDate.toISOString().split('T')[0],
        goodsId: record.goodsId,
        goodsCode: record.goods?.code || '',
        goodsName: record.goods?.name || '',
        goodsNameI18n: record.goods?.nameI18n as any,
        packPerBox: record.goods?.packPerBox || 1,
        piecePerPack: record.goods?.piecePerPack || 1,
        locationId: record.locationId,
        locationName: record.location?.name || '',
        handlerId: record.handlerId,
        handlerName: record.handler?.name || '',
        baseId: record.baseId,
        baseName: record.base?.name || '',
        openingBoxQty: record.openingBoxQty,
        openingPackQty: record.openingPackQty,
        openingPieceQty: record.openingPieceQty,
        closingBoxQty: record.closingBoxQty,
        closingPackQty: record.closingPackQty,
        closingPieceQty: record.closingPieceQty,
        boxQuantity: record.boxQuantity,
        packQuantity: record.packQuantity,
        pieceQuantity: record.pieceQuantity,
        unitPricePerBox: Number(record.unitPricePerBox),
        notes: record.notes || undefined,
        createdAt: record.createdAt.toISOString(),
        updatedAt: record.updatedAt.toISOString()
      };

    } catch (error) {
      logger.error('更新消耗记录失败', {
        error: error instanceof Error ? error.message : String(error),
        baseId,
        recordId,
        data,
        userId,
        service: 'milicard-api'
      });
      throw error;
    }
  }

  /**
   * 获取消耗统计
   */
  static async getConsumptionStats(baseId: number): Promise<{
    success: boolean;
    data: {
      totalRecords: number;
      totalGoods: number;
      totalBoxQuantity: number;
      totalPackQuantity: number;
      totalPieceQuantity: number;
      todayRecords: number;
    };
  }> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const [totalRecords, totalGoods, quantityStats, todayRecords] = await Promise.all([
        prisma.stockConsumption.count({ where: { baseId } }),
        prisma.stockConsumption.groupBy({
          by: ['goodsId'],
          where: { baseId }
        }),
        prisma.stockConsumption.aggregate({
          where: { baseId },
          _sum: {
            boxQuantity: true,
            packQuantity: true,
            pieceQuantity: true
          }
        }),
        prisma.stockConsumption.count({
          where: {
            baseId,
            consumptionDate: { gte: today, lt: tomorrow }
          }
        })
      ]);

      return {
        success: true,
        data: {
          totalRecords,
          totalGoods: totalGoods.length,
          totalBoxQuantity: quantityStats._sum.boxQuantity || 0,
          totalPackQuantity: quantityStats._sum.packQuantity || 0,
          totalPieceQuantity: quantityStats._sum.pieceQuantity || 0,
          todayRecords
        }
      };

    } catch (error) {
      logger.error('获取消耗统计失败', {
        error: error instanceof Error ? error.message : String(error),
        baseId,
        service: 'milicard-api'
      });
      throw new BaseError('获取消耗统计失败', BaseErrorType.DATABASE_ERROR);
    }
  }
}
