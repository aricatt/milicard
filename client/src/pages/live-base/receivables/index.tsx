import React from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { Card, Empty, Typography } from 'antd';
import { MoneyCollectOutlined } from '@ant-design/icons';

const { Title, Paragraph } = Typography;

const ReceivablesPage: React.FC = () => {
  return (
    <PageContainer
      header={{
        title: '应收管理',
        subTitle: '管理直播基地的应收账款',
      }}
    >
      <Card>
        <Empty
          image={<MoneyCollectOutlined style={{ fontSize: 64, color: '#1890ff' }} />}
          description={
            <Typography>
              <Title level={4}>应收管理功能开发中</Title>
              <Paragraph type="secondary">
                此功能将用于管理直播基地的应收账款，跟踪客户的付款情况。
              </Paragraph>
            </Typography>
          }
        />
      </Card>
    </PageContainer>
  );
};

export default ReceivablesPage;
