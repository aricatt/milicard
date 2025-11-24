import React, { useState, useEffect } from 'react';
import { 
  Table, 
  Card, 
  Button, 
  Space, 
  Tag, 
  Statistic, 
  Row, 
  Col, 
  Input, 
  Select, 
  Modal,
  Form,
  InputNumber,
  App,
  Image 
} from 'antd';
import { 
  PlusOutlined, 
  SearchOutlined, 
  ExportOutlined, 
  ReloadOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  EditOutlined,
  EyeOutlined,
  DeleteOutlined,
  ShoppingOutlined
} from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { useBase } from '@/contexts/BaseContext';
import type { ColumnsType } from 'antd/es/table';
import styles from './index.less';

const { Search } = Input;
const { Option } = Select;
const { TextArea } = Input;

// 基地商品数据类型定义
interface Product {
  id: string;
  code: string;                // 自动生成的商品编号 (GOODS-XXXXXXXXXXX)
  name: string;                // 商品名称 (必填)
  alias?: string;              // 商品别名
  manufacturer: string;        // 厂家名称 (必填)
  description?: string;        // 商品描述
  retailPrice: number;         // 零售价(一箱) (必填)
  packPrice?: number;          // 平拆价(一盒)
  purchasePrice?: number;      // 采购价
  boxQuantity: number;         // 箱装数量 (固定为1)
  packPerBox: number;          // 包/箱 (必填)
  piecePerPack: number;        // 件/包 (必填)
  imageUrl?: string;           // 图片URL
  notes?: string;              // 商品备注
  isActive: boolean;           // 是否启用
  createdAt: string;           // 创建时间
  updatedAt: string;           // 更新时间
}

// 基地商品统计数据类型
interface ProductStats {
  totalGoods: number;          // 总商品数
  activeGoods: number;         // 活跃商品数
  inactiveGoods: number;       // 非活跃商品数
  totalManufacturers: number;  // 厂家数量
}

/**
 * 基地商品管理页面
 * 
 * 重要特性：
 * - 基地级数据管理：所有商品数据都与当前选择的基地关联
 * - 数据隔离：不同基地之间的商品数据完全隔离
 * - 自动编号：商品编号由系统自动生成
 * - 厂家必填：厂家名称为必填字段
 * - 箱装固定：箱装数量固定为1，不可修改
 */
const ProductManagement: React.FC = () => {
  const { currentBase } = useBase();
  const { message } = App.useApp();
  
  // 状态管理
  const [loading, setLoading] = useState(false);
  const [productData, setProductData] = useState<Product[]>([]);
  const [stats, setStats] = useState<ProductStats>({
    totalGoods: 0,
    activeGoods: 0,
    inactiveGoods: 0,
    totalManufacturers: 0,
  });
  
  // 筛选条件
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [tableSize, setTableSize] = useState<'small' | 'middle' | 'large'>('small');
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 30,
    total: 0,
  });

  // 模态框状态
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [editingRecord, setEditingRecord] = useState<Product | null>(null);
  const [form] = Form.useForm();

  // 表格列定义
  const columns: ColumnsType<Product> = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 70,
      render: (text: string) => (
        <span style={{ fontSize: '12px', fontFamily: 'monospace' }}>
          {text.slice(0, 6)}...
        </span>
      ),
    },
    {
      title: '编号',
      dataIndex: 'code',
      key: 'code',
      width: 100,
      sorter: true,
      render: (text: string) => (
        <span style={{ fontSize: '12px', fontWeight: '500' }}>{text}</span>
      ),
    },
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      width: 120,
      sorter: true,
      ellipsis: {
        showTitle: true,
      },
      render: (text: string) => (
        <span style={{ fontSize: '13px', fontWeight: '500' }} title={text}>
          {text}
        </span>
      ),
    },
    {
      title: '别名',
      dataIndex: 'alias',
      key: 'alias',
      width: 80,
      ellipsis: {
        showTitle: true,
      },
      render: (text: string) => (
        <span style={{ fontSize: '12px', color: '#666' }} title={text}>
          {text || '-'}
        </span>
      ),
    },
    {
      title: '厂家',
      dataIndex: 'manufacturer',
      key: 'manufacturer',
      width: 90,
      ellipsis: {
        showTitle: true,
      },
      render: (text: string) => (
        <span style={{ fontSize: '12px', color: '#666' }} title={text}>
          {text || '-'}
        </span>
      ),
    },
    {
      title: '零售价',
      dataIndex: 'retailPrice',
      key: 'retailPrice',
      width: 90,
      sorter: true,
      render: (price: any) => (
        <span style={{ fontSize: '12px', fontWeight: '600', color: '#1890ff' }}>
          ¥{(typeof price === 'number' ? price : parseFloat(price || 0)).toFixed(2)}
        </span>
      ),
    },
    {
      title: '平拆价',
      dataIndex: 'packPrice',
      key: 'packPrice',
      width: 90,
      sorter: true,
      render: (price: any) => (
        <span style={{ fontSize: '12px', fontWeight: '600', color: '#52c41a' }}>
          ¥{(typeof price === 'number' ? price : parseFloat(price || 0)).toFixed(2)}
        </span>
      ),
    },
    {
      title: '箱数',
      dataIndex: 'boxQuantity',
      key: 'boxQuantity',
      width: 60,
      sorter: true,
      render: (value: number) => (
        <span style={{ fontSize: '12px', textAlign: 'center', display: 'block' }}>
          {value}
        </span>
      ),
    },
    {
      title: '盒/箱',
      dataIndex: 'packPerBox',
      key: 'packPerBox',
      width: 60,
      sorter: true,
      render: (value: number) => (
        <span style={{ fontSize: '12px', textAlign: 'center', display: 'block' }}>
          {value}
        </span>
      ),
    },
    {
      title: '包/盒',
      dataIndex: 'piecePerPack',
      key: 'piecePerPack',
      width: 60,
      sorter: true,
      render: (value: number) => (
        <span style={{ fontSize: '12px', textAlign: 'center', display: 'block' }}>
          {value}
        </span>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 110,
      sorter: true,
      render: (value: string) => (
        <span style={{ fontSize: '11px', color: '#999' }}>
          {new Date(value).toLocaleDateString()}
        </span>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button 
            type="link" 
            size="small" 
            icon={<EyeOutlined />}
            onClick={() => handleView(record)}
          >
            查看
          </Button>
          <Button 
            type="link" 
            size="small" 
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Button 
            type="link" 
            size="small" 
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record)}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  // 获取商品数据
  const fetchProductData = async () => {
    if (!currentBase) {
      message.warning('请先选择基地');
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.current.toString(),
        pageSize: pagination.pageSize.toString(),
        ...(searchText && { search: searchText }),
        ...(statusFilter && { isActive: statusFilter }),
      });

      const response = await fetch(`/api/v1/bases/${currentBase.id}/goods?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        setProductData(result.data || []);
        setPagination(prev => ({
          ...prev,
          total: result.pagination?.total || 0,
        }));
        
        // 计算统计数据
        calculateStats(result.data || []);
      } else {
        throw new Error(result.message || '获取商品数据失败');
      }
    } catch (error) {
      console.error('获取商品数据失败:', error);
      message.error('获取商品数据失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 计算统计数据
  const calculateStats = (data: Product[]) => {
    const totalGoods = data.length;
    const activeGoods = data.filter(p => p.isActive).length;
    const inactiveGoods = totalGoods - activeGoods;
    const totalManufacturers = new Set(data.map(p => p.manufacturer).filter(Boolean)).size;
    
    setStats({
      totalGoods,
      activeGoods,
      inactiveGoods,
      totalManufacturers,
    });
  };

  // 处理查看
  const handleView = (record: Product) => {
    Modal.info({
      title: '商品详情',
      width: 600,
      content: (
        <div>
          <p><strong>ID:</strong> {record.id}</p>
          <p><strong>编号:</strong> {record.code}</p>
          <p><strong>名称:</strong> {record.name}</p>
          <p><strong>别名:</strong> {record.alias || '-'}</p>
          <p><strong>厂家:</strong> {record.manufacturer || '-'}</p>
          <p><strong>描述:</strong> {record.description || '-'}</p>
          <p><strong>零售价(一箱):</strong> ¥{(typeof record.retailPrice === 'number' ? record.retailPrice : parseFloat(record.retailPrice || '0')).toFixed(2)}</p>
          <p><strong>平拆价(一盒):</strong> ¥{(typeof record.packPrice === 'number' ? record.packPrice : parseFloat(record.packPrice || '0')).toFixed(2)}</p>
          <p><strong>箱数量:</strong> {record.boxQuantity}</p>
          <p><strong>多少盒1箱:</strong> {record.packPerBox}</p>
          <p><strong>多少包1盒:</strong> {record.piecePerPack}</p>
          <p><strong>状态:</strong> {record.isActive ? '启用' : '禁用'}</p>
          <p><strong>创建时间:</strong> {new Date(record.createdAt).toLocaleString()}</p>
        </div>
      ),
    });
  };

  // 处理编辑
  const handleEdit = (record: Product) => {
    form.setFieldsValue({
      code: record.code,
      name: record.name,
      alias: record.alias,
      manufacturer: record.manufacturer,
      description: record.description,
      retailPrice: typeof record.retailPrice === 'number' ? record.retailPrice : parseFloat(record.retailPrice || '0'),
      packPrice: typeof record.packPrice === 'number' ? record.packPrice : parseFloat(record.packPrice || '0'),
      purchasePrice: typeof record.purchasePrice === 'number' ? record.purchasePrice : parseFloat(record.purchasePrice || '0'),
      boxQuantity: record.boxQuantity,
      packPerBox: record.packPerBox,
      piecePerPack: record.piecePerPack,
    });
    setEditingRecord(record);
    setCreateModalVisible(true);
  };

  // 处理删除
  const handleDelete = (record: Product) => {
    const { modal } = App.useApp();
    modal.confirm({
      title: '确认删除',
      content: `确定要删除商品 "${record.name}" 吗？此操作不可撤销。`,
      okText: '确定删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        if (!currentBase) {
          message.warning('请先选择基地');
          return;
        }

        try {
          const response = await fetch(`/api/v1/bases/${currentBase.id}/goods/${record.id}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const result = await response.json();
          
          if (result.success) {
            message.success('删除成功');
            fetchProductData(); // 重新加载数据
          } else {
            throw new Error(result.message || '删除失败');
          }
        } catch (error) {
          console.error('删除商品失败:', error);
          message.error('删除失败，请稍后重试');
        }
      },
    });
  };

  // 处理添加/编辑商品
  const handleAddProduct = async (values: any) => {
    if (!currentBase) {
      message.warning('请先选择基地');
      return;
    }

    setCreateLoading(true);
    try {
      const isEditing = !!editingRecord;
      const url = isEditing 
        ? `/api/v1/bases/${currentBase.id}/goods/${editingRecord.id}`
        : `/api/v1/bases/${currentBase.id}/goods`;
      
      const response = await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(values),
      });

      const result = await response.json();
      
      if (result.success) {
        message.success(isEditing ? '商品编辑成功' : '商品添加成功');
        setCreateModalVisible(false);
        setEditingRecord(null);
        form.resetFields();
        fetchProductData();
      } else {
        throw new Error(result.message || (isEditing ? '编辑商品失败' : '添加商品失败'));
      }
    } catch (error) {
      console.error(editingRecord ? '编辑商品失败:' : '添加商品失败:', error);
      message.error(editingRecord ? '编辑商品失败，请稍后重试' : '添加商品失败，请稍后重试');
    } finally {
      setCreateLoading(false);
    }
  };

  // 导出数据
  const handleExport = () => {
    message.info('导出功能开发中...');
  };

  // 刷新数据
  const handleRefresh = () => {
    fetchProductData();
  };

  // 表格变化处理
  const handleTableChange = (newPagination: any) => {
    setPagination(prev => ({
      ...prev,
      current: newPagination.current,
      pageSize: newPagination.pageSize,
    }));
  };

  // 搜索处理
  const handleSearch = (value: string) => {
    setSearchText(value);
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  // 筛选处理
  const handleFilterChange = () => {
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  // 页面加载时获取数据
  useEffect(() => {
    if (currentBase) {
      fetchProductData();
    }
  }, [currentBase, pagination.current, pagination.pageSize, searchText, statusFilter]);

  // 如果没有选择基地
  if (!currentBase) {
    return (
      <PageContainer>
        <Card>
          <div style={{ textAlign: 'center', padding: '50px 0' }}>
            <WarningOutlined style={{ fontSize: '48px', color: '#faad14' }} />
            <h3>请先选择基地</h3>
            <p>商品管理需要在特定基地下进行，请先选择一个基地。</p>
          </div>
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="商品管理"
      subTitle={`当前基地：${currentBase.name}`}
      extra={[
        <Button key="export" icon={<ExportOutlined />} onClick={handleExport}>
          导出
        </Button>,
        <Button key="refresh" icon={<ReloadOutlined />} onClick={handleRefresh}>
          刷新
        </Button>,
        <Button 
          key="add" 
          type="primary" 
          icon={<PlusOutlined />}
          onClick={() => setCreateModalVisible(true)}
        >
          添加商品
        </Button>,
      ]}
    >
      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="商品总数"
              value={stats.totalGoods}
              suffix="个"
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="启用商品"
              value={stats.activeGoods}
              suffix="个"
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="禁用商品"
              value={stats.inactiveGoods}
              suffix="个"
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="厂家数量"
              value={stats.totalManufacturers}
              suffix="个"
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 筛选工具栏 */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16} align="middle">
          <Col span={6}>
            <Space.Compact style={{ width: '100%' }}>
              <Input
                placeholder="搜索商品名称或编号"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                onPressEnter={() => handleSearch(searchText)}
              />
              <Button
                type="primary"
                icon={<SearchOutlined />}
                onClick={() => handleSearch(searchText)}
              >
                搜索
              </Button>
            </Space.Compact>
          </Col>
          <Col span={4}>
            <Select
              placeholder="暂不支持分类筛选"
              allowClear
              style={{ width: '100%' }}
              disabled
            >
              <Option value="">全部分类</Option>
              <Option value="electronics">电子产品</Option>
              <Option value="clothing">服装</Option>
              <Option value="food">食品</Option>
              <Option value="books">图书</Option>
            </Select>
          </Col>
          <Col span={4}>
            <Select
              placeholder="商品状态"
              allowClear
              style={{ width: '100%' }}
              value={statusFilter}
              onChange={(value) => {
                setStatusFilter(value || '');
                handleFilterChange();
              }}
            >
              <Option value="">全部状态</Option>
              <Option value="true">启用</Option>
              <Option value="false">禁用</Option>
            </Select>
          </Col>
          <Col span={6}>
            <Space>
              <span style={{ fontSize: '14px', color: '#666' }}>表格密度:</span>
              <Select
                value={tableSize}
                onChange={setTableSize}
                style={{ width: 80 }}
                size="small"
              >
                <Option value="small">紧凑</Option>
                <Option value="middle">默认</Option>
                <Option value="large">宽松</Option>
              </Select>
            </Space>
          </Col>
          <Col span={4} style={{ textAlign: 'right' }}>
            <Space>
              <Button
                icon={<ExportOutlined />}
                onClick={handleExport}
              >
                导出
              </Button>
              <Button
                icon={<ReloadOutlined />}
                onClick={handleRefresh}
              >
                刷新
              </Button>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setCreateModalVisible(true)}
              >
                添加商品
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 商品表格 */}
      <Card>
        <Table
          columns={columns}
          dataSource={productData}
          rowKey="id"
          loading={loading}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showQuickJumper: true,
            pageSizeOptions: ['20', '30', '50', '100'],
            showTotal: (total, range) => 
              `第 ${range[0]}-${range[1]} 条，共 ${total} 条记录`,
          }}
          onChange={handleTableChange}
          scroll={{ x: 1400 }}
          size={tableSize}
          className={styles.productTable}
        />
      </Card>

      {/* 添加商品模态框 */}
      <Modal
        title={editingRecord ? '编辑商品' : '添加商品到基地'}
        open={createModalVisible}
        onCancel={() => {
          setCreateModalVisible(false);
          setEditingRecord(null);
          form.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleAddProduct}
          autoComplete="off"
        >
          <Form.Item
            label="商品名称"
            name="name"
            rules={[
              { required: true, message: '请输入商品名称' },
              { min: 2, max: 100, message: '商品名称长度应在2-100个字符之间' }
            ]}
          >
            <Input placeholder="请输入商品名称" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="商品别名"
                name="alias"
              >
                <Input placeholder="请输入商品别名" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="厂家名称"
                name="manufacturer"
                rules={[
                  { required: true, message: '请输入厂家名称' },
                  { min: 2, max: 50, message: '厂家名称长度应在2-50个字符之间' }
                ]}
              >
                <Input placeholder="请输入厂家名称" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="商品描述"
            name="description"
          >
            <TextArea
              rows={3}
              placeholder="请输入商品描述"
              maxLength={500}
              showCount
            />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="零售价(一箱)"
                name="retailPrice"
                rules={[
                  { required: true, message: '请输入零售价' },
                  { type: 'number', min: 0, message: '零售价不能为负数' }
                ]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="零售价"
                  min={0}
                  precision={2}
                  addonBefore="¥"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="平拆价(一盒)"
                name="packPrice"
                rules={[
                  { type: 'number', min: 0, message: '平拆价不能为负数' }
                ]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="平拆价"
                  min={0}
                  precision={2}
                  addonBefore="¥"
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                label="箱装数量"
                name="boxQuantity"
                initialValue={1}
                extra="固定为1，不可修改"
              >
                <InputNumber
                  style={{ width: '100%' }}
                  value={1}
                  disabled
                  min={1}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="包/箱"
                name="packPerBox"
                rules={[
                  { required: true, message: '请输入包/箱数量' },
                  { type: 'number', min: 1, message: '包/箱数量必须大于0' }
                ]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="包/箱"
                  min={1}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="件/包"
                name="piecePerPack"
                rules={[
                  { required: true, message: '请输入件/包数量' },
                  { type: 'number', min: 1, message: '件/包数量必须大于0' }
                ]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="件/包"
                  min={1}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setCreateModalVisible(false)}>
                取消
              </Button>
              <Button type="primary" htmlType="submit" loading={createLoading}>
                添加
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
};

export default ProductManagement;
