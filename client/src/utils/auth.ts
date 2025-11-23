/**
 * 认证相关工具函数
 */

export interface User {
  id: string;
  username: string;
  email: string;
  displayName: string;
  roles: string[];
  isActive: boolean;
}

/**
 * 获取本地存储的token
 */
export function getToken(): string | null {
  return localStorage.getItem('token');
}

/**
 * 设置token到本地存储
 */
export function setToken(token: string): void {
  localStorage.setItem('token', token);
}

/**
 * 移除本地存储的token
 */
export function removeToken(): void {
  localStorage.removeItem('token');
}

/**
 * 检查是否已登录（有有效token）
 */
export function isAuthenticated(): boolean {
  const token = getToken();
  if (!token) return false;
  
  try {
    // 简单检查token格式（JWT通常有3个部分）
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    
    // 检查token是否过期（如果能解析的话）
    const payload = JSON.parse(atob(parts[1]));
    const now = Math.floor(Date.now() / 1000);
    
    return payload.exp > now;
  } catch (error) {
    console.warn('Token validation failed:', error);
    return false;
  }
}

/**
 * 获取当前用户信息（从token中解析）
 */
export function getCurrentUser(): User | null {
  const token = getToken();
  if (!token || !isAuthenticated()) return null;
  
  try {
    const parts = token.split('.');
    const payload = JSON.parse(atob(parts[1]));
    
    return {
      id: payload.userId || payload.sub,
      username: payload.username,
      email: payload.email || '',
      displayName: payload.displayName || payload.username,
      roles: payload.roles || [],
      isActive: payload.isActive !== false,
    };
  } catch (error) {
    console.warn('Failed to parse user from token:', error);
    return null;
  }
}

/**
 * 登出（清除本地存储）
 */
export function logout(): void {
  removeToken();
  // 可以在这里添加其他清理逻辑
}

/**
 * 安全的Base64编码函数，支持Unicode字符
 */
function safeBase64Encode(str: string): string {
  try {
    // 使用encodeURIComponent和btoa来处理Unicode字符
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (match, p1) => {
      return String.fromCharCode(parseInt(p1, 16));
    }));
  } catch (error) {
    console.warn('Base64编码失败，使用简单编码:', error);
    // 如果还是失败，使用简单的ASCII字符
    return btoa(JSON.stringify({
      userId: 'mock-user-id',
      username: 'admin',
      email: 'admin@example.com',
      displayName: 'Administrator',
      roles: ['ADMIN', 'USER'],
      isActive: true,
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60),
      iat: Math.floor(Date.now() / 1000),
    }));
  }
}

/**
 * 创建一个开发环境用的token
 * 注意：这只是为了前端开发测试，实际应该通过登录API获取真实token
 */
export function createMockToken(): string {
  // 在开发环境下，我们可以使用一个预设的有效token
  // 这个token应该与后端的JWT_SECRET匹配
  
  // 如果后端提供了开发环境的测试token端点，我们应该调用它
  // 现在我们先返回一个标识，让后端知道这是开发环境请求
  
  const header = btoa(JSON.stringify({ 
    alg: 'HS256', 
    typ: 'JWT' 
  }));
  
  const payload = safeBase64Encode(JSON.stringify({
    userId: 'dev-user-001',
    username: 'developer',
    email: 'dev@example.com',
    displayName: 'Developer',
    roles: ['ADMIN', 'USER'],
    isActive: true,
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24小时后过期
    iat: Math.floor(Date.now() / 1000),
    iss: 'milicard-api',
    aud: 'milicard-client',
    // 添加开发环境标识
    dev: true
  }));
  
  // 使用开发环境的签名（这个签名不会被后端验证通过）
  const signature = btoa('dev-signature');
  
  return `${header}.${payload}.${signature}`;
}

/**
 * 尝试从后端获取开发环境token
 */
export async function getDevToken(): Promise<string | null> {
  try {
    // 尝试调用后端的开发token端点
    const response = await fetch('/api/v1/dev/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'developer'
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.success && data.data?.token) {
        console.log('成功获取开发环境token');
        return data.data.token;
      }
    } else {
      console.warn('开发token端点返回错误:', response.status, response.statusText);
    }
  } catch (error) {
    console.warn('无法获取开发token:', error);
  }
  
  return null;
}

export default {
  getToken,
  setToken,
  removeToken,
  isAuthenticated,
  getCurrentUser,
  logout,
  createMockToken,
};
