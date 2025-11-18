import { Adapter } from 'casbin'
import { PrismaClient } from '@prisma/client'
import { logger } from '../utils/logger'

/**
 * 自定义Prisma适配器，用于Casbin权限管理
 * 由于casbin-prisma-adapter版本冲突，我们自己实现一个简单的适配器
 */
export class PrismaCasbinAdapter implements Adapter {
  private prisma: PrismaClient

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
  }

  /**
   * 加载所有策略规则
   */
  async loadPolicy(model: any): Promise<void> {
    try {
      // 加载策略规则 (p, p2, p3, ...)
      const policies = await this.prisma.$queryRaw<Array<{
        ptype: string
        v0: string
        v1: string
        v2: string
        v3: string | null
        v4: string | null
        v5: string | null
      }>>`
        SELECT ptype, v0, v1, v2, v3, v4, v5 
        FROM casbin_rule 
        WHERE ptype LIKE 'p%'
      `

      for (const policy of policies) {
        const rule = [policy.v0, policy.v1, policy.v2]
        if (policy.v3) rule.push(policy.v3)
        if (policy.v4) rule.push(policy.v4)
        if (policy.v5) rule.push(policy.v5)
        
        model.model.get('p').get(policy.ptype).policy.push(rule)
      }

      // 加载角色继承规则 (g, g2, g3, ...)
      const groupings = await this.prisma.$queryRaw<Array<{
        ptype: string
        v0: string
        v1: string
        v2: string | null
        v3: string | null
        v4: string | null
        v5: string | null
      }>>`
        SELECT ptype, v0, v1, v2, v3, v4, v5 
        FROM casbin_rule 
        WHERE ptype LIKE 'g%'
      `

      for (const grouping of groupings) {
        const rule = [grouping.v0, grouping.v1]
        if (grouping.v2) rule.push(grouping.v2)
        if (grouping.v3) rule.push(grouping.v3)
        if (grouping.v4) rule.push(grouping.v4)
        if (grouping.v5) rule.push(grouping.v5)
        
        model.model.get('g').get(grouping.ptype).policy.push(rule)
      }

      logger.info('Casbin策略加载成功', {
        policies: policies.length,
        groupings: groupings.length
      })
    } catch (error) {
      logger.error('加载Casbin策略失败', { error })
      throw error
    }
  }

  /**
   * 保存策略规则
   */
  async savePolicy(model: any): Promise<boolean> {
    try {
      // 清空现有规则
      await this.prisma.$executeRaw`DELETE FROM casbin_rule`

      const rules: Array<{
        ptype: string
        v0: string
        v1: string
        v2: string
        v3?: string
        v4?: string
        v5?: string
      }> = []

      // 收集策略规则
      for (const [ptype, ast] of model.model.get('p')) {
        for (const rule of ast.policy) {
          rules.push({
            ptype,
            v0: rule[0] || '',
            v1: rule[1] || '',
            v2: rule[2] || '',
            v3: rule[3] || undefined,
            v4: rule[4] || undefined,
            v5: rule[5] || undefined
          })
        }
      }

      // 收集角色继承规则
      for (const [ptype, ast] of model.model.get('g')) {
        for (const rule of ast.policy) {
          rules.push({
            ptype,
            v0: rule[0] || '',
            v1: rule[1] || '',
            v2: rule[2] || '',
            v3: rule[3] || undefined,
            v4: rule[4] || undefined,
            v5: rule[5] || undefined
          })
        }
      }

      // 批量插入规则
      if (rules.length > 0) {
        await this.prisma.$executeRaw`
          INSERT INTO casbin_rule (ptype, v0, v1, v2, v3, v4, v5)
          VALUES ${rules.map(rule => 
            `('${rule.ptype}', '${rule.v0}', '${rule.v1}', '${rule.v2}', ${
              rule.v3 ? `'${rule.v3}'` : 'NULL'
            }, ${
              rule.v4 ? `'${rule.v4}'` : 'NULL'
            }, ${
              rule.v5 ? `'${rule.v5}'` : 'NULL'
            })`
          ).join(', ')}
        `
      }

      logger.info('Casbin策略保存成功', { rulesCount: rules.length })
      return true
    } catch (error) {
      logger.error('保存Casbin策略失败', { error })
      return false
    }
  }

  /**
   * 添加策略规则
   */
  async addPolicy(sec: string, ptype: string, rule: string[]): Promise<void> {
    try {
      await this.prisma.$executeRaw`
        INSERT INTO casbin_rule (ptype, v0, v1, v2, v3, v4, v5)
        VALUES (${ptype}, ${rule[0] || ''}, ${rule[1] || ''}, ${rule[2] || ''}, 
                ${rule[3] || null}, ${rule[4] || null}, ${rule[5] || null})
      `
      
      logger.debug('添加Casbin策略', { ptype, rule })
    } catch (error) {
      logger.error('添加Casbin策略失败', { error, ptype, rule })
      throw error
    }
  }

  /**
   * 删除策略规则
   */
  async removePolicy(sec: string, ptype: string, rule: string[]): Promise<void> {
    try {
      const conditions = ['ptype = ?']
      const values = [ptype]

      rule.forEach((value, index) => {
        if (value) {
          conditions.push(`v${index} = ?`)
          values.push(value)
        }
      })

      await this.prisma.$executeRawUnsafe(
        `DELETE FROM casbin_rule WHERE ${conditions.join(' AND ')}`,
        ...values
      )

      logger.debug('删除Casbin策略', { ptype, rule })
    } catch (error) {
      logger.error('删除Casbin策略失败', { error, ptype, rule })
      throw error
    }
  }

  /**
   * 删除过滤的策略规则
   */
  async removeFilteredPolicy(
    sec: string, 
    ptype: string, 
    fieldIndex: number, 
    ...fieldValues: string[]
  ): Promise<void> {
    try {
      const conditions = ['ptype = ?']
      const values = [ptype]

      fieldValues.forEach((value, index) => {
        if (value) {
          conditions.push(`v${fieldIndex + index} = ?`)
          values.push(value)
        }
      })

      await this.prisma.$executeRawUnsafe(
        `DELETE FROM casbin_rule WHERE ${conditions.join(' AND ')}`,
        ...values
      )

      logger.debug('删除过滤的Casbin策略', { ptype, fieldIndex, fieldValues })
    } catch (error) {
      logger.error('删除过滤的Casbin策略失败', { error, ptype, fieldIndex, fieldValues })
      throw error
    }
  }

  /**
   * 确保Casbin规则表存在
   */
  async ensureTableExists(): Promise<void> {
    try {
      await this.prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS casbin_rule (
          id SERIAL PRIMARY KEY,
          ptype VARCHAR(100) NOT NULL,
          v0 VARCHAR(100) NOT NULL DEFAULT '',
          v1 VARCHAR(100) NOT NULL DEFAULT '',
          v2 VARCHAR(100) NOT NULL DEFAULT '',
          v3 VARCHAR(100),
          v4 VARCHAR(100),
          v5 VARCHAR(100),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(ptype, v0, v1, v2, v3, v4, v5)
        )
      `

      // 创建索引以提高查询性能
      await this.prisma.$executeRaw`
        CREATE INDEX IF NOT EXISTS idx_casbin_rule_ptype ON casbin_rule(ptype)
      `
      
      await this.prisma.$executeRaw`
        CREATE INDEX IF NOT EXISTS idx_casbin_rule_v0 ON casbin_rule(v0)
      `

      logger.info('Casbin规则表初始化完成')
    } catch (error) {
      logger.error('初始化Casbin规则表失败', { error })
      throw error
    }
  }
}
