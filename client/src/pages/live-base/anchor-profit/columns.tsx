import type { ProColumns } from '@ant-design/pro-components';
import { Tag, Space, Popconfirm, Button, Tooltip } from 'antd';
import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import type { AnchorProfitRecord } from './types';
import type { IntlShape } from 'react-intl';

export const getColumns = (
  onEdit: (record: AnchorProfitRecord) => void,
  onDelete: (id: string) => void,
  intl?: IntlShape,
  showInCNY: boolean = false,
  exchangeRate: number = 1,
  profitMarginThreshold: number = 0.3
): ProColumns<AnchorProfitRecord>[] => {
  // 金额格式化函数，支持以人民币显示
  const formatAmount = (amount: number | undefined | null) => {
    if (amount === undefined || amount === null) return '-';
    if (showInCNY && exchangeRate > 0) {
      const cnyAmount = amount / exchangeRate;
      return `¥${cnyAmount.toFixed(2)}`;
    }
    return amount.toFixed(2);
  };

  return [
  {
    title: intl?.formatMessage({ id: 'anchorProfit.column.date' }) || '日期',
    dataIndex: 'profitDate',
    valueType: 'date',
    width: 110,
    sorter: true,
    fixed: 'left',
  },
  {
    title: intl?.formatMessage({ id: 'anchorProfit.column.anchor' }) || '主播',
    dataIndex: 'handlerName',
    width: 100,
    fixed: 'left',
    render: (_, record) => (
      <Tag color="blue">🎤 {record.handlerName}</Tag>
    ),
  },
  {
    title: intl?.formatMessage({ id: 'anchorProfit.column.goodsName' }) || '品名',
    dataIndex: 'goodsName',
    width: 150,
    ellipsis: true,
    render: (_, record) => {
      // 从关联的消耗记录获取商品信息
      // 格式：[品类名]商品名称
      if (record.consumption?.goods) {
        const goods = record.consumption.goods;
        const categoryName = goods.category?.name || '';
        const goodsName = goods.name || '';
        return (
          <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {categoryName && `[${categoryName}]`}{goodsName}
          </div>
        );
      }
      return '-';
    },
  },
  {
    title: intl?.formatMessage({ id: 'anchorProfit.column.gmv' }) || 'GMV金额',
    dataIndex: 'gmvAmount',
    valueType: 'money',
    width: 120,
    sorter: true,
    render: (_, record) => (
      <span style={{ color: '#1890ff', fontWeight: 500 }}>
        {formatAmount(record.gmvAmount)}
      </span>
    ),
  },
  {
    title: intl?.formatMessage({ id: 'anchorProfit.column.refund' }) || '退款金额',
    dataIndex: 'refundAmount',
    valueType: 'money',
    width: 110,
    render: (_, record) => (
      <span style={{ color: record.refundAmount > 0 ? '#ff4d4f' : '#999' }}>
        {formatAmount(record.refundAmount)}
      </span>
    ),
  },
  {
    title: intl?.formatMessage({ id: 'anchorProfit.column.cancelOrder' }) || '取消订单',
    dataIndex: 'cancelOrderAmount',
    valueType: 'money',
    width: 110,
    render: (_, record) => (
      <span style={{ color: record.cancelOrderAmount > 0 ? '#ff7a45' : '#999' }}>
        {formatAmount(record.cancelOrderAmount)}
      </span>
    ),
  },
  {
    title: intl?.formatMessage({ id: 'anchorProfit.column.shopOrder' }) || '店铺订单',
    dataIndex: 'shopOrderAmount',
    valueType: 'money',
    width: 110,
    render: (_, record) => (
      <span style={{ color: record.shopOrderAmount > 0 ? '#13c2c2' : '#999' }}>
        {formatAmount(record.shopOrderAmount)}
      </span>
    ),
  },
  {
    title: intl?.formatMessage({ id: 'anchorProfit.column.extra' }) || '走水金额',
    dataIndex: 'waterAmount',
    valueType: 'money',
    width: 110,
    render: (_, record) => (
      <span style={{ color: record.waterAmount > 0 ? '#52c41a' : '#999' }}>
        {formatAmount(record.waterAmount)}
      </span>
    ),
  },
  {
    title: intl?.formatMessage({ id: 'anchorProfit.column.sales' }) || '当日销售',
    dataIndex: 'salesAmount',
    valueType: 'money',
    width: 120,
    sorter: true,
    render: (_, record) => (
      <Tooltip title={intl?.formatMessage({ id: 'anchorProfit.tooltip.salesAmount' })}>
        <span style={{ color: '#722ed1', fontWeight: 500 }}>
          {formatAmount(record.salesAmount)}
        </span>
      </Tooltip>
    ),
  },
  {
    title: intl?.formatMessage({ id: 'anchorProfit.column.consumptionAmount' }) || '消耗金额',
    dataIndex: 'consumptionAmount',
    valueType: 'money',
    width: 110,
    render: (_, record) => (
      <Tooltip title="消耗金额（基于商品平拆价计算，仅用于显示）">
        <span style={{ color: '#13c2c2' }}>
          {formatAmount(record.consumptionAmount || 0)}
        </span>
      </Tooltip>
    ),
  },
  {
    title: intl?.formatMessage({ id: 'anchorProfit.column.platformFee' }) || '平台扣点',
    dataIndex: 'platformFeeAmount',
    valueType: 'money',
    width: 110,
    render: (_, record) => (
      <Tooltip title={intl?.formatMessage({ id: 'anchorProfit.tooltip.platformFee' })}>
        <span style={{ color: '#faad14' }}>
          {formatAmount(record.platformFeeAmount)}
        </span>
      </Tooltip>
    ),
  },
  {
    title: intl?.formatMessage({ id: 'anchorProfit.column.profit' }) || '利润金额',
    dataIndex: 'profitAmount',
    valueType: 'money',
    width: 120,
    sorter: true,
    render: (_, record) => (
      <Tooltip title={intl?.formatMessage({ id: 'anchorProfit.tooltip.profitAmount' })}>
        <span style={{ 
          color: record.profitAmount >= 0 ? '#52c41a' : '#ff4d4f', 
          fontWeight: 'bold' 
        }}>
          {formatAmount(record.profitAmount)}
        </span>
      </Tooltip>
    ),
  },
  {
    title: intl?.formatMessage({ id: 'anchorProfit.column.profitRate' }) || '毛利率',
    dataIndex: 'profitRate',
    width: 100,
    sorter: true,
    render: (_, record) => {
      const rate = record.profitRate;
      if (rate === null || rate === undefined) {
        return <Tag color="default">-</Tag>;
      }
      let color = '#52c41a';
      if (rate < 30) color = '#ff4d4f';
      else if (rate < 50) color = '#faad14';
      return (
        <Tooltip title={intl?.formatMessage({ id: 'anchorProfit.tooltip.profitRate' })}>
          <Tag color={rate >= 50 ? 'green' : rate >= 30 ? 'orange' : 'red'}>
            {rate.toFixed(2)}%
          </Tag>
        </Tooltip>
      );
    },
  },
  {
    title: intl?.formatMessage({ id: 'anchorProfit.column.avgPackPrice' }) || '平均单包价',
    dataIndex: 'avgPackPrice',
    width: 120,
    render: (_, record) => {
      // 平均单包价 = 真实GMV / 消耗数量(换算为包)
      if (record.consumption) {
        const consumption = record.consumption;
        const goods = consumption.goods;
        if (goods) {
          const packPerBox = goods.packPerBox || 1;  // 多少盒1箱
          const piecePerPack = goods.piecePerPack || 1;  // 多少包1盒
          // 将消耗数量换算为包（piece是最小单位"包"）
          // 总包数 = 箱数×(盒/箱)×(包/盒) + 盒数×(包/盒) + 包数
          const totalPacks = (consumption.boxQuantity || 0) * packPerBox * piecePerPack +
                            (consumption.packQuantity || 0) * piecePerPack +
                            (consumption.pieceQuantity || 0);
          
          if (totalPacks > 0 && record.salesAmount > 0) {
            const avgPrice = record.salesAmount / totalPacks;
            const tooltipText = intl?.formatMessage(
              { id: 'anchorProfit.tooltip.avgPackPrice' },
              { salesAmount: formatAmount(record.salesAmount), totalPacks: totalPacks.toFixed(2) }
            );
            return (
              <Tooltip title={tooltipText}>
                <span style={{ color: '#1890ff', fontWeight: 500 }}>
                  {formatAmount(avgPrice)}
                </span>
              </Tooltip>
            );
          }
        }
      }
      return '-';
    },
  },
  {
    title: intl?.formatMessage({ id: 'table.column.notes' }) || '备注',
    dataIndex: 'notes',
    width: 200,
    ellipsis: true,
    hideInSearch: true,
    render: (text, record) => {
      const profitRate = record.profitRate || 0;
      const needsReview = profitRate <= profitMarginThreshold * 100;
      const noteText = record.notes || '';
      
      if (needsReview) {
        const warningText = intl?.formatMessage({ id: 'anchorProfit.warning.needsReview' }) || '需要核查';
        const fullText = noteText ? `${warningText}：${noteText}` : warningText;
        return (
          <Tooltip title={fullText}>
            <span style={{ color: '#ff4d4f' }}>
              <strong>{warningText}</strong>
              {noteText && `：${noteText}`}
            </span>
          </Tooltip>
        );
      }
      
      return noteText || '-';
    },
  },
  {
    title: intl?.formatMessage({ id: 'table.column.createdAt' }) || '创建时间',
    dataIndex: 'createdAt',
    valueType: 'dateTime',
    width: 160,
    hideInSearch: true,
    sorter: true,
  },
  {
    title: intl?.formatMessage({ id: 'table.column.operation' }) || '操作',
    valueType: 'option',
    width: 120,
    fixed: 'right',
    render: (_, record) => (
      <Space size="small">
        <Tooltip title={intl?.formatMessage({ id: 'button.edit' }) || '编辑'}>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => onEdit(record)}
          />
        </Tooltip>
        <Popconfirm
          title={intl?.formatMessage({ id: 'message.confirmDelete' }) || '确定删除此记录？'}
          onConfirm={() => onDelete(record.id)}
          okText={intl?.formatMessage({ id: 'button.confirm' }) || '确定'}
          cancelText={intl?.formatMessage({ id: 'button.cancel' }) || '取消'}
        >
          <Tooltip title={intl?.formatMessage({ id: 'button.delete' }) || '删除'}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />} />
          </Tooltip>
        </Popconfirm>
      </Space>
    ),
  },
];
};
