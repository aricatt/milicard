# 业务编号生成规则文档

## 📋 概述

本文档定义了系统中所有业务数据的编号生成规则。编号用于唯一标识业务实体，区别于数据库ID，具有业务语义和可读性。

## 🎯 设计原则

### 基本规则
- **格式**: `{PREFIX}-{RANDOM_STRING}`
- **前缀**: 业务类型标识（3-8个字符）
- **随机串**: 固定长度的字母数字组合
- **唯一性**: 全局唯一，支持跨表查询
- **可读性**: 前缀具有业务含义，便于识别

### 技术特性
- **字符集**: `0123456789ABCDEFGHJKLMNPQRSTUVWXYZ` (去除易混淆字符 I, O, 1, 0)
- **随机串长度**: 11位
- **冲突处理**: 自动重试机制，最多重试10次
- **性能优化**: 单次数据库查询验证唯一性

## 📊 业务编号规则表

### 人员管理
| 业务类型 | 前缀 | 示例 | 说明 |
|---------|------|------|------|
| 主播 | `ANCHOR` | `ANCHOR-D9EUUPNMHKK` | 直播主播人员 |
| 仓管 | `KEEPER` | `KEEPER-5KW2YWL38ER` | 仓库管理人员 |

### 位置管理
| 业务类型 | 前缀 | 示例 | 说明 |
|---------|------|------|------|
| 直播间 | `LIVE` | `LIVE-342Y1EYP1B4` | 直播间位置 |
| 仓库 | `WAREHOUSE` | `WAREHOUSE-8K9L2M3N4P5` | 仓库位置 |

### 基础数据
| 业务类型 | 前缀 | 示例 | 说明 |
|---------|------|------|------|
| 商品 | `GOODS` | `GOODS-7H8J9K1L2M3` | 商品信息 |
| 客户 | `CUSTOMER` | `CUSTOMER-5F6G7H8J9K1` | 客户信息 |
| 供应商 | `SUPPLIER` | `SUPPLIER-3D4E5F6G7H8` | 供应商信息 |
| 基地 | `BASE` | `BASE-1A2B3C4D5E6` | 基地信息 |

### 订单管理
| 业务类型 | 前缀 | 示例 | 说明 |
|---------|------|------|------|
| 采购订单 | `PO` | `PO-9X8Y7Z6A5B4` | Purchase Order |
| 销售订单 | `DO` | `DO-4C3D2E1F9G8` | Distribution Order |
| 调拨订单 | `TO` | `TO-7H6J5K4L3M2` | Transfer Order |
| 到货单 | `AO` | `AO-2N1P9Q8R7S6` | Arrival Order |
| 出库单 | `SO` | `SO-5T4U3V2W1X9` | Stock Out Order |

## 🔧 技术实现

### 核心类
```typescript
export class CodeGenerator {
  // 编号前缀配置
  private static readonly CODE_PREFIXES = {
    ANCHOR: 'ANCHOR',
    WAREHOUSE_KEEPER: 'KEEPER',
    LIVE_ROOM: 'LIVE',
    WAREHOUSE: 'WAREHOUSE',
    // ... 更多配置
  };
  
  // 生成编号的核心方法
  public static async generateCode(
    type: keyof typeof CodeGenerator.CODE_PREFIXES,
    tableName: string,
    maxRetries: number = 10
  ): Promise<string>
}
```

### 使用示例
```typescript
// 生成主播编号
const anchorCode = await CodeGenerator.generatePersonnelCode('ANCHOR');
// 结果: ANCHOR-D9EUUPNMHKK

// 生成仓管编号
const keeperCode = await CodeGenerator.generatePersonnelCode('WAREHOUSE_KEEPER');
// 结果: KEEPER-5KW2YWL38ER

// 生成直播间编号
const liveCode = await CodeGenerator.generateLocationCode('LIVE_ROOM');
// 结果: LIVE-342Y1EYP1B4
```

### 验证和工具方法
```typescript
// 验证编号格式
const isValid = CodeGenerator.validateCodeFormat('ANCHOR-D9EUUPNMHKK', 'ANCHOR');

// 从编号提取业务类型
const type = CodeGenerator.extractTypeFromCode('ANCHOR-D9EUUPNMHKK');
// 结果: 'ANCHOR'

// 批量生成编号
const codes = await CodeGenerator.generateBatchCodes('ANCHOR', 'personnel', 5);
```

## 📈 性能考虑

### 冲突概率
- **字符集大小**: 33个字符
- **随机串长度**: 11位
- **理论组合数**: 33^11 ≈ 1.29 × 10^16
- **实际冲突概率**: 极低（生日悖论下约需10^8个编号才有1%冲突概率）

### 数据库优化
- 所有编号字段都建立了唯一索引
- 使用单次查询验证唯一性
- 重试机制避免极少数冲突情况

## 🔒 安全性

### 防猜测设计
- 使用随机字符串，无法预测下一个编号
- 不包含时间戳或序列号信息
- 字符集去除易混淆字符，提高可读性

### 业务隔离
- 不同业务类型使用不同前缀
- 支持按前缀快速识别业务类型
- 便于权限控制和数据过滤

## 🧪 测试验证

### 单元测试
```bash
# 运行编号生成器测试
npx ts-node src/utils/simpleCodeTest.ts
```

### 测试覆盖
- ✅ 编号生成功能
- ✅ 格式验证
- ✅ 类型提取
- ✅ 唯一性验证
- ✅ 批量生成
- ✅ 错误处理

## 📝 使用规范

### 开发规范
1. **统一使用**: 所有新增业务实体必须使用编号生成器
2. **前缀规范**: 新增业务类型需要在 `CODE_PREFIXES` 中定义前缀
3. **表名映射**: 确保 Prisma 表名映射正确
4. **错误处理**: 妥善处理编号生成失败的情况

### 数据库规范
1. **字段定义**: 编号字段统一命名为 `code`
2. **索引创建**: 必须为编号字段创建唯一索引
3. **长度限制**: 编号字段长度建议设置为 20-30 字符

### 前端显示
1. **用户界面**: 优先显示编号而非ID
2. **搜索功能**: 支持按编号搜索
3. **导出功能**: 导出数据时包含编号

## 🔄 扩展计划

### 短期扩展
- [ ] 支持自定义前缀长度
- [ ] 支持时间戳前缀（可选）
- [ ] 支持校验位算法

### 长期规划
- [ ] 分布式环境下的编号生成
- [ ] 编号回收和重用机制
- [ ] 编号统计和分析功能

## 📞 联系方式

如有问题或建议，请联系开发团队。

---

**文档版本**: v1.0  
**最后更新**: 2025-11-21  
**维护人员**: 开发团队
