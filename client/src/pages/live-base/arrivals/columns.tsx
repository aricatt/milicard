import React from 'react';
import { Space, Button, Popconfirm, Tag } from 'antd';
import { DeleteOutlined, InboxOutlined, UserOutlined } from '@ant-design/icons';
import type { ProColumns } from '@ant-design/pro-components';
import type { ArrivalRecord } from './types';

/**
 * 生成采购名称：采购日期 + 商品名称
 */
const getPurchaseName = (purchaseDate: string, goodsName: string): string => {
  if (!purchaseDate || !goodsName) return '-';
  return `${purchaseDate}${goodsName}`;
};

/**
 * 获取ProTable列定义
 */
export const getColumns = (
  handleDelete: (record: ArrivalRecord) => void
): ProColumns<ArrivalRecord>[] => [
  {
    title: 'ID',
    dataIndex: 'id',
    key: 'id',
    width: 80,
    hideInSearch: true,
    hideInTable: true,
  },
  {
    title: '到货日期',
    dataIndex: 'arrivalDate',
    key: 'arrivalDate',
    width: 120,
    valueType: 'date',
    hideInSearch: true,
    hideInSetting: true,
  },
  {
    title: '采购编号',
    dataIndex: 'purchaseOrderNo',
    key: 'purchaseOrderNo',
    width: 180,
    fixed: 'left',
    copyable: true,
    hideInSetting: true,
    render: (_, record) => (
      <span style={{ fontWeight: 500, color: '#1890ff' }}>
        {record.purchaseOrderNo}
      </span>
    ),
  },
  {
    title: '采购名称',
    key: 'purchaseName',
    width: 280,
    ellipsis: true,
    hideInSearch: true,
    render: (_, record) => getPurchaseName(record.purchaseDate, record.goodsName),
  },
  {
    title: '商品',
    dataIndex: 'goodsName',
    key: 'goodsName',
    width: 200,
    ellipsis: true,
    hideInSetting: true,
  },
  {
    title: '直播间',
    dataIndex: 'locationName',
    key: 'locationName',
    width: 140,
    hideInSearch: true,
    render: (_, record) => (
      <Tag color="blue" icon={<InboxOutlined />}>
        {record.locationName || '-'}
      </Tag>
    ),
  },
  {
    title: '主播',
    dataIndex: 'handlerName',
    key: 'handlerName',
    width: 100,
    hideInSearch: true,
    render: (_, record) => (
      <Space size={4}>
        <UserOutlined style={{ color: '#1890ff' }} />
        <span>{record.handlerName || '-'}</span>
      </Space>
    ),
  },
  {
    title: '到货箱',
    dataIndex: 'boxQuantity',
    key: 'boxQuantity',
    width: 80,
    hideInSearch: true,
    align: 'right',
    render: (_, record) => (
      <span style={{ fontWeight: 600, color: record.boxQuantity > 0 ? '#52c41a' : '#999' }}>
        {record.boxQuantity > 0 ? record.boxQuantity : '-'}
      </span>
    ),
  },
  {
    title: '到货盒',
    dataIndex: 'packQuantity',
    key: 'packQuantity',
    width: 80,
    hideInSearch: true,
    align: 'right',
    render: (_, record) => (
      <span style={{ fontWeight: 600, color: record.packQuantity > 0 ? '#1890ff' : '#999' }}>
        {record.packQuantity > 0 ? record.packQuantity : '-'}
      </span>
    ),
  },
  {
    title: '到货包',
    dataIndex: 'pieceQuantity',
    key: 'pieceQuantity',
    width: 80,
    hideInSearch: true,
    align: 'right',
    render: (_, record) => (
      <span style={{ fontWeight: 600, color: record.pieceQuantity > 0 ? '#722ed1' : '#999' }}>
        {record.pieceQuantity > 0 ? record.pieceQuantity : '-'}
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
    width: 100,
    fixed: 'right',
    hideInSetting: true,
    render: (_, record) => (
      <Space size="small">
        <Popconfirm
          title="确定删除此到货记录吗？"
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
