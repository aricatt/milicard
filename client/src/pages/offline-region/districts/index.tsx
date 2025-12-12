import type { ProColumns } from '@ant-design/pro-components';
import { ProFormText, ProFormTextArea, ProFormSelect } from '@ant-design/pro-components';
import { Tag } from 'antd';
import React from 'react';
import ListPageTemplate from '@/components/PageTemplates/ListPageTemplate';
import type { BaseItem } from '@/pages/live-base/base-data/bases/data.d';
import { addBase, queryBaseList, updateBase } from '@/pages/live-base/base-data/bases/service';
import { CURRENCY_OPTIONS, getCurrencySymbol } from '@/utils/currency';
import { LANGUAGE_OPTIONS, getLanguageName } from '@/utils/language';
import { useBase, BASE_TYPE_OPTIONS, getBaseTypeLabel, BaseType } from '@/contexts/BaseContext';
import { useIntl } from '@umijs/max';

/**
 * 大区管理页面
 * 复用基地列表组件，只显示线下基地类型
 */
const DistrictsPage: React.FC = () => {
  const { refreshBaseList } = useBase();
  const intl = useIntl();
  
  const columns: ProColumns<BaseItem>[] = [
    {
      title: 'ID',
      dataIndex: 'id',
      width: 60,
      search: false,
    },
    {
      title: intl.formatMessage({ id: 'districts.column.code' }),
      dataIndex: 'code',
      width: 150,
      copyable: true,
      ellipsis: true,
    },
    {
      title: intl.formatMessage({ id: 'districts.column.name' }),
      dataIndex: 'name',
      width: 150,
      ellipsis: true,
    },
    {
      title: intl.formatMessage({ id: 'bases.column.currency' }),
      dataIndex: 'currency',
      width: 100,
      search: false,
      render: (_, record) => (
        <Tag color="blue">
          {getCurrencySymbol(record.currency)} {record.currency}
        </Tag>
      ),
    },
    {
      title: intl.formatMessage({ id: 'bases.column.language' }),
      dataIndex: 'language',
      width: 100,
      search: false,
      render: (_, record) => (
        <Tag color="green">{getLanguageName(record.language)}</Tag>
      ),
    },
    {
      title: intl.formatMessage({ id: 'form.label.contactPerson' }),
      dataIndex: 'contactPerson',
      width: 100,
      search: false,
      ellipsis: true,
    },
    {
      title: intl.formatMessage({ id: 'form.label.contactPhone' }),
      dataIndex: 'contactPhone',
      width: 120,
      search: false,
      ellipsis: true,
    },
    {
      title: intl.formatMessage({ id: 'table.column.status' }),
      dataIndex: 'isActive',
      width: 80,
      search: false,
      render: (_, record) => (
        <Tag color={record.isActive ? 'success' : 'default'}>
          {record.isActive ? intl.formatMessage({ id: 'status.enabled' }) : intl.formatMessage({ id: 'status.disabled' })}
        </Tag>
      ),
    },
    {
      title: intl.formatMessage({ id: 'table.column.createdAt' }),
      dataIndex: 'createdAt',
      width: 160,
      valueType: 'dateTime',
      search: false,
    },
  ];

  // 添加表单字段（不包含类型选择，固定为线下基地）
  const addFormFields = (
    <>
      <ProFormText
        rules={[{ required: true, message: intl.formatMessage({ id: 'districts.form.nameRequired' }) }]}
        label={intl.formatMessage({ id: 'districts.column.name' })}
        name="name"
        placeholder={intl.formatMessage({ id: 'districts.form.namePlaceholder' })}
      />
      <ProFormTextArea
        label={intl.formatMessage({ id: 'form.label.description' })}
        name="description"
        placeholder={intl.formatMessage({ id: 'districts.form.descPlaceholder' })}
        fieldProps={{ rows: 2 }}
      />
      <ProFormText
        label={intl.formatMessage({ id: 'form.label.address' })}
        name="address"
        placeholder={intl.formatMessage({ id: 'districts.form.addressPlaceholder' })}
      />
      <ProFormText
        label={intl.formatMessage({ id: 'form.label.contactPerson' })}
        name="contactPerson"
        placeholder={intl.formatMessage({ id: 'form.placeholder.contactPerson' })}
      />
      <ProFormText
        label={intl.formatMessage({ id: 'form.label.contactPhone' })}
        name="contactPhone"
        placeholder={intl.formatMessage({ id: 'form.placeholder.contactPhone' })}
      />
      <ProFormSelect
        label={intl.formatMessage({ id: 'bases.column.currency' })}
        name="currency"
        placeholder={intl.formatMessage({ id: 'form.placeholder.currency' })}
        options={CURRENCY_OPTIONS}
        rules={[{ required: true, message: intl.formatMessage({ id: 'form.validation.currencyRequired' }) }]}
      />
      <ProFormSelect
        label={intl.formatMessage({ id: 'bases.column.language' })}
        name="language"
        placeholder={intl.formatMessage({ id: 'form.placeholder.language' })}
        options={LANGUAGE_OPTIONS}
        rules={[{ required: true, message: intl.formatMessage({ id: 'form.validation.languageRequired' }) }]}
      />
    </>
  );

  // 更新表单字段
  const updateFormFields = (
    <>
      <ProFormText
        label={intl.formatMessage({ id: 'districts.column.code' })}
        name="code"
        disabled
        extra={intl.formatMessage({ id: 'form.hint.codeReadonly' })}
      />
      <ProFormText
        rules={[{ required: true, message: intl.formatMessage({ id: 'districts.form.nameRequired' }) }]}
        label={intl.formatMessage({ id: 'districts.column.name' })}
        name="name"
        placeholder={intl.formatMessage({ id: 'districts.form.namePlaceholder' })}
      />
      <ProFormTextArea
        label={intl.formatMessage({ id: 'form.label.description' })}
        name="description"
        placeholder={intl.formatMessage({ id: 'districts.form.descPlaceholder' })}
        fieldProps={{ rows: 2 }}
      />
      <ProFormText
        label={intl.formatMessage({ id: 'form.label.address' })}
        name="address"
        placeholder={intl.formatMessage({ id: 'districts.form.addressPlaceholder' })}
      />
      <ProFormText
        label={intl.formatMessage({ id: 'form.label.contactPerson' })}
        name="contactPerson"
        placeholder={intl.formatMessage({ id: 'form.placeholder.contactPerson' })}
      />
      <ProFormText
        label={intl.formatMessage({ id: 'form.label.contactPhone' })}
        name="contactPhone"
        placeholder={intl.formatMessage({ id: 'form.placeholder.contactPhone' })}
      />
      <ProFormSelect
        label={intl.formatMessage({ id: 'bases.column.currency' })}
        name="currency"
        placeholder={intl.formatMessage({ id: 'form.placeholder.currency' })}
        options={CURRENCY_OPTIONS}
        rules={[{ required: true, message: intl.formatMessage({ id: 'form.validation.currencyRequired' }) }]}
      />
      <ProFormSelect
        label={intl.formatMessage({ id: 'bases.column.language' })}
        name="language"
        placeholder={intl.formatMessage({ id: 'form.placeholder.language' })}
        options={LANGUAGE_OPTIONS}
        rules={[{ required: true, message: intl.formatMessage({ id: 'form.validation.languageRequired' }) }]}
      />
    </>
  );

  return (
    <ListPageTemplate<BaseItem>
      headerTitle={intl.formatMessage({ id: 'list.title.districts' })}
      columns={columns}
      request={async (params) => {
        const response = await queryBaseList({
          current: params.current,
          pageSize: params.pageSize,
          name: params.name,
          code: params.code,
          type: BaseType.OFFLINE_REGION, // 只显示线下基地类型
        });
        return {
          data: response.data,
          success: response.success,
          total: response.total,
        };
      }}
      onAdd={async (fields) => {
        // 强制设置类型为线下基地
        await addBase({ ...fields, type: BaseType.OFFLINE_REGION });
        await refreshBaseList();
        return true;
      }}
      onUpdate={async (fields) => {
        await updateBase(fields.id, fields);
        await refreshBaseList();
        return true;
      }}
      addFormFields={addFormFields}
      updateFormFields={updateFormFields}
      addFormInitialValues={{
        type: BaseType.OFFLINE_REGION,
        currency: 'CNY',
        language: 'zh-CN',
      }}
      rowKey="id"
    />
  );
};

export default DistrictsPage;
