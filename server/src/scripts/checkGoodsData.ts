import { prisma } from '../utils/database';

async function checkGoodsData() {
  try {
    console.log('检查商品数据...');

    // 查看商品表中的数据
    const goods = await prisma.goods.findFirst({
      where: { code: 'GOODS-005' }
    });
    
    console.log('商品表中的数据:', JSON.stringify(goods, null, 2));

    // 查看基地商品配置表中的数据
    const goodsBase = await prisma.goodsBase.findFirst({
      where: { 
        goodsId: goods?.id,
        baseId: 1 
      }
    });
    
    console.log('基地商品配置表中的数据:', JSON.stringify(goodsBase, null, 2));

    // 查看组合查询的结果
    const combined = await prisma.goodsBase.findFirst({
      where: { 
        goodsId: goods?.id,
        baseId: 1 
      },
      include: {
        goods: true
      }
    });
    
    console.log('组合查询结果:');
    console.log('- 基地配置的零售价:', combined?.retailPrice?.toString());
    console.log('- 商品本身的零售价:', combined?.goods.retailPrice?.toString());
    console.log('- 最终使用的零售价:', (combined?.retailPrice || combined?.goods.retailPrice)?.toString());

  } catch (error) {
    console.error('查询失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkGoodsData();
