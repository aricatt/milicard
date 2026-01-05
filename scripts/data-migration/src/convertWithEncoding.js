const fs = require('fs');
const path = require('path');
const iconv = require('iconv-lite');
const { parse } = require('csv-parse/sync');
const { stringify } = require('csv-stringify/sync');
const config = require('./config');

/**
 * 使用正确编码转换数据
 */
async function convertWithEncoding() {
  console.log('='.repeat(60));
  console.log('数据转换工具 - 处理编码版');
  console.log('='.repeat(60));
  console.log('');

  ensureDirectories();

  try {
    // 1. 转换商品数据
    console.log('[1/7] 转换商品数据...');
    await convertGoods();

    // 2. 转换主播和运营数据
    console.log('\n[2/7] 转换主播和运营数据...');
    await convertPersonnel();

    // 3. 转换采购记录
    console.log('\n[3/7] 转换采购记录...');
    await convertPurchases();

    // 4. 转换入库记录
    console.log('\n[4/7] 转换入库记录...');
    await convertArrivals();

    // 5. 转换出库记录
    console.log('\n[5/7] 转换出库记录...');
    await convertStockOuts();

    // 6. 转换调货记录
    console.log('\n[6/7] 转换调货记录...');
    await convertTransfers();

    // 7. 转换主播库存
    console.log('\n[7/7] 转换主播库存...');
    await convertInventory();

    console.log('\n' + '='.repeat(60));
    console.log('✓ 转换完成！');
    console.log('='.repeat(60));
    console.log(`\n输出目录: ${config.outputPaths.converted}`);
    console.log('\n请用 Excel 打开 CSV 文件检查数据是否正确。');

  } catch (error) {
    console.error('\n✗ 转换失败:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

/**
 * 读取 CSV 文件（自动检测编码）
 */
function readCSV(filePath) {
  // 读取原始 buffer
  const buffer = fs.readFileSync(filePath);
  
  // 尝试不同编码
  const encodings = ['utf-8', 'gb18030', 'gbk', 'gb2312'];
  
  for (const encoding of encodings) {
    try {
      const content = iconv.decode(buffer, encoding);
      
      // 检查是否有乱码（简单检测：如果包含大量问号或特殊字符）
      const invalidChars = (content.match(/�/g) || []).length;
      if (invalidChars < 10) { // 允许少量无效字符
        console.log(`  使用编码: ${encoding}`);
        return content;
      }
    } catch (error) {
      continue;
    }
  }
  
  // 如果都失败，使用 GB18030（最兼容）
  console.log(`  使用默认编码: gb18030`);
  return iconv.decode(buffer, 'gb18030');
}

/**
 * 转换商品数据
 */
async function convertGoods() {
  const content = readCSV(config.csvPaths.sku);
  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
  });

  const converted = [];
  
  for (const record of records) {
    const values = Object.values(record);
    
    // 跳过空记录
    if (!values[2]) continue;
    
    converted.push({
      'SKU编号': values[2] || '',
      '中文名称': values[1] || '',
      '英文/越南语名称': values[0] || '',
      '品类': values[3] || '',
      '厂商': values[4] || '',
      '盒/箱': values[5] || '',
      '包/盒': values[6] || '',
    });
  }

  saveCSV('01_商品数据.csv', converted);
  console.log(`  ✓ 已保存 ${converted.length} 条商品记录`);
}

/**
 * 转换主播和运营数据
 * 注意：CSV中两列是独立的列表，不是对应关系
 */
async function convertPersonnel() {
  const content = readCSV(config.csvPaths.personnel);
  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  const anchors = [];  // 主播列表
  const operators = []; // 运营列表
  
  for (const record of records) {
    const values = Object.values(record);
    
    // 第一列是主播
    if (values[0] && values[0].trim()) {
      anchors.push({
        '姓名': values[0].trim(),
        '类型': '主播',
      });
    }
    
    // 第二列是运营
    if (values[1] && values[1].trim()) {
      operators.push({
        '姓名': values[1].trim(),
        '类型': '运营',
      });
    }
  }

  // 合并主播和运营
  const converted = [...anchors, ...operators];

  saveCSV('02_主播和运营.csv', converted);
  console.log(`  ✓ 已保存 ${converted.length} 条人员记录 (${anchors.length} 主播 + ${operators.length} 运营)`);
}

/**
 * 转换采购记录
 */
async function convertPurchases() {
  const content = readCSV(config.csvPaths.purchases);
  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
  });

  const converted = [];
  
  for (const record of records) {
    const values = Object.values(record);
    
    // 跳过空记录
    if (!values[0] && !values[1]) continue;
    
    converted.push({
      '采购单号': values[0] || '',
      '供应商': values[1] || '',
      '采购品类': values[2] || '',
      '厂商': values[3] || '',
      '产品盒数': values[4] || '',
      '产品规格': values[5] || '',
      '产品重量(kg)': values[6] || '',
      '单价(RMB)': values[7] || '',
      '采购总金额': values[8] || '',
      '下单时间': values[9] || '',
      '发货时间': values[10] || '',
      '货运单号': values[11] || '',
      '状态': values[12] || '',
    });
  }

  saveCSV('03_采购记录.csv', converted);
  console.log(`  ✓ 已保存 ${converted.length} 条采购记录`);
}

/**
 * 转换入库记录
 */
async function convertArrivals() {
  const content = readCSV(config.csvPaths.arrivals);
  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
  });

  const converted = [];
  
  for (const record of records) {
    const values = Object.values(record);
    
    // 跳过表头行和空记录
    if (!values[0] || values[0].includes('SKU CODE')) continue;
    
    converted.push({
      'SKU编号': values[0] || '',
      '中文名称': values[1] || '',
      '英文/越南语名称': values[2] || '',
      '品类': values[3] || '',
      '厂商': values[4] || '',
      '箱数': values[5] || '',
      '盒/箱': values[6] || '',
      '包/盒': values[7] || '',
      '仓库名称': values[8] || '',
      '入库人': values[9] || '',
      '入库时间': values[10] || '',
    });
  }

  saveCSV('04_入库记录.csv', converted);
  console.log(`  ✓ 已保存 ${converted.length} 条入库记录`);
}

/**
 * 转换出库记录
 */
async function convertStockOuts() {
  const content = readCSV(config.csvPaths.stockouts);
  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
  });

  const converted = [];
  
  for (const record of records) {
    const values = Object.values(record);
    
    // 跳过空记录
    if (!values[0]) continue;
    
    converted.push({
      'SKU编号': values[0] || '',
      '中文名称': values[1] || '',
      '英文/越南语名称': values[2] || '',
      '数量/盒': values[3] || '0',
      '整盒包数': values[4] || '0',
      '零散包数': values[5] || '0',
      '主播': values[6] || '',
      '取货人': values[7] || '',
      '出库日期': values[8] || '',
      '出库时间': values[9] || '',
    });
  }

  saveCSV('05_出库记录.csv', converted);
  console.log(`  ✓ 已保存 ${converted.length} 条出库记录`);
}

/**
 * 转换调货记录
 */
async function convertTransfers() {
  const content = readCSV(config.csvPaths.transfers);
  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
  });

  const converted = [];
  
  for (const record of records) {
    const values = Object.values(record);
    
    // 跳过空记录
    if (!values[0]) continue;
    
    converted.push({
      'SKU编号': values[0] || '',
      '中文名称': values[1] || '',
      '英文/越南语名称': values[2] || '',
      '数量/盒': values[3] || '0',
      '整盒包数': values[4] || '0',
      '零散包数': values[5] || '0',
      '从主播': values[6] || '',
      '到主播': values[7] || '',
      '登记人': values[8] || '',
      '调货日期': values[9] || '',
      '调货时间': values[10] || '',
    });
  }

  saveCSV('06_调货记录.csv', converted);
  console.log(`  ✓ 已保存 ${converted.length} 条调货记录`);
}

/**
 * 转换主播库存
 */
async function convertInventory() {
  const content = readCSV(config.csvPaths.inventory);
  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
  });

  const converted = [];
  
  for (const record of records) {
    const values = Object.values(record);
    
    // 跳过空记录
    if (!values[1]) continue;
    
    converted.push({
      '主播': values[1] || '',
      '运营': values[2] || '',
      'SKU编号': values[10] || '',
      '中文名称': values[11] || '',
      '英文/越南语名称': values[3] || '',
      '拿货盒数': values[4] || '0',
      '拿货包数': values[5] || '0',
      '销售数量': values[6] || '0',
      '回库包数': values[7] || '0',
      '直播间调货': values[8] || '0',
      '主播未回包数': values[9] || '0',
    });
  }

  saveCSV('07_主播库存.csv', converted);
  console.log(`  ✓ 已保存 ${converted.length} 条库存记录`);
}

/**
 * 保存为 CSV 文件（UTF-8 with BOM）
 */
function saveCSV(filename, data) {
  const csv = stringify(data, {
    header: true,
    bom: true,
  });
  
  const filePath = path.join(config.outputPaths.converted, filename);
  fs.writeFileSync(filePath, csv, 'utf-8');
}

/**
 * 确保输出目录存在
 */
function ensureDirectories() {
  const dirs = Object.values(config.outputPaths);
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
}

// 运行主函数
if (require.main === module) {
  convertWithEncoding().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { convertWithEncoding };
