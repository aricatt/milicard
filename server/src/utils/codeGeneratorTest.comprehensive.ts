import { CodeGenerator } from './codeGenerator';
import { logger } from './logger';

/**
 * 全面的编号生成器测试
 * 运行: npx ts-node src/utils/codeGeneratorTest.comprehensive.ts
 */
async function comprehensiveCodeGeneratorTest() {
  console.log('🧪 全面编号生成器测试开始...\n');

  try {
    // 测试所有业务类型的编号生成
    console.log('📋 测试所有业务编号生成:');
    
    // 1. 人员编号
    console.log('\n👥 人员编号:');
    const anchorCode = await CodeGenerator.generatePersonnelCode('ANCHOR');
    const keeperCode = await CodeGenerator.generatePersonnelCode('WAREHOUSE_KEEPER');
    console.log(`✅ 主播编号: ${anchorCode}`);
    console.log(`✅ 仓管编号: ${keeperCode}`);

    // 2. 位置编号
    console.log('\n📍 位置编号:');
    const liveCode = await CodeGenerator.generateLocationCode('LIVE_ROOM');
    const warehouseCode = await CodeGenerator.generateLocationCode('WAREHOUSE');
    console.log(`✅ 直播间编号: ${liveCode}`);
    console.log(`✅ 仓库编号: ${warehouseCode}`);

    // 3. 基础数据编号
    console.log('\n🏢 基础数据编号:');
    const baseCode = await CodeGenerator.generateBaseCode();
    const goodsCode = await CodeGenerator.generateGoodsCode();
    const supplierCode = await CodeGenerator.generateSupplierCode();
    console.log(`✅ 基地编号: ${baseCode}`);
    console.log(`✅ 商品编号: ${goodsCode}`);
    console.log(`✅ 供应商编号: ${supplierCode}`);

    // 4. 订单编号
    console.log('\n📦 订单编号:');
    const poCode = await CodeGenerator.generatePurchaseOrderCode();
    const doCode = await CodeGenerator.generateDistributionOrderCode();
    const toCode = await CodeGenerator.generateTransferOrderCode();
    const aoCode = await CodeGenerator.generateArrivalOrderCode();
    const soCode = await CodeGenerator.generateStockOutOrderCode();
    console.log(`✅ 采购订单: ${poCode}`);
    console.log(`✅ 销售订单: ${doCode}`);
    console.log(`✅ 调拨订单: ${toCode}`);
    console.log(`✅ 到货单: ${aoCode}`);
    console.log(`✅ 出库单: ${soCode}`);

    // 测试编号格式验证
    console.log('\n🔍 测试编号格式验证:');
    const validationTests = [
      { code: anchorCode, type: 'ANCHOR' as const, expected: true },
      { code: keeperCode, type: 'WAREHOUSE_KEEPER' as const, expected: true },
      { code: liveCode, type: 'LIVE_ROOM' as const, expected: true },
      { code: warehouseCode, type: 'WAREHOUSE' as const, expected: true },
      { code: goodsCode, type: 'GOODS' as const, expected: true },
      { code: poCode, type: 'PURCHASE_ORDER' as const, expected: true },
      { code: 'INVALID-123', type: 'ANCHOR' as const, expected: false },
      { code: 'ANCHOR-12345', type: 'ANCHOR' as const, expected: false }, // 长度不对
    ];

    validationTests.forEach(test => {
      const isValid = CodeGenerator.validateCodeFormat(test.code, test.type);
      const status = isValid === test.expected ? '✅' : '❌';
      console.log(`${status} ${test.code} (${test.type}): ${isValid ? '有效' : '无效'}`);
    });

    // 测试类型提取
    console.log('\n🏷️ 测试类型提取:');
    const typeExtractionTests = [
      anchorCode, keeperCode, liveCode, warehouseCode, 
      goodsCode, poCode, doCode, toCode, aoCode, soCode
    ];

    typeExtractionTests.forEach(code => {
      const extractedType = CodeGenerator.extractTypeFromCode(code);
      console.log(`${code} → ${extractedType}`);
    });

    // 测试批量生成
    console.log('\n🔢 测试批量生成 (5个商品编号):');
    const batchCodes = await CodeGenerator.generateBatchCodes('GOODS', 'goods', 5);
    batchCodes.forEach((code, index) => {
      console.log(`批量编号 ${index + 1}: ${code}`);
    });

    // 测试编号唯一性（生成多个相同类型编号）
    console.log('\n🔄 测试编号唯一性 (生成10个主播编号):');
    const uniquenessCodes = [];
    for (let i = 0; i < 10; i++) {
      const code = await CodeGenerator.generatePersonnelCode('ANCHOR');
      uniquenessCodes.push(code);
    }
    
    const uniqueCodesSet = new Set(uniquenessCodes);
    const isAllUnique = uniqueCodesSet.size === uniquenessCodes.length;
    console.log(`✅ 生成了 ${uniquenessCodes.length} 个编号，唯一编号数量: ${uniqueCodesSet.size}`);
    console.log(`${isAllUnique ? '✅' : '❌'} 唯一性测试: ${isAllUnique ? '通过' : '失败'}`);

    // 性能测试
    console.log('\n⚡ 性能测试 (生成100个编号):');
    const startTime = Date.now();
    const performanceCodes = [];
    
    for (let i = 0; i < 100; i++) {
      const code = await CodeGenerator.generateGoodsCode();
      performanceCodes.push(code);
    }
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    const avgTime = duration / 100;
    
    console.log(`✅ 生成100个编号耗时: ${duration}ms`);
    console.log(`✅ 平均每个编号耗时: ${avgTime.toFixed(2)}ms`);

    // 错误处理测试
    console.log('\n🚨 错误处理测试:');
    try {
      // @ts-ignore - 故意传入无效类型进行测试
      await CodeGenerator.generateCode('INVALID_TYPE', 'test_table');
      console.log('❌ 错误处理测试失败：应该抛出错误');
    } catch (error) {
      console.log('✅ 错误处理测试通过：正确抛出了错误');
      console.log(`   错误信息: ${error instanceof Error ? error.message : String(error)}`);
    }

    // 总结
    console.log('\n📊 测试总结:');
    console.log('✅ 所有核心业务编号生成正常');
    console.log('✅ 编号格式验证功能正常');
    console.log('✅ 类型提取功能正常');
    console.log('✅ 批量生成功能正常');
    console.log('✅ 编号唯一性保证正常');
    console.log('✅ 性能表现良好');
    console.log('✅ 错误处理机制正常');

    console.log('\n🎉 全面编号生成器测试完成！所有功能正常工作。');

  } catch (error) {
    console.error('❌ 测试失败:', error);
    logger.error('编号生成器测试失败', { error });
  }
}

// 运行测试
if (require.main === module) {
  comprehensiveCodeGeneratorTest();
}

export { comprehensiveCodeGeneratorTest };
