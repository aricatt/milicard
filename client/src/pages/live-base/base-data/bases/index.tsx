import type { ProColumns } from '@ant-design/pro-components';
import { ProFormText, ProFormTextArea, ProFormSelect } from '@ant-design/pro-components';
import { Tag } from 'antd';
import React from 'react';
import ListPageTemplate from '@/components/PageTemplates/ListPageTemplate';
import type { BaseItem } from './data.d';
import { addBase, queryBaseList, updateBase } from './service';
import { CURRENCY_OPTIONS, getCurrencySymbol } from '@/utils/currency';
import { LANGUAGE_OPTIONS, getLanguageName } from '@/utils/language';

const BaseList: React.FC = () => {
  const columns: ProColumns<BaseItem>[] = [
    {
      title: 'ID',
      dataIndex: 'id',
      width: 60,
      search: false,
    },
    {
      title: '编号',
      dataIndex: 'code',
      width: 150,
      copyable: true,
      ellipsis: true,
    },
    {
      title: '名称',
      dataIndex: 'name',
      width: 150,
      ellipsis: true,
    },
    {
      title: '货币',
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
      title: '语言',
      dataIndex: 'language',
      width: 100,
      search: false,
      render: (_, record) => (
        <Tag color="green">{getLanguageName(record.language)}</Tag>
      ),
    },
    {
      title: '联系人',
      dataIndex: 'contactPerson',
      width: 100,
      search: false,
      ellipsis: true,
    },
    {
      title: '联系电话',
      dataIndex: 'contactPhone',
      width: 120,
      search: false,
      ellipsis: true,
    },
    {
      title: '状态',
      dataIndex: 'isActive',
      width: 80,
      search: false,
      render: (_, record) => (
        <Tag color={record.isActive ? 'success' : 'default'}>
          {record.isActive ? '启用' : '停用'}
        </Tag>
      ),
    },
    {
      title: '创建时间',
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
        initialValue="CNY"
        rules={[{ required: true, message: '请选择货币' }]}
        extra="选择该基地使用的货币单位"
      />
      <ProFormSelect
        label="语言"
        name="language"
        placeholder="请选择语言"
        options={LANGUAGE_OPTIONS}
        initialValue="zh-CN"
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
      title="基地管理"
      subTitle="管理系统中的所有直播基地信息"
      headerTitle="基地列表"
      columns={columns}
      request={async (params) => {
        const response = await queryBaseList({
          current: params.current,
          pageSize: params.pageSize,
          name: params.name,
          code: params.code,
        });
        return {
          data: response.data,
          success: response.success,
          total: response.total,
        };
      }}
      onAdd={async (fields) => {
        await addBase(fields);
        return true;
      }}
      onUpdate={async (fields) => {
        await updateBase(fields.id, fields);
        return true;
      }}
      addFormFields={addFormFields}
      updateFormFields={updateFormFields}
      rowKey="id"
    />
  );
};

export default BaseList;
