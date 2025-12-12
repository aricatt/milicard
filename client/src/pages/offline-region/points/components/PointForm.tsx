import React, { useEffect, useState } from 'react';
import { Modal, Form, Input, Select, Switch, App } from 'antd';
import { request, useIntl } from '@umijs/max';

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
  const intl = useIntl();
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
      console.error(intl.formatMessage({ id: 'points.message.fetchUsersFailed' }), error);
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
        message.success(intl.formatMessage({ id: 'points.message.updateSuccess' }));
      } else {
        // 创建
        await request(`/api/v1/bases/${baseId}/points`, {
          method: 'POST',
          data: values,
        });
        message.success(intl.formatMessage({ id: 'points.message.createSuccess' }));
      }

      onSuccess();
    } catch (error: any) {
      if (error?.data?.message) {
        message.error(error.data.message);
      } else if (error?.errorFields) {
        // 表单验证错误，不需要额外提示
      } else {
        message.error(intl.formatMessage({ id: 'points.message.operationFailed' }));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={editingPoint ? intl.formatMessage({ id: 'points.form.title.edit' }) : intl.formatMessage({ id: 'points.form.title.add' })}
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
          label={intl.formatMessage({ id: 'points.form.name' })}
          rules={[{ required: true, message: intl.formatMessage({ id: 'points.form.nameRequired' }) }]}
        >
          <Input placeholder={intl.formatMessage({ id: 'points.form.namePlaceholder' })} />
        </Form.Item>

        <Form.Item
          name="address"
          label={intl.formatMessage({ id: 'points.form.address' })}
        >
          <Input.TextArea rows={2} placeholder={intl.formatMessage({ id: 'points.form.addressPlaceholder' })} />
        </Form.Item>

        <Form.Item
          name="contactPerson"
          label={intl.formatMessage({ id: 'points.form.contactPerson' })}
        >
          <Input placeholder={intl.formatMessage({ id: 'points.form.contactPersonPlaceholder' })} />
        </Form.Item>

        <Form.Item
          name="contactPhone"
          label={intl.formatMessage({ id: 'points.form.contactPhone' })}
        >
          <Input placeholder={intl.formatMessage({ id: 'points.form.contactPhonePlaceholder' })} />
        </Form.Item>

        <Form.Item
          name="ownerId"
          label={intl.formatMessage({ id: 'points.form.owner' })}
          tooltip={intl.formatMessage({ id: 'points.form.ownerTooltip' })}
        >
          <Select
            placeholder={intl.formatMessage({ id: 'points.form.ownerPlaceholder' })}
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
          label={intl.formatMessage({ id: 'points.form.dealer' })}
          tooltip={intl.formatMessage({ id: 'points.form.dealerTooltip' })}
        >
          <Select
            placeholder={intl.formatMessage({ id: 'points.form.dealerPlaceholder' })}
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
          label={intl.formatMessage({ id: 'points.form.notes' })}
        >
          <Input.TextArea rows={2} placeholder={intl.formatMessage({ id: 'points.form.notesPlaceholder' })} />
        </Form.Item>

        {editingPoint && (
          <Form.Item
            name="isActive"
            label={intl.formatMessage({ id: 'points.form.status' })}
            valuePropName="checked"
          >
            <Switch checkedChildren={intl.formatMessage({ id: 'points.form.statusEnabled' })} unCheckedChildren={intl.formatMessage({ id: 'points.form.statusDisabled' })} />
          </Form.Item>
        )}
      </Form>
    </Modal>
  );
};

export default PointForm;
