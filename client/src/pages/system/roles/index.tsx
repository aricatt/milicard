import React, { useState, useEffect } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { Card, Table, Tag, Typography, Alert } from 'antd';
import { request } from '@umijs/max';

const { Text } = Typography;

interface RoleItem {
  id: string;
  name: string;
  description?: string;
  isSystem: boolean;
  createdAt: string;
}

// 角色名称映射
const getRoleLabel = (roleName: string) => {
  const roleMap: Record<string, { label: string; color: string }> = {
    ADMIN: { label: '系统管理员', color: 'red' },
    BASE_MANAGER: { label: '基地管理员', color: 'blue' },
    POINT_OWNER: { label: '点位老板', color: 'green' },
    CUSTOMER_SERVICE: { label: '客服', color: 'orange' },
    WAREHOUSE_KEEPER: { label: '仓管', color: 'purple' },
  };
  return roleMap[roleName] || { label: roleName, color: 'default' };
};

const RolesPage: React.FC = () => {
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchRoles = async () => {
    setLoading(true);
    try {
      const result = await request('/api/v1/roles', { method: 'GET' });
      if (result.success) {
        setRoles(result.data || []);
      }
    } catch (error) {
      console.error('获取角色列表失败', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  const columns = [
    {
      title: '角色标识',
      dataIndex: 'name',
      key: 'name',
      width: 150,
    },
    {
      title: '角色名称',
      dataIndex: 'name',
      key: 'label',
      width: 150,
      render: (name: string) => {
        const { label, color } = getRoleLabel(name);
        return <Tag color={color}>{label}</Tag>;
      },
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '类型',
      dataIndex: 'isSystem',
      key: 'isSystem',
      width: 100,
      render: (isSystem: boolean) =>
        isSystem ? <Tag color="blue">系统角色</Tag> : <Tag>自定义角色</Tag>,
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (date: string) => new Date(date).toLocaleString(),
    },
  ];

  return (
    <PageContainer header={{ title: '角色管理' }}>
      <Alert
        message="角色管理功能开发中"
        description="当前使用预置角色数据，角色的新增、编辑、删除功能将在后续版本中提供。"
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <Card>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={roles}
          loading={loading}
          pagination={false}
        />
      </Card>

      <Card title="角色说明" style={{ marginTop: 16 }}>
        <ul>
          <li>
            <Text strong>系统管理员 (ADMIN)</Text>：拥有系统所有权限，可以管理用户、角色、基地等
          </li>
          <li>
            <Text strong>基地管理员 (BASE_MANAGER)</Text>：管理特定基地的所有业务
          </li>
          <li>
            <Text strong>点位老板 (POINT_OWNER)</Text>：管理自己的点位，可以下单采购
          </li>
          <li>
            <Text strong>客服 (CUSTOMER_SERVICE)</Text>：处理点位订单，管理发货配送
          </li>
          <li>
            <Text strong>仓管 (WAREHOUSE_KEEPER)</Text>：管理仓库库存，处理到货和调货
          </li>
        </ul>
      </Card>
    </PageContainer>
  );
};

export default RolesPage;
