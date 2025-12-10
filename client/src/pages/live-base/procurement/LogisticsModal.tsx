import React, { useState, useEffect } from 'react';
import { 
  Modal, 
  Timeline, 
  Button, 
  Spin, 
  Empty, 
  Tag, 
  Space, 
  Typography,
  Alert,
  Input,
  List,
  Card,
  Popconfirm,
  App,
  Collapse
} from 'antd';
import { 
  ReloadOutlined, 
  CarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  PlusOutlined,
  DeleteOutlined,
  DownOutlined
} from '@ant-design/icons';
import { request } from '@umijs/max';
import type { PurchaseOrder, LogisticsSummary, LogisticsRecordInfo } from './types';
import { LOGISTICS_STATE_MAP } from './types';
import dayjs from 'dayjs';

const { Text, Title } = Typography;

interface LogisticsModalProps {
  visible: boolean;
  record: PurchaseOrder | null;
  baseId: number;
  onClose: () => void;
  onRefreshSuccess?: () => void;
}

/**
 * 获取物流状态颜色
 */
const getLogisticsStateColor = (state: number | null): string => {
  if (!state) return 'default';
  switch (state) {
    case 3: return 'success';  // 已签收
    case 1:
    case 2:
    case 5: return 'processing'; // 在途中、派件中、揽收
    case 4:
    case 6:
    case 8:
    case 9:
    case 13: return 'error'; // 派送失败、退回、疑难、退签、清关异常
    default: return 'warning';
  }
};

const LogisticsModal: React.FC<LogisticsModalProps> = ({
  visible,
  record,
  baseId,
  onClose,
  onRefreshSuccess
}) => {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<LogisticsSummary | null>(null);
  const [newTrackingNumber, setNewTrackingNumber] = useState('');
  const [addingLoading, setAddingLoading] = useState(false);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);

  // 获取订单ID（优先使用purchaseOrderId，否则使用id）
  const getOrderId = () => record?.purchaseOrderId || record?.id;

  // 获取物流信息
  const fetchLogistics = async () => {
    const orderId = getOrderId();
    if (!orderId) return;
    
    setLoading(true);
    try {
      const res = await request(`/api/v1/bases/${baseId}/purchase-orders/${orderId}/logistics`);
      if (res.success) {
        setSummary(res.data);
        // 默认展开第一个
        if (res.data.records.length > 0) {
          setExpandedKeys([res.data.records[0].id]);
        }
      }
    } catch (error) {
      console.error('获取物流信息失败', error);
    } finally {
      setLoading(false);
    }
  };

  // 添加物流单号
  const handleAddTrackingNumber = async () => {
    const orderId = getOrderId();
    if (!orderId || !newTrackingNumber.trim()) return;
    
    setAddingLoading(true);
    try {
      const res = await request(`/api/v1/bases/${baseId}/purchase-orders/${orderId}/logistics`, {
        method: 'POST',
        data: { trackingNumber: newTrackingNumber.trim() }
      });
      if (res.success) {
        message.success('物流单号已添加');
        setNewTrackingNumber('');
        fetchLogistics();
        onRefreshSuccess?.();
      } else {
        message.error(res.message || '添加失败');
      }
    } catch (error: any) {
      message.error(error?.message || '添加失败');
    } finally {
      setAddingLoading(false);
    }
  };

  // 删除物流记录
  const handleDeleteRecord = async (logisticsId: string) => {
    const orderId = getOrderId();
    if (!orderId) return;
    
    try {
      const res = await request(`/api/v1/bases/${baseId}/purchase-orders/${orderId}/logistics/${logisticsId}`, {
        method: 'DELETE'
      });
      if (res.success) {
        message.success('物流记录已删除');
        fetchLogistics();
        onRefreshSuccess?.();
      } else {
        message.error(res.message || '删除失败');
      }
    } catch (error: any) {
      message.error(error?.message || '删除失败');
    }
  };

  // 刷新单个物流记录
  const handleRefreshRecord = async (logisticsId: string) => {
    const orderId = getOrderId();
    if (!orderId) return;
    
    setRefreshingId(logisticsId);
    try {
      const res = await request(`/api/v1/bases/${baseId}/purchase-orders/${orderId}/logistics/${logisticsId}/refresh`, {
        method: 'POST'
      });
      if (res.success) {
        message.success('物流信息已更新');
        fetchLogistics();
        onRefreshSuccess?.();
      } else {
        message.error(res.message || '刷新失败');
      }
    } catch (error: any) {
      message.error(error?.message || '刷新失败');
    } finally {
      setRefreshingId(null);
    }
  };

  // 计算距离下次可刷新的时间
  const getRefreshCooldownText = (updatedAt: string | null) => {
    if (!updatedAt) return '';
    const lastUpdate = dayjs(updatedAt);
    const nextRefresh = lastUpdate.add(1, 'hour');
    const now = dayjs();
    if (now.isAfter(nextRefresh)) return '';
    const minutes = nextRefresh.diff(now, 'minute');
    return `${minutes}分钟后可刷新`;
  };

  useEffect(() => {
    if (visible && record) {
      fetchLogistics();
    } else {
      setSummary(null);
      setNewTrackingNumber('');
      setExpandedKeys([]);
    }
  }, [visible, record]);

  // 渲染单个物流记录
  const renderLogisticsRecord = (item: LogisticsRecordInfo) => {
    const isDelivered = item.state === 3;
    const isRefreshing = refreshingId === item.id;
    
    return (
      <Card 
        key={item.id}
        size="small"
        style={{ marginBottom: 12 }}
        title={
          <Space>
            <Text copyable={{ text: item.trackingNumber }}>{item.trackingNumber}</Text>
            <Tag color={getLogisticsStateColor(item.state)}>{item.stateName}</Tag>
          </Space>
        }
        extra={
          <Space>
            {!isDelivered && item.canRefresh && (
              <Button
                type="link"
                size="small"
                icon={<ReloadOutlined spin={isRefreshing} />}
                onClick={() => handleRefreshRecord(item.id)}
                loading={isRefreshing}
              >
                刷新
              </Button>
            )}
            {!isDelivered && !item.canRefresh && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                <ClockCircleOutlined /> {getRefreshCooldownText(item.updatedAt)}
              </Text>
            )}
            <Popconfirm
              title="确定删除此物流记录吗？"
              onConfirm={() => handleDeleteRecord(item.id)}
              okText="确定"
              cancelText="取消"
            >
              <Button type="link" size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          </Space>
        }
      >
        {item.companyName && (
          <div style={{ marginBottom: 8 }}>
            <Text type="secondary">快递公司：</Text>
            <Text>{item.companyName}</Text>
          </div>
        )}
        
        {item.updatedAt && (
          <div style={{ marginBottom: 8 }}>
            <Text type="secondary">更新时间：</Text>
            <Text>{dayjs(item.updatedAt).format('YYYY-MM-DD HH:mm:ss')}</Text>
          </div>
        )}

        {/* 物流轨迹 */}
        {item.tracks && item.tracks.length > 0 ? (
          <Collapse 
            ghost 
            size="small"
            items={[{
              key: 'tracks',
              label: <Text type="secondary">查看物流轨迹 ({item.tracks.length}条)</Text>,
              children: (
                <Timeline
                  items={item.tracks.slice(0, 10).map((track, index) => ({
                    color: index === 0 ? 'green' : 'gray',
                    children: (
                      <div>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {track.time}
                        </Text>
                        <div style={{ fontSize: 13 }}>{track.status}</div>
                      </div>
                    ),
                  }))}
                />
              )
            }]}
          />
        ) : (
          !item.state && <Text type="secondary">暂无物流轨迹，请点击刷新按钮查询</Text>
        )}
      </Card>
    );
  };

  return (
    <Modal
      title={
        <Space>
          <CarOutlined />
          <span>物流管理</span>
          {record?.orderNo && <Tag>{record.orderNo}</Tag>}
        </Space>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      width={700}
    >
      {/* 添加物流单号 */}
      <div style={{ marginBottom: 16 }}>
        <Text strong>添加物流单号：</Text>
        <Space style={{ marginTop: 8, width: '100%' }}>
          <Input
            value={newTrackingNumber}
            onChange={e => setNewTrackingNumber(e.target.value)}
            placeholder="请输入物流单号"
            style={{ width: 300 }}
            onPressEnter={handleAddTrackingNumber}
          />
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={handleAddTrackingNumber}
            loading={addingLoading}
            disabled={!newTrackingNumber.trim()}
          >
            添加
          </Button>
        </Space>
      </div>

      {/* 加载中 */}
      {loading && (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Spin />
        </div>
      )}

      {/* 物流汇总 */}
      {!loading && summary && summary.totalCount > 0 && (
        <div style={{ 
          background: '#f5f5f5', 
          padding: 12, 
          borderRadius: 8, 
          marginBottom: 16 
        }}>
          <Space size="large">
            <span>
              <Text type="secondary">总包裹：</Text>
              <Text strong>{summary.totalCount}</Text>
            </span>
            <span>
              <Text type="secondary">已签收：</Text>
              <Text strong style={{ color: '#52c41a' }}>{summary.deliveredCount}</Text>
            </span>
            <span>
              <Text type="secondary">在途中：</Text>
              <Text strong style={{ color: '#1890ff' }}>{summary.inTransitCount}</Text>
            </span>
          </Space>
        </div>
      )}

      {/* 物流记录列表 */}
      {!loading && summary && summary.records.length > 0 && (
        <div style={{ maxHeight: 500, overflowY: 'auto' }}>
          {summary.records.map(renderLogisticsRecord)}
        </div>
      )}

      {/* 无物流记录 */}
      {!loading && (!summary || summary.totalCount === 0) && (
        <Empty description="暂无物流记录，请添加物流单号" />
      )}
    </Modal>
  );
};

export default LogisticsModal;
