module.exports = {
  // 测试环境
  testEnvironment: 'node',
  
  // TypeScript支持
  preset: 'ts-jest',
  
  // 测试文件匹配模式
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/?(*.)+(spec|test).ts'
  ],
  
  // 覆盖率收集
  collectCoverage: false,
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts',
    '!src/**/__tests__/**',
    '!src/**/*.test.ts'
  ],
  
  // 覆盖率报告
  coverageDirectory: 'coverage',
  coverageReporters: [
    'text',
    'lcov',
    'html'
  ],
  
  // 覆盖率阈值
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
  
  // 模块路径映射
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  
  // 设置文件
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
  
  // 测试超时
  testTimeout: 10000,
  
  // 清除模拟
  clearMocks: true,
  
  // 详细输出
  verbose: true,
  
  // 环境变量
  testEnvironmentOptions: {
    NODE_ENV: 'test'
  }
}
