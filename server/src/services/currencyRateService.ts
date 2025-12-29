import { PrismaClient, Prisma } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

// 内存缓存当日汇率
let cachedRates: Record<string, number> | null = null;
let lastFetchDate: string | null = null;

interface CurrencyRateInput {
  currencyCode: string;
  currencyName?: string;
  fixedRate: number;
  isActive?: boolean;
}

interface ListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  isActive?: boolean;
}

interface ExchangeRateResponse {
  result: string;
  rates?: Record<string, number>;
}

export class CurrencyRateService {
  /**
   * 获取货币汇率列表
   */
  static async getList(params: ListParams) {
    const { page = 1, pageSize = 20, search, isActive } = params;
    const skip = (page - 1) * pageSize;

    const where: any = {};

    if (search) {
      where.OR = [
        { currencyCode: { contains: search, mode: 'insensitive' } },
        { currencyName: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const [data, total, liveRates] = await Promise.all([
      prisma.currencyRate.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { currencyCode: 'asc' },
      }),
      prisma.currencyRate.count({ where }),
      this.getLiveRates(),
    ]);

    // 合并实时汇率数据
    const dataWithLiveRates = data.map(rate => ({
      ...rate,
      fixedRate: Number(rate.fixedRate),
      liveRate: liveRates[rate.currencyCode] || null,
    }));

    return {
      data: dataWithLiveRates,
      pagination: {
        current: page,
        pageSize,
        total,
      },
    };
  }

  /**
   * 获取单个货币汇率
   */
  static async getById(id: number) {
    const [rate, liveRates] = await Promise.all([
      prisma.currencyRate.findUnique({
        where: { id },
      }),
      this.getLiveRates(),
    ]);

    if (!rate) {
      return null;
    }

    return {
      ...rate,
      fixedRate: Number(rate.fixedRate),
      liveRate: liveRates[rate.currencyCode] || null,
    };
  }

  /**
   * 根据货币代码获取汇率
   */
  static async getByCode(currencyCode: string) {
    return prisma.currencyRate.findUnique({
      where: { currencyCode },
    });
  }

  /**
   * 创建货币汇率
   */
  static async create(data: CurrencyRateInput) {
    // 检查货币代码是否已存在
    const existing = await prisma.currencyRate.findUnique({
      where: { currencyCode: data.currencyCode },
    });

    if (existing) {
      throw new Error('货币代码已存在');
    }

    return prisma.currencyRate.create({
      data: {
        currencyCode: data.currencyCode.toUpperCase(),
        currencyName: data.currencyName,
        fixedRate: new Prisma.Decimal(data.fixedRate),
        isActive: data.isActive ?? true,
      },
    });
  }

  /**
   * 更新货币汇率
   */
  static async update(id: number, data: Partial<CurrencyRateInput>) {
    const existing = await prisma.currencyRate.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new Error('货币汇率不存在');
    }

    // 如果更新货币代码，检查是否与其他记录冲突
    if (data.currencyCode && data.currencyCode !== existing.currencyCode) {
      const conflict = await prisma.currencyRate.findUnique({
        where: { currencyCode: data.currencyCode },
      });
      if (conflict) {
        throw new Error('货币代码已存在');
      }
    }

    return prisma.currencyRate.update({
      where: { id },
      data: {
        ...(data.currencyCode && { currencyCode: data.currencyCode.toUpperCase() }),
        ...(data.currencyName !== undefined && { currencyName: data.currencyName }),
        ...(data.fixedRate !== undefined && { fixedRate: new Prisma.Decimal(data.fixedRate) }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });
  }

  /**
   * 删除货币汇率
   */
  static async delete(id: number) {
    const existing = await prisma.currencyRate.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new Error('货币汇率不存在');
    }

    return prisma.currencyRate.delete({
      where: { id },
    });
  }

  /**
   * 获取当日实时汇率（从外部 API）
   * 每天最多调用一次，结果缓存在内存中
   */
  static async getLiveRates(): Promise<Record<string, number>> {
    const today = new Date().toISOString().split('T')[0];

    // 如果今天已经获取过，直接返回缓存
    if (cachedRates && lastFetchDate === today) {
      return cachedRates;
    }

    try {
      logger.info('正在获取当日汇率...');
      const response = await fetch('https://open.er-api.com/v6/latest/CNY');
      const data = await response.json() as ExchangeRateResponse;

      if (data.result === 'success' && data.rates) {
        cachedRates = data.rates;
        lastFetchDate = today;
        logger.info('当日汇率获取成功', { ratesCount: Object.keys(data.rates).length });
        return cachedRates;
      } else {
        logger.warn('获取汇率失败，返回空对象', { data });
        return cachedRates || {};
      }
    } catch (error) {
      logger.error('获取当日汇率失败', {
        error: error instanceof Error ? error.message : String(error),
      });
      // 如果有缓存，返回缓存；否则返回空对象
      return cachedRates || {};
    }
  }

  /**
   * 刷新当日汇率（强制刷新）
   */
  static async refreshLiveRates(): Promise<Record<string, number>> {
    lastFetchDate = null;
    return this.getLiveRates();
  }

  /**
   * 获取所有活跃的货币汇率（包含当日实时汇率）
   */
  static async getAllWithLiveRates() {
    const [rates, liveRates] = await Promise.all([
      prisma.currencyRate.findMany({
        where: { isActive: true },
        orderBy: { currencyCode: 'asc' },
      }),
      this.getLiveRates(),
    ]);

    return rates.map(rate => ({
      ...rate,
      fixedRate: Number(rate.fixedRate),
      liveRate: liveRates[rate.currencyCode] || null,
    }));
  }
}
