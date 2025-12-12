/**
 * 通用导入模态框组件
 * 统一商品、采购、到货等页面的导入UI风格
 */
import React from 'react';
import { Modal, Upload, Alert, Spin, Progress, Table, Typography, Divider } from 'antd';
import { InboxOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import type { UploadProps } from 'antd';

const { Text } = Typography;

/** 字段说明类型 */
export interface FieldDescription {
  /** 字段名称（Excel列名） */
  field: string;
  /** 是否必填 */
  required: boolean;
  /** 字段说明 */
  description: string;
  /** 示例值 */
  example?: string;
}

export interface ImportModalProps {
  /** 模态框标题 */
  title: string;
  /** 是否显示 */
  open: boolean;
  /** 关闭回调 */
  onCancel: () => void;
  /** 是否正在导入 */
  loading: boolean;
  /** 导入进度 0-100 */
  progress?: number;
  /** 导入处理函数 */
  onImport: UploadProps['customRequest'];
  /** 下载模板函数 */
  onDownloadTemplate?: () => void;
  /** 导入说明列表（简单模式） */
  tips?: string[];
  /** 字段说明列表（详细模式，优先级高于tips） */
  fields?: FieldDescription[];
  /** 模态框宽度 */
  width?: number;
}

const ImportModal: React.FC<ImportModalProps> = ({
  title,
  open,
  onCancel,
  loading,
  progress = 0,
  onImport,
  tips = [],
  fields = [],
  width = 600,
}) => {
  // 字段说明表格列定义
  const fieldColumns = [
    {
      title: '字段名',
      dataIndex: 'field',
      key: 'field',
      width: 120,
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: '必填',
      dataIndex: 'required',
      key: 'required',
      width: 60,
      align: 'center' as const,
      render: (required: boolean) => required ? (
        <CheckCircleOutlined style={{ color: '#ff4d4f' }} />
      ) : (
        <CloseCircleOutlined style={{ color: '#d9d9d9' }} />
      ),
    },
    {
      title: '说明',
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: '示例',
      dataIndex: 'example',
      key: 'example',
      width: 120,
      render: (text: string) => text ? <Text code>{text}</Text> : '-',
    },
  ];

  return (
    <Modal
      title={title}
      open={open}
      onCancel={() => {
        if (!loading) {
          onCancel();
        }
      }}
      footer={null}
      width={width}
      closable={!loading}
      maskClosable={!loading}
    >
      {/* 字段说明表格（优先显示） */}
      {fields.length > 0 && !loading && (
        <div style={{ marginBottom: 16 }}>
          <Alert
            message="导入字段说明"
            description={
              <div style={{ marginTop: 8 }}>
                <Table
                  columns={fieldColumns}
                  dataSource={fields.map((f, i) => ({ ...f, key: i }))}
                  pagination={false}
                  size="small"
                  bordered
                />
                <div style={{ marginTop: 8, color: '#666', fontSize: 12 }}>
                  <CheckCircleOutlined style={{ color: '#ff4d4f', marginRight: 4 }} />
                  <span>表示必填字段</span>
                </div>
              </div>
            }
            type="info"
            showIcon
          />
        </div>
      )}

      {/* 简单提示列表（当没有字段说明时显示） */}
      {fields.length === 0 && tips.length > 0 && !loading && (
        <div style={{ marginBottom: 16 }}>
          <Alert
            message="导入说明"
            description={
              <div>
                {tips.map((tip, index) => (
                  <p key={index} style={{ margin: '4px 0' }}>{tip}</p>
                ))}
              </div>
            }
            type="info"
            showIcon
          />
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Spin size="large" />
          <div style={{ marginTop: 16 }}>
            正在导入数据，请稍候...
          </div>
          {progress > 0 && (
            <div style={{ marginTop: 16 }}>
              <Progress percent={progress} status="active" />
            </div>
          )}
        </div>
      ) : (
        <>
          <Divider style={{ margin: '16px 0' }} />
          <Upload.Dragger
            name="file"
            accept=".xlsx,.xls"
            customRequest={onImport}
            showUploadList={false}
            disabled={loading}
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined style={{ fontSize: 48, color: '#1890ff' }} />
            </p>
            <p className="ant-upload-text">点击或拖拽Excel文件到此区域上传</p>
            <p className="ant-upload-hint">
              支持 .xlsx 和 .xls 格式，请先下载模板按格式填写数据
            </p>
          </Upload.Dragger>
        </>
      )}
    </Modal>
  );
};

export default ImportModal;
