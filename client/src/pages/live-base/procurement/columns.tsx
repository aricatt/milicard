import React from 'react';
import { Space, Button, Popconfirm, Tag, Tooltip } from 'antd';
import { EditOutlined, DeleteOutlined, CarOutlined } from '@ant-design/icons';
import type { ProColumns } from '@ant-design/pro-components';
import type { PurchaseOrder } from './types';
import type { IntlShape } from 'react-intl';
import GoodsNameText, { getGoodsNameWithCategory } from '@/components/GoodsNameText';

/**
 * 向下取整到2位小数
 */
const floorTo2 = (value: number): string => {
  return (Math.floor(value * 100) / 100).toFixed(2);
};

/**
 * 获取ProTable列定义
 */
export const getColumns = (
  handleEdit: (record: PurchaseOrder) => void,
  handleDelete: (record: PurchaseOrder) => void,
  handleLogistics?: (record: PurchaseOrder) => void,
  intl?: IntlShape
): ProColumns<PurchaseOrder>[] => [
  {
    title: intl?.formatMessage({ id: 'table.column.id' }) || 'ID',
    dataIndex: 'id',
    key: 'id',
    width: 80,
    hideInSearch: true,
    hideInTable: true,
  },
  {
    title: intl?.formatMessage({ id: 'procurement.column.orderNo' }) || '采购编号',
    dataIndex: 'orderNo',
    key: 'orderNo',
    width: 180,
    fixed: 'left',
    copyable: true,
    hideInSetting: true,
  },
  {
    title: intl?.formatMessage({ id: 'procurement.column.date' }) || '采购日期',
    dataIndex: 'purchaseDate',
    key: 'purchaseDate',
    width: 120,
    valueType: 'date',
    hideInSearch: true,
    hideInSetting: true,
  },
  {
    title: intl?.formatMessage({ id: 'procurement.column.purchaseName' }) || '采购名称',
    key: 'purchaseName',
    width: 320,
    hideInSearch: true,
    render: (_, record) => {
      // 动态生成：采购日期 + [品类] + 商品名称（换行显示）
      const date = record.purchaseDate 
        ? record.purchaseDate.split('T')[0] 
        : '';
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
    title: intl?.formatMessage({ id: 'procurement.column.product' }) || '商品名称',
    dataIndex: 'goodsName',
    key: 'goodsName',
    width: 220,
    hideInSetting: true,
    render: (_, record) => (
      <GoodsNameText 
        text={record.goodsName} 
        nameI18n={record.goodsNameI18n}
        categoryCode={record.categoryCode}
        categoryName={record.categoryName}
        showCategory={true}
      />
    ),
  },
  {
    title: intl?.formatMessage({ id: 'procurement.column.supplier' }) || '供应商',
    dataIndex: 'supplierName',
    key: 'supplierName',
    width: 100,
    hideInSetting: true,
  },
  {
    title: intl?.formatMessage({ id: 'procurement.column.retailPrice' }) || '零售价',
    dataIndex: 'retailPrice',
    key: 'retailPrice',
    width: 100,
    hideInSearch: true,
    render: (_, record) => record.retailPrice ? `${floorTo2(record.retailPrice)}` : '-',
  },
  {
    title: intl?.formatMessage({ id: 'procurement.column.discount' }) || '折扣%',
    key: 'discount',
    width: 60,
    hideInSearch: true,
    render: (_, record) => {
      // 折扣 = 拿货单价/箱 / 零售价 * 100
      if (record.retailPrice && record.retailPrice > 0 && record.unitPriceBox) {
        const discount = (record.unitPriceBox / record.retailPrice) * 100;
        return `${floorTo2(discount)}%`;
      }
      return '-';
    },
  },
  {
    title: intl?.formatMessage({ id: 'procurement.column.purchaseBox' }) || '采购/箱',
    dataIndex: 'purchaseBoxQty',
    key: 'purchaseBoxQty',
    width: 70,
    hideInSearch: true,
    align: 'right',
  },
  {
    title: intl?.formatMessage({ id: 'procurement.column.purchasePack' }) || '采购/盒',
    dataIndex: 'purchasePackQty',
    key: 'purchasePackQty',
    width: 70,
    hideInSearch: true,
    align: 'right',
  },
  {
    title: intl?.formatMessage({ id: 'procurement.column.purchasePiece' }) || '采购/包',
    dataIndex: 'purchasePieceQty',
    key: 'purchasePieceQty',
    width: 70,
    hideInSearch: true,
    align: 'right',
  },
  {
    title: intl?.formatMessage({ id: 'procurement.column.arrivedBox' }) || '到货/箱',
    dataIndex: 'arrivedBoxQty',
    key: 'arrivedBoxQty',
    width: 70,
    hideInSearch: true,
    align: 'right',
    render: (_, record) => record.arrivedBoxQty || 0,
  },
  {
    title: intl?.formatMessage({ id: 'procurement.column.arrivedPack' }) || '到货/盒',
    dataIndex: 'arrivedPackQty',
    key: 'arrivedPackQty',
    width: 70,
    hideInSearch: true,
    align: 'right',
    render: (_, record) => record.arrivedPackQty || 0,
  },
  {
    title: intl?.formatMessage({ id: 'procurement.column.arrivedPiece' }) || '到货/包',
    dataIndex: 'arrivedPieceQty',
    key: 'arrivedPieceQty',
    width: 70,
    hideInSearch: true,
    align: 'right',
    render: (_, record) => record.arrivedPieceQty || 0,
  },
  {
    title: intl?.formatMessage({ id: 'procurement.column.diffBox' }) || '相差/箱',
    dataIndex: 'diffBoxQty',
    key: 'diffBoxQty',
    width: 70,
    hideInSearch: true,
    align: 'right',
    render: (_, record) => {
      const diff = record.diffBoxQty || 0;
      return diff > 0 ? <span style={{ color: '#ff4d4f' }}>{diff}</span> : diff;
    },
  },
  {
    title: intl?.formatMessage({ id: 'procurement.column.diffPack' }) || '相差/盒',
    dataIndex: 'diffPackQty',
    key: 'diffPackQty',
    width: 70,
    hideInSearch: true,
    align: 'right',
    render: (_, record) => {
      const diff = record.diffPackQty || 0;
      return diff > 0 ? <span style={{ color: '#ff4d4f' }}>{diff}</span> : diff;
    },
  },
  {
    title: intl?.formatMessage({ id: 'procurement.column.diffPiece' }) || '相差/包',
    dataIndex: 'diffPieceQty',
    key: 'diffPieceQty',
    width: 70,
    hideInSearch: true,
    align: 'right',
    render: (_, record) => {
      const diff = record.diffPieceQty || 0;
      return diff > 0 ? <span style={{ color: '#ff4d4f' }}>{diff}</span> : diff;
    },
  },
  {
    title: intl?.formatMessage({ id: 'procurement.column.unitPriceBox' }) || '拿货单价/箱',
    dataIndex: 'unitPriceBox',
    key: 'unitPriceBox',
    width: 110,
    hideInSearch: true,
    render: (_, record) => record.unitPriceBox ? `${floorTo2(record.unitPriceBox)}` : '-',
  },
  {
    title: intl?.formatMessage({ id: 'procurement.column.unitPricePack' }) || '拿货单价/盒',
    dataIndex: 'unitPricePack',
    key: 'unitPricePack',
    width: 110,
    hideInSearch: true,
    render: (_, record) => record.unitPricePack ? `${floorTo2(record.unitPricePack)}` : '-',
  },
  {
    title: intl?.formatMessage({ id: 'procurement.column.unitPricePiece' }) || '拿货单价/包',
    dataIndex: 'unitPricePiece',
    key: 'unitPricePiece',
    width: 110,
    hideInSearch: true,
    render: (_, record) => record.unitPricePiece ? `${floorTo2(record.unitPricePiece)}` : '-',
  },
  {
    title: intl?.formatMessage({ id: 'procurement.column.amountBox' }) || '应付金额/箱',
    key: 'amountBox',
    width: 110,
    hideInSearch: true,
    render: (_, record) => {
      const amount = (record.purchaseBoxQty || 0) * (record.unitPriceBox || 0);
      return `${floorTo2(amount)}`;
    },
  },
  {
    title: intl?.formatMessage({ id: 'procurement.column.amountPack' }) || '应付金额/盒',
    key: 'amountPack',
    width: 110,
    hideInSearch: true,
    render: (_, record) => {
      const amount = (record.purchasePackQty || 0) * (record.unitPricePack || 0);
      return `${floorTo2(amount)}`;
    },
  },
  {
    title: intl?.formatMessage({ id: 'procurement.column.amountPiece' }) || '应付金额/包',
    key: 'amountPiece',
    width: 110,
    hideInSearch: true,
    render: (_, record) => {
      const amount = (record.purchasePieceQty || 0) * (record.unitPricePiece || 0);
      return `${floorTo2(amount)}`;
    },
  },
  {
    title: intl?.formatMessage({ id: 'procurement.column.totalAmount' }) || '应付总金额',
    dataIndex: 'totalAmount',
    key: 'totalAmount',
    width: 120,
    hideInSearch: true,
    hideInSetting: true,
    render: (_, record) => (
      <span style={{ color: '#1890ff', fontWeight: 'bold' }}>
        {floorTo2(record.totalAmount)}
      </span>
    ),
  },
  {
    title: intl?.formatMessage({ id: 'procurement.column.actualAmount' }) || '实付金额',
    dataIndex: 'actualAmount',
    key: 'actualAmount',
    width: 110,
    hideInSearch: true,
    render: (_, record) => (
      <span style={{ color: '#52c41a', fontWeight: 'bold' }}>
        {floorTo2(record.actualAmount || 0)}
      </span>
    ),
  },
  {
    title: intl?.formatMessage({ id: 'procurement.column.unpaidAmount' }) || '未支付金额',
    key: 'unpaidAmount',
    width: 110,
    hideInSearch: true,
    render: (_, record) => {
      const unpaid = (record.totalAmount || 0) - (record.actualAmount || 0);
      return (
        <span style={{ color: unpaid > 0 ? '#f5222d' : '#52c41a', fontWeight: 'bold' }}>
          {floorTo2(unpaid)}
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
    title: '物流状态',
    key: 'logisticsStatus',
    width: 80,
    fixed: 'right',
    hideInSearch: true,
    render: (_, record) => {
      const summary = record.logisticsSummary;
      
      // 没有物流记录
      if (!summary || summary.totalCount === 0) {
        return <Tag color="default">无包裹</Tag>;
      }
      
      const { totalCount, deliveredCount, inTransitCount } = summary;
      
      // 全部已签收
      if (deliveredCount === totalCount) {
        return (
          <Tooltip title={`${totalCount}个包裹全部已签收`}>
            <Tag color="success">{totalCount}个已签收</Tag>
          </Tooltip>
        );
      }
      
      // 部分已签收
      if (deliveredCount > 0) {
        return (
          <Tooltip title={`${deliveredCount}/${totalCount}已签收，${inTransitCount}在途中`}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Tag color="processing">{totalCount}个包裹</Tag>
              <span style={{ fontSize: 11, color: '#52c41a' }}>
                {deliveredCount}已签收
              </span>
            </div>
          </Tooltip>
        );
      }
      
      // 全部在途中或未查询
      return (
        <Tooltip title={inTransitCount > 0 ? `${inTransitCount}个在途中` : '点击物流按钮查询'}>
          <Tag color={inTransitCount > 0 ? 'processing' : 'warning'}>
            {totalCount}个包裹
          </Tag>
        </Tooltip>
      );
    },
  },
  {
    title: intl?.formatMessage({ id: 'table.column.operation' }) || '操作',
    key: 'action',
    width: 100,
    fixed: 'right',
    hideInSetting: true,
    render: (_, record) => (
      <Space size="small">
        {handleLogistics && (
          <Tooltip title={intl?.formatMessage({ id: 'button.view' }) || '物流'}>
            <Button
              type="link"
              size="small"
              icon={<CarOutlined />}
              onClick={() => handleLogistics(record)}
            />
          </Tooltip>
        )}
        <Tooltip title={intl?.formatMessage({ id: 'button.edit' }) || '编辑'}>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          />
        </Tooltip>
        <Popconfirm
          title={intl?.formatMessage({ id: 'message.confirmDelete' }) || '确定删除此采购订单吗？'}
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
