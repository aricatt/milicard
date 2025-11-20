const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createTestSalesData() {
  try {
    console.log('💰 创建测试销售数据...');
    
    // 创建客户
    const customers = [
      {
        name: '优质客户A',
        contactPerson: '王总',
        phone: '13900139001',
        email: 'wang@customer-a.com',
        address: '北京市海淀区客户街1号',
        baseId: 1, // 基地1的客户
        isActive: true
      },
      {
        name: '重要客户B',
        contactPerson: '李总',
        phone: '13900139002',
        email: 'li@customer-b.com',
        address: '上海市徐汇区客户路2号',
        baseId: 2, // 基地2的客户
        isActive: true
      },
      {
        name: '全国客户C',
        contactPerson: '张总',
        phone: '13900139003',
        email: 'zhang@customer-c.com',
        address: '广州市天河区客户大道3号',
        baseId: null, // 全局客户
        isActive: true
      }
    ];

    const createdCustomers = [];
    for (const customerData of customers) {
      // 检查是否已存在
      const existing = await prisma.customer.findFirst({
        where: { name: customerData.name }
      });

      if (existing) {
        console.log(`⚠️ 客户 ${customerData.name} 已存在，跳过创建`);
        createdCustomers.push(existing);
        continue;
      }

      const customer = await prisma.customer.create({
        data: customerData
      });

      console.log(`✅ 创建客户成功: ${customer.name} (${customerData.baseId ? `基地${customerData.baseId}` : '全局客户'})`);
      createdCustomers.push(customer);
    }

    // 创建销售订单（分销订单）
    console.log('📋 创建测试销售订单...');

    const bases = await prisma.base.findMany();
    
    for (const base of bases) {
      // 为每个基地创建一个销售订单
      const baseCustomers = createdCustomers.filter(c => c.baseId === base.id || c.baseId === null);
      
      if (baseCustomers.length > 0) {
        const customer = baseCustomers[0]; // 使用第一个客户
        const orderNo = `DO${base.id}${Date.now()}`;
        
        const distributionOrder = await prisma.distributionOrder.create({
          data: {
            orderNo: orderNo,
            customerId: customer.id,
            orderDate: new Date(),
            totalAmount: 3000.00,
            notes: `测试销售订单 - ${base.name}`,
            createdBy: 'system'
          }
        });

        // 创建销售订单项目
        const goods = await prisma.goods.findMany();
        if (goods[0]) {
          await prisma.distributionOrderItem.create({
            data: {
              distributionOrderId: distributionOrder.id,
              goodsId: goods[0].id,
              boxQuantity: 5,
              packQuantity: 25,
              pieceQuantity: 50,
              unitPrice: 60.00,
              totalPrice: 3000.00,
              notes: '测试销售项目'
            }
          });
        }

        console.log(`✅ 创建销售订单: ${orderNo} (${base.name} - ${customer.name})`);
      }
    }

    // 查询统计
    const totalCustomers = await prisma.customer.count();
    const totalDistributionOrders = await prisma.distributionOrder.count();

    console.log(`📊 统计结果:`);
    console.log(`  - 客户总数: ${totalCustomers}`);
    console.log(`  - 销售订单总数: ${totalDistributionOrders}`);

    console.log('🎉 测试销售数据创建完成！');

  } catch (error) {
    console.error('❌ 创建测试销售数据失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestSalesData();
