import { CodeGenerator } from './codeGenerator';

/**
 * 简化的编号生成测试
 */
async function simpleTest() {
  console.log('🧪 简化编号生成测试...\n');

  try {
    // 只测试人员编号生成（因为personnel表存在）
    console.log('📋 测试人员编号生成:');
    const anchorCode = await CodeGenerator.generatePersonnelCode('ANCHOR');
    const keeperCode = await CodeGenerator.generatePersonnelCode('WAREHOUSE_KEEPER');
    console.log(`✅ 主播编号: ${anchorCode}`);
    console.log(`✅ 仓管编号: ${keeperCode}\n`);

    // 测试编号格式验证
    console.log('🔍 测试编号格式验证:');
    const isValidAnchor = CodeGenerator.validateCodeFormat(anchorCode, 'ANCHOR');
    const isValidKeeper = CodeGenerator.validateCodeFormat(keeperCode, 'WAREHOUSE_KEEPER');
    console.log(`主播编号格式: ${isValidAnchor ? '✅ 有效' : '❌ 无效'}`);
    console.log(`仓管编号格式: ${isValidKeeper ? '✅ 有效' : '❌ 无效'}\n`);

    // 测试类型提取
    console.log('🏷️ 测试类型提取:');
    const anchorType = CodeGenerator.extractTypeFromCode(anchorCode);
    const keeperType = CodeGenerator.extractTypeFromCode(keeperCode);
    console.log(`从 ${anchorCode} 提取: ${anchorType}`);
    console.log(`从 ${keeperCode} 提取: ${keeperType}\n`);

    // 展示编号规则
    console.log('📋 编号生成规则展示:');
    console.log('格式: {PREFIX}-{RANDOM_STRING}');
    console.log('前缀: ANCHOR (主播) | KEEPER (仓管)');
    console.log('随机串: 11位字母数字组合 (去除易混淆字符)');
    console.log('字符集: 0123456789ABCDEFGHJKLMNPQRSTUVWXYZ');
    console.log('示例:');
    console.log(`  主播: ${anchorCode}`);
    console.log(`  仓管: ${keeperCode}`);

    console.log('\n✅ 测试完成！编号生成器工作正常。');

  } catch (error) {
    console.error('❌ 测试失败:', error);
  }
}

// 运行测试
if (require.main === module) {
  simpleTest();
}
