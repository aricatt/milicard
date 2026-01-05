const fs = require('fs');
const { parse } = require('csv-parse/sync');
const config = require('../config');
const { cleanString, parseDate, parseInt } = require('../utils/helpers');

/**
 * 转换到货记录数据 (入库.CSV → ArrivalRecord)
 */
async function convertArrivals() {
  console.log('开始转换到货记录数据...');

  const csvContent = fs.readFileSync(config.csvPaths.arrivals, 'utf-8');
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  const convertedArrivals = [];
  const errors = [];

  for (let i = 0; i < records.length; i++) {
    const row = records[i];
    
    try {
      // 提取字段
      const skuCode = cleanString(row['sku序列 \nSKU CODE'] || row['sku序列']);
      const chineseName = cleanString(row['中文名 \nTên tiếng Trung'] || row['中文名']);
      const vietnameseName = cleanString(row['英文/越文名 Tên tiếng Việt'] || row['英文/越文名']);
      const locationName = cleanString(row['仓库名\nTên kho'] || row['仓库名']);
      const arrivalDate = parseDate(row['入库时间\nThời gian'] || row['入库时间']);
      const boxQuantity = parseInt(row['箱 Thùng'] || row['箱']) || 0;
      const packPerBox = parseInt(row['盒/箱 Hộp'] || row['盒/箱']) || 1;
      const piecePerPack = parseInt(row['包/盒 Pack'] || row['包/盒']) || 1;

      // 验证必填字段
      if (!skuCode || !arrivalDate) {
        errors.push({
          row: i + 2,
          error: '缺少必填字段: SKU编号或入库时间',
          data: row,
        });
        continue;
      }

      // 构建到货记录对象
      const arrival = {
        goodsCode: skuCode,
        goodsName: chineseName,
        locationName: locationName || 'G层仓库',
        arrivalDate: arrivalDate,
        boxQuantity: boxQuantity,
        packPerBox: packPerBox,
        piecePerPack: piecePerPack,
        totalPacks: boxQuantity * packPerBox,
        notes: null,
      };

      convertedArrivals.push(arrival);
    } catch (error) {
      errors.push({
        row: i + 2,
        error: error.message,
        data: row,
      });
    }
  }

  console.log(`✓ 成功转换 ${convertedArrivals.length} 条到货记录`);
  
  if (errors.length > 0) {
    console.warn(`⚠ 发现 ${errors.length} 条错误记录`);
  }

  return {
    arrivals: convertedArrivals,
    errors: errors,
    summary: {
      total: records.length,
      success: convertedArrivals.length,
      failed: errors.length,
    },
  };
}

module.exports = { convertArrivals };
