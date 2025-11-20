import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Typography, Button, Space, Divider, Tag } from 'antd';
import { 
  ShopOutlined, 
  InboxOutlined, 
  ShoppingCartOutlined, 
  DollarOutlined,
  UserOutlined,
  EnvironmentOutlined,
  PhoneOutlined,
  EditOutlined
} from '@ant-design/icons';
import { useRequireBase } from '@/contexts/BaseContext';
import { history } from '@umijs/max';
import styles from './index.less';

const { Title, Text, Paragraph } = Typography;

interface BaseStats {
  totalGoods: number;
  totalInventory: number;
  totalPurchaseOrders: number;
  totalSalesOrders: number;
  totalCustomers: number;
  totalSuppliers: number;
  inventoryValue: number;
  salesAmount: number;
}

const BaseOverview: React.FC = () => {
  const currentBase = useRequireBase();
  const [stats, setStats] = useState<BaseStats>({
    totalGoods: 0,
    totalInventory: 0,
    totalPurchaseOrders: 0,
    totalSalesOrders: 0,
    totalCustomers: 0,
    totalSuppliers: 0,
    inventoryValue: 0,
    salesAmount: 0,
  });
  const [loading, setLoading] = useState(true);

  // 获取基地统计数据
  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        // 并行获取各种统计数据
        const [
          goodsResponse,
          inventoryResponse,
          purchaseResponse,
          salesResponse,
          suppliersResponse,
          customersResponse
        ] = await Promise.all([
          fetch(`/api/v1/bases/${currentBase.id}/goods`),
          fetch(`/api/v1/bases/${currentBase.id}/inventory/stats`),
          fetch(`/api/v1/bases/${currentBase.id}/purchase-orders/stats`),
          fetch(`/api/v1/bases/${currentBase.id}/sales/stats`),
          fetch(`/api/v1/bases/${currentBase.id}/suppliers`),
          fetch(`/api/v1/bases/${currentBase.id}/customers`)
        ]);

        const [
          goodsData,
          inventoryData,
          purchaseData,
          salesData,
          suppliersData,
          customersData
        ] = await Promise.all([
          goodsResponse.json(),
          inventoryResponse.json(),
          purchaseResponse.json(),
          salesResponse.json(),
          suppliersResponse.json(),
          customersResponse.json()
        ]);

        setStats({
          totalGoods: goodsData.success ? goodsData.total || 0 : 0,
          totalInventory: inventoryData.success ? inventoryData.data?.totalItems || 0 : 0,
          totalPurchaseOrders: purchaseData.success ? purchaseData.data?.totalOrders || 0 : 0,
          totalSalesOrders: salesData.success ? salesData.data?.totalOrders || 0 : 0,
          totalCustomers: customersData.success ? customersData.total || 0 : 0,
          totalSuppliers: suppliersData.success ? suppliersData.data?.length || 0 : 0,
          inventoryValue: inventoryData.success ? inventoryData.data?.totalValue || 0 : 0,
          salesAmount: salesData.success ? salesData.data?.totalAmount || 0 : 0,
        });
      } catch (error) {
        console.error('获取统计数据失败:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [currentBase.id]);

  // 快捷操作
  const quickActions = [
    {
      title: '商品管理',
      icon: <ShopOutlined />,
      path: '/goods',
      description: '管理基地商品信息'
    },
    {
      title: '库存管理',
      icon: <InboxOutlined />,
      path: '/inventory',
      description: '查看和管理库存'
    },
    {
      title: '采购管理',
      icon: <ShoppingCartOutlined />,
      path: '/purchase',
      description: '管理采购订单'
    },
    {
      title: '销售管理',
      icon: <DollarOutlined />,
      path: '/sales',
      description: '管理销售订单'
    }
  ];

  return (
    <div className={styles.baseOverview}>
      {/* 基地信息卡片 */}
      <Card className={styles.baseInfoCard}>
        <Row gutter={24}>
          <Col span={18}>
            <div className={styles.baseHeader}>
              <Title level={2} className={styles.baseName}>
                {currentBase.name}
                <Tag color="blue" className={styles.baseTag}>
                  {currentBase.code}
                </Tag>
              </Title>
              {currentBase.description && (
                <Paragraph className={styles.baseDescription}>
                  {currentBase.description}
                </Paragraph>
              )}
              <Space direction="vertical" size={4}>
                {currentBase.address && (
                  <Text type="secondary">
                    <EnvironmentOutlined /> {currentBase.address}
                  </Text>
                )}
                {currentBase.contactPerson && (
                  <Text type="secondary">
                    <UserOutlined /> {currentBase.contactPerson}
                    {currentBase.contactPhone && (
                      <span>
                        <Divider type="vertical" />
                        <PhoneOutlined /> {currentBase.contactPhone}
                      </span>
                    )}
                  </Text>
                )}
              </Space>
            </div>
          </Col>
          <Col span={6}>
            <div className={styles.baseActions}>
              <Button 
                type="primary" 
                icon={<EditOutlined />}
                onClick={() => history.push('/base/settings')}
              >
                编辑基地信息
              </Button>
            </div>
          </Col>
        </Row>
      </Card>

      {/* 统计数据 */}
      <Row gutter={[16, 16]} className={styles.statsRow}>
        <Col xs={12} sm={8} md={6}>
          <Card>
            <Statistic
              title="商品总数"
              value={stats.totalGoods}
              prefix={<ShopOutlined />}
              loading={loading}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={6}>
          <Card>
            <Statistic
              title="库存项目"
              value={stats.totalInventory}
              prefix={<InboxOutlined />}
              loading={loading}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={6}>
          <Card>
            <Statistic
              title="采购订单"
              value={stats.totalPurchaseOrders}
              prefix={<ShoppingCartOutlined />}
              loading={loading}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={6}>
          <Card>
            <Statistic
              title="销售订单"
              value={stats.totalSalesOrders}
              prefix={<DollarOutlined />}
              loading={loading}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={6}>
          <Card>
            <Statistic
              title="客户数量"
              value={stats.totalCustomers}
              prefix={<UserOutlined />}
              loading={loading}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={6}>
          <Card>
            <Statistic
              title="供应商数量"
              value={stats.totalSuppliers}
              prefix={<UserOutlined />}
              loading={loading}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={6}>
          <Card>
            <Statistic
              title="库存价值"
              value={stats.inventoryValue}
              prefix="¥"
              precision={2}
              loading={loading}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={6}>
          <Card>
            <Statistic
              title="销售金额"
              value={stats.salesAmount}
              prefix="¥"
              precision={2}
              loading={loading}
            />
          </Card>
        </Col>
      </Row>

      {/* 快捷操作 */}
      <Card title="快捷操作" className={styles.quickActionsCard}>
        <Row gutter={[16, 16]}>
          {quickActions.map((action, index) => (
            <Col xs={12} sm={8} md={6} key={index}>
              <Card
                hoverable
                className={styles.actionCard}
                onClick={() => history.push(action.path)}
              >
                <div className={styles.actionContent}>
                  <div className={styles.actionIcon}>
                    {action.icon}
                  </div>
                  <Title level={5}>{action.title}</Title>
                  <Text type="secondary">{action.description}</Text>
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      </Card>
    </div>
  );
};

export default BaseOverview;
