/**
 * 测试认证流程
 */

const fetch = require('node-fetch');

async function testAuthFlow() {
  console.log('🔐 测试认证流程...\n');
  
  // 1. 测试健康检查
  try {
    console.log('1. 测试健康检查...');
    const healthResponse = await fetch('http://localhost:6801/health');
    const healthData = await healthResponse.json();
    console.log('✅ 健康检查成功:', healthData.status);
  } catch (error) {
    console.log('❌ 健康检查失败:', error.message);
    return;
  }
  
  // 2. 测试开发token端点
  try {
    console.log('\n2. 测试开发token端点...');
    const tokenResponse = await fetch('http://localhost:6801/api/v1/dev/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'developer'
      })
    });
    
    console.log('状态码:', tokenResponse.status);
    
    if (tokenResponse.ok) {
      const tokenData = await tokenResponse.json();
      console.log('✅ 开发token获取成功');
      console.log('Token存在:', !!tokenData.data?.token);
      
      // 3. 使用token测试人员API
      if (tokenData.data?.token) {
        console.log('\n3. 使用token测试人员API...');
        const personnelResponse = await fetch('http://localhost:6801/api/v1/bases/1/personnel', {
          headers: {
            'Authorization': `Bearer ${tokenData.data.token}`,
            'Content-Type': 'application/json',
          },
        });
        
        console.log('人员API状态码:', personnelResponse.status);
        
        if (personnelResponse.ok) {
          const personnelData = await personnelResponse.json();
          console.log('✅ 人员API调用成功');
          console.log('返回数据类型:', typeof personnelData);
        } else {
          const errorData = await personnelResponse.json();
          console.log('❌ 人员API调用失败:', errorData);
        }
      }
    } else {
      const errorData = await tokenResponse.json();
      console.log('❌ 开发token获取失败:', errorData);
    }
  } catch (error) {
    console.log('❌ 开发token测试失败:', error.message);
  }
  
  console.log('\n🎯 认证流程测试完成！');
}

// 运行测试
testAuthFlow().catch(console.error);
