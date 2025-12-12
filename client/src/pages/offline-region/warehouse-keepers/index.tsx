import React, { useRef, useState } from 'react';
import { 
  Card, 
  Space, 
  Tag, 
  Modal,
  Form,
  Input,
  message,
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
  TeamOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import { ProTable, PageContainer } from '@ant-design/pro-components';
import type { ProColumns, ActionType } from '@ant-design/pro-components';
import { request, useIntl } from '@umijs/max';
import { useBase } from '@/contexts/BaseContext';

// 人员角色枚举 - 只使用仓管
const PersonnelRole = {
  WAREHOUSE_KEEPER: 'WAREHOUSE_KEEPER',
};

// 人员数据类型定义
interface Personnel {
  id: string;
  code: string;
  name: string;
  role: string;
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
  activePersonnel: number;
}

/**
 * 仓管管理页面
 * 只显示仓管类型的人员
 */
const WarehouseKeepersPage: React.FC = () => {
  const { currentBase } = useBase();
  const intl = useIntl();
  const actionRef = useRef<ActionType>(null);
  
  // 状态管理
  const [stats, setStats] = useState<PersonnelStats>({
    totalPersonnel: 0,
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
   * 获取人员数据 - 只获取仓管类型
   */
  const fetchPersonnelData = async (params: any) => {
    if (!currentBase) {
      return { data: [], success: true, total: 0 };
    }

    try {
      const { current = 1, pageSize = 20, name, isActive } = params;
      
      const queryParams: any = {
        current,
        pageSize,
        role: PersonnelRole.WAREHOUSE_KEEPER, // 只获取仓管
      };
      
      if (name) queryParams.name = name;
      if (isActive !== undefined) queryParams.isActive = isActive;

      const result = await request(`/api/v1/bases/${currentBase.id}/personnel`, {
        method: 'GET',
        params: queryParams,
      });
      
      if (result.success) {
        // 过滤只保留仓管
        const warehouseKeepers = (result.data || []).filter(
          (p: Personnel) => p.role === PersonnelRole.WAREHOUSE_KEEPER
        );
        calculateStats(warehouseKeepers);
        
        return {
          data: warehouseKeepers,
          success: true,
          total: warehouseKeepers.length,
        };
      } else {
        message.error(result.message || intl.formatMessage({ id: 'message.failed' }));
        return { data: [], success: false, total: 0 };
      }
    } catch (error) {
      console.error('Failed to fetch personnel:', error);
      message.error(intl.formatMessage({ id: 'message.failed' }));
      return { data: [], success: false, total: 0 };
    }
  };

  /**
   * 计算统计数据
   */
  const calculateStats = (data: Personnel[]) => {
    const newStats: PersonnelStats = {
      totalPersonnel: data.length,
      activePersonnel: data.filter(p => p.isActive).length,
    };
    setStats(newStats);
  };

  /**
   * 创建人员 - 固定为仓管角色
   */
  const handleCreate = async (values: any) => {
    if (!currentBase) {
      message.error(intl.formatMessage({ id: 'message.selectBaseFirst' }));
      return;
    }

    setCreateLoading(true);
    try {
      const result = await request(`/api/v1/bases/${currentBase.id}/personnel`, {
        method: 'POST',
        data: {
          ...values,
          role: PersonnelRole.WAREHOUSE_KEEPER, // 固定为仓管
        },
      });

      if (result.success) {
        message.success(intl.formatMessage({ id: 'message.success' }));
        setCreateModalVisible(false);
        createForm.resetFields();
        actionRef.current?.reload();
      } else {
        message.error(result.message || intl.formatMessage({ id: 'message.failed' }));
      }
    } catch (error: any) {
      console.error('Failed to create personnel:', error);
      const errorMsg = error?.response?.data?.message || error?.data?.message || intl.formatMessage({ id: 'message.failed' });
      message.error(errorMsg);
    } finally {
      setCreateLoading(false);
    }
  };

  /**
   * 更新人员
   */
  const handleUpdate = async (values: any) => {
    if (!currentBase || !editingPersonnel) return;

    setEditLoading(true);
    try {
      const result = await request(
        `/api/v1/bases/${currentBase.id}/personnel/${editingPersonnel.id}`,
        {
          method: 'PUT',
          data: {
            ...values,
            role: PersonnelRole.WAREHOUSE_KEEPER, // 保持仓管角色
          },
        }
      );

      if (result.success) {
        message.success(intl.formatMessage({ id: 'message.success' }));
        setEditModalVisible(false);
        editForm.resetFields();
        setEditingPersonnel(null);
        actionRef.current?.reload();
      } else {
        message.error(result.message || intl.formatMessage({ id: 'message.failed' }));
      }
    } catch (error: any) {
      console.error('Failed to update personnel:', error);
      const errorMsg = error?.response?.data?.message || error?.data?.message || intl.formatMessage({ id: 'message.failed' });
      message.error(errorMsg);
    } finally {
      setEditLoading(false);
    }
  };

  /**
   * 删除人员
   */
  const handleDelete = async (record: Personnel) => {
    if (!currentBase) return;

    try {
      const result = await request(
        `/api/v1/bases/${currentBase.id}/personnel/${record.id}`,
        { method: 'DELETE' }
      );

      if (result.success) {
        message.success(intl.formatMessage({ id: 'message.success' }));
        actionRef.current?.reload();
      } else {
        message.error(result.message || intl.formatMessage({ id: 'message.failed' }));
      }
    } catch (error) {
      console.error('Failed to delete personnel:', error);
      message.error(intl.formatMessage({ id: 'message.failed' }));
    }
  };

  /**
   * 打开编辑模态框
   */
  const handleEdit = (record: Personnel) => {
    setEditingPersonnel(record);
    editForm.setFieldsValue({
      name: record.name,
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
      title: intl.formatMessage({ id: 'form.label.code' }),
      dataIndex: 'code',
      key: 'code',
      width: 180,
      fixed: 'left',
      copyable: true,
      hideInSetting: true,
      hideInSearch: true,
      render: (text: any) => <code>{text}</code>,
    },
    {
      title: intl.formatMessage({ id: 'warehouseKeepers.column.name' }),
      dataIndex: 'name',
      key: 'name',
      width: 150,
      fixed: 'left',
      hideInSetting: true,
      hideInSearch: false,
      render: (text: any) => <strong>{text}</strong>,
    },
    {
      title: intl.formatMessage({ id: 'personnel.column.role' }),
      dataIndex: 'role',
      key: 'role',
      width: 100,
      hideInSearch: true,
      render: () => (
        <Tag color="orange" icon={<TeamOutlined />}>
          {intl.formatMessage({ id: 'personnel.role.warehouseKeeper' })}
        </Tag>
      ),
    },
    {
      title: intl.formatMessage({ id: 'form.label.contactPhone' }),
      dataIndex: 'phone',
      key: 'phone',
      width: 130,
      hideInSearch: true,
      render: (text: any) => text || '-',
    },
    {
      title: intl.formatMessage({ id: 'personnel.column.email' }),
      dataIndex: 'email',
      key: 'email',
      width: 180,
      ellipsis: true,
      hideInSearch: true,
      hideInTable: false,
      render: (text: any) => text || '-',
    },
    {
      title: intl.formatMessage({ id: 'form.label.notes' }),
      dataIndex: 'notes',
      key: 'notes',
      width: 200,
      ellipsis: true,
      hideInSearch: true,
      hideInTable: false,
      render: (text: any) => text || '-',
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
        } catch {
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
            <Button type="link" size="small" danger icon={<DeleteOutlined />} />
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
            <p>{intl.formatMessage({ id: 'message.selectBaseFirst' })}</p>
          </div>
        </Card>
      </PageContainer>
    );
  }

  // 统计详情弹出内容
  const statsContent = (
    <div style={{ width: 280 }}>
      <Descriptions column={1} size="small" bordered>
        <Descriptions.Item label={intl.formatMessage({ id: 'warehouseKeepers.stats.total' })}>
          <Space>
            <TeamOutlined />
            <span style={{ fontWeight: 'bold', fontSize: 16 }}>{stats.totalPersonnel}</span>
          </Space>
        </Descriptions.Item>
        <Descriptions.Item label={intl.formatMessage({ id: 'personnel.status.active' })}>
          <Space>
            <CheckCircleOutlined style={{ color: '#52c41a' }} />
            <span style={{ color: '#52c41a', fontWeight: 'bold' }}>{stats.activePersonnel}</span>
          </Space>
        </Descriptions.Item>
        <Descriptions.Item label={intl.formatMessage({ id: 'personnel.status.inactive' })}>
          <Space>
            <span style={{ color: '#ff4d4f', fontWeight: 'bold' }}>{stats.totalPersonnel - stats.activePersonnel}</span>
          </Space>
        </Descriptions.Item>
      </Descriptions>
    </div>
  );

  return (
    <PageContainer header={{ title: false }}>
      <ProTable<Personnel>
        columns={columns}
        actionRef={actionRef}
        request={fetchPersonnelData}
        rowKey="id"
        columnsState={{
          persistenceKey: 'warehouse-keepers-table-columns',
          persistenceType: 'localStorage',
          defaultValue: {
            email: { show: false },
            notes: { show: false },
          },
        }}
        search={{
          labelWidth: 'auto',
          defaultCollapsed: false,
          optionRender: (searchConfig, formProps, dom) => [...dom.reverse()],
        }}
        options={{
          setting: { listsHeight: 400, draggable: true },
          reload: () => actionRef.current?.reload(),
          density: true,
          fullScreen: true,
        }}
        scroll={{ x: 1200 }}
        pagination={{
          defaultPageSize: 20,
          showSizeChanger: true,
          showQuickJumper: true,
          pageSizeOptions: ['10', '20', '30', '50', '100'],
        }}
        toolBarRender={() => [
          <Button
            key="create"
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setCreateModalVisible(true)}
          >
            {intl.formatMessage({ id: 'warehouseKeepers.add' })}
          </Button>,
        ]}
        dateFormatter="string"
        headerTitle={
          <Space>
            <span>{intl.formatMessage({ id: 'list.title.warehouseKeepers' })}</span>
            <span style={{ color: '#999', fontSize: 14, fontWeight: 'normal' }}>
              ({intl.formatMessage({ id: 'stats.count' }, { count: stats.totalPersonnel })})
            </span>
            <Popover content={statsContent} title={intl.formatMessage({ id: 'stats.title' })} trigger="click" placement="bottomLeft">
              <Button type="text" size="small" icon={<InfoCircleOutlined />} style={{ color: '#1890ff' }}>
                {intl.formatMessage({ id: 'stats.detail' })}
              </Button>
            </Popover>
          </Space>
        }
      />

      {/* 添加仓管模态框 - 不需要选择角色 */}
      <Modal
        title={intl.formatMessage({ id: 'warehouseKeepers.add' })}
        open={createModalVisible}
        onOk={() => createForm.submit()}
        onCancel={() => {
          setCreateModalVisible(false);
          createForm.resetFields();
        }}
        confirmLoading={createLoading}
        width={600}
      >
        <Form form={createForm} layout="vertical" onFinish={handleCreate}>
          <Form.Item
            label={intl.formatMessage({ id: 'warehouseKeepers.column.name' })}
            name="name"
            rules={[
              { required: true, message: intl.formatMessage({ id: 'warehouseKeepers.form.nameRequired' }) },
              { min: 2, max: 20, message: intl.formatMessage({ id: 'warehouseKeepers.form.nameLength' }) }
            ]}
          >
            <Input placeholder={intl.formatMessage({ id: 'warehouseKeepers.form.namePlaceholder' })} />
          </Form.Item>

          <Form.Item label={intl.formatMessage({ id: 'form.label.contactPhone' })} name="phone">
            <Input placeholder={intl.formatMessage({ id: 'form.placeholder.contactPhone' })} />
          </Form.Item>

          <Form.Item
            label={intl.formatMessage({ id: 'personnel.column.email' })}
            name="email"
            rules={[{ type: 'email', message: intl.formatMessage({ id: 'warehouseKeepers.form.emailInvalid' }) }]}
          >
            <Input placeholder={intl.formatMessage({ id: 'warehouseKeepers.form.emailPlaceholder' })} />
          </Form.Item>

          <Form.Item label={intl.formatMessage({ id: 'form.label.notes' })} name="notes">
            <Input.TextArea rows={3} placeholder={intl.formatMessage({ id: 'form.placeholder.input' })} maxLength={200} showCount />
          </Form.Item>
        </Form>
      </Modal>

      {/* 编辑仓管模态框 */}
      <Modal
        title={intl.formatMessage({ id: 'warehouseKeepers.edit' })}
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
        <Form form={editForm} layout="vertical" onFinish={handleUpdate}>
          <Form.Item
            label={intl.formatMessage({ id: 'warehouseKeepers.column.name' })}
            name="name"
            rules={[
              { required: true, message: intl.formatMessage({ id: 'warehouseKeepers.form.nameRequired' }) },
              { min: 2, max: 20, message: intl.formatMessage({ id: 'warehouseKeepers.form.nameLength' }) }
            ]}
          >
            <Input placeholder={intl.formatMessage({ id: 'warehouseKeepers.form.namePlaceholder' })} />
          </Form.Item>

          <Form.Item label={intl.formatMessage({ id: 'form.label.contactPhone' })} name="phone">
            <Input placeholder={intl.formatMessage({ id: 'form.placeholder.contactPhone' })} />
          </Form.Item>

          <Form.Item
            label={intl.formatMessage({ id: 'personnel.column.email' })}
            name="email"
            rules={[{ type: 'email', message: intl.formatMessage({ id: 'warehouseKeepers.form.emailInvalid' }) }]}
          >
            <Input placeholder={intl.formatMessage({ id: 'warehouseKeepers.form.emailPlaceholder' })} />
          </Form.Item>

          <Form.Item label={intl.formatMessage({ id: 'form.label.notes' })} name="notes">
            <Input.TextArea rows={3} placeholder={intl.formatMessage({ id: 'form.placeholder.input' })} maxLength={200} showCount />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
};

export default WarehouseKeepersPage;
