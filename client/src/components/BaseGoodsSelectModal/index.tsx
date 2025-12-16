import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Modal, Table, Input, Select, Tag, Button, Row, Col, message } from 'antd';
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

// 基地商品类型
export interface BaseGoodsItem {
  id: string;
  code: string;
  name: string;
  nameI18n?: NameI18n;
  categoryCode?: string;
  categoryName?: string;
  manufacturer?: string;
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
interface BaseGoodsSelectModalProps {
  open: boolean;
  onCancel: () => void;
  onSelect: (goods: BaseGoodsItem) => void;
  baseId: number;
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
 * 基地商品选择弹窗
 * 支持搜索、分页、品类筛选
 * 用于出库、调货等需要选择基地商品的场景
 */
const BaseGoodsSelectModal: React.FC<BaseGoodsSelectModalProps> = ({
  open,
  onCancel,
  onSelect,
  baseId,
  excludeIds = [],
  title,
}) => {
  const intl = useIntl();
  const locale = getLocale();
  const modalTitle = title || intl.formatMessage({ id: 'stockOut.form.selectGoods' });
  
  // 状态
  const [loading, setLoading] = useState(false);
  const [goods, setGoods] = useState<BaseGoodsItem[]>([]);
  const [total, setTotal] = useState(0);
  const [current, setCurrent] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchText, setSearchText] = useState('');
  const [selectedCategoryCode, setSelectedCategoryCode] = useState<string | undefined>();
  const [categories, setCategories] = useState<Category[]>([]);
  
  // 已排除的商品ID集合
  const excludeIdSet = useMemo(() => new Set(excludeIds), [excludeIds]);

  // 获取品类列表
  const fetchCategories = async () => {
    try {
      const result = await request('/api/v1/categories/all', { method: 'GET' });
      setCategories(result || []);
    } catch (error) {
      console.error('获取品类列表失败:', error);
    }
  };

  // 获取商品列表
  const fetchGoods = useCallback(async () => {
    if (!baseId) return;
    
    setLoading(true);
    try {
      const result = await request(`/api/v1/bases/${baseId}/goods`, {
        method: 'GET',
        params: {
          page: current,
          pageSize,
          keyword: searchText || undefined,
          categoryCode: selectedCategoryCode,
          isActive: true,
        },
      });

      if (result.success) {
        setGoods(result.data || []);
        setTotal(result.pagination?.total || result.data?.length || 0);
      }
    } catch (error) {
      console.error('获取商品列表失败:', error);
      message.error(intl.formatMessage({ id: 'message.fetchFailed' }));
    } finally {
      setLoading(false);
    }
  }, [baseId, current, pageSize, searchText, selectedCategoryCode, intl]);

  // 防抖搜索
  const debouncedSearch = useRef(
    debounce((value: string) => {
      setSearchText(value);
      setCurrent(1);
    }, 300)
  ).current;

  // 弹窗打开时加载数据
  useEffect(() => {
    if (open && baseId) {
      fetchCategories();
      fetchGoods();
      // 重置状态
      setSearchText('');
      setSelectedCategoryCode(undefined);
      setCurrent(1);
    }
  }, [open, baseId]);

  // 筛选条件变化时重新加载
  useEffect(() => {
    if (open && baseId) {
      fetchGoods();
    }
  }, [current, pageSize, searchText, selectedCategoryCode]);

  // 重置筛选
  const handleReset = () => {
    setSearchText('');
    setSelectedCategoryCode(undefined);
    setCurrent(1);
  };

  // 选择商品
  const handleSelect = (record: BaseGoodsItem) => {
    onSelect(record);
    onCancel();
  };

  // 获取多语言商品名称
  const getLocalizedName = (name: string, nameI18n?: NameI18n) => {
    if (!nameI18n) return name;
    if (locale === 'zh-CN' || locale === 'zh-TW') return name;
    const localeKey = locale === 'en-US' ? 'en' : locale === 'th-TH' ? 'th' : locale === 'vi-VN' ? 'vi' : '';
    return (localeKey && nameI18n[localeKey]) || name;
  };

  // 获取品类显示名称
  const getCategoryDisplayName = (categoryCode?: string, categoryName?: string) => {
    if (!categoryCode) return '-';
    if (locale === 'zh-CN') return categoryName || categoryCode;
    return categoryCode;
  };

  // 表格列定义
  const columns: ColumnsType<BaseGoodsItem> = useMemo(() => [
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
      render: (name, record) => getLocalizedName(name, record.nameI18n),
    },
    {
      title: intl.formatMessage({ id: 'products.column.category' }),
      key: 'category',
      width: 100,
      render: (_, record) => {
        const categoryCode = record.categoryCode || '';
        const categoryName = record.categoryName || '';
        const color = CategoryColors[categoryCode] || 'default';
        if (!categoryCode) {
          return <Tag color="default">{intl.formatMessage({ id: 'products.uncategorized' })}</Tag>;
        }
        return <Tag color={color}>{getCategoryDisplayName(categoryCode, categoryName)}</Tag>;
      },
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
  ], [intl, excludeIdSet, locale]);

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
        <Col span={10}>
          <Input
            placeholder={intl.formatMessage({ id: 'productSettings.search.placeholder' })}
            prefix={<SearchOutlined />}
            allowClear
            onChange={(e) => debouncedSearch(e.target.value)}
          />
        </Col>
        <Col span={8}>
          <Select
            placeholder={intl.formatMessage({ id: 'productSettings.filter.category' })}
            allowClear
            style={{ width: '100%' }}
            value={selectedCategoryCode}
            onChange={(value) => {
              setSelectedCategoryCode(value);
              setCurrent(1);
            }}
            options={categories.map(cat => ({ value: cat.code, label: locale === 'zh-CN' ? cat.name : cat.code }))}
          />
        </Col>
        <Col span={6}>
          <Button icon={<ReloadOutlined />} onClick={handleReset}>
            {intl.formatMessage({ id: 'button.reset' })}
          </Button>
        </Col>
      </Row>

      {/* 商品表格 */}
      <Table
        rowKey="id"
        columns={columns}
        dataSource={goods}
        loading={loading}
        size="small"
        scroll={{ x: 700, y: 400 }}
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

export default BaseGoodsSelectModal;
