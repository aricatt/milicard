import React, { useRef, useState } from 'react';
import { 
  Card, 
  Space, 
  Tag, 
  Modal,
  Form,
  Input,
  Select,
  App,
  Button,
  Popconfirm,
  Popover,
  Descriptions,
  Tooltip,
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined,
  DeleteOutlined,
  UserOutlined,
  TeamOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import { ProTable, PageContainer } from '@ant-design/pro-components';
import type { ProColumns, ActionType } from '@ant-design/pro-components';
import { request, useIntl } from '@umijs/max';
import { useBase } from '@/contexts/BaseContext';
import styles from './index.less';

const { Option } = Select;

// 人员角色枚举
enum PersonnelRole {
  ANCHOR = 'ANCHOR',
  WAREHOUSE_KEEPER = 'WAREHOUSE_KEEPER',
}

// 人员数据类型定义
interface Personnel {
  id: string;
  code: string;
  name: string;
  role: PersonnelRole;
  phone?: string;
  email?: string;
  notes?: string;
  baseId: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  baseName: string;
}

// 人员统计数据类型
interface PersonnelStats {
  totalPersonnel: number;
  anchors: number;
  warehouseKeepers: number;
  activePersonnel: number;
}

/**
 * 主播/仓管管理页面 - ProTable 版本
 * 基地中心化的人员管理，统一管理主播和仓管人员
 */
const PersonnelManagement: React.FC = () => {
  const { currentBase } = useBase();
  const { message } = App.useApp();
  const intl = useIntl();
  const actionRef = useRef<ActionType>();
  
  // 状态管理
  const [stats, setStats] = useState<PersonnelStats>({
    totalPersonnel: 0,
    anchors: 0,
    warehouseKeepers: 0,
    activePersonnel: 0,
  });
  
  // 模态框状态
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingPersonnel, setEditingPersonnel] = useState<Personnel | null>(null);
  const [createLoading, setCreateLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  
  // 表单实例
  const [createForm] = Form.useForm();
  const [editForm] = Form.useForm();

  /**
   * 获取人员数据
   */
  const fetchPersonnelData = async (params: any) => {
    if (!currentBase) {
      return {
        data: [],
        success: true,
        total: 0,
      };
    }

    try {
      const { current = 1, pageSize = 20, name, role, isActive } = params;
      
      // 构建查询参数
      const queryParams: any = {
        current,
        pageSize,
      };
      
      if (name) queryParams.name = name;
      if (role) queryParams.role = role;
      if (isActive !== undefined) queryParams.isActive = isActive;

      const result = await request(`/api/v1/bases/${currentBase.id}/personnel`, {
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
        message.error(result.message || '获取人员数据失败');
        return {
          data: [],
          success: false,
          total: 0,
        };
      }
    } catch (error) {
      console.error('获取人员数据失败:', error);
      message.error('获取人员数据失败');
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
  const calculateStats = (data: Personnel[]) => {
    const newStats: PersonnelStats = {
      totalPersonnel: data.length,
      anchors: data.filter(p => p.role === PersonnelRole.ANCHOR).length,
      warehouseKeepers: data.filter(p => p.role === PersonnelRole.WAREHOUSE_KEEPER).length,
      activePersonnel: data.filter(p => p.isActive).length,
    };
    setStats(newStats);
  };

  /**
   * 创建人员
   */
  const handleCreate = async (values: any) => {
    if (!currentBase) {
      message.error('请先选择基地');
      return;
    }

    setCreateLoading(true);
    try {
      const result = await request(`/api/v1/bases/${currentBase.id}/personnel`, {
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
      console.error('创建人员失败:', error);
      message.error('创建人员失败');
    } finally {
      setCreateLoading(false);
    }
  };

  /**
   * 更新人员
   */
  const handleUpdate = async (values: any) => {
    if (!currentBase || !editingPersonnel) {
      return;
    }

    setEditLoading(true);
    try {
      const result = await request(
        `/api/v1/bases/${currentBase.id}/personnel/${editingPersonnel.id}`,
        {
          method: 'PUT',
          data: values,
        }
      );

      if (result.success) {
        message.success('更新成功');
        setEditModalVisible(false);
        editForm.resetFields();
        setEditingPersonnel(null);
        actionRef.current?.reload();
      } else {
        message.error(result.message || '更新失败');
      }
    } catch (error) {
      console.error('更新人员失败:', error);
      message.error('更新人员失败');
    } finally {
      setEditLoading(false);
    }
  };

  /**
   * 删除人员
   */
  const handleDelete = async (record: Personnel) => {
    if (!currentBase) {
      return;
    }

    try {
      const result = await request(
        `/api/v1/bases/${currentBase.id}/personnel/${record.id}`,
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
      console.error('删除人员失败:', error);
      message.error('删除人员失败');
    }
  };

  /**
   * 打开编辑模态框
   */
  const handleEdit = (record: Personnel) => {
    setEditingPersonnel(record);
    editForm.setFieldsValue({
      name: record.name,
      role: record.role,
      phone: record.phone,
      email: record.email,
      notes: record.notes,
    });
    setEditModalVisible(true);
  };

  /**
   * 列定义
   */
  const columns: ProColumns<Personnel>[] = [
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
      title: intl.formatMessage({ id: 'table.column.code' }),
      dataIndex: 'code',
      key: 'code',
      width: 180,
      fixed: 'left',
      copyable: true,
      hideInSetting: true,
      hideInSearch: true,
      render: (text: string) => <code>{text}</code>,
    },
    {
      title: intl.formatMessage({ id: 'personnel.column.name' }),
      dataIndex: 'name',
      key: 'name',
      width: 150,
      fixed: 'left',
      hideInSetting: true,
      hideInSearch: false,
      render: (text: string) => <strong>{text}</strong>,
    },
    {
      title: intl.formatMessage({ id: 'personnel.column.role' }),
      dataIndex: 'role',
      key: 'role',
      width: 100,
      valueType: 'select',
      valueEnum: {
        ANCHOR: { text: intl.formatMessage({ id: 'personnel.role.anchor' }), status: 'Processing' },
        WAREHOUSE_KEEPER: { text: intl.formatMessage({ id: 'personnel.role.warehouseKeeper' }), status: 'Default' },
      },
      render: (_, record) => (
        <Tag 
          color={record.role === PersonnelRole.ANCHOR ? 'purple' : 'orange'}
          icon={record.role === PersonnelRole.ANCHOR ? <UserOutlined /> : <TeamOutlined />}
        >
          {record.role === PersonnelRole.ANCHOR ? intl.formatMessage({ id: 'personnel.role.anchor' }) : intl.formatMessage({ id: 'personnel.role.warehouseKeeper' })}
        </Tag>
      ),
      hideInSearch: false,
    },
    {
      title: intl.formatMessage({ id: 'personnel.column.phone' }),
      dataIndex: 'phone',
      key: 'phone',
      width: 130,
      hideInSearch: true,
      render: (text: string) => text || '-',
    },
    {
      title: intl.formatMessage({ id: 'personnel.column.email' }),
      dataIndex: 'email',
      key: 'email',
      width: 180,
      ellipsis: true,
      hideInSearch: true,
      hideInTable: false,
      render: (text: string) => text || '-',
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
        true: { text: intl.formatMessage({ id: 'personnel.status.active' }), status: 'Success' },
        false: { text: intl.formatMessage({ id: 'personnel.status.inactive' }), status: 'Error' },
      },
      render: (_, record) => (
        <Tag color={record.isActive ? 'green' : 'red'}>
          {record.isActive ? intl.formatMessage({ id: 'personnel.status.active' }) : intl.formatMessage({ id: 'personnel.status.inactive' })}
        </Tag>
      ),
      hideInSearch: false,
    },
    {
      title: intl.formatMessage({ id: 'table.column.createdAt' }),
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 170,
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
        <Card>
          <div style={{ textAlign: 'center', padding: '50px 0' }}>
            <p>{intl.formatMessage({ id: 'message.selectBase' })}</p>
          </div>
        </Card>
      </PageContainer>
    );
  }

  // 统计详情弹出内容
  const statsContent = (
    <div style={{ width: 300 }}>
      <Descriptions column={1} size="small" bordered>
        <Descriptions.Item label={intl.formatMessage({ id: 'personnel.stats.total' })}>
          <Space>
            <TeamOutlined />
            <span style={{ fontWeight: 'bold', fontSize: 16 }}>{stats.totalPersonnel}</span>
          </Space>
        </Descriptions.Item>
        <Descriptions.Item label={intl.formatMessage({ id: 'personnel.stats.anchors' })}>
          <Space>
            <UserOutlined style={{ color: '#722ed1' }} />
            <span style={{ color: '#722ed1', fontWeight: 'bold' }}>{stats.anchors}</span>
            <span style={{ color: '#999' }}>({stats.totalPersonnel > 0 ? ((stats.anchors / stats.totalPersonnel) * 100).toFixed(1) : 0}%)</span>
          </Space>
        </Descriptions.Item>
        <Descriptions.Item label={intl.formatMessage({ id: 'personnel.stats.warehouseKeepers' })}>
          <Space>
            <TeamOutlined style={{ color: '#fa8c16' }} />
            <span style={{ color: '#fa8c16', fontWeight: 'bold' }}>{stats.warehouseKeepers}</span>
            <span style={{ color: '#999' }}>({stats.totalPersonnel > 0 ? ((stats.warehouseKeepers / stats.totalPersonnel) * 100).toFixed(1) : 0}%)</span>
          </Space>
        </Descriptions.Item>
        <Descriptions.Item label={intl.formatMessage({ id: 'personnel.stats.active' })}>
          <Space>
            <CheckCircleOutlined style={{ color: '#52c41a' }} />
            <span style={{ color: '#52c41a', fontWeight: 'bold' }}>{stats.activePersonnel}</span>
            <span style={{ color: '#999' }}>({stats.totalPersonnel > 0 ? ((stats.activePersonnel / stats.totalPersonnel) * 100).toFixed(1) : 0}%)</span>
          </Space>
        </Descriptions.Item>
        <Descriptions.Item label={intl.formatMessage({ id: 'personnel.stats.inactive' })}>
          <Space>
            <span style={{ color: '#ff4d4f', fontWeight: 'bold' }}>{stats.totalPersonnel - stats.activePersonnel}</span>
            <span style={{ color: '#999' }}>({stats.totalPersonnel > 0 ? (((stats.totalPersonnel - stats.activePersonnel) / stats.totalPersonnel) * 100).toFixed(1) : 0}%)</span>
          </Space>
        </Descriptions.Item>
      </Descriptions>
    </div>
  );

  return (
    <PageContainer header={{ title: false }}>
      {/* ProTable */}
      <ProTable<Personnel>
        columns={columns}
        actionRef={actionRef}
        request={fetchPersonnelData}
        rowKey="id"
        
        // 列状态配置 - 持久化到 localStorage
        columnsState={{
          persistenceKey: 'personnel-table-columns',
          persistenceType: 'localStorage',
          defaultValue: {
            // 默认隐藏的列
            id: { show: false },
            email: { show: false },
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
        scroll={{ x: 1400 }}
        pagination={{
          defaultPageSize: 10,
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
            {intl.formatMessage({ id: 'personnel.add' })}
          </Button>,
        ]}
        
        // 表格属性
        dateFormatter="string"
        headerTitle={
          <Space>
            <span>{intl.formatMessage({ id: 'list.title.personnel' })}</span>
            <span style={{ color: '#999', fontSize: 14, fontWeight: 'normal' }}>
              ({intl.formatMessage({ id: 'stats.count' }, { count: stats.totalPersonnel })})
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

      {/* 创建人员模态框 */}
      <Modal
        title={intl.formatMessage({ id: 'personnel.add' })}
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
            label={intl.formatMessage({ id: 'personnel.form.name' })}
            name="name"
            rules={[
              { required: true, message: intl.formatMessage({ id: 'personnel.form.nameRequired' }) },
              { min: 2, max: 20, message: intl.formatMessage({ id: 'personnel.form.nameLength' }) }
            ]}
          >
            <Input placeholder={intl.formatMessage({ id: 'personnel.form.namePlaceholder' })} />
          </Form.Item>

          <Form.Item
            label={intl.formatMessage({ id: 'personnel.form.role' })}
            name="role"
            rules={[{ required: true, message: intl.formatMessage({ id: 'personnel.form.roleRequired' }) }]}
          >
            <Select placeholder={intl.formatMessage({ id: 'personnel.form.rolePlaceholder' })}>
              <Option value={PersonnelRole.ANCHOR}>
                <UserOutlined /> {intl.formatMessage({ id: 'personnel.stats.anchors' })}
              </Option>
              <Option value={PersonnelRole.WAREHOUSE_KEEPER}>
                <TeamOutlined /> {intl.formatMessage({ id: 'personnel.stats.warehouseKeepers' })}
              </Option>
            </Select>
          </Form.Item>

          <Form.Item
            label={intl.formatMessage({ id: 'personnel.form.phone' })}
            name="phone"
          >
            <Input placeholder={intl.formatMessage({ id: 'personnel.form.phonePlaceholder' })} />
          </Form.Item>

          <Form.Item
            label={intl.formatMessage({ id: 'personnel.form.email' })}
            name="email"
            rules={[
              { type: 'email', message: intl.formatMessage({ id: 'personnel.form.emailInvalid' }) }
            ]}
          >
            <Input placeholder={intl.formatMessage({ id: 'personnel.form.emailPlaceholder' })} />
          </Form.Item>

          <Form.Item
            label={intl.formatMessage({ id: 'personnel.form.notes' })}
            name="notes"
          >
            <Input.TextArea
              rows={3}
              placeholder={intl.formatMessage({ id: 'personnel.form.notesPlaceholder' })}
              maxLength={200}
              showCount
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* 编辑人员模态框 */}
      <Modal
        title={intl.formatMessage({ id: 'personnel.edit' })}
        open={editModalVisible}
        onOk={() => editForm.submit()}
        onCancel={() => {
          setEditModalVisible(false);
          editForm.resetFields();
          setEditingPersonnel(null);
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
            label={intl.formatMessage({ id: 'personnel.form.name' })}
            name="name"
            rules={[
              { required: true, message: intl.formatMessage({ id: 'personnel.form.nameRequired' }) },
              { min: 2, max: 20, message: intl.formatMessage({ id: 'personnel.form.nameLength' }) }
            ]}
          >
            <Input placeholder={intl.formatMessage({ id: 'personnel.form.namePlaceholder' })} />
          </Form.Item>

          <Form.Item
            label={intl.formatMessage({ id: 'personnel.form.role' })}
            name="role"
            rules={[{ required: true, message: intl.formatMessage({ id: 'personnel.form.roleRequired' }) }]}
          >
            <Select placeholder={intl.formatMessage({ id: 'personnel.form.rolePlaceholder' })}>
              <Option value={PersonnelRole.ANCHOR}>
                <UserOutlined /> {intl.formatMessage({ id: 'personnel.stats.anchors' })}
              </Option>
              <Option value={PersonnelRole.WAREHOUSE_KEEPER}>
                <TeamOutlined /> {intl.formatMessage({ id: 'personnel.stats.warehouseKeepers' })}
              </Option>
            </Select>
          </Form.Item>

          <Form.Item
            label={intl.formatMessage({ id: 'personnel.form.phone' })}
            name="phone"
          >
            <Input placeholder={intl.formatMessage({ id: 'personnel.form.phonePlaceholder' })} />
          </Form.Item>

          <Form.Item
            label={intl.formatMessage({ id: 'personnel.form.email' })}
            name="email"
            rules={[
              { type: 'email', message: intl.formatMessage({ id: 'personnel.form.emailInvalid' }) }
            ]}
          >
            <Input placeholder={intl.formatMessage({ id: 'personnel.form.emailPlaceholder' })} />
          </Form.Item>

          <Form.Item
            label={intl.formatMessage({ id: 'personnel.form.notes' })}
            name="notes"
          >
            <Input.TextArea
              rows={3}
              placeholder={intl.formatMessage({ id: 'personnel.form.notesPlaceholder' })}
              maxLength={200}
              showCount
            />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
};

export default PersonnelManagement;
