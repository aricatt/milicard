/**
 * 字段权限调试面板
 * 仅在开发环境下显示，用于调试字段权限配置
 */
import React, { useState } from 'react';
import { Card, Tag, Collapse, Button, Space } from 'antd';
import { BugOutlined, EyeOutlined, EyeInvisibleOutlined } from '@ant-design/icons';

const { Panel } = Collapse;

interface FieldPermissionDebugInfo {
  readable: string[];
  writable: string[];
  resource?: string;
  relatedResources?: string[];
  message: string;
}

interface Props {
  debugInfo?: FieldPermissionDebugInfo;
  actualFields?: string[];
  apiPath?: string;
}

const FieldPermissionDebugPanel: React.FC<Props> = ({ debugInfo, actualFields, apiPath }) => {
  const [visible, setVisible] = useState(true);

  // 仅在开发环境下显示
  if (process.env.NODE_ENV !== 'development' || !debugInfo) {
    return null;
  }

  if (!visible) {
    return (
      <Button
        type="dashed"
        icon={<BugOutlined />}
        onClick={() => setVisible(true)}
        style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 1000 }}
      >
        显示字段权限调试
      </Button>
    );
  }

  // 检查哪些字段被过滤掉了
  const filteredOutFields = actualFields
    ? actualFields.filter(f => !debugInfo.readable.includes(f) && f !== 'id')
    : [];

  // 检查哪些字段应该被过滤但没有被过滤
  const shouldBeFilteredFields = actualFields
    ? actualFields.filter(f => !debugInfo.readable.includes(f) && !debugInfo.readable.includes('*') && f !== 'id')
    : [];

  return (
    <Card
      title={
        <Space>
          <BugOutlined />
          字段权限调试面板
          <Tag color="orange">开发环境</Tag>
        </Space>
      }
      extra={
        <Button
          size="small"
          icon={<EyeInvisibleOutlined />}
          onClick={() => setVisible(false)}
        >
          隐藏
        </Button>
      }
      style={{
        position: 'fixed',
        bottom: 20,
        right: 20,
        width: 500,
        maxHeight: '80vh',
        overflow: 'auto',
        zIndex: 1000,
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      }}
      size="small"
    >
      <Collapse defaultActiveKey={['1']} size="small">
        <Panel header="基本信息" key="1">
          <div style={{ fontSize: 12 }}>
            <div><strong>API路径:</strong> {apiPath || '未知'}</div>
            <div><strong>资源:</strong> {debugInfo.resource || '未知'}</div>
            {debugInfo.relatedResources && debugInfo.relatedResources.length > 0 && (
              <div>
                <strong>关联资源:</strong>{' '}
                {debugInfo.relatedResources.map(r => (
                  <Tag key={r} color="blue" style={{ marginTop: 4 }}>
                    {r}
                  </Tag>
                ))}
              </div>
            )}
            <div style={{ marginTop: 8, color: '#666' }}>{debugInfo.message}</div>
          </div>
        </Panel>

        <Panel header={`可读字段 (${debugInfo.readable.length})`} key="2">
          <div style={{ maxHeight: 200, overflow: 'auto' }}>
            {debugInfo.readable.includes('*') ? (
              <Tag color="green">* (所有字段)</Tag>
            ) : (
              debugInfo.readable.map(field => (
                <Tag key={field} color="green" style={{ marginBottom: 4 }}>
                  {field}
                </Tag>
              ))
            )}
          </div>
        </Panel>

        <Panel header={`可写字段 (${debugInfo.writable.length})`} key="3">
          <div style={{ maxHeight: 200, overflow: 'auto' }}>
            {debugInfo.writable.includes('*') ? (
              <Tag color="blue">* (所有字段)</Tag>
            ) : (
              debugInfo.writable.map(field => (
                <Tag key={field} color="blue" style={{ marginBottom: 4 }}>
                  {field}
                </Tag>
              ))
            )}
          </div>
        </Panel>

        {actualFields && actualFields.length > 0 && (
          <Panel header={`实际返回字段 (${actualFields.length})`} key="4">
            <div style={{ maxHeight: 200, overflow: 'auto' }}>
              {actualFields.map(field => {
                const isReadable = debugInfo.readable.includes(field) || debugInfo.readable.includes('*');
                const isId = field === 'id';
                return (
                  <Tag
                    key={field}
                    color={isId ? 'default' : isReadable ? 'green' : 'red'}
                    style={{ marginBottom: 4 }}
                  >
                    {field}
                    {!isReadable && !isId && ' ⚠️'}
                  </Tag>
                );
              })}
            </div>
          </Panel>
        )}

        {shouldBeFilteredFields.length > 0 && (
          <Panel
            header={
              <span style={{ color: '#ff4d4f' }}>
                ⚠️ 权限异常字段 ({shouldBeFilteredFields.length})
              </span>
            }
            key="5"
          >
            <div style={{ fontSize: 12, color: '#ff4d4f' }}>
              <div style={{ marginBottom: 8 }}>
                这些字段不在可读列表中，但仍然被返回了：
              </div>
              {shouldBeFilteredFields.map(field => (
                <Tag key={field} color="red" style={{ marginBottom: 4 }}>
                  {field}
                </Tag>
              ))}
              <div style={{ marginTop: 8, color: '#666' }}>
                可能原因：
                <ul style={{ marginTop: 4, paddingLeft: 20 }}>
                  <li>关联资源的字段权限配置不当</li>
                  <li>字段权限合并逻辑有问题</li>
                  <li>数据库中有历史遗留的字段权限配置</li>
                </ul>
              </div>
            </div>
          </Panel>
        )}
      </Collapse>
    </Card>
  );
};

export default FieldPermissionDebugPanel;
