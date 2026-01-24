import { PrismaClient, Prisma } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

/**
 * 应付信息接口
 */
export interface PayableInfo {
  id: string;
  purchaseName: string;        // 采购名称：日期+商品名称
  supplierName: string;        // 供应商名称
  goodsName: string;           // 商品名称
  goodsNameI18n?: any;         // 商品名称国际化
  categoryCode?: string;       // 品类编号
  categoryName?: string;       // 品类名称
  categoryNameI18n?: any;      // 品类名称国际化
  totalAmount: number;         // 应付总金额
  paidAmount: number;          // 已付金额
  unpaidAmount: number;        // 未付金额
  cnyPaymentAmount?: number;   // 人民币支付金额
  paymentDate: string;         // 付款日期（采购日期）
  purchaseOrderCode: string;   // 采购单编号
}

/**
 * 应付列表查询参数
 */
export interface PayableListParams {
  current?: number;
  pageSize?: number;
  purchaseName?: string;       // 采购名称搜索
  supplierName?: string;       // 供应商名称搜索
  unpaidOnly?: boolean;        // 只显示未付清的
  startDate?: string;          // 开始日期
  endDate?: string;            // 结束日期
}

/**
 * 应付 Service
 * 基于采购单数据提供应付管理功能
 */
export class PayableService {
  /**
   * 获取应付列表
   * 从采购单中提取应付信息
   */
  static async getPayableList(baseId: number, params: PayableListParams) {
    const {
      current = 1,
      pageSize = 20,
      purchaseName,
      supplierName,
      unpaidOnly = false,
      startDate,
      endDate,
    } = params;

    const skip = (current - 1) * pageSize;

    // 构建查询条件
    const where: Prisma.PurchaseOrderWhereInput = {
      baseId,
    };

    // 供应商名称筛选
    if (supplierName) {
      where.supplier = {
        name: {
          contains: supplierName,
          mode: 'insensitive',
        },
      };
    }

    // 日期范围筛选
    if (startDate || endDate) {
      where.purchaseDate = {};
      if (startDate) {
        where.purchaseDate.gte = new Date(startDate);
      }
      if (endDate) {
        where.purchaseDate.lte = new Date(endDate);
      }
    }

    // 查询采购单
    const [orders, total] = await Promise.all([
      prisma.purchaseOrder.findMany({
        where,
        include: {
          supplier: true,
          items: {
            include: {
              goods: {
                include: {
                  category: {
                    select: {
                      code: true,
                      name: true,
                      nameI18n: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: {
          purchaseDate: 'desc',
        },
        skip,
        take: pageSize,
      }),
      prisma.purchaseOrder.count({ where }),
    ]);

    // 转换为应付信息
    let payableList: PayableInfo[] = orders.map((order) => {
      const totalAmount = Number(order.totalAmount) || 0;
      const paidAmount = Number(order.actualAmount) || 0;
      const unpaidAmount = totalAmount - paidAmount;

      // 获取第一个商品信息（采购单通常只有一个商品）
      const firstGoods = order.items[0]?.goods;
      const goodsName = firstGoods?.name || '';
      const goodsNameI18n = firstGoods?.nameI18n || null;
      const categoryCode = firstGoods?.category?.code || '';
      const categoryName = firstGoods?.category?.name || '';
      const categoryNameI18n = (firstGoods?.category as any)?.nameI18n || null;
      
      // 格式化采购日期
      const dateStr = order.purchaseDate
        ? new Date(order.purchaseDate).toLocaleDateString('zh-CN', {
            year: '2-digit',
            month: '2-digit',
            day: '2-digit',
          }).replace(/\//g, '')
        : '';

      // 采购名称：日期+采购+商品名称
      const purchaseNameStr = `${dateStr}采购${goodsName}`;

      return {
        id: order.id,
        purchaseName: purchaseNameStr,
        supplierName: order.supplier?.name || '',
        goodsName,
        goodsNameI18n,
        categoryCode,
        categoryName,
        categoryNameI18n,
        totalAmount,
        paidAmount,
        unpaidAmount,
        cnyPaymentAmount: Number(order.cnyPaymentAmount) || 0,
        paymentDate: order.purchaseDate ? order.purchaseDate.toISOString().split('T')[0] : '',
        purchaseOrderCode: order.code,
      };
    });

    // 采购名称搜索（在内存中过滤，因为是组合字段）
    if (purchaseName) {
      const searchTerm = purchaseName.toLowerCase();
      payableList = payableList.filter(
        (item) =>
          item.purchaseName.toLowerCase().includes(searchTerm) ||
          item.goodsName.toLowerCase().includes(searchTerm)
      );
    }

    // 只显示未付清的
    if (unpaidOnly) {
      payableList = payableList.filter((item) => item.unpaidAmount > 0);
    }

    // 计算统计信息
    const stats = {
      totalPayable: payableList.reduce((sum, item) => sum + item.totalAmount, 0),
      totalPaid: payableList.reduce((sum, item) => sum + item.paidAmount, 0),
      totalUnpaid: payableList.reduce((sum, item) => sum + item.unpaidAmount, 0),
    };

    return {
      data: payableList,
      total: unpaidOnly || purchaseName ? payableList.length : total,
      current,
      pageSize,
      stats,
    };
  }

  /**
   * 更新付款金额
   * 将新增付款金额累加到采购单的实付金额上
   * @param purchaseOrderId 采购单ID
   * @param paymentAmount 付款金额（基地货币）
   * @param userId 用户ID
   * @param baseId 基地ID
   * @param cnyPaymentAmount 人民币付款金额（可选，如果使用人民币支付）
   */
  static async addPayment(
    purchaseOrderId: string,
    paymentAmount: number,
    userId: string,
    baseId: number,
    cnyPaymentAmount?: number
  ) {
    // 查找采购单
    const order = await prisma.purchaseOrder.findFirst({
      where: {
        id: purchaseOrderId,
        baseId,
      },
    });

    if (!order) {
      throw new Error('采购单不存在');
    }

    const currentPaid = Number(order.actualAmount) || 0;
    const totalAmount = Number(order.totalAmount) || 0;
    const newPaidAmount = currentPaid + paymentAmount;

    // 检查是否超过应付总金额
    if (newPaidAmount > totalAmount) {
      throw new Error(`付款金额超过未付金额，当前未付金额为 ${(totalAmount - currentPaid).toFixed(2)}`);
    }

    // 构建更新数据
    const updateData: any = {
      actualAmount: new Prisma.Decimal(newPaidAmount),
    };

    // 如果有人民币付款金额，累加到 cnyPaymentAmount
    if (cnyPaymentAmount !== undefined && cnyPaymentAmount > 0) {
      const currentCnyPaid = Number(order.cnyPaymentAmount) || 0;
      updateData.cnyPaymentAmount = new Prisma.Decimal(currentCnyPaid + cnyPaymentAmount);
    }

    // 更新采购单的实付金额
    const updatedOrder = await prisma.purchaseOrder.update({
      where: { id: purchaseOrderId },
      data: updateData,
      include: {
        supplier: true,
        items: {
          include: {
            goods: true,
          },
        },
      },
    });

    logger.info('付款成功', {
      purchaseOrderId,
      paymentAmount,
      cnyPaymentAmount,
      previousPaid: currentPaid,
      newPaidAmount,
      userId,
    });

    return {
      id: updatedOrder.id,
      totalAmount,
      paidAmount: newPaidAmount,
      unpaidAmount: totalAmount - newPaidAmount,
      cnyPaymentAmount: Number(updatedOrder.cnyPaymentAmount) || 0,
    };
  }

  /**
   * 获取单个采购单的应付详情
   */
  static async getPayableDetail(purchaseOrderId: string, baseId: number) {
    const order = await prisma.purchaseOrder.findFirst({
      where: {
        id: purchaseOrderId,
        baseId,
      },
      include: {
        supplier: true,
        items: {
          include: {
            goods: true,
          },
        },
      },
    });

    if (!order) {
      throw new Error('采购单不存在');
    }

    const totalAmount = Number(order.totalAmount) || 0;
    const paidAmount = Number(order.actualAmount) || 0;
    const unpaidAmount = totalAmount - paidAmount;

    const goodsName = order.items[0]?.goods?.name || '';
    const dateStr = order.purchaseDate
      ? new Date(order.purchaseDate).toLocaleDateString('zh-CN', {
          year: '2-digit',
          month: '2-digit',
          day: '2-digit',
        }).replace(/\//g, '')
      : '';

    return {
      id: order.id,
      purchaseName: `${dateStr}采购${goodsName}`,
      supplierName: order.supplier?.name || '',
      goodsName,
      totalAmount,
      paidAmount,
      unpaidAmount,
      cnyPaymentAmount: Number(order.cnyPaymentAmount) || 0,
      paymentDate: order.purchaseDate ? order.purchaseDate.toISOString().split('T')[0] : '',
      purchaseOrderCode: order.code,
    };
  }
}

export default PayableService;
