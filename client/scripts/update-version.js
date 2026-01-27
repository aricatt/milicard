/**
 * 自动更新版本号脚本
 * 在构建前运行，自动更新 public/version.json
 * 版本号格式: v主版本.次版本.修订版本.YYMMDD.HHMM
 * 例如: v1.0.1.260127.1920
 */

const fs = require('fs');
const path = require('path');

// 读取 package.json 获取基础版本号
const packageJsonPath = path.join(__dirname, '../package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
const baseVersion = packageJson.version; // 例如: "1.0.1"

// 获取当前时间
const now = new Date();

// 格式化日期: YYMMDD
const year = String(now.getFullYear()).slice(-2); // 26
const month = String(now.getMonth() + 1).padStart(2, '0'); // 01
const day = String(now.getDate()).padStart(2, '0'); // 27
const dateStr = `${year}${month}${day}`; // 260127

// 格式化时间: HHMM
const hours = String(now.getHours()).padStart(2, '0'); // 19
const minutes = String(now.getMinutes()).padStart(2, '0'); // 20
const timeStr = `${hours}${minutes}`; // 1920

// 生成完整版本号: v1.0.1.260127.1920
const fullVersion = `${baseVersion}.${dateStr}.${timeStr}`;

// 生成版本信息
const versionInfo = {
  version: fullVersion,
  baseVersion: baseVersion,
  buildTime: now.toISOString(),
  buildDate: `${now.getFullYear()}-${month}-${day}`,
  buildTimeFormatted: `${hours}:${minutes}`,
};

// 写入 public/version.json
const versionFilePath = path.join(__dirname, '../public/version.json');
fs.writeFileSync(versionFilePath, JSON.stringify(versionInfo, null, 2), 'utf-8');

console.log('✅ 版本信息已更新:');
console.log('   版本号:', fullVersion);
console.log('   构建时间:', `${versionInfo.buildDate} ${versionInfo.buildTimeFormatted}`);
