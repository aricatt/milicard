import React, { useState } from 'react';
import { Button, Dropdown, Space, Typography, Avatar, Modal, App, Tag } from 'antd';
import { SwapOutlined, HomeOutlined, PlusOutlined } from '@ant-design/icons';
import { history } from '@umijs/max';
import { useBase, useBaseCurrency, BaseInfo } from '@/contexts/BaseContext';
import { getCurrencySymbol } from '@/utils/currency';
import type { MenuProps } from 'antd';

const { Text } = Typography;

/**
 * 基地切换器组件
 * 显示当前基地，并提供切换基地的功能
 */
const BaseSwitcher: React.FC = () => {
  // 安全地使用 useBase，如果不在 BaseProvider 中则返回 null
  let currentBase, baseList, setCurrentBase;
  try {
    const baseContext = useBase();
    currentBase = baseContext.currentBase;
    baseList = baseContext.baseList;
    setCurrentBase = baseContext.setCurrentBase;
  } catch (error) {
    // 如果不在 BaseProvider 中，则不显示基地切换器
    return null;
  }
  
  const { message } = App.useApp();
  const [switchModalVisible, setSwitchModalVisible] = useState(false);

  // 切换基地
  const handleSwitchBase = (base: BaseInfo) => {
    setCurrentBase(base);
    message.success(`已切换到基地：${base.name}`);
    setSwitchModalVisible(false);
    
    // 切换后跳转到直播基地概览
    history.push('/live-base/overview');
  };

  // 创建新基地
  const handleCreateNewBase = () => {
    setSwitchModalVisible(false);
    history.push('/base-selector');
  };

  // 构建下拉菜单项
  const menuItems: MenuProps['items'] = [
    ...baseList
      .filter(base => base.id !== currentBase?.id)
      .map(base => ({
        key: base.id,
        label: (
          <div onClick={() => handleSwitchBase(base)}>
            <Space>
              <Avatar size="small" icon={<HomeOutlined />} />
              <div>
                <div>{base.name}</div>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  {base.code}
                </Text>
              </div>
            </Space>
          </div>
        ),
      })),
    {
      type: 'divider',
    },
    {
      key: 'create',
      label: (
        <div onClick={handleCreateNewBase}>
          <Space>
            <PlusOutlined />
            <span>创建新基地</span>
          </Space>
        </div>
      ),
    },
    {
      key: 'manage',
      label: (
        <div onClick={() => setSwitchModalVisible(true)}>
          <Space>
            <SwapOutlined />
            <span>管理基地</span>
          </Space>
        </div>
      ),
    },
  ];

  if (!currentBase) {
    return null;
  }

  return (
    <>
      <Dropdown
        menu={{ items: menuItems }}
        placement="bottomLeft"
        trigger={['click']}
      >
        <Button type="text" style={{ height: 'auto', padding: '4px 12px' }}>
          <Space size={8}>
            <Avatar size="small" icon={<HomeOutlined />} style={{ backgroundColor: '#1890ff' }} />
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '14px', fontWeight: 500, lineHeight: 1.2 }}>
                {currentBase.name}
              </div>
            </div>
            <Tag color="blue" style={{ margin: 0 }}>
              {getCurrencySymbol(currentBase.currency)}
            </Tag>
            <SwapOutlined style={{ fontSize: '12px', color: '#999' }} />
          </Space>
        </Button>
      </Dropdown>

      {/* 基地管理模态框 */}
      <Modal
        title="基地管理"
        open={switchModalVisible}
        onCancel={() => setSwitchModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setSwitchModalVisible(false)}>
            取消
          </Button>,
          <Button key="create" type="primary" icon={<PlusOutlined />} onClick={handleCreateNewBase}>
            创建新基地
          </Button>,
        ]}
        width={600}
      >
        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            {baseList.map(base => (
              <div
                key={base.id}
                style={{
                  padding: '12px',
                  border: '1px solid #f0f0f0',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  backgroundColor: base.id === currentBase?.id ? '#f6ffed' : 'transparent',
                  borderColor: base.id === currentBase?.id ? '#b7eb8f' : '#f0f0f0',
                }}
                onClick={() => handleSwitchBase(base)}
              >
                <Space>
                  <Avatar icon={<HomeOutlined />} />
                  <div>
                    <div style={{ fontWeight: 500 }}>
                      {base.name}
                      {base.id === currentBase?.id && (
                        <Text type="success" style={{ marginLeft: '8px', fontSize: '12px' }}>
                          当前基地
                        </Text>
                      )}
                    </div>
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      编号：{base.code}
                    </Text>
                    {base.description && (
                      <div>
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          {base.description}
                        </Text>
                      </div>
                    )}
                  </div>
                </Space>
              </div>
            ))}
          </Space>
        </div>
      </Modal>
    </>
  );
};

export default BaseSwitcher;
