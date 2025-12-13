import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Modal, Table, Input, Select, Tag, Button, Space, Row, Col, message } from 'antd';
import { SearchOutlined, ReloadOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { request, useIntl, getLocale } from '@umijs/max';
import type { ColumnsType } from 'antd/es/table';
import debounce from 'lodash/debounce';

// 多语言名称类型
interface NameI18n {
  en?: string;
  th?: string;
  vi?: string;
  [key: string]: string | undefined;
}

// 全局商品类型
interface GlobalProduct {
  id: string;
  code: string;
  name: string;
  nameI18n?: NameI18n;
  categoryId?: number;
  category?: {
    id: number;
    code: string;
    name: string;
  };
  manufacturer: string;
  packPerBox: number;
  piecePerPack: number;
  isActive: boolean;
}

// 品类类型
interface Category {
  id: number;
  code: string;
  name: string;
}

// 组件属性
interface GlobalGoodsSelectModalProps {
  open: boolean;
  onCancel: () => void;
  onSelect: (product: GlobalProduct) => void;
  excludeIds?: string[];  // 排除已选择的商品ID
  title?: string;
}

// 品类颜色映射
const CategoryColors: Record<string, string> = {
  'CARD': 'blue',
  'CARD_BRICK': 'cyan',
  'GIFT': 'magenta',
  'COLOR_PAPER': 'purple',
  'FORTUNE_SIGN': 'gold',
  'TEAR_CARD': 'orange',
  'TOY': 'green',
  'STAMP': 'lime',
  'LUCKY_CAT': 'red'
};

/**
 * 全局商品选择弹窗
 * 支持搜索、分页、品类筛选
 */
const GlobalGoodsSelectModal: React.FC<GlobalGoodsSelectModalProps> = ({
  open,
  onCancel,
  onSelect,
  excludeIds = [],
  title,
}) => {
  const intl = useIntl();
  const modalTitle = title || intl.formatMessage({ id: 'productSettings.form.selectProduct' });
  // 状态
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<GlobalProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [current, setCurrent] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchText, setSearchText] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | undefined>();
  const [selectedManufacturer, setSelectedManufacturer] = useState<string | undefined>();
  const [categories, setCategories] = useState<Category[]>([]);
  const [manufacturers, setManufacturers] = useState<string[]>([]);
  
  // 已排除的商品ID集合
  const excludeIdSet = new Set(excludeIds);

  // 获取品类列表
  const fetchCategories = async () => {
    try {
      const result = await request('/api/v1/categories/all', { method: 'GET' });
      setCategories(result || []);
    } catch (error) {
      console.error('获取品类列表失败:', error);
    }
  };

  // 获取厂家列表
  const fetchManufacturers = async () => {
    try {
      const result = await request('/api/v1/global-goods/manufacturers', { method: 'GET' });
      if (result.success) {
        setManufacturers(result.data || []);
      }
    } catch (error) {
      console.error('获取厂家列表失败:', error);
    }
  };

  // 获取商品列表
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const result = await request('/api/v1/global-goods', {
        method: 'GET',
        params: {
          page: current,
          pageSize,
          search: searchText || undefined,
          categoryId: selectedCategoryId,
          manufacturer: selectedManufacturer,
          isActive: true,
        },
      });

      if (result.success) {
        setProducts(result.data || []);
        setTotal(result.pagination?.total || 0);
      }
    } catch (error) {
      console.error('获取商品列表失败:', error);
      message.error('获取商品列表失败');
    } finally {
      setLoading(false);
    }
  }, [current, pageSize, searchText, selectedCategoryId, selectedManufacturer]);

  // 防抖搜索
  const debouncedSearch = useRef(
    debounce((value: string) => {
      setSearchText(value);
      setCurrent(1);
    }, 300)
  ).current;

  // 弹窗打开时加载数据
  useEffect(() => {
    if (open) {
      fetchCategories();
      fetchManufacturers();
      fetchProducts();
    }
  }, [open]);

  // 筛选条件变化时重新加载
  useEffect(() => {
    if (open) {
      fetchProducts();
    }
  }, [current, pageSize, searchText, selectedCategoryId, selectedManufacturer, open]);

  // 重置筛选
  const handleReset = () => {
    setSearchText('');
    setSelectedCategoryId(undefined);
    setSelectedManufacturer(undefined);
    setCurrent(1);
  };

  // 选择商品
  const handleSelect = (record: GlobalProduct) => {
    onSelect(record);
    onCancel();
  };

  // 表格列定义
  const columns: ColumnsType<GlobalProduct> = useMemo(() => [
    {
      title: intl.formatMessage({ id: 'products.column.code' }),
      dataIndex: 'code',
      key: 'code',
      width: 140,
      ellipsis: true,
    },
    {
      title: intl.formatMessage({ id: 'products.column.name' }),
      dataIndex: 'name',
      key: 'name',
      width: 200,
      ellipsis: true,
      render: (_, record) => {
        const locale = getLocale();
        const localeKey = locale === 'en-US' ? 'en' : locale === 'th-TH' ? 'th' : locale === 'vi-VN' ? 'vi' : '';
        const displayName = (localeKey && record.nameI18n?.[localeKey]) || record.name;
        return displayName;
      },
    },
    {
      title: intl.formatMessage({ id: 'products.column.category' }),
      dataIndex: 'category',
      key: 'category',
      width: 100,
      render: (_, record) => {
        const categoryName = record.category?.name || '';
        const categoryCode = record.category?.code || '';
        const color = CategoryColors[categoryCode] || 'default';
        return categoryName ? (
          <Tag color={color}>{categoryName}</Tag>
        ) : (
          <Tag color="default">{intl.formatMessage({ id: 'products.uncategorized' })}</Tag>
        );
      },
    },
    {
      title: intl.formatMessage({ id: 'products.column.manufacturer' }),
      dataIndex: 'manufacturer',
      key: 'manufacturer',
      width: 120,
      ellipsis: true,
    },
    {
      title: intl.formatMessage({ id: 'products.column.spec' }),
      key: 'spec',
      width: 80,
      render: (_, record) => (
        <span>{record.packPerBox} / {record.piecePerPack}</span>
      ),
    },
    {
      title: intl.formatMessage({ id: 'table.column.action' }),
      key: 'action',
      width: 80,
      fixed: 'right',
      render: (_, record) => {
        const isExcluded = excludeIdSet.has(record.id);
        return isExcluded ? (
          <Tag icon={<CheckCircleOutlined />} color="success">{intl.formatMessage({ id: 'productSettings.alreadyAdded' })}</Tag>
        ) : (
          <Button type="link" size="small" onClick={() => handleSelect(record)}>
            {intl.formatMessage({ id: 'button.select' })}
          </Button>
        );
      },
    },
  ], [intl, excludeIdSet]);

  return (
    <Modal
      title={modalTitle}
      open={open}
      onCancel={onCancel}
      width={900}
      footer={null}
      destroyOnHidden
    >
      {/* 筛选区域 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col span={8}>
          <Input
            placeholder={intl.formatMessage({ id: 'productSettings.search.placeholder' })}
            prefix={<SearchOutlined />}
            allowClear
            onChange={(e) => debouncedSearch(e.target.value)}
          />
        </Col>
        <Col span={6}>
          <Select
            placeholder={intl.formatMessage({ id: 'productSettings.filter.category' })}
            allowClear
            style={{ width: '100%' }}
            value={selectedCategoryId}
            onChange={(value) => {
              setSelectedCategoryId(value);
              setCurrent(1);
            }}
            options={categories.map(cat => ({ value: cat.id, label: cat.name }))}
          />
        </Col>
        <Col span={6}>
          <Select
            placeholder={intl.formatMessage({ id: 'productSettings.filter.manufacturer' })}
            allowClear
            showSearch
            style={{ width: '100%' }}
            value={selectedManufacturer}
            onChange={(value) => {
              setSelectedManufacturer(value);
              setCurrent(1);
            }}
            options={manufacturers.map(m => ({ value: m, label: m }))}
          />
        </Col>
        <Col span={4}>
          <Button icon={<ReloadOutlined />} onClick={handleReset}>
            {intl.formatMessage({ id: 'button.reset' })}
          </Button>
        </Col>
      </Row>

      {/* 商品表格 */}
      <Table
        rowKey="id"
        columns={columns}
        dataSource={products}
        loading={loading}
        size="small"
        scroll={{ x: 800, y: 400 }}
        pagination={{
          current,
          pageSize,
          total,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => intl.formatMessage({ id: 'table.pagination.totalItems' }, { total }),
          pageSizeOptions: ['10', '20', '50'],
          onChange: (page, size) => {
            setCurrent(page);
            setPageSize(size);
          },
        }}
      />
    </Modal>
  );
};

export default GlobalGoodsSelectModal;
