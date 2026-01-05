const fs = require('fs');
const path = require('path');

const csvPath = path.join(__dirname, '../../doc/wilddata/主播和运营.CSV');

console.log('检查CSV文件编码和格式...\n');

// 读取文件
const content = fs.readFileSync(csvPath, 'utf-8');
const lines = content.split('\n');

console.log(`总行数: ${lines.length}`);
console.log(`\n前5行内容:`);
lines.slice(0, 5).forEach((line, i) => {
  console.log(`${i + 1}: ${line}`);
});

console.log(`\n最后3行内容:`);
lines.slice(-3).forEach((line, i) => {
  console.log(`${lines.length - 3 + i + 1}: ${line}`);
});

// 检查是否有乱码
const hasGarbled = content.includes('�');
console.log(`\n是否有乱码字符: ${hasGarbled ? '是 ❌' : '否 ✅'}`);

// 检查分隔符
const firstDataLine = lines[1] || '';
const commaCount = (firstDataLine.match(/,/g) || []).length;
console.log(`分隔符检查: ${commaCount === 1 ? '正确(1个逗号) ✅' : `异常(${commaCount}个逗号) ❌`}`);

// 解析CSV
const csv = require('csv-parse/sync');
try {
  const records = csv.parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true, // 处理UTF-8 BOM
  });
  
  console.log(`\n解析结果: 成功 ✅`);
  console.log(`解析到 ${records.length} 条记录`);
  
  // 获取列名
  const columnNames = Object.keys(records[0] || {});
  console.log(`列名: ${columnNames.join(', ')}`);
  
  console.log(`\n前3条记录:`);
  records.slice(0, 3).forEach((record, i) => {
    const anchor = record[columnNames[0]] || '';
    const operator = record[columnNames[1]] || '';
    console.log(`${i + 1}. 主播: ${anchor}, 运营: ${operator}`);
  });
  
  // 统计有运营的主播数量
  const withOperator = records.filter(r => r[columnNames[1]]?.trim()).length;
  console.log(`\n统计: ${records.length} 条记录，其中 ${withOperator} 条有对应运营`);
  
} catch (error) {
  console.log(`\n解析结果: 失败 ❌`);
  console.log(`错误: ${error.message}`);
}
