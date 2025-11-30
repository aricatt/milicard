import { PlusOutlined } from '@ant-design/icons';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import {
  ModalForm,
  PageContainer,
  ProTable,
} from '@ant-design/pro-components';
import { App, Button, Popconfirm } from 'antd';
import React, { useRef, useState } from 'react';

export interface ListPageTemplateProps<T> {
  title: string;
  subTitle?: string;
  headerTitle: string;
  columns: ProColumns<T>[];
  request: (params: any) => Promise<{ data: T[]; total: number; success: boolean }>;
  onAdd?: (fields: any) => Promise<boolean>;
  onUpdate?: (fields: T) => Promise<boolean>;
  onDelete?: (id: number | string) => Promise<boolean>;
  addFormFields?: React.ReactNode;
  updateFormFields?: React.ReactNode;
  addFormInitialValues?: Record<string, any>;
  rowKey?: string;
  searchConfig?: {
    labelWidth?: number;
  };
}

/**
 * 通用列表页面模板
 */
function ListPageTemplate<T extends Record<string, any>>({
  title,
  subTitle,
  headerTitle,
  columns,
  request,
  onAdd,
  onUpdate,
  onDelete,
  addFormFields,
  updateFormFields,
  addFormInitialValues,
  rowKey = 'id',
  searchConfig = { labelWidth: 120 },
}: ListPageTemplateProps<T>) {
  const { message } = App.useApp();
  const [createModalOpen, handleModalOpen] = useState<boolean>(false);
  const [updateModalOpen, handleUpdateModalOpen] = useState<boolean>(false);
  const [currentRow, setCurrentRow] = useState<T>();
  const actionRef = useRef<ActionType>();

  const handleAdd = async (fields: any) => {
    if (!onAdd) return false;
    console.log('handleAdd fields:', fields);
    const hide = message.loading('正在添加');
    try {
      const success = await onAdd(fields);
      hide();
      if (success) {
        message.success('添加成功');
        return true;
      }
      return false;
    } catch (error) {
      hide();
      message.error('添加失败请重试！');
      return false;
    }
  };

  const handleUpdate = async (fields: T) => {
    if (!onUpdate) return false;
    console.log('handleUpdate fields:', fields);
    const hide = message.loading('正在更新');
    try {
      const success = await onUpdate(fields);
      hide();
      if (success) {
        message.success('更新成功');
        return true;
      }
      return false;
    } catch (error) {
      hide();
      message.error('更新失败请重试！');
      return false;
    }
  };

  const handleRemove = async (id: number | string) => {
    if (!onDelete) return false;
    const hide = message.loading('正在删除');
    try {
      const success = await onDelete(id);
      hide();
      if (success) {
        message.success('删除成功');
        return true;
      }
      return false;
    } catch (error) {
      hide();
      message.error('删除失败请重试！');
      return false;
    }
  };

  // 为列添加操作列
  const finalColumns: ProColumns<T>[] = [
    ...columns,
    {
      title: '操作',
      dataIndex: 'option',
      valueType: 'option',
      width: 150,
      render: (_, record) => {
        const actions = [];
        
        if (onUpdate && updateFormFields) {
          actions.push(
            <Button
              key="edit"
              type="link"
              size="small"
              onClick={() => {
                setCurrentRow(record);
                handleUpdateModalOpen(true);
              }}
            >
              编辑
            </Button>
          );
        }

        if (onDelete) {
          actions.push(
            <Popconfirm
              key="delete"
              title="确定删除这条记录吗？"
              onConfirm={async () => {
                const success = await handleRemove(record[rowKey]);
                if (success) {
                  actionRef.current?.reload();
                }
              }}
              okText="确定"
              cancelText="取消"
            >
              <Button type="link" size="small" danger>
                删除
              </Button>
            </Popconfirm>
          );
        }

        return actions;
      },
    },
  ];

  return (
    <PageContainer
      header={{
        title,
        subTitle,
      }}
    >
      <ProTable<T>
        headerTitle={headerTitle}
        actionRef={actionRef}
        rowKey={rowKey}
        search={searchConfig}
        toolBarRender={() => {
          const tools = [];
          if (onAdd && addFormFields) {
            tools.push(
              <Button
                type="primary"
                key="primary"
                onClick={() => {
                  handleModalOpen(true);
                }}
              >
                <PlusOutlined /> 添加
              </Button>
            );
          }
          return tools;
        }}
        request={request}
        columns={finalColumns}
        pagination={{
          defaultPageSize: 10,
          showSizeChanger: true,
        }}
      />

      {/* 添加弹窗 */}
      {onAdd && addFormFields && (
        <ModalForm
          title="添加"
          width="400px"
          open={createModalOpen}
          onOpenChange={handleModalOpen}
          initialValues={addFormInitialValues}
          onFinish={async (value) => {
            const success = await handleAdd(value);
            if (success) {
              handleModalOpen(false);
              if (actionRef.current) {
                actionRef.current.reload();
              }
            }
          }}
        >
          {addFormFields}
        </ModalForm>
      )}

      {/* 编辑弹窗 */}
      {onUpdate && updateFormFields && currentRow && (
        <ModalForm
          title="编辑"
          width="400px"
          open={updateModalOpen}
          onOpenChange={(open) => {
            handleUpdateModalOpen(open);
            if (!open) {
              setCurrentRow(undefined);
            }
          }}
          initialValues={currentRow}
          key={currentRow?.[rowKey]}
          modalProps={{
            destroyOnHidden: true,
          }}
          onFinish={async (value) => {
            const success = await handleUpdate({ ...currentRow, ...value } as T);
            if (success) {
              handleUpdateModalOpen(false);
              setCurrentRow(undefined);
              if (actionRef.current) {
                actionRef.current.reload();
              }
            }
          }}
        >
          {updateFormFields}
        </ModalForm>
      )}
    </PageContainer>
  );
}

export default ListPageTemplate;
