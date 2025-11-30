import React from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { Card, Empty, Typography } from 'antd';
import { DollarCircleOutlined } from '@ant-design/icons';

const { Title, Paragraph } = Typography;

const LocationProfitPage: React.FC = () => {
  return (
    <PageContainer
      header={{
        title: '点位利润',
        subTitle: '查看各点位的利润统计',
      }}
    >
      <Card>
        <Empty
          image={<DollarCircleOutlined style={{ fontSize: 64, color: '#1890ff' }} />}
          description={
            <Typography>
              <Title level={4}>点位利润功能开发中</Title>
              <Paragraph type="secondary">
                此功能将用于统计和分析各点位的利润情况，包括拿货金额、利润金额、利润比等。
              </Paragraph>
            </Typography>
          }
        />
      </Card>
    </PageContainer>
  );
};

export default LocationProfitPage;
