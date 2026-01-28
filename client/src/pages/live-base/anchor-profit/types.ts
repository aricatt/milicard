// 主播利润记录数据类型
export interface AnchorProfitRecord {
  id: string;
  profitDate: string;              // 日期
  handlerId: string;               // 主播ID
  handlerName?: string;            // 主播名称
  consumptionId?: string;          // 关联的消耗记录ID
  consumption?: {                  // 关联的消耗记录详细信息（用于显示品名和计算平均单包价）
    goods?: {
      name: string;
      category?: {
        name: string;
      };
      packPerBox: number;
      piecePerPack: number;
    };
    boxQuantity: number;
    packQuantity: number;
    pieceQuantity: number;
  };
  baseId: number;
  baseName?: string;
  
  // 收入部分
  gmvAmount: number;               // GMV金额
  refundAmount: number;            // 退款金额
  cancelOrderAmount: number;       // 取消订单金额
  shopOrderAmount: number;         // 店铺订单金额
  waterAmount: number;             // 走水金额（二维码付款等）
  salesAmount: number;             // 当日销售金额 = GMV + 店铺订单 + 走水 - 取消订单 - 退款
  
  // 成本部分
  consumptionAmount: number;       // 消耗金额（用户录入的消耗金额）
  calculatedCostPrice?: number;    // 拿货价（基于商品 packPrice 动态计算，仅用于显示）
  adSpendAmount: number;           // 投流金额
  platformFeeAmount: number;       // 平台扣点金额 = (GMV - 退款) * 扣点比例
  
  // 利润部分
  profitAmount: number;            // 利润金额 = 销售金额 - 消耗金额 - 投流金额 - 平台扣点
  profitRate: number;              // 毛利率% = 利润金额 / 销售金额 * 100
  
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// 主播利润统计数据
export interface AnchorProfitStats {
  totalRecords: number;
  totalGmv: number;
  totalRefund: number;
  totalSales: number;
  totalConsumption: number;
  totalAdSpend: number;
  totalPlatformFee: number;
  totalProfit: number;
  avgProfitRate: number;
  todayRecords: number;
}

// 创建主播利润表单值
export interface AnchorProfitFormValues {
  profitDate: any;                 // dayjs object
  handlerId: string;
  consumptionId: string;           // 关联的消耗记录ID
  gmvAmount: number;
  refundAmount: number;
  cancelOrderAmount: number;
  shopOrderAmount: number;
  waterAmount: number;
  adSpendAmount: number;
  platformFeeRate: number;         // 平台扣点比例（用于计算）
  notes?: string;
}

// 下拉选项类型
export interface PersonnelOption {
  id: string;
  name: string;
  role?: string;
}

// 消耗记录选项（用于下拉框）
export interface ConsumptionOption {
  id: string;
  consumptionDate: string;
  goodsName: string;
  locationName: string;
  handlerName: string;
  boxQuantity: number;
  packQuantity: number;
  pieceQuantity: number;
  // 计算所需的基础字段
  packPerBox: number;
  piecePerPack: number;
  packPrice: number; // 商品平拆价（每包价格），用于计算消耗金额
  unitPricePerBox: number; // 来自 Inventory.averageCost（每箱成本），用于计算拿货价
  // 计算好的值
  consumptionAmount: number; // 消耗金额（基于 packPrice，仅用于显示）
  costPrice: number; // 拿货价（基于 averageCost，用于计算毛利）
  label: string;
}
