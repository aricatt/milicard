import React from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { Card, Empty, Typography } from 'antd';
import { PushpinOutlined } from '@ant-design/icons';

const { Title, Paragraph } = Typography;

const LocationsPage: React.FC = () => {
  return (
    <PageContainer
      header={{
        title: '点位信息',
        subTitle: '管理线下门店/网点信息',
      }}
    >
      <Card>
        <Empty
          image={<PushpinOutlined style={{ fontSize: 64, color: '#1890ff' }} />}
          description={
            <Typography>
              <Title level={4}>点位信息功能开发中</Title>
              <Paragraph type="secondary">
                此功能将用于管理线下门店/网点的详细信息，包括地理位置、联系方式、库存状态等。
              </Paragraph>
            </Typography>
          }
        />
      </Card>
    </PageContainer>
  );
};

export default LocationsPage;
