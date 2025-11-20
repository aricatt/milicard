const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createDefaultBase() {
  try {
    // 检查是否已存在基地
    const existingBase = await prisma.base.findFirst();
    if (existingBase) {
      console.log('✅ 基地已存在:', existingBase);
      return;
    }

    // 创建默认基地
    const defaultBase = await prisma.base.create({
      data: {
        code: 'HQ001',
        name: '总部基地',
        description: '系统默认基地，用于数据迁移',
        createdBy: 'system',
        updatedBy: 'system'
      }
    });
    
    console.log('✅ 默认基地创建成功:', defaultBase);
    
    // 验证基地是否创建成功
    const baseCount = await prisma.base.count();
    console.log('📊 基地总数:', baseCount);
    
  } catch (error) {
    console.error('❌ 创建默认基地失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createDefaultBase();
