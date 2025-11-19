/**
 * 数据测试辅助函数
 */

import { prisma } from '../../utils/database'
import { PasswordService } from '../../services/passwordService'
import { User, Location, Goods, Customer } from '@prisma/client'

/**
 * 创建测试用户
 */
export async function createTestUser(userData: {
  username: string
  email: string
  password: string
  roles?: string[]
}): Promise<User> {
  const hashedPassword = await PasswordService.hashPassword(userData.password)
  
  return await prisma.user.create({
    data: {
      username: userData.username,
      email: userData.email,
      passwordHash: hashedPassword,
      name: userData.username, // 使用username作为默认name
      isActive: true
    }
  })
}

/**
 * 创建测试仓库
 */
export async function createTestLocation(locationData: {
  name: string
  type: 'WAREHOUSE' | 'LIVE_ROOM'
  address?: string
}): Promise<Location> {
  return await prisma.location.create({
    data: {
      name: locationData.name,
      type: locationData.type,
      address: locationData.address || '测试地址',
      isActive: true
    }
  })
}

/**
 * 创建测试商品
 */
export async function createTestGoods(goodsData: {
  code: string
  name: string
  retailPrice: number
  purchasePrice: number
  description?: string
}): Promise<Goods> {
  return await prisma.goods.create({
    data: {
      code: goodsData.code,
      name: goodsData.name,
      description: goodsData.description || '测试商品描述',
      retailPrice: goodsData.retailPrice,
      purchasePrice: goodsData.purchasePrice,
      boxQuantity: 1,
      packPerBox: 1,
      piecePerPack: 1
    }
  })
}

/**
 * 创建测试客户
 */
export async function createTestCustomer(customerData: {
  name: string
  contactPerson?: string
  phone?: string
  email?: string
}): Promise<Customer> {
  return await prisma.customer.create({
    data: {
      name: customerData.name,
      contactPerson: customerData.contactPerson,
      phone: customerData.phone,
      email: customerData.email,
      isActive: true
    }
  })
}

/**
 * 清理测试数据
 */
export async function cleanupTestData(userId?: string) {
  if (userId) {
    // 清理特定用户的测试数据
    await prisma.purchaseOrderItem.deleteMany({
      where: {
        purchaseOrder: {
          createdBy: userId
        }
      }
    })
    await prisma.purchaseOrder.deleteMany({
      where: {
        createdBy: userId
      }
    })
    await prisma.distributionOrderItem.deleteMany({
      where: {
        distributionOrder: {
          createdBy: userId
        }
      }
    })
    await prisma.distributionOrder.deleteMany({
      where: {
        createdBy: userId
      }
    })
  }
}

/**
 * 生成唯一的测试标识符
 */
export function generateTestId(prefix: string = 'test'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}
