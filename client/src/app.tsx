import { LinkOutlined } from '@ant-design/icons';
import type { Settings as LayoutSettings } from '@ant-design/pro-components';
import { SettingDrawer } from '@ant-design/pro-components';
import type { RequestConfig, RunTimeLayoutConfig } from '@umijs/max';
import { history, Link } from '@umijs/max';
import React from 'react';
import {
  AvatarDropdown,
  AvatarName,
  Footer,
  Question,
  SelectLang,
} from '@/components';
import BaseSwitcher from '@/components/BaseSwitcher';
import { currentUser as queryCurrentUser } from '@/services/ant-design-pro/api';
import { BaseProvider, BaseType } from '@/contexts/BaseContext';
import { App } from 'antd';
import type { MenuDataItem } from '@ant-design/pro-components';
import defaultSettings from '../config/defaultSettings';
import { errorConfig } from './requestErrorConfig';
import '@ant-design/v5-patch-for-react-19';

// 抑制 umi-presets-pro 的内置组件错误（giveFreely、远程配置等）
if (typeof window !== 'undefined') {
  // 捕获未处理的 Promise 错误
  window.addEventListener('unhandledrejection', (event) => {
    const msg = event.reason?.message || '';
    const stack = event.reason?.stack || '';
    if (msg.includes('payload') ||
        msg.includes('Failed to fetch') ||
        stack.includes('giveFreely') ||
        stack.includes('browserPolyfillWrapper')) {
      event.preventDefault();
    }
  });

  // 过滤控制台错误
  const originalError = console.error;
  console.error = (...args) => {
    const fullMsg = args.map(a => String(a)).join(' ');
    // 过滤已知的非关键错误
    if (fullMsg.includes('autoFocus') ||
        fullMsg.includes('giveFreely') ||
        fullMsg.includes('payload') ||
        fullMsg.includes('Static function can not consume context') ||
        fullMsg.includes('Lazy element type must resolve')) {
      return;
    }
    originalError.apply(console, args);
  };

  // 过滤控制台警告
  const originalWarn = console.warn;
  console.warn = (...args) => {
    const msg = args[0]?.toString?.() || '';
    if (msg.includes('Failed to fetch latest config')) {
      return;
    }
    originalWarn.apply(console, args);
  };
}

const isDev =
  process.env.NODE_ENV === 'development' || process.env.CI;
const loginPath = '/user/login';

/**
 * @see https://umijs.org/docs/api/runtime-config#getinitialstate
 * */
export async function getInitialState(): Promise<{
  settings?: Partial<LayoutSettings>;
  currentUser?: API.CurrentUser;
  loading?: boolean;
  fetchUserInfo?: () => Promise<API.CurrentUser | undefined>;
}> {
  const fetchUserInfo = async () => {
    try {
      // 检查是否有token
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('没有找到token，跳转到登录页');
        history.push(loginPath);
        return undefined;
      }

      const msg = await queryCurrentUser({
        skipErrorHandler: true,
      });
      return msg.data;
    } catch (_error) {
      console.log('获取用户信息失败，清除token并跳转到登录页');
      localStorage.removeItem('token');
      history.push(loginPath);
    }
    return undefined;
  };
  // 如果不是登录页面，执行
  const { location } = history;
  if (
    ![loginPath, '/user/register', '/user/register-result'].includes(
      location.pathname,
    )
  ) {
    const currentUser = await fetchUserInfo();
    return {
      fetchUserInfo,
      currentUser,
      settings: defaultSettings as Partial<LayoutSettings>,
    };
  }
  return {
    fetchUserInfo,
    settings: defaultSettings as Partial<LayoutSettings>,
  };
}

// ProLayout 支持的api https://procomponents.ant.design/components/layout
export const layout: RunTimeLayoutConfig = ({
  initialState,
  setInitialState,
}) => {
  return {
    actionsRender: () => [
      <BaseSwitcher key="BaseSwitcher" />,
      <Question key="doc" />,
      <SelectLang key="SelectLang" />,
    ],
    avatarProps: {
      src: initialState?.currentUser?.avatar,
      title: <AvatarName />,
      render: (_, avatarChildren) => {
        return <AvatarDropdown>{avatarChildren}</AvatarDropdown>;
      },
    },
    waterMarkProps: {
      content: initialState?.currentUser?.username,
    },
    footerRender: () => <Footer />,
    // 默认展开的菜单
    defaultOpenAll: true,
    // 根据当前基地类型动态过滤菜单
    menuDataRender: (menuData: MenuDataItem[]) => {
      // 从 localStorage 获取当前基地类型
      const savedBase = localStorage.getItem('milicard_current_base');
      let baseType: string | null = null;
      if (savedBase) {
        try {
          const base = JSON.parse(savedBase);
          baseType = base.type;
        } catch (e) {
          // ignore
        }
      }
      
      // 根据基地类型过滤菜单
      return menuData.filter((item) => {
        // 如果是直播基地类型，隐藏线下区域菜单
        if (baseType === BaseType.LIVE_BASE && item.path === '/offline-region') {
          return false;
        }
        // 如果是线下区域类型，隐藏直播基地菜单
        if (baseType === BaseType.OFFLINE_REGION && item.path === '/live-base') {
          return false;
        }
        return true;
      });
    },
    onPageChange: () => {
      const { location } = history;
      // 不需要检查的页面
      const whiteList = [loginPath, '/user/register', '/user/register-result', '/base-selector'];
      
      // 如果没有登录，重定向到 login
      if (!initialState?.currentUser && !whiteList.includes(location.pathname)) {
        history.push(loginPath);
        return;
      }
      
      // 如果已登录但没有选择基地，且不在白名单页面，重定向到基地选择页面
      if (initialState?.currentUser && !whiteList.includes(location.pathname)) {
        const savedBase = localStorage.getItem('milicard_current_base');
        if (!savedBase) {
          history.push('/base-selector');
        }
      }
    },
    bgLayoutImgList: [
      {
        src: 'https://mdn.alipayobjects.com/yuyan_qk0oxh/afts/img/D2LWSqNny4sAAAAAAAAAAAAAFl94AQBr',
        left: 85,
        bottom: 100,
        height: '303px',
      },
      {
        src: 'https://mdn.alipayobjects.com/yuyan_qk0oxh/afts/img/C2TWRpJpiC0AAAAAAAAAAAAAFl94AQBr',
        bottom: -68,
        right: -45,
        height: '303px',
      },
      {
        src: 'https://mdn.alipayobjects.com/yuyan_qk0oxh/afts/img/F6vSTbj8KpYAAAAAAAAAAAAAFl94AQBr',
        bottom: 0,
        left: 0,
        width: '331px',
      },
    ],
    links: isDev
      ? [
          <Link key="openapi" to="/umi/plugin/openapi" target="_blank">
            <LinkOutlined />
            <span>OpenAPI 文档</span>
          </Link>,
        ]
      : [],
    menuHeaderRender: undefined,
    // 自定义 403 页面
    // unAccessible: <div>unAccessible</div>,
    // 增加一个 loading 的状态
    childrenRender: (children) => {
      // if (initialState?.loading) return <PageLoading />;
      return (
        <>
          {children}
          {isDev && (
            <SettingDrawer
              disableUrlParams
              enableDarkTheme
              settings={initialState?.settings}
              onSettingChange={(settings) => {
                setInitialState((preInitialState) => ({
                  ...preInitialState,
                  settings,
                }));
              }}
            />
          )}
        </>
      );
    },
    ...initialState?.settings,
  };
};

/**
 * @name rootContainer 根容器
 * 用于包裹整个应用，使 BaseProvider 在 layout 的 actionsRender 中也能使用
 */
export function rootContainer(container: React.ReactNode) {
  return (
    <App>
      <BaseProvider>
        {container}
      </BaseProvider>
    </App>
  );
}

/**
 * @name request 配置，可以配置错误处理
 * 它基于 axios 和 ahooks 的 useRequest 提供了一套统一的网络请求和错误处理方案。
 * @doc https://umijs.org/docs/max/request#配置
 */
export const request: RequestConfig = {
  // 移除硬编码的baseURL，让代理配置生效
  // baseURL: 'https://proapi.azurewebsites.net',
  ...errorConfig,
};
