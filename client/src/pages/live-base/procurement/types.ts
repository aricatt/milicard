/**
 * 采购管理相关类型定义
 */

// 多语言名称类型
export interface NameI18n {
  en?: string;
  th?: string;
  vi?: string;
  [key: string]: string | undefined;
}

// 采购订单数据类型（对应CSV结构）
export interface PurchaseOrder {
  id: string;
  purchaseOrderId?: string;     // 采购订单ID（用于物流查询）
  orderNo: string;              // 采购编号
  orderName?: string;           // 采购名称
  purchaseDate: string;         // 采购日期
  goodsCode: string;            // 商品编号（关联商品表）
  goodsName: string;            // 商品名称
  goodsNameI18n?: NameI18n | null; // 商品多语言名称
  categoryCode?: string;        // 品类编号
  categoryName?: string;        // 品类名称
  categoryNameI18n?: NameI18n | null; // 品类多语言名称
  retailPrice?: number;         // 零售价
  discount?: number;            // 折扣
  supplierCode: string;         // 供应商编号（关联供应商表）
  supplierName: string;         // 供应商名称
  purchaseBoxQty: number;       // 采购箱
  purchasePackQty: number;      // 采购盒
  purchasePieceQty: number;     // 采购包
  arrivedBoxQty?: number;       // 到货箱
  arrivedPackQty?: number;      // 到货盒
  arrivedPieceQty?: number;     // 到货包
  diffBoxQty?: number;          // 相差箱
  diffPackQty?: number;         // 相差盒
  diffPieceQty?: number;        // 相差包
  unitPriceBox?: number;        // 拿货单价箱
  unitPricePack?: number;       // 拿货单价盒
  unitPricePiece?: number;      // 拿货单价包
  amountBox?: number;           // 应付金额箱
  amountPack?: number;          // 应付金额盒
  amountPiece?: number;         // 应付金额包
  totalAmount: number;          // 应付总金额
  actualAmount?: number;        // 实付金额
  cnyPaymentAmount?: number;    // 人民币支付金额
  baseId: number;
  createdBy?: string;
  createdAt: string;
  updatedAt?: string;
  status?: 'pending' | 'confirmed' | 'received' | 'cancelled';
  // 物流汇总信息（用于列表显示）
  logisticsSummary?: LogisticsSummary;
  // 国际货运记录数量（用于列表显示）
  internationalLogisticsCount?: number;
}

// 物流状态映射
export const LOGISTICS_STATE_MAP: Record<number, string> = {
  1: '在途中',
  2: '派件中',
  3: '已签收',
  4: '派送失败',
  5: '揽收',
  6: '退回',
  7: '转单',
  8: '疑难',
  9: '退签',
  10: '待清关',
  11: '清关中',
  12: '已清关',
  13: '清关异常',
};

// 物流轨迹项
export interface LogisticsTrackItem {
  time: string;
  status: string;
}

// 单个物流记录信息
export interface LogisticsRecordInfo {
  id: string;
  trackingNumber: string;
  state: number | null;
  stateName: string;
  companyName: string;
  companyCode: string;
  logo?: string;
  tracks: LogisticsTrackItem[];
  updatedAt: string | null;
  canRefresh: boolean;
  createdAt: string;
}

// 物流汇总信息
export interface LogisticsSummary {
  totalCount: number;           // 总包裹数
  deliveredCount: number;       // 已签收数
  inTransitCount: number;       // 在途中数
  records: LogisticsRecordInfo[];  // 所有物流记录
}

// 采购统计数据类型
export interface PurchaseStats {
  totalOrders: number;
  totalAmount: number;
  uniqueSuppliers: number;
  averageAmount: number;
}

// 商品选项类型
export interface GoodsOption {
  code: string;
  name: string;
  nameI18n?: NameI18n | null;  // 多语言名称
  retailPrice: number;
  packPerBox: number;      // 多少盒1箱
  piecePerPack: number;    // 多少包1盒
  categoryCode?: string;   // 品类编号
  categoryName?: string;   // 品类名称
  categoryNameI18n?: NameI18n | null;  // 品类多语言名称
}

// 供应商选项类型
export interface SupplierOption {
  code: string;
  name: string;
}

// 表单值类型
export interface ProcurementFormValues {
  purchaseDate: any;            // dayjs对象
  goodsCode: string;
  goodsName?: string;
  retailPrice?: number;
  supplierCode: string;
  supplierName?: string;
  unitPriceBox?: number;
  purchaseBoxQty: number;
  unitPricePack?: number;
  purchasePackQty: number;
  unitPricePiece?: number;
  purchasePieceQty: number;
  actualAmount?: number;        // 实付金额
}
