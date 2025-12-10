import type { ProColumns } from '@ant-design/pro-components';
import { Tag, Space, Popconfirm, Button, Tooltip } from 'antd';
import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import type { AnchorProfitRecord } from './types';

export const getColumns = (
  onEdit: (record: AnchorProfitRecord) => void,
  onDelete: (id: string) => void
): ProColumns<AnchorProfitRecord>[] => [
  {
    title: '日期',
    dataIndex: 'profitDate',
    valueType: 'date',
    width: 110,
    sorter: true,
    fixed: 'left',
  },
  {
    title: '主播',
    dataIndex: 'handlerName',
    width: 100,
    fixed: 'left',
    render: (_, record) => (
      <Tag color="blue">🎤 {record.handlerName}</Tag>
    ),
  },
  {
    title: 'GMV金额',
    dataIndex: 'gmvAmount',
    valueType: 'money',
    width: 120,
    sorter: true,
    render: (_, record) => (
      <span style={{ color: '#1890ff', fontWeight: 500 }}>
        {record.gmvAmount.toFixed(2)}
      </span>
    ),
  },
  {
    title: '退款金额',
    dataIndex: 'refundAmount',
    valueType: 'money',
    width: 110,
    render: (_, record) => (
      <span style={{ color: record.refundAmount > 0 ? '#ff4d4f' : '#999' }}>
        {record.refundAmount.toFixed(2)}
      </span>
    ),
  },
  {
    title: '走水金额',
    dataIndex: 'waterAmount',
    valueType: 'money',
    width: 110,
    render: (_, record) => (
      <span style={{ color: record.waterAmount > 0 ? '#52c41a' : '#999' }}>
        {record.waterAmount.toFixed(2)}
      </span>
    ),
  },
  {
    title: '当日销售',
    dataIndex: 'salesAmount',
    valueType: 'money',
    width: 120,
    sorter: true,
    render: (_, record) => (
      <Tooltip title="GMV - 退款 + 走水">
        <span style={{ color: '#722ed1', fontWeight: 500 }}>
          {record.salesAmount.toFixed(2)}
        </span>
      </Tooltip>
    ),
  },
  {
    title: '消耗金额',
    dataIndex: 'consumptionAmount',
    valueType: 'money',
    width: 110,
    render: (_, record) => (
      <span style={{ color: '#fa8c16' }}>
        {record.consumptionAmount.toFixed(2)}
      </span>
    ),
  },
  {
    title: '投流金额',
    dataIndex: 'adSpendAmount',
    valueType: 'money',
    width: 110,
    render: (_, record) => (
      <span style={{ color: '#eb2f96' }}>
        {record.adSpendAmount.toFixed(2)}
      </span>
    ),
  },
  {
    title: '平台扣点',
    dataIndex: 'platformFeeAmount',
    valueType: 'money',
    width: 110,
    render: (_, record) => (
      <span style={{ color: '#faad14' }}>
        {record.platformFeeAmount.toFixed(2)}
      </span>
    ),
  },
  {
    title: '利润金额',
    dataIndex: 'profitAmount',
    valueType: 'money',
    width: 120,
    sorter: true,
    render: (_, record) => (
      <Tooltip title="销售 - 消耗 - 投流 - 平台扣点">
        <span style={{ 
          color: record.profitAmount >= 0 ? '#52c41a' : '#ff4d4f', 
          fontWeight: 'bold' 
        }}>
          {record.profitAmount.toFixed(2)}
        </span>
      </Tooltip>
    ),
  },
  {
    title: '毛利率',
    dataIndex: 'profitRate',
    width: 100,
    sorter: true,
    render: (_, record) => {
      const rate = record.profitRate;
      let color = '#52c41a';
      if (rate < 30) color = '#ff4d4f';
      else if (rate < 50) color = '#faad14';
      return (
        <Tag color={rate >= 50 ? 'green' : rate >= 30 ? 'orange' : 'red'}>
          {rate.toFixed(2)}%
        </Tag>
      );
    },
  },
  {
    title: '备注',
    dataIndex: 'notes',
    width: 150,
    ellipsis: true,
    hideInSearch: true,
  },
  {
    title: '创建时间',
    dataIndex: 'createdAt',
    valueType: 'dateTime',
    width: 160,
    hideInSearch: true,
    sorter: true,
  },
  {
    title: '操作',
    valueType: 'option',
    width: 120,
    fixed: 'right',
    render: (_, record) => (
      <Space size="small">
        <Tooltip title="编辑">
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => onEdit(record)}
          />
        </Tooltip>
        <Popconfirm
          title="确定删除此记录？"
          onConfirm={() => onDelete(record.id)}
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
