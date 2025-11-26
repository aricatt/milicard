import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('开始创建管理员账号...');

  // 创建管理员用户
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      email: 'admin@milicard.com',
      passwordHash: hashedPassword,
      name: '系统管理员',
      isActive: true,
    },
  });

  console.log('✅ 管理员账号创建成功！');
  console.log('用户名: admin');
  console.log('密码: admin123');
  console.log('请登录后立即修改密码！');
}

main()
  .catch((e) => {
    console.error('❌ 创建管理员账号失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
