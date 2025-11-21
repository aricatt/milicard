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
  ShoppingOutlined
} from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { useBase } from '@/contexts/BaseContext';
import type { ColumnsType } from 'antd/es/table';
import styles from './index.less';

const { Search } = Input;
const { Option } = Select;
const { TextArea } = Input;

// 商品数据类型定义
interface Product {
  id: string;
  code: string;
  name: string;
  description: string;
  category: string;
  boxQuantity: number;
  packPerBox: number;
  piecePerPack: number;
  baseId: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  baseName: string;
}

// 商品统计数据类型
interface ProductStats {
  totalProducts: number;
  activeProducts: number;
  inactiveProducts: number;
  categories: number;
}

/**
 * 商品管理页面
 * 基地中心化的商品管理，显示当前基地的商品信息
 */
const ProductManagement: React.FC = () => {
  const { currentBase } = useBase();
  const { message } = App.useApp();
  
  // 状态管理
  const [loading, setLoading] = useState(false);
  const [productData, setProductData] = useState<Product[]>([]);
  const [stats, setStats] = useState<ProductStats>({
    totalProducts: 0,
    activeProducts: 0,
    inactiveProducts: 0,
    categories: 0,
  });
  
  // 筛选条件
  const [searchText, setSearchText] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });

  // 模态框状态
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [form] = Form.useForm();

  // 表格列定义
  const columns: ColumnsType<Product> = [
    {
      title: '商品编号',
      dataIndex: 'code',
      key: 'code',
      width: 120,
      fixed: 'left',
      render: (text: string) => <strong>{text}</strong>,
    },
    {
      title: '商品名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      fixed: 'left',
      render: (text: string) => <strong>{text}</strong>,
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      width: 200,
      ellipsis: true,
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 120,
      render: (category: string) => (
        <Tag color="blue">{category || '未分类'}</Tag>
      ),
    },
    {
      title: '包装规格',
      key: 'packaging',
      width: 150,
      render: (_, record: Product) => (
        <div>
          <div>箱装: {record.boxQuantity}</div>
          <div>包/箱: {record.packPerBox}</div>
          <div>件/包: {record.piecePerPack}</div>
        </div>
      ),
    },
    {
      title: '状态',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 100,
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'green' : 'red'} icon={<CheckCircleOutlined />}>
          {isActive ? '启用' : '禁用'}
        </Tag>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 150,
      render: (value: string) => new Date(value).toLocaleString(),
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
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
        current: pagination.current.toString(),
        pageSize: pagination.pageSize.toString(),
        ...(searchText && { search: searchText }),
        ...(categoryFilter && { category: categoryFilter }),
        ...(statusFilter && { isActive: statusFilter }),
      });

      const response = await fetch(`/api/v1/bases/${currentBase.id}/goods?${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        setProductData(result.data || []);
        setPagination(prev => ({
          ...prev,
          total: result.total || 0,
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
    const totalProducts = data.length;
    const activeProducts = data.filter(p => p.isActive).length;
    const inactiveProducts = totalProducts - activeProducts;
    const categories = new Set(data.map(p => p.category).filter(Boolean)).size;
    
    setStats({
      totalProducts,
      activeProducts,
      inactiveProducts,
      categories,
    });
  };

  // 处理查看
  const handleView = (record: Product) => {
    message.info(`查看商品: ${record.name}`);
  };

  // 处理编辑
  const handleEdit = (record: Product) => {
    message.info(`编辑商品: ${record.name}`);
  };

  // 处理添加商品到基地
  const handleAddProduct = async (values: any) => {
    if (!currentBase) {
      message.warning('请先选择基地');
      return;
    }

    setCreateLoading(true);
    try {
      const response = await fetch(`/api/v1/bases/${currentBase.id}/goods`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...values,
          baseId: currentBase.id,
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        message.success('商品添加成功');
        setCreateModalVisible(false);
        form.resetFields();
        fetchProductData();
      } else {
        throw new Error(result.message || '添加商品失败');
      }
    } catch (error) {
      console.error('添加商品失败:', error);
      message.error('添加商品失败，请稍后重试');
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
  }, [currentBase, pagination.current, pagination.pageSize, searchText, categoryFilter, statusFilter]);

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
              value={stats.totalProducts}
              suffix="个"
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="启用商品"
              value={stats.activeProducts}
              suffix="个"
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="禁用商品"
              value={stats.inactiveProducts}
              suffix="个"
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="商品分类"
              value={stats.categories}
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
            <Search
              placeholder="搜索商品名称或编号"
              allowClear
              enterButton={<SearchOutlined />}
              onSearch={handleSearch}
              onChange={(e) => !e.target.value && setSearchText('')}
            />
          </Col>
          <Col span={4}>
            <Select
              placeholder="选择分类"
              allowClear
              style={{ width: '100%' }}
              value={categoryFilter}
              onChange={(value) => {
                setCategoryFilter(value || '');
                handleFilterChange();
              }}
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
            showTotal: (total, range) => 
              `第 ${range[0]}-${range[1]} 条，共 ${total} 条记录`,
          }}
          onChange={handleTableChange}
          scroll={{ x: 1400 }}
          size="middle"
          className={styles.productTable}
        />
      </Card>

      {/* 添加商品模态框 */}
      <Modal
        title="添加商品到基地"
        open={createModalVisible}
        onCancel={() => setCreateModalVisible(false)}
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
            label="商品编号"
            name="code"
            rules={[
              { required: true, message: '请输入商品编号' },
              { min: 3, max: 50, message: '商品编号长度应在3-50个字符之间' }
            ]}
          >
            <Input placeholder="请输入商品编号" />
          </Form.Item>

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

          <Form.Item
            label="商品分类"
            name="category"
          >
            <Select placeholder="请选择商品分类">
              <Option value="electronics">电子产品</Option>
              <Option value="clothing">服装</Option>
              <Option value="food">食品</Option>
              <Option value="books">图书</Option>
            </Select>
          </Form.Item>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                label="箱装数量"
                name="boxQuantity"
                rules={[
                  { required: true, message: '请输入箱装数量' },
                  { type: 'number', min: 1, message: '箱装数量必须大于0' }
                ]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="箱装数量"
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
