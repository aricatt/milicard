import React from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { Card, Empty, Typography } from 'antd';
import { ExportOutlined } from '@ant-design/icons';

const { Title, Paragraph } = Typography;

const StockOutPage: React.FC = () => {
  return (
    <PageContainer
      header={{
        title: '出库管理',
        subTitle: '管理线下区域的出库记录',
      }}
    >
      <Card>
        <Empty
          image={<ExportOutlined style={{ fontSize: 64, color: '#1890ff' }} />}
          description={
            <Typography>
              <Title level={4}>出库管理功能开发中</Title>
              <Paragraph type="secondary">
                此功能将用于管理线下区域的出库记录，跟踪商品从仓库到门店的流转。
              </Paragraph>
            </Typography>
          }
        />
      </Card>
    </PageContainer>
  );
};

export default StockOutPage;
