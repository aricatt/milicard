const fs = require('fs');
const path = require('path');
const { convertGoods } = require('./converters/goods');
const { convertArrivals } = require('./converters/arrivals');
const { convertStockOuts } = require('./converters/stockouts');
const { convertTransfers } = require('./converters/transfers');
const config = require('./config');

/**
 * 主转换脚本
 */
async function main() {
  console.log('='.repeat(60));
  console.log('数据转换工具 - 将旧系统CSV数据转换为新系统格式');
  console.log('='.repeat(60));
  console.log('');

  const startTime = Date.now();
  const results = {};

  // 确保输出目录存在
  ensureDirectories();

  try {
    // 1. 转换商品数据
    console.log('\n[1/4] 转换商品数据...');
    const goodsResult = await convertGoods();
    results.goods = goodsResult;
    saveConvertedData('goods', goodsResult.goods);
    saveConvertedData('categories', goodsResult.categories);
    saveErrors('goods', goodsResult.errors);

    // 2. 转换到货记录
    console.log('\n[2/4] 转换到货记录...');
    const arrivalsResult = await convertArrivals();
    results.arrivals = arrivalsResult;
    saveConvertedData('arrivals', arrivalsResult.arrivals);
    saveErrors('arrivals', arrivalsResult.errors);

    // 3. 转换出库记录
    console.log('\n[3/4] 转换出库记录...');
    const stockoutsResult = await convertStockOuts();
    results.stockouts = stockoutsResult;
    saveConvertedData('stockouts', stockoutsResult.stockouts);
    saveErrors('stockouts', stockoutsResult.errors);

    // 4. 转换调货记录
    console.log('\n[4/4] 转换调货记录...');
    const transfersResult = await convertTransfers();
    results.transfers = transfersResult;
    saveConvertedData('transfers', transfersResult.transfers);
    saveErrors('transfers', transfersResult.errors);

    // 生成转换报告
    generateReport(results, startTime);

    console.log('\n✓ 数据转换完成！');
    console.log(`\n转换后的数据保存在: ${config.outputPaths.converted}`);
    console.log(`错误日志保存在: ${config.outputPaths.logs}`);
    console.log(`转换报告保存在: ${config.outputPaths.reports}`);

  } catch (error) {
    console.error('\n✗ 转换过程中发生错误:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
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
 * 保存转换后的数据
 */
function saveConvertedData(name, data) {
  const filePath = path.join(config.outputPaths.converted, `${name}.json`);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  console.log(`  → 已保存: ${name}.json (${data.length} 条记录)`);
}

/**
 * 保存错误日志
 */
function saveErrors(name, errors) {
  if (errors.length === 0) return;
  
  const filePath = path.join(config.outputPaths.logs, `${name}_errors.json`);
  fs.writeFileSync(filePath, JSON.stringify(errors, null, 2), 'utf-8');
  console.log(`  ⚠ 错误日志: ${name}_errors.json (${errors.length} 条)`);
}

/**
 * 生成转换报告
 */
function generateReport(results, startTime) {
  const duration = Date.now() - startTime;
  
  const report = {
    timestamp: new Date().toISOString(),
    duration: `${(duration / 1000).toFixed(2)}s`,
    summary: {
      goods: results.goods.summary,
      arrivals: results.arrivals.summary,
      stockouts: results.stockouts.summary,
      transfers: results.transfers.summary,
    },
    totals: {
      totalRecords: Object.values(results).reduce((sum, r) => sum + r.summary.total, 0),
      successRecords: Object.values(results).reduce((sum, r) => sum + r.summary.success, 0),
      failedRecords: Object.values(results).reduce((sum, r) => sum + r.summary.failed, 0),
    },
    categories: {
      count: results.goods.categories.length,
      list: results.goods.categories.map(c => c.code),
    },
  };

  const reportPath = path.join(config.outputPaths.reports, `conversion_report_${Date.now()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');

  // 打印摘要
  console.log('\n' + '='.repeat(60));
  console.log('转换摘要');
  console.log('='.repeat(60));
  console.log(`总记录数: ${report.totals.totalRecords}`);
  console.log(`成功转换: ${report.totals.successRecords}`);
  console.log(`失败记录: ${report.totals.failedRecords}`);
  console.log(`转换耗时: ${report.duration}`);
  console.log(`品类数量: ${report.categories.count}`);
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
