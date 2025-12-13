import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// 初始品类数据（从原枚举迁移）
const categories = [
  { code: 'CARD', name: '卡牌', sortOrder: 1 },
  { code: 'CARD_BRICK', name: '卡砖', sortOrder: 2 },
  { code: 'GIFT', name: '礼物', sortOrder: 3 },
  { code: 'COLOR_PAPER', name: '色纸', sortOrder: 4 },
  { code: 'FORTUNE_SIGN', name: '上上签', sortOrder: 5 },
  { code: 'TEAR_CARD', name: '撕撕乐', sortOrder: 6 },
  { code: 'TOY', name: '玩具', sortOrder: 7 },
  { code: 'STAMP', name: '邮票', sortOrder: 8 },
  { code: 'LUCKY_CAT', name: '招财猫', sortOrder: 9 }
]

async function main() {
  console.log('开始初始化品类数据...')

  for (const cat of categories) {
    const existing = await prisma.category.findUnique({
      where: { code: cat.code }
    })

    if (existing) {
      console.log(`品类 ${cat.code} (${cat.name}) 已存在，跳过`)
    } else {
      await prisma.category.create({
        data: cat
      })
      console.log(`创建品类: ${cat.code} (${cat.name})`)
    }
  }

  // 更新现有商品的 categoryId（根据旧的 category 字段值）
  console.log('\n开始迁移商品品类关联...')
  
  // 获取所有品类的 code -> id 映射
  const allCategories = await prisma.category.findMany()
  const codeToId = new Map(allCategories.map(c => [c.code, c.id]))

  // 查询所有商品（使用原始 SQL 因为 category 字段已从 Prisma schema 移除）
  const goods = await prisma.$queryRaw<Array<{ id: string; category: string | null }>>`
    SELECT id, category FROM goods WHERE category IS NOT NULL AND category_id IS NULL
  `

  let migratedCount = 0
  for (const g of goods) {
    if (g.category && codeToId.has(g.category)) {
      await prisma.goods.update({
        where: { id: g.id },
        data: { categoryId: codeToId.get(g.category) }
      })
      migratedCount++
    }
  }

  console.log(`迁移完成: ${migratedCount} 个商品已关联品类`)
  console.log('\n品类初始化完成!')
}

main()
  .catch((e) => {
    console.error('初始化失败:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
