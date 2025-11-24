import React, { useState, useEffect } from 'react';
import { Select, Spin } from 'antd';
import { request } from '@umijs/max';

const { Option } = Select;

interface Goods {
  id: string;
  code: string;
  name: string;
  retailPrice: number;
  purchasePrice: number;
  boxSize: number;
  packSize: number;
}

interface GoodsSelectorProps {
  value?: string;
  onChange?: (value: string, goods?: Goods) => void;
  placeholder?: string;
  disabled?: boolean;
  style?: React.CSSProperties;
}

/**
 * 商品选择器组件
 * 支持搜索和选择商品
 */
const GoodsSelector: React.FC<GoodsSelectorProps> = ({
  value,
  onChange,
  placeholder = "请选择商品",
  disabled = false,
  style
}) => {
  const [loading, setLoading] = useState(false);
  const [goodsList, setGoodsList] = useState<Goods[]>([]);
  const [searchValue, setSearchValue] = useState('');

  // 获取商品列表
  const fetchGoods = async (search?: string) => {
    setLoading(true);
    try {
      const response = await request('/api/v1/goods', {
        method: 'GET',
        params: {
          search: search || '',
          limit: 50
        }
      });
      
      if (response.success) {
        setGoodsList(response.data.items || []);
      }
    } catch (error) {
      console.error('获取商品列表失败:', error);
      setGoodsList([]);
    } finally {
      setLoading(false);
    }
  };

  // 组件挂载时获取商品列表
  useEffect(() => {
    fetchGoods();
  }, []);

  // 处理搜索
  const handleSearch = (value: string) => {
    setSearchValue(value);
    if (value) {
      fetchGoods(value);
    } else {
      fetchGoods();
    }
  };

  // 处理选择
  const handleChange = (selectedValue: string) => {
    const selectedGoods = goodsList.find(goods => goods.id === selectedValue);
    onChange?.(selectedValue, selectedGoods);
  };

  return (
    <Select
      value={value}
      onChange={handleChange}
      onSearch={handleSearch}
      placeholder={placeholder}
      disabled={disabled}
      style={style}
      showSearch
      filterOption={false}
      notFoundContent={loading ? <Spin size="small" /> : '暂无数据'}
      searchValue={searchValue}
    >
      {goodsList.map(goods => (
        <Option key={goods.id} value={goods.id}>
          <div>
            <div style={{ fontWeight: 'bold' }}>{goods.name}</div>
            <div style={{ fontSize: '12px', color: '#666' }}>
              编号: {goods.code} | 采购价: ¥{goods.purchasePrice}
            </div>
          </div>
        </Option>
      ))}
    </Select>
  );
};

export default GoodsSelector;
