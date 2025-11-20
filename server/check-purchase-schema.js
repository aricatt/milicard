const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkPurchaseSchema() {
  try {
    // 检查purchase_orders表结构
    const columns = await prisma.$queryRaw`
      SELECT column_name, is_nullable, data_type, column_default
      FROM information_schema.columns 
      WHERE table_name = 'purchase_orders' 
      ORDER BY ordinal_position
    `;
    
    console.log('📋 purchase_orders表结构:');
    columns.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });

    // 检查约束
    const constraints = await prisma.$queryRaw`
      SELECT constraint_name, constraint_type
      FROM information_schema.table_constraints 
      WHERE table_name = 'purchase_orders'
    `;
    
    console.log('\n🔒 约束信息:');
    constraints.forEach(constraint => {
      console.log(`  - ${constraint.constraint_name}: ${constraint.constraint_type}`);
    });

    // 尝试简单插入测试
    console.log('\n🧪 测试简单插入...');
    try {
      const testResult = await prisma.$queryRaw`
        INSERT INTO purchase_orders (
          id, order_no, supplier_name, target_location_id, base_id, 
          purchase_date, total_amount
        ) VALUES (
          gen_random_uuid(), 'TEST001', '测试供应商', 
          '0b59564c-21de-4db6-8a50-cd371b763d22', 1,
          '2025-11-20', 100.00
        ) RETURNING id, order_no
      `;
      console.log('✅ 插入成功:', testResult);
    } catch (insertError) {
      console.log('❌ 插入失败:', insertError.message);
    }

  } catch (error) {
    console.error('❌ 检查失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPurchaseSchema();
