/**
 * @name umi 的路由配置
 * @description 只支持 path,component,routes,redirect,wrappers,name,icon 的配置
 * @param path  path 只支持两种占位符配置，第一种是动态参数 :id 的形式，第二种是 * 通配符，通配符只能出现路由字符串的最后。
 * @param component 配置 location 和 path 匹配后用于渲染的 React 组件路径。可以是绝对路径，也可以是相对路径，如果是相对路径，会从 src/pages 开始找起。
 * @param routes 配置子路由，通常在需要为多个路径增加 layout 组件时使用。
 * @param redirect 配置路由跳转
 * @param wrappers 配置路由组件的包装组件，通过包装组件可以为当前的路由组件组合进更多的功能。 比如，可以用于路由级别的权限校验
 * @param name 配置路由的标题，默认读取国际化文件 menu.ts 中 menu.xxxx 的值，如配置 name 为 login，则读取 menu.ts 中 menu.login 的取值作为标题
 * @param icon 配置路由的图标，取值参考 https://ant.design/components/icon-cn， 注意去除风格后缀和大小写，如想要配置图标为 <StepBackwardOutlined /> 则取值应为 stepBackward 或 StepBackward，如想要配置图标为 <UserOutlined /> 则取值应为 user 或者 User
 * @doc https://umijs.org/docs/guides/routes
 */
export default [
  {
    path: '/user',
    layout: false,
    routes: [
      {
        path: '/user/login',
        layout: false,
        name: 'login',
        component: './user/login',
      },
      {
        path: '/user',
        redirect: '/user/login',
      },
      {
        name: 'register-result',
        icon: 'smile',
        path: '/user/register-result',
        component: './user/register-result',
      },
      {
        name: 'register',
        icon: 'smile',
        path: '/user/register',
        component: './user/register',
      },
      {
        component: '404',
        path: '/user/*',
      },
    ],
  },
  // 基地选择器 - 登录后的基地选择页面
  {
    path: '/base-selector',
    name: 'base-selector',
    component: './BaseSelector',
    layout: false,
  },
  // 直播基地管理系统 - 所有功能都在直播基地下
  {
    path: '/live-base',
    name: 'live-base',
    icon: 'home',
    routes: [
      {
        path: '/live-base',
        redirect: '/live-base/overview',
      },
      // 基地管理
      {
        name: 'overview',
        icon: 'dashboard',
        path: '/live-base/overview',
        component: './Welcome',
      },
      {
        name: 'base-list',
        icon: 'home',
        path: '/live-base/base-data/bases',
        component: './live-base/base-data/bases',
      },
      {
        name: 'locations',
        icon: 'database',
        path: '/live-base/locations',
        component: './live-base/locations',
      },
      // 人员管理
      {
        name: 'personnel',
        icon: 'user',
        path: '/live-base/personnel',
        component: './live-base/personnel',
      },
      // 供应商管理
      {
        name: 'suppliers',
        icon: 'shop',
        path: '/live-base/suppliers',
        component: './live-base/suppliers',
      },
      {
        name: 'cooperation',
        icon: 'handshake',
        path: '/live-base/cooperation',
        component: './Welcome',
      },
      // 采购管理
      {
        name: 'procurement',
        icon: 'shopping-cart',
        path: '/live-base/procurement',
        component: './live-base/procurement',
      },
      // 销售管理
      {
        name: 'sales',
        icon: 'dollar-circle',
        path: '/live-base/sales',
        component: './live-base/sales',
      },
      // 商品管理
      {
        name: 'products',
        icon: 'gift',
        path: '/live-base/products',
        component: './live-base/products',
      },
      {
        name: 'product-category',
        icon: 'tags',
        path: '/live-base/product-category',
        component: './Welcome',
      },
      {
        name: 'inventory',
        icon: 'database',
        path: '/live-base/inventory',
        component: './live-base/inventory',
      },
    ],
  },
  {
    name: 'template-reference',
    icon: 'fileText',
    path: '/template-reference',
    routes: [
      {
        path: '/template-reference',
        redirect: '/template-reference/overview',
      },
      {
        name: 'overview',
        icon: 'fileText',
        path: '/template-reference/overview',
        component: './TemplateReference',
      },
      {
        name: 'dashboard-templates',
        icon: 'dashboard',
        path: '/template-reference/dashboard',
        routes: [
          {
            path: '/template-reference/dashboard',
            redirect: '/template-reference/dashboard/analysis',
          },
          {
            name: 'analysis',
            icon: 'smile',
            path: '/template-reference/dashboard/analysis',
            component: './dashboard/analysis',
          },
          {
            name: 'monitor',
            icon: 'smile',
            path: '/template-reference/dashboard/monitor',
            component: './dashboard/monitor',
          },
          {
            name: 'workplace',
            icon: 'smile',
            path: '/template-reference/dashboard/workplace',
            component: './dashboard/workplace',
          },
        ],
      },
      {
        name: 'form-templates',
        icon: 'form',
        path: '/template-reference/form',
        routes: [
          {
            path: '/template-reference/form',
            redirect: '/template-reference/form/basic-form',
          },
          {
            name: 'basic-form',
            icon: 'smile',
            path: '/template-reference/form/basic-form',
            component: './form/basic-form',
          },
          {
            name: 'step-form',
            icon: 'smile',
            path: '/template-reference/form/step-form',
            component: './form/step-form',
          },
          {
            name: 'advanced-form',
            icon: 'smile',
            path: '/template-reference/form/advanced-form',
            component: './form/advanced-form',
          },
        ],
      },
      {
        name: 'list-templates',
        icon: 'table',
        path: '/template-reference/list',
        routes: [
          {
            path: '/template-reference/list/search',
            name: 'search-list',
            component: './list/search',
            routes: [
              {
                path: '/template-reference/list/search',
                redirect: '/template-reference/list/search/articles',
              },
              {
                name: 'articles',
                icon: 'smile',
                path: '/template-reference/list/search/articles',
                component: './list/search/articles',
              },
              {
                name: 'projects',
                icon: 'smile',
                path: '/template-reference/list/search/projects',
                component: './list/search/projects',
              },
              {
                name: 'applications',
                icon: 'smile',
                path: '/template-reference/list/search/applications',
                component: './list/search/applications',
              },
            ],
          },
          {
            path: '/template-reference/list',
            redirect: '/template-reference/list/table-list',
          },
          {
            name: 'table-list',
            icon: 'smile',
            path: '/template-reference/list/table-list',
            component: './table-list',
          },
          {
            name: 'basic-list',
            icon: 'smile',
            path: '/template-reference/list/basic-list',
            component: './list/basic-list',
          },
          {
            name: 'card-list',
            icon: 'smile',
            path: '/template-reference/list/card-list',
            component: './list/card-list',
          },
        ],
      },
      {
        name: 'profile-templates',
        icon: 'profile',
        path: '/template-reference/profile',
        routes: [
          {
            path: '/template-reference/profile',
            redirect: '/template-reference/profile/basic',
          },
          {
            name: 'basic',
            icon: 'smile',
            path: '/template-reference/profile/basic',
            component: './profile/basic',
          },
          {
            name: 'advanced',
            icon: 'smile',
            path: '/template-reference/profile/advanced',
            component: './profile/advanced',
          },
        ],
      },
      {
        name: 'result-templates',
        icon: 'CheckCircleOutlined',
        path: '/template-reference/result',
        routes: [
          {
            path: '/template-reference/result',
            redirect: '/template-reference/result/success',
          },
          {
            name: 'success',
            icon: 'smile',
            path: '/template-reference/result/success',
            component: './result/success',
          },
          {
            name: 'fail',
            icon: 'smile',
            path: '/template-reference/result/fail',
            component: './result/fail',
          },
        ],
      },
      {
        name: 'exception-templates',
        icon: 'warning',
        path: '/template-reference/exception',
        routes: [
          {
            path: '/template-reference/exception',
            redirect: '/template-reference/exception/403',
          },
          {
            name: '403',
            icon: 'smile',
            path: '/template-reference/exception/403',
            component: './exception/403',
          },
          {
            name: '404',
            icon: 'smile',
            path: '/template-reference/exception/404',
            component: './exception/404',
          },
          {
            name: '500',
            icon: 'smile',
            path: '/template-reference/exception/500',
            component: './exception/500',
          },
        ],
      },
      {
        name: 'user-templates',
        icon: 'user',
        path: '/template-reference/user',
        routes: [
          {
            path: '/template-reference/user',
            redirect: '/template-reference/user/login',
          },
          {
            name: 'login',
            icon: 'smile',
            path: '/template-reference/user/login',
            component: './user/login',
          },
          {
            name: 'register',
            icon: 'smile',
            path: '/template-reference/user/register',
            component: './user/register',
          },
          {
            name: 'register-result',
            icon: 'smile',
            path: '/template-reference/user/register-result',
            component: './user/register-result',
          },
        ],
      },
      {
        name: 'account-templates',
        icon: 'user',
        path: '/template-reference/account',
        routes: [
          {
            path: '/template-reference/account',
            redirect: '/template-reference/account/center',
          },
          {
            name: 'center',
            icon: 'smile',
            path: '/template-reference/account/center',
            component: './account/center',
          },
          {
            name: 'settings',
            icon: 'smile',
            path: '/template-reference/account/settings',
            component: './account/settings',
          },
        ],
      },
    ],
  },
  {
    path: '/',
    redirect: '/base-selector',
  },
  {
    component: '404',
    path: '/*',
  },
];
