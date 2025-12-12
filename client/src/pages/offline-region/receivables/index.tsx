import React from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { Card, Empty, Typography } from 'antd';
import { useIntl } from '@umijs/max';
import { MoneyCollectOutlined } from '@ant-design/icons';

const { Title, Paragraph } = Typography;

const ReceivablesPage: React.FC = () => {
  const intl = useIntl();
  
  return (
    <PageContainer
      header={{
        title: intl.formatMessage({ id: 'receivables.title' }),
        subTitle: intl.formatMessage({ id: 'receivables.subTitle' }),
      }}
    >
      <Card>
        <Empty
          image={<MoneyCollectOutlined style={{ fontSize: 64, color: '#1890ff' }} />}
          description={
            <Typography>
              <Title level={4}>{intl.formatMessage({ id: 'receivables.developing' })}</Title>
              <Paragraph type="secondary">
                {intl.formatMessage({ id: 'receivables.developingDesc' })}
              </Paragraph>
            </Typography>
          }
        />
      </Card>
    </PageContainer>
  );
};

export default ReceivablesPage;
