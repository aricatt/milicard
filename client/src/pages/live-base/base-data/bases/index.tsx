import type { ProColumns } from '@ant-design/pro-components';
import { ProFormText, ProFormTextArea, ProFormSelect } from '@ant-design/pro-components';
import { Tag } from 'antd';
import React from 'react';
import { useIntl } from '@umijs/max';
import ListPageTemplate from '@/components/PageTemplates/ListPageTemplate';
import type { BaseItem } from './data.d';
import { addBase, queryBaseList, updateBase } from './service';
import { CURRENCY_OPTIONS, getCurrencySymbol } from '@/utils/currency';
import { LANGUAGE_OPTIONS, getLanguageName } from '@/utils/language';
import { useBase, BASE_TYPE_OPTIONS, getBaseTypeLabel, BaseType } from '@/contexts/BaseContext';

const BaseList: React.FC = () => {
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
      title: intl.formatMessage({ id: 'table.column.code' }),
      dataIndex: 'code',
      width: 150,
      copyable: true,
      ellipsis: true,
    },
    {
      title: intl.formatMessage({ id: 'table.column.name' }),
      dataIndex: 'name',
      width: 150,
      ellipsis: true,
    },
    {
      title: intl.formatMessage({ id: 'bases.column.type' }),
      dataIndex: 'type',
      width: 100,
      search: false,
      render: (_, record) => (
        <Tag color={record.type === BaseType.LIVE_BASE ? 'blue' : 'orange'}>
          {getBaseTypeLabel(record.type)}
        </Tag>
      ),
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
      title: intl.formatMessage({ id: 'locations.column.contact' }),
      dataIndex: 'contactPerson',
      width: 100,
      search: false,
      ellipsis: true,
    },
    {
      title: intl.formatMessage({ id: 'locations.column.phone' }),
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

  const addFormFields = (
    <>
      <ProFormText
        rules={[{ required: true, message: intl.formatMessage({ id: 'bases.form.nameRequired' }) }]}
        label={intl.formatMessage({ id: 'bases.form.name' })}
        name="name"
        placeholder={intl.formatMessage({ id: 'bases.form.namePlaceholder' })}
        extra={intl.formatMessage({ id: 'bases.form.nameHint' })}
      />
      <ProFormSelect
        label={intl.formatMessage({ id: 'bases.form.type' })}
        name="type"
        placeholder={intl.formatMessage({ id: 'bases.form.typePlaceholder' })}
        options={BASE_TYPE_OPTIONS}
        rules={[{ required: true, message: intl.formatMessage({ id: 'bases.form.typeRequired' }) }]}
        extra={intl.formatMessage({ id: 'bases.form.typeHint' })}
      />
      <ProFormTextArea
        label={intl.formatMessage({ id: 'bases.form.description' })}
        name="description"
        placeholder={intl.formatMessage({ id: 'bases.form.descriptionPlaceholder' })}
        fieldProps={{ rows: 2 }}
      />
      <ProFormText
        label={intl.formatMessage({ id: 'bases.form.address' })}
        name="address"
        placeholder={intl.formatMessage({ id: 'bases.form.addressPlaceholder' })}
      />
      <ProFormText
        label={intl.formatMessage({ id: 'bases.form.contactPerson' })}
        name="contactPerson"
        placeholder={intl.formatMessage({ id: 'bases.form.contactPersonPlaceholder' })}
      />
      <ProFormText
        label={intl.formatMessage({ id: 'bases.form.contactPhone' })}
        name="contactPhone"
        placeholder={intl.formatMessage({ id: 'bases.form.contactPhonePlaceholder' })}
      />
      <ProFormSelect
        label={intl.formatMessage({ id: 'bases.form.currency' })}
        name="currency"
        placeholder={intl.formatMessage({ id: 'bases.form.currencyPlaceholder' })}
        options={CURRENCY_OPTIONS}
        rules={[{ required: true, message: intl.formatMessage({ id: 'bases.form.currencyRequired' }) }]}
        extra={intl.formatMessage({ id: 'bases.form.currencyHint' })}
      />
      <ProFormSelect
        label={intl.formatMessage({ id: 'bases.form.language' })}
        name="language"
        placeholder={intl.formatMessage({ id: 'bases.form.languagePlaceholder' })}
        options={LANGUAGE_OPTIONS}
        rules={[{ required: true, message: intl.formatMessage({ id: 'bases.form.languageRequired' }) }]}
        extra={intl.formatMessage({ id: 'bases.form.languageHint' })}
      />
    </>
  );

  const updateFormFields = (
    <>
      <ProFormText
        label={intl.formatMessage({ id: 'bases.form.code' })}
        name="code"
        disabled
        extra={intl.formatMessage({ id: 'bases.form.codeHint' })}
      />
      <ProFormText
        rules={[{ required: true, message: intl.formatMessage({ id: 'bases.form.nameRequired' }) }]}
        label={intl.formatMessage({ id: 'bases.form.name' })}
        name="name"
        placeholder={intl.formatMessage({ id: 'bases.form.namePlaceholder' })}
      />
      <ProFormSelect
        label={intl.formatMessage({ id: 'bases.form.type' })}
        name="type"
        placeholder={intl.formatMessage({ id: 'bases.form.typePlaceholder' })}
        options={BASE_TYPE_OPTIONS}
        rules={[{ required: true, message: intl.formatMessage({ id: 'bases.form.typeRequired' }) }]}
        extra={intl.formatMessage({ id: 'bases.form.typeEditHint' })}
      />
      <ProFormTextArea
        label={intl.formatMessage({ id: 'bases.form.description' })}
        name="description"
        placeholder={intl.formatMessage({ id: 'bases.form.descriptionPlaceholder' })}
        fieldProps={{ rows: 2 }}
      />
      <ProFormText
        label={intl.formatMessage({ id: 'bases.form.address' })}
        name="address"
        placeholder={intl.formatMessage({ id: 'bases.form.addressPlaceholder' })}
      />
      <ProFormText
        label={intl.formatMessage({ id: 'bases.form.contactPerson' })}
        name="contactPerson"
        placeholder={intl.formatMessage({ id: 'bases.form.contactPersonPlaceholder' })}
      />
      <ProFormText
        label={intl.formatMessage({ id: 'bases.form.contactPhone' })}
        name="contactPhone"
        placeholder={intl.formatMessage({ id: 'bases.form.contactPhonePlaceholder' })}
      />
      <ProFormSelect
        label={intl.formatMessage({ id: 'bases.form.currency' })}
        name="currency"
        placeholder={intl.formatMessage({ id: 'bases.form.currencyPlaceholder' })}
        options={CURRENCY_OPTIONS}
        rules={[{ required: true, message: intl.formatMessage({ id: 'bases.form.currencyRequired' }) }]}
      />
      <ProFormSelect
        label={intl.formatMessage({ id: 'bases.form.language' })}
        name="language"
        placeholder={intl.formatMessage({ id: 'bases.form.languagePlaceholder' })}
        options={LANGUAGE_OPTIONS}
        rules={[{ required: true, message: intl.formatMessage({ id: 'bases.form.languageRequired' }) }]}
      />
    </>
  );

  return (
    <ListPageTemplate<BaseItem>
      headerTitle={intl.formatMessage({ id: 'list.title.bases' })}
      columns={columns}
      request={async (params) => {
        const response = await queryBaseList({
          current: params.current,
          pageSize: params.pageSize,
          name: params.name,
          code: params.code,
          type: BaseType.LIVE_BASE, // 只显示直播基地类型
        });
        return {
          data: response.data,
          success: response.success,
          total: response.total,
        };
      }}
      onAdd={async (fields) => {
        await addBase(fields);
        // 刷新基地列表，确保 Context 中的数据是最新的
        await refreshBaseList();
        return true;
      }}
      onUpdate={async (fields) => {
        await updateBase(fields.id, fields);
        // 刷新基地列表，确保当前基地的货币等设置是最新的
        await refreshBaseList();
        return true;
      }}
      addFormFields={addFormFields}
      updateFormFields={updateFormFields}
      addFormInitialValues={{
        type: BaseType.LIVE_BASE,
        currency: 'CNY',
        language: 'zh-CN',
      }}
      rowKey="id"
    />
  );
};

export default BaseList;
