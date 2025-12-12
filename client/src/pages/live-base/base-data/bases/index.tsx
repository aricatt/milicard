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
        rules={[{ required: true, message: '基地名称为必填项' }]}
        label="基地名称"
        name="name"
        placeholder="请输入基地名称，如：杭州基地"
        extra="基地编号将自动生成（格式：BASE-XXXXXXXXXXX）"
      />
      <ProFormSelect
        label="基地类型"
        name="type"
        placeholder="请选择基地类型"
        options={BASE_TYPE_OPTIONS}
        rules={[{ required: true, message: '请选择基地类型' }]}
        extra="直播基地用于直播电商管理，线下区域用于线下市场管理"
      />
      <ProFormTextArea
        label="描述"
        name="description"
        placeholder="请输入基地描述"
        fieldProps={{ rows: 2 }}
      />
      <ProFormText
        label="地址"
        name="address"
        placeholder="请输入基地地址"
      />
      <ProFormText
        label="联系人"
        name="contactPerson"
        placeholder="请输入联系人姓名"
      />
      <ProFormText
        label="联系电话"
        name="contactPhone"
        placeholder="请输入联系电话"
      />
      <ProFormSelect
        label="货币"
        name="currency"
        placeholder="请选择货币"
        options={CURRENCY_OPTIONS}
        rules={[{ required: true, message: '请选择货币' }]}
        extra="选择该基地使用的货币单位"
      />
      <ProFormSelect
        label="语言"
        name="language"
        placeholder="请选择语言"
        options={LANGUAGE_OPTIONS}
        rules={[{ required: true, message: '请选择语言' }]}
        extra="选择该基地的默认显示语言"
      />
    </>
  );

  const updateFormFields = (
    <>
      <ProFormText
        label="基地编号"
        name="code"
        disabled
        extra="编号创建后不可修改"
      />
      <ProFormText
        rules={[{ required: true, message: '基地名称为必填项' }]}
        label="基地名称"
        name="name"
        placeholder="请输入基地名称"
      />
      <ProFormSelect
        label="基地类型"
        name="type"
        placeholder="请选择基地类型"
        options={BASE_TYPE_OPTIONS}
        rules={[{ required: true, message: '请选择基地类型' }]}
        extra="基地类型创建后不建议修改"
      />
      <ProFormTextArea
        label="描述"
        name="description"
        placeholder="请输入基地描述"
        fieldProps={{ rows: 2 }}
      />
      <ProFormText
        label="地址"
        name="address"
        placeholder="请输入基地地址"
      />
      <ProFormText
        label="联系人"
        name="contactPerson"
        placeholder="请输入联系人姓名"
      />
      <ProFormText
        label="联系电话"
        name="contactPhone"
        placeholder="请输入联系电话"
      />
      <ProFormSelect
        label="货币"
        name="currency"
        placeholder="请选择货币"
        options={CURRENCY_OPTIONS}
        rules={[{ required: true, message: '请选择货币' }]}
      />
      <ProFormSelect
        label="语言"
        name="language"
        placeholder="请选择语言"
        options={LANGUAGE_OPTIONS}
        rules={[{ required: true, message: '请选择语言' }]}
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
