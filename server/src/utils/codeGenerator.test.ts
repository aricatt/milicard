import { CodeGenerator } from './codeGenerator';

/**
 * 编号生成器测试
 * 运行: npx ts-node src/utils/codeGenerator.test.ts
 */
async function testCodeGenerator() {
  console.log('🧪 编号生成器测试开始...\n');

  try {
    // 测试人员编号生成
    console.log('📋 测试人员编号生成:');
    const anchorCode = await CodeGenerator.generatePersonnelCode('ANCHOR');
    const keeperCode = await CodeGenerator.generatePersonnelCode('WAREHOUSE_KEEPER');
    console.log(`主播编号: ${anchorCode}`);
    console.log(`仓管编号: ${keeperCode}\n`);

    // 测试位置编号生成
    console.log('📍 测试位置编号生成:');
    const liveCode = await CodeGenerator.generateLocationCode('LIVE_ROOM');
    const warehouseCode = await CodeGenerator.generateLocationCode('WAREHOUSE');
    console.log(`直播间编号: ${liveCode}`);
    console.log(`仓库编号: ${warehouseCode}\n`);

    // 测试其他业务编号
    console.log('🏢 测试其他业务编号:');
    const baseCode = await CodeGenerator.generateBaseCode();
    const goodsCode = await CodeGenerator.generateGoodsCode();
    const customerCode = await CodeGenerator.generateCustomerCode();
    const supplierCode = await CodeGenerator.generateSupplierCode();
    console.log(`基地编号: ${baseCode}`);
    console.log(`商品编号: ${goodsCode}`);
    console.log(`客户编号: ${customerCode}`);
    console.log(`供应商编号: ${supplierCode}\n`);

    // 测试订单编号
    console.log('📦 测试订单编号:');
    const poCode = await CodeGenerator.generatePurchaseOrderCode();
    const doCode = await CodeGenerator.generateDistributionOrderCode();
    const toCode = await CodeGenerator.generateTransferOrderCode();
    console.log(`采购订单: ${poCode}`);
    console.log(`销售订单: ${doCode}`);
    console.log(`调拨订单: ${toCode}\n`);

    // 测试编号格式验证
    console.log('✅ 测试编号格式验证:');
    const isValidAnchor = CodeGenerator.validateCodeFormat(anchorCode, 'ANCHOR');
    const isValidKeeper = CodeGenerator.validateCodeFormat(keeperCode, 'WAREHOUSE_KEEPER');
    const isInvalidFormat = CodeGenerator.validateCodeFormat('INVALID-123', 'ANCHOR');
    console.log(`主播编号格式验证: ${isValidAnchor}`);
    console.log(`仓管编号格式验证: ${isValidKeeper}`);
    console.log(`无效格式验证: ${isInvalidFormat}\n`);

    // 测试类型提取
    console.log('🔍 测试类型提取:');
    const anchorType = CodeGenerator.extractTypeFromCode(anchorCode);
    const keeperType = CodeGenerator.extractTypeFromCode(keeperCode);
    console.log(`从 ${anchorCode} 提取类型: ${anchorType}`);
    console.log(`从 ${keeperCode} 提取类型: ${keeperType}\n`);

    // 测试批量生成
    console.log('🔢 测试批量生成 (3个主播编号):');
    const batchCodes = await CodeGenerator.generateBatchCodes('ANCHOR', 'personnel', 3);
    batchCodes.forEach((code, index) => {
      console.log(`批量编号 ${index + 1}: ${code}`);
    });

    console.log('\n✅ 所有测试完成！');

  } catch (error) {
    console.error('❌ 测试失败:', error);
  }
}

// 运行测试
if (require.main === module) {
  testCodeGenerator();
}
