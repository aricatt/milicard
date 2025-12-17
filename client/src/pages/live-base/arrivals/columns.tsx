import React from 'react';
import { Space, Button, Popconfirm, Tag, Tooltip } from 'antd';
import { DeleteOutlined, InboxOutlined, UserOutlined } from '@ant-design/icons';
import type { ProColumns } from '@ant-design/pro-components';
import type { ArrivalRecord } from './types';
import type { IntlShape } from 'react-intl';
import GoodsNameText, { getCategoryDisplayName } from '@/components/GoodsNameText';

/**
 * 获取ProTable列定义
 */
export const getColumns = (
  handleDelete: (record: ArrivalRecord) => void,
  intl?: IntlShape
): ProColumns<ArrivalRecord>[] => [
  {
    title: intl?.formatMessage({ id: 'table.column.id' }) || 'ID',
    dataIndex: 'id',
    key: 'id',
    width: 80,
    hideInSearch: true,
    hideInTable: true,
  },
  {
    title: intl?.formatMessage({ id: 'arrivals.column.date' }) || '到货日期',
    dataIndex: 'arrivalDate',
    key: 'arrivalDate',
    width: 120,
    valueType: 'date',
    hideInSearch: true,
    hideInSetting: true,
  },
  {
    title: intl?.formatMessage({ id: 'arrivals.column.orderNo' }) || '采购编号',
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
    title: intl?.formatMessage({ id: 'arrivals.column.purchaseName' }) || '采购名称',
    key: 'purchaseName',
    width: 320,
    hideInSearch: true,
    render: (_, record) => {
      // 动态生成：采购日期 + [品类] + 商品名称（换行显示）
      const date = record.purchaseDate || '';
      if (!date) return '-';
      return (
        <div style={{ lineHeight: 1.4 }}>
          <div style={{ color: '#666', fontSize: '12px' }}>{date}</div>
          <GoodsNameText 
            text={record.goodsName} 
            nameI18n={record.goodsNameI18n}
            categoryCode={record.categoryCode}
            categoryName={record.categoryName}
            showCategory={true}
          />
        </div>
      );
    },
  },
  {
    title: intl?.formatMessage({ id: 'arrivals.column.category' }) || '品类',
    dataIndex: 'categoryName',
    key: 'categoryName',
    width: 80,
    hideInSearch: true,
    render: (_, record) => {
      const displayName = getCategoryDisplayName(record.categoryCode, record.categoryName, intl?.locale);
      if (!displayName) return '-';
      return <Tag color="blue">{displayName}</Tag>;
    },
  },
  {
    title: intl?.formatMessage({ id: 'arrivals.column.product' }) || '商品',
    dataIndex: 'goodsName',
    key: 'goodsName',
    width: 220,
    hideInSetting: true,
    render: (_, record) => (
      <GoodsNameText 
        text={record.goodsName} 
        nameI18n={record.goodsNameI18n}
      />
    ),
  },
  {
    title: intl?.formatMessage({ id: 'arrivals.column.location' }) || '直播间',
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
    title: intl?.formatMessage({ id: 'arrivals.column.anchor' }) || '主播',
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
    title: intl?.formatMessage({ id: 'arrivals.column.boxQty' }) || '到货箱',
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
    title: intl?.formatMessage({ id: 'arrivals.column.packQty' }) || '到货盒',
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
    title: intl?.formatMessage({ id: 'arrivals.column.pieceQty' }) || '到货包',
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
    title: intl?.formatMessage({ id: 'arrivals.column.logisticsFee' }) || '物流费用',
    dataIndex: 'logisticsFee',
    key: 'logisticsFee',
    width: 100,
    hideInSearch: true,
    align: 'right',
    render: (_, record) => {
      const fee = record.logisticsFee || 0;
      if (fee <= 0) return '-';
      return (
        <span style={{ fontWeight: 600, color: '#1890ff' }}>
          {fee.toFixed(2)}
        </span>
      );
    },
  },
  {
    title: intl?.formatMessage({ id: 'arrivals.column.cnyLogisticsFee' }) || '人民币物流费',
    dataIndex: 'cnyLogisticsFee',
    key: 'cnyLogisticsFee',
    width: 120,
    hideInSearch: true,
    align: 'right',
    render: (_, record) => {
      const fee = record.cnyLogisticsFee || 0;
      if (fee <= 0) return '-';
      return (
        <span style={{ fontWeight: 600, color: '#eb2f96' }}>
          ¥ {fee.toFixed(2)}
        </span>
      );
    },
  },
  {
    title: intl?.formatMessage({ id: 'table.column.createdAt' }) || '创建时间',
    dataIndex: 'createdAt',
    key: 'createdAt',
    width: 160,
    valueType: 'dateTime',
    hideInSearch: true,
  },
  {
    title: intl?.formatMessage({ id: 'table.column.operation' }) || '操作',
    key: 'action',
    width: 100,
    fixed: 'right',
    hideInSetting: true,
    render: (_, record) => (
      <Space size="small">
        <Popconfirm
          title={intl?.formatMessage({ id: 'message.confirmDelete' }) || '确定删除此到货记录吗？'}
          onConfirm={() => handleDelete(record)}
          okText={intl?.formatMessage({ id: 'button.confirm' }) || '确定'}
          cancelText={intl?.formatMessage({ id: 'button.cancel' }) || '取消'}
        >
          <Tooltip title={intl?.formatMessage({ id: 'button.delete' }) || '删除'}>
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
            />
          </Tooltip>
        </Popconfirm>
      </Space>
    ),
  },
];
