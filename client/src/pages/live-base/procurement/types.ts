/**
 * 采购管理相关类型定义
 */

// 采购订单数据类型（对应CSV结构）
export interface PurchaseOrder {
  id: string;
  orderNo: string;              // 采购编号
  orderName?: string;           // 采购名称
  purchaseDate: string;         // 采购日期
  goodsCode: string;            // 商品编号（关联商品表）
  goodsName: string;            // 商品名称
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
  baseId: number;
  createdBy?: string;
  createdAt: string;
  updatedAt?: string;
  status?: 'pending' | 'confirmed' | 'received' | 'cancelled';
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
  retailPrice: number;
  packPerBox: number;      // 多少盒1箱
  piecePerPack: number;    // 多少包1盒
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
