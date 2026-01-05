const fs = require('fs');
const { parse } = require('csv-parse/sync');
const config = require('../config');
const { cleanString, parseDate, parseInt } = require('../utils/helpers');

/**
 * 转换出库记录数据 (出库.CSV → StockOut)
 */
async function convertStockOuts() {
  console.log('开始转换出库记录数据...');

  const csvContent = fs.readFileSync(config.csvPaths.stockouts, 'utf-8');
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  const convertedStockOuts = [];
  const errors = [];

  for (let i = 0; i < records.length; i++) {
    const row = records[i];
    
    try {
      const skuCode = cleanString(row['sku序列 \nSKU CODE'] || row['sku序列']);
      const chineseName = cleanString(row['中文名 \nTên tiếng Trung'] || row['中文名']);
      const anchorName = cleanString(row['主播\nHost'] || row['主播']);
      const boxQuantity = parseInt(row['数量/盒\nSL (Hộp)'] || row['数量/盒']) || 0;
      const packQuantity = parseInt(row['整盒包数\nSL (Pack/Tổng hộp)'] || row['整盒包数']) || 0;
      const loosePacks = parseInt(row['零散包数\nPack lẻ'] || row['零散包数']) || 0;
      const outDate = parseDate(row['出库日期\nNgày xuất'] || row['出库日期']);

      if (!skuCode || !outDate) {
        errors.push({
          row: i + 2,
          error: '缺少必填字段: SKU编号或出库日期',
          data: row,
        });
        continue;
      }

      const stockOut = {
        goodsCode: skuCode,
        goodsName: chineseName,
        anchorName: anchorName,
        date: outDate,
        boxQuantity: boxQuantity,
        packQuantity: packQuantity,
        pieceQuantity: loosePacks,
        type: 'ANCHOR_PICKUP', // 主播取货
        targetName: anchorName,
        notes: null,
      };

      convertedStockOuts.push(stockOut);
    } catch (error) {
      errors.push({
        row: i + 2,
        error: error.message,
        data: row,
      });
    }
  }

  console.log(`✓ 成功转换 ${convertedStockOuts.length} 条出库记录`);
  
  if (errors.length > 0) {
    console.warn(`⚠ 发现 ${errors.length} 条错误记录`);
  }

  return {
    stockouts: convertedStockOuts,
    errors: errors,
    summary: {
      total: records.length,
      success: convertedStockOuts.length,
      failed: errors.length,
    },
  };
}

module.exports = { convertStockOuts };
