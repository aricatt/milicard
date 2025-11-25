# 统计区域优化 - 快速上手指南

## 🎯 一句话总结

**将占用 120px 的统计卡片改为标题集成，节省 100% 空间，信息更丰富！**

---

## 📸 效果对比

### 优化前（占空间）
```
┌─────────────────────────────────────────┐
│ ┌────┬────┬────┬────┐                  │
│ │ 45 │ 30 │ 15 │ 42 │  ← 120px 高度   │
│ └────┴────┴────┴────┘                  │
├─────────────────────────────────────────┤
│ 表格内容...                             │
```

### 优化后（节省空间）
```
┌─────────────────────────────────────────┐
│ 列表 (共 45 个) [ℹ️ 详情]   [新建] ⚙️ │
├─────────────────────────────────────────┤
│ 表格内容...  ← 直接开始，多显示 3-4 行  │
```

---

## 🚀 5 分钟快速迁移

### 步骤 1：导入组件（10 秒）

```tsx
import TableStatsPopover from '@/components/TableStatsPopover';
import { DatabaseOutlined, DesktopOutlined } from '@ant-design/icons';
```

### 步骤 2：准备统计项（1 分钟）

```tsx
// 你的统计数据
const [stats, setStats] = useState({
  total: 0,
  category1: 0,
  category2: 0,
  active: 0,
});

// 配置统计项
const statsItems = [
  {
    label: '分类1',
    value: stats.category1,
    color: '#1890ff',
    icon: <DatabaseOutlined />,
  },
  {
    label: '分类2',
    value: stats.category2,
    color: '#52c41a',
    icon: <DesktopOutlined />,
  },
  {
    label: '启用中',
    value: stats.active,
    color: '#52c41a',
  },
];
```

### 步骤 3：替换 headerTitle（30 秒）

```tsx
<ProTable
  headerTitle={
    <TableStatsPopover
      total={stats.total}
      title="数据列表"
      items={statsItems}
    />
  }
  // ... 其他配置
/>
```

### 步骤 4：删除旧卡片（30 秒）

```tsx
// 删除这部分代码 ❌
<Row gutter={16} style={{ marginBottom: 16 }}>
  <Col span={6}>
    <Card>
      <Statistic title="总数" value={stats.total} />
    </Card>
  </Col>
  {/* ... 更多卡片 */}
</Row>
```

### 步骤 5：测试（2 分钟）

- ✅ 刷新页面
- ✅ 查看标题显示
- ✅ 点击"详情"按钮
- ✅ 验证统计数据

---

## 💡 常用配置

### 基础配置（最简单）

```tsx
<TableStatsPopover
  total={100}
  title="商品列表"
  items={[
    { label: '在售', value: 80 },
    { label: '下架', value: 20 },
  ]}
/>
```

### 完整配置（推荐）

```tsx
<TableStatsPopover
  total={stats.total}
  title="位置列表"
  popoverTitle="统计详情"
  popoverWidth={300}
  placement="bottomLeft"
  items={[
    {
      label: '仓库',
      value: stats.warehouses,
      color: '#1890ff',
      icon: <DatabaseOutlined />,
      showPercentage: true,
    },
    {
      label: '直播间',
      value: stats.liveRooms,
      color: '#52c41a',
      icon: <DesktopOutlined />,
      showPercentage: true,
    },
  ]}
/>
```

---

## 📋 各页面推荐配置

### 1. 商品管理

```tsx
const statsItems = [
  { label: '在售', value: stats.onSale, color: '#52c41a' },
  { label: '下架', value: stats.offShelf, color: '#999' },
  { label: '缺货', value: stats.outOfStock, color: '#ff4d4f' },
];
```

### 2. 采购管理

```tsx
const statsItems = [
  { label: '待审核', value: stats.pending, color: '#faad14' },
  { label: '已完成', value: stats.completed, color: '#52c41a' },
  { label: '已取消', value: stats.cancelled, color: '#999' },
];
```

### 3. 销售管理

```tsx
const statsItems = [
  { label: '待发货', value: stats.toShip, color: '#1890ff' },
  { label: '已发货', value: stats.shipped, color: '#52c41a' },
  { label: '已完成', value: stats.completed, color: '#52c41a' },
];
```

### 4. 库存管理

```tsx
const statsItems = [
  { label: '正常', value: stats.normal, color: '#52c41a' },
  { label: '预警', value: stats.warning, color: '#faad14' },
  { label: '缺货', value: stats.outOfStock, color: '#ff4d4f' },
];
```

---

## 🎨 颜色速查

| 颜色 | 代码 | 用途 |
|------|------|------|
| 🔵 蓝色 | `#1890ff` | 主要分类、进行中 |
| 🟢 绿色 | `#52c41a` | 成功、启用、完成 |
| 🟡 橙色 | `#faad14` | 警告、待处理 |
| 🔴 红色 | `#ff4d4f` | 错误、禁用、缺货 |
| ⚪ 灰色 | `#999` | 次要信息、已取消 |

---

## ⚠️ 注意事项

### ✅ 推荐做法

```tsx
// 1. 总数 > 0 时才显示百分比
{total > 0 ? ((value / total) * 100).toFixed(1) : 0}%

// 2. 使用 useMemo 优化性能
const statsItems = useMemo(() => [
  { label: '分类1', value: stats.category1 },
], [stats]);

// 3. 统计项不要太多（3-5 个最佳）
```

### ❌ 避免做法

```tsx
// 1. 不要硬编码数据
items={[{ label: '仓库', value: 30 }]}  // ❌

// 2. 不要忘记处理 0 的情况
{(value / total) * 100}  // ❌ 可能除以 0

// 3. 不要添加太多统计项
items={[...10个统计项]}  // ❌ 太多了
```

---

## 🐛 常见问题

### Q: 统计数据不更新？
```tsx
// 确保在数据加载后更新 stats
useEffect(() => {
  if (data) {
    calculateStats(data);
  }
}, [data]);
```

### Q: 百分比显示 NaN？
```tsx
// 添加 total > 0 判断
{total > 0 ? ((value / total) * 100).toFixed(1) : 0}%
```

### Q: 弹出框被遮挡？
```tsx
// 调整 placement
<TableStatsPopover placement="bottomRight" />
```

---

## 📚 完整文档

详细文档请查看：`FEATURE_TABLE_STATS_OPTIMIZATION.md`

---

## ✅ 迁移检查清单

- [ ] 导入 TableStatsPopover 组件
- [ ] 准备统计数据和配置项
- [ ] 替换 ProTable 的 headerTitle
- [ ] 删除旧的统计卡片代码
- [ ] 测试功能正常
- [ ] 验证数据准确
- [ ] 检查响应式布局

---

**5 分钟完成迁移，节省 100% 空间！** 🚀
