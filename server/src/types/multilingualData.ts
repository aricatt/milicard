// 多语言业务数据类型定义

export interface MultilingualText {
  zh_CN: string    // 中文（必填，作为默认语言）
  en_US?: string   // 英文
  vi_VN?: string   // 越南文
  th_TH?: string   // 泰文
  ja_JP?: string   // 日语
  ko_KR?: string   // 韩语
  id_ID?: string   // 印尼语
  ms_MY?: string   // 马来语
}

// 商品多语言数据结构
export interface MultilingualGoods {
  id: string
  code: string
  
  // 多语言字段
  name: MultilingualText
  description: MultilingualText
  
  // 非多语言字段
  retailPrice: number
  purchasePrice: number
  boxQuantity: number
  // ...其他字段
}

// 客户多语言数据结构
export interface MultilingualCustomer {
  id: string
  
  // 多语言字段
  name: MultilingualText
  address?: MultilingualText
  
  // 非多语言字段
  phone: string
  email: string
  // ...其他字段
}

// 地点多语言数据结构
export interface MultilingualLocation {
  id: string
  type: 'WAREHOUSE' | 'LIVE_ROOM'
  
  // 多语言字段
  name: MultilingualText
  description?: MultilingualText
  
  // 非多语言字段
  contactPerson: string
  contactPhone: string
  // ...其他字段
}
