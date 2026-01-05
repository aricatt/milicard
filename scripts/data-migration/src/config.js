const path = require('path');

module.exports = {
  // CSV 文件路径配置
  csvPaths: {
    sku: path.join(__dirname, '../../../doc/wilddata/SKU.CSV'),
    personnel: path.join(__dirname, '../../../doc/wilddata/主播和运营.CSV'),
    purchases: path.join(__dirname, '../../../doc/wilddata/采购管理-采购记录.CSV'),
    arrivals: path.join(__dirname, '../../../doc/wilddata/入库.CSV'),
    stockouts: path.join(__dirname, '../../../doc/wilddata/出库.CSV'),
    transfers: path.join(__dirname, '../../../doc/wilddata/调货.CSV'),
    inventory: path.join(__dirname, '../../../doc/wilddata/主播库存.CSV'),
    dailyData: path.join(__dirname, '../../../doc/wilddata/每日数据表-122025.CSV'),
  },

  // 输出路径配置
  outputPaths: {
    converted: path.join(__dirname, '../output/converted'),
    logs: path.join(__dirname, '../output/logs'),
    reports: path.join(__dirname, '../output/reports'),
  },

  // 数据库配置（从环境变量读取）
  database: {
    url: process.env.DATABASE_URL,
  },

  // 默认值配置
  defaults: {
    baseId: 1, // 默认基地ID，需要根据实际情况修改
    createdBy: 'migration-script', // 迁移脚本创建的记录标识
    locationTypeMapping: {
      'G层仓库': 'WAREHOUSE',
      '总仓库': 'WAREHOUSE',
      '主播': 'LIVE_ROOM',
    },
    personnelTypeMapping: {
      '主播': 'ANCHOR',
      '运营': 'OPERATOR',
    },
  },

  // 数据清洗规则
  cleaningRules: {
    // 日期格式转换：2025.10.15 → 2025-10-15
    dateFormat: /(\d{4})\.(\d{1,2})\.(\d{1,2})/,
    // 移除空白字符
    trimWhitespace: true,
    // 跳过空行
    skipEmptyRows: true,
  },

  // 品类映射（从越南语/中文到系统品类代码）
  categoryMapping: {
    'Thẻ hộp/卡砖': 'CARD_BRICK',
    'Card/卡牌': 'CARD',
    'Card/邮票': 'STAMP',
    'Thẻ xé/撕撕乐': 'TEAR_CARD',
    'Thẻ bộ/色纸': 'COLOR_PAPER',
    'Đồ chơi/玩具': 'TOY',
    '礼物': 'GIFT',
    '上上签': 'FORTUNE_SIGN',
    '招财猫': 'LUCKY_CAT',
  },

  // 导入选项
  importOptions: {
    batchSize: 100, // 批量导入的记录数
    skipExisting: true, // 跳过已存在的记录
    validateData: true, // 导入前验证数据
    createMissing: true, // 自动创建缺失的关联数据（如品类）
  },
};
