import { prisma } from '../utils/database';

async function updateGoodsFields() {
  try {
    console.log('开始更新商品字段数据...');

    // 更新现有商品的新字段
    const updates = [
      {
        code: 'GOODS-001',
        alias: 'iPhone壳',
        manufacturer: '深圳科技有限公司',
        retailPrice: 299.00,
        packPrice: 29.90,
      },
      {
        code: 'GOODS-002',
        alias: 'Type-C线',
        manufacturer: '广州电子科技',
        retailPrice: 398.00,
        packPrice: 19.90,
      },
      {
        code: 'GOODS-003',
        alias: '无线耳机',
        manufacturer: '小米科技',
        retailPrice: 995.00,
        packPrice: 199.00,
      },
      {
        code: 'GOODS-004',
        alias: '桌面支架',
        manufacturer: '东莞塑胶厂',
        retailPrice: 478.80,
        packPrice: 39.90,
      },
      {
        code: 'GOODS-005',
        alias: '充电宝',
        manufacturer: '华为技术',
        retailPrice: 719.20,
        packPrice: 89.90,
      }
    ];

    for (const update of updates) {
      const { code, ...updateData } = update;
      
      const result = await prisma.goods.updateMany({
        where: { code },
        data: updateData
      });

      if (result.count > 0) {
        console.log(`✅ 更新商品: ${code}`);
      } else {
        console.log(`⚠️ 未找到商品: ${code}`);
      }
    }

    console.log('✅ 商品字段更新完成！');
  } catch (error) {
    console.error('❌ 更新商品字段失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// 运行脚本
updateGoodsFields();
