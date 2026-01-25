// 投流记录数据类型
export interface AdsRecord {
  id: string;
  baseId: number;
  month: string;              // 格式: "2026-01"
  handlerId: string;
  handlerName: string;
  
  // 每日ADS投流金额（1-31号）
  day1Ads?: number;
  day2Ads?: number;
  day3Ads?: number;
  day4Ads?: number;
  day5Ads?: number;
  day6Ads?: number;
  day7Ads?: number;
  day8Ads?: number;
  day9Ads?: number;
  day10Ads?: number;
  day11Ads?: number;
  day12Ads?: number;
  day13Ads?: number;
  day14Ads?: number;
  day15Ads?: number;
  day16Ads?: number;
  day17Ads?: number;
  day18Ads?: number;
  day19Ads?: number;
  day20Ads?: number;
  day21Ads?: number;
  day22Ads?: number;
  day23Ads?: number;
  day24Ads?: number;
  day25Ads?: number;
  day26Ads?: number;
  day27Ads?: number;
  day28Ads?: number;
  day29Ads?: number;
  day30Ads?: number;
  day31Ads?: number;
  
  createdAt?: string;
  updatedAt?: string;
}

// 月度GMV-ADS统计数据（包含计算字段）
export interface MonthlyGmvAdsStats extends AdsRecord {
  // 每日GMV（从主播利润表读取）
  day1Gmv?: number;
  day2Gmv?: number;
  day3Gmv?: number;
  day4Gmv?: number;
  day5Gmv?: number;
  day6Gmv?: number;
  day7Gmv?: number;
  day8Gmv?: number;
  day9Gmv?: number;
  day10Gmv?: number;
  day11Gmv?: number;
  day12Gmv?: number;
  day13Gmv?: number;
  day14Gmv?: number;
  day15Gmv?: number;
  day16Gmv?: number;
  day17Gmv?: number;
  day18Gmv?: number;
  day19Gmv?: number;
  day20Gmv?: number;
  day21Gmv?: number;
  day22Gmv?: number;
  day23Gmv?: number;
  day24Gmv?: number;
  day25Gmv?: number;
  day26Gmv?: number;
  day27Gmv?: number;
  day28Gmv?: number;
  day29Gmv?: number;
  day30Gmv?: number;
  day31Gmv?: number;
  
  // 统计字段（根据选中日期动态计算）
  totalGmv: number;        // 累计GMV
  totalAds: number;        // 投流金额
  adsRatio: number;        // GMV占比 = 投流金额/累计GMV
  liveDays: number;        // 直播天数（GMV>0的天数）
  avgDailyGmv: number;     // 日均GMV = 累计GMV/直播天数
}

// 创建/更新投流记录请求
export interface CreateAdsRecordRequest {
  month: string;
  handlerId: string;
  handlerName?: string;
  [key: string]: any; // 支持 day1Ads, day2Ads, ... day31Ads
}

// 查询参数
export interface AdsRecordQueryParams {
  baseId: number;
  month: string;
  handlerIds?: string[];    // 主播ID列表（多选）
  selectedDates?: string[]; // 选中的日期列表（用于计算统计字段）
}

// 主播选项
export interface HandlerOption {
  id: string;
  name: string;
  code: string;
}
