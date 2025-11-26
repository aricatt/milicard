/**
 * 到货记录数据类型
 */
export interface ArrivalRecord {
  id: string;
  arrivalDate: string;
  purchaseOrderId: string;
  purchaseOrderNo: string;
  goodsId: string;
  goodsName: string;
  goodsCode: string;
  locationId: number;
  locationName: string;
  handlerId: string;
  handlerName: string;
  boxQuantity: number;
  packQuantity: number;
  pieceQuantity: number;
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
  purchaseOrderId: string;
  arrivalDate: any; // dayjs object
  locationId: number;
  handlerId?: string;
  boxQuantity: number;
  packQuantity: number;
  pieceQuantity: number;
  notes?: string;
}
