const fs = require('fs');
const { parse } = require('csv-parse/sync');
const config = require('../config');
const { cleanString, parseDate, parseInt } = require('../utils/helpers');

/**
 * 转换调货记录数据 (调货.CSV → TransferRecord)
 */
async function convertTransfers() {
  console.log('开始转换调货记录数据...');

  const csvContent = fs.readFileSync(config.csvPaths.transfers, 'utf-8');
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  const convertedTransfers = [];
  const errors = [];

  for (let i = 0; i < records.length; i++) {
    const row = records[i];
    
    try {
      const skuCode = cleanString(row['sku序列 \nSKU CODE'] || row['sku序列']);
      const chineseName = cleanString(row['中文名 \nTên tiếng Trung'] || row['中文名']);
      const fromAnchor = cleanString(row['从主播\nTừ Host'] || row['从主播']);
      const toAnchor = cleanString(row['到主播\nTới Host'] || row['到主播']);
      const boxQuantity = parseInt(row['数量/盒\nSL hộp'] || row['数量/盒']) || 0;
      const packQuantity = parseInt(row['整盒包数\nSL (Pack/Tổng Hộp)'] || row['整盒包数']) || 0;
      const loosePacks = parseInt(row['零散包数\nPack lẻ'] || row['零散包数']) || 0;
      const transferDate = parseDate(row['调货日期\nNgày điều'] || row['调货日期']);

      if (!skuCode || !transferDate || !fromAnchor || !toAnchor) {
        errors.push({
          row: i + 2,
          error: '缺少必填字段: SKU编号、调货日期、源主播或目标主播',
          data: row,
        });
        continue;
      }

      const transfer = {
        goodsCode: skuCode,
        goodsName: chineseName,
        sourceLocationName: fromAnchor,
        destinationLocationName: toAnchor,
        transferDate: transferDate,
        boxQuantity: boxQuantity,
        packQuantity: packQuantity,
        pieceQuantity: loosePacks,
        notes: null,
      };

      convertedTransfers.push(transfer);
    } catch (error) {
      errors.push({
        row: i + 2,
        error: error.message,
        data: row,
      });
    }
  }

  console.log(`✓ 成功转换 ${convertedTransfers.length} 条调货记录`);
  
  if (errors.length > 0) {
    console.warn(`⚠ 发现 ${errors.length} 条错误记录`);
  }

  return {
    transfers: convertedTransfers,
    errors: errors,
    summary: {
      total: records.length,
      success: convertedTransfers.length,
      failed: errors.length,
    },
  };
}

module.exports = { convertTransfers };
