/**
 * 调货管理相关类型定义
 */

export interface CreateTransferRequest {
  transferDate: string; // YYYY-MM-DD
  goodsId: string;
  sourceLocationId: string;
  destinationLocationId: string;
  handlerId: string;
  boxQuantity?: number;
  packQuantity?: number;
  pieceQuantity?: number;
  status?: TransferStatus;
  notes?: string;
}

export interface UpdateTransferRequest {
  transferDate?: string;
  goodsId?: string;
  sourceLocationId?: string;
  destinationLocationId?: string;
  handlerId?: string;
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
  handlerId?: string;
  status?: TransferStatus;
  startDate?: string;
  endDate?: string;
}

export interface TransferResponse {
  id: string;
  transferDate: string;
  goodsId: string;
  goodsName: string;
  sourceLocationId: string;
  sourceLocationName: string;
  destinationLocationId: string;
  destinationLocationName: string;
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
    pendingRecords: number;
    completedRecords: number;
    cancelledRecords: number;
  };
  message?: string;
}

export enum TransferStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}
