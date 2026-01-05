const fs = require('fs');
const config = require('./config');

/**
 * 检测文件编码
 */
function detectEncoding() {
  console.log('检测 CSV 文件编码...\n');

  const files = [
    { name: 'SKU.CSV', path: config.csvPaths.sku },
    { name: '调货.CSV', path: config.csvPaths.transfers },
  ];

  for (const file of files) {
    console.log(`文件: ${file.name}`);
    
    // 读取文件的前 100 字节
    const buffer = fs.readFileSync(file.path);
    const first100 = buffer.slice(0, 100);
    
    console.log('前 100 字节 (hex):');
    console.log(first100.toString('hex'));
    console.log('\n尝试不同编码解析:');
    
    // 尝试不同编码
    const encodings = ['utf-8', 'gbk', 'gb2312', 'gb18030', 'big5'];
    
    encodings.forEach(encoding => {
      try {
        // Node.js 原生不支持 GBK，需要使用 iconv-lite
        console.log(`\n${encoding}:`);
        if (encoding === 'utf-8') {
          console.log(buffer.slice(0, 200).toString('utf-8'));
        } else {
          console.log('(需要 iconv-lite 库支持)');
        }
      } catch (error) {
        console.log(`  解析失败: ${error.message}`);
      }
    });
    
    console.log('\n' + '='.repeat(60) + '\n');
  }
}

detectEncoding();
