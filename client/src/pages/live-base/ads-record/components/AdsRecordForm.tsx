import React, { useEffect } from 'react';
import { Modal, Form, Select, InputNumber, message } from 'antd';
import { useIntl } from '@umijs/max';
import dayjs from 'dayjs';
import type { MonthlyGmvAdsStats, HandlerOption } from '../types';

interface AdsRecordFormProps {
  visible: boolean;
  record?: MonthlyGmvAdsStats | null;
  month: string;
  handlerOptions: HandlerOption[];
  onCancel: () => void;
  onSubmit: (values: any) => Promise<void>;
}

const AdsRecordForm: React.FC<AdsRecordFormProps> = ({
  visible,
  record,
  month,
  handlerOptions,
  onCancel,
  onSubmit,
}) => {
  const intl = useIntl();
  const [form] = Form.useForm();

  useEffect(() => {
    if (visible) {
      if (record) {
        // 编辑模式：填充现有数据
        const formData: any = {
          handlerId: record.handlerId,
          handlerName: record.handlerName,
        };

        // 填充每日ADS数据
        const daysInMonth = dayjs(month, 'YYYY-MM').daysInMonth();
        for (let day = 1; day <= daysInMonth; day++) {
          const adsValue = (record as any)[`day${day}Ads`];
          if (adsValue) {
            formData[`day${day}Ads`] = adsValue;
          }
        }

        form.setFieldsValue(formData);
      } else {
        // 新增模式：清空表单
        form.resetFields();
      }
    }
  }, [visible, record, form, month]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      await onSubmit(values);
      form.resetFields();
    } catch (error) {
      console.error('表单验证失败:', error);
    }
  };

  const daysInMonth = dayjs(month, 'YYYY-MM').daysInMonth();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  return (
    <Modal
      title={
        record
          ? intl.formatMessage({ id: 'adsRecord.editRecord' })
          : intl.formatMessage({ id: 'adsRecord.addRecord' })
      }
      open={visible}
      onCancel={onCancel}
      onOk={handleSubmit}
      width={800}
      okText={intl.formatMessage({ id: 'button.confirm' })}
      cancelText={intl.formatMessage({ id: 'button.cancel' })}
    >
      <Form
        form={form}
        layout="vertical"
        style={{ maxHeight: '60vh', overflowY: 'auto', paddingRight: 16 }}
      >
        <Form.Item
          label={intl.formatMessage({ id: 'adsRecord.column.handler' })}
          name="handlerId"
          rules={[
            {
              required: true,
              message: intl.formatMessage({ id: 'adsRecord.selectHandlerRequired' }),
            },
          ]}
        >
          <Select
            placeholder={intl.formatMessage({ id: 'adsRecord.selectHandlers' })}
            options={handlerOptions.map((h) => ({
              label: h.name,
              value: h.id,
            }))}
            disabled={!!record}
            showSearch
            filterOption={(input, option) =>
              (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
          />
        </Form.Item>

        <div style={{ marginBottom: 16, fontWeight: 500, fontSize: 14 }}>
          {intl.formatMessage({ id: 'adsRecord.dailyAdsInput' })}
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '12px',
          }}
        >
          {days.map((day) => (
            <Form.Item
              key={day}
              label={`${day}`}
              name={`day${day}Ads`}
              style={{ marginBottom: 12 }}
            >
              <InputNumber
                placeholder="投流金额"
                style={{ width: '100%' }}
                min={0}
                precision={2}
                formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={(value) => Number(value!.replace(/,/g, ''))}
              />
            </Form.Item>
          ))}
        </div>
      </Form>
    </Modal>
  );
};

export default AdsRecordForm;
