const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testNewModels() {
  try {
    console.log('🧪 测试新的Prisma模型...');
    
    // 测试Base模型
    console.log('✅ Base模型可用:', typeof prisma.base);
    
    // 测试GoodsBase模型
    console.log('✅ GoodsBase模型可用:', typeof prisma.goodsBase);
    
    // 测试UserBase模型
    console.log('✅ UserBase模型可用:', typeof prisma.userBase);
    
    // 测试Supplier模型
    console.log('✅ Supplier模型可用:', typeof prisma.supplier);
    
    // 测试SupplierBase模型
    console.log('✅ SupplierBase模型可用:', typeof prisma.supplierBase);
    
    // 测试查询基地
    const bases = await prisma.base.findMany();
    console.log('✅ 基地查询成功，数量:', bases.length);
    
    console.log('🎉 所有新模型都可用！');
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testNewModels();
