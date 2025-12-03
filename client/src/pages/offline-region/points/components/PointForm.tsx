import React, { useEffect, useState } from 'react';
import { Modal, Form, Input, Select, Switch, App } from 'antd';
import { request } from '@umijs/max';

interface PointFormProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingPoint: any | null;
  baseId?: number;
}

interface UserOption {
  id: string;
  username: string;
  name: string;
  phone?: string;
}

const PointForm: React.FC<PointFormProps> = ({
  visible,
  onClose,
  onSuccess,
  editingPoint,
  baseId,
}) => {
  const [form] = Form.useForm();
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // 获取可选用户列表
  const fetchUsers = async () => {
    if (!baseId) return;
    
    setLoadingUsers(true);
    try {
      const response = await request(`/api/v1/bases/${baseId}/points/available-users`);
      setUsers(response.data || []);
    } catch (error) {
      console.error('获取用户列表失败', error);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (visible) {
      fetchUsers();
      if (editingPoint) {
        form.setFieldsValue({
          name: editingPoint.name,
          address: editingPoint.address,
          contactPerson: editingPoint.contactPerson,
          contactPhone: editingPoint.contactPhone,
          ownerId: editingPoint.ownerId,
          dealerId: editingPoint.dealerId,
          notes: editingPoint.notes,
          isActive: editingPoint.isActive,
        });
      } else {
        form.resetFields();
        form.setFieldsValue({ isActive: true });
      }
    }
  }, [visible, editingPoint, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      if (editingPoint) {
        // 更新
        await request(`/api/v1/bases/${baseId}/points/${editingPoint.id}`, {
          method: 'PUT',
          data: values,
        });
        message.success('更新成功');
      } else {
        // 创建
        await request(`/api/v1/bases/${baseId}/points`, {
          method: 'POST',
          data: values,
        });
        message.success('创建成功');
      }

      onSuccess();
    } catch (error: any) {
      if (error?.data?.message) {
        message.error(error.data.message);
      } else if (error?.errorFields) {
        // 表单验证错误，不需要额外提示
      } else {
        message.error('操作失败');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={editingPoint ? '编辑点位' : '新建点位'}
      open={visible}
      onCancel={onClose}
      onOk={handleSubmit}
      confirmLoading={loading}
      width={600}
      destroyOnHidden
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{ isActive: true }}
      >
        <Form.Item
          name="name"
          label="店铺名称"
          rules={[{ required: true, message: '请输入店铺名称' }]}
        >
          <Input placeholder="请输入店铺名称" />
        </Form.Item>

        <Form.Item
          name="address"
          label="地址"
        >
          <Input.TextArea rows={2} placeholder="请输入详细地址" />
        </Form.Item>

        <Form.Item
          name="contactPerson"
          label="联系人"
        >
          <Input placeholder="请输入联系人姓名" />
        </Form.Item>

        <Form.Item
          name="contactPhone"
          label="联系电话"
        >
          <Input placeholder="请输入联系电话" />
        </Form.Item>

        <Form.Item
          name="ownerId"
          label="点位老板"
          tooltip="选择负责该点位的老板账号"
        >
          <Select
            placeholder="请选择点位老板"
            allowClear
            showSearch
            loading={loadingUsers}
            optionFilterProp="label"
            options={users.map((user) => ({
              value: user.id,
              label: `${user.name} (${user.username})${user.phone ? ` - ${user.phone}` : ''}`,
            }))}
          />
        </Form.Item>

        <Form.Item
          name="dealerId"
          label="经销商"
          tooltip="选择负责该点位的经销商账号"
        >
          <Select
            placeholder="请选择经销商"
            allowClear
            showSearch
            loading={loadingUsers}
            optionFilterProp="label"
            options={users.map((user) => ({
              value: user.id,
              label: `${user.name} (${user.username})${user.phone ? ` - ${user.phone}` : ''}`,
            }))}
          />
        </Form.Item>

        <Form.Item
          name="notes"
          label="备注"
        >
          <Input.TextArea rows={2} placeholder="请输入备注信息" />
        </Form.Item>

        {editingPoint && (
          <Form.Item
            name="isActive"
            label="状态"
            valuePropName="checked"
          >
            <Switch checkedChildren="启用" unCheckedChildren="停用" />
          </Form.Item>
        )}
      </Form>
    </Modal>
  );
};

export default PointForm;
