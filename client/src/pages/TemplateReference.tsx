import { PageContainer } from '@ant-design/pro-components';
import { Card, Tabs, Row, Col, Typography, Tag, Space, Divider } from 'antd';
import { 
  DashboardOutlined, 
  FormOutlined, 
  TableOutlined, 
  UserOutlined, 
  ProfileOutlined,
  ExceptionOutlined,
  CheckCircleOutlined,
  FileTextOutlined
} from '@ant-design/icons';
import React from 'react';

const { Title, Paragraph, Text } = Typography;

/**
 * 模板卡片组件
 */
const TemplateCard: React.FC<{
  title: string;
  description: string;
  path: string;
  tags: string[];
  icon: React.ReactNode;
  features: string[];
}> = ({ title, description, path, tags, icon, features }) => {
  return (
    <Card
      hoverable
      style={{ height: '100%' }}
      bodyStyle={{ padding: '16px' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ marginRight: 8, fontSize: 20, color: '#1890ff' }}>
          {icon}
        </div>
        <Title level={5} style={{ margin: 0 }}>
          {title}
        </Title>
      </div>
      
      <Paragraph style={{ fontSize: 13, color: '#666', marginBottom: 12 }}>
        {description}
      </Paragraph>
      
      <div style={{ marginBottom: 12 }}>
        <Text strong style={{ fontSize: 12 }}>路径：</Text>
        <Text code style={{ fontSize: 11 }}>{path}</Text>
      </div>
      
      <div style={{ marginBottom: 12 }}>
        <Space size={4} wrap>
          {tags.map(tag => (
            <Tag key={tag} size="small" color="blue">{tag}</Tag>
          ))}
        </Space>
      </div>
      
      <Divider style={{ margin: '8px 0' }} />
      
      <div>
        <Text strong style={{ fontSize: 12 }}>主要功能：</Text>
        <ul style={{ margin: '4px 0 0 0', paddingLeft: 16, fontSize: 12 }}>
          {features.map((feature, index) => (
            <li key={index} style={{ marginBottom: 2 }}>{feature}</li>
          ))}
        </ul>
      </div>
    </Card>
  );
};

/**
 * Ant Design Pro 模板参考页面
 */
const TemplateReference: React.FC = () => {
  
  // 仪表板模板
  const dashboardTemplates = [
    {
      title: '分析页',
      description: '数据分析展示页面，包含各种图表和统计信息',
      path: '/src/pages/dashboard/analysis',
      tags: ['图表', '数据分析', '统计'],
      icon: <DashboardOutlined />,
      features: [
        '销售额趋势图表',
        '访问量统计',
        '搜索用户排名',
        '销售额类别占比',
        '热门搜索关键词'
      ]
    },
    {
      title: '监控页',
      description: '系统监控页面，实时展示系统运行状态',
      path: '/src/pages/dashboard/monitor',
      tags: ['监控', '实时数据', '系统状态'],
      icon: <DashboardOutlined />,
      features: [
        '实时监控数据',
        '系统性能指标',
        '服务状态展示',
        '告警信息'
      ]
    },
    {
      title: '工作台',
      description: '个人工作台页面，展示个人任务和项目信息',
      path: '/src/pages/dashboard/workplace',
      tags: ['工作台', '个人中心', '任务管理'],
      icon: <DashboardOutlined />,
      features: [
        '项目进度展示',
        '快速入口',
        '团队成员',
        '动态消息'
      ]
    }
  ];

  // 表单模板
  const formTemplates = [
    {
      title: '基础表单',
      description: '标准的表单页面，包含各种表单控件',
      path: '/src/pages/form/basic-form',
      tags: ['表单', '基础组件', '验证'],
      icon: <FormOutlined />,
      features: [
        '表单验证',
        '各种输入控件',
        '提交处理',
        '错误提示'
      ]
    },
    {
      title: '分步表单',
      description: '多步骤表单，适用于复杂的数据录入流程',
      path: '/src/pages/form/step-form',
      tags: ['分步', '流程', '向导'],
      icon: <FormOutlined />,
      features: [
        '步骤导航',
        '数据传递',
        '表单验证',
        '进度展示'
      ]
    },
    {
      title: '高级表单',
      description: '复杂的表单页面，包含动态表单和复杂布局',
      path: '/src/pages/form/advanced-form',
      tags: ['高级', '动态表单', '复杂布局'],
      icon: <FormOutlined />,
      features: [
        '动态添加表单项',
        '复杂表单布局',
        '表单联动',
        '批量操作'
      ]
    }
  ];

  // 列表模板
  const listTemplates = [
    {
      title: '标准列表',
      description: '标准的数据列表页面，包含搜索、筛选、分页',
      path: '/src/pages/list/table-list',
      tags: ['表格', '搜索', '分页'],
      icon: <TableOutlined />,
      features: [
        '数据表格展示',
        '搜索筛选',
        '分页功能',
        'CRUD操作'
      ]
    },
    {
      title: '基础列表',
      description: '基础的列表页面，适用于简单的数据展示',
      path: '/src/pages/list/basic-list',
      tags: ['列表', '基础', '简单'],
      icon: <TableOutlined />,
      features: [
        '列表展示',
        '基础操作',
        '状态管理',
        '简单筛选'
      ]
    },
    {
      title: '卡片列表',
      description: '卡片式列表页面，适用于图文混合的内容展示',
      path: '/src/pages/list/card-list',
      tags: ['卡片', '图文', '展示'],
      icon: <TableOutlined />,
      features: [
        '卡片式布局',
        '图片展示',
        '响应式设计',
        '操作按钮'
      ]
    },
    {
      title: '搜索列表',
      description: '带搜索功能的列表页面，支持多种搜索方式',
      path: '/src/pages/list/search',
      tags: ['搜索', '筛选', '多条件'],
      icon: <TableOutlined />,
      features: [
        '多条件搜索',
        '高级筛选',
        '搜索结果展示',
        '搜索历史'
      ]
    }
  ];

  // 详情模板
  const profileTemplates = [
    {
      title: '基础详情页',
      description: '标准的详情展示页面',
      path: '/src/pages/profile/basic',
      tags: ['详情', '展示', '基础'],
      icon: <ProfileOutlined />,
      features: [
        '信息展示',
        '标签页切换',
        '操作按钮',
        '关联数据'
      ]
    },
    {
      title: '高级详情页',
      description: '复杂的详情页面，包含多种数据展示方式',
      path: '/src/pages/profile/advanced',
      tags: ['详情', '高级', '复杂'],
      icon: <ProfileOutlined />,
      features: [
        '复杂数据展示',
        '图表集成',
        '时间线',
        '操作记录'
      ]
    }
  ];

  // 结果页模板
  const resultTemplates = [
    {
      title: '成功页',
      description: '操作成功的结果页面',
      path: '/src/pages/result/success',
      tags: ['结果页', '成功', '反馈'],
      icon: <CheckCircleOutlined />,
      features: [
        '成功状态展示',
        '操作建议',
        '返回导航',
        '相关链接'
      ]
    },
    {
      title: '失败页',
      description: '操作失败的结果页面',
      path: '/src/pages/result/fail',
      tags: ['结果页', '失败', '错误'],
      icon: <ExceptionOutlined />,
      features: [
        '错误信息展示',
        '解决建议',
        '重试操作',
        '联系支持'
      ]
    }
  ];

  // 异常页模板
  const exceptionTemplates = [
    {
      title: '403 权限异常',
      description: '无权限访问页面',
      path: '/src/pages/exception/403',
      tags: ['异常页', '权限', '403'],
      icon: <ExceptionOutlined />,
      features: [
        '权限提示',
        '返回首页',
        '申请权限',
        '联系管理员'
      ]
    },
    {
      title: '404 页面不存在',
      description: '页面未找到',
      path: '/src/pages/exception/404',
      tags: ['异常页', '404', '未找到'],
      icon: <ExceptionOutlined />,
      features: [
        '友好提示',
        '返回首页',
        '搜索建议',
        '相关链接'
      ]
    },
    {
      title: '500 服务器异常',
      description: '服务器错误页面',
      path: '/src/pages/exception/500',
      tags: ['异常页', '500', '服务器错误'],
      icon: <ExceptionOutlined />,
      features: [
        '错误提示',
        '刷新重试',
        '返回首页',
        '错误报告'
      ]
    }
  ];

  // 用户相关模板
  const userTemplates = [
    {
      title: '登录页',
      description: '用户登录页面',
      path: '/src/pages/user/login',
      tags: ['登录', '认证', '用户'],
      icon: <UserOutlined />,
      features: [
        '多种登录方式',
        '记住密码',
        '忘记密码',
        '注册链接'
      ]
    },
    {
      title: '注册页',
      description: '用户注册页面',
      path: '/src/pages/user/register',
      tags: ['注册', '用户', '表单'],
      icon: <UserOutlined />,
      features: [
        '注册表单',
        '验证码',
        '协议确认',
        '邮箱验证'
      ]
    }
  ];

  // 账户设置模板
  const accountTemplates = [
    {
      title: '个人设置',
      description: '用户个人信息设置页面',
      path: '/src/pages/account/settings',
      tags: ['设置', '个人信息', '账户'],
      icon: <UserOutlined />,
      features: [
        '基本信息编辑',
        '安全设置',
        '消息通知',
        '账户绑定'
      ]
    },
    {
      title: '个人中心',
      description: '用户个人中心页面',
      path: '/src/pages/account/center',
      tags: ['个人中心', '用户', '展示'],
      icon: <UserOutlined />,
      features: [
        '个人信息展示',
        '动态消息',
        '项目列表',
        '团队信息'
      ]
    }
  ];

  const tabItems = [
    {
      key: 'dashboard',
      label: '仪表板',
      children: (
        <Row gutter={[16, 16]}>
          {dashboardTemplates.map((template, index) => (
            <Col xs={24} sm={12} lg={8} key={index}>
              <TemplateCard {...template} />
            </Col>
          ))}
        </Row>
      )
    },
    {
      key: 'form',
      label: '表单页',
      children: (
        <Row gutter={[16, 16]}>
          {formTemplates.map((template, index) => (
            <Col xs={24} sm={12} lg={8} key={index}>
              <TemplateCard {...template} />
            </Col>
          ))}
        </Row>
      )
    },
    {
      key: 'list',
      label: '列表页',
      children: (
        <Row gutter={[16, 16]}>
          {listTemplates.map((template, index) => (
            <Col xs={24} sm={12} lg={8} key={index}>
              <TemplateCard {...template} />
            </Col>
          ))}
        </Row>
      )
    },
    {
      key: 'profile',
      label: '详情页',
      children: (
        <Row gutter={[16, 16]}>
          {profileTemplates.map((template, index) => (
            <Col xs={24} sm={12} lg={8} key={index}>
              <TemplateCard {...template} />
            </Col>
          ))}
        </Row>
      )
    },
    {
      key: 'result',
      label: '结果页',
      children: (
        <Row gutter={[16, 16]}>
          {resultTemplates.map((template, index) => (
            <Col xs={24} sm={12} lg={8} key={index}>
              <TemplateCard {...template} />
            </Col>
          ))}
        </Row>
      )
    },
    {
      key: 'exception',
      label: '异常页',
      children: (
        <Row gutter={[16, 16]}>
          {exceptionTemplates.map((template, index) => (
            <Col xs={24} sm={12} lg={8} key={index}>
              <TemplateCard {...template} />
            </Col>
          ))}
        </Row>
      )
    },
    {
      key: 'user',
      label: '用户页',
      children: (
        <Row gutter={[16, 16]}>
          {userTemplates.map((template, index) => (
            <Col xs={24} sm={12} lg={8} key={index}>
              <TemplateCard {...template} />
            </Col>
          ))}
        </Row>
      )
    },
    {
      key: 'account',
      label: '个人页',
      children: (
        <Row gutter={[16, 16]}>
          {accountTemplates.map((template, index) => (
            <Col xs={24} sm={12} lg={8} key={index}>
              <TemplateCard {...template} />
            </Col>
          ))}
        </Row>
      )
    }
  ];

  return (
    <PageContainer
      header={{
        title: 'Ant Design Pro 模板参考',
        subTitle: '官方提供的页面模板和组件示例',
      }}
    >
      <Card>
        <div style={{ marginBottom: 24 }}>
          <Title level={4}>
            <FileTextOutlined style={{ marginRight: 8 }} />
            模板说明
          </Title>
          <Paragraph>
            本页面整理了 Ant Design Pro 提供的所有官方模板页面，包括仪表板、表单、列表、详情页等各种常用页面类型。
            这些模板可以作为我们开发 Milicard 系统时的参考和基础。
          </Paragraph>
          <Paragraph>
            <Text strong>技术栈：</Text>
            <Tag color="blue">React 19</Tag>
            <Tag color="green">Ant Design 5</Tag>
            <Tag color="orange">Pro Components</Tag>
            <Tag color="purple">UmiJS 4</Tag>
            <Tag color="cyan">TypeScript</Tag>
          </Paragraph>
        </div>

        <Tabs
          defaultActiveKey="dashboard"
          items={tabItems}
          size="large"
        />
      </Card>
    </PageContainer>
  );
};

export default TemplateReference;
