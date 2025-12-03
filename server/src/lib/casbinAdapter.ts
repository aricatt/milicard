/**
 * Casbin Prisma Adapter
 * 自定义适配器，用于将 Casbin 策略存储到 PostgreSQL
 */
import { Adapter, Model, Helper } from 'casbin';
import { PrismaClient } from '@prisma/client';

export class PrismaCasbinAdapter implements Adapter {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * 从数据库加载策略
   */
  async loadPolicy(model: Model): Promise<void> {
    const rules = await this.prisma.casbinRule.findMany();

    for (const rule of rules) {
      const line = this.buildPolicyLine(rule);
      if (line) {
        Helper.loadPolicyLine(line, model);
      }
    }
  }

  /**
   * 保存策略到数据库
   */
  async savePolicy(model: Model): Promise<boolean> {
    // 清空现有策略
    await this.prisma.casbinRule.deleteMany();

    const policies: Array<{
      ptype: string;
      v0: string | null;
      v1: string | null;
      v2: string | null;
      v3: string | null;
      v4: string | null;
      v5: string | null;
    }> = [];

    // 收集 p 策略
    const pPolicy = model.model.get('p');
    if (pPolicy) {
      for (const [ptype, ast] of pPolicy) {
        for (const rule of ast.policy) {
          policies.push(this.buildRule(ptype, rule));
        }
      }
    }

    // 收集 g 策略（角色继承）
    const gPolicy = model.model.get('g');
    if (gPolicy) {
      for (const [ptype, ast] of gPolicy) {
        for (const rule of ast.policy) {
          policies.push(this.buildRule(ptype, rule));
        }
      }
    }

    // 批量插入
    if (policies.length > 0) {
      await this.prisma.casbinRule.createMany({ data: policies });
    }

    return true;
  }

  /**
   * 添加策略
   */
  async addPolicy(sec: string, ptype: string, rule: string[]): Promise<void> {
    const data = this.buildRule(ptype, rule);
    await this.prisma.casbinRule.create({ data });
  }

  /**
   * 删除策略
   */
  async removePolicy(sec: string, ptype: string, rule: string[]): Promise<void> {
    const where: any = { ptype };
    
    rule.forEach((v, i) => {
      where[`v${i}`] = v;
    });

    await this.prisma.casbinRule.deleteMany({ where });
  }

  /**
   * 删除过滤后的策略
   */
  async removeFilteredPolicy(
    sec: string,
    ptype: string,
    fieldIndex: number,
    ...fieldValues: string[]
  ): Promise<void> {
    const where: any = { ptype };

    fieldValues.forEach((v, i) => {
      if (v !== '') {
        where[`v${fieldIndex + i}`] = v;
      }
    });

    await this.prisma.casbinRule.deleteMany({ where });
  }

  /**
   * 构建策略行字符串
   */
  private buildPolicyLine(rule: {
    ptype: string;
    v0: string | null;
    v1: string | null;
    v2: string | null;
    v3: string | null;
    v4: string | null;
    v5: string | null;
  }): string {
    const values = [rule.v0, rule.v1, rule.v2, rule.v3, rule.v4, rule.v5]
      .filter((v) => v !== null && v !== undefined && v !== '')
      .join(', ');

    return `${rule.ptype}, ${values}`;
  }

  /**
   * 构建规则对象
   */
  private buildRule(ptype: string, rule: string[]) {
    return {
      ptype,
      v0: rule[0] || null,
      v1: rule[1] || null,
      v2: rule[2] || null,
      v3: rule[3] || null,
      v4: rule[4] || null,
      v5: rule[5] || null,
    };
  }
}
