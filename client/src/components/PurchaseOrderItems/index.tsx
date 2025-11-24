import React, { useState, useEffect } from 'react';
import { 
  Table, 
  Button, 
  InputNumber, 
  Space, 
  Popconfirm,
  Typography,
  Card
} from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import GoodsSelector from '../GoodsSelector';
import type { ColumnsType } from 'antd/es/table';

const { Text } = Typography;

export interface PurchaseOrderItem {
  key: string;
  goodsId: string;
  goodsName?: string;
  goodsCode?: string;
  boxQuantity: number;
  packQuantity: number;
  pieceQuantity: number;
  unitPrice: number;
  totalPrice: number;
  notes?: string;
}

interface PurchaseOrderItemsProps {
  value?: PurchaseOrderItem[];
  onChange?: (items: PurchaseOrderItem[]) => void;
  disabled?: boolean;
}

/**
 * 采购订单项组件
 * 支持动态添加/删除商品行，自动计算价格
 */
const PurchaseOrderItems: React.FC<PurchaseOrderItemsProps> = ({
  value = [],
  onChange,
  disabled = false
}) => {
  const [items, setItems] = useState<PurchaseOrderItem[]>(value);

  // 同步外部值变化
  useEffect(() => {
    setItems(value);
  }, [value]);

  // 通知外部值变化
  const notifyChange = (newItems: PurchaseOrderItem[]) => {
    setItems(newItems);
    onChange?.(newItems);
  };

  // 添加新行
  const addItem = () => {
    const newItem: PurchaseOrderItem = {
      key: Date.now().toString(),
      goodsId: '',
      boxQuantity: 0,
      packQuantity: 0,
      pieceQuantity: 0,
      unitPrice: 0,
      totalPrice: 0
    };
    notifyChange([...items, newItem]);
  };

  // 删除行
  const removeItem = (key: string) => {
    const newItems = items.filter(item => item.key !== key);
    notifyChange(newItems);
  };

  // 更新行数据
  const updateItem = (key: string, field: keyof PurchaseOrderItem, value: any) => {
    const newItems = items.map(item => {
      if (item.key === key) {
        const updatedItem = { ...item, [field]: value };
        
        // 如果是数量或单价变化，重新计算总价
        if (['boxQuantity', 'packQuantity', 'pieceQuantity', 'unitPrice'].includes(field)) {
          const totalQuantity = updatedItem.boxQuantity + updatedItem.packQuantity + updatedItem.pieceQuantity;
          updatedItem.totalPrice = totalQuantity * updatedItem.unitPrice;
        }
        
        return updatedItem;
      }
      return item;
    });
    notifyChange(newItems);
  };

  // 处理商品选择
  const handleGoodsChange = (key: string, goodsId: string, goods?: any) => {
    const newItems = items.map(item => {
      if (item.key === key) {
        return {
          ...item,
          goodsId,
          goodsName: goods?.name || '',
          goodsCode: goods?.code || '',
          unitPrice: goods?.purchasePrice || 0
        };
      }
      return item;
    });
    notifyChange(newItems);
  };

  // 计算总金额
  const totalAmount = items.reduce((sum, item) => sum + item.totalPrice, 0);

  const columns: ColumnsType<PurchaseOrderItem> = [
    {
      title: '商品',
      dataIndex: 'goodsId',
      width: 250,
      render: (value, record) => (
        <GoodsSelector
          value={value}
          onChange={(goodsId, goods) => handleGoodsChange(record.key, goodsId, goods)}
          disabled={disabled}
          style={{ width: '100%' }}
        />
      )
    },
    {
      title: '箱数',
      dataIndex: 'boxQuantity',
      width: 80,
      render: (value, record) => (
        <InputNumber
          value={value}
          onChange={(val) => updateItem(record.key, 'boxQuantity', val || 0)}
          min={0}
          disabled={disabled}
          style={{ width: '100%' }}
        />
      )
    },
    {
      title: '包数',
      dataIndex: 'packQuantity',
      width: 80,
      render: (value, record) => (
        <InputNumber
          value={value}
          onChange={(val) => updateItem(record.key, 'packQuantity', val || 0)}
          min={0}
          disabled={disabled}
          style={{ width: '100%' }}
        />
      )
    },
    {
      title: '个数',
      dataIndex: 'pieceQuantity',
      width: 80,
      render: (value, record) => (
        <InputNumber
          value={value}
          onChange={(val) => updateItem(record.key, 'pieceQuantity', val || 0)}
          min={0}
          disabled={disabled}
          style={{ width: '100%' }}
        />
      )
    },
    {
      title: '单价',
      dataIndex: 'unitPrice',
      width: 100,
      render: (value, record) => (
        <InputNumber
          value={value}
          onChange={(val) => updateItem(record.key, 'unitPrice', val || 0)}
          min={0}
          precision={2}
          disabled={disabled}
          style={{ width: '100%' }}
          addonBefore="¥"
        />
      )
    },
    {
      title: '小计',
      dataIndex: 'totalPrice',
      width: 100,
      render: (value) => (
        <Text strong>¥{value.toFixed(2)}</Text>
      )
    },
    {
      title: '操作',
      width: 80,
      render: (_, record) => (
        <Popconfirm
          title="确定删除这行商品吗？"
          onConfirm={() => removeItem(record.key)}
          disabled={disabled}
        >
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            disabled={disabled}
          />
        </Popconfirm>
      )
    }
  ];

  return (
    <Card size="small">
      <div style={{ marginBottom: 16 }}>
        <Space>
          <Button
            type="dashed"
            onClick={addItem}
            icon={<PlusOutlined />}
            disabled={disabled}
          >
            添加商品
          </Button>
          <Text type="secondary">
            总计: <Text strong style={{ color: '#1890ff' }}>¥{totalAmount.toFixed(2)}</Text>
          </Text>
        </Space>
      </div>
      
      <Table
        columns={columns}
        dataSource={items}
        pagination={false}
        size="small"
        scroll={{ x: 800 }}
        locale={{ emptyText: '暂无商品，点击"添加商品"开始录入' }}
      />
    </Card>
  );
};

export default PurchaseOrderItems;
