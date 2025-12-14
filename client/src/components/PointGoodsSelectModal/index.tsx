import React, { useState, useEffect, useCallback, useMemo } from 'react';
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

// 点位可购商品类型
interface PointGoodsItem {
  id: string;
  goodsId: string;
  unitPrice?: number;
  maxBoxQuantity?: number;
  maxPackQuantity?: number;
  isActive: boolean;
  goods: {
    id: string;
    code: string;
    name: string;
    nameI18n?: NameI18n;
    packPerBox: number;
    piecePerPack: number;
    imageUrl?: string;
    category?: {
      id: number;
      code: string;
      name: string;
    };
  };
}

// 组件属性
interface PointGoodsSelectModalProps {
  open: boolean;
  onCancel: () => void;
  onSelect: (item: PointGoodsItem) => void;
  pointId: string;
  baseId: number;
  excludeGoodsIds?: string[];  // 排除已选择的商品ID
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
 * 点位可购商品选择弹窗
 * 支持搜索、分页、品类筛选
 */
const PointGoodsSelectModal: React.FC<PointGoodsSelectModalProps> = ({
  open,
  onCancel,
  onSelect,
  pointId,
  baseId,
  excludeGoodsIds = [],
  title,
}) => {
  const intl = useIntl();
  const locale = getLocale();
  const modalTitle = title || intl.formatMessage({ id: 'pointOrders.form.selectGoods' });
  
  // 状态
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<PointGoodsItem[]>([]);
  const [total, setTotal] = useState(0);
  const [current, setCurrent] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchText, setSearchText] = useState('');
  const [selectedCategoryCode, setSelectedCategoryCode] = useState<string | undefined>();
  
  // 已排除的商品ID集合
  const excludeIdSet = useMemo(() => new Set(excludeGoodsIds), [excludeGoodsIds]);

  // 获取点位可购商品列表
  const fetchItems = useCallback(async () => {
    if (!pointId || !baseId) return;
    
    setLoading(true);
    try {
      const result = await request(`/api/v1/bases/${baseId}/points/${pointId}/goods`, {
        method: 'GET',
      });
      
      if (result.success && result.data) {
        // 过滤掉未启用的商品
        const activeItems = result.data.filter((item: PointGoodsItem) => item.isActive);
        setItems(activeItems);
        setTotal(activeItems.length);
      }
    } catch (error) {
      console.error('获取点位可购商品失败:', error);
      message.error(intl.formatMessage({ id: 'pointOrders.message.fetchGoodsFailed' }));
    } finally {
      setLoading(false);
    }
  }, [pointId, baseId, intl]);

  // 打开弹窗时加载数据
  useEffect(() => {
    if (open && pointId) {
      fetchItems();
      setCurrent(1);
      setSearchText('');
      setSelectedCategoryCode(undefined);
    }
  }, [open, pointId, fetchItems]);

  // 过滤后的商品列表
  const filteredItems = useMemo(() => {
    let result = items;
    
    // 排除已选择的商品
    result = result.filter(item => !excludeIdSet.has(item.goodsId));
    
    // 按搜索关键词过滤
    if (searchText) {
      const lowerSearch = searchText.toLowerCase();
      result = result.filter(item => 
        item.goods.name.toLowerCase().includes(lowerSearch) ||
        item.goods.code.toLowerCase().includes(lowerSearch)
      );
    }
    
    // 按品类过滤
    if (selectedCategoryCode) {
      result = result.filter(item => item.goods.category?.code === selectedCategoryCode);
    }
    
    return result;
  }, [items, excludeIdSet, searchText, selectedCategoryCode]);

  // 分页后的数据
  const paginatedItems = useMemo(() => {
    const start = (current - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, current, pageSize]);

  // 获取所有品类（从商品中提取）
  const categories = useMemo(() => {
    const categoryMap = new Map<string, { code: string; name: string }>();
    items.forEach(item => {
      if (item.goods.category) {
        categoryMap.set(item.goods.category.code, {
          code: item.goods.category.code,
          name: item.goods.category.name,
        });
      }
    });
    return Array.from(categoryMap.values());
  }, [items]);

  // 获取多语言商品名称
  const getLocalizedName = (name: string, nameI18n?: NameI18n) => {
    if (!nameI18n) return name;
    if (locale === 'zh-CN') return name;
    return nameI18n[locale.replace('-', '_').toLowerCase()] || nameI18n.en || name;
  };

  // 获取品类显示名称
  const getCategoryDisplayName = (category?: { code: string; name: string }) => {
    if (!category) return '-';
    if (locale === 'zh-CN') return category.name;
    return category.code;
  };

  // 表格列定义
  const columns: ColumnsType<PointGoodsItem> = [
    {
      title: intl.formatMessage({ id: 'table.column.category' }),
      dataIndex: ['goods', 'category'],
      width: 100,
      render: (category) => {
        if (!category) return '-';
        const color = CategoryColors[category.code] || 'default';
        return <Tag color={color}>{getCategoryDisplayName(category)}</Tag>;
      },
    },
    {
      title: intl.formatMessage({ id: 'form.label.name' }),
      dataIndex: ['goods', 'name'],
      ellipsis: true,
      render: (name, record) => getLocalizedName(name, record.goods.nameI18n),
    },
    {
      title: intl.formatMessage({ id: 'form.label.code' }),
      dataIndex: ['goods', 'code'],
      width: 160,
    },
    {
      title: intl.formatMessage({ id: 'points.goods.unitPrice' }),
      dataIndex: 'unitPrice',
      width: 120,
      align: 'right',
      render: (price) => {
        // 专属单价：只显示用户主动设置的值
        const exclusivePrice = Number(price) || 0;
        return exclusivePrice > 0 ? `¥${exclusivePrice.toFixed(2)}` : '-';
      },
    },
    {
      title: intl.formatMessage({ id: 'unit.pricePerPack' }),
      width: 100,
      align: 'right',
      render: (_, record: any) => {
        // 优先专属单价，其次系统价格
        const exclusivePrice = Number(record.unitPrice) || 0;
        const systemPrice = Number(record.goods.baseRetailPrice) || 0;
        const effectivePrice = exclusivePrice > 0 ? exclusivePrice : systemPrice;
        const packPerBox = record.goods.packPerBox || 1;
        const packPrice = effectivePrice > 0 ? effectivePrice / packPerBox : 0;
        return packPrice > 0 ? `¥${packPrice.toFixed(2)}` : '-';
      },
    },
    {
      title: intl.formatMessage({ id: 'table.column.operation' }),
      width: 80,
      align: 'center',
      render: (_, record) => (
        <Button
          type="primary"
          size="small"
          icon={<CheckCircleOutlined />}
          onClick={() => onSelect(record)}
        >
          {intl.formatMessage({ id: 'button.select' })}
        </Button>
      ),
    },
  ];

  // 搜索防抖
  const debouncedSearch = useMemo(
    () => debounce((value: string) => {
      setSearchText(value);
      setCurrent(1);
    }, 300),
    []
  );

  return (
    <Modal
      title={modalTitle}
      open={open}
      onCancel={onCancel}
      width={900}
      footer={null}
      destroyOnClose
    >
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        {/* 搜索和筛选 */}
        <Row gutter={16}>
          <Col span={10}>
            <Input
              placeholder={intl.formatMessage({ id: 'pointOrders.form.searchGoods' })}
              prefix={<SearchOutlined />}
              allowClear
              onChange={(e) => debouncedSearch(e.target.value)}
            />
          </Col>
          <Col span={8}>
            <Select
              placeholder={intl.formatMessage({ id: 'filter.category' })}
              allowClear
              style={{ width: '100%' }}
              value={selectedCategoryCode}
              onChange={(value) => {
                setSelectedCategoryCode(value);
                setCurrent(1);
              }}
            >
              {categories.map((cat) => (
                <Select.Option key={cat.code} value={cat.code}>
                  <Tag color={CategoryColors[cat.code] || 'default'}>{getCategoryDisplayName(cat)}</Tag>
                </Select.Option>
              ))}
            </Select>
          </Col>
          <Col span={6} style={{ textAlign: 'right' }}>
            <Button icon={<ReloadOutlined />} onClick={fetchItems}>
              {intl.formatMessage({ id: 'button.refresh' })}
            </Button>
          </Col>
        </Row>

        {/* 商品列表 */}
        <Table
          rowKey="id"
          columns={columns}
          dataSource={paginatedItems}
          loading={loading}
          size="small"
          pagination={{
            current,
            pageSize,
            total: filteredItems.length,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (t) => intl.formatMessage({ id: 'pagination.total' }, { total: t }),
            onChange: (page, size) => {
              setCurrent(page);
              setPageSize(size);
            },
          }}
        />
      </Space>
    </Modal>
  );
};

export default PointGoodsSelectModal;
