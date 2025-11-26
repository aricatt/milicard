/**
 * 到货管理相关类型定义
 */

export interface CreateArrivalRequest {
  arrivalDate: string; // YYYY-MM-DD
  purchaseOrderId: string;
  goodsId: string;
  locationId: number;
  handlerId: string;
  boxQuantity?: number;
  packQuantity?: number;
  pieceQuantity?: number;
  notes?: string;
}

export interface UpdateArrivalRequest {
  arrivalDate?: string;
  purchaseOrderId?: string;
  goodsId?: string;
  locationId?: number;
  handlerId?: string;
  boxQuantity?: number;
  packQuantity?: number;
  pieceQuantity?: number;
  notes?: string;
}

export interface ArrivalQueryParams {
  current?: number;
  pageSize?: number;
  warehouseId?: string;
  purchaseOrderId?: string;
  purchaseOrderNo?: string;  // 采购编号（模糊搜索）
  goodsId?: string;
  goodsName?: string;        // 商品名称（模糊搜索）
  handlerId?: string;
  startDate?: string;
  endDate?: string;
}

export interface ArrivalResponse {
  id: string;
  arrivalDate: string;
  purchaseOrderId: string;
  purchaseOrderNo: string;
  purchaseDate: string;           // 采购日期（用于生成采购名称）
  goodsId: string;
  goodsCode: string;
  goodsName: string;
  locationId: number;             // 修正类型为number
  locationName: string;
  handlerId: string;
  handlerName: string;
  baseId: number;
  baseName: string;
  boxQuantity: number;
  packQuantity: number;
  pieceQuantity: number;
  notes?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ArrivalListResponse {
  success: boolean;
  data: ArrivalResponse[];
  total: number;
  current: number;
  pageSize: number;
  message?: string;
}
