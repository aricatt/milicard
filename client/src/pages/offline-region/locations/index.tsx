import React from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { Card, Empty, Typography } from 'antd';
import { useIntl } from '@umijs/max';
import { PushpinOutlined } from '@ant-design/icons';

const { Title, Paragraph } = Typography;

const LocationsPage: React.FC = () => {
  const intl = useIntl();
  
  return (
    <PageContainer
      header={{
        title: intl.formatMessage({ id: 'offlineLocations.title' }),
        subTitle: intl.formatMessage({ id: 'offlineLocations.subTitle' }),
      }}
    >
      <Card>
        <Empty
          image={<PushpinOutlined style={{ fontSize: 64, color: '#1890ff' }} />}
          description={
            <Typography>
              <Title level={4}>{intl.formatMessage({ id: 'offlineLocations.developing' })}</Title>
              <Paragraph type="secondary">
                {intl.formatMessage({ id: 'offlineLocations.developingDesc' })}
              </Paragraph>
            </Typography>
          }
        />
      </Card>
    </PageContainer>
  );
};

export default LocationsPage;
