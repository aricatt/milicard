import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function findOrphanRecords() {
  console.log('=== 检查孤立记录 ===\n');

  // 1. 检查 TransferRecord 中引用不存在商品的记录
  const orphanTransfers = await prisma.$queryRaw<any[]>`
    SELECT tr.id, tr.goods_id, tr.transfer_date 
    FROM transfer_records tr 
    LEFT JOIN goods g ON tr.goods_id = g.id 
    WHERE g.id IS NULL
  `;
  
  if (orphanTransfers.length > 0) {
    console.log(`发现 ${orphanTransfers.length} 条调货记录引用了不存在的商品:`);
    orphanTransfers.forEach(r => {
      console.log(`  - ID: ${r.id}, goodsId: ${r.goods_id}, date: ${r.transfer_date}`);
    });
  } else {
    console.log('✓ TransferRecord 表没有孤立记录');
  }

  // 2. 检查其他可能有问题的表
  const tables = [
    { name: 'arrival_records', fk: 'goods_id' },
    { name: 'purchase_order_items', fk: 'goods_id' },
    { name: 'stock_consumption', fk: 'goods_id' },
    { name: 'stock_outs', fk: 'goods_id' },
    { name: 'inventory', fk: 'goods_id' },
  ];

  for (const table of tables) {
    const orphans = await prisma.$queryRawUnsafe<any[]>(`
      SELECT t.id, t.${table.fk} as goods_id
      FROM ${table.name} t 
      LEFT JOIN goods g ON t.${table.fk} = g.id 
      WHERE g.id IS NULL
    `);
    
    if (orphans.length > 0) {
      console.log(`\n发现 ${orphans.length} 条 ${table.name} 记录引用了不存在的商品`);
    } else {
      console.log(`✓ ${table.name} 表没有孤立记录`);
    }
  }

  console.log('\n=== 检查完成 ===');
}

async function deleteOrphanRecords() {
  console.log('\n=== 删除孤立记录 ===\n');

  // 1. 删除引用不存在商品的调货记录
  const transferResult = await prisma.$executeRaw`
    DELETE FROM transfer_records 
    WHERE goods_id NOT IN (SELECT id FROM goods)
  `;
  console.log(`已删除 ${transferResult} 条孤立的调货记录`);

  // 2. 删除引用不存在商品的到货记录
  const arrivalResult = await prisma.$executeRaw`
    DELETE FROM arrival_records 
    WHERE goods_id NOT IN (SELECT id FROM goods)
  `;
  console.log(`已删除 ${arrivalResult} 条孤立的到货记录`);

  // 3. 删除引用不存在商品的消耗记录
  const consumptionResult = await prisma.$executeRaw`
    DELETE FROM stock_consumption 
    WHERE goods_id NOT IN (SELECT id FROM goods)
  `;
  console.log(`已删除 ${consumptionResult} 条孤立的消耗记录`);
}

async function main() {
  try {
    await findOrphanRecords();
    
    // 执行删除
    await deleteOrphanRecords();
    
  } catch (error) {
    console.error('错误:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
