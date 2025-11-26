/**
 * 通用导入模态框组件
 * 统一商品、采购、到货等页面的导入UI风格
 */
import React from 'react';
import { Modal, Upload, Button, Alert, Spin, Progress } from 'antd';
import { InboxOutlined, DownloadOutlined } from '@ant-design/icons';
import type { UploadProps } from 'antd';

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
  onDownloadTemplate: () => void;
  /** 导入说明列表 */
  tips?: string[];
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
  onDownloadTemplate,
  tips = [],
  width = 600,
}) => {
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
      {tips.length > 0 && (
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
              支持 .xlsx 和 .xls 格式，请按照模板格式填写数据
            </p>
          </Upload.Dragger>

          <div style={{ marginTop: 16, textAlign: 'center' }}>
            <Button
              type="link"
              icon={<DownloadOutlined />}
              onClick={onDownloadTemplate}
            >
              下载导入模板
            </Button>
          </div>
        </>
      )}
    </Modal>
  );
};

export default ImportModal;
