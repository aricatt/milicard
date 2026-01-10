import React, { useState, useEffect } from 'react';
import { Card, Button, Empty, Image, Descriptions, Tag, Space, List, Spin, message, Modal } from 'antd';
import { PlusOutlined, EnvironmentOutlined, PictureOutlined, ClockCircleOutlined, DeleteOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { getLatestVisit, getVisitList, deleteVisit, type PointVisitItem } from '@/services/pointVisit';
import VisitForm from './VisitForm';

interface VisitTabProps {
  pointId: string;
  pointName?: string;
}

const VisitTab: React.FC<VisitTabProps> = ({ pointId, pointName }) => {
  const [loading, setLoading] = useState(false);
  const [latestVisit, setLatestVisit] = useState<PointVisitItem | null>(null);
  const [visitList, setVisitList] = useState<PointVisitItem[]>([]);
  const [formVisible, setFormVisible] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
  });

  // 加载最新拜访记录
  const loadLatestVisit = async () => {
    try {
      const response = await getLatestVisit(pointId);
      if (response.success && response.data) {
        setLatestVisit(response.data);
      }
    } catch (error) {
      console.error('加载最新拜访记录失败:', error);
    }
  };

  // 加载拜访记录列表
  const loadVisitList = async (page: number = 1) => {
    setLoading(true);
    try {
      const response = await getVisitList(pointId, {
        page,
        limit: pagination.limit,
      });
      if (response.success) {
        setVisitList(response.data || []);
        setPagination({
          page: response.pagination?.page || 1,
          limit: response.pagination?.limit || 10,
          total: response.pagination?.total || 0,
        });
      }
    } catch (error) {
      console.error('加载拜访记录列表失败:', error);
      message.error('加载失败');
    } finally {
      setLoading(false);
    }
  };

  // 初始加载
  useEffect(() => {
    if (pointId) {
      loadLatestVisit();
      loadVisitList();
    }
  }, [pointId]);

  // 删除拜访记录
  const handleDelete = (visitId: string) => {
    Modal.confirm({
      title: '确认删除',
      icon: <ExclamationCircleOutlined />,
      content: '确定要删除这条拜访记录吗？删除后无法恢复。',
      okText: '确定',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          // 如果删除的是最新记录，先清空显示
          if (latestVisit && latestVisit.id === visitId) {
            setLatestVisit(null);
          }
          
          const response = await deleteVisit(visitId);
          if (response.success) {
            message.success('删除成功');
            // 重新加载数据
            await loadLatestVisit();
            await loadVisitList(pagination.page);
          } else {
            message.error(response.error || '删除失败');
          }
        } catch (error) {
          console.error('删除失败:', error);
          message.error('删除失败');
        }
      },
    });
  };

  // 格式化日期
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // 渲染最新拜访记录
  const renderLatestVisit = () => {
    if (!latestVisit) {
      return (
        <Empty
          description="暂无拜访记录"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          style={{ padding: '40px 0' }}
        >
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setFormVisible(true)}>
            记录首次拜访
          </Button>
        </Empty>
      );
    }

    return (
      <Card
        title={
          <Space>
            <ClockCircleOutlined />
            最近一次拜访
          </Space>
        }
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setFormVisible(true)}>
            新增拜访记录
          </Button>
        }
        style={{ marginBottom: 24 }}
      >
        <Descriptions column={2} size="small">
          <Descriptions.Item label="拜访时间" span={2}>
            {formatDate(latestVisit.visitDate)}
          </Descriptions.Item>
          <Descriptions.Item label="拜访人员">
            {latestVisit.visitorName}
          </Descriptions.Item>
          <Descriptions.Item label="客户名称">
            {latestVisit.customerName || '-'}
          </Descriptions.Item>
          {latestVisit.locationName && (
            <Descriptions.Item label="拜访地点" span={2}>
              <Space>
                <EnvironmentOutlined style={{ color: '#52c41a' }} />
                {latestVisit.locationName}
              </Space>
            </Descriptions.Item>
          )}
          {latestVisit.notes && (
            <Descriptions.Item label="拜访备注" span={2}>
              {latestVisit.notes}
            </Descriptions.Item>
          )}
        </Descriptions>

        {latestVisit.images && latestVisit.images.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <div style={{ marginBottom: 8, fontWeight: 500 }}>
              <PictureOutlined /> 现场照片
            </div>
            <Image.PreviewGroup>
              <Space size={8}>
                {latestVisit.images.map((url, index) => (
                  <Image
                    key={index}
                    src={url}
                    alt={`拜访照片${index + 1}`}
                    width={120}
                    height={120}
                    style={{ objectFit: 'cover', borderRadius: 4 }}
                  />
                ))}
              </Space>
            </Image.PreviewGroup>
          </div>
        )}
      </Card>
    );
  };

  // 渲染历史记录列表
  const renderVisitList = () => {
    if (visitList.length === 0) {
      return null;
    }

    return (
      <Card title="历史拜访记录">
        <List
          loading={loading}
          dataSource={visitList}
          pagination={{
            current: pagination.page,
            pageSize: pagination.limit,
            total: pagination.total,
            onChange: (page) => loadVisitList(page),
            showSizeChanger: false,
            showTotal: (total) => `共 ${total} 条记录`,
          }}
          renderItem={(item) => (
            <List.Item>
              <Card
                size="small"
                style={{ width: '100%' }}
                styles={{ body: { padding: 12 } }}
                extra={
                  <Button
                    type="text"
                    danger
                    size="small"
                    icon={<DeleteOutlined />}
                    onClick={() => handleDelete(item.id)}
                  >
                    删除
                  </Button>
                }
              >
                <Space direction="vertical" style={{ width: '100%' }} size={8}>
                  <Space>
                    <Tag color="blue">{formatDate(item.visitDate)}</Tag>
                    <span style={{ fontWeight: 500 }}>{item.visitorName}</span>
                    {item.customerName && (
                      <span style={{ color: '#666' }}>拜访 {item.customerName}</span>
                    )}
                  </Space>

                  {item.locationName && (
                    <Space size={4} style={{ fontSize: 12, color: '#999' }}>
                      <EnvironmentOutlined />
                      {item.locationName}
                    </Space>
                  )}

                  {item.notes && (
                    <div style={{ fontSize: 13, color: '#666' }}>{item.notes}</div>
                  )}

                  {item.images && item.images.length > 0 && (
                    <Image.PreviewGroup>
                      <Space size={4}>
                        {item.images.map((url, index) => (
                          <Image
                            key={index}
                            src={url}
                            alt={`照片${index + 1}`}
                            width={60}
                            height={60}
                            style={{ objectFit: 'cover', borderRadius: 4 }}
                          />
                        ))}
                      </Space>
                    </Image.PreviewGroup>
                  )}
                </Space>
              </Card>
            </List.Item>
          )}
        />
      </Card>
    );
  };

  return (
    <div>
      {renderLatestVisit()}
      {renderVisitList()}

      <VisitForm
        visible={formVisible}
        pointId={pointId}
        pointName={pointName}
        onClose={() => setFormVisible(false)}
        onSuccess={() => {
          setFormVisible(false);
          loadLatestVisit();
          loadVisitList(1);
        }}
      />
    </div>
  );
};

export default VisitTab;
