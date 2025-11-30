import React, { useState, useEffect } from 'react';
import { Table, Button, Empty, Spin, Modal, Form, Input, Select, Typography, Space, Tag, App } from 'antd';
import { PlusOutlined, HomeOutlined, EnvironmentOutlined, PhoneOutlined } from '@ant-design/icons';
import { history, request } from '@umijs/max';
import { useBase, BaseInfo, BaseProvider, BASE_TYPE_OPTIONS, getBaseTypeLabel, BaseType } from '@/contexts/BaseContext';
import type { ColumnsType } from 'antd/es/table';
import { CURRENCY_OPTIONS, getCurrencySymbol } from '@/utils/currency';
import { LANGUAGE_OPTIONS, getLanguageName } from '@/utils/language';
import styles from './BaseSelector.less';

const { Title, Text } = Typography;

const BaseSelectorContent: React.FC = () => {
  const { baseList, loading, setCurrentBase, refreshBaseList } = useBase();
  const { message } = App.useApp();
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [form] = Form.useForm();

  // 选择基地并进入
  const handleSelectBase = (base: BaseInfo) => {
    setCurrentBase(base);
    message.success(`已选择基地：${base.name}`);
    // 根据基地类型跳转到不同页面
    setTimeout(() => {
      if (base.type === BaseType.OFFLINE_REGION) {
        history.push('/offline-region/districts');
      } else {
        history.push('/live-base/base-data/bases');
      }
    }, 100);
  };

  // 创建基地
  const handleCreateBase = async (values: any) => {
    setCreateLoading(true);
    try {
      const result = await request('/api/v1/live-base/bases', {
        method: 'POST',
        data: values,
      });

      if (result.success) {
        message.success('基地创建成功！');
        setCreateModalVisible(false);
        form.resetFields();
        await refreshBaseList();
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

  // 表格列定义
  const columns: ColumnsType<BaseInfo> = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
    },
    {
      title: '编号',
      dataIndex: 'code',
      key: 'code',
      width: 150,
    },
    {
      title: '基地名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => <strong>{text}</strong>,
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (type: BaseType) => (
        <Tag color={type === BaseType.LIVE_BASE ? 'blue' : 'orange'}>
          {getBaseTypeLabel(type)}
        </Tag>
      ),
    },
    {
      title: '货币',
      dataIndex: 'currency',
      key: 'currency',
      width: 100,
      render: (currency: string) => (
        <Tag color="blue">{getCurrencySymbol(currency)} {currency}</Tag>
      ),
    },
    {
      title: '语言',
      dataIndex: 'language',
      key: 'language',
      width: 100,
      render: (language: string) => (
        <Tag color="green">{getLanguageName(language)}</Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_, record) => (
        <Button 
          type="primary" 
          size="small"
          onClick={() => handleSelectBase(record)}
        >
          进入
        </Button>
      ),
    },
  ];

  return (
    <div className={styles.baseSelectorContainer}>
      <div className={styles.header}>
        <Title level={2}>选择基地</Title>
        <Text type="secondary">
          请选择一个基地开始您的管理之旅，或创建一个新的基地
        </Text>
      </div>

      <Spin spinning={loading}>
        <div className={styles.content}>
          <div className={styles.tableHeader}>
            <Button 
              type="primary" 
              icon={<PlusOutlined />} 
              onClick={() => setCreateModalVisible(true)}
              style={{ marginBottom: 16 }}
            >
              创建新基地
            </Button>
          </div>
          
          {baseList.length === 0 && !loading ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="暂无基地，请创建您的第一个基地"
            />
          ) : (
            <Table
              columns={columns}
              dataSource={baseList}
              rowKey="id"
              pagination={false}
              size="middle"
              className={styles.baseTable}
            />
          )}
        </div>
      </Spin>

      {/* 创建基地模态框 */}
      <Modal
        title="创建新基地"
        open={createModalVisible}
        onCancel={() => setCreateModalVisible(false)}
        footer={null}
        width={500}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateBase}
          autoComplete="off"
          initialValues={{ currency: 'CNY', language: 'zh-CN', type: BaseType.LIVE_BASE }}
        >
          <Form.Item
            label="基地名称"
            name="name"
            rules={[
              { required: true, message: '请输入基地名称' },
              { min: 2, max: 50, message: '基地名称长度应在2-50个字符之间' }
            ]}
            extra="基地编号将自动生成（格式：BASE-XXXXXXXXXXX）"
          >
            <Input 
              placeholder="请输入基地名称，如：北京总部基地" 
            />
          </Form.Item>

          <Form.Item
            label="基地类型"
            name="type"
            rules={[{ required: true, message: '请选择基地类型' }]}
            extra="直播基地用于直播电商管理，线下区域用于线下市场管理"
          >
            <Select 
              placeholder="请选择基地类型"
              options={BASE_TYPE_OPTIONS}
            />
          </Form.Item>

          <Form.Item
            label="货币"
            name="currency"
            rules={[{ required: true, message: '请选择货币' }]}
            extra="选择该基地使用的货币单位"
          >
            <Select 
              placeholder="请选择货币"
              options={CURRENCY_OPTIONS}
            />
          </Form.Item>

          <Form.Item
            label="语言"
            name="language"
            rules={[{ required: true, message: '请选择语言' }]}
            extra="选择该基地的默认显示语言"
          >
            <Select 
              placeholder="请选择语言"
              options={LANGUAGE_OPTIONS}
            />
          </Form.Item>

          <Form.Item>
            <div className={styles.modalFooter}>
              <Button onClick={() => setCreateModalVisible(false)}>
                取消
              </Button>
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
