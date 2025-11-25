/**
 * 统计区域优化代码生成器
 * 
 * 使用方法：
 * node scripts/optimize-stats-template.js <page-name>
 * 
 * 示例：
 * node scripts/optimize-stats-template.js procurement
 */

const fs = require('fs');
const path = require('path');

// 页面配置
const pageConfigs = {
  procurement: {
    title: '采购订单',
    stats: [
      { label: '总订单数', field: 'totalOrders', color: '#1890ff', icon: 'ShoppingOutlined' },
      { label: '待审核', field: 'pendingOrders', color: '#faad14', icon: 'ClockCircleOutlined' },
      { label: '已完成', field: 'completedOrders', color: '#52c41a', icon: 'CheckCircleOutlined' },
      { label: '已取消', field: 'cancelledOrders', color: '#999', icon: 'CloseCircleOutlined' },
    ],
  },
  sales: {
    title: '销售订单',
    stats: [
      { label: '总订单数', field: 'totalOrders', color: '#1890ff', icon: 'ShoppingCartOutlined' },
      { label: '待发货', field: 'toShipOrders', color: '#faad14', icon: 'ClockCircleOutlined' },
      { label: '已发货', field: 'shippedOrders', color: '#1890ff', icon: 'CarOutlined' },
      { label: '已完成', field: 'completedOrders', color: '#52c41a', icon: 'CheckCircleOutlined' },
    ],
  },
  inventory: {
    title: '库存',
    stats: [
      { label: '总库存', field: 'totalStock', color: '#1890ff', icon: 'DatabaseOutlined' },
      { label: '正常', field: 'normalStock', color: '#52c41a', icon: 'CheckCircleOutlined' },
      { label: '预警', field: 'warningStock', color: '#faad14', icon: 'WarningOutlined' },
      { label: '缺货', field: 'outOfStock', color: '#ff4d4f', icon: 'ExclamationCircleOutlined' },
    ],
  },
  arrivals: {
    title: '到货单',
    stats: [
      { label: '总到货单', field: 'totalArrivals', color: '#1890ff', icon: 'InboxOutlined' },
      { label: '待确认', field: 'pendingArrivals', color: '#faad14', icon: 'ClockCircleOutlined' },
      { label: '已完成', field: 'completedArrivals', color: '#52c41a', icon: 'CheckCircleOutlined' },
    ],
  },
  transfers: {
    title: '调货单',
    stats: [
      { label: '总调货单', field: 'totalTransfers', color: '#1890ff', icon: 'SwapOutlined' },
      { label: '待审核', field: 'pendingTransfers', color: '#faad14', icon: 'ClockCircleOutlined' },
      { label: '进行中', field: 'inProgressTransfers', color: '#1890ff', icon: 'SyncOutlined' },
      { label: '已完成', field: 'completedTransfers', color: '#52c41a', icon: 'CheckCircleOutlined' },
    ],
  },
  'inventory-consumption': {
    title: '消耗记录',
    stats: [
      { label: '总记录数', field: 'totalRecords', color: '#1890ff', icon: 'FileTextOutlined' },
      { label: '本月消耗', field: 'monthlyConsumption', color: '#722ed1', icon: 'CalendarOutlined' },
      { label: '总数量', field: 'totalQuantity', color: '#52c41a', icon: 'NumberOutlined' },
    ],
  },
  personnel: {
    title: '人员',
    stats: [
      { label: '总人数', field: 'totalPersonnel', color: '#1890ff', icon: 'TeamOutlined' },
      { label: '主播', field: 'anchors', color: '#52c41a', icon: 'VideoCameraOutlined' },
      { label: '仓管', field: 'keepers', color: '#1890ff', icon: 'SafetyOutlined' },
      { label: '在职', field: 'activePersonnel', color: '#52c41a', icon: 'CheckCircleOutlined' },
    ],
  },
  suppliers: {
    title: '供应商',
    stats: [
      { label: '总供应商', field: 'totalSuppliers', color: '#1890ff', icon: 'ShopOutlined' },
      { label: '活跃供应商', field: 'activeSuppliers', color: '#52c41a', icon: 'CheckCircleOutlined' },
      { label: '合作中', field: 'cooperatingSuppliers', color: '#1890ff', icon: 'HandshakeOutlined' },
    ],
  },
};

function generateStatsContent(config) {
  const totalField = config.stats[0].field;
  
  const items = config.stats.map(stat => `
                    <Descriptions.Item label="${stat.label}">
                      <Space>
                        ${stat.icon ? `<${stat.icon} style={{ color: '${stat.color}' }} />` : ''}
                        <span style={{ color: '${stat.color}', fontWeight: 'bold' }}>{stats.${stat.field}}</span>
                        ${stat.field !== totalField ? `<span style={{ color: '#999' }}>({stats.${totalField} > 0 ? ((stats.${stat.field} / stats.${totalField}) * 100).toFixed(1) : 0}%)</span>` : ''}
                      </Space>
                    </Descriptions.Item>`).join('');

  return `
  // 统计详情弹出内容
  const statsContent = (
    <div style={{ width: 300 }}>
      <Descriptions column={1} size="small" bordered>${items}
      </Descriptions>
    </div>
  );`;
}

function generateCardTitle(config) {
  const totalField = config.stats[0].field;
  
  return `
        title={
          <Space>
            <span>${config.title}列表</span>
            <span style={{ color: '#999', fontSize: 14, fontWeight: 'normal' }}>
              (共 {stats.${totalField}} 个)
            </span>
            <Popover
              content={statsContent}
              title="统计详情"
              trigger="click"
              placement="bottomLeft"
            >
              <Button
                type="text"
                size="small"
                icon={<InfoCircleOutlined />}
                style={{ color: '#1890ff' }}
              >
                详情
              </Button>
            </Popover>
          </Space>
        }`;
}

function generateImports(config) {
  const icons = [...new Set(config.stats.map(s => s.icon).filter(Boolean))];
  return `
// 添加到现有 imports
import { Popover, Descriptions } from 'antd';
import { InfoCircleOutlined${icons.length > 0 ? ', ' + icons.join(', ') : ''} } from '@ant-design/icons';
`;
}

function main() {
  const pageName = process.argv[2];
  
  if (!pageName || !pageConfigs[pageName]) {
    console.log('使用方法: node scripts/optimize-stats-template.js <page-name>');
    console.log('可用页面:', Object.keys(pageConfigs).join(', '));
    return;
  }

  const config = pageConfigs[pageName];
  
  console.log('='.repeat(60));
  console.log(`${config.title}页面优化代码`);
  console.log('='.repeat(60));
  
  console.log('\n1. 添加导入：');
  console.log(generateImports(config));
  
  console.log('\n2. 在组件内添加统计内容：');
  console.log(generateStatsContent(config));
  
  console.log('\n3. 修改 Card 的 title 属性：');
  console.log(generateCardTitle(config));
  
  console.log('\n4. 删除旧的统计卡片：');
  console.log(`
  // 删除这部分代码：
  <Row gutter={16} style={{ marginBottom: 16 }}>
    <Col span={6}>
      <Card><Statistic ... /></Card>
    </Col>
    {/* ... 更多统计卡片 */}
  </Row>
  `);
  
  console.log('\n='.repeat(60));
  console.log('优化完成！');
  console.log('='.repeat(60));
}

main();
