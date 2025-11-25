import React from 'react';
import { Space, Button, Popover, Descriptions } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';

/**
 * 统计项配置
 */
export interface StatItem {
  label: string;
  value: number;
  color?: string;
  icon?: React.ReactNode;
  showPercentage?: boolean;
}

/**
 * 表格统计弹出组件属性
 */
export interface TableStatsPopoverProps {
  /** 总数 */
  total: number;
  /** 统计项列表 */
  items: StatItem[];
  /** 标题文本 */
  title?: string;
  /** 弹出框标题 */
  popoverTitle?: string;
  /** 弹出框宽度 */
  popoverWidth?: number;
  /** 弹出框位置 */
  placement?: 'bottomLeft' | 'bottomRight' | 'topLeft' | 'topRight';
}

/**
 * 表格统计弹出组件
 * 
 * 用于在表格标题处显示简洁的统计信息，点击可查看详细统计
 * 
 * @example
 * ```tsx
 * <TableStatsPopover
 *   total={45}
 *   title="位置列表"
 *   items={[
 *     { label: '仓库', value: 30, color: '#1890ff', icon: <DatabaseOutlined /> },
 *     { label: '直播间', value: 15, color: '#52c41a', icon: <DesktopOutlined /> },
 *     { label: '启用中', value: 42, color: '#52c41a' },
 *   ]}
 * />
 * ```
 */
const TableStatsPopover: React.FC<TableStatsPopoverProps> = ({
  total,
  items,
  title = '数据列表',
  popoverTitle = '统计详情',
  popoverWidth = 300,
  placement = 'bottomLeft',
}) => {
  // 统计详情内容
  const statsContent = (
    <div style={{ width: popoverWidth }}>
      <Descriptions column={1} size="small" bordered>
        {/* 总数 */}
        <Descriptions.Item label="总数">
          <span style={{ fontWeight: 'bold', fontSize: 16 }}>{total}</span>
        </Descriptions.Item>
        
        {/* 各项统计 */}
        {items.map((item, index) => (
          <Descriptions.Item key={index} label={item.label}>
            <Space>
              {item.icon && <span style={{ color: item.color }}>{item.icon}</span>}
              <span style={{ color: item.color, fontWeight: 'bold' }}>
                {item.value}
              </span>
              {item.showPercentage !== false && total > 0 && (
                <span style={{ color: '#999' }}>
                  ({((item.value / total) * 100).toFixed(1)}%)
                </span>
              )}
            </Space>
          </Descriptions.Item>
        ))}
      </Descriptions>
    </div>
  );

  return (
    <Space>
      <span>{title}</span>
      <span style={{ color: '#999', fontSize: 14, fontWeight: 'normal' }}>
        (共 {total} 个)
      </span>
      <Popover
        content={statsContent}
        title={popoverTitle}
        trigger="click"
        placement={placement}
      >
        <Button
          type="text"
          size="small"
          icon={<InfoCircleOutlined />}
          style={{ color: '#1890ff' }}
        >
          详情
        </Button>
      </Popover>
    </Space>
  );
};

export default TableStatsPopover;
