// 主播利润记录数据类型
export interface AnchorProfitRecord {
  id: string;
  profitDate: string;              // 日期
  handlerId: string;               // 主播ID
  handlerName?: string;            // 主播名称
  baseId: number;
  baseName?: string;
  
  // 收入部分
  gmvAmount: number;               // GMV金额
  refundAmount: number;            // 退款金额
  waterAmount: number;             // 走水金额（补单等）
  salesAmount: number;             // 当日销售金额 = GMV - 退款 + 走水
  
  // 成本部分
  consumptionAmount: number;       // 消耗金额（从消耗记录汇总）
  adSpendAmount: number;           // 投流金额
  platformFeeAmount: number;       // 平台扣点金额
  
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
  gmvAmount: number;
  refundAmount: number;
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
