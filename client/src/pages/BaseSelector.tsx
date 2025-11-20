import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Button, Empty, Spin, Modal, Form, Input, message, Typography } from 'antd';
import { PlusOutlined, HomeOutlined, EnvironmentOutlined, PhoneOutlined } from '@ant-design/icons';
import { history } from '@umijs/max';
import { useBase, BaseInfo, BaseProvider } from '@/contexts/BaseContext';
import styles from './BaseSelector.less';

const { Title, Text } = Typography;

const BaseSelectorContent: React.FC = () => {
  const { baseList, loading, setCurrentBase, refreshBaseList } = useBase();
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [form] = Form.useForm();

  // 如果没有基地，自动显示创建表单
  useEffect(() => {
    if (!loading && baseList.length === 0) {
      setCreateModalVisible(true);
    }
  }, [loading, baseList.length]);

  // 选择基地
  const handleSelectBase = (base: BaseInfo) => {
    setCurrentBase(base);
    message.success(`已选择基地：${base.name}`);
    // 跳转到基地概览页面
    history.push('/base/overview');
  };

  // 创建基地
  const handleCreateBase = async (values: any) => {
    setCreateLoading(true);
    try {
      const response = await fetch('/api/v1/live-base/bases', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (result.success) {
        message.success('基地创建成功！');
        setCreateModalVisible(false);
        form.resetFields();
        await refreshBaseList();
        
        // 如果这是第一个基地，自动选择它
        if (baseList.length === 0) {
          handleSelectBase(result.data);
        }
      } else {
        throw new Error(result.message || '创建基地失败');
      }
    } catch (error) {
      console.error('创建基地失败:', error);
      message.error('创建基地失败，请稍后重试');
    } finally {
      setCreateLoading(false);
    }
  };

  // 渲染基地卡片
  const renderBaseCard = (base: BaseInfo) => (
    <Col xs={24} sm={12} md={8} lg={6} key={base.id}>
      <Card
        hoverable
        className={styles.baseCard}
        onClick={() => handleSelectBase(base)}
        cover={
          <div className={styles.cardCover}>
            <HomeOutlined className={styles.cardIcon} />
          </div>
        }
        actions={[
          <Button type="primary" onClick={() => handleSelectBase(base)}>
            进入基地
          </Button>
        ]}
      >
        <Card.Meta
          title={<Title level={4}>{base.name}</Title>}
          description={
            <div className={styles.cardDescription}>
              <Text type="secondary" className={styles.baseCode}>
                编号：{base.code}
              </Text>
              {base.description && (
                <Text className={styles.baseDesc}>{base.description}</Text>
              )}
              {base.address && (
                <div className={styles.baseInfo}>
                  <EnvironmentOutlined /> {base.address}
                </div>
              )}
              {base.contactPerson && (
                <div className={styles.baseInfo}>
                  <PhoneOutlined /> {base.contactPerson}
                  {base.contactPhone && ` (${base.contactPhone})`}
                </div>
              )}
            </div>
          }
        />
      </Card>
    </Col>
  );

  // 渲染创建基地卡片
  const renderCreateCard = () => (
    <Col xs={24} sm={12} md={8} lg={6}>
      <Card
        hoverable
        className={`${styles.baseCard} ${styles.createCard}`}
        onClick={() => setCreateModalVisible(true)}
      >
        <div className={styles.createCardContent}>
          <PlusOutlined className={styles.createIcon} />
          <Title level={4}>创建新基地</Title>
          <Text type="secondary">点击创建您的第一个直播基地</Text>
        </div>
      </Card>
    </Col>
  );

  return (
    <div className={styles.baseSelectorContainer}>
      <div className={styles.header}>
        <Title level={2}>选择直播基地</Title>
        <Text type="secondary">
          请选择一个基地开始您的直播电商管理之旅，或创建一个新的基地
        </Text>
      </div>

      <Spin spinning={loading}>
        <div className={styles.content}>
          {baseList.length === 0 && !loading ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="暂无基地"
              className={styles.emptyState}
            >
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModalVisible(true)}>
                创建第一个基地
              </Button>
            </Empty>
          ) : (
            <Row gutter={[24, 24]}>
              {baseList.map(renderBaseCard)}
              {renderCreateCard()}
            </Row>
          )}
        </div>
      </Spin>

      {/* 创建基地模态框 */}
      <Modal
        title="创建新基地"
        open={createModalVisible}
        onCancel={() => {
          if (baseList.length > 0) {
            setCreateModalVisible(false);
          }
        }}
        closable={baseList.length > 0}
        maskClosable={baseList.length > 0}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateBase}
          autoComplete="off"
        >
          <Form.Item
            label="基地名称"
            name="name"
            rules={[
              { required: true, message: '请输入基地名称' },
              { min: 2, max: 50, message: '基地名称长度应在2-50个字符之间' }
            ]}
          >
            <Input placeholder="请输入基地名称，如：北京总部基地" />
          </Form.Item>

          <Form.Item
            label="基地编号"
            name="code"
            rules={[
              { required: true, message: '请输入基地编号' },
              { pattern: /^[A-Z0-9_-]+$/, message: '基地编号只能包含大写字母、数字、下划线和横线' }
            ]}
          >
            <Input placeholder="请输入基地编号，如：BJ_HQ_001" />
          </Form.Item>

          <Form.Item
            label="基地描述"
            name="description"
          >
            <Input.TextArea 
              placeholder="请输入基地描述（可选）" 
              rows={3}
              maxLength={200}
            />
          </Form.Item>

          <Form.Item
            label="基地地址"
            name="address"
          >
            <Input placeholder="请输入基地地址（可选）" />
          </Form.Item>

          <Form.Item
            label="联系人"
            name="contactPerson"
          >
            <Input placeholder="请输入联系人姓名（可选）" />
          </Form.Item>

          <Form.Item
            label="联系电话"
            name="contactPhone"
          >
            <Input placeholder="请输入联系电话（可选）" />
          </Form.Item>

          <Form.Item>
            <div className={styles.modalFooter}>
              {baseList.length > 0 && (
                <Button onClick={() => setCreateModalVisible(false)}>
                  取消
                </Button>
              )}
              <Button type="primary" htmlType="submit" loading={createLoading}>
                创建基地
              </Button>
            </div>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

// 主组件，包裹 BaseProvider
const BaseSelector: React.FC = () => {
  return (
    <BaseProvider>
      <BaseSelectorContent />
    </BaseProvider>
  );
};

export default BaseSelector;
