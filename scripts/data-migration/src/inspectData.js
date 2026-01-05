const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const config = require('./config');

/**
 * 检查和分析原始 CSV 数据
 */
async function inspectData() {
  console.log('='.repeat(60));
  console.log('数据检查工具 - 查看原始 CSV 内容');
  console.log('='.repeat(60));
  console.log('');

  const files = [
    { name: 'SKU.CSV', path: config.csvPaths.sku },
    { name: '主播和运营.CSV', path: config.csvPaths.personnel },
    { name: '采购管理-采购记录.CSV', path: config.csvPaths.purchases },
    { name: '入库.CSV', path: config.csvPaths.arrivals },
    { name: '出库.CSV', path: config.csvPaths.stockouts },
    { name: '调货.CSV', path: config.csvPaths.transfers },
    { name: '主播库存.CSV', path: config.csvPaths.inventory },
  ];

  for (const file of files) {
    try {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`文件: ${file.name}`);
      console.log('='.repeat(60));

      if (!fs.existsSync(file.path)) {
        console.log('❌ 文件不存在');
        continue;
      }

      const content = fs.readFileSync(file.path, 'utf-8');
      const lines = content.split('\n');
      
      console.log(`\n文件大小: ${(content.length / 1024).toFixed(2)} KB`);
      console.log(`总行数: ${lines.length}`);

      // 尝试解析 CSV
      try {
        const records = parse(content, {
          columns: true,
          skip_empty_lines: true,
          trim: true,
          relax_column_count: true, // 允许列数不一致
        });

        console.log(`\n✓ 成功解析 ${records.length} 条记录`);
        
        // 显示列名
        if (records.length > 0) {
          const columns = Object.keys(records[0]);
          console.log(`\n列名 (${columns.length} 列):`);
          columns.forEach((col, idx) => {
            console.log(`  ${idx + 1}. "${col}"`);
          });

          // 显示前3条记录
          console.log(`\n前 3 条记录:`);
          records.slice(0, 3).forEach((record, idx) => {
            console.log(`\n--- 记录 ${idx + 1} ---`);
            Object.entries(record).forEach(([key, value]) => {
              const displayValue = value ? String(value).substring(0, 50) : '(空)';
              console.log(`  ${key}: ${displayValue}`);
            });
          });

          // 统计空值
          console.log(`\n数据质量检查:`);
          const emptyStats = {};
          columns.forEach(col => {
            const emptyCount = records.filter(r => !r[col] || r[col].trim() === '').length;
            emptyStats[col] = emptyCount;
          });
          
          Object.entries(emptyStats).forEach(([col, count]) => {
            const percentage = ((count / records.length) * 100).toFixed(1);
            if (count > 0) {
              console.log(`  ${col}: ${count}/${records.length} (${percentage}%) 为空`);
            }
          });
        }

      } catch (parseError) {
        console.log(`\n❌ CSV 解析失败: ${parseError.message}`);
        console.log(`\n原始内容预览 (前 500 字符):`);
        console.log(content.substring(0, 500));
      }

    } catch (error) {
      console.log(`\n❌ 读取文件失败: ${error.message}`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('检查完成');
  console.log('='.repeat(60));
}

// 运行检查
if (require.main === module) {
  inspectData().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { inspectData };
