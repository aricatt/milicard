import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 系统预置参数定义
 * 这些参数是系统必需的，不能被删除，只能修改值
 */
const SYSTEM_SETTINGS = [
  {
    key: 'business.profit_margin_threshold',
    value: 0.3,
    description: '毛利率预警值（低于此值需要核查）',
    category: 'business',
  },
  {
    key: 'stock.low_quantity_threshold',
    value: {
      value: 5,
      unit: 'box',
      enabled: true,
    },
    description: '库存不足预警阈值（全局默认值）',
    category: 'stock',
  },
];

async function seedGlobalSettings() {
  console.log('🌱 开始初始化系统预置参数...');

  // 获取系统管理员用户（假设第一个用户是管理员）
  const adminUser = await prisma.user.findFirst({
    orderBy: { createdAt: 'asc' },
  });

  if (!adminUser) {
    console.error('❌ 错误：找不到管理员用户，请先创建用户');
    return;
  }

  console.log(`✅ 使用用户: ${adminUser.username} (${adminUser.id})`);

  let createdCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;

  for (const setting of SYSTEM_SETTINGS) {
    try {
      // 检查参数是否已存在
      const existing = await prisma.globalSetting.findUnique({
        where: { key: setting.key },
      });

      if (existing) {
        // 如果已存在，确保 isSystem 标记为 true
        if (!existing.isSystem) {
          await prisma.globalSetting.update({
            where: { key: setting.key },
            data: { isSystem: true },
          });
          console.log(`  ✓ 更新: ${setting.key} (标记为系统参数)`);
          updatedCount++;
        } else {
          console.log(`  - 跳过: ${setting.key} (已存在)`);
          skippedCount++;
        }
      } else {
        // 创建新的系统参数
        await prisma.globalSetting.create({
          data: {
            key: setting.key,
            value: setting.value,
            description: setting.description,
            category: setting.category,
            isSystem: true,
            isActive: true,
            createdBy: adminUser.id,
          },
        });
        console.log(`  ✓ 创建: ${setting.key}`);
        createdCount++;
      }
    } catch (error) {
      console.error(`  ✗ 失败: ${setting.key}`, error);
    }
  }

  console.log('\n📊 统计:');
  console.log(`  - 创建: ${createdCount} 个`);
  console.log(`  - 更新: ${updatedCount} 个`);
  console.log(`  - 跳过: ${skippedCount} 个`);
  console.log('✅ 系统预置参数初始化完成！');
}

// 执行种子数据脚本
seedGlobalSettings()
  .catch((e) => {
    console.error('❌ 种子数据脚本执行失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
