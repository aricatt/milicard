import React from 'react';
import { Space, Button, Popconfirm, Tag, Tooltip } from 'antd';
import { DeleteOutlined, ArrowRightOutlined } from '@ant-design/icons';
import type { ProColumns } from '@ant-design/pro-components';
import type { TransferRecord } from './types';

/**
 * 获取ProTable列定义
 */
export const getColumns = (
  handleDelete: (record: TransferRecord) => void
): ProColumns<TransferRecord>[] => [
  {
    title: 'ID',
    dataIndex: 'id',
    key: 'id',
    width: 80,
    hideInSearch: true,
    hideInTable: true,
  },
  {
    title: '调货日期',
    dataIndex: 'transferDate',
    key: 'transferDate',
    width: 110,
    valueType: 'date',
    hideInSearch: true,
    hideInSetting: true,
  },
  {
    title: '商品',
    dataIndex: 'goodsName',
    key: 'goodsName',
    width: 220,
    ellipsis: true,
    hideInSetting: true,
    render: (_, record) => (
      <span style={{ fontWeight: 500 }}>
        {record.goodsName || '-'}
      </span>
    ),
  },
  {
    title: '调出直播间',
    dataIndex: 'sourceLocationName',
    key: 'sourceLocationName',
    width: 120,
    hideInSearch: true,
    render: (_, record) => (
      <Tag color="blue">{record.sourceLocationName || '-'}</Tag>
    ),
  },
  {
    title: '调出主播',
    dataIndex: 'sourceHandlerName',
    key: 'sourceHandlerName',
    width: 90,
    hideInSearch: true,
    render: (_, record) => record.sourceHandlerName || record.handlerName || '-',
  },
  {
    title: '',
    key: 'arrow',
    width: 40,
    hideInSearch: true,
    hideInSetting: true,
    align: 'center',
    render: () => <ArrowRightOutlined style={{ color: '#999' }} />,
  },
  {
    title: '调入直播间',
    dataIndex: 'destinationLocationName',
    key: 'destinationLocationName',
    width: 120,
    hideInSearch: true,
    render: (_, record) => (
      <Tag color="green">{record.destinationLocationName || '-'}</Tag>
    ),
  },
  {
    title: '调入主播',
    dataIndex: 'destinationHandlerName',
    key: 'destinationHandlerName',
    width: 90,
    hideInSearch: true,
    render: (_, record) => record.destinationHandlerName || '-',
  },
  {
    title: '调货箱',
    dataIndex: 'boxQuantity',
    key: 'boxQuantity',
    width: 80,
    hideInSearch: true,
    align: 'right',
    render: (_, record) => record.boxQuantity || 0,
  },
  {
    title: '调货盒',
    dataIndex: 'packQuantity',
    key: 'packQuantity',
    width: 80,
    hideInSearch: true,
    align: 'right',
    render: (_, record) => record.packQuantity || 0,
  },
  {
    title: '调货包',
    dataIndex: 'pieceQuantity',
    key: 'pieceQuantity',
    width: 80,
    hideInSearch: true,
    align: 'right',
    render: (_, record) => record.pieceQuantity || 0,
  },
  {
    title: '备注',
    dataIndex: 'notes',
    key: 'notes',
    width: 150,
    ellipsis: true,
    hideInSearch: true,
    render: (_, record) => record.notes || '-',
  },
  {
    title: '创建时间',
    dataIndex: 'createdAt',
    key: 'createdAt',
    width: 160,
    hideInSearch: true,
    valueType: 'dateTime',
  },
  {
    title: '操作',
    key: 'action',
    width: 80,
    fixed: 'right',
    hideInSearch: true,
    render: (_, record) => (
      <Space size="small">
        <Popconfirm
          title="确认删除"
          description={`确定要删除此调货记录吗？`}
          onConfirm={() => handleDelete(record)}
          okText="确定"
          cancelText="取消"
        >
          <Tooltip title="删除">
            <Button type="link" size="small" danger icon={<DeleteOutlined />} />
          </Tooltip>
        </Popconfirm>
      </Space>
    ),
  },
];
