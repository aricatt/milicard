import React, { useEffect, useState } from 'react';
import { Tag, Tooltip } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';

interface VersionInfo {
  version: string;
  baseVersion?: string;
  buildTime: string;
  buildDate?: string;
  buildTimeFormatted?: string;
}

/**
 * 版本号显示组件
 * 显示在页面左下角
 * 版本号格式: v主版本.次版本.修订版本.YYMMDD.HHMM
 */
const VersionDisplay: React.FC = () => {
  const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(null);

  useEffect(() => {
    // 获取版本信息
    fetch('/version.json?t=' + Date.now())
      .then(res => res.json())
      .then(data => setVersionInfo(data))
      .catch(() => {
        // 如果获取失败，使用默认版本号
        setVersionInfo({
          version: '6.0.0',
          buildTime: new Date().toISOString(),
        });
      });
  }, []);

  if (!versionInfo) return null;

  // 解析版本号格式: 1.0.1.260127.1920
  const parseVersion = (version: string) => {
    const parts = version.split('.');
    if (parts.length >= 5) {
      // 新格式: v1.0.1.260127.1920
      const baseVer = `${parts[0]}.${parts[1]}.${parts[2]}`;
      const dateStr = parts[3]; // 260127
      const timeStr = parts[4]; // 1920
      
      // 解析日期: 260127 -> 2026-01-27
      const year = '20' + dateStr.slice(0, 2);
      const month = dateStr.slice(2, 4);
      const day = dateStr.slice(4, 6);
      
      // 解析时间: 1920 -> 19:20
      const hour = timeStr.slice(0, 2);
      const minute = timeStr.slice(2, 4);
      
      return {
        full: version,
        base: baseVer,
        date: `${year}-${month}-${day}`,
        time: `${hour}:${minute}`,
      };
    }
    // 旧格式或简单格式
    return {
      full: version,
      base: version,
      date: versionInfo.buildDate || new Date(versionInfo.buildTime).toLocaleDateString('zh-CN'),
      time: versionInfo.buildTimeFormatted || new Date(versionInfo.buildTime).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
    };
  };

  const parsed = parseVersion(versionInfo.version);

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 16,
        left: 16,
        zIndex: 999,
      }}
    >
      <Tooltip
        title={
          <div style={{ fontSize: 12 }}>
            <div><strong>版本号:</strong> v{parsed.full}</div>
            <div><strong>基础版本:</strong> v{parsed.base}</div>
            <div><strong>构建日期:</strong> {parsed.date}</div>
            <div><strong>构建时间:</strong> {parsed.time}</div>
          </div>
        }
      >
        <Tag
          icon={<InfoCircleOutlined />}
          color="blue"
          style={{
            cursor: 'pointer',
            fontSize: 12,
            padding: '2px 8px',
            opacity: 0.8,
          }}
        >
          v{parsed.full}
        </Tag>
      </Tooltip>
    </div>
  );
};

export default VersionDisplay;
