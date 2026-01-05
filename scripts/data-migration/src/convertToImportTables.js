const fs = require('fs');
const path = require('path');
const iconv = require('iconv-lite');
const { parse } = require('csv-parse/sync');
const { stringify } = require('csv-stringify/sync');
const XLSX = require('xlsx');
const config = require('./config');

/**
 * 将聚合的老数据拆分成符合系统导入顺序的独立导入表
 * 
 * 导入顺序：
 * 1. 商品品类
 * 2. 供应商
 * 3. 全局商品
 * 4. 直播间/仓库
 * 5. 主播/运营
 * 6. 基地级商品设置
 * 7. 采购订单
 * 8. 到货记录
 * 9. 出库记录
 * 10. 调货记录
 * 11. 库存消耗记录
 */
async function convertToImportTables() {
  console.log('='.repeat(80));
  console.log('数据拆分转换工具 - 生成系统导入表');
  console.log('='.repeat(80));
  console.log('');

  ensureDirectories();

  try {
    // 读取所有原始数据
    console.log('[步骤 1/11] 读取原始数据...');
    const skuData = readCSV(config.csvPaths.sku);
    const purchaseData = readCSV(config.csvPaths.purchases);
    const arrivalData = readCSV(config.csvPaths.arrivals);
    const stockoutData = readCSV(config.csvPaths.stockouts);
    const transferData = readCSV(config.csvPaths.transfers);
    const inventoryData = readCSV(config.csvPaths.inventory);
    const personnelData = readCSV(config.csvPaths.personnel);

    // 解析CSV
    const skuRecords = parse(skuData, { columns: true, skip_empty_lines: true, trim: true, relax_column_count: true });
    const purchaseRecords = parse(purchaseData, { columns: true, skip_empty_lines: true, trim: true, relax_column_count: true });
    const arrivalRecords = parse(arrivalData, { columns: true, skip_empty_lines: true, trim: true, relax_column_count: true });
    const stockoutRecords = parse(stockoutData, { columns: true, skip_empty_lines: true, trim: true, relax_column_count: true });
    const transferRecords = parse(transferData, { columns: true, skip_empty_lines: true, trim: true, relax_column_count: true });
    const inventoryRecords = parse(inventoryData, { columns: true, skip_empty_lines: true, trim: true, relax_column_count: true });
    const personnelRecords = parse(personnelData, { columns: true, skip_empty_lines: true, trim: true, relax_column_count: true });

    // 1. 提取商品品类
    console.log('\n[步骤 2/11] 提取商品品类...');
    const categories = extractCategories(skuRecords);
    saveCSV('01_商品品类导入表.csv', categories);
    console.log(`  ✓ 提取 ${categories.length} 个品类`);

    // 2. 提取供应商
    console.log('\n[步骤 3/11] 提取供应商...');
    const suppliers = extractSuppliers(purchaseRecords, skuRecords);
    saveCSV('02_供应商导入表.csv', suppliers);
    console.log(`  ✓ 提取 ${suppliers.length} 个供应商`);

    // 3. 提取全局商品
    console.log('\n[步骤 4/11] 提取全局商品...');
    const globalGoods = extractGlobalGoods(skuRecords);
    saveCSV('03_全局商品导入表.csv', globalGoods);
    console.log(`  ✓ 提取 ${globalGoods.length} 个商品`);

    // 4. 提取直播间/仓库
    console.log('\n[步骤 5/11] 提取直播间/仓库...');
    const locations = extractLocations(arrivalRecords, stockoutRecords, transferRecords, inventoryRecords);
    saveCSV('04_直播间仓库导入表.csv', locations);
    console.log(`  ✓ 提取 ${locations.length} 个地点`);

    // 5. 提取主播/运营
    console.log('\n[步骤 6/11] 提取主播/运营...');
    const personnel = extractPersonnel(personnelRecords, stockoutRecords, transferRecords, inventoryRecords);
    saveCSV('05_主播运营导入表.csv', personnel);
    console.log(`  ✓ 提取 ${personnel.length} 个人员`);

    // 6. 生成基地级商品设置（暂时为空，需要手动设置价格）
    console.log('\n[步骤 7/11] 生成基地级商品设置模板...');
    const goodsSettings = generateGoodsSettingsTemplate(skuRecords);
    saveCSV('06_基地级商品设置导入表.csv', goodsSettings);
    console.log(`  ✓ 生成 ${goodsSettings.length} 条商品设置模板（需手动填写价格）`);

    // 7. 转换采购订单
    console.log('\n[步骤 8/11] 转换采购订单...');
    const purchases = convertPurchaseOrders(purchaseRecords);
    saveCSV('07_采购订单导入表.csv', purchases);
    console.log(`  ✓ 转换 ${purchases.length} 条采购订单`);

    // 8. 转换到货记录
    console.log('\n[步骤 9/11] 转换到货记录...');
    const arrivals = convertArrivalRecords(arrivalRecords);
    saveCSV('08_到货记录导入表.csv', arrivals);
    console.log(`  ✓ 转换 ${arrivals.length} 条到货记录`);

    // 9. 转换出库记录
    console.log('\n[步骤 10/11] 转换出库记录...');
    const stockouts = convertStockoutRecords(stockoutRecords);
    saveCSV('09_出库记录导入表.csv', stockouts);
    console.log(`  ✓ 转换 ${stockouts.length} 条出库记录`);

    // 10. 转换调货记录
    console.log('\n[步骤 11/11] 转换调货记录...');
    const transfers = convertTransferRecords(transferRecords);
    saveCSV('10_调货记录导入表.csv', transfers);
    console.log(`  ✓ 转换 ${transfers.length} 条调货记录`);

    // 生成导入说明文档
    generateImportGuide();

    console.log('\n' + '='.repeat(80));
    console.log('✓ 数据拆分完成！');
    console.log('='.repeat(80));
    console.log(`\n输出目录: ${config.outputPaths.converted}`);
    console.log('\n已生成CSV和Excel两种格式的导入表');
    console.log('\n请按照以下顺序导入数据：');
    console.log('  1. 01_商品品类导入表 (.csv / .xlsx)');
    console.log('  2. 02_供应商导入表 (.csv / .xlsx)');
    console.log('  3. 03_全局商品导入表 (.csv / .xlsx)');
    console.log('  4. 04_直播间仓库导入表 (.csv / .xlsx)');
    console.log('  5. 05_主播运营导入表 (.csv / .xlsx)');
    console.log('  6. 06_基地级商品设置导入表 (.csv / .xlsx)（需先手动填写价格）');
    console.log('  7. 07_采购订单导入表 (.csv / .xlsx)');
    console.log('  8. 08_到货记录导入表 (.csv / .xlsx)');
    console.log('  9. 09_出库记录导入表 (.csv / .xlsx)');
    console.log(' 10. 10_调货记录导入表 (.csv / .xlsx)');
    console.log('\n💡 提示：Excel文件更适合人工查看和编辑，CSV文件更适合程序处理');
    console.log('\n详细说明请查看: 导入顺序说明.md');

  } catch (error) {
    console.error('\n✗ 转换失败:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

/**
 * 提取商品品类
 * 从品类字段中提取，分离中英文名称
 */
function extractCategories(skuRecords) {
  const categoryMap = new Map();

  skuRecords.forEach(record => {
    const values = Object.values(record);
    const categoryRaw = values[3] || ''; // 品类字段
    
    if (!categoryRaw) return;

    // 分离中英文：格式如 "Card/卡牌" 或 "Thẻ hộp/卡砖"
    const parts = categoryRaw.split('/');
    const englishName = parts[0]?.trim() || '';
    const chineseName = parts[1]?.trim() || parts[0]?.trim() || '';

    if (chineseName && !categoryMap.has(chineseName)) {
      categoryMap.set(chineseName, {
        '品类编码': '',
        '品类名称': chineseName,
        '描述': englishName || '',
        '排序': '',
      });
    }
  });

  return Array.from(categoryMap.values());
}

/**
 * 提取供应商
 * 从采购记录和商品数据中提取
 */
function extractSuppliers(purchaseRecords, skuRecords) {
  const supplierMap = new Map();

  // 从采购记录中提取
  purchaseRecords.forEach(record => {
    const values = Object.values(record);
    const supplierName = values[1]?.trim(); // 供应商名称
    
    if (supplierName && !supplierMap.has(supplierName)) {
      supplierMap.set(supplierName, {
        '供应商编号': '', // 留空，系统自动生成
        '供应商名称': supplierName,
        '联系人': '',
        '联系电话': '',
        '邮箱': '',
        '地址': '',
        '状态': '启用',
        '备注': '从采购记录导入',
      });
    }
  });

  // 从商品数据中提取厂商
  skuRecords.forEach(record => {
    const values = Object.values(record);
    const manufacturer = values[4]?.trim(); // 厂商
    
    if (manufacturer && !supplierMap.has(manufacturer)) {
      supplierMap.set(manufacturer, {
        '供应商编号': '',
        '供应商名称': manufacturer,
        '联系人': '',
        '联系电话': '',
        '邮箱': '',
        '地址': '',
        '状态': '启用',
        '备注': '从商品厂商导入',
      });
    }
  });

  return Array.from(supplierMap.values());
}

/**
 * 提取全局商品
 */
function extractGlobalGoods(skuRecords) {
  const goods = [];

  skuRecords.forEach(record => {
    const values = Object.values(record);
    
    const skuCode = values[2]?.trim();
    if (!skuCode) return;

    // 分离品类中英文
    const categoryRaw = values[3] || '';
    const categoryParts = categoryRaw.split('/');
    const categoryName = categoryParts[1]?.trim() || categoryParts[0]?.trim() || '';

    const nameVi = values[0]?.trim() || '';
    goods.push({
      '商品编码': '', // 留空，老数据编码格式与系统不一致，系统会自动生成
      '品类': categoryName,
      '商品名称': values[1]?.trim() || '', // 中文名称
      '英文名称': '',
      '泰语名称': '',
      '越南语名称': nameVi,
      '厂家名称': values[4]?.trim() || '',
      '多少盒1箱': values[5]?.trim() || '1',
      '多少包1盒': values[6]?.trim() || '1',
      '描述': '',
    });
  });

  return goods;
}

/**
 * 提取直播间/仓库
 */
function extractLocations(arrivalRecords, stockoutRecords, transferRecords, inventoryRecords) {
  const locationMap = new Map();

  // 从入库记录提取仓库
  arrivalRecords.forEach(record => {
    const values = Object.values(record);
    const locationName = values[8]?.trim(); // 仓库名称
    
    if (locationName && !locationMap.has(locationName)) {
      locationMap.set(locationName, {
        '地点编号': '', // 留空，系统自动生成
        '地点名称': locationName,
        '地点类型': '仓库',
        '联系人': '',
        '联系电话': '',
        '地址': '',
        '备注': '从入库记录导入',
      });
    }
  });

  // 从出库记录提取主播直播间
  stockoutRecords.forEach(record => {
    const values = Object.values(record);
    const anchorName = values[6]?.trim(); // 主播
    
    if (anchorName) {
      const locationName = `${anchorName}的直播间`;
      if (!locationMap.has(locationName)) {
        locationMap.set(locationName, {
          '地点编号': '',
          '地点名称': locationName,
          '地点类型': '直播间',
          '联系人': '',
          '联系电话': '',
          '地址': '',
          '备注': `主播：${anchorName}`,
        });
      }
    }
  });

  // 从调货记录提取
  transferRecords.forEach(record => {
    const values = Object.values(record);
    const fromAnchor = values[6]?.trim();
    const toAnchor = values[7]?.trim();
    
    [fromAnchor, toAnchor].forEach(anchorName => {
      if (anchorName) {
        const locationName = `${anchorName}的直播间`;
        if (!locationMap.has(locationName)) {
          locationMap.set(locationName, {
            '地点编号': '',
            '地点名称': locationName,
            '地点类型': '直播间',
            '联系人': '',
            '联系电话': '',
            '地址': '',
            '备注': `主播：${anchorName}`,
          });
        }
      }
    });
  });

  // 添加总仓库（如果不存在）
  if (!locationMap.has('总仓库')) {
    locationMap.set('总仓库', {
      '地点编号': '',
      '地点名称': '总仓库',
      '地点类型': '总仓库',
      '联系人': '',
      '联系电话': '',
      '地址': '',
      '备注': '主仓库',
    });
  }

  return Array.from(locationMap.values());
}

/**
 * 提取主播/运营
 * 新格式：第一列是姓名，第二列是角色（主播/运营）
 */
function extractPersonnel(personnelRecords, stockoutRecords, transferRecords, inventoryRecords) {
  const personnelMap = new Map();

  // 从主播和运营CSV提取
  personnelRecords.forEach(record => {
    const values = Object.values(record);
    
    const name = values[0]?.trim();
    const role = values[1]?.trim();
    
    if (name && role && !personnelMap.has(name)) {
      personnelMap.set(name, {
        '人员编号': '',
        '姓名': name,
        '角色': role,
        '对应运营': '',
        '联系电话': '',
        '邮箱': '',
        '状态': '启用',
        '备注': '',
      });
    }
  });

  // 从出库记录补充取货人
  stockoutRecords.forEach(record => {
    const values = Object.values(record);
    const pickerName = values[7]?.trim(); // 取货人
    
    if (pickerName && !personnelMap.has(pickerName)) {
      personnelMap.set(pickerName, {
        '人员编号': '',
        '姓名': pickerName,
        '角色': '仓管',
        '对应运营': '',
        '联系电话': '',
        '邮箱': '',
        '状态': '启用',
        '备注': '从出库记录导入',
      });
    }
  });

  return Array.from(personnelMap.values());
}

/**
 * 生成基地级商品设置模板
 */
function generateGoodsSettingsTemplate(skuRecords) {
  const settings = [];

  skuRecords.forEach(record => {
    const values = Object.values(record);
    const skuCode = values[2]?.trim();
    
    if (!skuCode) return;

    const categoryRaw = values[3] || '';
    const categoryParts = categoryRaw.split('/');
    const categoryName = categoryParts[1]?.trim() || categoryParts[0]?.trim() || '';

    settings.push({
      '商品编号': '', // 留空，老数据编码格式与系统不一致，通过品类+商品名称匹配
      '品类': categoryName,
      '商品名称': values[1]?.trim() || '',
      '商品别名': '',
      '零售价': '', // 需要手动填写，格式：[VND]22356
      '采购价': '', // 需要手动填写
    });
  });

  return settings;
}

/**
 * 转换采购订单
 * 实际数据字段顺序（与标题不符）：
 * 0:采购单号, 1:供应商, 2:采购品类, 3:厂商, 4:产品名称, 5:产品规格, 
 * 6:产品重量(kg), 7:数量1, 8:数量2, 9:单价, 10:总金额, 11:下单时间, 12:发货时间
 */
function convertPurchaseOrders(purchaseRecords) {
  const orders = [];

  purchaseRecords.forEach(record => {
    const values = Object.values(record);
    
    if (!values[0] && !values[1]) return;

    // 根据实际数据列提取
    const orderNo = values[0]?.trim() || ''; // 采购单号
    const supplierName = values[1]?.trim() || ''; // 供应商
    const categoryRaw = values[2]?.trim() || ''; // 采购品类
    const manufacturer = values[3]?.trim() || ''; // 厂商
    const productName = values[4]?.trim() || ''; // 产品名称
    const productSpec = values[5]?.trim() || ''; // 产品规格
    const productWeight = values[6]?.trim() || '0'; // 产品重量
    const qty1 = values[7]?.trim() || '0'; // 数量1
    const qty2 = values[8]?.trim() || '0'; // 数量2
    const unitPrice = values[9]?.trim() || '0'; // 单价
    const totalAmount = values[10]?.trim() || '0'; // 总金额
    const orderDate = values[11]?.trim() || ''; // 下单时间
    const shipDate = values[12]?.trim() || ''; // 发货时间

    // 分离品类中英文
    const categoryParts = categoryRaw.split('/');
    const categoryName = categoryParts[1]?.trim() || categoryParts[0]?.trim() || '';

    // 商品名称优先使用产品名称，其次是厂商名
    const goodsName = productName || manufacturer || '';

    // 使用qty1作为采购数量（通常是盒数）
    const purchaseQty = qty1 || '0';

    orders.push({
      '采购日期': orderDate,
      '采购编号': orderNo, // 保留原采购单号
      '品类': categoryName,
      '商品名称': goodsName,
      '供应商': supplierName,
      '采购箱': '0', // 原始数据没有箱数，默认0
      '采购盒': purchaseQty, // 使用qty1
      '采购包': '0', // 原始数据没有包数，默认0
      '拿货单价箱': '', // 需要手动填写，格式：[VND]金额 或 [CNY]金额
      '实付金额': '', // 需要手动填写，格式：[VND]金额 或 [CNY]金额
    });
  });

  return orders;
}

/**
 * 转换到货记录
 */
function convertArrivalRecords(arrivalRecords) {
  const arrivals = [];

  arrivalRecords.forEach(record => {
    const values = Object.values(record);
    
    if (!values[0] || values[0].includes('SKU CODE')) return;

    const categoryRaw = values[3] || '';
    const categoryParts = categoryRaw.split('/');
    const categoryName = categoryParts[1]?.trim() || categoryParts[0]?.trim() || '';

    arrivals.push({
      '到货日期': values[10]?.trim() || '',
      '采购编号': '', // 需要关联采购订单，留空
      '采购名称': '', // 需要关联采购订单，留空
      '商品编号': values[0]?.trim() || '',
      '品类': categoryName,
      '商品': values[1]?.trim() || '',
      '直播间': values[8]?.trim() || '总仓库',
      '主播': values[9]?.trim() || '',
      '到货箱': values[5]?.trim() || '0',
      '到货盒': '0', // 原始数据没有盒数
      '到货包': '0', // 原始数据没有包数
    });
  });

  return arrivals;
}

/**
 * 转换出库记录
 */
function convertStockoutRecords(stockoutRecords) {
  const stockouts = [];

  stockoutRecords.forEach(record => {
    const values = Object.values(record);
    
    if (!values[0]) return;

    stockouts.push({
      'SKU编号': values[0]?.trim() || '',
      '中文名称': values[1]?.trim() || '',
      '英文/越南语名称': values[2]?.trim() || '',
      '数量/盒': values[3]?.trim() || '0',
      '整盒包数': values[4]?.trim() || '0',
      '零散包数': values[5]?.trim() || '0',
      '主播': values[6]?.trim() || '',
      '取货人': values[7]?.trim() || '',
      '出库日期': values[8]?.trim() || '',
      '出库时间': values[9]?.trim() || '',
    });
  });

  return stockouts;
}

/**
 * 转换调货记录
 */
function convertTransferRecords(transferRecords) {
  const transfers = [];

  transferRecords.forEach(record => {
    const values = Object.values(record);
    
    if (!values[0]) return;

    transfers.push({
      'SKU编号': values[0]?.trim() || '',
      '中文名称': values[1]?.trim() || '',
      '英文/越南语名称': values[2]?.trim() || '',
      '数量/盒': values[3]?.trim() || '0',
      '整盒包数': values[4]?.trim() || '0',
      '零散包数': values[5]?.trim() || '0',
      '从主播': values[6]?.trim() || '',
      '到主播': values[7]?.trim() || '',
      '登记人': values[8]?.trim() || '',
      '调货日期': values[9]?.trim() || '',
      '调货时间': values[10]?.trim() || '',
    });
  });

  return transfers;
}

/**
 * 读取CSV文件（自动检测编码）
 */
function readCSV(filePath) {
  const buffer = fs.readFileSync(filePath);
  const encodings = ['utf-8', 'gb18030', 'gbk', 'gb2312'];
  
  for (const encoding of encodings) {
    try {
      const content = iconv.decode(buffer, encoding);
      const invalidChars = (content.match(/�/g) || []).length;
      if (invalidChars < 10) {
        console.log(`  使用编码: ${encoding}`);
        return content;
      }
    } catch (error) {
      continue;
    }
  }
  
  console.log(`  使用默认编码: gb18030`);
  return iconv.decode(buffer, 'gb18030');
}

/**
 * 保存为CSV文件（UTF-8 with BOM）并同时生成Excel文件
 */
function saveCSV(filename, data) {
  // 保存CSV文件
  const csv = stringify(data, {
    header: true,
    bom: true,
  });
  
  const csvPath = path.join(config.outputPaths.converted, filename);
  fs.writeFileSync(csvPath, csv, 'utf-8');
  
  // 同时生成Excel文件
  if (data.length > 0) {
    const excelFilename = filename.replace('.csv', '.xlsx');
    const excelPath = path.join(config.outputPaths.converted, excelFilename);
    
    // 创建工作簿
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(data);
    
    // 设置列宽
    const columnWidths = getColumnWidths(data);
    worksheet['!cols'] = columnWidths;
    
    // 获取工作表名称（去掉编号前缀，限制31个字符）
    const sheetName = filename.replace(/^\d+_/, '').replace('.csv', '').substring(0, 31);
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    
    // 保存Excel文件
    XLSX.writeFile(workbook, excelPath);
  }
}

/**
 * 根据数据内容计算列宽
 */
function getColumnWidths(records) {
  if (records.length === 0) return [];

  const columns = Object.keys(records[0]);
  const widths = [];

  columns.forEach(col => {
    let maxWidth = col.length;
    const sampleSize = Math.min(100, records.length);
    for (let i = 0; i < sampleSize; i++) {
      const value = String(records[i][col] || '');
      const width = value.replace(/[\u4e00-\u9fa5]/g, 'xx').length;
      maxWidth = Math.max(maxWidth, width);
    }
    widths.push({ wch: Math.min(Math.max(maxWidth + 2, 10), 50) });
  });

  return widths;
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

/**
 * 生成导入说明文档
 */
function generateImportGuide() {
  const guide = `# 数据导入顺序说明

## 重要提示
数据导入必须严格按照以下顺序进行，因为存在依赖关系：

## 导入顺序

### 1. 商品品类导入表
**文件**: \`01_商品品类导入表.csv\`
**页面**: 全局信息 > 商品品类
**说明**: 
- 品类是商品的基础分类
- 必须先导入品类，商品才能关联品类
- 已自动从原始数据中提取并分离中英文名称

### 2. 供应商导入表
**文件**: \`02_供应商导入表.csv\`
**页面**: 基地管理 > 供应商
**说明**:
- 从采购记录和商品厂商中提取
- 供应商编号留空，系统会自动生成
- 联系信息需要后续手动补充

### 3. 全局商品导入表
**文件**: \`03_全局商品导入表.csv\`
**页面**: 全局信息 > 所有商品
**说明**:
- 依赖：商品品类必须已导入
- 商品编号使用原SKU编号
- 品类字段必须与已导入的品类名称完全匹配

### 4. 直播间仓库导入表
**文件**: \`04_直播间仓库导入表.csv\`
**页面**: 基地管理 > 直播间/仓库
**说明**:
- 从入库、出库、调货记录中提取
- 包含仓库和主播直播间
- 地点编号留空，系统会自动生成

### 5. 主播运营导入表
**文件**: \`05_主播运营导入表.csv\`
**页面**: 基地管理 > 主播/仓管
**说明**:
- 包含主播、运营、仓管三种角色
- 主播可以关联对应的运营人员
- 人员编号留空，系统会自动生成

### 6. 基地级商品设置导入表
**文件**: \`06_基地级商品设置导入表.csv\`
**页面**: 基地管理 > 商品管理
**说明**:
- 依赖：全局商品必须已导入
- **重要**: 需要手动填写零售价和采购价
- 价格格式：\`[VND]22356\` 或 \`[CNY]5600\`
- 系统会自动按汇率转换人民币价格

### 7. 采购订单导入表
**文件**: \`07_采购订单导入表.csv\`
**页面**: 基地管理 > 采购管理
**说明**:
- 依赖：供应商必须已导入
- 采购单号留空，系统会自动生成
- 注意日期格式的统一

### 8. 到货记录导入表
**文件**: \`08_到货记录导入表.csv\`
**页面**: 基地管理 > 到货管理
**说明**:
- 依赖：全局商品、仓库、人员必须已导入
- SKU编号必须与全局商品的商品编号匹配
- 仓库名称必须与已导入的地点名称匹配

### 9. 出库记录导入表
**文件**: \`09_出库记录导入表.csv\`
**页面**: 基地管理 > 出库管理
**说明**:
- 依赖：全局商品、主播、仓管必须已导入
- 主播名称必须与已导入的人员姓名匹配
- 取货人必须是已导入的仓管人员

### 10. 调货记录导入表
**文件**: \`10_调货记录导入表.csv\`
**页面**: 基地管理 > 调货管理
**说明**:
- 依赖：全局商品、主播必须已导入
- 从主播和到主播必须都是已导入的主播
- 登记人必须是已导入的人员

## 注意事项

### 数据匹配规则
1. **商品匹配**: 通过商品编号（SKU编号）精确匹配
2. **品类匹配**: 通过品类名称（中文）精确匹配
3. **人员匹配**: 通过姓名精确匹配
4. **地点匹配**: 通过地点名称精确匹配
5. **供应商匹配**: 通过供应商名称精确匹配

### 常见问题
1. **导入失败**: 检查依赖数据是否已导入
2. **匹配失败**: 检查名称是否完全一致（包括空格）
3. **价格格式错误**: 确保使用 \`[货币代码]金额\` 格式
4. **日期格式**: 建议统一为 \`YYYY-MM-DD\` 格式

### 建议流程
1. 先导入基础数据（品类、供应商、商品、地点、人员）
2. 手动填写商品价格后导入商品设置
3. 最后导入业务数据（采购、到货、出库、调货）
4. 每导入一个表后，在系统中检查数据是否正确
5. 发现问题及时修正，避免影响后续导入

## 技术支持
如有问题，请检查：
1. 数据格式是否符合模板要求
2. 依赖数据是否已正确导入
3. 名称匹配是否精确（大小写、空格）
4. 日期和金额格式是否正确
`;

  const guidePath = path.join(config.outputPaths.converted, '导入顺序说明.md');
  fs.writeFileSync(guidePath, guide, 'utf-8');
  console.log('\n  ✓ 已生成导入说明文档');
}

// 运行主函数
if (require.main === module) {
  convertToImportTables().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { convertToImportTables };
