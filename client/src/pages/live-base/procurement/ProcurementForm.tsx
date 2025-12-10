import React from 'react';
import { Form, DatePicker, Select, InputNumber, Row, Col, Tag } from 'antd';
import dayjs from 'dayjs';
import type { FormInstance } from 'antd';
import type { GoodsOption, SupplierOption, ProcurementFormValues } from './types';

const { Option } = Select;

interface ProcurementFormProps {
  form: FormInstance<ProcurementFormValues>;
  goodsOptions: GoodsOption[];
  supplierOptions: SupplierOption[];
  goodsLoading: boolean;
  supplierLoading: boolean;
  onFinish: (values: ProcurementFormValues) => void;
}

/**
 * 采购订单表单组件
 * 包含商品选择、供应商选择、采购数量和单价输入
 */
const ProcurementForm: React.FC<ProcurementFormProps> = ({
  form,
  goodsOptions,
  supplierOptions,
  goodsLoading,
  supplierLoading,
  onFinish,
}) => {
  /**
   * 商品选择变化时，自动填充零售价和拆分关系
   */
  const handleGoodsChange = (goodsCode: string) => {
    const goods = goodsOptions.find(g => g.code === goodsCode);
    if (goods) {
      form.setFieldsValue({
        goodsName: goods.name,
        retailPrice: goods.retailPrice,
      });
      
      // 如果已经有拿货单价/箱，重新计算盒和包的单价
      const unitPriceBox = form.getFieldValue('unitPriceBox');
      if (unitPriceBox && unitPriceBox > 0) {
        calculateUnitPrices(unitPriceBox, goods.packPerBox, goods.piecePerPack);
      }
    }
  };

  /**
   * 根据拿货单价/箱和拆分关系，计算拿货单价/盒和拿货单价/包
   */
  const calculateUnitPrices = (unitPriceBox: number, packsPerBox: number, piecesPerPack: number) => {
    // 拿货单价/盒 = 拿货单价/箱 / 多少盒1箱
    const unitPricePack = unitPriceBox / packsPerBox;
    // 拿货单价/包 = 拿货单价/盒 / 多少包1盒
    const unitPricePiece = unitPricePack / piecesPerPack;
    
    form.setFieldsValue({
      unitPricePack,
      unitPricePiece,
    });
  };

  /**
   * 拿货单价/箱变化时，自动计算盒和包的单价
   */
  const handleUnitPriceBoxChange = (value: number | null) => {
    const goodsCode = form.getFieldValue('goodsCode');
    if (!goodsCode || !value || value <= 0) {
      form.setFieldsValue({
        unitPricePack: 0,
        unitPricePiece: 0,
      });
      return;
    }
    
    const goods = goodsOptions.find(g => g.code === goodsCode);
    if (goods) {
      calculateUnitPrices(value, goods.packPerBox, goods.piecePerPack);
    }
  };

  /**
   * 供应商选择变化时，自动填充供应商名称
   */
  const handleSupplierChange = (supplierCode: string) => {
    const supplier = supplierOptions.find(s => s.code === supplierCode);
    if (supplier) {
      form.setFieldsValue({
        supplierName: supplier.name,
      });
    }
  };

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={onFinish}
      initialValues={{
        purchaseDate: dayjs(),  // 默认当日
        purchaseBoxQty: 0,
        purchasePackQty: 0,
        purchasePieceQty: 0,
        actualAmount: 0,
      }}
    >
      {/* 采购日期 */}
      <Form.Item
        label="采购日期"
        name="purchaseDate"
        rules={[{ required: true, message: '请选择采购日期' }]}
      >
        <DatePicker style={{ width: '100%' }} placeholder="选择日期" />
      </Form.Item>

      {/* 商品选择 */}
      <Form.Item
        label="商品"
        name="goodsCode"
        rules={[{ required: true, message: '请选择商品' }]}
      >
        <Select
          showSearch
          placeholder="请选择商品"
          loading={goodsLoading}
          optionFilterProp="children"
          onChange={handleGoodsChange}
          filterOption={(input, option) =>
            String(option?.children || '').toLowerCase().includes(input.toLowerCase())
          }
        >
          {goodsOptions.map(goods => (
            <Option key={goods.code} value={goods.code}>
              {goods.name}
            </Option>
          ))}
        </Select>
      </Form.Item>

      {/* 隐藏字段：商品名称 */}
      <Form.Item name="goodsName" hidden initialValue="">
        <input />
      </Form.Item>

      {/* 隐藏字段：零售价 */}
      <Form.Item name="retailPrice" hidden initialValue={0}>
        <InputNumber />
      </Form.Item>

      {/* 供应商选择 */}
      <Form.Item
        label="供应商"
        name="supplierCode"
        rules={[{ required: true, message: '请选择供应商' }]}
      >
        <Select
          showSearch
          placeholder="请选择供应商"
          loading={supplierLoading}
          optionFilterProp="children"
          onChange={handleSupplierChange}
          filterOption={(input, option) =>
            String(option?.children || '').toLowerCase().includes(input.toLowerCase())
          }
        >
          {supplierOptions.map(supplier => (
            <Option key={supplier.code} value={supplier.code}>
              {supplier.name}
            </Option>
          ))}
        </Select>
      </Form.Item>

      {/* 隐藏字段：供应商名称 */}
      <Form.Item name="supplierName" hidden initialValue="">
        <input />
      </Form.Item>

      {/* 采购箱 */}
      <Row gutter={16}>
        <Col span={8}>
          <Form.Item
            label="拿货单价/箱"
            name="unitPriceBox"
            rules={[
              { required: true, message: '请输入拿货单价/箱' },
              { type: 'number', min: 0.01, message: '单价必须大于0' }
            ]}
          >
            <InputNumber
              style={{ width: '100%' }}
              placeholder="单价/箱（必填）"
              precision={2}
              min={0.01}
              onChange={handleUnitPriceBoxChange}
            />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item
            label="采购箱"
            name="purchaseBoxQty"
            rules={[{ required: true, message: '请输入采购箱数' }]}
          >
            <InputNumber
              style={{ width: '100%' }}
              placeholder="箱数"
              min={0}
              precision={0}
            />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item
            label="应付金额/箱"
            shouldUpdate={(prev, curr) =>
              prev.unitPriceBox !== curr.unitPriceBox ||
              prev.purchaseBoxQty !== curr.purchaseBoxQty ||
              prev.retailPrice !== curr.retailPrice
            }
          >
            {({ getFieldValue }) => {
              const unitPrice = getFieldValue('unitPriceBox') || 0;
              const qty = getFieldValue('purchaseBoxQty') || 0;
              const retailPrice = getFieldValue('retailPrice') || 0;
              const amount = unitPrice * qty;
              
              // 计算折扣
              let discountTag = null;
              if (unitPrice > 0 && retailPrice > 0) {
                const discount = unitPrice / retailPrice;
                const discountPercent = (discount * 100).toFixed(1);
                
                let color = 'green';
                if (discount >= 1) {
                  color = 'red';
                } else if (discount >= 0.9) {
                  color = 'orange';
                } else if (discount >= 0.8) {
                  color = 'blue';
                }
                
                discountTag = (
                  <Tag color={color} style={{ marginLeft: 8, fontSize: 12 }}>
                    {discountPercent}%
                  </Tag>
                );
              }
              
              return (
                <div style={{ lineHeight: '32px' }}>
                  <span style={{ fontWeight: 'bold', color: '#1890ff' }}>
                    {amount.toFixed(2)}
                  </span>
                  {discountTag}
                </div>
              );
            }}
          </Form.Item>
        </Col>
      </Row>

      {/* 隐藏字段：拿货单价/盒（自动计算） */}
      <Form.Item name="unitPricePack" hidden initialValue={0}>
        <InputNumber />
      </Form.Item>

      {/* 采购盒 */}
      <Row gutter={16}>
        <Col span={8}>
          <Form.Item
            label="拿货单价/盒（自动计算）"
            shouldUpdate={(prev, curr) => prev.unitPricePack !== curr.unitPricePack}
          >
            {({ getFieldValue }) => {
              const unitPrice = getFieldValue('unitPricePack') || 0;
              return (
                <div style={{ lineHeight: '32px', color: '#666' }}>
                  {unitPrice.toFixed(4)}
                </div>
              );
            }}
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item
            label="采购盒"
            name="purchasePackQty"
            rules={[{ required: true, message: '请输入采购盒数' }]}
          >
            <InputNumber
              style={{ width: '100%' }}
              placeholder="盒数"
              min={0}
              precision={0}
            />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item
            label="应付金额/盒"
            shouldUpdate={(prev, curr) =>
              prev.unitPricePack !== curr.unitPricePack ||
              prev.purchasePackQty !== curr.purchasePackQty
            }
          >
            {({ getFieldValue }) => {
              const unitPrice = getFieldValue('unitPricePack') || 0;
              const qty = getFieldValue('purchasePackQty') || 0;
              const amount = unitPrice * qty;
              return (
                <div style={{ lineHeight: '32px', fontWeight: 'bold', color: '#1890ff' }}>
                  {amount.toFixed(2)}
                </div>
              );
            }}
          </Form.Item>
        </Col>
      </Row>

      {/* 隐藏字段：拿货单价/包（自动计算） */}
      <Form.Item name="unitPricePiece" hidden initialValue={0}>
        <InputNumber />
      </Form.Item>

      {/* 采购包 */}
      <Row gutter={16}>
        <Col span={8}>
          <Form.Item
            label="拿货单价/包（自动计算）"
            shouldUpdate={(prev, curr) => prev.unitPricePiece !== curr.unitPricePiece}
          >
            {({ getFieldValue }) => {
              const unitPrice = getFieldValue('unitPricePiece') || 0;
              return (
                <div style={{ lineHeight: '32px', color: '#666' }}>
                  {unitPrice.toFixed(4)}
                </div>
              );
            }}
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item
            label="采购包"
            name="purchasePieceQty"
            rules={[{ required: true, message: '请输入采购包数' }]}
          >
            <InputNumber
              style={{ width: '100%' }}
              placeholder="包数"
              min={0}
              precision={0}
            />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item
            label="应付金额/包"
            shouldUpdate={(prevValues, currentValues) =>
              prevValues.unitPricePiece !== currentValues.unitPricePiece ||
              prevValues.purchasePieceQty !== currentValues.purchasePieceQty
            }
          >
            {({ getFieldValue }) => {
              const unitPrice = getFieldValue('unitPricePiece') || 0;
              const qty = getFieldValue('purchasePieceQty') || 0;
              const amount = unitPrice * qty;
              return (
                <div style={{ paddingTop: 30, fontWeight: 'bold', color: '#f5222d' }}>
                  {amount.toFixed(2)}
                </div>
              );
            }}
          </Form.Item>
        </Col>
      </Row>

      {/* 应付金额（自动计算） */}
      <Form.Item
        label="应付金额（自动计算）"
        shouldUpdate={(prevValues, currentValues) =>
          prevValues.unitPriceBox !== currentValues.unitPriceBox ||
          prevValues.purchaseBoxQty !== currentValues.purchaseBoxQty ||
          prevValues.unitPricePack !== currentValues.unitPricePack ||
          prevValues.purchasePackQty !== currentValues.purchasePackQty ||
          prevValues.unitPricePiece !== currentValues.unitPricePiece ||
          prevValues.purchasePieceQty !== currentValues.purchasePieceQty
        }
      >
        {({ getFieldValue }) => {
          const amountBox = (getFieldValue('unitPriceBox') || 0) * (getFieldValue('purchaseBoxQty') || 0);
          const amountPack = (getFieldValue('unitPricePack') || 0) * (getFieldValue('purchasePackQty') || 0);
          const amountPiece = (getFieldValue('unitPricePiece') || 0) * (getFieldValue('purchasePieceQty') || 0);
          const total = amountBox + amountPack + amountPiece;
          return (
            <div style={{ 
              fontSize: 20, 
              fontWeight: 'bold', 
              color: '#1890ff',
              padding: '10px',
              background: '#e6f7ff',
              borderRadius: 4,
              textAlign: 'center'
            }}>
              {total.toFixed(2)}
            </div>
          );
        }}
      </Form.Item>

      {/* 实付金额（手动输入） */}
      <Form.Item
        label="实付金额"
        name="actualAmount"
        rules={[{ required: true, message: '请输入实付金额' }]}
        extra="如果本次未付清，请输入实际支付的金额"
      >
        <InputNumber
          style={{ width: '100%' }}
          placeholder="请输入实付金额"
          precision={2}
          min={0}
          size="large"
        />
      </Form.Item>

    </Form>
  );
};

export default ProcurementForm;
