import { prisma } from '../utils/database';
import { logger } from '../utils/logger';
import { BaseError, BaseErrorType } from '../types/base';
import { GoodsCostService } from './goodsCostService';
import type {
  CreateArrivalRequest,
  UpdateArrivalRequest,
  ArrivalQueryParams,
  ArrivalResponse,
  ArrivalListResponse
} from '../types/arrival';

export class ArrivalRecordService {
  /**
   * 获取基地到货记录列表
   */
  static async getBaseArrivalRecords(
    baseId: number,
    params: ArrivalQueryParams
  ): Promise<ArrivalListResponse> {
    try {
      const {
        current = 1,
        pageSize = 10,
        warehouseId,
        purchaseOrderId,
        purchaseOrderNo,
        goodsId,
        goodsName,
        handlerId,
        startDate,
        endDate
      } = params;

      const skip = (current - 1) * pageSize;
      
      // 构建查询条件
      const where: any = {
        baseId: baseId
      };

      if (warehouseId) {
        where.locationId = warehouseId;
      }

      if (purchaseOrderId) {
        where.purchaseOrderId = purchaseOrderId;
      }

      // 采购编号模糊搜索
      if (purchaseOrderNo) {
        where.purchaseOrder = {
          code: {
            contains: purchaseOrderNo,
            mode: 'insensitive'
          }
        };
      }

      if (goodsId) {
        where.goodsId = goodsId;
      }

      // 商品名称模糊搜索
      if (goodsName) {
        where.goods = {
          name: {
            contains: goodsName,
            mode: 'insensitive'
          }
        };
      }

      if (handlerId) {
        where.handlerId = handlerId;
      }

      if (startDate || endDate) {
        where.arrivalDate = {};
        if (startDate) {
          where.arrivalDate.gte = new Date(startDate);
        }
        if (endDate) {
          where.arrivalDate.lte = new Date(endDate);
        }
      }

      // 执行查询
      const [records, total] = await Promise.all([
        prisma.arrivalRecord.findMany({
          where,
          skip,
          take: pageSize,
          orderBy: { arrivalDate: 'desc' },
          include: {
            purchaseOrder: true,
            goods: true,
            location: true,
            handler: true,
            base: true
          }
        }),
        prisma.arrivalRecord.count({ where })
      ]);

      const data = records.map(record => ({
        id: record.id,
        arrivalDate: record.arrivalDate.toISOString().split('T')[0],
        purchaseOrderId: record.purchaseOrderId,
        purchaseOrderNo: record.purchaseOrder?.code || '',
        purchaseDate: record.purchaseOrder?.purchaseDate?.toISOString().split('T')[0] || '',
        goodsId: record.goodsId,
        goodsCode: record.goods?.code || '',
        goodsName: record.goods?.name || '',
        locationId: record.locationId,
        locationName: record.location?.name || '',
        handlerId: record.handlerId,
        handlerName: record.handler?.name || '',
        baseId: record.baseId,
        baseName: record.base?.name || '',
        boxQuantity: record.boxQuantity,
        packQuantity: record.packQuantity,
        pieceQuantity: record.pieceQuantity,
        notes: record.notes || undefined,
        createdBy: record.createdBy || undefined,
        createdAt: record.createdAt.toISOString(),
        updatedAt: record.updatedAt.toISOString()
      }));

      return {
        success: true,
        data,
        total,
        current,
        pageSize
      };

    } catch (error) {
      logger.error('获取基地到货记录列表失败', {
        error: error instanceof Error ? error.message : String(error),
        baseId,
        params,
        service: 'milicard-api'
      });
      throw new BaseError('获取到货记录列表失败', BaseErrorType.DATABASE_ERROR);
    }
  }

  /**
   * 创建到货记录
   */
  static async createArrivalRecord(
    baseId: number,
    data: CreateArrivalRequest,
    userId: string
  ): Promise<ArrivalResponse> {
    try {
      // 验证必填字段（不需要goodsId，从采购单获取）
      if (!data.arrivalDate || !data.purchaseOrderId || 
          !data.locationId || !data.handlerId) {
        throw new BaseError('缺少必填字段', BaseErrorType.VALIDATION_ERROR);
      }

      // 验证采购订单是否存在且属于该基地，并获取采购数量和商品信息
      const purchaseOrder = await prisma.purchaseOrder.findFirst({
        where: {
          id: data.purchaseOrderId,
          baseId: baseId
        },
        include: {
          items: {
            include: {
              goods: {
                select: {
                  id: true,
                  packPerBox: true,
                  piecePerPack: true
                }
              }
            },
            take: 1  // 取第一个商品（一个采购单通常对应一个商品）
          }
        }
      });

      if (!purchaseOrder) {
        throw new BaseError('采购订单不存在或不属于该基地', BaseErrorType.RESOURCE_NOT_FOUND);
      }

      // 从采购单中获取商品ID和采购数量
      const purchaseItem = purchaseOrder.items[0];
      if (!purchaseItem) {
        throw new BaseError('采购订单没有关联商品', BaseErrorType.VALIDATION_ERROR);
      }

      const goodsId = purchaseItem.goodsId;
      const goods = purchaseItem.goods;
      const packPerBox = goods.packPerBox || 1;
      const piecePerPack = goods.piecePerPack || 1;

      // 计算采购数量（换算成最小单位：包）
      const purchasedPieces = 
        (purchaseItem.boxQuantity * packPerBox * piecePerPack) +
        (purchaseItem.packQuantity * piecePerPack) +
        purchaseItem.pieceQuantity;

      // 获取该采购单已有的所有到货记录的数量总和
      const existingArrivals = await prisma.arrivalRecord.aggregate({
        where: {
          purchaseOrderId: data.purchaseOrderId
        },
        _sum: {
          boxQuantity: true,
          packQuantity: true,
          pieceQuantity: true
        }
      });

      const arrivedBoxes = existingArrivals._sum.boxQuantity || 0;
      const arrivedPacks = existingArrivals._sum.packQuantity || 0;
      const arrivedPieces = existingArrivals._sum.pieceQuantity || 0;

      // 计算已到货数量（换算成最小单位：包）
      const totalArrivedPieces = 
        (arrivedBoxes * packPerBox * piecePerPack) +
        (arrivedPacks * piecePerPack) +
        arrivedPieces;

      // 计算本次录入数量（换算成最小单位：包）
      const newBoxQty = data.boxQuantity || 0;
      const newPackQty = data.packQuantity || 0;
      const newPieceQty = data.pieceQuantity || 0;
      const newArrivalPieces = 
        (newBoxQty * packPerBox * piecePerPack) +
        (newPackQty * piecePerPack) +
        newPieceQty;

      // 校验：总到货数量 ≤ 采购数量
      const totalAfterArrival = totalArrivedPieces + newArrivalPieces;
      if (totalAfterArrival > purchasedPieces) {
        // 计算剩余可到货数量，转换回箱/盒/包显示
        const remainingPieces = purchasedPieces - totalArrivedPieces;
        const remainingBoxes = Math.floor(remainingPieces / (packPerBox * piecePerPack));
        const remainingAfterBoxes = remainingPieces % (packPerBox * piecePerPack);
        const remainingPacks = Math.floor(remainingAfterBoxes / piecePerPack);
        const remainingPiecesOnly = remainingAfterBoxes % piecePerPack;
        
        let errorMsg = `到货数量超出采购数量！\n` +
          `采购数量: ${purchaseItem.boxQuantity}箱${purchaseItem.packQuantity}盒${purchaseItem.pieceQuantity}包\n` +
          `本次录入: ${newBoxQty}箱${newPackQty}盒${newPieceQty}包\n`;
        
        if (arrivedBoxes > 0 || arrivedPacks > 0 || arrivedPieces > 0) {
          errorMsg += `已到货: ${arrivedBoxes}箱${arrivedPacks}盒${arrivedPieces}包\n`;
        }
        
        errorMsg += `剩余可到货: ${remainingBoxes}箱${remainingPacks}盒${remainingPiecesOnly}包`;
        
        throw new BaseError(errorMsg, BaseErrorType.VALIDATION_ERROR);
      }

      // 验证位置是否存在且属于该基地
      const location = await prisma.location.findFirst({
        where: {
          id: data.locationId,
          baseId: baseId
        },
        select: {
          id: true,
          name: true,
          type: true
        }
      });

      if (!location) {
        throw new BaseError('位置不存在或不属于该基地', BaseErrorType.RESOURCE_NOT_FOUND);
      }

      // 验证经手人是否存在且属于该基地
      const handler = await prisma.personnel.findFirst({
        where: {
          id: data.handlerId,
          baseId: baseId
        },
        select: {
          id: true,
          name: true,
          role: true
        }
      });

      if (!handler) {
        throw new BaseError('经手人不存在或不属于该基地', BaseErrorType.RESOURCE_NOT_FOUND);
      }

      // 创建到货记录
      const record = await prisma.arrivalRecord.create({
        data: {
          arrivalDate: new Date(data.arrivalDate),
          purchaseOrderId: data.purchaseOrderId,
          goodsId: goodsId,  // 使用从采购单获取的商品ID
          locationId: data.locationId,
          handlerId: data.handlerId,
          baseId: baseId,
          boxQuantity: data.boxQuantity || 0,
          packQuantity: data.packQuantity || 0,
          pieceQuantity: data.pieceQuantity || 0,
          notes: data.notes,
          createdBy: userId,
          updatedBy: userId
        },
        include: {
          purchaseOrder: true,
          goods: true,
          location: true,
          handler: true,
          base: true
        }
      });

      logger.info('到货记录创建成功', {
        recordId: record.id,
        baseId,
        userId,
        service: 'milicard-api'
      });

      // 更新商品平均成本
      try {
        // 获取采购单价（每箱）
        const unitPricePerBox = Number(purchaseItem.unitPrice);
        
        // 计算当前库存（到货前的库存，以箱为单位）
        // 从所有到货记录中汇总（不包括本次）
        const existingStock = await prisma.arrivalRecord.aggregate({
          where: {
            goodsId: goodsId,
            baseId: baseId,
            id: { not: record.id }  // 排除本次到货
          },
          _sum: {
            boxQuantity: true
          }
        });
        
        const currentStockBoxes = existingStock._sum.boxQuantity || 0;
        const arrivalBoxes = data.boxQuantity || 0;
        
        // 更新平均成本
        await GoodsCostService.updateAverageCost(
          goodsId,
          baseId,
          unitPricePerBox,
          arrivalBoxes,
          currentStockBoxes
        );
        
        logger.info('商品平均成本更新成功', {
          goodsId,
          baseId,
          unitPricePerBox,
          arrivalBoxes,
          currentStockBoxes,
          service: 'milicard-api'
        });
      } catch (costError) {
        // 成本更新失败不影响到货记录创建
        logger.error('更新商品平均成本失败', {
          error: costError instanceof Error ? costError.message : String(costError),
          goodsId,
          baseId,
          service: 'milicard-api'
        });
      }

      return {
        id: record.id,
        arrivalDate: record.arrivalDate.toISOString().split('T')[0],
        purchaseOrderId: record.purchaseOrderId,
        purchaseOrderNo: record.purchaseOrder?.code || '',
        purchaseDate: record.purchaseOrder?.purchaseDate?.toISOString().split('T')[0] || '',
        goodsId: record.goodsId,
        goodsCode: record.goods?.code || '',
        goodsName: record.goods?.name || '',
        locationId: record.locationId,
        locationName: record.location?.name || '',
        handlerId: record.handlerId,
        handlerName: record.handler?.name || '',
        baseId: record.baseId,
        baseName: record.base?.name || '',
        boxQuantity: record.boxQuantity,
        packQuantity: record.packQuantity,
        pieceQuantity: record.pieceQuantity,
        notes: record.notes || undefined,
        createdBy: record.createdBy || undefined,
        createdAt: record.createdAt.toISOString(),
        updatedAt: record.updatedAt.toISOString()
      };

    } catch (error) {
      logger.error('创建到货记录失败', {
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
   * 删除到货记录
   */
  static async deleteArrivalRecord(
    baseId: number,
    recordId: string,
    userId: string
  ): Promise<void> {
    try {
      // 验证记录是否存在且属于该基地
      const record = await prisma.arrivalRecord.findFirst({
        where: {
          id: recordId,
          baseId: baseId
        }
      });

      if (!record) {
        throw new BaseError('到货记录不存在或不属于该基地', BaseErrorType.RESOURCE_NOT_FOUND);
      }

      // 删除记录
      await prisma.arrivalRecord.delete({
        where: {
          id: recordId
        }
      });

      logger.info('到货记录删除成功', {
        recordId,
        baseId,
        userId,
        service: 'milicard-api'
      });

    } catch (error) {
      logger.error('删除到货记录失败', {
        error: error instanceof Error ? error.message : String(error),
        recordId,
        baseId,
        userId,
        service: 'milicard-api'
      });
      throw error;
    }
  }

  /**
   * 获取到货统计信息
   */
  static async getArrivalStats(baseId: number): Promise<any> {
    try {
      const [totalRecords, todayRecords, thisMonthRecords] = await Promise.all([
        // 总到货记录数
        prisma.arrivalRecord.count({
          where: { baseId }
        }),
        // 今日到货记录数
        prisma.arrivalRecord.count({
          where: {
            baseId,
            arrivalDate: {
              gte: new Date(new Date().toDateString())
            }
          }
        }),
        // 本月到货记录数
        prisma.arrivalRecord.count({
          where: {
            baseId,
            arrivalDate: {
              gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
            }
          }
        })
      ]);

      return {
        success: true,
        data: {
          totalRecords,
          todayRecords,
          thisMonthRecords
        }
      };

    } catch (error) {
      logger.error('获取到货统计失败', {
        error: error instanceof Error ? error.message : String(error),
        baseId,
        service: 'milicard-api'
      });
      throw new BaseError('获取到货统计失败', BaseErrorType.DATABASE_ERROR);
    }
  }

  /**
   * 导入到货记录（通过名称匹配）
   */
  static async importArrivalRecord(
    baseId: number,
    data: {
      arrivalDate: string;
      purchaseOrderNo: string;
      locationName: string;
      handlerName: string;
      boxQuantity?: number;
      packQuantity?: number;
      pieceQuantity?: number;
    },
    userId: string
  ): Promise<any> {
    try {
      // 验证必填字段
      if (!data.arrivalDate || !data.purchaseOrderNo || !data.locationName || !data.handlerName) {
        throw new BaseError('缺少必填字段', BaseErrorType.VALIDATION_ERROR);
      }

      // 根据采购编号查找采购订单
      const purchaseOrder = await prisma.purchaseOrder.findFirst({
        where: {
          code: data.purchaseOrderNo,
          baseId: baseId
        },
        include: {
          items: {
            include: {
              goods: {
                select: {
                  id: true,
                  packPerBox: true,
                  piecePerPack: true
                }
              }
            },
            take: 1
          }
        }
      });

      if (!purchaseOrder) {
        throw new BaseError(`采购订单不存在: ${data.purchaseOrderNo}`, BaseErrorType.RESOURCE_NOT_FOUND);
      }

      const purchaseItem = purchaseOrder.items[0];
      if (!purchaseItem) {
        throw new BaseError(`采购订单没有关联商品: ${data.purchaseOrderNo}`, BaseErrorType.VALIDATION_ERROR);
      }

      const goodsId = purchaseItem.goodsId;
      const goods = purchaseItem.goods;
      const packPerBox = goods.packPerBox || 1;
      const piecePerPack = goods.piecePerPack || 1;

      // 根据位置名称查找位置
      const location = await prisma.location.findFirst({
        where: {
          name: data.locationName,
          baseId: baseId
        }
      });

      if (!location) {
        throw new BaseError(`直播间/仓库不存在: ${data.locationName}`, BaseErrorType.RESOURCE_NOT_FOUND);
      }

      // 根据人员名称查找人员
      const handler = await prisma.personnel.findFirst({
        where: {
          name: data.handlerName,
          baseId: baseId
        }
      });

      if (!handler) {
        throw new BaseError(`主播/仓管不存在: ${data.handlerName}`, BaseErrorType.RESOURCE_NOT_FOUND);
      }

      // 计算采购数量（换算成最小单位：包）
      const purchasedPieces = 
        (purchaseItem.boxQuantity * packPerBox * piecePerPack) +
        (purchaseItem.packQuantity * piecePerPack) +
        purchaseItem.pieceQuantity;

      // 获取该采购单已有的所有到货记录的数量总和
      const existingArrivals = await prisma.arrivalRecord.aggregate({
        where: {
          purchaseOrderId: purchaseOrder.id
        },
        _sum: {
          boxQuantity: true,
          packQuantity: true,
          pieceQuantity: true
        }
      });

      const arrivedBoxes = existingArrivals._sum.boxQuantity || 0;
      const arrivedPacks = existingArrivals._sum.packQuantity || 0;
      const arrivedPieces = existingArrivals._sum.pieceQuantity || 0;

      // 计算已到货数量（换算成最小单位：包）
      const totalArrivedPieces = 
        (arrivedBoxes * packPerBox * piecePerPack) +
        (arrivedPacks * piecePerPack) +
        arrivedPieces;

      // 计算本次录入数量
      const newBoxQty = data.boxQuantity || 0;
      const newPackQty = data.packQuantity || 0;
      const newPieceQty = data.pieceQuantity || 0;
      const newArrivalPieces = 
        (newBoxQty * packPerBox * piecePerPack) +
        (newPackQty * piecePerPack) +
        newPieceQty;

      // 校验：总到货数量 ≤ 采购数量
      const totalAfterArrival = totalArrivedPieces + newArrivalPieces;
      if (totalAfterArrival > purchasedPieces) {
        const remainingPieces = purchasedPieces - totalArrivedPieces;
        const remainingBoxes = Math.floor(remainingPieces / (packPerBox * piecePerPack));
        const remainingAfterBoxes = remainingPieces % (packPerBox * piecePerPack);
        const remainingPacks = Math.floor(remainingAfterBoxes / piecePerPack);
        const remainingPiecesOnly = remainingAfterBoxes % piecePerPack;
        
        throw new BaseError(
          `到货数量超出采购数量！\n` +
          `采购数量: ${purchaseItem.boxQuantity}箱${purchaseItem.packQuantity}盒${purchaseItem.pieceQuantity}包\n` +
          `本次录入: ${newBoxQty}箱${newPackQty}盒${newPieceQty}包\n` +
          (arrivedBoxes > 0 || arrivedPacks > 0 || arrivedPieces > 0 
            ? `已到货: ${arrivedBoxes}箱${arrivedPacks}盒${arrivedPieces}包\n` 
            : '') +
          `剩余可到货: ${remainingBoxes}箱${remainingPacks}盒${remainingPiecesOnly}包`,
          BaseErrorType.VALIDATION_ERROR
        );
      }

      // 创建到货记录
      const record = await prisma.arrivalRecord.create({
        data: {
          arrivalDate: new Date(data.arrivalDate),
          purchaseOrderId: purchaseOrder.id,
          goodsId: goodsId,
          locationId: location.id,
          handlerId: handler.id,
          baseId: baseId,
          boxQuantity: newBoxQty,
          packQuantity: newPackQty,
          pieceQuantity: newPieceQty,
          createdBy: userId,
          updatedBy: userId
        },
        include: {
          purchaseOrder: true,
          goods: true,
          location: true,
          handler: true,
          base: true
        }
      });

      logger.info('到货记录导入成功', {
        recordId: record.id,
        purchaseOrderNo: data.purchaseOrderNo,
        baseId,
        userId,
        service: 'milicard-api'
      });

      // 更新商品平均成本
      try {
        const unitPricePerBox = Number(purchaseItem.unitPrice);
        
        // 计算当前库存（到货前的库存，以箱为单位）
        const existingStock = await prisma.arrivalRecord.aggregate({
          where: {
            goodsId: goodsId,
            baseId: baseId,
            id: { not: record.id }
          },
          _sum: {
            boxQuantity: true
          }
        });
        
        const currentStockBoxes = existingStock._sum.boxQuantity || 0;
        const arrivalBoxes = newBoxQty;
        
        await GoodsCostService.updateAverageCost(
          goodsId,
          baseId,
          unitPricePerBox,
          arrivalBoxes,
          currentStockBoxes
        );
        
        logger.info('商品平均成本更新成功（导入）', {
          goodsId,
          baseId,
          unitPricePerBox,
          arrivalBoxes,
          currentStockBoxes,
          service: 'milicard-api'
        });
      } catch (costError) {
        logger.error('更新商品平均成本失败（导入）', {
          error: costError instanceof Error ? costError.message : String(costError),
          goodsId,
          baseId,
          service: 'milicard-api'
        });
      }

      return {
        id: record.id,
        arrivalDate: record.arrivalDate.toISOString().split('T')[0],
        purchaseOrderId: record.purchaseOrderId,
        purchaseOrderNo: record.purchaseOrder?.code || '',
        goodsId: record.goodsId,
        goodsName: record.goods?.name || '',
        locationId: record.locationId,
        locationName: record.location?.name || '',
        handlerId: record.handlerId,
        handlerName: record.handler?.name || '',
        boxQuantity: record.boxQuantity,
        packQuantity: record.packQuantity,
        pieceQuantity: record.pieceQuantity,
      };

    } catch (error) {
      logger.error('导入到货记录失败', {
        error: error instanceof Error ? error.message : String(error),
        baseId,
        data,
        userId,
        service: 'milicard-api'
      });
      throw error;
    }
  }
}
