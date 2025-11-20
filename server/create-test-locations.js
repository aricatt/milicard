const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createTestLocations() {
  try {
    console.log('🏢 创建测试位置和库存...');
    
    // 为基地1（总部基地）创建位置
    const base1Locations = [
      {
        name: '总部仓库A',
        type: 'WAREHOUSE',
        description: '总部主仓库',
        baseId: 1
      },
      {
        name: '总部直播间1',
        type: 'LIVE_ROOM',
        description: '总部直播间1号',
        baseId: 1
      }
    ];

    // 为基地2（上海基地）创建位置
    const base2Locations = [
      {
        name: '上海仓库A',
        type: 'WAREHOUSE',
        description: '上海分仓库',
        baseId: 2
      },
      {
        name: '上海直播间1',
        type: 'LIVE_ROOM',
        description: '上海直播间1号',
        baseId: 2
      }
    ];

    const allLocations = [...base1Locations, ...base2Locations];
    
    for (const locationData of allLocations) {
      // 检查是否已存在
      const existing = await prisma.location.findFirst({
        where: { 
          name: locationData.name,
          baseId: locationData.baseId
        }
      });

      if (existing) {
        console.log(`⚠️ 位置 ${locationData.name} 已存在，跳过创建`);
        continue;
      }

      const location = await prisma.location.create({
        data: locationData
      });

      console.log(`✅ 创建位置成功: ${location.name} (基地${location.baseId})`);
    }

    // 查询所有位置
    const allCreatedLocations = await prisma.location.findMany({
      include: {
        base: {
          select: {
            name: true
          }
        }
      }
    });
    
    console.log(`📊 位置总数: ${allCreatedLocations.length}`);
    allCreatedLocations.forEach(loc => {
      console.log(`  - ${loc.name} (${loc.base.name}) - ${loc.type}`);
    });

    // 获取商品和位置，创建一些库存记录
    const goods = await prisma.goods.findMany();
    const locations = await prisma.location.findMany();

    if (goods.length > 0 && locations.length > 0) {
      console.log('📦 创建测试库存记录...');
      
      // 为每个位置创建一些库存记录
      for (const location of locations) {
        // 为每个位置添加第一个商品的库存
        if (goods[0]) {
          const existingInventory = await prisma.inventory.findUnique({
            where: {
              goodsId_locationId: {
                goodsId: goods[0].id,
                locationId: location.id
              }
            }
          });

          if (!existingInventory) {
            const inventory = await prisma.inventory.create({
              data: {
                goodsId: goods[0].id,
                locationId: location.id,
                baseId: location.baseId,
                stockQuantity: Math.floor(Math.random() * 100) + 10, // 10-109的随机库存
                averageCost: 50.00
              }
            });

            console.log(`  ✅ 创建库存: ${goods[0].name} 在 ${location.name}, 数量: ${inventory.stockQuantity}`);
          }
        }
      }
    }

    console.log('🎉 测试位置和库存创建完成！');

  } catch (error) {
    console.error('❌ 创建测试位置失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestLocations();
