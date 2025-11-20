const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createTestPurchaseData() {
  try {
    console.log('🛒 创建测试采购数据...');
    
    // 创建供应商
    const suppliers = [
      {
        code: 'SUP001',
        name: '优质供应商A',
        contactPerson: '张经理',
        phone: '13800138001',
        email: 'zhang@supplier-a.com',
        address: '北京市朝阳区供应商街1号',
        isActive: true
      },
      {
        code: 'SUP002',
        name: '可靠供应商B',
        contactPerson: '李经理',
        phone: '13800138002',
        email: 'li@supplier-b.com',
        address: '上海市浦东新区供应商路2号',
        isActive: true
      }
    ];

    const createdSuppliers = [];
    for (const supplierData of suppliers) {
      // 检查是否已存在
      const existing = await prisma.supplier.findUnique({
        where: { code: supplierData.code }
      });

      if (existing) {
        console.log(`⚠️ 供应商 ${supplierData.code} 已存在，跳过创建`);
        createdSuppliers.push(existing);
        continue;
      }

      const supplier = await prisma.supplier.create({
        data: supplierData
      });

      console.log(`✅ 创建供应商成功: ${supplier.code} - ${supplier.name}`);
      createdSuppliers.push(supplier);
    }

    // 为每个基地创建供应商关系
    const bases = await prisma.base.findMany();
    
    for (const base of bases) {
      for (const supplier of createdSuppliers) {
        // 检查关系是否已存在
        const existingRelation = await prisma.supplierBase.findUnique({
          where: {
            supplierId_baseId: {
              supplierId: supplier.id,
              baseId: base.id
            }
          }
        });

        if (existingRelation) {
          console.log(`⚠️ 供应商基地关系已存在: ${supplier.name} - ${base.name}`);
          continue;
        }

        await prisma.supplierBase.create({
          data: {
            supplierId: supplier.id,
            baseId: base.id,
            isActive: true,
            paymentTerms: '月结30天',
            creditLimit: 100000.00
          }
        });

        console.log(`✅ 创建供应商基地关系: ${supplier.name} - ${base.name}`);
      }
    }

    // 创建采购订单
    const goods = await prisma.goods.findMany();
    const locations = await prisma.location.findMany();

    if (goods.length > 0 && locations.length > 0) {
      console.log('📋 创建测试采购订单...');

      for (const base of bases) {
        // 为每个基地创建一个采购订单
        const baseLocations = locations.filter(loc => loc.baseId === base.id);
        
        if (baseLocations.length > 0) {
          const targetLocation = baseLocations[0]; // 使用第一个位置
          const supplier = createdSuppliers[0]; // 使用第一个供应商

          const orderNo = `PO${base.id}${Date.now()}`;
          
          const purchaseOrder = await prisma.purchaseOrder.create({
            data: {
              orderNo: orderNo,
              supplierName: supplier.name,
              targetLocationId: targetLocation.id,
              baseId: base.id,
              purchaseDate: new Date(),
              totalAmount: 5000.00,
              notes: `测试采购订单 - ${base.name}`,
              createdBy: 'system'
            }
          });

          // 创建采购订单项目
          if (goods[0]) {
            await prisma.purchaseOrderItem.create({
              data: {
                purchaseOrderId: purchaseOrder.id,
                goodsId: goods[0].id,
                boxQuantity: 10,
                packQuantity: 50,
                pieceQuantity: 100,
                unitPrice: 50.00,
                totalPrice: 5000.00,
                notes: '测试采购项目'
              }
            });
          }

          console.log(`✅ 创建采购订单: ${orderNo} (${base.name})`);
        }
      }
    }

    // 查询统计
    const totalSuppliers = await prisma.supplier.count();
    const totalSupplierBases = await prisma.supplierBase.count();
    const totalPurchaseOrders = await prisma.purchaseOrder.count();

    console.log(`📊 统计结果:`);
    console.log(`  - 供应商总数: ${totalSuppliers}`);
    console.log(`  - 供应商基地关系: ${totalSupplierBases}`);
    console.log(`  - 采购订单总数: ${totalPurchaseOrders}`);

    console.log('🎉 测试采购数据创建完成！');

  } catch (error) {
    console.error('❌ 创建测试采购数据失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestPurchaseData();
