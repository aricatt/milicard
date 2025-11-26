/**
 * 到货记录数据类型
 */
export interface ArrivalRecord {
  id: string;
  arrivalDate: string;           // 到货日期
  purchaseOrderId: string;
  purchaseOrderNo: string;       // 采购编号
  purchaseDate: string;          // 采购日期（从关联采购单获取，用于生成采购名称）
  goodsId: string;
  goodsName: string;             // 商品名称
  goodsCode: string;
  locationId: number;
  locationName: string;          // 直播间（仓库）名称
  handlerId: string;
  handlerName: string;           // 主播名称
  boxQuantity: number;           // 到货箱
  packQuantity: number;          // 到货盒
  pieceQuantity: number;         // 到货包
  totalPieces: number;
  notes: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * 到货统计数据类型
 */
export interface ArrivalStats {
  totalRecords: number;
  todayRecords: number;
  thisWeekRecords: number;
  thisMonthRecords: number;
  totalBoxes: number;
  totalPacks: number;
  totalPieces: number;
}

/**
 * 到货表单值类型
 */
export interface ArrivalFormValues {
  purchaseOrderNo: string;       // 采购编号
  arrivalDate: any;              // dayjs object
  locationId: number;            // 直播间/仓库ID
  handlerId: string;             // 主播/仓管ID
  boxQuantity: number;           // 到货箱
  packQuantity: number;          // 到货盒
  pieceQuantity: number;         // 到货包
  notes?: string;
}
