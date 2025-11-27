/**
 * 重新计算所有商品的平均成本
 * 用于修复已导入但未计算成本的到货数据
 * 
 * 运行方式: npx ts-node scripts/recalculate-inventory-costs.ts
 */

import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

async function recalculateInventoryCosts() {
  console.log('开始重新计算商品平均成本...\n');

  try {
    // 获取所有有到货记录的商品和基地组合
    const goodsBaseGroups = await prisma.arrivalRecord.groupBy({
      by: ['goodsId', 'baseId'],
    });

    console.log(`找到 ${goodsBaseGroups.length} 个商品-基地组合需要计算\n`);

    for (const group of goodsBaseGroups) {
      const { goodsId, baseId } = group;

      // 获取该商品的所有到货记录，按时间排序
      const arrivals = await prisma.arrivalRecord.findMany({
        where: {
          goodsId,
          baseId,
        },
        include: {
          purchaseOrder: {
            include: {
              items: {
                where: { goodsId },
                take: 1,
              },
            },
          },
          goods: {
            select: { name: true, code: true },
          },
        },
        orderBy: { arrivalDate: 'asc' },
      });

      if (arrivals.length === 0) continue;

      // 计算移动加权平均成本
      let totalQuantity = 0;
      let totalValue = 0;
      let avgCost = 0;

      for (const arrival of arrivals) {
        const purchaseItem = arrival.purchaseOrder?.items?.[0];
        if (!purchaseItem) {
          console.log(`  警告: 到货记录 ${arrival.id} 没有关联的采购明细，跳过`);
          continue;
        }

        const unitPrice = Number(purchaseItem.unitPrice);
        const boxQty = arrival.boxQuantity;

        if (boxQty > 0) {
          // 移动加权平均
          totalValue = avgCost * totalQuantity + unitPrice * boxQty;
          totalQuantity += boxQty;
          avgCost = totalQuantity > 0 ? totalValue / totalQuantity : 0;
        }
      }

      // 更新或创建 Inventory 记录
      await prisma.inventory.upsert({
        where: {
          goodsId_baseId: { goodsId, baseId },
        },
        update: {
          averageCost: new Decimal(avgCost.toFixed(2)),
        },
        create: {
          goodsId,
          baseId,
          averageCost: new Decimal(avgCost.toFixed(2)),
        },
      });

      const goodsName = arrivals[0]?.goods?.name || goodsId;
      console.log(`✓ ${goodsName}: 平均成本 = ${avgCost.toFixed(2)} (${arrivals.length} 条到货记录, ${totalQuantity} 箱)`);
    }

    console.log('\n成本计算完成！');

    // 显示统计
    const inventoryCount = await prisma.inventory.count();
    console.log(`\nInventory 表现有 ${inventoryCount} 条记录`);

  } catch (error) {
    console.error('计算失败:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

recalculateInventoryCosts();
