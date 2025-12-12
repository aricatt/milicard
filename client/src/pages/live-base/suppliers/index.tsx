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
  Col,
  Tooltip,
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
  ShopOutlined,
  ExportOutlined,
  ImportOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import { ProTable, PageContainer } from '@ant-design/pro-components';
import type { ProColumns, ActionType } from '@ant-design/pro-components';
import { request, useIntl } from '@umijs/max';
import { useBase } from '@/contexts/BaseContext';
import styles from './index.less';
import { useSupplierExcel } from './useSupplierExcel';
import ImportModal from '@/components/ImportModal';

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
  const intl = useIntl();
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

  // Excel导入导出Hook
  const {
    importModalVisible,
    setImportModalVisible,
    importLoading,
    importProgress,
    handleExport,
    handleImport,
    handleDownloadTemplate,
  } = useSupplierExcel({
    baseId: currentBase?.id || 0,
    baseName: currentBase?.name || '',
    onImportSuccess: () => actionRef.current?.reload(),
  });

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
      title: intl.formatMessage({ id: 'table.column.id' }),
      dataIndex: 'id',
      key: 'id',
      width: 80,
      hideInSearch: true,
      hideInTable: false,
      render: (id: any) => String(id).slice(-8),
    },
    {
      title: intl.formatMessage({ id: 'suppliers.column.code' }),
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
      title: intl.formatMessage({ id: 'suppliers.column.name' }),
      dataIndex: 'name',
      key: 'name',
      width: 100,
      fixed: 'left',
      hideInSetting: true,
      hideInSearch: false,
      render: (text: string) => <strong>{text}</strong>,
    },
    {
      title: intl.formatMessage({ id: 'suppliers.column.contact' }),
      dataIndex: 'contactPerson',
      key: 'contactPerson',
      width: 60,
      hideInSearch: true,
    },
    {
      title: intl.formatMessage({ id: 'suppliers.column.phone' }),
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
      title: intl.formatMessage({ id: 'suppliers.column.email' }),
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
      title: intl.formatMessage({ id: 'suppliers.column.address' }),
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
      title: intl.formatMessage({ id: 'table.column.notes' }),
      dataIndex: 'notes',
      key: 'notes',
      width: 200,
      ellipsis: true,
      hideInSearch: true,
      hideInTable: false,
      render: (text: string) => text || '-',
    },
    {
      title: intl.formatMessage({ id: 'table.column.status' }),
      dataIndex: 'isActive',
      key: 'isActive',
      width: 80,
      valueType: 'select',
      valueEnum: {
        true: { text: intl.formatMessage({ id: 'status.enabled' }), status: 'Success' },
        false: { text: intl.formatMessage({ id: 'status.disabled' }), status: 'Error' },
      },
      render: (_, record) => {
        // 处理字符串 "true"/"false" 和布尔值
        const isActive = record.isActive === true || record.isActive === 'true' || record.isActive === 1;
        return (
          <Tag color={isActive ? 'green' : 'red'}>
            {isActive ? intl.formatMessage({ id: 'status.enabled' }) : intl.formatMessage({ id: 'status.disabled' })}
          </Tag>
        );
      },
      hideInSearch: false,
    },
    {
      title: intl.formatMessage({ id: 'table.column.createdAt' }),
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
      title: intl.formatMessage({ id: 'table.column.updatedAt' }),
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
      title: intl.formatMessage({ id: 'table.column.operation' }),
      key: 'action',
      width: 80,
      fixed: 'right',
      valueType: 'option',
      hideInSetting: true,
      render: (_, record) => [
        <Tooltip key="edit" title={intl.formatMessage({ id: 'button.edit' })}>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          />
        </Tooltip>,
        <Popconfirm
          key="delete"
          title={intl.formatMessage({ id: 'message.deleteConfirm' })}
          description={intl.formatMessage({ id: 'message.deleteConfirmContent' })}
          onConfirm={() => handleDelete(record)}
          okText={intl.formatMessage({ id: 'button.confirm' })}
          cancelText={intl.formatMessage({ id: 'button.cancel' })}
          icon={<ExclamationCircleOutlined style={{ color: 'red' }} />}
        >
          <Tooltip title={intl.formatMessage({ id: 'button.delete' })}>
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
            />
          </Tooltip>
        </Popconfirm>,
      ],
    },
  ];

  if (!currentBase) {
    return (
      <PageContainer>
        <div style={{ textAlign: 'center', padding: '50px 0' }}>
          <p>{intl.formatMessage({ id: 'message.selectBase' })}</p>
        </div>
      </PageContainer>
    );
  }

  // 统计详情弹出内容
  const statsContent = (
    <div style={{ width: 300 }}>
      <Descriptions column={1} size="small" bordered>
        <Descriptions.Item label={intl.formatMessage({ id: 'suppliers.stats.total' })}>
          <Space>
            <ShopOutlined />
            <span style={{ fontWeight: 'bold', fontSize: 16 }}>{stats.totalSuppliers}</span>
            <span style={{ color: '#999' }}>{intl.formatMessage({ id: 'suppliers.stats.unit' })}</span>
          </Space>
        </Descriptions.Item>
        <Descriptions.Item label={intl.formatMessage({ id: 'suppliers.stats.active' })}>
          <Space>
            <CheckCircleOutlined style={{ color: '#52c41a' }} />
            <span style={{ color: '#52c41a', fontWeight: 'bold' }}>{stats.activeSuppliers}</span>
            <span style={{ color: '#999' }}>({stats.totalSuppliers > 0 ? ((stats.activeSuppliers / stats.totalSuppliers) * 100).toFixed(1) : 0}%)</span>
          </Space>
        </Descriptions.Item>
        <Descriptions.Item label={intl.formatMessage({ id: 'suppliers.stats.inactive' })}>
          <Space>
            <span style={{ color: '#ff4d4f', fontWeight: 'bold' }}>{stats.inactiveSuppliers}</span>
            <span style={{ color: '#999' }}>({stats.totalSuppliers > 0 ? ((stats.inactiveSuppliers / stats.totalSuppliers) * 100).toFixed(1) : 0}%)</span>
          </Space>
        </Descriptions.Item>
        <Descriptions.Item label={intl.formatMessage({ id: 'suppliers.stats.recentlyAdded' })}>
          <Space>
            <span style={{ color: '#722ed1', fontWeight: 'bold' }}>{stats.recentlyAdded}</span>
            <span style={{ color: '#999' }}>{intl.formatMessage({ id: 'suppliers.stats.unit' })}</span>
          </Space>
        </Descriptions.Item>
      </Descriptions>
    </div>
  );

  return (
    <PageContainer header={{ title: false }}>
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
            key="template"
            icon={<DownloadOutlined />}
            onClick={handleDownloadTemplate}
          >
            {intl.formatMessage({ id: 'button.downloadTemplate' })}
          </Button>,
          <Button
            key="import"
            icon={<ImportOutlined />}
            onClick={() => setImportModalVisible(true)}
          >
            {intl.formatMessage({ id: 'button.import' })}
          </Button>,
          <Button
            key="export"
            icon={<ExportOutlined />}
            onClick={handleExport}
          >
            {intl.formatMessage({ id: 'button.export' })}
          </Button>,
          <Button
            key="create"
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setCreateModalVisible(true)}
          >
            {intl.formatMessage({ id: 'suppliers.add' })}
          </Button>,
        ]}
        
        // 表格属性
        dateFormatter="string"
        headerTitle={
          <Space>
            <span>{intl.formatMessage({ id: 'list.title.suppliers' })}</span>
            <span style={{ color: '#999', fontSize: 14, fontWeight: 'normal' }}>
              ({intl.formatMessage({ id: 'stats.count' }, { count: stats.totalSuppliers })})
            </span>
            <Popover
              content={statsContent}
              title={intl.formatMessage({ id: 'stats.title' })}
              trigger="click"
              placement="bottomLeft"
            >
              <Button
                type="text"
                size="small"
                icon={<InfoCircleOutlined />}
                style={{ color: '#1890ff' }}
              >
                {intl.formatMessage({ id: 'stats.detail' })}
              </Button>
            </Popover>
          </Space>
        }
      />

      {/* 创建供应商模态框 */}
      <Modal
        title={intl.formatMessage({ id: 'suppliers.add' })}
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
            label={intl.formatMessage({ id: 'suppliers.form.name' })}
            name="name"
            rules={[
              { required: true, message: intl.formatMessage({ id: 'suppliers.form.nameRequired' }) },
              { min: 2, max: 100, message: intl.formatMessage({ id: 'suppliers.form.nameLength' }) }
            ]}
          >
            <Input placeholder={intl.formatMessage({ id: 'suppliers.form.namePlaceholder' })} />
          </Form.Item>

          <Form.Item
            label={intl.formatMessage({ id: 'suppliers.form.contactPerson' })}
            name="contactPerson"
            rules={[
              { min: 2, max: 50, message: intl.formatMessage({ id: 'suppliers.form.contactPersonLength' }) }
            ]}
          >
            <Input placeholder={intl.formatMessage({ id: 'suppliers.form.contactPersonPlaceholder' })} />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label={intl.formatMessage({ id: 'suppliers.form.phone' })}
                name="phone"
              >
                <Input placeholder={intl.formatMessage({ id: 'suppliers.form.phonePlaceholder' })} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label={intl.formatMessage({ id: 'suppliers.form.email' })}
                name="email"
                rules={[
                  { type: 'email', message: intl.formatMessage({ id: 'suppliers.form.emailInvalid' }) }
                ]}
              >
                <Input placeholder={intl.formatMessage({ id: 'suppliers.form.emailPlaceholder' })} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label={intl.formatMessage({ id: 'suppliers.form.address' })}
            name="address"
            rules={[
              { max: 200, message: intl.formatMessage({ id: 'suppliers.form.addressLength' }) }
            ]}
          >
            <Input placeholder={intl.formatMessage({ id: 'suppliers.form.addressPlaceholder' })} />
          </Form.Item>

          <Form.Item
            label={intl.formatMessage({ id: 'suppliers.form.notes' })}
            name="notes"
          >
            <TextArea
              rows={3}
              placeholder={intl.formatMessage({ id: 'suppliers.form.notesPlaceholder' })}
              maxLength={500}
              showCount
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* 编辑供应商模态框 */}
      <Modal
        title={intl.formatMessage({ id: 'suppliers.edit' })}
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
            label={intl.formatMessage({ id: 'suppliers.form.name' })}
            name="name"
            rules={[
              { required: true, message: intl.formatMessage({ id: 'suppliers.form.nameRequired' }) },
              { min: 2, max: 100, message: intl.formatMessage({ id: 'suppliers.form.nameLength' }) }
            ]}
          >
            <Input placeholder={intl.formatMessage({ id: 'suppliers.form.namePlaceholder' })} />
          </Form.Item>

          <Form.Item
            label={intl.formatMessage({ id: 'suppliers.form.contactPerson' })}
            name="contactPerson"
            rules={[
              { min: 2, max: 50, message: intl.formatMessage({ id: 'suppliers.form.contactPersonLength' }) }
            ]}
          >
            <Input placeholder={intl.formatMessage({ id: 'suppliers.form.contactPersonPlaceholder' })} />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label={intl.formatMessage({ id: 'suppliers.form.phone' })}
                name="phone"
              >
                <Input placeholder={intl.formatMessage({ id: 'suppliers.form.phonePlaceholder' })} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label={intl.formatMessage({ id: 'suppliers.form.email' })}
                name="email"
                rules={[
                  { type: 'email', message: intl.formatMessage({ id: 'suppliers.form.emailInvalid' }) }
                ]}
              >
                <Input placeholder={intl.formatMessage({ id: 'suppliers.form.emailPlaceholder' })} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label={intl.formatMessage({ id: 'suppliers.form.address' })}
            name="address"
            rules={[
              { max: 200, message: intl.formatMessage({ id: 'suppliers.form.addressLength' }) }
            ]}
          >
            <Input placeholder={intl.formatMessage({ id: 'suppliers.form.addressPlaceholder' })} />
          </Form.Item>

          <Form.Item
            label={intl.formatMessage({ id: 'suppliers.form.notes' })}
            name="notes"
          >
            <TextArea
              rows={3}
              placeholder={intl.formatMessage({ id: 'suppliers.form.notesPlaceholder' })}
              maxLength={500}
              showCount
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* 导入Excel模态框 */}
      <ImportModal
        open={importModalVisible}
        onCancel={() => setImportModalVisible(false)}
        onImport={handleImport}
        loading={importLoading}
        progress={importProgress}
        title="导入供应商"
        width={700}
        fields={[
          { field: '供应商编号', required: false, description: '留空则系统自动生成', example: '' },
          { field: '供应商名称', required: true, description: '供应商名称（基地内唯一）', example: '咸鱼' },
          { field: '联系人', required: false, description: '联系人姓名', example: '张三' },
          { field: '联系电话', required: false, description: '联系电话', example: '13800138000' },
          { field: '邮箱', required: false, description: '电子邮箱', example: 'test@example.com' },
          { field: '地址', required: false, description: '联系地址', example: '北京市朝阳区' },
          { field: '状态', required: false, description: '启用/禁用，默认启用', example: '启用' },
          { field: '备注', required: false, description: '备注信息', example: '' },
        ]}
      />
    </PageContainer>
  );
};

export default SupplierManagement;
