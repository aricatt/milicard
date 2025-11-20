import type { ProColumns } from '@ant-design/pro-components';
import { ProFormText } from '@ant-design/pro-components';
import React from 'react';
import ListPageTemplate from '@/components/PageTemplates/ListPageTemplate';
import type { BaseItem } from './data.d';
import { addBase, removeBase, queryBaseList, updateBase } from './service';

const BaseList: React.FC = () => {
  const columns: ProColumns<BaseItem>[] = [
    {
      title: 'ID',
      dataIndex: 'id',
      width: 80,
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
      width: 200,
      ellipsis: true,
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      width: 180,
      valueType: 'dateTime',
      search: false,
    },
  ];

  const formFields = (
    <>
      <ProFormText
        rules={[
          {
            required: true,
            message: '基地编号为必填项',
          },
        ]}
        label="基地编号"
        name="code"
        placeholder="请输入基地编号，如：BASE-83Q6731DP7J"
      />
      <ProFormText
        rules={[
          {
            required: true,
            message: '基地名称为必填项',
          },
        ]}
        label="基地名称"
        name="name"
        placeholder="请输入基地名称，如：杭州基地"
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
      onDelete={async (id) => {
        await removeBase(id as number);
        return true;
      }}
      addFormFields={formFields}
      updateFormFields={formFields}
      rowKey="id"
    />
  );
};

export default BaseList;
