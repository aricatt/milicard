# 字段权限诊断工具使用说明

## 🎯 功能

这个脚本可以帮助你快速诊断字段权限问题，无需手动查询数据库。

## 📋 使用方法

### 基础用法（检查所有字段权限）

```powershell
.\scripts\check-field-permissions.ps1
```

这会检查 `stockConsumption` 资源的 `unitPricePerBox` 字段权限（默认值）。

---

### 检查特定资源的所有字段

```powershell
.\scripts\check-field-permissions.ps1 -Resource "anchorProfit"
```

---

### 检查特定字段

```powershell
.\scripts\check-field-permissions.ps1 -Resource "stockConsumption" -Field "unitPricePerBox"
```

---

### 检查特定角色的权限

```powershell
.\scripts\check-field-permissions.ps1 -Resource "stockConsumption" -RoleName "OPERATOR"
```

---

### 完整参数示例

```powershell
.\scripts\check-field-permissions.ps1 `
  -Resource "stockConsumption" `
  -Field "unitPricePerBox" `
  -RoleName "OPERATOR"
```

---

## 📊 输出说明

脚本会显示以下信息：

### 1. 数据库连接信息
```
✅ 数据库连接配置:
   主机: localhost:5437
   数据库: milicard_dev
   用户: postgres
```

### 2. 字段权限配置
```
角色名称 | 资源 | 字段 | 可读 | 可写 | 创建时间
--------|------|------|------|------|----------
OPERATOR | stockConsumption | unitPricePerBox | ❌ | ❌ | 2026-01-28
```

- ✅ = 有权限
- ❌ = 无权限
- 红色行 = 不可读（权限限制生效）
- 绿色行 = 可读

### 3. 系统角色列表
显示所有可用的角色，方便你选择正确的角色名称。

### 4. 配置建议
提供字段权限配置的完整指南。

---

## 🔍 常见资源名称

| 资源名称 | 说明 | 页面路径 |
|---------|------|---------|
| `stockConsumption` | 库存消耗 | `/inventory-consumption` |
| `anchorProfit` | 主播利润 | `/anchor-profit` |
| `locationProfit` | 点位利润 | `/location-profit` |
| `purchaseOrder` | 采购订单 | `/procurement` |
| `arrivalOrder` | 到货单 | `/arrivals` |
| `transferOrder` | 调货单 | `/transfers` |
| `stockOut` | 出库单 | `/stock-out` |
| `point` | 点位 | `/points` |
| `goods` | 商品 | `/products` |

---

## 🔧 常见字段名称示例

### stockConsumption (库存消耗)
- `unitPricePerBox` - 单价/包
- `calculatedCostPrice` - 消耗金额
- `boxQuantity` - 消耗箱数
- `packQuantity` - 消耗盒数
- `pieceQuantity` - 消耗包数

### anchorProfit (主播利润)
- `gmvAmount` - 大屏GMV
- `salesAmount` - 真实GMV
- `profitAmount` - 毛利
- `profitRate` - 毛利率
- `adSpendAmount` - 投流金额

---

## ⚠️ 注意事项

1. **需要安装 PostgreSQL 客户端工具**
   - 脚本使用 `psql` 命令连接数据库
   - 如果没有安装，请先安装 PostgreSQL

2. **数据库连接配置**
   - 脚本会自动读取 `server\.env` 文件中的 `DATABASE_URL`
   - 确保 `.env` 文件存在且配置正确

3. **管理员角色**
   - `SUPER_ADMIN` 和 `ADMIN` 角色默认有所有权限
   - 字段权限配置对管理员不生效
   - 需要用普通角色（如 `OPERATOR`）测试

4. **权限配置后需要重新登录**
   - 修改权限后，用户需要重新登录才能生效
   - 或者清除浏览器缓存

---

## 🐛 故障排除

### 问题1: 找不到 psql 命令

**解决方案**：
```powershell
# 检查 PostgreSQL 是否安装
psql --version

# 如果未安装，下载并安装 PostgreSQL
# https://www.postgresql.org/download/windows/
```

### 问题2: 数据库连接失败

**解决方案**：
1. 检查 `server\.env` 文件是否存在
2. 检查 `DATABASE_URL` 配置是否正确
3. 检查数据库服务是否运行：
   ```powershell
   netstat -ano | findstr :5437
   ```

### 问题3: 没有找到权限配置

**解决方案**：
1. 前往 **系统管理 → 角色管理**
2. 编辑对应角色
3. 切换到 **字段权限** 标签
4. 配置对应资源的字段权限
5. 保存后重新运行脚本

---

## 📞 需要帮助？

如果遇到问题，请提供以下信息：

1. 脚本的完整输出
2. 你要检查的资源和字段名称
3. 当前用户的角色
4. 浏览器控制台的网络请求截图

这样我可以更快地帮你定位问题！
