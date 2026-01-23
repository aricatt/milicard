import React, { useState, useEffect, useMemo } from 'react';
import { Form, DatePicker, Select, InputNumber, Row, Col, Tag, Alert, Space, Tooltip, Checkbox } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import { useIntl, getLocale } from '@umijs/max';
import dayjs from 'dayjs';
import type { FormInstance } from 'antd';
import type { GoodsOption, SupplierOption, ProcurementFormValues } from './types';
import { getCategoryDisplayName, getLocalizedGoodsName } from '@/components/GoodsNameText';
import DualCurrencyInput from '@/components/DualCurrencyInput';
import { getCurrencySymbol } from '@/utils/currency';

const { Option } = Select;

interface ProcurementFormProps {
  form: FormInstance<ProcurementFormValues>;
  goodsOptions: GoodsOption[];
  supplierOptions: SupplierOption[];
  goodsLoading: boolean;
  supplierLoading: boolean;
  onFinish: (values: ProcurementFormValues & { cnyPaymentAmount?: number }) => void;
  currencyCode: string;
  exchangeRate: number;
  onExchangeRateChange: (rate: number) => void;
  initialCnyPaymentAmount?: number;  // 初始人民币支付金额（用于编辑）
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
  currencyCode,
  exchangeRate,
  onExchangeRateChange,
  initialCnyPaymentAmount,
}) => {
  const intl = useIntl();
  const isCNY = currencyCode === 'CNY';
  
  // 人民币支付模式
  const [cnyPaymentMode, setCnyPaymentMode] = useState(false);
  // 人民币实际金额（用于人民币支付模式）
  const [cnyActualAmount, setCnyActualAmount] = useState<number | null>(null);

  // 编辑时，根据初始值设置人民币支付模式
  useEffect(() => {
    if (initialCnyPaymentAmount !== undefined && initialCnyPaymentAmount > 0) {
      setCnyPaymentMode(true);
      setCnyActualAmount(initialCnyPaymentAmount);
    } else {
      setCnyPaymentMode(false);
      setCnyActualAmount(null);
    }
  }, [initialCnyPaymentAmount]);
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
      onFinish={(values) => {
        // 如果是人民币支付模式，将人民币金额传递出去
        onFinish({
          ...values,
          cnyPaymentAmount: cnyPaymentMode ? cnyActualAmount || 0 : undefined,
        });
      }}
      initialValues={{
        purchaseDate: dayjs(),  // 默认当日
        purchaseBoxQty: 0,
        purchasePackQty: 0,
        purchasePieceQty: 0,
        actualAmount: 0,
      }}
    >
      {/* 汇率设置和人民币支付选项（非人民币基地显示） */}
      {!isCNY && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message={
            <Space direction="vertical" style={{ width: '100%' }}>
              <Space>
                <span>{intl.formatMessage({ id: 'dualCurrency.exchangeRateLabel' })}</span>
                <InputNumber
                  value={exchangeRate}
                  onChange={(val) => onExchangeRateChange(val || 1)}
                  min={0.000001}
                  precision={6}
                  style={{ width: 150 }}
                />
                <span>{getCurrencySymbol(currencyCode)}</span>
                <Tooltip title={intl.formatMessage({ id: 'dualCurrency.exchangeRateTip' })}>
                  <InfoCircleOutlined style={{ color: '#1890ff' }} />
                </Tooltip>
              </Space>
              <Checkbox
                checked={cnyPaymentMode}
                onChange={(e) => {
                  setCnyPaymentMode(e.target.checked);
                  if (!e.target.checked) {
                    setCnyActualAmount(null);
                  }
                }}
              >
                {intl.formatMessage({ id: 'procurement.form.cnyPaymentMode' })}
              </Checkbox>
            </Space>
          }
        />
      )}

      {/* 采购日期 */}
      <Form.Item
        label={intl.formatMessage({ id: 'procurement.form.purchaseDate' })}
        name="purchaseDate"
        rules={[{ required: true, message: intl.formatMessage({ id: 'procurement.form.purchaseDateRequired' }) }]}
      >
        <DatePicker style={{ width: '100%' }} placeholder={intl.formatMessage({ id: 'procurement.form.purchaseDatePlaceholder' })} />
      </Form.Item>

      {/* 商品选择 */}
      <Form.Item
        label={intl.formatMessage({ id: 'procurement.form.goods' })}
        name="goodsCode"
        rules={[{ required: true, message: intl.formatMessage({ id: 'procurement.form.goodsRequired' }) }]}
      >
        <Select
          key={intl.locale}
          showSearch
          placeholder={intl.formatMessage({ id: 'procurement.form.goodsPlaceholder' })}
          loading={goodsLoading}
          optionFilterProp="children"
          onChange={handleGoodsChange}
          filterOption={(input, option) =>
            String(option?.children || '').toLowerCase().includes(input.toLowerCase())
          }
        >
          {goodsOptions.map(goods => {
            const categoryDisplay = getCategoryDisplayName(goods.categoryCode, goods.categoryName, goods.categoryNameI18n, intl.locale);
            const goodsName = getLocalizedGoodsName(goods.name, goods.nameI18n, intl.locale);
            const displayName = categoryDisplay ? `[${categoryDisplay}]${goodsName}` : goodsName;
            return (
              <Option key={goods.code} value={goods.code}>
                {displayName}
              </Option>
            );
          })}
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
        label={intl.formatMessage({ id: 'procurement.form.supplier' })}
        name="supplierCode"
        rules={[{ required: true, message: intl.formatMessage({ id: 'procurement.form.supplierRequired' }) }]}
      >
        <Select
          showSearch
          placeholder={intl.formatMessage({ id: 'procurement.form.supplierPlaceholder' })}
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

      {/* 拿货单价/箱 - 双货币输入 */}
      <Form.Item
        label={intl.formatMessage({ id: 'procurement.form.unitPriceBox' })}
        name="unitPriceBox"
        rules={[
          { required: true, message: intl.formatMessage({ id: 'procurement.form.unitPriceBoxRequired' }) },
          { type: 'number', min: 0.01, message: intl.formatMessage({ id: 'procurement.form.unitPriceBoxMin' }) }
        ]}
      >
        <DualCurrencyInput
          currencyCode={currencyCode}
          exchangeRate={exchangeRate}
          placeholder={intl.formatMessage({ id: 'procurement.form.unitPriceBoxPlaceholder' })}
          precision={2}
          min={0.01}
          onChange={handleUnitPriceBoxChange}
          cnyPaymentMode={cnyPaymentMode}
        />
      </Form.Item>

      {/* 采购箱 */}
      <Row gutter={16}>
        <Col span={8}>
          <Form.Item
            label={intl.formatMessage({ id: 'procurement.form.purchaseBoxQty' })}
            name="purchaseBoxQty"
            rules={[{ required: true, message: intl.formatMessage({ id: 'procurement.form.purchaseBoxQtyRequired' }) }]}
          >
            <InputNumber
              style={{ width: '100%' }}
              placeholder={intl.formatMessage({ id: 'procurement.form.purchaseBoxQtyPlaceholder' })}
              min={0}
              precision={0}
            />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item
            label={intl.formatMessage({ id: 'procurement.form.amountBox' })}
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
            label={intl.formatMessage({ id: 'procurement.form.unitPricePack' })}
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
            label={intl.formatMessage({ id: 'procurement.form.purchasePackQty' })}
            name="purchasePackQty"
            rules={[{ required: true, message: intl.formatMessage({ id: 'procurement.form.purchasePackQtyRequired' }) }]}
          >
            <InputNumber
              style={{ width: '100%' }}
              placeholder={intl.formatMessage({ id: 'procurement.form.purchasePackQtyPlaceholder' })}
              min={0}
              precision={0}
            />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item
            label={intl.formatMessage({ id: 'procurement.form.amountPack' })}
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
            label={intl.formatMessage({ id: 'procurement.form.unitPricePiece' })}
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
            label={intl.formatMessage({ id: 'procurement.form.purchasePieceQty' })}
            name="purchasePieceQty"
            rules={[{ required: true, message: intl.formatMessage({ id: 'procurement.form.purchasePieceQtyRequired' }) }]}
          >
            <InputNumber
              style={{ width: '100%' }}
              placeholder={intl.formatMessage({ id: 'procurement.form.purchasePieceQtyPlaceholder' })}
              min={0}
              precision={0}
            />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item
            label={intl.formatMessage({ id: 'procurement.form.amountPiece' })}
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
        label={intl.formatMessage({ id: 'procurement.form.totalAmount' })}
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
          // 计算人民币金额（基地货币 / 汇率 = 人民币）
          const cnyTotal = exchangeRate > 0 ? total / exchangeRate : 0;
          return (
            <div style={{ 
              fontSize: 18, 
              fontWeight: 'bold', 
              padding: '10px',
              background: '#e6f7ff',
              borderRadius: 4,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 24
            }}>
              <span style={{ color: '#eb2f96' }}>
                ¥ {cnyTotal.toFixed(2)}
              </span>
              {!isCNY && (
                <>
                  <span style={{ color: '#999', fontSize: 14 }}>|</span>
                  <span style={{ color: '#1890ff' }}>
                    {getCurrencySymbol(currencyCode)} {total.toFixed(2)}
                  </span>
                </>
              )}
            </div>
          );
        }}
      </Form.Item>

      {/* 实付金额（双货币输入） */}
      <Form.Item
        label={intl.formatMessage({ id: 'procurement.form.actualAmount' })}
        name="actualAmount"
        rules={[{ required: true, message: intl.formatMessage({ id: 'procurement.form.actualAmountRequired' }) }]}
        extra={cnyPaymentMode 
          ? intl.formatMessage({ id: 'procurement.form.cnyPaymentHint' })
          : intl.formatMessage({ id: 'procurement.form.actualAmountHint' })
        }
      >
        <DualCurrencyInput
          currencyCode={currencyCode}
          exchangeRate={exchangeRate}
          placeholder={intl.formatMessage({ id: 'procurement.form.actualAmountPlaceholder' })}
          precision={2}
          min={0}
          cnyPaymentMode={cnyPaymentMode}
          onCnyValueChange={setCnyActualAmount}
        />
      </Form.Item>

      {/* 隐藏字段：人民币支付金额 */}
      <Form.Item name="cnyPaymentAmount" hidden>
        <InputNumber />
      </Form.Item>

    </Form>
  );
};

export default ProcurementForm;
