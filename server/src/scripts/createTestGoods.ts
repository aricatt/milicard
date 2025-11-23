import { prisma } from '../utils/database';

async function createTestGoods() {
  try {
    console.log('开始创建测试商品数据...');

    // 创建测试商品
    const testGoods = [
      {
        code: 'GOODS-001',
        name: '苹果手机壳',
        alias: 'iPhone壳',
        manufacturer: '深圳科技有限公司',
        description: '透明硅胶手机壳，适用于iPhone 15',
        retailPrice: 299.00,  // 零售价(一箱)
        packPrice: 29.90,     // 平拆价(一盒)
        purchasePrice: 15.00,
        boxQuantity: 1,
        packPerBox: 10,
        piecePerPack: 1,
        imageUrl: null,
        notes: '热销商品',
        isActive: true
      },
      {
        code: 'GOODS-002',
        name: 'USB数据线',
        alias: 'Type-C线',
        manufacturer: '广州电子科技',
        description: 'Type-C快充数据线，1米长',
        retailPrice: 398.00,  // 零售价(一箱)
        packPrice: 19.90,     // 平拆价(一盒)
        purchasePrice: 8.00,
        boxQuantity: 1,
        packPerBox: 20,
        piecePerPack: 1,
        imageUrl: null,
        notes: '充电必备',
        isActive: true
      },
      {
        code: 'GOODS-003',
        name: '蓝牙耳机',
        alias: '无线耳机',
        manufacturer: '小米科技',
        description: '无线蓝牙耳机，降噪功能',
        retailPrice: 995.00,  // 零售价(一箱)
        packPrice: 199.00,    // 平拆价(一盒)
        purchasePrice: 120.00,
        boxQuantity: 1,
        packPerBox: 5,
        piecePerPack: 1,
        imageUrl: null,
        notes: '高端商品',
        isActive: true
      },
      {
        code: 'GOODS-004',
        name: '手机支架',
        alias: '桌面支架',
        manufacturer: '东莞塑胶厂',
        description: '桌面手机支架，可调节角度',
        retailPrice: 478.80,  // 零售价(一箱)
        packPrice: 39.90,     // 平拆价(一盒)
        purchasePrice: 20.00,
        boxQuantity: 1,
        packPerBox: 12,
        piecePerPack: 1,
        imageUrl: null,
        notes: '实用商品',
        isActive: true
      },
      {
        code: 'GOODS-005',
        name: '移动电源',
        alias: '充电宝',
        manufacturer: '华为技术',
        description: '10000mAh移动电源，双USB输出',
        retailPrice: 719.20,  // 零售价(一箱)
        packPrice: 89.90,     // 平拆价(一盒)
        purchasePrice: 45.00,
        boxQuantity: 1,
        packPerBox: 8,
        piecePerPack: 1,
        imageUrl: null,
        notes: '大容量',
        isActive: true
      }
    ];

    // 批量创建商品
    for (const goodsData of testGoods) {
      // 检查商品是否已存在
      const existingGoods = await prisma.goods.findUnique({
        where: { code: goodsData.code }
      });

      if (!existingGoods) {
        const goods = await prisma.goods.create({
          data: goodsData
        });
        console.log(`✅ 创建商品: ${goods.name} (${goods.code})`);

        // 将商品添加到基地1
        const existingGoodsBase = await prisma.goodsBase.findFirst({
          where: {
            goodsId: goods.id,
            baseId: 1
          }
        });

        if (!existingGoodsBase) {
          await prisma.goodsBase.create({
            data: {
              goodsId: goods.id,
              baseId: 1,
              isActive: true,
              retailPrice: goodsData.retailPrice,
              purchasePrice: goodsData.purchasePrice,
              notes: `基地商品配置 - ${goods.name}`
            }
          });
          console.log(`✅ 商品 ${goods.name} 已添加到基地1`);
        } else {
          console.log(`⚠️ 商品 ${goodsData.name} 已在基地1中配置`);
        }
      } else {
        console.log(`⚠️ 商品 ${goodsData.name} 已存在`);
      }
    }

    console.log('✅ 测试商品数据创建完成！');
  } catch (error) {
    console.error('❌ 创建测试商品数据失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// 运行脚本
createTestGoods();
