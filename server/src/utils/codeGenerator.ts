import { PrismaClient } from '@prisma/client';
import { logger } from './logger';

const prisma = new PrismaClient();

/**
 * 业务编号生成器
 * 统一管理所有业务模块的编号生成规则
 */
export class CodeGenerator {
  
  /**
   * 编号前缀配置
   */
  private static readonly CODE_PREFIXES = {
    // 人员管理
    ANCHOR: 'ANCHOR',           // 主播
    WAREHOUSE_KEEPER: 'KEEPER', // 仓管
    
    // 位置管理
    LIVE_ROOM: 'LIVE',          // 直播间
    WAREHOUSE: 'WAREHOUSE',     // 仓库
    
    // 基础数据
    GOODS: 'GOODS',             // 商品
    CUSTOMER: 'CUSTOMER',       // 客户
    SUPPLIER: 'SUPPLIER',       // 供应商
    BASE: 'BASE',               // 基地
    
    // 订单管理
    PURCHASE_ORDER: 'PUSH',     // 采购订单
    DISTRIBUTION_ORDER: 'DO',   // 销售订单
    TRANSFER_ORDER: 'TO',       // 调拨订单
    ARRIVAL_ORDER: 'AO',        // 到货单
    STOCK_OUT_ORDER: 'SO',      // 出库单
  } as const;

  /**
   * 随机字符串长度配置
   */
  private static readonly RANDOM_LENGTH = 11;

  /**
   * 字符集：数字 + 大写字母（去除容易混淆的字符）
   */
  private static readonly CHARSET = '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ';

  /**
   * 生成随机字符串
   * @param length 长度
   * @returns 随机字符串
   */
  private static generateRandomString(length: number): string {
    let result = '';
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * this.CHARSET.length);
      result += this.CHARSET[randomIndex];
    }
    return result;
  }

  /**
   * 检查编号是否唯一
   * @param code 编号
   * @param tableName 表名
   * @returns 是否唯一
   */
  private static async isCodeUnique(code: string, tableName: string): Promise<boolean> {
    try {
      // 动态查询对应表，所有表都使用 'code' 字段
      const result = await (prisma as any)[tableName].findUnique({
        where: { code }
      });
      return !result;
    } catch (error) {
      logger.error('检查编号唯一性失败', { 
        error, 
        code, 
        tableName, 
        service: 'code-generator' 
      });
      return false;
    }
  }

  /**
   * 生成业务编号
   * @param type 业务类型
   * @param tableName 对应的数据库表名
   * @param maxRetries 最大重试次数
   * @returns 唯一编号
   */
  public static async generateCode(
    type: keyof typeof CodeGenerator.CODE_PREFIXES,
    tableName: string,
    maxRetries: number = 10
  ): Promise<string> {
    const prefix = this.CODE_PREFIXES[type];
    
    if (!prefix) {
      throw new Error(`不支持的业务类型: ${type}`);
    }

    let attempts = 0;
    
    while (attempts < maxRetries) {
      const randomStr = this.generateRandomString(this.RANDOM_LENGTH);
      const code = `${prefix}-${randomStr}`;
      
      const isUnique = await this.isCodeUnique(code, tableName);
      
      if (isUnique) {
        logger.info('业务编号生成成功', {
          service: 'code-generator',
          type,
          code,
          attempts: attempts + 1
        });
        return code;
      }
      
      attempts++;
    }
    
    throw new Error(`生成唯一编号失败，已重试 ${maxRetries} 次`);
  }

  /**
   * 人员编号生成
   */
  public static async generatePersonnelCode(role: 'ANCHOR' | 'WAREHOUSE_KEEPER'): Promise<string> {
    return this.generateCode(role, 'personnel');
  }

  /**
   * 位置编号生成
   */
  public static async generateLocationCode(type: 'LIVE_ROOM' | 'WAREHOUSE'): Promise<string> {
    return this.generateCode(type, 'location');
  }

  /**
   * 商品编号生成
   */
  public static async generateGoodsCode(): Promise<string> {
    return this.generateCode('GOODS', 'goods');
  }

  /**
   * 客户编号生成
   */
  public static async generateCustomerCode(): Promise<string> {
    return this.generateCode('CUSTOMER', 'customer');
  }

  /**
   * 供应商编号生成
   */
  public static async generateSupplierCode(): Promise<string> {
    return this.generateCode('SUPPLIER', 'supplier');
  }

  /**
   * 基地编号生成
   */
  public static async generateBaseCode(): Promise<string> {
    return this.generateCode('BASE', 'base');
  }

  /**
   * 采购订单编号生成
   */
  public static async generatePurchaseOrderCode(): Promise<string> {
    return this.generateCode('PURCHASE_ORDER', 'PurchaseOrder');
  }

  /**
   * 销售订单编号生成
   */
  public static async generateDistributionOrderCode(): Promise<string> {
    return this.generateCode('DISTRIBUTION_ORDER', 'DistributionOrder');
  }

  /**
   * 调拨订单编号生成
   */
  public static async generateTransferOrderCode(): Promise<string> {
    return this.generateCode('TRANSFER_ORDER', 'TransferOrder');
  }

  /**
   * 到货单编号生成
   */
  public static async generateArrivalOrderCode(): Promise<string> {
    return this.generateCode('ARRIVAL_ORDER', 'ArrivalOrder');
  }

  /**
   * 出库单编号生成
   */
  public static async generateStockOutOrderCode(): Promise<string> {
    return this.generateCode('STOCK_OUT_ORDER', 'StockOutOrder');
  }

  /**
   * 批量生成编号（用于数据导入等场景）
   * @param type 业务类型
   * @param tableName 表名
   * @param count 生成数量
   * @returns 编号数组
   */
  public static async generateBatchCodes(
    type: keyof typeof CodeGenerator.CODE_PREFIXES,
    tableName: string,
    count: number
  ): Promise<string[]> {
    const codes: string[] = [];
    
    for (let i = 0; i < count; i++) {
      const code = await this.generateCode(type, tableName);
      codes.push(code);
    }
    
    return codes;
  }

  /**
   * 验证编号格式
   * @param code 编号
   * @param type 预期类型
   * @returns 是否有效
   */
  public static validateCodeFormat(
    code: string, 
    type: keyof typeof CodeGenerator.CODE_PREFIXES
  ): boolean {
    const prefix = this.CODE_PREFIXES[type];
    const expectedPattern = new RegExp(`^${prefix}-[${this.CHARSET}]{${this.RANDOM_LENGTH}}$`);
    return expectedPattern.test(code);
  }

  /**
   * 从编号中提取业务类型
   * @param code 编号
   * @returns 业务类型
   */
  public static extractTypeFromCode(code: string): string | null {
    const parts = code.split('-');
    if (parts.length !== 2) return null;
    
    const prefix = parts[0];
    
    // 查找对应的业务类型
    for (const [type, typePrefix] of Object.entries(this.CODE_PREFIXES)) {
      if (typePrefix === prefix) {
        return type;
      }
    }
    
    return null;
  }
}
