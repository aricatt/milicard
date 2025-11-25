import React, { useRef, useState } from 'react';
import { 
  Card, 
  Space, 
  Tag, 
  Statistic, 
  Row, 
  Col, 
  Modal,
  Form,
  Input,
  Select,
  App,
  Button,
  Popconfirm
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined,
  DeleteOutlined,
  DatabaseOutlined,
  DesktopOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import { ProTable, PageContainer } from '@ant-design/pro-components';
import type { ProColumns, ActionType } from '@ant-design/pro-components';
import { useBase } from '@/contexts/BaseContext';
import styles from './index.less';

const { TextArea } = Input;
const { Option } = Select;

// 位置类型枚举
enum LocationType {
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
    const newStats: LocationStats = {
      totalLocations: data.length,
      warehouses: data.filter(item => item.type === LocationType.WAREHOUSE).length,
      liveRooms: data.filter(item => item.type === LocationType.LIVE_ROOM).length,
      activeLocations: data.filter(item => item.isActive).length,
    };
    setStats(newStats);
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
        WAREHOUSE: { text: '仓库', status: 'Default' },
        LIVE_ROOM: { text: '直播间', status: 'Processing' },
      },
      render: (_, record) => (
        <Tag 
          icon={record.type === LocationType.WAREHOUSE ? <DatabaseOutlined /> : <DesktopOutlined />}
          color={record.type === LocationType.WAREHOUSE ? 'blue' : 'green'}
        >
          {record.type === LocationType.WAREHOUSE ? '仓库' : '直播间'}
        </Tag>
      ),
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
      width: 150,
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
          编辑
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
            删除
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

  return (
    <PageContainer
      header={{
        title: '直播间/仓库管理',
        subTitle: `当前基地：${currentBase.name}`,
      }}
    >
      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="总位置数"
              value={stats.totalLocations}
              prefix={<DatabaseOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="仓库"
              value={stats.warehouses}
              prefix={<DatabaseOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="直播间"
              value={stats.liveRooms}
              prefix={<DesktopOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="启用中"
              value={stats.activeLocations}
              prefix={<DatabaseOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>

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
        headerTitle="位置列表"
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
          >
            <Select placeholder="请选择位置类型">
              <Option value={LocationType.WAREHOUSE}>仓库</Option>
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
          >
            <Select placeholder="请选择位置类型">
              <Option value={LocationType.WAREHOUSE}>仓库</Option>
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
