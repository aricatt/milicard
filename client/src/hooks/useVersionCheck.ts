import { useEffect, useRef } from 'react';
import { Modal } from 'antd';

interface VersionInfo {
  version: string;
  buildTime: string;
}

/**
 * 版本检测 Hook
 * 定期检查服务器版本，如果发现新版本则提示用户刷新
 */
export const useVersionCheck = (options?: {
  /** 检查间隔（毫秒），默认 5 分钟 */
  interval?: number;
  /** 是否自动刷新，默认 false（弹窗提示） */
  autoRefresh?: boolean;
  /** 是否在开发环境禁用，默认 true */
  disableInDev?: boolean;
}) => {
  const {
    interval = 5 * 60 * 1000, // 默认 5 分钟
    autoRefresh = false,
    disableInDev = true,
  } = options || {};

  const currentVersionRef = useRef<string | null>(null);
  const checkingRef = useRef(false);

  // 获取当前版本信息
  const fetchVersion = async (): Promise<VersionInfo | null> => {
    try {
      // 添加时间戳防止缓存
      const response = await fetch(`/version.json?t=${Date.now()}`, {
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
        },
      });
      
      if (!response.ok) {
        console.warn('版本检查失败:', response.status);
        return null;
      }
      
      return await response.json();
    } catch (error) {
      console.warn('版本检查异常:', error);
      return null;
    }
  };

  // 检查版本更新
  const checkVersion = async () => {
    if (checkingRef.current) return;
    checkingRef.current = true;

    try {
      const versionInfo = await fetchVersion();
      
      if (!versionInfo) {
        checkingRef.current = false;
        return;
      }

      // 首次获取版本号
      if (currentVersionRef.current === null) {
        currentVersionRef.current = versionInfo.version;
        console.log('当前版本:', versionInfo.version);
        checkingRef.current = false;
        return;
      }

      // 检测到新版本
      if (versionInfo.version !== currentVersionRef.current) {
        console.log('检测到新版本:', versionInfo.version, '当前版本:', currentVersionRef.current);
        
        if (autoRefresh) {
          // 自动刷新
          window.location.reload();
        } else {
          // 弹窗提示
          Modal.confirm({
            title: '发现新版本',
            content: '系统已更新到新版本，请刷新页面以获得最佳体验。',
            okText: '立即刷新',
            cancelText: '稍后再说',
            onOk: () => {
              window.location.reload();
            },
          });
        }
      }
    } finally {
      checkingRef.current = false;
    }
  };

  useEffect(() => {
    // 开发环境禁用
    if (disableInDev && process.env.NODE_ENV === 'development') {
      return;
    }

    // 首次检查
    checkVersion();

    // 定时检查
    const timer = setInterval(checkVersion, interval);

    // 页面可见性变化时检查（用户切回页面时）
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkVersion();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [interval, autoRefresh, disableInDev]);
};
