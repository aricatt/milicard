const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const config = require('../config');
const { createLookupMap, batchProcess } = require('../utils/helpers');

const prisma = new PrismaClient();

/**
 * 导入商品数据到数据库
 */
async function importGoods(options = {}) {
  const { dryRun = false, baseId = config.defaults.baseId } = options;

  console.log(`\n${'='.repeat(60)}`);
  console.log(`导入商品数据 ${dryRun ? '(测试模式)' : ''}`);
  console.log(`${'='.repeat(60)}\n`);

  try {
    // 1. 读取转换后的数据
    const goodsPath = path.join(config.outputPaths.converted, 'goods.json');
    const categoriesPath = path.join(config.outputPaths.converted, 'categories.json');

    if (!fs.existsSync(goodsPath)) {
      throw new Error('未找到转换后的商品数据，请先运行转换脚本');
    }

    const goodsData = JSON.parse(fs.readFileSync(goodsPath, 'utf-8'));
    const categoriesData = JSON.parse(fs.readFileSync(categoriesPath, 'utf-8'));

    console.log(`读取到 ${goodsData.length} 条商品记录`);
    console.log(`读取到 ${categoriesData.length} 个品类\n`);

    // 2. 导入品类
    console.log('[1/3] 导入品类...');
    const categoryMap = await importCategories(categoriesData, dryRun);
    console.log(`✓ 品类导入完成\n`);

    // 3. 导入商品
    console.log('[2/3] 导入商品...');
    const importResult = await importGoodsRecords(goodsData, categoryMap, baseId, dryRun);
    console.log(`✓ 商品导入完成\n`);

    // 4. 生成导入报告
    console.log('[3/3] 生成导入报告...');
    const report = {
      timestamp: new Date().toISOString(),
      dryRun: dryRun,
      baseId: baseId,
      categories: {
        total: categoriesData.length,
        created: categoryMap.created,
        existing: categoryMap.existing,
      },
      goods: {
        total: goodsData.length,
        created: importResult.created,
        skipped: importResult.skipped,
        failed: importResult.failed,
      },
      errors: importResult.errors,
    };

    saveImportReport('goods', report);
    printSummary(report);

    return report;

  } catch (error) {
    console.error('✗ 导入失败:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * 导入品类
 */
async function importCategories(categories, dryRun) {
  const result = {
    created: 0,
    existing: 0,
    map: new Map(),
  };

  for (const category of categories) {
    try {
      if (dryRun) {
        console.log(`  [测试] 将创建品类: ${category.code} - ${category.name}`);
        result.created++;
        result.map.set(category.code, { id: 999, code: category.code });
        continue;
      }

      // 检查品类是否已存在
      let dbCategory = await prisma.category.findUnique({
        where: { code: category.code },
      });

      if (dbCategory) {
        result.existing++;
      } else {
        // 创建新品类
        dbCategory = await prisma.category.create({
          data: {
            code: category.code,
            name: category.name,
            description: null,
          },
        });
        result.created++;
        console.log(`  ✓ 创建品类: ${category.code} - ${category.name}`);
      }

      result.map.set(category.code, dbCategory);

    } catch (error) {
      console.error(`  ✗ 品类创建失败 ${category.code}:`, error.message);
    }
  }

  return result;
}

/**
 * 导入商品记录
 */
async function importGoodsRecords(goodsData, categoryMap, baseId, dryRun) {
  const result = {
    created: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  };

  // 获取创建者用户ID（使用系统管理员或迁移脚本用户）
  let creatorUserId = null;
  if (!dryRun) {
    const adminUser = await prisma.user.findFirst({
      where: { username: 'admin' },
    });
    creatorUserId = adminUser?.id || null;
  }

  for (const goods of goodsData) {
    try {
      if (dryRun) {
        console.log(`  [测试] 将创建商品: ${goods.code} - ${goods.name}`);
        result.created++;
        continue;
      }

      // 检查商品是否已存在
      const existing = await prisma.goods.findUnique({
        where: { code: goods.code },
      });

      if (existing) {
        result.skipped++;
        continue;
      }

      // 获取品类ID
      const category = categoryMap.map.get(goods.categoryCode);
      if (!category) {
        throw new Error(`品类不存在: ${goods.categoryCode}`);
      }

      // 创建全局商品
      const createdGoods = await prisma.goods.create({
        data: {
          code: goods.code,
          name: goods.name,
          nameI18n: goods.nameI18n,
          manufacturer: goods.manufacturer,
          packPerBox: goods.packPerBox,
          piecePerPack: goods.piecePerPack,
          categoryId: category.id,
          description: goods.description,
          createdBy: creatorUserId,
          updatedBy: creatorUserId,
        },
      });

      // 创建基地级商品设置（使用默认价格）
      await prisma.goodsLocalSetting.create({
        data: {
          goodsId: createdGoods.id,
          baseId: baseId,
          retailPrice: 0, // 需要后续手动设置
          purchasePrice: 0,
          packPrice: 0,
          alias: null,
          isActive: true,
        },
      });

      result.created++;
      console.log(`  ✓ 创建商品: ${goods.code} - ${goods.name}`);

    } catch (error) {
      result.failed++;
      result.errors.push({
        code: goods.code,
        name: goods.name,
        error: error.message,
      });
      console.error(`  ✗ 商品创建失败 ${goods.code}:`, error.message);
    }
  }

  return result;
}

/**
 * 保存导入报告
 */
function saveImportReport(name, report) {
  const reportPath = path.join(
    config.outputPaths.reports,
    `import_${name}_${Date.now()}.json`
  );
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');
}

/**
 * 打印摘要
 */
function printSummary(report) {
  console.log('\n' + '='.repeat(60));
  console.log('导入摘要');
  console.log('='.repeat(60));
  console.log(`模式: ${report.dryRun ? '测试模式' : '正式导入'}`);
  console.log(`基地ID: ${report.baseId}`);
  console.log('\n品类:');
  console.log(`  总数: ${report.categories.total}`);
  console.log(`  新建: ${report.categories.created}`);
  console.log(`  已存在: ${report.categories.existing}`);
  console.log('\n商品:');
  console.log(`  总数: ${report.goods.total}`);
  console.log(`  新建: ${report.goods.created}`);
  console.log(`  跳过: ${report.goods.skipped}`);
  console.log(`  失败: ${report.goods.failed}`);
  
  if (report.errors.length > 0) {
    console.log('\n错误记录:');
    report.errors.slice(0, 5).forEach(err => {
      console.log(`  - ${err.code}: ${err.error}`);
    });
    if (report.errors.length > 5) {
      console.log(`  ... 还有 ${report.errors.length - 5} 条错误`);
    }
  }
  console.log('='.repeat(60));
}

// 命令行执行
if (require.main === module) {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const baseIdArg = args.find(arg => arg.startsWith('--base-id='));
  const baseId = baseIdArg ? parseInt(baseIdArg.split('=')[1]) : config.defaults.baseId;

  importGoods({ dryRun, baseId })
    .then(() => {
      console.log('\n✓ 导入完成');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n✗ 导入失败:', error);
      process.exit(1);
    });
}

module.exports = { importGoods };
