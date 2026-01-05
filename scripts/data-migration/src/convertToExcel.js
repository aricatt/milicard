const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const { convertGoods } = require('./converters/goods');
const { convertArrivals } = require('./converters/arrivals');
const { convertStockOuts } = require('./converters/stockouts');
const { convertTransfers } = require('./converters/transfers');
const config = require('./config');

/**
 * 将转换后的数据输出为 Excel 格式，方便人工复查和导入
 */
async function main() {
  console.log('='.repeat(60));
  console.log('数据转换工具 - 输出为 Excel 格式');
  console.log('='.repeat(60));
  console.log('');

  const startTime = Date.now();

  try {
    // 确保输出目录存在
    ensureDirectories();

    // 1. 转换商品数据
    console.log('\n[1/4] 转换商品数据...');
    const goodsResult = await convertGoods();
    exportGoodsToExcel(goodsResult);

    // 2. 转换到货记录
    console.log('\n[2/4] 转换到货记录...');
    const arrivalsResult = await convertArrivals();
    exportArrivalsToExcel(arrivalsResult);

    // 3. 转换出库记录
    console.log('\n[3/4] 转换出库记录...');
    const stockoutsResult = await convertStockOuts();
    exportStockOutsToExcel(stockoutsResult);

    // 4. 转换调货记录
    console.log('\n[4/4] 转换调货记录...');
    const transfersResult = await convertTransfers();
    exportTransfersToExcel(transfersResult);

    // 生成汇总报告
    const duration = Date.now() - startTime;
    printSummary({
      goods: goodsResult.summary,
      arrivals: arrivalsResult.summary,
      stockouts: stockoutsResult.summary,
      transfers: transfersResult.summary,
      duration: duration,
    });

    console.log('\n✓ 数据转换完成！');
    console.log(`\nExcel 文件保存在: ${config.outputPaths.converted}`);
    console.log('\n📋 下一步操作：');
    console.log('1. 打开 Excel 文件，复查数据是否正确');
    console.log('2. 修正任何错误的数据');
    console.log('3. 通过系统界面手动导入数据');

  } catch (error) {
    console.error('\n✗ 转换过程中发生错误:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

/**
 * 导出商品数据为 Excel
 */
function exportGoodsToExcel(result) {
  const workbook = XLSX.utils.book_new();

  // 商品数据表
  const goodsData = result.goods.map(item => ({
    '商品编号': item.code,
    '中文名称': item.name,
    '越南语名称': item.nameI18n?.vi || '',
    '厂商': item.manufacturer,
    '品类代码': item.categoryCode,
    '品类名称': item.categoryName,
    '盒/箱': item.packPerBox,
    '包/盒': item.piecePerPack,
    '状态': item.isActive ? '启用' : '禁用',
    '备注': item.description || '',
  }));

  const goodsSheet = XLSX.utils.json_to_sheet(goodsData);
  XLSX.utils.book_append_sheet(workbook, goodsSheet, '商品数据');

  // 品类数据表
  const categoryData = result.categories.map(item => ({
    '品类代码': item.code,
    '品类名称': item.name,
  }));

  const categorySheet = XLSX.utils.json_to_sheet(categoryData);
  XLSX.utils.book_append_sheet(workbook, categorySheet, '品类数据');

  // 错误记录表（如果有）
  if (result.errors.length > 0) {
    const errorData = result.errors.map(item => ({
      '行号': item.row,
      '错误信息': item.error,
      '原始数据': JSON.stringify(item.data),
    }));

    const errorSheet = XLSX.utils.json_to_sheet(errorData);
    XLSX.utils.book_append_sheet(workbook, errorSheet, '错误记录');
  }

  // 保存文件
  const filePath = path.join(config.outputPaths.converted, '01_商品数据.xlsx');
  XLSX.writeFile(workbook, filePath);
  console.log(`  ✓ 已保存: 01_商品数据.xlsx`);
  console.log(`     - 商品: ${goodsData.length} 条`);
  console.log(`     - 品类: ${categoryData.length} 个`);
  if (result.errors.length > 0) {
    console.log(`     - 错误: ${result.errors.length} 条`);
  }
}

/**
 * 导出到货记录为 Excel
 */
function exportArrivalsToExcel(result) {
  const workbook = XLSX.utils.book_new();

  const data = result.arrivals.map(item => ({
    '商品编号': item.goodsCode,
    '商品名称': item.goodsName,
    '仓库名称': item.locationName,
    '到货日期': item.arrivalDate,
    '箱数': item.boxQuantity,
    '盒/箱': item.packPerBox,
    '包/盒': item.piecePerPack,
    '总包数': item.totalPacks,
    '备注': item.notes || '',
  }));

  const sheet = XLSX.utils.json_to_sheet(data);
  XLSX.utils.book_append_sheet(workbook, sheet, '到货记录');

  if (result.errors.length > 0) {
    const errorData = result.errors.map(item => ({
      '行号': item.row,
      '错误信息': item.error,
    }));
    const errorSheet = XLSX.utils.json_to_sheet(errorData);
    XLSX.utils.book_append_sheet(workbook, errorSheet, '错误记录');
  }

  const filePath = path.join(config.outputPaths.converted, '02_到货记录.xlsx');
  XLSX.writeFile(workbook, filePath);
  console.log(`  ✓ 已保存: 02_到货记录.xlsx (${data.length} 条)`);
}

/**
 * 导出出库记录为 Excel
 */
function exportStockOutsToExcel(result) {
  const workbook = XLSX.utils.book_new();

  const data = result.stockouts.map(item => ({
    '商品编号': item.goodsCode,
    '商品名称': item.goodsName,
    '主播名称': item.anchorName,
    '出库日期': item.date,
    '箱数': item.boxQuantity,
    '包数': item.packQuantity,
    '零散包数': item.pieceQuantity,
    '出库类型': item.type,
    '目标': item.targetName,
    '备注': item.notes || '',
  }));

  const sheet = XLSX.utils.json_to_sheet(data);
  XLSX.utils.book_append_sheet(workbook, sheet, '出库记录');

  if (result.errors.length > 0) {
    const errorData = result.errors.map(item => ({
      '行号': item.row,
      '错误信息': item.error,
    }));
    const errorSheet = XLSX.utils.json_to_sheet(errorData);
    XLSX.utils.book_append_sheet(workbook, errorSheet, '错误记录');
  }

  const filePath = path.join(config.outputPaths.converted, '03_出库记录.xlsx');
  XLSX.writeFile(workbook, filePath);
  console.log(`  ✓ 已保存: 03_出库记录.xlsx (${data.length} 条)`);
}

/**
 * 导出调货记录为 Excel
 */
function exportTransfersToExcel(result) {
  const workbook = XLSX.utils.book_new();

  const data = result.transfers.map(item => ({
    '商品编号': item.goodsCode,
    '商品名称': item.goodsName,
    '源仓库': item.sourceLocationName,
    '目标仓库': item.destinationLocationName,
    '调货日期': item.transferDate,
    '箱数': item.boxQuantity,
    '包数': item.packQuantity,
    '零散包数': item.pieceQuantity,
    '备注': item.notes || '',
  }));

  const sheet = XLSX.utils.json_to_sheet(data);
  XLSX.utils.book_append_sheet(workbook, sheet, '调货记录');

  if (result.errors.length > 0) {
    const errorData = result.errors.map(item => ({
      '行号': item.row,
      '错误信息': item.error,
    }));
    const errorSheet = XLSX.utils.json_to_sheet(errorData);
    XLSX.utils.book_append_sheet(workbook, errorSheet, '错误记录');
  }

  const filePath = path.join(config.outputPaths.converted, '04_调货记录.xlsx');
  XLSX.writeFile(workbook, filePath);
  console.log(`  ✓ 已保存: 04_调货记录.xlsx (${data.length} 条)`);
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
 * 打印汇总信息
 */
function printSummary(summary) {
  console.log('\n' + '='.repeat(60));
  console.log('转换汇总');
  console.log('='.repeat(60));
  console.log(`商品数据: ${summary.goods.success}/${summary.goods.total} 条成功`);
  console.log(`到货记录: ${summary.arrivals.success}/${summary.arrivals.total} 条成功`);
  console.log(`出库记录: ${summary.stockouts.success}/${summary.stockouts.total} 条成功`);
  console.log(`调货记录: ${summary.transfers.success}/${summary.transfers.total} 条成功`);
  console.log(`转换耗时: ${(summary.duration / 1000).toFixed(2)}s`);
  console.log('='.repeat(60));
}

// 运行主函数
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { main };
