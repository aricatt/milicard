/**
 * 调货管理相关类型定义
 */

export interface CreateTransferRequest {
  transferDate: string; // YYYY-MM-DD
  goodsId: string;
  sourceLocationId: number;
  sourceHandlerId: string;        // 调出主播
  destinationLocationId: number;
  destinationHandlerId: string;   // 调入主播
  boxQuantity?: number;
  packQuantity?: number;
  pieceQuantity?: number;
  status?: TransferStatus;
  notes?: string;
}

export interface UpdateTransferRequest {
  transferDate?: string;
  goodsId?: string;
  sourceLocationId?: number;
  sourceHandlerId?: string;
  destinationLocationId?: number;
  destinationHandlerId?: string;
  boxQuantity?: number;
  packQuantity?: number;
  pieceQuantity?: number;
  status?: TransferStatus;
  notes?: string;
}

export interface TransferQueryParams {
  current?: number;
  pageSize?: number;
  sourceLocationId?: string;
  destinationLocationId?: string;
  goodsId?: string;
  goodsName?: string;  // 商品名称模糊搜索
  handlerId?: string;
  status?: TransferStatus;
  startDate?: string;
  endDate?: string;
}

export interface NameI18n {
  en?: string;
  th?: string;
  vi?: string;
  [key: string]: string | undefined;
}

export interface TransferResponse {
  id: string;
  transferDate: string;
  goodsId: string;
  goodsCode?: string;
  goodsName: string;
  goodsNameI18n?: NameI18n | null;
  sourceLocationId: number;
  sourceLocationName: string;
  sourceHandlerName?: string;
  destinationLocationId: number;
  destinationLocationName: string;
  destinationHandlerName?: string;
  handlerId: string;
  handlerName: string;
  baseId: number;
  baseName: string;
  boxQuantity: number;
  packQuantity: number;
  pieceQuantity: number;
  status: TransferStatus;
  notes?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TransferListResponse {
  success: boolean;
  data: TransferResponse[];
  total: number;
  current: number;
  pageSize: number;
  message?: string;
}

export interface TransferStatsResponse {
  success: boolean;
  data: {
    totalRecords: number;
    totalGoods: number;
    totalBoxQuantity: number;
    totalPackQuantity: number;
    totalPieceQuantity: number;
    todayRecords: number;
  };
  message?: string;
}

export enum TransferStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}
