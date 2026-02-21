/**
 * 多数据源聚合系统 - 配置和常量
 *
 * 定义数据源配置和常量
 * @module data-sources/config
 */

/**
 * 数据源配置
 */
export const SOURCE_CONFIG = {
  finnhub: {
    priority: 1, // 美股首选
    markets: ['US', 'GLOBAL'],
    capabilities: { quote: true, profile: true, news: true, financials: false },
    reliability: 95, // 历史成功率
  },
  tushare: {
    priority: 1, // A 股首选
    markets: ['CN', 'HK'],
    capabilities: { quote: true, profile: true, news: false, financials: true },
    reliability: 90,
  },
  alphaVantage: {
    priority: 2, // 备用源
    markets: ['US'],
    capabilities: { quote: true, profile: true, news: false, financials: true },
    reliability: 85,
  },
  yahooFinance: {
    priority: 1, // 港股首选，美股/A股备用
    markets: ['US', 'CN', 'HK', 'GLOBAL'],
    capabilities: { quote: true, profile: true, news: false, financials: true },
    reliability: 82, // 使用库，较稳定
  },
} as const;

/**
 * 系统配置
 */
export const SYSTEM_CONFIG = {
  // 缓存配置
  cache: {
    enabled: process.env.DATA_SOURCE_CACHE_ENABLED === 'true',
    defaultTTL: parseInt(process.env.DATA_SOURCE_CACHE_TTL || '60', 10),
  },
  
  // 超时配置
  timeout: parseInt(process.env.DATA_SOURCE_TIMEOUT || '5000', 10),
  
  // 监控配置
  telemetry: {
    enabled: process.env.DATA_SOURCE_TELEMETRY_ENABLED === 'true',
  },
} as const;

/**
 * A 股代码验证器
 * 用于精确判断和转换 A 股代码格式
 */
export class StockCodeValidator {
  // 上海：600xxx, 601xxx, 603xxx, 605xxx, 688xxx(科创板)
  private static readonly SH_PATTERN = /^6(0|1|3|5|8)\d{4}\.(SS|SH)$/i;

  // 深圳：000xxx, 001xxx, 002xxx, 003xxx, 300xxx(创业板), 301xxx
  private static readonly SZ_PATTERN = /^(0|3)\d{4}\.(SZ|se)$/i;

  // 港股：0xxx, 1xxx, 2xxx, 3xxx, 4xxx, 5xxx, 6xxx, 7xxx, 8xxx
  private static readonly HK_PATTERN = /^[0-8]\d{3,4}\.HK$/i;

  /**
   * 判断是否为 A 股代码
   */
  static isAStock(symbol: string): boolean {
    return this.SH_PATTERN.test(symbol) || this.SZ_PATTERN.test(symbol);
  }

  /**
   * 判断是否为港股代码
   */
  static isHKStock(symbol: string): boolean {
    return this.HK_PATTERN.test(symbol);
  }

  /**
   * Finnhub → Tushare 代码转换
   */
  static toTushareCode(symbol: string): string {
    if (symbol.endsWith('.SS')) return symbol.replace(/\.SS$/i, '.SH');
    if (symbol.endsWith('.se')) return symbol.replace(/\.se$/i, '.SZ');
    return symbol.toUpperCase();
  }

  /**
   * Tushare → Finnhub 代码转换
   */
  static toFinnhubCode(symbol: string): string {
    if (symbol.endsWith('.SH')) return symbol.replace(/\.SH$/i, '.SS');
    if (symbol.endsWith('.SZ')) return symbol.replace(/\.SZ$/i, '.se');
    return symbol;
  }
}
