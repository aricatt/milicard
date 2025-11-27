// 消耗记录数据类型
export interface ConsumptionRecord {
  id: string;
  consumptionDate: string;
  goodsId: string;
  goodsCode?: string;
  goodsName?: string;
  packPerBox?: number;
  piecePerPack?: number;
  locationId: number;
  locationName?: string;
  handlerId: string;
  handlerName?: string;
  baseId: number;
  baseName?: string;
  // 期初
  openingBoxQty: number;
  openingPackQty: number;
  openingPieceQty: number;
  // 期末
  closingBoxQty: number;
  closingPackQty: number;
  closingPieceQty: number;
  // 消耗
  boxQuantity: number;
  packQuantity: number;
  pieceQuantity: number;
  // 平均单价/箱
  unitPricePerBox: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// 消耗统计数据
export interface ConsumptionStats {
  totalRecords: number;
  totalGoods: number;
  totalBoxQuantity: number;
  totalPackQuantity: number;
  totalPieceQuantity: number;
  todayRecords: number;
}

// 创建消耗表单值
export interface ConsumptionFormValues {
  consumptionDate: any;
  goodsId: string;
  locationId: number;
  handlerId: string;
  notes?: string;
}

// 下拉选项类型
export interface LocationOption {
  id: number;
  name: string;
  type?: string;
}

export interface PersonnelOption {
  id: string;
  name: string;
  role?: string;
}

export interface GoodsOption {
  id: string;
  code: string;
  name: string;
}
