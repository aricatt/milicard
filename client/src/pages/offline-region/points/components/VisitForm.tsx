import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Upload, Button, Space, message, Spin } from 'antd';
import { PlusOutlined, EnvironmentOutlined } from '@ant-design/icons';
import type { UploadFile, UploadProps } from 'antd';
import { useIntl, useModel } from '@umijs/max';

interface VisitFormProps {
  visible: boolean;
  pointId: string;
  pointName?: string;
  onClose: () => void;
  onSuccess: () => void;
}

const VisitForm: React.FC<VisitFormProps> = ({ visible, pointId, pointName, onClose, onSuccess }) => {
  const [form] = Form.useForm();
  const intl = useIntl();
  const { initialState } = useModel('@@initialState');
  const currentUser = initialState?.currentUser;
  const [loading, setLoading] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [locationLoading, setLocationLoading] = useState(false);
  const [location, setLocation] = useState<{
    latitude?: number;
    longitude?: number;
    locationName?: string;
  }>({});

  // 使用Google Maps逆地理编码API将经纬度转换为地址
  const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
    try {
      // Google Maps API Key（可选配置）
      // 如果需要更高的配额，请在环境变量中配置 GOOGLE_MAPS_API_KEY
      const apiKey = process.env.GOOGLE_MAPS_API_KEY || '';
      const keyParam = apiKey ? `&key=${apiKey}` : '';
      
      // 使用Google Maps Geocoding API
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&language=vi${keyParam}`
      );
      const data = await response.json();
      
      if (data.status === 'OK' && data.results && data.results.length > 0) {
        // 返回格式化地址（越南语）
        const address = data.results[0].formatted_address;
        console.log('逆地理编码成功:', address);
        return address;
      } else if (data.status === 'REQUEST_DENIED') {
        console.warn('Google Maps API请求被拒绝，可能需要配置API Key');
        console.warn('错误信息:', data.error_message);
      } else if (data.status === 'OVER_QUERY_LIMIT') {
        console.warn('Google Maps API配额已用完');
      } else {
        console.warn('逆地理编码返回状态:', data.status);
      }
    } catch (error) {
      console.error('逆地理编码失败:', error);
    }
    
    // 降级方案：返回经纬度
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  };

  // 获取地理位置
  const getLocation = () => {
    if (!navigator.geolocation) {
      message.warning('浏览器不支持地理定位');
      return;
    }

    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        // 获取地址名称
        const addressName = await reverseGeocode(latitude, longitude);
        
        setLocation({
          latitude,
          longitude,
          locationName: addressName,
        });
        form.setFieldsValue({
          latitude,
          longitude,
          locationName: addressName,
        });
        message.success('位置获取成功');
        setLocationLoading(false);
      },
      (error) => {
        let errorMessage = '获取位置失败';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = '用户拒绝了位置权限';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = '位置信息不可用';
            break;
          case error.TIMEOUT:
            errorMessage = '获取位置超时';
            break;
        }
        message.error(errorMessage);
        setLocationLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  // 上传配置
  const uploadProps: UploadProps = {
    listType: 'picture-card',
    fileList,
    beforeUpload: (file) => {
      // 检查文件类型
      const isImage = file.type.startsWith('image/');
      if (!isImage) {
        message.error('只能上传图片文件');
        return Upload.LIST_IGNORE;
      }

      // 检查文件大小（10MB）
      const isLt10M = file.size / 1024 / 1024 < 10;
      if (!isLt10M) {
        message.error('图片大小不能超过10MB');
        return Upload.LIST_IGNORE;
      }

      // 检查数量
      if (fileList.length >= 3) {
        message.error('最多只能上传3张图片');
        return Upload.LIST_IGNORE;
      }

      return false; // 阻止自动上传
    },
    onChange: ({ fileList: newFileList }) => {
      setFileList(newFileList.slice(0, 3));
    },
    onRemove: (file) => {
      setFileList(fileList.filter((item) => item.uid !== file.uid));
    },
  };

  // 提交表单
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      // 构建FormData
      const formData = new FormData();
      formData.append('visitorName', values.visitorName);
      if (values.customerName) formData.append('customerName', values.customerName);
      if (location.latitude) formData.append('latitude', location.latitude.toString());
      if (location.longitude) formData.append('longitude', location.longitude.toString());
      if (location.locationName) formData.append('locationName', location.locationName);
      if (values.notes) formData.append('notes', values.notes);

      // 添加图片文件
      fileList.forEach((file) => {
        if (file.originFileObj) {
          formData.append('images', file.originFileObj);
        }
      });

      // 调用API
      const response = await fetch(`/api/v1/points/${pointId}/visits`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: formData,
      });

      const result = await response.json();

      // 检查HTTP状态码和响应数据
      if (response.ok && result.success) {
        message.success('拜访记录创建成功');
        form.resetFields();
        setFileList([]);
        setLocation({});
        onSuccess();
      } else {
        message.error(result.error || '创建失败');
      }
    } catch (error) {
      console.error('提交失败:', error);
      message.error('提交失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 重置表单并自动填充用户姓名和点位名称
  useEffect(() => {
    if (visible) {
      // 表单打开时，自动填充数据
      const initialValues: any = {};
      
      // 自动填充当前用户姓名
      if (currentUser?.name) {
        initialValues.visitorName = currentUser.name;
      }
      
      // 自动填充点位名称
      if (pointName) {
        initialValues.customerName = pointName;
      }
      
      // 使用setTimeout确保Form已经渲染
      setTimeout(() => {
        form.setFieldsValue(initialValues);
      }, 0);
    } else if (!visible) {
      // 表单关闭时，清空状态（不调用resetFields，因为Modal会销毁）
      setFileList([]);
      setLocation({});
    }
  }, [visible, pointName, currentUser, form]);

  return (
    <Modal
      title="记录拜访情况"
      open={visible}
      onCancel={onClose}
      onOk={handleSubmit}
      confirmLoading={loading}
      width={600}
      destroyOnHidden
    >
      <Form form={form} layout="vertical" style={{ marginTop: 24 }}>
        <Form.Item
          label="拜访人员姓名"
          name="visitorName"
          rules={[{ required: true, message: '请输入拜访人员姓名' }]}
        >
          <Input placeholder="请输入拜访人员姓名" />
        </Form.Item>

        <Form.Item label="客户名字/店名" name="customerName">
          <Input placeholder="请输入客户名字或店名" />
        </Form.Item>

        <Form.Item label="现场打卡">
          <Space direction="vertical" style={{ width: '100%' }}>
            <Button
              icon={<EnvironmentOutlined />}
              onClick={getLocation}
              loading={locationLoading}
              disabled={true}
              type="default"
            >
              点击定位
            </Button>
          </Space>
          <div style={{ marginTop: 8, fontSize: 12, color: '#999' }}>
            地理定位功能暂时关闭，不影响数据录入
          </div>
        </Form.Item>

        <Form.Item label="拜访现场拍照记录" required>
          <Upload {...uploadProps}>
            {fileList.length < 3 && (
              <div>
                <PlusOutlined />
                <div style={{ marginTop: 8 }}>点击上传图片/文件</div>
              </div>
            )}
          </Upload>
          <div style={{ marginTop: 8, fontSize: 12, color: '#999' }}>
            最多上传3张图片，每张不超过10MB
          </div>
        </Form.Item>

        <Form.Item label="拜访备注" name="notes">
          <Input.TextArea
            rows={4}
            placeholder="请输入拜访备注信息"
            maxLength={500}
            showCount
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default VisitForm;
