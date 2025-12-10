import React, { useRef, useState } from 'react';
import { 
  Space, 
  Tag, 
  Modal,
  Form,
  Input,
  App,
  Button,
  Popconfirm,
  Popover,
  Descriptions,
  Row,
  Col
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined,
  DeleteOutlined,
  PhoneOutlined,
  MailOutlined,
  EnvironmentOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
  CheckCircleOutlined,
  ShopOutlined
} from '@ant-design/icons';
import { ProTable, PageContainer } from '@ant-design/pro-components';
import type { ProColumns, ActionType } from '@ant-design/pro-components';
import { request } from '@umijs/max';
import { useBase } from '@/contexts/BaseContext';
import styles from './index.less';

const { TextArea } = Input;

// 供应商数据类型定义
interface Supplier {
  id: string;
  code: string;
  name: string;
  contactPerson: string;
  phone: string;
  email?: string;
  address: string;
  notes?: string;
  baseId: number;
  isActive: boolean | string | number; // 支持多种类型以兼容后端返回
  createdAt: string;
  updatedAt: string;
  baseName: string;
}

// 供应商统计数据类型
interface SupplierStats {
  totalSuppliers: number;
  activeSuppliers: number;
  inactiveSuppliers: number;
  recentlyAdded: number;
}

/**
 * 供应商管理页面 - ProTable 版本
 * 基地中心化的供应商管理，统一管理供应商信息
 */
const SupplierManagement: React.FC = () => {
  const { currentBase } = useBase();
  const { message } = App.useApp();
  const actionRef = useRef<ActionType>();
  
  // 状态管理
  const [stats, setStats] = useState<SupplierStats>({
    totalSuppliers: 0,
    activeSuppliers: 0,
    inactiveSuppliers: 0,
    recentlyAdded: 0,
  });
  
  // 模态框状态
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [createLoading, setCreateLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  
  // 表单实例
  const [createForm] = Form.useForm();
  const [editForm] = Form.useForm();

  /**
   * 获取供应商数据
   */
  const fetchSupplierData = async (params: any) => {
    if (!currentBase) {
      return {
        data: [],
        success: true,
        total: 0,
      };
    }

    try {
      const { current = 1, pageSize = 20, name, isActive } = params;
      
      // 构建查询参数
      const queryParams: any = {
        current,
        pageSize,
      };
      
      if (name) queryParams.name = name;
      if (isActive !== undefined) queryParams.isActive = isActive;

      const result = await request(`/api/v1/bases/${currentBase.id}/suppliers`, {
        method: 'GET',
        params: queryParams,
      });
      
      if (result.success) {
        // 计算统计数据
        calculateStats(result.data || []);
        
        return {
          data: result.data || [],
          success: true,
          total: result.total || 0,
        };
      } else {
        message.error(result.message || '获取供应商数据失败');
        return {
          data: [],
          success: false,
          total: 0,
        };
      }
    } catch (error) {
      console.error('获取供应商数据失败:', error);
      message.error('获取供应商数据失败');
      return {
        data: [],
        success: false,
        total: 0,
      };
    }
  };

  /**
   * 计算统计数据
   */
  const calculateStats = (data: Supplier[]) => {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const newStats: SupplierStats = {
      totalSuppliers: data.length,
      activeSuppliers: data.filter(s => s.isActive === true || s.isActive === 'true' || s.isActive === 1).length,
      inactiveSuppliers: data.filter(s => !(s.isActive === true || s.isActive === 'true' || s.isActive === 1)).length,
      recentlyAdded: data.filter(s => {
        if (!s.createdAt) return false;
        try {
          return new Date(s.createdAt) > sevenDaysAgo;
        } catch {
          return false;
        }
      }).length,
    };
    setStats(newStats);
  };

  /**
   * 创建供应商
   */
  const handleCreate = async (values: any) => {
    if (!currentBase) {
      message.error('请先选择基地');
      return;
    }

    setCreateLoading(true);
    try {
      const result = await request(`/api/v1/bases/${currentBase.id}/suppliers`, {
        method: 'POST',
        data: values,
      });

      if (result.success) {
        message.success('创建成功');
        setCreateModalVisible(false);
        createForm.resetFields();
        actionRef.current?.reload();
      } else {
        message.error(result.message || '创建失败');
      }
    } catch (error) {
      console.error('创建供应商失败:', error);
      message.error('创建供应商失败');
    } finally {
      setCreateLoading(false);
    }
  };

  /**
   * 更新供应商
   */
  const handleUpdate = async (values: any) => {
    if (!currentBase || !editingSupplier) {
      return;
    }

    setEditLoading(true);
    try {
      const result = await request(
        `/api/v1/bases/${currentBase.id}/suppliers/${editingSupplier.id}`,
        {
          method: 'PUT',
          data: values,
        }
      );

      if (result.success) {
        message.success('更新成功');
        setEditModalVisible(false);
        editForm.resetFields();
        setEditingSupplier(null);
        actionRef.current?.reload();
      } else {
        message.error(result.message || '更新失败');
      }
    } catch (error) {
      console.error('更新供应商失败:', error);
      message.error('更新供应商失败');
    } finally {
      setEditLoading(false);
    }
  };

  /**
   * 删除供应商
   */
  const handleDelete = async (record: Supplier) => {
    if (!currentBase) {
      return;
    }

    try {
      const result = await request(
        `/api/v1/bases/${currentBase.id}/suppliers/${record.id}`,
        {
          method: 'DELETE',
        }
      );

      if (result.success) {
        message.success('删除成功');
        actionRef.current?.reload();
      } else {
        message.error(result.message || '删除失败');
      }
    } catch (error) {
      console.error('删除供应商失败:', error);
      message.error('删除供应商失败');
    }
  };

  /**
   * 打开编辑模态框
   */
  const handleEdit = (record: Supplier) => {
    setEditingSupplier(record);
    editForm.setFieldsValue({
      name: record.name,
      contactPerson: record.contactPerson,
      phone: record.phone,
      email: record.email,
      address: record.address,
      notes: record.notes,
    });
    setEditModalVisible(true);
  };

  /**
   * 列定义
   */
  const columns: ProColumns<Supplier>[] = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
      hideInSearch: true,
      hideInTable: false,
      render: (id: any) => String(id).slice(-8),
    },
    {
      title: '编号',
      dataIndex: 'code',
      key: 'code',
      width: 200,
      fixed: 'left',
      copyable: true,
      hideInSetting: true,
      hideInSearch: true,
      render: (text: string) => <code>{text}</code>,
    },
    {
      title: '供应商名称',
      dataIndex: 'name',
      key: 'name',
      width: 100,
      fixed: 'left',
      hideInSetting: true,
      hideInSearch: false,
      render: (text: string) => <strong>{text}</strong>,
    },
    {
      title: '联系人',
      dataIndex: 'contactPerson',
      key: 'contactPerson',
      width: 60,
      hideInSearch: true,
    },
    {
      title: '联系电话',
      dataIndex: 'phone',
      key: 'phone',
      width: 80,
      hideInSearch: true,
      render: (phone: string) => (
        <Space>
          <PhoneOutlined style={{ color: '#1890ff' }} />
          {phone}
        </Space>
      ),
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
      width: 200,
      ellipsis: true,
      hideInSearch: true,
      hideInTable: false,
      render: (email: string) => email ? (
        <Space>
          <MailOutlined style={{ color: '#52c41a' }} />
          {email}
        </Space>
      ) : '-',
    },
    {
      title: '地址',
      dataIndex: 'address',
      key: 'address',
      width: 250,
      ellipsis: true,
      hideInSearch: true,
      hideInTable: false,
      render: (address: string) => address ? (
        <Space>
          <EnvironmentOutlined style={{ color: '#fa8c16' }} />
          {address}
        </Space>
      ) : '-',
    },
    {
      title: '备注',
      dataIndex: 'notes',
      key: 'notes',
      width: 200,
      ellipsis: true,
      hideInSearch: true,
      hideInTable: false,
      render: (text: string) => text || '-',
    },
    {
      title: '状态',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 80,
      valueType: 'select',
      valueEnum: {
        true: { text: '启用', status: 'Success' },
        false: { text: '禁用', status: 'Error' },
      },
      render: (_, record) => {
        // 处理字符串 "true"/"false" 和布尔值
        const isActive = record.isActive === true || record.isActive === 'true' || record.isActive === 1;
        return (
          <Tag color={isActive ? 'green' : 'red'}>
            {isActive ? '启用' : '禁用'}
          </Tag>
        );
      },
      hideInSearch: false,
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
      valueType: 'dateTime',
      hideInSearch: true,
      sorter: true,
      render: (_, record) => {
        if (!record.createdAt) return '-';
        try {
          const date = new Date(record.createdAt);
          if (isNaN(date.getTime())) return '-';
          return date.toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
          });
        } catch (error) {
          return '-';
        }
      },
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 170,
      valueType: 'dateTime',
      hideInSearch: true,
      hideInTable: false,
      render: (_, record) => {
        if (!record.updatedAt) return '-';
        try {
          const date = new Date(record.updatedAt);
          if (isNaN(date.getTime())) return '-';
          return date.toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
          });
        } catch (error) {
          return '-';
        }
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      fixed: 'right',
      valueType: 'option',
      hideInSetting: true,
      render: (_, record) => [
        <Button
          key="edit"
          type="link"
          size="small"
          icon={<EditOutlined />}
          onClick={() => handleEdit(record)}
        >
          {/* 编辑 */}
        </Button>,
        <Popconfirm
          key="delete"
          title="确认删除"
          description={`确定要删除供应商"${record.name}"吗？`}
          onConfirm={() => handleDelete(record)}
          okText="确定"
          cancelText="取消"
          icon={<ExclamationCircleOutlined style={{ color: 'red' }} />}
        >
          <Button
            type="link"
            size="small"
            danger
            icon={<DeleteOutlined />}
          >
            {/* 删除 */}
          </Button>
        </Popconfirm>,
      ],
    },
  ];

  if (!currentBase) {
    return (
      <PageContainer>
        <div style={{ textAlign: 'center', padding: '50px 0' }}>
          <p>请先选择一个基地</p>
        </div>
      </PageContainer>
    );
  }

  // 统计详情弹出内容
  const statsContent = (
    <div style={{ width: 300 }}>
      <Descriptions column={1} size="small" bordered>
        <Descriptions.Item label="供应商总数">
          <Space>
            <ShopOutlined />
            <span style={{ fontWeight: 'bold', fontSize: 16 }}>{stats.totalSuppliers}</span>
            <span style={{ color: '#999' }}>家</span>
          </Space>
        </Descriptions.Item>
        <Descriptions.Item label="启用供应商">
          <Space>
            <CheckCircleOutlined style={{ color: '#52c41a' }} />
            <span style={{ color: '#52c41a', fontWeight: 'bold' }}>{stats.activeSuppliers}</span>
            <span style={{ color: '#999' }}>({stats.totalSuppliers > 0 ? ((stats.activeSuppliers / stats.totalSuppliers) * 100).toFixed(1) : 0}%)</span>
          </Space>
        </Descriptions.Item>
        <Descriptions.Item label="禁用供应商">
          <Space>
            <span style={{ color: '#ff4d4f', fontWeight: 'bold' }}>{stats.inactiveSuppliers}</span>
            <span style={{ color: '#999' }}>({stats.totalSuppliers > 0 ? ((stats.inactiveSuppliers / stats.totalSuppliers) * 100).toFixed(1) : 0}%)</span>
          </Space>
        </Descriptions.Item>
        <Descriptions.Item label="近7天新增">
          <Space>
            <span style={{ color: '#722ed1', fontWeight: 'bold' }}>{stats.recentlyAdded}</span>
            <span style={{ color: '#999' }}>家</span>
          </Space>
        </Descriptions.Item>
      </Descriptions>
    </div>
  );

  return (
    <PageContainer
      header={{
        title: '供应商管理',
      }}
    >
      {/* ProTable */}
      <ProTable<Supplier>
        columns={columns}
        actionRef={actionRef}
        request={fetchSupplierData}
        rowKey="id"
        
        // 列状态配置 - 持久化到 localStorage
        columnsState={{
          persistenceKey: 'supplier-table-columns',
          persistenceType: 'localStorage',
          defaultValue: {
            // 默认隐藏的列
            id: { show: false },
            email: { show: false },
            address: { show: false },
            notes: { show: false },
            updatedAt: { show: false },
          },
        }}
        
        // 搜索表单配置
        search={{
          labelWidth: 'auto',
          defaultCollapsed: false,
          optionRender: (searchConfig, formProps, dom) => [
            ...dom.reverse(),
          ],
        }}
        
        // 工具栏配置
        options={{
          setting: {
            listsHeight: 400,
            draggable: true,
          },
          reload: () => {
            actionRef.current?.reload();
          },
          density: true,
          fullScreen: true,
        }}
        
        // 表格配置
        scroll={{ x: 1600 }}
        pagination={{
          defaultPageSize: 20,
          showSizeChanger: true,
          showQuickJumper: true,
          pageSizeOptions: ['10', '20', '30', '50', '100'],
        }}
        
        // 工具栏按钮
        toolBarRender={() => [
          <Button
            key="create"
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setCreateModalVisible(true)}
          >
            新增供应商
          </Button>,
        ]}
        
        // 表格属性
        dateFormatter="string"
        headerTitle={
          <Space>
            <span>供应商列表</span>
            <span style={{ color: '#999', fontSize: 14, fontWeight: 'normal' }}>
              (共 {stats.totalSuppliers} 家)
            </span>
            <Popover
              content={statsContent}
              title="统计详情"
              trigger="click"
              placement="bottomLeft"
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
        }
      />

      {/* 创建供应商模态框 */}
      <Modal
        title="新增供应商"
        open={createModalVisible}
        onOk={() => createForm.submit()}
        onCancel={() => {
          setCreateModalVisible(false);
          createForm.resetFields();
        }}
        confirmLoading={createLoading}
        width={600}
      >
        <Form
          form={createForm}
          layout="vertical"
          onFinish={handleCreate}
        >
          <Form.Item
            label="供应商名称"
            name="name"
            rules={[
              { required: true, message: '请输入供应商名称' },
              { min: 2, max: 100, message: '供应商名称长度应在2-100个字符之间' }
            ]}
          >
            <Input placeholder="请输入供应商名称" />
          </Form.Item>

          <Form.Item
            label="联系人"
            name="contactPerson"
            rules={[
              { min: 2, max: 50, message: '联系人长度应在2-50个字符之间' }
            ]}
          >
            <Input placeholder="请输入联系人" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="联系电话"
                name="phone"
              >
                <Input placeholder="请输入联系电话" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="邮箱"
                name="email"
                rules={[
                  { type: 'email', message: '请输入正确的邮箱地址' }
                ]}
              >
                <Input placeholder="请输入邮箱" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="地址"
            name="address"
            rules={[
              { max: 200, message: '地址长度不能超过200个字符' }
            ]}
          >
            <Input placeholder="请输入地址" />
          </Form.Item>

          <Form.Item
            label="备注"
            name="notes"
          >
            <TextArea
              rows={3}
              placeholder="请输入备注信息"
              maxLength={500}
              showCount
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* 编辑供应商模态框 */}
      <Modal
        title="编辑供应商"
        open={editModalVisible}
        onOk={() => editForm.submit()}
        onCancel={() => {
          setEditModalVisible(false);
          editForm.resetFields();
          setEditingSupplier(null);
        }}
        confirmLoading={editLoading}
        width={600}
      >
        <Form
          form={editForm}
          layout="vertical"
          onFinish={handleUpdate}
        >
          <Form.Item
            label="供应商名称"
            name="name"
            rules={[
              { required: true, message: '请输入供应商名称' },
              { min: 2, max: 100, message: '供应商名称长度应在2-100个字符之间' }
            ]}
          >
            <Input placeholder="请输入供应商名称" />
          </Form.Item>

          <Form.Item
            label="联系人"
            name="contactPerson"
            rules={[
              { min: 2, max: 50, message: '联系人长度应在2-50个字符之间' }
            ]}
          >
            <Input placeholder="请输入联系人" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="联系电话"
                name="phone"
              >
                <Input placeholder="请输入联系电话" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="邮箱"
                name="email"
                rules={[
                  { type: 'email', message: '请输入正确的邮箱地址' }
                ]}
              >
                <Input placeholder="请输入邮箱" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="地址"
            name="address"
            rules={[
              { max: 200, message: '地址长度不能超过200个字符' }
            ]}
          >
            <Input placeholder="请输入地址" />
          </Form.Item>

          <Form.Item
            label="备注"
            name="notes"
          >
            <TextArea
              rows={3}
              placeholder="请输入备注信息"
              maxLength={500}
              showCount
            />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
};

export default SupplierManagement;
