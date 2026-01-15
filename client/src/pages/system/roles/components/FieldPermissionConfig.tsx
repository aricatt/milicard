/**
 * 字段权限配置组件
 * 用于配置角色的字段级权限（可读/可写）
 */
import React, { useState, useEffect } from 'react';
import { Table, Checkbox, Button, Select, Space, App, Empty } from 'antd';
import { SaveOutlined } from '@ant-design/icons';
import { request } from '@umijs/max';

interface FieldPermission {
  id?: string;
  roleId: string;
  resource: string;
  field: string;
  canRead: boolean;
  canWrite: boolean;
}

interface ResourceField {
  key: string;
  label: string;
  type: string;
}

interface Resource {
  key: string;
  label: string;
  fields: ResourceField[];
}

interface Props {
  roleId: string;
  roleName: string;
  readOnly?: boolean;
}

// 资源定义（按照左侧菜单顺序组织）
const RESOURCES: Resource[] = [
  // ========== 全局信息 ==========
  {
    key: 'category',
    label: '商品品类',
    fields: [
      { key: 'id', label: 'ID', type: 'number' },
      { key: 'code', label: '品类编码', type: 'string' },
      { key: 'name', label: '品类名称', type: 'string' },
      { key: 'description', label: '描述', type: 'string' },
      { key: 'sortOrder', label: '排序', type: 'number' },
      { key: 'isActive', label: '状态', type: 'boolean' },
      { key: 'createdAt', label: '创建时间', type: 'date' },
      { key: 'updatedAt', label: '更新时间', type: 'date' },
    ],
  },
  {
    key: 'goods',
    label: '全局商品',
    fields: [
      { key: 'id', label: 'ID', type: 'string' },
      { key: 'code', label: '商品编号', type: 'string' },
      { key: 'name', label: '商品名称', type: 'string' },
      { key: 'nameI18n', label: '多语言名称', type: 'object' },
      { key: 'description', label: '描述', type: 'string' },
      { key: 'categoryId', label: '品类ID', type: 'number' },
      { key: 'category', label: '品类信息', type: 'object' },
      { key: 'manufacturer', label: '厂商', type: 'string' },
      { key: 'boxQuantity', label: '箱数量', type: 'number' },
      { key: 'packPerBox', label: '箱规(盒/箱)', type: 'number' },
      { key: 'piecePerPack', label: '包规(包/盒)', type: 'number' },
      { key: 'imageUrl', label: '图片URL', type: 'string' },
      { key: 'notes', label: '备注', type: 'string' },
      { key: 'isActive', label: '状态', type: 'boolean' },
      { key: 'createdAt', label: '创建时间', type: 'date' },
      { key: 'updatedAt', label: '更新时间', type: 'date' },
      { key: 'createdBy', label: '创建人', type: 'string' },
      { key: 'updatedBy', label: '更新人', type: 'string' },
      // 注意：retailPrice, packPrice, alias 已移至商品本地设置（goodsLocalSetting）
    ],
  },
  {
    key: 'currencyRate',
    label: '货币汇率',
    fields: [
      { key: 'id', label: 'ID', type: 'number' },
      { key: 'currencyCode', label: '货币代码', type: 'string' },
      { key: 'currencyName', label: '货币名称', type: 'string' },
      { key: 'fixedRate', label: '固定汇率', type: 'number' },
      { key: 'liveRate', label: '实时汇率', type: 'number' },
      { key: 'isActive', label: '状态', type: 'boolean' },
      { key: 'createdAt', label: '创建时间', type: 'date' },
      { key: 'updatedAt', label: '更新时间', type: 'date' },
    ],
  },
  // ========== 基地数据 ==========
  {
    key: 'base',
    label: '基地管理',
    fields: [
      { key: 'id', label: 'ID', type: 'number' },
      { key: 'code', label: '基地编号', type: 'string' },
      { key: 'name', label: '基地名称', type: 'string' },
      { key: 'description', label: '描述', type: 'string' },
      { key: 'address', label: '地址', type: 'string' },
      { key: 'contactPerson', label: '联系人', type: 'string' },
      { key: 'contactPhone', label: '联系电话', type: 'string' },
      { key: 'contactEmail', label: '联系邮箱', type: 'string' },
      { key: 'currency', label: '货币', type: 'string' },
      { key: 'language', label: '语言', type: 'string' },
      { key: 'type', label: '类型', type: 'string' },
      { key: 'isActive', label: '状态', type: 'boolean' },
      { key: 'createdBy', label: '创建人', type: 'string' },
      { key: 'updatedBy', label: '更新人', type: 'string' },
      { key: 'createdAt', label: '创建时间', type: 'date' },
      { key: 'updatedAt', label: '更新时间', type: 'date' },
    ],
  },
  {
    key: 'location',
    label: '直播间/仓库',
    fields: [
      { key: 'id', label: 'ID', type: 'number' },
      { key: 'code', label: '编号', type: 'string' },
      { key: 'name', label: '名称', type: 'string' },
      { key: 'type', label: '类型', type: 'string' },
      { key: 'description', label: '描述', type: 'string' },
      { key: 'address', label: '地址', type: 'string' },
      { key: 'contactPerson', label: '联系人', type: 'string' },
      { key: 'contactPhone', label: '联系电话', type: 'string' },
      { key: 'baseId', label: '基地ID', type: 'number' },
      { key: 'isActive', label: '状态', type: 'boolean' },
      { key: 'createdAt', label: '创建时间', type: 'date' },
      { key: 'updatedAt', label: '更新时间', type: 'date' },
    ],
  },
  {
    key: 'personnel',
    label: '人员管理',
    fields: [
      { key: 'id', label: 'ID', type: 'string' },
      { key: 'code', label: '人员编号', type: 'string' },
      { key: 'name', label: '姓名', type: 'string' },
      { key: 'role', label: '角色', type: 'string' },
      { key: 'phone', label: '电话', type: 'string' },
      { key: 'email', label: '邮箱', type: 'string' },
      { key: 'notes', label: '备注', type: 'string' },
      { key: 'operatorId', label: '操作员ID', type: 'string' },
      { key: 'baseId', label: '基地ID', type: 'number' },
      { key: 'isActive', label: '状态', type: 'boolean' },
      { key: 'createdBy', label: '创建人', type: 'string' },
      { key: 'updatedBy', label: '更新人', type: 'string' },
      { key: 'createdAt', label: '创建时间', type: 'date' },
      { key: 'updatedAt', label: '更新时间', type: 'date' },
    ],
  },
  {
    key: 'supplier',
    label: '供应商管理',
    fields: [
      { key: 'id', label: 'ID', type: 'string' },
      { key: 'code', label: '供应商编号', type: 'string' },
      { key: 'name', label: '供应商名称', type: 'string' },
      { key: 'contactPerson', label: '联系人', type: 'string' },
      { key: 'phone', label: '电话', type: 'string' },
      { key: 'email', label: '邮箱', type: 'string' },
      { key: 'address', label: '地址', type: 'string' },
      { key: 'taxNumber', label: '税号', type: 'string' },
      { key: 'bankAccount', label: '银行账号', type: 'string' },
      { key: 'bankName', label: '开户行', type: 'string' },
      { key: 'notes', label: '备注', type: 'string' },
      { key: 'isActive', label: '状态', type: 'boolean' },
      { key: 'createdAt', label: '创建时间', type: 'date' },
      { key: 'updatedAt', label: '更新时间', type: 'date' },
    ],
  },
  {
    key: 'goodsLocalSetting',
    label: '商品设置',
    fields: [
      { key: 'id', label: 'ID', type: 'string' },
      { key: 'goodsId', label: '商品ID', type: 'string' },
      { key: 'goods', label: '商品信息', type: 'object' },
      { key: 'baseId', label: '基地ID', type: 'number' },
      { key: 'retailPrice', label: '零售价', type: 'number' },
      { key: 'purchasePrice', label: '采购价', type: 'number' },
      { key: 'packPrice', label: '盒价', type: 'number' },
      { key: 'alias', label: '别名', type: 'string' },
      { key: 'isActive', label: '状态', type: 'boolean' },
      { key: 'createdAt', label: '创建时间', type: 'date' },
      { key: 'updatedAt', label: '更新时间', type: 'date' },
    ],
  },
  // ========== 采购管理 ==========
  {
    key: 'purchaseOrder',
    label: '采购订单',
    fields: [
      // 基础信息
      { key: 'id', label: 'ID', type: 'string' },
      { key: 'code', label: '订单号', type: 'string' },
      { key: 'baseId', label: '基地ID', type: 'number' },
      { key: 'status', label: '状态', type: 'string' },
      { key: 'purchaseDate', label: '采购日期', type: 'date' },
      
      // 供应商信息
      { key: 'supplierId', label: '供应商ID', type: 'string' },
      { key: 'supplierCode', label: '供应商编号', type: 'string' },
      { key: 'supplierName', label: '供应商', type: 'string' },
      
      // 商品信息
      { key: 'goodsId', label: '商品ID', type: 'string' },
      { key: 'goodsCode', label: '商品编号', type: 'string' },
      { key: 'goodsName', label: '商品名称', type: 'string' },
      { key: 'categoryCode', label: '品类编号', type: 'string' },
      { key: 'categoryName', label: '品类名称', type: 'string' },
      
      // 价格相关
      { key: 'retailPrice', label: '零售价', type: 'number' },
      { key: 'discount', label: '折扣', type: 'number' },
      { key: 'unitPriceBox', label: '拿货单价/箱', type: 'number' },
      { key: 'unitPricePack', label: '拿货单价/盒', type: 'number' },
      { key: 'unitPricePiece', label: '拿货单价/包', type: 'number' },
      
      // 采购数量
      { key: 'purchaseBoxQty', label: '采购/箱', type: 'number' },
      { key: 'purchasePackQty', label: '采购/盒', type: 'number' },
      { key: 'purchasePieceQty', label: '采购/包', type: 'number' },
      
      // 到货数量
      { key: 'arrivedBoxQty', label: '到货/箱', type: 'number' },
      { key: 'arrivedPackQty', label: '到货/盒', type: 'number' },
      { key: 'arrivedPieceQty', label: '到货/包', type: 'number' },
      
      // 相差数量
      { key: 'diffBoxQty', label: '相差/箱', type: 'number' },
      { key: 'diffPackQty', label: '相差/盒', type: 'number' },
      { key: 'diffPieceQty', label: '相差/包', type: 'number' },
      
      // 金额相关
      { key: 'totalAmount', label: '总金额', type: 'number' },
      { key: 'actualAmount', label: '实付金额', type: 'number' },
      { key: 'cnyPaymentAmount', label: '人民币支付', type: 'number' },
      
      // 其他信息
      { key: 'targetLocationId', label: '目标位置ID', type: 'number' },
      { key: 'targetLocation', label: '目标位置', type: 'object' },
      { key: 'notes', label: '备注', type: 'string' },
      { key: 'trackingNumbers', label: '物流单号', type: 'string' },
      { key: 'createdBy', label: '创建人', type: 'string' },
      { key: 'createdAt', label: '创建时间', type: 'date' },
      { key: 'updatedAt', label: '更新时间', type: 'date' },
    ],
  },
  {
    key: 'arrivalRecord',
    label: '到货记录',
    fields: [
      { key: 'id', label: 'ID', type: 'string' },
      { key: 'arrivalDate', label: '到货日期', type: 'date' },
      { key: 'purchaseOrderId', label: '采购订单ID', type: 'string' },
      { key: 'goodsId', label: '商品ID', type: 'string' },
      { key: 'goodsCode', label: '商品编号', type: 'string' },
      { key: 'goodsName', label: '商品名称', type: 'string' },
      { key: 'handlerId', label: '经手人ID', type: 'string' },
      { key: 'handlerName', label: '经手人', type: 'string' },
      { key: 'baseId', label: '基地ID', type: 'number' },
      { key: 'locationId', label: '位置ID', type: 'number' },
      { key: 'locationName', label: '位置名称', type: 'string' },
      { key: 'boxQuantity', label: '箱数', type: 'number' },
      { key: 'packQuantity', label: '盒数', type: 'number' },
      { key: 'pieceQuantity', label: '包数', type: 'number' },
      { key: 'logisticsFee', label: '物流费', type: 'number' },
      { key: 'cnyLogisticsFee', label: '人民币物流费', type: 'number' },
      { key: 'notes', label: '备注', type: 'string' },
      { key: 'createdBy', label: '创建人', type: 'string' },
      { key: 'updatedBy', label: '更新人', type: 'string' },
      { key: 'createdAt', label: '创建时间', type: 'date' },
      { key: 'updatedAt', label: '更新时间', type: 'date' },
    ],
  },
  {
    key: 'transferRecord',
    label: '调货记录',
    fields: [
      { key: 'id', label: 'ID', type: 'string' },
      { key: 'transferDate', label: '调货日期', type: 'date' },
      { key: 'goodsId', label: '商品ID', type: 'string' },
      { key: 'goodsCode', label: '商品编号', type: 'string' },
      { key: 'goodsName', label: '商品名称', type: 'string' },
      { key: 'baseId', label: '基地ID', type: 'number' },
      { key: 'sourceLocationId', label: '源位置ID', type: 'number' },
      { key: 'sourceLocationName', label: '源位置', type: 'string' },
      { key: 'destinationLocationId', label: '目标位置ID', type: 'number' },
      { key: 'destinationLocationName', label: '目标位置', type: 'string' },
      { key: 'sourceHandlerId', label: '源经手人ID', type: 'string' },
      { key: 'sourceHandlerName', label: '源经手人', type: 'string' },
      { key: 'destinationHandlerId', label: '目标经手人ID', type: 'string' },
      { key: 'destinationHandlerName', label: '目标经手人', type: 'string' },
      { key: 'boxQuantity', label: '箱数', type: 'number' },
      { key: 'packQuantity', label: '盒数', type: 'number' },
      { key: 'pieceQuantity', label: '包数', type: 'number' },
      { key: 'status', label: '状态', type: 'string' },
      { key: 'notes', label: '备注', type: 'string' },
      { key: 'createdBy', label: '创建人', type: 'string' },
      { key: 'updatedBy', label: '更新人', type: 'string' },
      { key: 'createdAt', label: '创建时间', type: 'date' },
      { key: 'updatedAt', label: '更新时间', type: 'date' },
    ],
  },
  {
    key: 'stockConsumption',
    label: '库存消耗',
    fields: [
      { key: 'id', label: 'ID', type: 'string' },
      { key: 'consumptionDate', label: '消耗日期', type: 'date' },
      { key: 'goodsId', label: '商品ID', type: 'string' },
      { key: 'goodsCode', label: '商品编号', type: 'string' },
      { key: 'goodsName', label: '商品名称', type: 'string' },
      { key: 'baseId', label: '基地ID', type: 'number' },
      { key: 'locationId', label: '位置ID', type: 'number' },
      { key: 'locationName', label: '位置名称', type: 'string' },
      { key: 'handlerId', label: '经手人ID', type: 'string' },
      { key: 'handlerName', label: '经手人', type: 'string' },
      { key: 'boxQuantity', label: '箱数', type: 'number' },
      { key: 'packQuantity', label: '盒数', type: 'number' },
      { key: 'pieceQuantity', label: '包数', type: 'number' },
      { key: 'openingBoxQty', label: '期初箱数', type: 'number' },
      { key: 'openingPackQty', label: '期初盒数', type: 'number' },
      { key: 'openingPieceQty', label: '期初包数', type: 'number' },
      { key: 'closingBoxQty', label: '期末箱数', type: 'number' },
      { key: 'closingPackQty', label: '期末盒数', type: 'number' },
      { key: 'closingPieceQty', label: '期末包数', type: 'number' },
      { key: 'unitPricePerBox', label: '箱单价', type: 'number' },
      { key: 'notes', label: '备注', type: 'string' },
      { key: 'createdBy', label: '创建人', type: 'string' },
      { key: 'updatedBy', label: '更新人', type: 'string' },
      { key: 'createdAt', label: '创建时间', type: 'date' },
      { key: 'updatedAt', label: '更新时间', type: 'date' },
    ],
  },
  {
    key: 'anchorProfit',
    label: '主播利润',
    fields: [
      { key: 'id', label: 'ID', type: 'string' },
      { key: 'profitDate', label: '利润日期', type: 'date' },
      { key: 'locationId', label: '直播间ID', type: 'number' },
      { key: 'locationName', label: '直播间', type: 'string' },
      { key: 'gmvAmount', label: 'GMV金额', type: 'number' },
      { key: 'refundAmount', label: '退款金额', type: 'number' },
      { key: 'offlineAmount', label: '线下金额', type: 'number' },
      { key: 'consumptionValue', label: '消耗价值', type: 'number' },
      { key: 'adCost', label: '广告费', type: 'number' },
      { key: 'platformFeeRate', label: '平台费率', type: 'number' },
      { key: 'platformFee', label: '平台费', type: 'number' },
      { key: 'dailySales', label: '日销售额', type: 'number' },
      { key: 'profitAmount', label: '利润金额', type: 'number' },
      { key: 'profitRate', label: '利润率', type: 'number' },
      { key: 'consumptionId', label: '消耗记录ID', type: 'string' },
      { key: 'notes', label: '备注', type: 'string' },
      { key: 'createdBy', label: '创建人', type: 'string' },
      { key: 'createdAt', label: '创建时间', type: 'date' },
      { key: 'updatedAt', label: '更新时间', type: 'date' },
    ],
  },
  {
    key: 'stockOut',
    label: '出库记录',
    fields: [
      { key: 'id', label: 'ID', type: 'string' },
      { key: 'date', label: '出库日期', type: 'date' },
      { key: 'baseId', label: '基地ID', type: 'number' },
      { key: 'goodsId', label: '商品ID', type: 'string' },
      { key: 'goods', label: '商品信息', type: 'object' },
      { key: 'locationId', label: '位置ID', type: 'number' },
      { key: 'location', label: '出库仓库', type: 'object' },
      { key: 'type', label: '出库类型', type: 'string' },
      { key: 'targetName', label: '目标名称', type: 'string' },
      { key: 'relatedOrderId', label: '关联订单ID', type: 'string' },
      { key: 'relatedOrderCode', label: '关联订单号', type: 'string' },
      { key: 'boxQuantity', label: '箱数', type: 'number' },
      { key: 'packQuantity', label: '盒数', type: 'number' },
      { key: 'pieceQuantity', label: '包数', type: 'number' },
      { key: 'remark', label: '备注', type: 'string' },
      { key: 'createdBy', label: '创建人ID', type: 'string' },
      { key: 'creator', label: '创建人信息', type: 'object' },
      { key: 'createdAt', label: '创建时间', type: 'date' },
      { key: 'updatedAt', label: '更新时间', type: 'date' },
    ],
  },
  {
    key: 'inventory',
    label: '实时库存',
    fields: [
      { key: 'goodsId', label: '商品ID', type: 'string' },
      { key: 'goodsCode', label: '商品编号', type: 'string' },
      { key: 'goodsName', label: '商品名称', type: 'string' },
      { key: 'goodsNameI18n', label: '商品多语言名称', type: 'object' },
      { key: 'categoryCode', label: '品类编码', type: 'string' },
      { key: 'categoryName', label: '品类名称', type: 'string' },
      { key: 'packPerBox', label: '箱规', type: 'number' },
      { key: 'piecePerPack', label: '包规', type: 'number' },
      { key: 'stockBox', label: '库存箱数', type: 'number' },
      { key: 'stockPack', label: '库存盒数', type: 'number' },
      { key: 'stockPiece', label: '库存包数', type: 'number' },
      { key: 'avgPricePerBox', label: '平均箱价', type: 'number' },
      { key: 'avgPricePerPack', label: '平均盒价', type: 'number' },
      { key: 'avgPricePerPiece', label: '平均包价', type: 'number' },
      { key: 'totalValue', label: '总价值', type: 'number' },
    ],
  },
  {
    key: 'payable',
    label: '应付账款',
    fields: [
      { key: 'id', label: 'ID', type: 'string' },
      { key: 'purchaseOrderId', label: '采购订单ID', type: 'string' },
      { key: 'purchaseOrderCode', label: '采购订单号', type: 'string' },
      { key: 'supplierName', label: '供应商', type: 'string' },
      { key: 'totalAmount', label: '总金额', type: 'number' },
      { key: 'paidAmount', label: '已付金额', type: 'number' },
      { key: 'pendingAmount', label: '待付金额', type: 'number' },
      { key: 'dueDate', label: '到期日期', type: 'date' },
      { key: 'notes', label: '备注', type: 'string' },
      { key: 'createdBy', label: '创建人', type: 'string' },
      { key: 'createdAt', label: '创建时间', type: 'date' },
      { key: 'updatedAt', label: '更新时间', type: 'date' },
    ],
  },
  // ========== 点位管理 ==========
  {
    key: 'point',
    label: '点位',
    fields: [
      { key: 'code', label: '编号', type: 'string' },
      { key: 'name', label: '名称', type: 'string' },
      { key: 'address', label: '地址', type: 'string' },
      { key: 'contactPerson', label: '联系人', type: 'string' },
      { key: 'contactPhone', label: '联系电话', type: 'string' },
      { key: 'ownerId', label: '老板', type: 'string' },
      { key: 'dealerId', label: '经销商', type: 'string' },
      { key: 'notes', label: '备注', type: 'string' },
      { key: 'isActive', label: '状态', type: 'boolean' },
    ],
  },
  {
    key: 'pointOrder',
    label: '点位订单',
    fields: [
      { key: 'id', label: 'ID', type: 'string' },
      { key: 'code', label: '订单号', type: 'string' },
      { key: 'pointId', label: '点位ID', type: 'string' },
      { key: 'point', label: '点位信息', type: 'object' },
      { key: 'baseId', label: '基地ID', type: 'number' },
      { key: 'orderDate', label: '订单日期', type: 'date' },
      { key: 'totalAmount', label: '总金额', type: 'number' },
      { key: 'paidAmount', label: '已付金额', type: 'number' },
      { key: 'status', label: '状态', type: 'string' },
      { key: 'paymentStatus', label: '付款状态', type: 'string' },
      { key: 'paymentNotes', label: '付款备注', type: 'string' },
      { key: 'shippingAddress', label: '收货地址', type: 'string' },
      { key: 'shippingPhone', label: '收货电话', type: 'string' },
      { key: 'trackingNumber', label: '物流单号', type: 'string' },
      { key: 'deliveryPerson', label: '配送员', type: 'string' },
      { key: 'deliveryPhone', label: '配送电话', type: 'string' },
      { key: 'confirmedAt', label: '确认时间', type: 'date' },
      { key: 'shippedAt', label: '发货时间', type: 'date' },
      { key: 'deliveredAt', label: '送达时间', type: 'date' },
      { key: 'completedAt', label: '完成时间', type: 'date' },
      { key: 'cancelledAt', label: '取消时间', type: 'date' },
      { key: 'notes', label: '备注', type: 'string' },
      { key: 'customerNotes', label: '客户备注', type: 'string' },
      { key: 'staffNotes', label: '员工备注', type: 'string' },
      { key: 'createdBy', label: '创建人ID', type: 'string' },
      { key: 'creator', label: '创建人信息', type: 'object' },
      { key: 'confirmedBy', label: '确认人ID', type: 'string' },
      { key: 'confirmer', label: '确认人信息', type: 'object' },
      { key: 'createdAt', label: '创建时间', type: 'date' },
      { key: 'updatedAt', label: '更新时间', type: 'date' },
      { key: 'items', label: '订单明细', type: 'array' },
    ],
  },
  {
    key: 'locationProfit',
    label: '点位利润',
    fields: [
      { key: 'id', label: 'ID', type: 'string' },
      { key: 'pointId', label: '点位ID', type: 'string' },
      { key: 'point', label: '点位信息', type: 'object' },
      { key: 'baseId', label: '基地ID', type: 'number' },
      { key: 'startDate', label: '开始日期', type: 'date' },
      { key: 'endDate', label: '结束日期', type: 'date' },
      { key: 'totalSalesAmount', label: '总销售额', type: 'number' },
      { key: 'totalCostAmount', label: '总成本', type: 'number' },
      { key: 'profitAmount', label: '利润金额', type: 'number' },
      { key: 'profitRate', label: '利润率', type: 'number' },
      { key: 'notes', label: '备注', type: 'string' },
      { key: 'createdBy', label: '创建人ID', type: 'string' },
      { key: 'creator', label: '创建人信息', type: 'object' },
      { key: 'createdAt', label: '创建时间', type: 'date' },
    ],
  },
  // ========== 用户管理 ==========
  {
    key: 'user',
    label: '用户',
    fields: [
      { key: 'username', label: '用户名', type: 'string' },
      { key: 'name', label: '姓名', type: 'string' },
      { key: 'email', label: '邮箱', type: 'string' },
      { key: 'phone', label: '电话', type: 'string' },
      { key: 'isActive', label: '状态', type: 'boolean' },
    ],
  },
];

const FieldPermissionConfig: React.FC<Props> = ({ roleId, roleName, readOnly = false }) => {
  const [selectedResource, setSelectedResource] = useState<string>('category');
  const [permissions, setPermissions] = useState<Map<string, FieldPermission>>(new Map());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const { message } = App.useApp();

  // 获取字段权限
  const fetchPermissions = async () => {
    setLoading(true);
    try {
      const result = await request(`/api/v1/roles/${roleId}/field-permissions`);
      if (result.success) {
        const permMap = new Map<string, FieldPermission>();
        (result.data || []).forEach((p: FieldPermission) => {
          permMap.set(`${p.resource}:${p.field}`, p);
        });
        setPermissions(permMap);
      }
    } catch (error) {
      console.error('获取字段权限失败', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPermissions();
  }, [roleId]);

  // 获取当前资源的字段列表
  const currentResource = RESOURCES.find(r => r.key === selectedResource);
  const currentFields = currentResource?.fields || [];

  // 获取字段权限
  const getFieldPermission = (field: string): { canRead: boolean; canWrite: boolean } => {
    const key = `${selectedResource}:${field}`;
    const perm = permissions.get(key);
    // 默认都是允许的
    return {
      canRead: perm?.canRead ?? true,
      canWrite: perm?.canWrite ?? true,
    };
  };

  // 更新字段权限
  const updateFieldPermission = (field: string, type: 'canRead' | 'canWrite', value: boolean) => {
    const key = `${selectedResource}:${field}`;
    const existing = permissions.get(key) || {
      roleId,
      resource: selectedResource,
      field,
      canRead: true,
      canWrite: true,
    };

    const updated = { ...existing, [type]: value };
    
    // 如果不可读，则也不可写
    if (type === 'canRead' && !value) {
      updated.canWrite = false;
    }

    const newPermissions = new Map(permissions);
    newPermissions.set(key, updated);
    setPermissions(newPermissions);
    setHasChanges(true);
  };

  // 保存权限
  const handleSave = async () => {
    setSaving(true);
    try {
      // 保存当前资源的所有字段权限（包括默认值）
      const permissionsToSave = currentFields.map(field => {
        const key = `${selectedResource}:${field.key}`;
        const perm = permissions.get(key);
        return {
          roleId,
          resource: selectedResource,
          field: field.key,
          canRead: perm?.canRead ?? true,
          canWrite: perm?.canWrite ?? true,
        };
      });

      const result = await request(`/api/v1/roles/${roleId}/field-permissions`, {
        method: 'PUT',
        data: { permissions: permissionsToSave },
      });

      if (result.success) {
        message.success('保存成功');
        setHasChanges(false);
      } else {
        message.error(result.message || '保存失败');
      }
    } catch (error: any) {
      message.error(error?.response?.data?.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  // 全选/取消全选
  const handleSelectAll = (type: 'canRead' | 'canWrite', value: boolean) => {
    const newPermissions = new Map(permissions);
    currentFields.forEach(field => {
      const key = `${selectedResource}:${field.key}`;
      const existing = newPermissions.get(key) || {
        roleId,
        resource: selectedResource,
        field: field.key,
        canRead: true,
        canWrite: true,
      };
      
      const updated = { ...existing, [type]: value };
      if (type === 'canRead' && !value) {
        updated.canWrite = false;
      }
      newPermissions.set(key, updated);
    });
    setPermissions(newPermissions);
    setHasChanges(true);
  };

  // 检查是否全选
  const isAllChecked = (type: 'canRead' | 'canWrite') => {
    return currentFields.every(field => getFieldPermission(field.key)[type]);
  };

  const columns = [
    {
      title: '字段',
      dataIndex: 'label',
      key: 'label',
      width: 150,
    },
    {
      title: (
        <Space>
          <Checkbox
            checked={isAllChecked('canRead')}
            onChange={(e) => handleSelectAll('canRead', e.target.checked)}
            disabled={readOnly}
          />
          可查看
        </Space>
      ),
      dataIndex: 'canRead',
      key: 'canRead',
      width: 120,
      render: (_: any, record: ResourceField) => {
        const perm = getFieldPermission(record.key);
        return (
          <Checkbox
            checked={perm.canRead}
            onChange={(e) => updateFieldPermission(record.key, 'canRead', e.target.checked)}
            disabled={readOnly}
          />
        );
      },
    },
    {
      title: (
        <Space>
          <Checkbox
            checked={isAllChecked('canWrite')}
            onChange={(e) => handleSelectAll('canWrite', e.target.checked)}
            disabled={readOnly}
          />
          可编辑
        </Space>
      ),
      dataIndex: 'canWrite',
      key: 'canWrite',
      width: 120,
      render: (_: any, record: ResourceField) => {
        const perm = getFieldPermission(record.key);
        return (
          <Checkbox
            checked={perm.canWrite}
            disabled={!perm.canRead || readOnly}
            onChange={(e) => updateFieldPermission(record.key, 'canWrite', e.target.checked)}
          />
        );
      },
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Space>
          <span style={{ color: '#666' }}>资源：</span>
          <Select
            value={selectedResource}
            onChange={setSelectedResource}
            style={{ width: 150 }}
            options={RESOURCES.map(r => ({ label: r.label, value: r.key }))}
          />
        </Space>
        {!readOnly && (
          <Button
            type="primary"
            icon={<SaveOutlined />}
            onClick={handleSave}
            loading={saving}
            disabled={!hasChanges}
          >
            保存
          </Button>
        )}
      </div>

      <div style={{ marginBottom: 8, color: '#666', fontSize: 12 }}>
        {readOnly ? '查看' : '配置'} <strong>{roleName}</strong> 角色对 <strong>{currentResource?.label}</strong> 资源各字段的访问权限
      </div>

      {currentFields.length === 0 ? (
        <Empty description="该资源暂无可配置的字段" />
      ) : (
        <Table
          rowKey="key"
          columns={columns}
          dataSource={currentFields}
          loading={loading}
          pagination={false}
          size="small"
        />
      )}
    </div>
  );
};

export default FieldPermissionConfig;
