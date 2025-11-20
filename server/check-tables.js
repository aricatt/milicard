const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkTables() {
  try {
    // 检查表是否存在
    const result = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('bases', 'user_bases', 'goods_bases', 'suppliers', 'supplier_bases')
    `;
    
    console.log('✅ 数据库表:', result);
    
    // 检查bases表的数据
    try {
      const bases = await prisma.$queryRaw`SELECT * FROM bases LIMIT 5`;
      console.log('✅ bases表数据:', bases);
    } catch (error) {
      console.log('❌ bases表查询失败:', error.message);
    }
    
  } catch (error) {
    console.error('❌ 检查失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTables();
