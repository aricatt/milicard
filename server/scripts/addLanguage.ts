#!/usr/bin/env ts-node

import { PrismaClient } from '@prisma/client'
import { SupportedLanguage } from '../src/types/i18n'

const prisma = new PrismaClient()

// 新增语言扩展脚本
async function addNewLanguage(newLanguage: SupportedLanguage) {
  console.log(`🌍 开始为新语言 ${newLanguage} 创建翻译条目...`)

  try {
    // 1. 获取所有现有的翻译键（以中文为基准）
    const existingKeys = await prisma.translation.findMany({
      where: { language: 'zh-CN' },
      select: { key: true, value: true, namespace: true, description: true }
    })

    console.log(`📋 找到 ${existingKeys.length} 个翻译键需要处理`)

    // 2. 为新语言创建占位符翻译
    let createdCount = 0
    for (const keyInfo of existingKeys) {
      // 检查是否已存在该语言的翻译
      const existing = await prisma.translation.findUnique({
        where: {
          key_language: {
            key: keyInfo.key,
            language: newLanguage
          }
        }
      })

      if (!existing) {
        await prisma.translation.create({
          data: {
            key: keyInfo.key,
            language: newLanguage,
            value: keyInfo.value, // 暂时使用中文作为占位符
            namespace: keyInfo.namespace,
            description: keyInfo.description,
            isSystem: true,
            isAiGenerated: true, // 标记为需要AI翻译
            reviewStatus: 'pending'
          }
        })
        createdCount++
      }
    }

    console.log(`✅ 成功为 ${newLanguage} 创建了 ${createdCount} 个翻译条目`)

    // 3. 更新现有商品数据的多语言字段
    await updateExistingGoodsData(newLanguage)

    // 4. 更新现有客户数据的多语言字段  
    await updateExistingCustomerData(newLanguage)

    console.log(`🎉 语言 ${newLanguage} 扩展完成！`)
    console.log(`📝 提示：新创建的翻译标记为待审核状态，建议使用AI翻译或人工翻译`)

  } catch (error) {
    console.error(`❌ 扩展语言失败:`, error)
    throw error
  }
}

// 更新现有商品数据
async function updateExistingGoodsData(newLanguage: SupportedLanguage) {
  console.log(`📦 更新商品数据的多语言字段...`)
  
  const goods = await prisma.goods.findMany()
  let updatedCount = 0

  for (const item of goods) {
    let needsUpdate = false
    let updatedName = item.name as any
    let updatedDescription = item.description as any

    // 更新name字段
    if (updatedName && typeof updatedName === 'object') {
      if (!updatedName[newLanguage.replace('-', '_')]) {
        updatedName[newLanguage.replace('-', '_')] = updatedName.zh_CN || updatedName.name
        needsUpdate = true
      }
    }

    // 更新description字段
    if (updatedDescription && typeof updatedDescription === 'object') {
      if (!updatedDescription[newLanguage.replace('-', '_')]) {
        updatedDescription[newLanguage.replace('-', '_')] = updatedDescription.zh_CN || updatedDescription.description
        needsUpdate = true
      }
    }

    if (needsUpdate) {
      await prisma.goods.update({
        where: { id: item.id },
        data: {
          name: updatedName,
          description: updatedDescription
        }
      })
      updatedCount++
    }
  }

  console.log(`✅ 更新了 ${updatedCount} 个商品的多语言字段`)
}

// 更新现有客户数据
async function updateExistingCustomerData(newLanguage: SupportedLanguage) {
  console.log(`👥 更新客户数据的多语言字段...`)
  
  const customers = await prisma.customer.findMany()
  let updatedCount = 0

  for (const item of customers) {
    let needsUpdate = false
    let updatedName = item.name as any
    let updatedAddress = item.address as any

    // 更新name字段
    if (updatedName && typeof updatedName === 'object') {
      if (!updatedName[newLanguage.replace('-', '_')]) {
        updatedName[newLanguage.replace('-', '_')] = updatedName.zh_CN || updatedName.name
        needsUpdate = true
      }
    }

    // 更新address字段
    if (updatedAddress && typeof updatedAddress === 'object') {
      if (!updatedAddress[newLanguage.replace('-', '_')]) {
        updatedAddress[newLanguage.replace('-', '_')] = updatedAddress.zh_CN || updatedAddress.address
        needsUpdate = true
      }
    }

    if (needsUpdate) {
      await prisma.customer.update({
        where: { id: item.id },
        data: {
          name: updatedName,
          address: updatedAddress
        }
      })
      updatedCount++
    }
  }

  console.log(`✅ 更新了 ${updatedCount} 个客户的多语言字段`)
}

// 命令行使用
if (require.main === module) {
  const language = process.argv[2] as SupportedLanguage
  
  if (!language) {
    console.error('❌ 请指定要添加的语言代码')
    console.log('用法: npm run add-language ja-JP')
    console.log('支持的语言: zh-CN, en-US, vi-VN, th-TH, ja-JP, ko-KR, id-ID, ms-MY')
    process.exit(1)
  }

  addNewLanguage(language)
    .catch((e) => {
      console.error('❌ 添加语言失败:', e)
      process.exit(1)
    })
    .finally(async () => {
      await prisma.$disconnect()
    })
}

export { addNewLanguage }
