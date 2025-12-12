import React, { useRef, useState } from 'react';
import { 
  Card, 
  Space, 
  Tag, 
  Modal,
  Form,
  Input,
  Select,
  message,
  Button,
  Popconfirm,
  Popover,
  Descriptions,
  Alert
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined,
  DeleteOutlined,
  DatabaseOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
  WarningOutlined
} from '@ant-design/icons';
import { ProTable, PageContainer } from '@ant-design/pro-components';
import type { ProColumns, ActionType } from '@ant-design/pro-components';
import { useBase } from '@/contexts/BaseContext';
import { useIntl } from '@umijs/max';

const { TextArea } = Input;
const { Option } = Select;

// 位置类型枚举 - 只使用仓库类型
enum LocationType {
  MAIN_WAREHOUSE = 'MAIN_WAREHOUSE',
  WAREHOUSE = 'WAREHOUSE',
}

// 位置数据类型定义
interface Location {
  id: number;
  code: string;
  name: string;
  type: LocationType;
  description?: string;
  address?: string;
  contactPerson?: string;
  contactPhone?: string;
  baseId: number;
  baseName: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// 位置统计数据类型
interface LocationStats {
  totalLocations: number;
  mainWarehouses: number;
  warehouses: number;
  activeLocations: number;
}

/**
 * 小区/仓库管理页面
 * 只显示仓库类型的位置（总仓库和子仓库）
 */
const SubDistrictsPage: React.FC = () => {
  const { currentBase } = useBase();
  const intl = useIntl();
  const actionRef = useRef<ActionType>();
  
  // 状态管理
  const [stats, setStats] = useState<LocationStats>({
    totalLocations: 0,
    mainWarehouses: 0,
    warehouses: 0,
    activeLocations: 0,
  });
  
  // 模态框状态
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [createLoading, setCreateLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  
  // 总仓库检测状态
  const [hasMainWarehouse, setHasMainWarehouse] = useState(true);
  const [noMainWarehouseModalVisible, setNoMainWarehouseModalVisible] = useState(false);
  const [hasCheckedMainWarehouse, setHasCheckedMainWarehouse] = useState(false);
  
  // 表单实例
  const [createForm] = Form.useForm();
  const [editForm] = Form.useForm();

  /**
   * 获取位置数据 - 只获取仓库类型
   */
  const fetchLocationData = async (params: any) => {
    if (!currentBase) {
      return { data: [], success: true, total: 0 };
    }

    try {
      const { current = 1, pageSize = 30, name, type, isActive } = params;
      
      const queryParams = new URLSearchParams({
        current: String(current),
        pageSize: String(pageSize),
      });
      
      if (name) queryParams.append('name', name);
      // 只获取仓库类型（总仓库和子仓库）
      if (type) {
        queryParams.append('type', type);
      } else {
        // 默认只显示仓库类型
        queryParams.append('type', 'MAIN_WAREHOUSE,WAREHOUSE');
      }
      if (isActive !== undefined) queryParams.append('isActive', String(isActive));

      const response = await fetch(
        `/api/v1/bases/${currentBase.id}/locations?${queryParams.toString()}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        // 过滤只保留仓库类型
        const warehouseData = (result.data || []).filter(
          (item: Location) => item.type === LocationType.MAIN_WAREHOUSE || item.type === LocationType.WAREHOUSE
        );
        calculateStats(warehouseData);
        
        return {
          data: warehouseData,
          success: true,
          total: warehouseData.length,
        };
      } else {
        message.error(result.message || intl.formatMessage({ id: 'message.failed' }));
        return { data: [], success: false, total: 0 };
      }
    } catch (error) {
      console.error('Failed to fetch location data:', error);
      message.error(intl.formatMessage({ id: 'message.failed' }));
      return { data: [], success: false, total: 0 };
    }
  };

  /**
   * 计算统计数据
   */
  const calculateStats = (data: Location[]) => {
    const mainWarehouseCount = data.filter(item => item.type === LocationType.MAIN_WAREHOUSE).length;
    const newStats: LocationStats = {
      totalLocations: data.length,
      mainWarehouses: mainWarehouseCount,
      warehouses: data.filter(item => item.type === LocationType.WAREHOUSE).length,
      activeLocations: data.filter(item => item.isActive).length,
    };
    setStats(newStats);
    
    const hasMain = mainWarehouseCount > 0;
    setHasMainWarehouse(hasMain);
    
    if (!hasCheckedMainWarehouse && !hasMain && data.length > 0) {
      setNoMainWarehouseModalVisible(true);
    }
    setHasCheckedMainWarehouse(true);
  };

  /**
   * 创建位置
   */
  const handleCreate = async (values: any) => {
    if (!currentBase) {
      message.error(intl.formatMessage({ id: 'message.selectBaseFirst' }));
      return;
    }

    setCreateLoading(true);
    try {
      const response = await fetch(`/api/v1/bases/${currentBase.id}/locations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(values),
      });

      const result = await response.json();

      if (result.success) {
        message.success(intl.formatMessage({ id: 'message.success' }));
        setCreateModalVisible(false);
        createForm.resetFields();
        actionRef.current?.reload();
      } else {
        message.error(result.message || intl.formatMessage({ id: 'message.failed' }));
      }
    } catch (error) {
      console.error('Failed to create location:', error);
      message.error(intl.formatMessage({ id: 'message.failed' }));
    } finally {
      setCreateLoading(false);
    }
  };

  /**
   * 更新位置
   */
  const handleUpdate = async (values: any) => {
    if (!currentBase || !editingLocation) return;

    setEditLoading(true);
    try {
      const response = await fetch(
        `/api/v1/bases/${currentBase.id}/locations/${editingLocation.id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify(values),
        }
      );

      const result = await response.json();

      if (result.success) {
        message.success(intl.formatMessage({ id: 'message.success' }));
        setEditModalVisible(false);
        editForm.resetFields();
        setEditingLocation(null);
        actionRef.current?.reload();
      } else {
        message.error(result.message || intl.formatMessage({ id: 'message.failed' }));
      }
    } catch (error) {
      console.error('Failed to update location:', error);
      message.error(intl.formatMessage({ id: 'message.failed' }));
    } finally {
      setEditLoading(false);
    }
  };

  /**
   * 删除位置
   */
  const handleDelete = async (record: Location) => {
    if (!currentBase) return;

    try {
      const response = await fetch(
        `/api/v1/bases/${currentBase.id}/locations/${record.id}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );

      const result = await response.json();

      if (result.success) {
        message.success(intl.formatMessage({ id: 'message.success' }));
        actionRef.current?.reload();
      } else {
        message.error(result.message || intl.formatMessage({ id: 'message.failed' }));
      }
    } catch (error) {
      console.error('Failed to delete location:', error);
      message.error(intl.formatMessage({ id: 'message.failed' }));
    }
  };

  /**
   * 打开编辑模态框
   */
  const handleEdit = (record: Location) => {
    setEditingLocation(record);
    editForm.setFieldsValue({
      name: record.name,
      type: record.type,
      description: record.description,
      address: record.address,
      contactPerson: record.contactPerson,
      contactPhone: record.contactPhone,
      isActive: record.isActive,
    });
    setEditModalVisible(true);
  };

  /**
   * 列定义
   */
  const columns: ProColumns<Location>[] = [
    {
      title: intl.formatMessage({ id: 'subDistricts.column.code' }),
      dataIndex: 'code',
      key: 'code',
      width: 180,
      fixed: 'left',
      copyable: true,
      ellipsis: true,
      hideInSetting: true,
    },
    {
      title: intl.formatMessage({ id: 'subDistricts.column.name' }),
      dataIndex: 'name',
      key: 'name',
      width: 150,
      fixed: 'left',
      ellipsis: true,
      hideInSetting: true,
      hideInSearch: false,
    },
    {
      title: intl.formatMessage({ id: 'locations.column.type' }),
      dataIndex: 'type',
      key: 'type',
      width: 100,
      valueType: 'select',
      valueEnum: {
        MAIN_WAREHOUSE: { text: intl.formatMessage({ id: 'locations.type.mainWarehouse' }), status: 'Warning' },
        WAREHOUSE: { text: intl.formatMessage({ id: 'locations.type.warehouse' }), status: 'Default' },
      },
      render: (_, record) => {
        const typeConfig = {
          [LocationType.MAIN_WAREHOUSE]: { icon: <DatabaseOutlined />, color: 'orange', text: intl.formatMessage({ id: 'locations.type.mainWarehouse' }) },
          [LocationType.WAREHOUSE]: { icon: <DatabaseOutlined />, color: 'blue', text: intl.formatMessage({ id: 'locations.type.warehouse' }) },
        };
        const config = typeConfig[record.type] || typeConfig[LocationType.WAREHOUSE];
        return (
          <Tag icon={config.icon} color={config.color}>
            {config.text}
          </Tag>
        );
      },
      hideInSearch: false,
    },
    {
      title: intl.formatMessage({ id: 'table.column.description' }),
      dataIndex: 'description',
      key: 'description',
      width: 200,
      ellipsis: true,
      hideInTable: false,
      hideInSearch: true,
      render: (text: any) => text || '-',
    },
    {
      title: intl.formatMessage({ id: 'locations.column.address' }),
      dataIndex: 'address',
      key: 'address',
      width: 200,
      ellipsis: true,
      hideInTable: false,
      hideInSearch: true,
      render: (text: any) => text || '-',
    },
    {
      title: intl.formatMessage({ id: 'locations.column.contact' }),
      dataIndex: 'contactPerson',
      key: 'contactPerson',
      width: 100,
      hideInSearch: true,
      render: (text: any) => text || '-',
    },
    {
      title: intl.formatMessage({ id: 'locations.column.phone' }),
      dataIndex: 'contactPhone',
      key: 'contactPhone',
      width: 130,
      hideInSearch: true,
      render: (text: any) => text || '-',
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
        const isActiveValue = record.isActive === true;
        return (
          <Tag color={isActiveValue ? 'green' : 'red'}>
            {isActiveValue ? intl.formatMessage({ id: 'status.enabled' }) : intl.formatMessage({ id: 'status.disabled' })}
          </Tag>
        );
      },
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
      title: intl.formatMessage({ id: 'table.column.operation' }),
      key: 'action',
      width: 150,
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
          {intl.formatMessage({ id: 'button.edit' })}
        </Button>,
        <Popconfirm
          key="delete"
          title={intl.formatMessage({ id: 'message.deleteConfirm' })}
          description={intl.formatMessage({ id: 'message.deleteConfirmContent' })}
          onConfirm={() => handleDelete(record)}
          okText={intl.formatMessage({ id: 'button.confirm' })}
          cancelText={intl.formatMessage({ id: 'button.cancel' })}
          icon={<ExclamationCircleOutlined style={{ color: 'red' }} />}
        >
          <Button type="link" size="small" danger icon={<DeleteOutlined />}>
            {intl.formatMessage({ id: 'button.delete' })}
          </Button>
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
        <Descriptions.Item label={intl.formatMessage({ id: 'subDistricts.stats.total' })}>
          <Space>
            <DatabaseOutlined />
            <span style={{ fontWeight: 'bold', fontSize: 16 }}>{stats.totalLocations}</span>
          </Space>
        </Descriptions.Item>
        <Descriptions.Item label={intl.formatMessage({ id: 'locations.type.mainWarehouse' })}>
          <Space>
            <DatabaseOutlined style={{ color: '#fa8c16' }} />
            <span style={{ color: '#fa8c16', fontWeight: 'bold' }}>{stats.mainWarehouses}</span>
          </Space>
        </Descriptions.Item>
        <Descriptions.Item label={intl.formatMessage({ id: 'locations.type.warehouse' })}>
          <Space>
            <DatabaseOutlined style={{ color: '#1890ff' }} />
            <span style={{ color: '#1890ff', fontWeight: 'bold' }}>{stats.warehouses}</span>
          </Space>
        </Descriptions.Item>
        <Descriptions.Item label={intl.formatMessage({ id: 'subDistricts.stats.active' })}>
          <Space>
            <span style={{ color: '#52c41a', fontWeight: 'bold' }}>{stats.activeLocations}</span>
          </Space>
        </Descriptions.Item>
      </Descriptions>
    </div>
  );

  return (
    <PageContainer header={{ title: false }}>
      {/* 没有总仓库的警告提示 */}
      {!hasMainWarehouse && stats.totalLocations > 0 && (
        <Alert
          message={intl.formatMessage({ id: 'subDistricts.alert.noMainWarehouse' })}
          description={intl.formatMessage({ id: 'subDistricts.alert.noMainWarehouseDesc' })}
          type="warning"
          showIcon
          icon={<WarningOutlined />}
          style={{ marginBottom: 16 }}
        />
      )}

      {/* 没有总仓库的弹窗提示 */}
      <Modal
        title={
          <Space>
            <WarningOutlined style={{ color: '#faad14' }} />
            <span>{intl.formatMessage({ id: 'subDistricts.alert.noMainWarehouse' })}</span>
          </Space>
        }
        open={noMainWarehouseModalVisible}
        onOk={() => setNoMainWarehouseModalVisible(false)}
        onCancel={() => setNoMainWarehouseModalVisible(false)}
        okText={intl.formatMessage({ id: 'button.confirm' })}
        cancelButtonProps={{ style: { display: 'none' } }}
      >
        <p>{intl.formatMessage({ id: 'subDistricts.modal.noMainWarehouseP1' })}</p>
        <p>{intl.formatMessage({ id: 'subDistricts.modal.noMainWarehouseP2' })}</p>
        <p>{intl.formatMessage({ id: 'subDistricts.modal.noMainWarehouseP3' })}</p>
      </Modal>

      {/* ProTable */}
      <ProTable<Location>
        columns={columns}
        actionRef={actionRef}
        request={fetchLocationData}
        rowKey="id"
        columnsState={{
          persistenceKey: 'sub-districts-table-columns',
          persistenceType: 'localStorage',
          defaultValue: {
            description: { show: false },
            address: { show: false },
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
        scroll={{ x: 1300 }}
        pagination={{
          defaultPageSize: 30,
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
            {intl.formatMessage({ id: 'subDistricts.add' })}
          </Button>,
        ]}
        dateFormatter="string"
        headerTitle={
          <Space>
            <span>{intl.formatMessage({ id: 'list.title.subDistricts' })}</span>
            <span style={{ color: '#999', fontSize: 14, fontWeight: 'normal' }}>
              ({intl.formatMessage({ id: 'stats.count' }, { count: stats.totalLocations })})
            </span>
            <Popover content={statsContent} title={intl.formatMessage({ id: 'stats.title' })} trigger="click" placement="bottomLeft">
              <Button type="text" size="small" icon={<InfoCircleOutlined />} style={{ color: '#1890ff' }}>
                {intl.formatMessage({ id: 'stats.detail' })}
              </Button>
            </Popover>
          </Space>
        }
      />

      {/* 创建仓库模态框 - 只能选择仓库类型 */}
      <Modal
        title={intl.formatMessage({ id: 'subDistricts.add' })}
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
            label={intl.formatMessage({ id: 'subDistricts.column.name' })}
            name="name"
            rules={[{ required: true, message: intl.formatMessage({ id: 'subDistricts.form.nameRequired' }) }]}
          >
            <Input placeholder={intl.formatMessage({ id: 'subDistricts.form.namePlaceholder' })} />
          </Form.Item>

          <Form.Item
            label={intl.formatMessage({ id: 'locations.column.type' })}
            name="type"
            rules={[{ required: true, message: intl.formatMessage({ id: 'subDistricts.form.typeRequired' }) }]}
            extra={!hasMainWarehouse ? intl.formatMessage({ id: 'subDistricts.form.noMainWarehouseHint' }) : intl.formatMessage({ id: 'subDistricts.form.hasMainWarehouseHint' })}
          >
            <Select placeholder={intl.formatMessage({ id: 'subDistricts.form.typePlaceholder' })}>
              <Option value={LocationType.MAIN_WAREHOUSE} disabled={hasMainWarehouse}>
                {intl.formatMessage({ id: 'locations.type.mainWarehouse' })} {hasMainWarehouse ? `(${intl.formatMessage({ id: 'subDistricts.form.exists' })})` : ''}
              </Option>
              <Option value={LocationType.WAREHOUSE} disabled={!hasMainWarehouse}>
                {intl.formatMessage({ id: 'locations.type.warehouse' })} {!hasMainWarehouse ? `(${intl.formatMessage({ id: 'subDistricts.form.needMainFirst' })})` : ''}
              </Option>
            </Select>
          </Form.Item>

          <Form.Item label={intl.formatMessage({ id: 'form.label.description' })} name="description">
            <TextArea rows={3} placeholder={intl.formatMessage({ id: 'form.placeholder.input' })} />
          </Form.Item>

          <Form.Item label={intl.formatMessage({ id: 'form.label.address' })} name="address">
            <Input placeholder={intl.formatMessage({ id: 'form.placeholder.input' })} />
          </Form.Item>

          <Form.Item label={intl.formatMessage({ id: 'form.label.contactPerson' })} name="contactPerson">
            <Input placeholder={intl.formatMessage({ id: 'form.placeholder.contactPerson' })} />
          </Form.Item>

          <Form.Item label={intl.formatMessage({ id: 'form.label.contactPhone' })} name="contactPhone">
            <Input placeholder={intl.formatMessage({ id: 'form.placeholder.contactPhone' })} />
          </Form.Item>

          <Form.Item label={intl.formatMessage({ id: 'form.label.status' })} name="isActive" initialValue={true}>
            <Select>
              <Option value={true}>{intl.formatMessage({ id: 'status.enabled' })}</Option>
              <Option value={false}>{intl.formatMessage({ id: 'status.disabled' })}</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* 编辑仓库模态框 */}
      <Modal
        title={intl.formatMessage({ id: 'subDistricts.edit' })}
        open={editModalVisible}
        onOk={() => editForm.submit()}
        onCancel={() => {
          setEditModalVisible(false);
          editForm.resetFields();
          setEditingLocation(null);
        }}
        confirmLoading={editLoading}
        width={600}
      >
        <Form form={editForm} layout="vertical" onFinish={handleUpdate}>
          <Form.Item
            label={intl.formatMessage({ id: 'subDistricts.column.name' })}
            name="name"
            rules={[{ required: true, message: intl.formatMessage({ id: 'subDistricts.form.nameRequired' }) }]}
          >
            <Input placeholder={intl.formatMessage({ id: 'subDistricts.form.namePlaceholder' })} />
          </Form.Item>

          <Form.Item
            label={intl.formatMessage({ id: 'locations.column.type' })}
            name="type"
            rules={[{ required: true, message: intl.formatMessage({ id: 'subDistricts.form.typeRequired' }) }]}
          >
            <Select placeholder={intl.formatMessage({ id: 'subDistricts.form.typePlaceholder' })}>
              <Option 
                value={LocationType.MAIN_WAREHOUSE} 
                disabled={hasMainWarehouse && editingLocation?.type !== LocationType.MAIN_WAREHOUSE}
              >
                {intl.formatMessage({ id: 'locations.type.mainWarehouse' })} {hasMainWarehouse && editingLocation?.type !== LocationType.MAIN_WAREHOUSE ? `(${intl.formatMessage({ id: 'subDistricts.form.exists' })})` : ''}
              </Option>
              <Option value={LocationType.WAREHOUSE}>{intl.formatMessage({ id: 'locations.type.warehouse' })}</Option>
            </Select>
          </Form.Item>

          <Form.Item label={intl.formatMessage({ id: 'form.label.description' })} name="description">
            <TextArea rows={3} placeholder={intl.formatMessage({ id: 'form.placeholder.input' })} />
          </Form.Item>

          <Form.Item label={intl.formatMessage({ id: 'form.label.address' })} name="address">
            <Input placeholder={intl.formatMessage({ id: 'form.placeholder.input' })} />
          </Form.Item>

          <Form.Item label={intl.formatMessage({ id: 'form.label.contactPerson' })} name="contactPerson">
            <Input placeholder={intl.formatMessage({ id: 'form.placeholder.contactPerson' })} />
          </Form.Item>

          <Form.Item label={intl.formatMessage({ id: 'form.label.contactPhone' })} name="contactPhone">
            <Input placeholder={intl.formatMessage({ id: 'form.placeholder.contactPhone' })} />
          </Form.Item>

          <Form.Item label={intl.formatMessage({ id: 'form.label.status' })} name="isActive">
            <Select>
              <Option value={true}>{intl.formatMessage({ id: 'status.enabled' })}</Option>
              <Option value={false}>{intl.formatMessage({ id: 'status.disabled' })}</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
};

export default SubDistrictsPage;
