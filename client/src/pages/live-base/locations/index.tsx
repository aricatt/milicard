import React, { useRef, useState, useEffect } from 'react';
import { 
  Card, 
  Space, 
  Tag, 
  Statistic, 
  Modal,
  Form,
  Input,
  Select,
  App,
  Button,
  Popconfirm,
  Popover,
  Descriptions,
  Alert,
  Tooltip,
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined,
  DeleteOutlined,
  DatabaseOutlined,
  DesktopOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
  WarningOutlined,
  ImportOutlined,
  ExportOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import { ProTable, PageContainer } from '@ant-design/pro-components';
import type { ProColumns, ActionType } from '@ant-design/pro-components';
import { useBase } from '@/contexts/BaseContext';
import { useIntl } from '@umijs/max';
import ImportModal from '@/components/ImportModal';
import { useLocationExcel } from './useLocationExcel';
import styles from './index.less';

const { TextArea } = Input;
const { Option } = Select;

// 位置类型枚举
enum LocationType {
  MAIN_WAREHOUSE = 'MAIN_WAREHOUSE',
  WAREHOUSE = 'WAREHOUSE',
  LIVE_ROOM = 'LIVE_ROOM',
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
  liveRooms: number;
  activeLocations: number;
}

/**
 * 直播间/仓库管理页面 - ProTable 版本
 * 基地中心化的位置管理，统一管理直播间和仓库
 */
const LocationManagement: React.FC = () => {
  const { currentBase } = useBase();
  const { message } = App.useApp();
  const intl = useIntl();
  const actionRef = useRef<ActionType>();
  
  // 状态管理
  const [stats, setStats] = useState<LocationStats>({
    totalLocations: 0,
    mainWarehouses: 0,
    warehouses: 0,
    liveRooms: 0,
    activeLocations: 0,
  });
  
  // 模态框状态
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [createLoading, setCreateLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  
  // 总仓库检测状态
  const [hasMainWarehouse, setHasMainWarehouse] = useState(true); // 默认true避免初始闪烁
  const [noMainWarehouseModalVisible, setNoMainWarehouseModalVisible] = useState(false);
  const [hasCheckedMainWarehouse, setHasCheckedMainWarehouse] = useState(false);
  
  // 表单实例
  const [createForm] = Form.useForm();
  const [editForm] = Form.useForm();

  // Excel 导入导出
  const {
    importModalVisible,
    setImportModalVisible,
    importLoading,
    importProgress,
    handleExport,
    handleImport,
    handleDownloadTemplate,
  } = useLocationExcel(currentBase?.id, () => {
    actionRef.current?.reload();
  });

  /**
   * 获取位置数据
   */
  const fetchLocationData = async (params: any) => {
    if (!currentBase) {
      return {
        data: [],
        success: true,
        total: 0,
      };
    }

    try {
      const { current = 1, pageSize = 30, name, type, isActive } = params;
      
      // 构建查询参数
      const queryParams = new URLSearchParams({
        current: String(current),
        pageSize: String(pageSize),
      });
      
      if (name) queryParams.append('name', name);
      if (type) queryParams.append('type', type);
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
        // 计算统计数据
        calculateStats(result.data || []);
        
        return {
          data: result.data || [],
          success: true,
          total: result.total || 0,
        };
      } else {
        message.error(result.message || '获取位置数据失败');
        return {
          data: [],
          success: false,
          total: 0,
        };
      }
    } catch (error) {
      console.error('获取位置数据失败:', error);
      message.error('获取位置数据失败');
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
  const calculateStats = (data: Location[]) => {
    const mainWarehouseCount = data.filter(item => item.type === LocationType.MAIN_WAREHOUSE).length;
    const newStats: LocationStats = {
      totalLocations: data.length,
      mainWarehouses: mainWarehouseCount,
      warehouses: data.filter(item => item.type === LocationType.WAREHOUSE).length,
      liveRooms: data.filter(item => item.type === LocationType.LIVE_ROOM).length,
      activeLocations: data.filter(item => item.isActive).length,
    };
    setStats(newStats);
    
    // 检测是否有总仓库
    const hasMain = mainWarehouseCount > 0;
    setHasMainWarehouse(hasMain);
    
    // 首次加载且没有总仓库时弹窗提示
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
      message.error('请先选择基地');
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
        message.success('创建成功');
        setCreateModalVisible(false);
        createForm.resetFields();
        actionRef.current?.reload();
      } else {
        message.error(result.message || '创建失败');
      }
    } catch (error) {
      console.error('创建位置失败:', error);
      message.error('创建位置失败');
    } finally {
      setCreateLoading(false);
    }
  };

  /**
   * 更新位置
   */
  const handleUpdate = async (values: any) => {
    if (!currentBase || !editingLocation) {
      return;
    }

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
        message.success('更新成功');
        setEditModalVisible(false);
        editForm.resetFields();
        setEditingLocation(null);
        actionRef.current?.reload();
      } else {
        message.error(result.message || '更新失败');
      }
    } catch (error) {
      console.error('更新位置失败:', error);
      message.error('更新位置失败');
    } finally {
      setEditLoading(false);
    }
  };

  /**
   * 删除位置
   */
  const handleDelete = async (record: Location) => {
    if (!currentBase) {
      return;
    }

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
        message.success('删除成功');
        actionRef.current?.reload();
      } else {
        message.error(result.message || '删除失败');
      }
    } catch (error) {
      console.error('删除位置失败:', error);
      message.error('删除位置失败');
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
      title: intl.formatMessage({ id: 'locations.column.code' }),
      dataIndex: 'code',
      key: 'code',
      width: 180,
      fixed: 'left',
      copyable: true,
      ellipsis: true,
      hideInSetting: true,
    },
    {
      title: intl.formatMessage({ id: 'locations.column.name' }),
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
        LIVE_ROOM: { text: intl.formatMessage({ id: 'locations.type.liveRoom' }), status: 'Processing' },
      },
      render: (_, record) => {
        const typeConfig = {
          [LocationType.MAIN_WAREHOUSE]: { icon: <DatabaseOutlined />, color: 'orange', text: intl.formatMessage({ id: 'locations.type.mainWarehouse' }) },
          [LocationType.WAREHOUSE]: { icon: <DatabaseOutlined />, color: 'blue', text: intl.formatMessage({ id: 'locations.type.warehouse' }) },
          [LocationType.LIVE_ROOM]: { icon: <DesktopOutlined />, color: 'green', text: intl.formatMessage({ id: 'locations.type.liveRoom' }) },
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
        const isActiveValue = record.isActive === true || record.isActive === 'true' || record.isActive === 1;
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
      title: intl.formatMessage({ id: 'table.column.updatedAt' }),
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 170,
      valueType: 'dateTime',
      hideInSearch: true,
      // 默认隐藏
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
      // 不可隐藏
      hideInSetting: true,
      render: (_, record) => [
        <Tooltip key="edit" title="编辑">
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          />
        </Tooltip>,
        <Popconfirm
          key="delete"
          title={intl.formatMessage({ id: 'locations.confirm.delete' })}
          description={intl.formatMessage({ id: 'locations.confirm.deleteContent' }, { name: record.name })}
          onConfirm={() => handleDelete(record)}
          okText={intl.formatMessage({ id: 'button.confirm' })}
          cancelText={intl.formatMessage({ id: 'button.cancel' })}
          icon={<ExclamationCircleOutlined style={{ color: 'red' }} />}
        >
          <Tooltip title="删除">
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
        <Descriptions.Item label={intl.formatMessage({ id: 'locations.stats.total' })}>
          <Space>
            <DatabaseOutlined />
            <span style={{ fontWeight: 'bold', fontSize: 16 }}>{stats.totalLocations}</span>
          </Space>
        </Descriptions.Item>
        <Descriptions.Item label={intl.formatMessage({ id: 'locations.stats.mainWarehouse' })}>
          <Space>
            <DatabaseOutlined style={{ color: '#fa8c16' }} />
            <span style={{ color: '#fa8c16', fontWeight: 'bold' }}>{stats.mainWarehouses}</span>
            <span style={{ color: '#999' }}>({stats.totalLocations > 0 ? ((stats.mainWarehouses / stats.totalLocations) * 100).toFixed(1) : 0}%)</span>
          </Space>
        </Descriptions.Item>
        <Descriptions.Item label={intl.formatMessage({ id: 'locations.stats.warehouse' })}>
          <Space>
            <DatabaseOutlined style={{ color: '#1890ff' }} />
            <span style={{ color: '#1890ff', fontWeight: 'bold' }}>{stats.warehouses}</span>
            <span style={{ color: '#999' }}>({stats.totalLocations > 0 ? ((stats.warehouses / stats.totalLocations) * 100).toFixed(1) : 0}%)</span>
          </Space>
        </Descriptions.Item>
        <Descriptions.Item label={intl.formatMessage({ id: 'locations.stats.liveRoom' })}>
          <Space>
            <DesktopOutlined style={{ color: '#52c41a' }} />
            <span style={{ color: '#52c41a', fontWeight: 'bold' }}>{stats.liveRooms}</span>
            <span style={{ color: '#999' }}>({stats.totalLocations > 0 ? ((stats.liveRooms / stats.totalLocations) * 100).toFixed(1) : 0}%)</span>
          </Space>
        </Descriptions.Item>
        <Descriptions.Item label={intl.formatMessage({ id: 'locations.stats.active' })}>
          <Space>
            <span style={{ color: '#52c41a', fontWeight: 'bold' }}>{stats.activeLocations}</span>
            <span style={{ color: '#999' }}>({stats.totalLocations > 0 ? ((stats.activeLocations / stats.totalLocations) * 100).toFixed(1) : 0}%)</span>
          </Space>
        </Descriptions.Item>
        <Descriptions.Item label={intl.formatMessage({ id: 'locations.stats.inactive' })}>
          <Space>
            <span style={{ color: '#ff4d4f', fontWeight: 'bold' }}>{stats.totalLocations - stats.activeLocations}</span>
            <span style={{ color: '#999' }}>({stats.totalLocations > 0 ? (((stats.totalLocations - stats.activeLocations) / stats.totalLocations) * 100).toFixed(1) : 0}%)</span>
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
          message={intl.formatMessage({ id: 'locations.alert.noMainWarehouse' })}
          description={intl.formatMessage({ id: 'locations.alert.noMainWarehouseDesc' })}
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
            <span>{intl.formatMessage({ id: 'locations.alert.noMainWarehouse' })}</span>
          </Space>
        }
        open={noMainWarehouseModalVisible}
        onOk={() => setNoMainWarehouseModalVisible(false)}
        onCancel={() => setNoMainWarehouseModalVisible(false)}
        okText={intl.formatMessage({ id: 'locations.modal.iKnow' })}
        cancelButtonProps={{ style: { display: 'none' } }}
      >
        <p>{intl.formatMessage({ id: 'locations.modal.noMainWarehouseP1' })}</p>
        <p>{intl.formatMessage({ id: 'locations.modal.noMainWarehouseP2' })}</p>
        <p>{intl.formatMessage({ id: 'locations.modal.noMainWarehouseP3' })}</p>
      </Modal>

      {/* ProTable */}
      <ProTable<Location>
        columns={columns}
        actionRef={actionRef}
        request={fetchLocationData}
        rowKey="id"
        
        // 列状态配置 - 持久化到 localStorage
        columnsState={{
          persistenceKey: 'location-table-columns',
          persistenceType: 'localStorage',
          defaultValue: {
            // 默认隐藏的列
            description: { show: false },
            address: { show: false },
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
        scroll={{ x: 1500 }}
        pagination={{
          defaultPageSize: 30,
          showSizeChanger: true,
          showQuickJumper: true,
          pageSizeOptions: ['10', '20', '30', '50', '100'],
        }}
        
        // 工具栏按钮
        toolBarRender={() => [
          <Button
            key="download"
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
            {intl.formatMessage({ id: 'locations.add' })}
          </Button>,
        ]}
        
        // 表格属性
        dateFormatter="string"
        headerTitle={
          <Space>
            <span>{intl.formatMessage({ id: 'list.title.locations' })}</span>
            <span style={{ color: '#999', fontSize: 14, fontWeight: 'normal' }}>
              ({intl.formatMessage({ id: 'stats.count' }, { count: stats.totalLocations })})
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

      {/* 创建位置模态框 */}
      <Modal
        title={intl.formatMessage({ id: 'locations.add' })}
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
            label={intl.formatMessage({ id: 'locations.form.name' })}
            name="name"
            rules={[{ required: true, message: intl.formatMessage({ id: 'locations.form.nameRequired' }) }]}
          >
            <Input placeholder={intl.formatMessage({ id: 'locations.form.namePlaceholder' })} />
          </Form.Item>

          <Form.Item
            label={intl.formatMessage({ id: 'locations.form.type' })}
            name="type"
            rules={[{ required: true, message: intl.formatMessage({ id: 'locations.form.typeRequired' }) }]}
            extra={!hasMainWarehouse ? intl.formatMessage({ id: 'locations.form.typeHintNoMain' }) : intl.formatMessage({ id: 'locations.form.typeHintHasMain' })}
          >
            <Select placeholder={intl.formatMessage({ id: 'locations.form.typePlaceholder' })}>
              <Option value={LocationType.MAIN_WAREHOUSE} disabled={hasMainWarehouse}>
                {intl.formatMessage({ id: 'locations.form.mainWarehouse' })} {hasMainWarehouse ? intl.formatMessage({ id: 'locations.form.mainWarehouseExists' }) : ''}
              </Option>
              <Option value={LocationType.WAREHOUSE} disabled={!hasMainWarehouse}>
                {intl.formatMessage({ id: 'locations.form.warehouse' })} {!hasMainWarehouse ? intl.formatMessage({ id: 'locations.form.warehouseNeedMain' }) : ''}
              </Option>
              <Option value={LocationType.LIVE_ROOM} disabled={!hasMainWarehouse}>
                {intl.formatMessage({ id: 'locations.form.liveRoom' })} {!hasMainWarehouse ? intl.formatMessage({ id: 'locations.form.warehouseNeedMain' }) : ''}
              </Option>
            </Select>
          </Form.Item>

          <Form.Item
            label={intl.formatMessage({ id: 'locations.form.description' })}
            name="description"
          >
            <TextArea rows={3} placeholder={intl.formatMessage({ id: 'locations.form.descriptionPlaceholder' })} />
          </Form.Item>

          <Form.Item
            label={intl.formatMessage({ id: 'locations.form.address' })}
            name="address"
          >
            <Input placeholder={intl.formatMessage({ id: 'locations.form.addressPlaceholder' })} />
          </Form.Item>

          <Form.Item
            label={intl.formatMessage({ id: 'locations.form.contactPerson' })}
            name="contactPerson"
          >
            <Input placeholder={intl.formatMessage({ id: 'locations.form.contactPersonPlaceholder' })} />
          </Form.Item>

          <Form.Item
            label={intl.formatMessage({ id: 'locations.form.contactPhone' })}
            name="contactPhone"
          >
            <Input placeholder={intl.formatMessage({ id: 'locations.form.contactPhonePlaceholder' })} />
          </Form.Item>

          <Form.Item
            label={intl.formatMessage({ id: 'locations.form.status' })}
            name="isActive"
            initialValue={true}
          >
            <Select>
              <Option value={true}>{intl.formatMessage({ id: 'status.enabled' })}</Option>
              <Option value={false}>{intl.formatMessage({ id: 'status.disabled' })}</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* 编辑位置模态框 */}
      <Modal
        title={intl.formatMessage({ id: 'locations.edit' })}
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
        <Form
          form={editForm}
          layout="vertical"
          onFinish={handleUpdate}
        >
          <Form.Item
            label={intl.formatMessage({ id: 'locations.form.name' })}
            name="name"
            rules={[{ required: true, message: intl.formatMessage({ id: 'locations.form.nameRequired' }) }]}
          >
            <Input placeholder={intl.formatMessage({ id: 'locations.form.namePlaceholder' })} />
          </Form.Item>

          <Form.Item
            label={intl.formatMessage({ id: 'locations.form.type' })}
            name="type"
            rules={[{ required: true, message: intl.formatMessage({ id: 'locations.form.typeRequired' }) }]}
            extra={
              editingLocation?.type === LocationType.MAIN_WAREHOUSE
                ? intl.formatMessage({ id: 'locations.form.typeEditHintIsMain' })
                : (!hasMainWarehouse ? intl.formatMessage({ id: 'locations.form.typeEditHintNoMain' }) : '')
            }
          >
            <Select placeholder={intl.formatMessage({ id: 'locations.form.typePlaceholder' })}>
              {/* 总仓库选项：如果当前编辑的就是总仓库，或者还没有总仓库，则可选 */}
              <Option 
                value={LocationType.MAIN_WAREHOUSE} 
                disabled={hasMainWarehouse && editingLocation?.type !== LocationType.MAIN_WAREHOUSE}
              >
                {intl.formatMessage({ id: 'locations.form.mainWarehouse' })} {hasMainWarehouse && editingLocation?.type !== LocationType.MAIN_WAREHOUSE ? intl.formatMessage({ id: 'locations.form.mainWarehouseExists' }) : ''}
              </Option>
              <Option value={LocationType.WAREHOUSE}>{intl.formatMessage({ id: 'locations.form.warehouse' })}</Option>
              <Option value={LocationType.LIVE_ROOM}>{intl.formatMessage({ id: 'locations.form.liveRoom' })}</Option>
            </Select>
          </Form.Item>

          <Form.Item
            label={intl.formatMessage({ id: 'locations.form.description' })}
            name="description"
          >
            <TextArea rows={3} placeholder={intl.formatMessage({ id: 'locations.form.descriptionPlaceholder' })} />
          </Form.Item>

          <Form.Item
            label={intl.formatMessage({ id: 'locations.form.address' })}
            name="address"
          >
            <Input placeholder={intl.formatMessage({ id: 'locations.form.addressPlaceholder' })} />
          </Form.Item>

          <Form.Item
            label={intl.formatMessage({ id: 'locations.form.contactPerson' })}
            name="contactPerson"
          >
            <Input placeholder={intl.formatMessage({ id: 'locations.form.contactPersonPlaceholder' })} />
          </Form.Item>

          <Form.Item
            label={intl.formatMessage({ id: 'locations.form.contactPhone' })}
            name="contactPhone"
          >
            <Input placeholder={intl.formatMessage({ id: 'locations.form.contactPhonePlaceholder' })} />
          </Form.Item>

          <Form.Item
            label={intl.formatMessage({ id: 'locations.form.status' })}
            name="isActive"
          >
            <Select>
              <Option value={true}>{intl.formatMessage({ id: 'status.enabled' })}</Option>
              <Option value={false}>{intl.formatMessage({ id: 'status.disabled' })}</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* 导入 Excel 模态框 */}
      <ImportModal
        open={importModalVisible}
        onCancel={() => setImportModalVisible(false)}
        onImport={handleImport}
        loading={importLoading}
        progress={importProgress}
        title="导入直播间/仓库"
        width={700}
        fields={[
          { field: '地点编号', required: false, description: '留空则系统自动生成', example: '' },
          { field: '地点名称', required: true, description: '地点名称（基地内唯一）', example: '总仓库' },
          { field: '地点类型', required: true, description: '总仓库/仓库/直播间', example: '总仓库' },
          { field: '联系人', required: false, description: '联系人姓名', example: '张三' },
          { field: '联系电话', required: false, description: '联系电话', example: '13800138000' },
          { field: '地址', required: false, description: '地点地址', example: '越南胡志明市第一郡' },
          { field: '备注', required: false, description: '备注信息', example: '' },
        ]}
      />
    </PageContainer>
  );
};

export default LocationManagement;
