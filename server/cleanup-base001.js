const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function cleanupBase001() {
  console.log('🔍 开始清理基地 BASE001 相关数据...\n');

  try {
    // 1. 查找基地
    const base = await prisma.base.findUnique({
      where: { code: 'BASE001' }
    });

    if (!base) {
      console.log('❌ 未找到基地 BASE001');
      return;
    }

    console.log(`📍 找到基地: ${base.name} (ID: ${base.id})`);

    // 2. 检查依赖关系
    console.log('\n🔍 检查依赖关系...');
    
    const dependencies = await Promise.all([
      prisma.userBase.count({ where: { baseId: base.id } }),
      prisma.goodsBase.count({ where: { baseId: base.id } }),
      prisma.supplierBase.count({ where: { baseId: base.id } }),
      prisma.location.count({ where: { baseId: base.id } }),
      prisma.inventory.count({ where: { baseId: base.id } }),
      prisma.purchaseOrder.count({ where: { baseId: base.id } }),
      prisma.customer.count({ where: { baseId: base.id } }),
      prisma.personnel.count({ where: { baseId: base.id } }),
      prisma.user.count({ where: { defaultBaseId: base.id } })
    ]);

    const [userBases, goodsBases, supplierBases, locations, inventory, purchaseOrders, customers, personnel, defaultUsers] = dependencies;

    console.log(`- 用户基地关联: ${userBases} 条`);
    console.log(`- 商品基地关联: ${goodsBases} 条`);
    console.log(`- 供应商基地关联: ${supplierBases} 条`);
    console.log(`- 位置记录: ${locations} 条`);
    console.log(`- 库存记录: ${inventory} 条`);
    console.log(`- 采购订单: ${purchaseOrders} 条`);
    console.log(`- 客户记录: ${customers} 条`);
    console.log(`- 人员记录: ${personnel} 条`);
    console.log(`- 默认基地用户: ${defaultUsers} 条`);

    const totalDependencies = dependencies.reduce((sum, count) => sum + count, 0);
    
    if (totalDependencies === 0) {
      console.log('\n✅ 没有依赖数据，可以直接删除基地');
      
      await prisma.base.delete({
        where: { id: base.id }
      });
      
      console.log('🎉 基地 BASE001 删除成功！');
      return;
    }

    console.log(`\n⚠️  发现 ${totalDependencies} 条依赖数据，需要先清理`);
    console.log('\n🧹 开始清理依赖数据...');

    // 3. 使用事务清理所有相关数据
    await prisma.$transaction(async (tx) => {
      // 3.1 删除用户基地关联
      if (userBases > 0) {
        const deleted = await tx.userBase.deleteMany({
          where: { baseId: base.id }
        });
        console.log(`✅ 删除用户基地关联: ${deleted.count} 条`);
      }

      // 3.2 删除商品基地关联
      if (goodsBases > 0) {
        const deleted = await tx.goodsBase.deleteMany({
          where: { baseId: base.id }
        });
        console.log(`✅ 删除商品基地关联: ${deleted.count} 条`);
      }

      // 3.3 删除供应商基地关联
      if (supplierBases > 0) {
        const deleted = await tx.supplierBase.deleteMany({
          where: { baseId: base.id }
        });
        console.log(`✅ 删除供应商基地关联: ${deleted.count} 条`);
      }

      // 3.4 删除库存记录
      if (inventory > 0) {
        const deleted = await tx.inventory.deleteMany({
          where: { baseId: base.id }
        });
        console.log(`✅ 删除库存记录: ${deleted.count} 条`);
      }

      // 3.5 删除采购订单（包括订单项）
      if (purchaseOrders > 0) {
        // 先删除采购订单项
        const orderIds = await tx.purchaseOrder.findMany({
          where: { baseId: base.id },
          select: { id: true }
        });

        for (const order of orderIds) {
          await tx.purchaseOrderItem.deleteMany({
            where: { purchaseOrderId: order.id }
          });
        }

        // 再删除采购订单
        const deleted = await tx.purchaseOrder.deleteMany({
          where: { baseId: base.id }
        });
        console.log(`✅ 删除采购订单: ${deleted.count} 条`);
      }

      // 3.6 删除位置记录
      if (locations > 0) {
        const deleted = await tx.location.deleteMany({
          where: { baseId: base.id }
        });
        console.log(`✅ 删除位置记录: ${deleted.count} 条`);
      }

      // 3.7 删除客户记录
      if (customers > 0) {
        const deleted = await tx.customer.deleteMany({
          where: { baseId: base.id }
        });
        console.log(`✅ 删除客户记录: ${deleted.count} 条`);
      }

      // 3.8 删除人员记录
      if (personnel > 0) {
        const deleted = await tx.personnel.deleteMany({
          where: { baseId: base.id }
        });
        console.log(`✅ 删除人员记录: ${deleted.count} 条`);
      }

      // 3.9 清除用户的默认基地设置
      if (defaultUsers > 0) {
        const updated = await tx.user.updateMany({
          where: { defaultBaseId: base.id },
          data: { defaultBaseId: null }
        });
        console.log(`✅ 清除默认基地设置: ${updated.count} 条`);
      }

      // 3.10 最后删除基地
      await tx.base.delete({
        where: { id: base.id }
      });
      console.log(`✅ 删除基地: BASE001`);
    });

    console.log('\n🎉 清理完成！基地 BASE001 及所有相关数据已删除');

  } catch (error) {
    console.error('❌ 清理过程中出现错误:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// 执行清理
cleanupBase001()
  .catch((error) => {
    console.error('❌ 脚本执行失败:', error);
    process.exit(1);
  });
