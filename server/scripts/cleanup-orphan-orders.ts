import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('开始清理孤立的采购订单...');

  // 删除没有明细的采购订单
  const result = await prisma.$queryRawUnsafe(`
    DELETE FROM purchase_orders 
    WHERE id NOT IN (SELECT DISTINCT purchase_order_id FROM purchase_order_items)
  `);

  console.log('✅ 已删除孤立的采购订单');
}

main()
  .catch((e) => {
    console.error('❌ 清理失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
