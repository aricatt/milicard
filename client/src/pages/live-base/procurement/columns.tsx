import React from 'react';
import { Space, Button, Popconfirm } from 'antd';
import { EditOutlined, DeleteOutlined } from '@ant-design/icons';
import type { ProColumns } from '@ant-design/pro-components';
import type { PurchaseOrder } from './types';

/**
 * 获取ProTable列定义
 */
export const getColumns = (
  handleEdit: (record: PurchaseOrder) => void,
  handleDelete: (record: PurchaseOrder) => void
): ProColumns<PurchaseOrder>[] => [
  {
    title: 'ID',
    dataIndex: 'id',
    key: 'id',
    width: 80,
    hideInSearch: true,
    hideInTable: true,
  },
  {
    title: '采购编号',
    dataIndex: 'orderNo',
    key: 'orderNo',
    width: 180,
    fixed: 'left',
    copyable: true,
    hideInSetting: true,
  },
  {
    title: '采购日期',
    dataIndex: 'purchaseDate',
    key: 'purchaseDate',
    width: 120,
    valueType: 'date',
    hideInSearch: true,
    hideInSetting: true,
  },
  {
    title: '商品名称',
    dataIndex: 'goodsName',
    key: 'goodsName',
    width: 200,
    ellipsis: true,
    hideInSetting: true,
  },
  {
    title: '供应商',
    dataIndex: 'supplierName',
    key: 'supplierName',
    width: 150,
    hideInSetting: true,
  },
  {
    title: '零售价',
    dataIndex: 'retailPrice',
    key: 'retailPrice',
    width: 100,
    hideInSearch: true,
    render: (_, record) => record.retailPrice ? `¥${record.retailPrice.toFixed(2)}` : '-',
  },
  {
    title: '折扣',
    dataIndex: 'discount',
    key: 'discount',
    width: 80,
    hideInSearch: true,
    render: (_, record) => record.discount ? `${record.discount}%` : '-',
  },
  {
    title: '采购箱',
    dataIndex: 'purchaseBoxQty',
    key: 'purchaseBoxQty',
    width: 80,
    hideInSearch: true,
    align: 'right',
  },
  {
    title: '采购盒',
    dataIndex: 'purchasePackQty',
    key: 'purchasePackQty',
    width: 80,
    hideInSearch: true,
    align: 'right',
  },
  {
    title: '采购包',
    dataIndex: 'purchasePieceQty',
    key: 'purchasePieceQty',
    width: 80,
    hideInSearch: true,
    align: 'right',
  },
  {
    title: '拿货单价/箱',
    dataIndex: 'unitPriceBox',
    key: 'unitPriceBox',
    width: 110,
    hideInSearch: true,
    render: (_, record) => record.unitPriceBox ? `¥${record.unitPriceBox.toFixed(2)}` : '-',
  },
  {
    title: '拿货单价/盒',
    dataIndex: 'unitPricePack',
    key: 'unitPricePack',
    width: 110,
    hideInSearch: true,
    render: (_, record) => record.unitPricePack ? `¥${record.unitPricePack.toFixed(2)}` : '-',
  },
  {
    title: '拿货单价/包',
    dataIndex: 'unitPricePiece',
    key: 'unitPricePiece',
    width: 110,
    hideInSearch: true,
    render: (_, record) => record.unitPricePiece ? `¥${record.unitPricePiece.toFixed(2)}` : '-',
  },
  {
    title: '应付总金额',
    dataIndex: 'totalAmount',
    key: 'totalAmount',
    width: 120,
    hideInSearch: true,
    hideInSetting: true,
    render: (_, record) => (
      <span style={{ color: '#f5222d', fontWeight: 'bold' }}>
        ¥{record.totalAmount.toFixed(2)}
      </span>
    ),
  },
  {
    title: '创建时间',
    dataIndex: 'createdAt',
    key: 'createdAt',
    width: 160,
    valueType: 'dateTime',
    hideInSearch: true,
  },
  {
    title: '操作',
    key: 'action',
    width: 150,
    fixed: 'right',
    hideInSetting: true,
    render: (_, record) => (
      <Space size="small">
        <Button
          type="link"
          size="small"
          icon={<EditOutlined />}
          onClick={() => handleEdit(record)}
        >
          编辑
        </Button>
        <Popconfirm
          title="确定删除此采购订单吗？"
          onConfirm={() => handleDelete(record)}
          okText="确定"
          cancelText="取消"
        >
          <Button
            type="link"
            size="small"
            danger
            icon={<DeleteOutlined />}
          >
            删除
          </Button>
        </Popconfirm>
      </Space>
    ),
  },
];
