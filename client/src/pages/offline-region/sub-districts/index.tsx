import React from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { Card, Empty, Typography } from 'antd';
import { ClusterOutlined } from '@ant-design/icons';

const { Title, Paragraph } = Typography;

const SubDistrictsPage: React.FC = () => {
  return (
    <PageContainer
      header={{
        title: '小区管理',
        subTitle: '管理大区下的小区划分',
      }}
    >
      <Card>
        <Empty
          image={<ClusterOutlined style={{ fontSize: 64, color: '#1890ff' }} />}
          description={
            <Typography>
              <Title level={4}>小区管理功能开发中</Title>
              <Paragraph type="secondary">
                此功能将用于管理大区下的小区划分，如区/郡级别的区域管理。
              </Paragraph>
            </Typography>
          }
        />
      </Card>
    </PageContainer>
  );
};

export default SubDistrictsPage;
