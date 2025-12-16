import { Request, Response } from 'express';
import { CurrencyRateService } from '../services/currencyRateService';
import { logger } from '../utils/logger';

export class CurrencyRateController {
  /**
   * 获取货币汇率列表
   */
  static async getList(req: Request, res: Response) {
    try {
      const { page, pageSize, search, isActive } = req.query;

      const result = await CurrencyRateService.getList({
        page: page ? parseInt(page as string, 10) : 1,
        pageSize: pageSize ? parseInt(pageSize as string, 10) : 20,
        search: search as string,
        isActive: isActive !== undefined ? isActive === 'true' : undefined,
      });

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      logger.error('获取货币汇率列表失败', {
        error: error instanceof Error ? error.message : String(error),
      });
      res.status(500).json({
        success: false,
        message: '获取货币汇率列表失败',
      });
    }
  }

  /**
   * 获取单个货币汇率
   */
  static async getById(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id, 10);
      const rate = await CurrencyRateService.getById(id);

      if (!rate) {
        return res.status(404).json({
          success: false,
          message: '货币汇率不存在',
        });
      }

      res.json({
        success: true,
        data: rate,
      });
    } catch (error) {
      logger.error('获取货币汇率失败', {
        error: error instanceof Error ? error.message : String(error),
        id: req.params.id,
      });
      res.status(500).json({
        success: false,
        message: '获取货币汇率失败',
      });
    }
  }

  /**
   * 创建货币汇率
   */
  static async create(req: Request, res: Response) {
    try {
      const { currencyCode, currencyName, fixedRate, isActive } = req.body;

      if (!currencyCode || fixedRate === undefined) {
        return res.status(400).json({
          success: false,
          message: '缺少必要参数: currencyCode, fixedRate',
        });
      }

      const rate = await CurrencyRateService.create({
        currencyCode,
        currencyName,
        fixedRate,
        isActive,
      });

      res.status(201).json({
        success: true,
        data: rate,
        message: '创建成功',
      });
    } catch (error) {
      logger.error('创建货币汇率失败', {
        error: error instanceof Error ? error.message : String(error),
        body: req.body,
      });

      const message = error instanceof Error ? error.message : '创建货币汇率失败';
      res.status(400).json({
        success: false,
        message,
      });
    }
  }

  /**
   * 更新货币汇率
   */
  static async update(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id, 10);
      const { currencyCode, currencyName, fixedRate, isActive } = req.body;

      const rate = await CurrencyRateService.update(id, {
        currencyCode,
        currencyName,
        fixedRate,
        isActive,
      });

      res.json({
        success: true,
        data: rate,
        message: '更新成功',
      });
    } catch (error) {
      logger.error('更新货币汇率失败', {
        error: error instanceof Error ? error.message : String(error),
        id: req.params.id,
        body: req.body,
      });

      const message = error instanceof Error ? error.message : '更新货币汇率失败';
      res.status(400).json({
        success: false,
        message,
      });
    }
  }

  /**
   * 删除货币汇率
   */
  static async delete(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id, 10);
      await CurrencyRateService.delete(id);

      res.json({
        success: true,
        message: '删除成功',
      });
    } catch (error) {
      logger.error('删除货币汇率失败', {
        error: error instanceof Error ? error.message : String(error),
        id: req.params.id,
      });

      const message = error instanceof Error ? error.message : '删除货币汇率失败';
      res.status(400).json({
        success: false,
        message,
      });
    }
  }

  /**
   * 获取所有货币汇率（包含当日实时汇率）
   */
  static async getAllWithLiveRates(req: Request, res: Response) {
    try {
      const rates = await CurrencyRateService.getAllWithLiveRates();

      res.json({
        success: true,
        data: rates,
      });
    } catch (error) {
      logger.error('获取货币汇率（含实时汇率）失败', {
        error: error instanceof Error ? error.message : String(error),
      });
      res.status(500).json({
        success: false,
        message: '获取货币汇率失败',
      });
    }
  }

  /**
   * 获取当日实时汇率
   */
  static async getLiveRates(req: Request, res: Response) {
    try {
      const rates = await CurrencyRateService.getLiveRates();

      res.json({
        success: true,
        data: rates,
      });
    } catch (error) {
      logger.error('获取当日实时汇率失败', {
        error: error instanceof Error ? error.message : String(error),
      });
      res.status(500).json({
        success: false,
        message: '获取当日实时汇率失败',
      });
    }
  }
}
