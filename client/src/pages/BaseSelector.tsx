import React, { useState, useEffect } from 'react';
import { Table, Button, Empty, Spin, Modal, Form, Input, Select, Typography, Space, Tag, App, Alert } from 'antd';
import { PlusOutlined, HomeOutlined, EnvironmentOutlined, PhoneOutlined, LogoutOutlined, UserOutlined } from '@ant-design/icons';
import { history, request, useAccess, useModel } from '@umijs/max';
import { outLogin } from '@/services/ant-design-pro/api';
import { BaseInfo, BASE_TYPE_OPTIONS, getBaseTypeLabel, BaseType } from '@/contexts/BaseContext';
import type { ColumnsType } from 'antd/es/table';
import { CURRENCY_OPTIONS, getCurrencySymbol } from '@/utils/currency';
import { LANGUAGE_OPTIONS, getLanguageName } from '@/utils/language';
import { getFirstAccessibleRoute, getDefaultHomePath } from '@/utils/routeHelper';
import styles from './BaseSelector.less';

const { Title, Text } = Typography;

// 本地存储键名（与 BaseContext 保持一致）
const STORAGE_KEY = 'milicard_current_base';

const BaseSelectorContent: React.FC = () => {
  const { message } = App.useApp();
  const access = useAccess();
  const { initialState } = useModel('@@initialState');
  const [baseList, setBaseList] = useState<BaseInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [form] = Form.useForm();
  
  // 是否有权限创建基地（只有 ADMIN 及以上可以创建）
  const canCreateBase = access.isAdmin;

  // 获取基地列表
  const fetchBaseList = async () => {
    setLoading(true);
    try {
      const result = await request('/api/v1/live-base/bases', {
        method: 'GET',
      });
      if (result.success) {
        setBaseList(result.data || []);
      }
    } catch (error) {
      console.error('获取基地列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 初始化时获取基地列表
  useEffect(() => {
    fetchBaseList();
  }, []);

  // 选择基地并进入
  const handleSelectBase = (base: BaseInfo) => {
    console.log('handleSelectBase called with:', base);
    // 直接保存到 localStorage，让全局 BaseProvider 在页面加载时读取
    localStorage.setItem(STORAGE_KEY, JSON.stringify(base));
    
    // 智能选择首页：根据用户权限找到第一个可访问的页面
    const accessibleRoute = getFirstAccessibleRoute(base.type, access);
    
    if (!accessibleRoute) {
      // 没有任何可访问的页面
      Modal.error({
        title: '无访问权限',
        content: `您当前没有访问基地"${base.name}"任何页面的权限。请联系管理员为您分配相应的权限。`,
        okText: '知道了',
      });
      return;
    }
    
    // 找到了有权限的页面
    const { path: targetPath, name: targetName } = accessibleRoute;
    message.success(`已选择基地：${base.name}，正在进入${targetName}...`);
    
    console.log('Redirecting to:', targetPath, '(', targetName, ')');
    
    // 使用 window.location.href 强制刷新页面，确保 BaseProvider 重新初始化
    setTimeout(() => {
      // 使用完整 URL 确保端口号不丢失
      window.location.href = `${window.location.origin}${targetPath}`;
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
        await fetchBaseList();
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

  // 退出登录
  const handleLogout = async () => {
    try {
      await outLogin();
    } catch (error) {
      // 忽略错误
    }
    localStorage.removeItem('token');
    localStorage.removeItem(STORAGE_KEY);
    history.push('/user/login');
  };

  return (
    <div className={styles.baseSelectorContainer}>
      {/* 右上角用户信息和退出按钮 */}
      <div className={styles.topBar}>
        <Space>
          <UserOutlined />
          <Text>{initialState?.currentUser?.name || initialState?.currentUser?.username || '用户'}</Text>
          <Button 
            type="text" 
            icon={<LogoutOutlined />} 
            onClick={handleLogout}
            danger
          >
            退出登录
          </Button>
        </Space>
      </div>

      <div className={styles.header}>
        <Title level={2}>选择基地</Title>
        <Text type="secondary">
          请选择一个基地开始您的管理之旅，或创建一个新的基地
        </Text>
      </div>

      <Spin spinning={loading}>
        <div className={styles.content}>
          <div className={styles.tableHeader}>
            {canCreateBase && (
              <Button 
                type="primary" 
                icon={<PlusOutlined />} 
                onClick={() => setCreateModalVisible(true)}
                style={{ marginBottom: 16 }}
              >
                创建新基地
              </Button>
            )}
          </div>
          
          {baseList.length === 0 && !loading ? (
            <div>
              {canCreateBase ? (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="暂无基地，请创建您的第一个基地"
                />
              ) : (
                <Alert
                  type="warning"
                  showIcon
                  message="暂无可访问的基地"
                  description="您当前没有关联任何基地。请联系管理员为您分配基地访问权限。"
                  style={{ marginTop: 24 }}
                />
              )}
            </div>
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

// 直接导出内容组件，使用全局的 BaseProvider
export default BaseSelectorContent;
