/**
 * 字段过滤工具
 * 根据字段权限过滤响应数据
 */

export interface FieldPermissions {
  readable: string[];
  writable: string[];
}

/**
 * 过滤对象中不可读的字段
 */
export function filterReadableFields<T extends Record<string, any>>(
  data: T,
  permissions: FieldPermissions
): Partial<T> {
  // 如果允许所有字段，直接返回
  if (permissions.readable.includes('*')) {
    return data;
  }

  // 如果没有可读字段，返回空对象
  if (permissions.readable.length === 0) {
    return {};
  }

  const filtered: Partial<T> = {};
  for (const field of permissions.readable) {
    if (field in data) {
      filtered[field as keyof T] = data[field];
    }
  }

  // 始终保留 id 字段
  if ('id' in data) {
    filtered['id' as keyof T] = data['id'];
  }

  return filtered;
}

/**
 * 过滤数组中每个对象的不可读字段
 */
export function filterReadableFieldsArray<T extends Record<string, any>>(
  dataArray: T[],
  permissions: FieldPermissions
): Partial<T>[] {
  if (permissions.readable.includes('*')) {
    return dataArray;
  }

  return dataArray.map(item => filterReadableFields(item, permissions));
}

/**
 * 过滤请求数据中不可写的字段
 */
export function filterWritableFields<T extends Record<string, any>>(
  data: T,
  permissions: FieldPermissions
): Partial<T> {
  // 如果允许所有字段，直接返回
  if (permissions.writable.includes('*')) {
    return data;
  }

  // 如果没有可写字段，返回空对象
  if (permissions.writable.length === 0) {
    return {};
  }

  const filtered: Partial<T> = {};
  for (const field of permissions.writable) {
    if (field in data) {
      filtered[field as keyof T] = data[field];
    }
  }

  return filtered;
}

/**
 * 检查是否有权限访问指定字段
 */
export function canReadField(field: string, permissions: FieldPermissions): boolean {
  return permissions.readable.includes('*') || permissions.readable.includes(field);
}

/**
 * 检查是否有权限修改指定字段
 */
export function canWriteField(field: string, permissions: FieldPermissions): boolean {
  return permissions.writable.includes('*') || permissions.writable.includes(field);
}
