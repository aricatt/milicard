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

// 环境变量：生产环境隐藏模板参考菜单
const { REACT_APP_ENV = 'dev' } = process.env;
const isProduction = REACT_APP_ENV === 'prod';

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
  // 全局信息 - 不依赖基地的全局数据管理
  {
    path: '/global-info',
    name: 'global-info',
    icon: 'global',
    routes: [
      {
        path: '/global-info',
        redirect: '/global-info/categories',
      },
      // 商品品类
      {
        name: 'categories',
        icon: 'appstore',
        path: '/global-info/categories',
        component: './global-info/categories',
        access: 'canAccessProducts',
      },
      // 所有商品（全局商品管理）
      {
        name: 'all-products',
        icon: 'gift',
        path: '/global-info/all-products',
        component: './global-info/all-products',
        access: 'canAccessProducts',
      },
      // 货币汇率
      {
        name: 'currency-rates',
        icon: 'dollar',
        path: '/global-info/currency-rates',
        component: './global-info/currency-rates',
        access: 'canAccessProducts',
      },
      // 全局配置
      {
        name: 'global-setting',
        icon: 'setting',
        path: '/global-info/global-setting',
        component: './global-info/global-setting',
        access: 'canAccessProducts',
      },
    ],
  },
  // 直播基地管理系统 - 所有功能都在直播基地下
  {
    path: '/live-base',
    name: 'live-base',
    icon: 'home',
    routes: [
      {
        path: '/live-base',
        redirect: '/live-base/base-data/bases',
      },
      // 基地管理
      {
        name: 'base-list',
        icon: 'home',
        path: '/live-base/base-data/bases',
        component: './live-base/base-data/bases',
        access: 'canAccessBases',
      },
      {
        name: 'locations',
        icon: 'database',
        path: '/live-base/locations',
        component: './live-base/locations',
        access: 'canAccessLocations',
      },
      // 人员管理
      {
        name: 'personnel',
        icon: 'user',
        path: '/live-base/personnel',
        component: './live-base/personnel',
        access: 'canAccessPersonnel',
      },
      // 供应商管理
      {
        name: 'suppliers',
        icon: 'shop',
        path: '/live-base/suppliers',
        component: './live-base/suppliers',
        access: 'canAccessSuppliers',
      },
      // 商品管理
      {
        name: 'products',
        icon: 'gift',
        path: '/live-base/products',
        component: './live-base/products',
        access: 'canAccessProducts',
      },
      // 采购管理
      {
        name: 'procurement',
        icon: 'shopping-cart',
        path: '/live-base/procurement',
        component: './live-base/procurement',
        access: 'canAccessProcurement',
      },
      // 到货管理
      {
        name: 'arrivals',
        icon: 'inbox',
        path: '/live-base/arrivals',
        component: './live-base/arrivals',
        access: 'canAccessArrivals',
      },
      // 调货管理
      {
        name: 'transfers',
        icon: 'swap',
        path: '/live-base/transfers',
        component: './live-base/transfers',
        access: 'canAccessTransfers',
      },
      // 库存和消耗
      {
        name: 'inventory-consumption',
        icon: 'database',
        path: '/live-base/inventory-consumption',
        component: './live-base/inventory-consumption',
        access: 'canAccessInventoryConsumption',
      },
      {
        name: 'anchor-profit',
        icon: 'dollarCircle',
        path: '/live-base/anchor-profit',
        component: './live-base/anchor-profit',
        access: 'canAccessAnchorProfit',
      },
      {
        name: 'ads-record',
        icon: 'fundProjectionScreen',
        path: '/live-base/ads-record',
        component: './live-base/ads-record',
        access: 'canAccessAnchorProfit',
      },
      // 出库管理
      {
        name: 'stock-out',
        icon: 'export',
        path: '/live-base/stock-out',
        component: './live-base/stock-out',
        access: 'canAccessStockOut',
      },
      // 实时库存
      {
        name: 'real-time-stock',
        icon: 'database',
        path: '/live-base/real-time-stock',
        component: './live-base/real-time-stock',
        access: 'canAccessStock',
      },
      // 应付管理
      {
        name: 'payables',
        icon: 'wallet',
        path: '/live-base/payables',
        component: './live-base/payables',
        access: 'canAccessPayables',
      },
      // 应收管理
      {
        name: 'receivables',
        icon: 'moneyCollect',
        path: '/live-base/receivables',
        component: './live-base/receivables',
        access: 'canAccessReceivables',
      },
    ],
  },
  // 线下区域管理系统
  {
    path: '/offline-region',
    name: 'offline-region',
    icon: 'environment',
    routes: [
      {
        path: '/offline-region',
        redirect: '/offline-region/districts',
      },
      // 大区管理
      {
        name: 'districts',
        icon: 'global',
        path: '/offline-region/districts',
        component: './offline-region/districts',
        access: 'canAccessBases',
      },
      // 小区/仓库管理
      {
        name: 'sub-districts',
        icon: 'cluster',
        path: '/offline-region/sub-districts',
        component: './offline-region/sub-districts',
        access: 'canAccessLocations',
      },
      // 仓管人员
      {
        name: 'warehouse-keepers',
        icon: 'user',
        path: '/offline-region/warehouse-keepers',
        component: './offline-region/warehouse-keepers',
        access: 'canAccessPersonnel',
      },
      // 供应商管理（复用直播基地）
      {
        name: 'suppliers',
        icon: 'shop',
        path: '/offline-region/suppliers',
        component: './live-base/suppliers',
        access: 'canAccessSuppliers',
      },
      // 商品管理（复用直播基地）
      {
        name: 'products',
        icon: 'gift',
        path: '/offline-region/products',
        component: './live-base/products',
        access: 'canAccessProducts',
      },
      // 采购管理（复用直播基地）
      {
        name: 'procurement',
        icon: 'shopping-cart',
        path: '/offline-region/procurement',
        component: './live-base/procurement',
        access: 'canAccessProcurement',
      },
      // 到货管理（复用直播基地）
      {
        name: 'arrivals',
        icon: 'inbox',
        path: '/offline-region/arrivals',
        component: './live-base/arrivals',
        access: 'canAccessArrivals',
      },
      // 库存和消耗（线下区域不需要，已隐藏）
      // {
      //   name: 'inventory-consumption',
      //   icon: 'database',
      //   path: '/offline-region/inventory-consumption',
      //   component: './live-base/inventory-consumption',
      //   access: 'canAccessInventoryConsumption',
      // },
      // 出库管理
      {
        name: 'stock-out',
        icon: 'export',
        path: '/offline-region/stock-out',
        component: './offline-region/stock-out',
        access: 'canAccessStockOut',
      },
      // 实时库存
      {
        name: 'real-time-stock',
        icon: 'database',
        path: '/offline-region/real-time-stock',
        component: './offline-region/real-time-stock',
        access: 'canAccessStock',
      },
      // 应付管理（复用直播基地）
      {
        name: 'payables',
        icon: 'wallet',
        path: '/offline-region/payables',
        component: './live-base/payables',
        access: 'canAccessPayables',
      },
      // 应收管理
      {
        name: 'receivables',
        icon: 'moneyCollect',
        path: '/offline-region/receivables',
        component: './offline-region/receivables',
        access: 'canAccessReceivables',
      },
      // 点位信息（子菜单）
      {
        name: 'point-info',
        icon: 'environment',
        path: '/offline-region/point-info',
        routes: [
          {
            path: '/offline-region/point-info',
            redirect: '/offline-region/point-info/points',
          },
          // 点位管理
          {
            name: 'points',
            icon: 'pushpin',
            path: '/offline-region/point-info/points',
            component: './offline-region/points',
            access: 'canAccessPoint',
          },
          // 点位订单
          {
            name: 'point-orders',
            icon: 'shopping',
            path: '/offline-region/point-info/point-orders',
            component: './offline-region/point-orders',
            access: 'canAccessPointOrder',
          },
          // 点位利润
          {
            name: 'location-profit',
            icon: 'dollarCircle',
            path: '/offline-region/point-info/location-profit',
            component: './offline-region/location-profit',
            access: 'canAccessAnchorProfit',
          },
        ],
      },
    ],
  },
  // 模板参考 - 仅在非生产环境显示
  ...(!isProduction ? [{
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
  }] : []),
  // 系统管理
  {
    path: '/system',
    name: 'system',
    icon: 'setting',
    access: 'canAccessSystem', // 权限控制
    routes: [
      {
        path: '/system',
        redirect: '/system/users',
      },
      // 用户管理
      {
        name: 'users',
        icon: 'user',
        path: '/system/users',
        component: './system/users',
        access: 'canManageUsers',
      },
      // 角色管理
      {
        name: 'roles',
        icon: 'team',
        path: '/system/roles',
        component: './system/roles',
        access: 'canManageRoles',
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
