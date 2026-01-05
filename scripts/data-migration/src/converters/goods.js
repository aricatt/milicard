const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const config = require('../config');
const { cleanString, parseDate, generateCode } = require('../utils/helpers');

/**
 * 转换商品数据 (SKU.CSV → Goods)
 */
async function convertGoods() {
  console.log('开始转换商品数据...');

  // 读取 CSV 文件
  const csvContent = fs.readFileSync(config.csvPaths.sku, 'utf-8');
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  const convertedGoods = [];
  const categories = new Set();
  const errors = [];

  for (let i = 0; i < records.length; i++) {
    const row = records[i];
    
    try {
      // 提取字段（处理中英文列名）
      const vietnameseName = cleanString(row['英文/越文名/Tên SP'] || row['英文/越文名']);
      const chineseName = cleanString(row['中文名/Tên Tiếng Trung'] || row['中文名']);
      const skuCode = cleanString(row['sku序列/Code SKU'] || row['sku序列']);
      const categoryRaw = cleanString(row['品类/Loại sp'] || row['品类']);
      const manufacturer = cleanString(row['厂商/NXB'] || row['厂商']);
      const packPerBox = parseInt(row['盒/箱 Hộp/Thùng'] || row['盒/箱']) || 1;
      const piecePerPack = parseInt(row['包/盒 Pack/Hộp'] || row['包/盒']) || 1;

      // 验证必填字段
      if (!skuCode || !chineseName) {
        errors.push({
          row: i + 2,
          error: '缺少必填字段: SKU编号或中文名',
          data: row,
        });
        continue;
      }

      // 映射品类
      const categoryCode = config.categoryMapping[categoryRaw] || 'CARD';
      categories.add(categoryCode);

      // 构建商品对象
      const goods = {
        code: skuCode,
        name: chineseName,
        nameI18n: vietnameseName ? { vi: vietnameseName } : null,
        manufacturer: manufacturer || '未知厂商',
        packPerBox: packPerBox,
        piecePerPack: piecePerPack,
        categoryCode: categoryCode,
        categoryName: categoryRaw,
        description: null,
        isActive: true,
      };

      convertedGoods.push(goods);
    } catch (error) {
      errors.push({
        row: i + 2,
        error: error.message,
        data: row,
      });
    }
  }

  // 生成品类列表
  const categoryList = Array.from(categories).map(code => ({
    code: code,
    name: getCategoryName(code),
  }));

  console.log(`✓ 成功转换 ${convertedGoods.length} 条商品记录`);
  console.log(`✓ 提取 ${categoryList.length} 个品类`);
  
  if (errors.length > 0) {
    console.warn(`⚠ 发现 ${errors.length} 条错误记录`);
  }

  return {
    goods: convertedGoods,
    categories: categoryList,
    errors: errors,
    summary: {
      total: records.length,
      success: convertedGoods.length,
      failed: errors.length,
    },
  };
}

/**
 * 获取品类中文名称
 */
function getCategoryName(code) {
  const names = {
    CARD: '卡牌',
    CARD_BRICK: '卡砖',
    GIFT: '礼物',
    COLOR_PAPER: '色纸',
    FORTUNE_SIGN: '上上签',
    TEAR_CARD: '撕撕乐',
    TOY: '玩具',
    STAMP: '邮票',
    LUCKY_CAT: '招财猫',
  };
  return names[code] || code;
}

module.exports = { convertGoods };
