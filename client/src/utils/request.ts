/**
 * 通用API请求工具
 * 自动添加认证头和错误处理
 */

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean>;
}

/**
 * 发送API请求
 * @param url 请求URL
 * @param options 请求选项
 * @returns Promise<Response>
 */
export async function request(url: string, options: RequestOptions = {}): Promise<Response> {
  const { params, ...fetchOptions } = options;
  
  // 构建URL参数
  let finalUrl = url;
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, String(value));
      }
    });
    const paramString = searchParams.toString();
    if (paramString) {
      finalUrl += (url.includes('?') ? '&' : '?') + paramString;
    }
  }

  // 获取认证token
  const token = localStorage.getItem('token');
  
  // 设置默认headers
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  // 合并传入的headers
  if (fetchOptions.headers) {
    Object.assign(headers, fetchOptions.headers);
  }
  
  // 添加认证头
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // 发送请求
  const response = await fetch(finalUrl, {
    ...fetchOptions,
    headers,
  });

  return response;
}

/**
 * 发送GET请求
 * @param url 请求URL
 * @param params 查询参数
 * @returns Promise<any>
 */
export async function get(url: string, params?: Record<string, string | number | boolean>): Promise<any> {
  const response = await request(url, { method: 'GET', params });
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return response.json();
}

/**
 * 发送POST请求
 * @param url 请求URL
 * @param data 请求数据
 * @returns Promise<any>
 */
export async function post(url: string, data?: any): Promise<any> {
  const response = await request(url, {
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
  });
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return response.json();
}

/**
 * 发送PUT请求
 * @param url 请求URL
 * @param data 请求数据
 * @returns Promise<any>
 */
export async function put(url: string, data?: any): Promise<any> {
  const response = await request(url, {
    method: 'PUT',
    body: data ? JSON.stringify(data) : undefined,
  });
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return response.json();
}

/**
 * 发送DELETE请求
 * @param url 请求URL
 * @returns Promise<any>
 */
export async function del(url: string): Promise<any> {
  const response = await request(url, { method: 'DELETE' });
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return response.json();
}

export default {
  request,
  get,
  post,
  put,
  delete: del,
};
