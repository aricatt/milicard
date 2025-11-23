/**
 * 快速测试后端API连接性
 */

const fetch = require('node-fetch');

async function testAPI() {
  console.log('🔍 测试后端API连接...\n');
  
  // 测试健康检查
  try {
    console.log('1. 测试健康检查端点...');
    const healthResponse = await fetch('http://localhost:6801/health');
    const healthData = await healthResponse.json();
    console.log('✅ 健康检查成功:', healthData);
  } catch (error) {
    console.log('❌ 健康检查失败:', error.message);
    return;
  }
  
  // 测试人员API（无认证）
  try {
    console.log('\n2. 测试人员API（无认证）...');
    const personnelResponse = await fetch('http://localhost:6801/api/v1/bases/1/personnel');
    console.log('状态码:', personnelResponse.status);
    
    if (personnelResponse.status === 401) {
      console.log('✅ 认证中间件正常工作（返回401）');
    } else {
      const data = await personnelResponse.json();
      console.log('响应数据:', data);
    }
  } catch (error) {
    console.log('❌ 人员API测试失败:', error.message);
  }
  
  // 测试人员API（带模拟认证）
  try {
    console.log('\n3. 测试人员API（带模拟认证）...');
    
    // 创建模拟JWT token
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64');
    const payload = Buffer.from(JSON.stringify({
      userId: 'test-user-id',
      username: 'admin',
      email: 'admin@example.com',
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24小时后过期
      iat: Math.floor(Date.now() / 1000),
    })).toString('base64');
    const signature = Buffer.from('mock-signature').toString('base64');
    const mockToken = `${header}.${payload}.${signature}`;
    
    const authResponse = await fetch('http://localhost:6801/api/v1/bases/1/personnel', {
      headers: {
        'Authorization': `Bearer ${mockToken}`,
        'Content-Type': 'application/json',
      },
    });
    
    console.log('状态码:', authResponse.status);
    const authData = await authResponse.json();
    console.log('响应数据:', authData);
    
    if (authResponse.status === 200) {
      console.log('✅ 带认证的API调用成功');
    } else {
      console.log('⚠️ 带认证的API调用失败，可能需要有效的JWT签名');
    }
  } catch (error) {
    console.log('❌ 带认证的API测试失败:', error.message);
  }
  
  console.log('\n🎯 测试完成！');
}

// 运行测试
testAPI().catch(console.error);
