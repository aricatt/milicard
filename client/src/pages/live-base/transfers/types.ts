/**
 * 调货管理相关类型定义
 */

// 多语言名称类型
export interface NameI18n {
  en?: string;
  th?: string;
  vi?: string;
  [key: string]: string | undefined;
}

// 调货记录数据类型
export interface TransferRecord {
  id: string;
  transferDate: string;           // 调货日期
  goodsId: string;                // 商品ID
  goodsCode?: string;             // 商品编号
  goodsName: string;              // 商品名称
  goodsNameI18n?: NameI18n | null; // 商品多语言名称
  categoryCode?: string;          // 品类编号
  categoryName?: string;          // 品类名称
  categoryNameI18n?: NameI18n | null; // 品类多语言名称
  sourceLocationId: number;       // 调出直播间ID
  sourceLocationName: string;     // 调出直播间名称
  sourceHandlerId?: string;       // 调出主播ID
  sourceHandlerName?: string;     // 调出主播名称
  destinationLocationId: number;  // 调入直播间ID
  destinationLocationName: string;// 调入直播间名称
  destinationHandlerId?: string;  // 调入主播ID
  destinationHandlerName?: string;// 调入主播名称
  handlerId?: string;             // 经手人ID（兼容旧数据）
  handlerName?: string;           // 经手人名称（兼容旧数据）
  boxQuantity: number;            // 调货箱
  packQuantity: number;           // 调货盒
  pieceQuantity: number;          // 调货包
  notes?: string;                 // 备注
  status?: 'PENDING' | 'COMPLETED' | 'CANCELLED';
  baseId: number;
  createdBy?: string;
  createdAt: string;
  updatedAt?: string;
}

// 调货统计数据类型
export interface TransferStats {
  totalRecords: number;           // 总调货记录数
  totalGoods: number;             // 涉及商品数
  totalBoxQuantity: number;       // 总调货箱数
  totalPackQuantity: number;      // 总调货盒数
  totalPieceQuantity: number;     // 总调货包数
  todayRecords: number;           // 今日调货数
}

// 调货表单值类型
export interface TransferFormValues {
  transferDate: any;              // dayjs对象
  goodsId: string;
  sourceLocationId: number;
  sourceHandlerId: string;
  destinationLocationId: number;
  destinationHandlerId: string;
  boxQuantity: number;
  packQuantity: number;
  pieceQuantity: number;
  notes?: string;
}

// 位置选项类型
export interface LocationOption {
  id: number;
  name: string;
  type?: string;
}

// 人员选项类型
export interface PersonnelOption {
  id: string;
  name: string;
  role?: string;
}

// 商品选项类型
export interface GoodsOption {
  id: string;
  code: string;
  name: string;
  nameI18n?: NameI18n | null;
  categoryCode?: string;
  categoryName?: string;
  categoryNameI18n?: NameI18n | null;
}
