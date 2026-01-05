const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const csv = require('csv-parse/sync');
const config = require('./config');

/**
 * 将生成的CSV导入表转换为Excel格式，方便导入测试
 */
async function main() {
  console.log('='.repeat(60));
  console.log('CSV导入表转Excel工具');
  console.log('='.repeat(60));
  console.log('');

  try {
    const convertedDir = config.outputPaths.converted;
    
    // 检查目录是否存在
    if (!fs.existsSync(convertedDir)) {
      console.error(`错误: 输出目录不存在: ${convertedDir}`);
      console.log('请先运行: npm run convert:import');
      process.exit(1);
    }

    // 获取所有CSV文件
    const csvFiles = fs.readdirSync(convertedDir)
      .filter(file => file.endsWith('.csv'))
      .sort();

    if (csvFiles.length === 0) {
      console.error('错误: 没有找到CSV文件');
      console.log('请先运行: npm run convert:import');
      process.exit(1);
    }

    console.log(`找到 ${csvFiles.length} 个CSV文件\n`);

    let successCount = 0;
    let errorCount = 0;

    // 转换每个CSV文件为Excel
    for (const csvFile of csvFiles) {
      try {
        const csvPath = path.join(convertedDir, csvFile);
        const excelFile = csvFile.replace('.csv', '.xlsx');
        const excelPath = path.join(convertedDir, excelFile);

        console.log(`[${successCount + errorCount + 1}/${csvFiles.length}] ${csvFile}`);

        // 读取CSV文件
        const csvContent = fs.readFileSync(csvPath, 'utf-8');
        
        // 解析CSV
        const records = csv.parse(csvContent, {
          columns: true,
          skip_empty_lines: true,
          trim: true,
          bom: true, // 处理UTF-8 BOM
        });

        if (records.length === 0) {
          console.log(`  ⚠ 跳过空文件\n`);
          continue;
        }

        // 创建Excel工作簿
        const workbook = XLSX.utils.book_new();
        
        // 将数据转换为工作表
        const worksheet = XLSX.utils.json_to_sheet(records);
        
        // 设置列宽（根据内容自动调整）
        const columnWidths = getColumnWidths(records);
        worksheet['!cols'] = columnWidths;

        // 添加工作表到工作簿
        const sheetName = getSheetName(csvFile);
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

        // 保存Excel文件
        XLSX.writeFile(workbook, excelPath);

        console.log(`  ✓ 已生成: ${excelFile}`);
        console.log(`     记录数: ${records.length} 条\n`);
        
        successCount++;
      } catch (error) {
        console.error(`  ✗ 转换失败: ${error.message}\n`);
        errorCount++;
      }
    }

    // 打印汇总
    console.log('='.repeat(60));
    console.log('转换完成');
    console.log('='.repeat(60));
    console.log(`成功: ${successCount} 个文件`);
    if (errorCount > 0) {
      console.log(`失败: ${errorCount} 个文件`);
    }
    console.log(`\nExcel文件保存在: ${convertedDir}`);
    console.log('\n📋 下一步操作：');
    console.log('1. 打开Excel文件，复查数据是否正确');
    console.log('2. 通过系统界面导入Excel文件进行测试');

  } catch (error) {
    console.error('\n✗ 转换过程中发生错误:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

/**
 * 根据CSV文件名生成工作表名称
 */
function getSheetName(csvFile) {
  // 移除编号前缀和扩展名
  const name = csvFile.replace(/^\d+_/, '').replace('.csv', '');
  // Excel工作表名称限制为31个字符
  return name.substring(0, 31);
}

/**
 * 根据数据内容计算列宽
 */
function getColumnWidths(records) {
  if (records.length === 0) return [];

  const columns = Object.keys(records[0]);
  const widths = [];

  columns.forEach(col => {
    // 计算列名宽度
    let maxWidth = col.length;

    // 计算数据宽度（取前100行的最大值）
    const sampleSize = Math.min(100, records.length);
    for (let i = 0; i < sampleSize; i++) {
      const value = String(records[i][col] || '');
      // 中文字符按2个字符宽度计算
      const width = value.replace(/[\u4e00-\u9fa5]/g, 'xx').length;
      maxWidth = Math.max(maxWidth, width);
    }

    // 限制最大宽度为50，最小宽度为10
    widths.push({ wch: Math.min(Math.max(maxWidth + 2, 10), 50) });
  });

  return widths;
}

// 运行主函数
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { main };
