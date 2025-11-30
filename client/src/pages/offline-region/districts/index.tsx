import React from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { Card, Empty, Typography } from 'antd';
import { GlobalOutlined } from '@ant-design/icons';

const { Title, Paragraph } = Typography;

const DistrictsPage: React.FC = () => {
  return (
    <PageContainer
      header={{
        title: '大区管理',
        subTitle: '管理线下市场的大区划分',
      }}
    >
      <Card>
        <Empty
          image={<GlobalOutlined style={{ fontSize: 64, color: '#1890ff' }} />}
          description={
            <Typography>
              <Title level={4}>大区管理功能开发中</Title>
              <Paragraph type="secondary">
                此功能将用于管理线下市场的大区划分，如城市级别的区域管理。
              </Paragraph>
            </Typography>
          }
        />
      </Card>
    </PageContainer>
  );
};

export default DistrictsPage;
