const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkUsers() {
  try {
    // 检查现有用户
    const users = await prisma.$queryRaw`SELECT id, username FROM users LIMIT 5`;
    console.log('📋 现有用户:', users);

    if (users.length === 0) {
      console.log('🔧 创建系统用户...');
      // 创建一个系统用户
      const systemUser = await prisma.$queryRaw`
        INSERT INTO users (
          id, username, email, password_hash, name, is_active
        ) VALUES (
          gen_random_uuid(), 'system', 'system@milicard.com', 
          '$2b$10$dummy.hash.for.system.user', '系统用户', true
        ) RETURNING id, username
      `;
      console.log('✅ 系统用户创建成功:', systemUser);
    }

    // 再次获取用户列表
    const finalUsers = await prisma.$queryRaw`SELECT id, username FROM users LIMIT 5`;
    console.log('📋 最终用户列表:', finalUsers);

  } catch (error) {
    console.error('❌ 检查用户失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUsers();
