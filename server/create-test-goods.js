const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createTestGoods() {
  try {
    console.log('🛍️ 创建测试商品...');
    
    // 创建测试商品
    const testGoods = [
      {
        code: 'GOODS001',
        name: '测试商品A',
        description: '这是一个测试商品A',
        retailPrice: 100.00,
        purchasePrice: 80.00,
        boxQuantity: 10,
        packPerBox: 5,
        piecePerPack: 2,
        isActive: true
      },
      {
        code: 'GOODS002', 
        name: '测试商品B',
        description: '这是一个测试商品B',
        retailPrice: 200.00,
        purchasePrice: 160.00,
        boxQuantity: 20,
        packPerBox: 4,
        piecePerPack: 3,
        isActive: true
      },
      {
        code: 'GOODS003',
        name: '测试商品C',
        description: '这是一个测试商品C',
        retailPrice: 50.00,
        purchasePrice: 40.00,
        boxQuantity: 15,
        packPerBox: 6,
        piecePerPack: 1,
        isActive: true
      }
    ];

    for (const goodsData of testGoods) {
      // 检查是否已存在
      const existing = await prisma.goods.findUnique({
        where: { code: goodsData.code }
      });

      if (existing) {
        console.log(`⚠️ 商品 ${goodsData.code} 已存在，跳过创建`);
        continue;
      }

      const goods = await prisma.goods.create({
        data: goodsData
      });

      console.log(`✅ 创建商品成功: ${goods.code} - ${goods.name}`);
    }

    // 查询所有商品
    const allGoods = await prisma.goods.findMany();
    console.log(`📊 商品总数: ${allGoods.length}`);

    console.log('🎉 测试商品创建完成！');

  } catch (error) {
    console.error('❌ 创建测试商品失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestGoods();
