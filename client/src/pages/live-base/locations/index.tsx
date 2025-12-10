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
  Alert
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined,
  DeleteOutlined,
  DatabaseOutlined,
  DesktopOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
  WarningOutlined
} from '@ant-design/icons';
import { ProTable, PageContainer } from '@ant-design/pro-components';
import type { ProColumns, ActionType } from '@ant-design/pro-components';
import { useBase } from '@/contexts/BaseContext';
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
      title: '位置编号',
      dataIndex: 'code',
      key: 'code',
      width: 180,
      fixed: 'left',
      copyable: true,
      ellipsis: true,
      // 不可隐藏
      hideInSetting: true,
    },
    {
      title: '位置名称',
      dataIndex: 'name',
      key: 'name',
      width: 150,
      fixed: 'left',
      ellipsis: true,
      // 不可隐藏
      hideInSetting: true,
      // 支持搜索
      hideInSearch: false,
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      valueType: 'select',
      valueEnum: {
        MAIN_WAREHOUSE: { text: '总仓库', status: 'Warning' },
        WAREHOUSE: { text: '子仓库', status: 'Default' },
        LIVE_ROOM: { text: '直播间', status: 'Processing' },
      },
      render: (_, record) => {
        const typeConfig = {
          [LocationType.MAIN_WAREHOUSE]: { icon: <DatabaseOutlined />, color: 'orange', text: '总仓库' },
          [LocationType.WAREHOUSE]: { icon: <DatabaseOutlined />, color: 'blue', text: '子仓库' },
          [LocationType.LIVE_ROOM]: { icon: <DesktopOutlined />, color: 'green', text: '直播间' },
        };
        const config = typeConfig[record.type] || typeConfig[LocationType.WAREHOUSE];
        return (
          <Tag icon={config.icon} color={config.color}>
            {config.text}
          </Tag>
        );
      },
      // 支持筛选
      hideInSearch: false,
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      width: 200,
      ellipsis: true,
      // 默认隐藏
      hideInTable: false,
      // 不在搜索表单中显示
      hideInSearch: true,
      render: (text: any) => text || '-',
    },
    {
      title: '地址',
      dataIndex: 'address',
      key: 'address',
      width: 200,
      ellipsis: true,
      // 默认隐藏
      hideInTable: false,
      hideInSearch: true,
      render: (text: any) => text || '-',
    },
    {
      title: '联系人',
      dataIndex: 'contactPerson',
      key: 'contactPerson',
      width: 100,
      hideInSearch: true,
      render: (text: any) => text || '-',
    },
    {
      title: '联系电话',
      dataIndex: 'contactPhone',
      key: 'contactPhone',
      width: 130,
      hideInSearch: true,
      render: (text: any) => text || '-',
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
        const isActiveValue = record.isActive === true || record.isActive === 'true' || record.isActive === 1;
        return (
          <Tag color={isActiveValue ? 'green' : 'red'}>
            {isActiveValue ? '启用' : '禁用'}
          </Tag>
        );
      },
      // 支持筛选
      hideInSearch: false,
    },
    {
      title: '创建时间',
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
      title: '更新时间',
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
      title: '操作',
      key: 'action',
      width: 80,
      fixed: 'right',
      valueType: 'option',
      // 不可隐藏
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
          description={`确定要删除位置"${record.name}"吗？`}
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
        <Card>
          <div style={{ textAlign: 'center', padding: '50px 0' }}>
            <p>请先选择一个基地</p>
          </div>
        </Card>
      </PageContainer>
    );
  }

  // 统计详情弹出内容
  const statsContent = (
    <div style={{ width: 300 }}>
      <Descriptions column={1} size="small" bordered>
        <Descriptions.Item label="总位置数">
          <Space>
            <DatabaseOutlined />
            <span style={{ fontWeight: 'bold', fontSize: 16 }}>{stats.totalLocations}</span>
          </Space>
        </Descriptions.Item>
        <Descriptions.Item label="总仓库">
          <Space>
            <DatabaseOutlined style={{ color: '#fa8c16' }} />
            <span style={{ color: '#fa8c16', fontWeight: 'bold' }}>{stats.mainWarehouses}</span>
            <span style={{ color: '#999' }}>({stats.totalLocations > 0 ? ((stats.mainWarehouses / stats.totalLocations) * 100).toFixed(1) : 0}%)</span>
          </Space>
        </Descriptions.Item>
        <Descriptions.Item label="子仓库">
          <Space>
            <DatabaseOutlined style={{ color: '#1890ff' }} />
            <span style={{ color: '#1890ff', fontWeight: 'bold' }}>{stats.warehouses}</span>
            <span style={{ color: '#999' }}>({stats.totalLocations > 0 ? ((stats.warehouses / stats.totalLocations) * 100).toFixed(1) : 0}%)</span>
          </Space>
        </Descriptions.Item>
        <Descriptions.Item label="直播间">
          <Space>
            <DesktopOutlined style={{ color: '#52c41a' }} />
            <span style={{ color: '#52c41a', fontWeight: 'bold' }}>{stats.liveRooms}</span>
            <span style={{ color: '#999' }}>({stats.totalLocations > 0 ? ((stats.liveRooms / stats.totalLocations) * 100).toFixed(1) : 0}%)</span>
          </Space>
        </Descriptions.Item>
        <Descriptions.Item label="启用中">
          <Space>
            <span style={{ color: '#52c41a', fontWeight: 'bold' }}>{stats.activeLocations}</span>
            <span style={{ color: '#999' }}>({stats.totalLocations > 0 ? ((stats.activeLocations / stats.totalLocations) * 100).toFixed(1) : 0}%)</span>
          </Space>
        </Descriptions.Item>
        <Descriptions.Item label="禁用">
          <Space>
            <span style={{ color: '#ff4d4f', fontWeight: 'bold' }}>{stats.totalLocations - stats.activeLocations}</span>
            <span style={{ color: '#999' }}>({stats.totalLocations > 0 ? (((stats.totalLocations - stats.activeLocations) / stats.totalLocations) * 100).toFixed(1) : 0}%)</span>
          </Space>
        </Descriptions.Item>
      </Descriptions>
    </div>
  );

  return (
    <PageContainer
      header={{
        title: '直播间/仓库管理',
      }}
    >
      {/* 没有总仓库的警告提示 */}
      {!hasMainWarehouse && stats.totalLocations > 0 && (
        <Alert
          message="缺少总仓库"
          description="当前基地尚未设置总仓库。请通过编辑现有位置，将其中一个设置为总仓库。每个基地必须有且只有一个总仓库。"
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
            <span>缺少总仓库</span>
          </Space>
        }
        open={noMainWarehouseModalVisible}
        onOk={() => setNoMainWarehouseModalVisible(false)}
        onCancel={() => setNoMainWarehouseModalVisible(false)}
        okText="我知道了"
        cancelButtonProps={{ style: { display: 'none' } }}
      >
        <p>当前基地尚未设置<strong>总仓库</strong>。</p>
        <p>每个基地必须有且只有一个总仓库，才能创建其他子仓库和直播间。</p>
        <p>请通过<strong>编辑</strong>现有位置，将其中一个设置为总仓库。</p>
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
            key="create"
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setCreateModalVisible(true)}
          >
            新建位置
          </Button>,
        ]}
        
        // 表格属性
        dateFormatter="string"
        headerTitle={
          <Space>
            <span>位置列表</span>
            <span style={{ color: '#999', fontSize: 14, fontWeight: 'normal' }}>
              (共 {stats.totalLocations} 个)
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

      {/* 创建位置模态框 */}
      <Modal
        title="创建位置"
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
            label="位置名称"
            name="name"
            rules={[{ required: true, message: '请输入位置名称' }]}
          >
            <Input placeholder="请输入位置名称" />
          </Form.Item>

          <Form.Item
            label="位置类型"
            name="type"
            rules={[{ required: true, message: '请选择位置类型' }]}
            extra={!hasMainWarehouse ? '当前基地没有总仓库，请先创建总仓库' : '已有总仓库，不能重复创建'}
          >
            <Select placeholder="请选择位置类型">
              <Option value={LocationType.MAIN_WAREHOUSE} disabled={hasMainWarehouse}>
                总仓库 {hasMainWarehouse ? '(已存在)' : ''}
              </Option>
              <Option value={LocationType.WAREHOUSE} disabled={!hasMainWarehouse}>
                子仓库 {!hasMainWarehouse ? '(需先创建总仓库)' : ''}
              </Option>
              <Option value={LocationType.LIVE_ROOM} disabled={!hasMainWarehouse}>
                直播间 {!hasMainWarehouse ? '(需先创建总仓库)' : ''}
              </Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="描述"
            name="description"
          >
            <TextArea rows={3} placeholder="请输入描述信息" />
          </Form.Item>

          <Form.Item
            label="地址"
            name="address"
          >
            <Input placeholder="请输入地址" />
          </Form.Item>

          <Form.Item
            label="联系人"
            name="contactPerson"
          >
            <Input placeholder="请输入联系人" />
          </Form.Item>

          <Form.Item
            label="联系电话"
            name="contactPhone"
          >
            <Input placeholder="请输入联系电话" />
          </Form.Item>

          <Form.Item
            label="状态"
            name="isActive"
            initialValue={true}
          >
            <Select>
              <Option value={true}>启用</Option>
              <Option value={false}>禁用</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* 编辑位置模态框 */}
      <Modal
        title="编辑位置"
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
            label="位置名称"
            name="name"
            rules={[{ required: true, message: '请输入位置名称' }]}
          >
            <Input placeholder="请输入位置名称" />
          </Form.Item>

          <Form.Item
            label="位置类型"
            name="type"
            rules={[{ required: true, message: '请选择位置类型' }]}
            extra={
              editingLocation?.type === LocationType.MAIN_WAREHOUSE
                ? '当前位置是总仓库，修改类型后将失去总仓库身份'
                : (!hasMainWarehouse ? '当前基地没有总仓库，可以将此位置设为总仓库' : '')
            }
          >
            <Select placeholder="请选择位置类型">
              {/* 总仓库选项：如果当前编辑的就是总仓库，或者还没有总仓库，则可选 */}
              <Option 
                value={LocationType.MAIN_WAREHOUSE} 
                disabled={hasMainWarehouse && editingLocation?.type !== LocationType.MAIN_WAREHOUSE}
              >
                总仓库 {hasMainWarehouse && editingLocation?.type !== LocationType.MAIN_WAREHOUSE ? '(已存在)' : ''}
              </Option>
              <Option value={LocationType.WAREHOUSE}>子仓库</Option>
              <Option value={LocationType.LIVE_ROOM}>直播间</Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="描述"
            name="description"
          >
            <TextArea rows={3} placeholder="请输入描述信息" />
          </Form.Item>

          <Form.Item
            label="地址"
            name="address"
          >
            <Input placeholder="请输入地址" />
          </Form.Item>

          <Form.Item
            label="联系人"
            name="contactPerson"
          >
            <Input placeholder="请输入联系人" />
          </Form.Item>

          <Form.Item
            label="联系电话"
            name="contactPhone"
          >
            <Input placeholder="请输入联系电话" />
          </Form.Item>

          <Form.Item
            label="状态"
            name="isActive"
          >
            <Select>
              <Option value={true}>启用</Option>
              <Option value={false}>禁用</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
};

export default LocationManagement;
