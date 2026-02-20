/**
 * 多数据源聚合系统 - 主入口
 *
 * 导出所有类型、接口和数据源实现
 * @module data-sources
 */

// 类型导出
export type {
  StockDataSource,
  DataSourceCapabilities,
  DataSourceResult,
  QualityScore,
  QuoteData,
  ProfileData,
  FinancialData,
  SearchResult,
} from './types';

// 数据源类导出
export { BaseDataSource } from './base';
export { FinnhubSource } from './sources/finnhub';
export { TushareSource } from './sources/tushare';
export { AlphaVantageSource } from './sources/alpha-vantage';

// 配置导出
export { SOURCE_CONFIG, SYSTEM_CONFIG, StockCodeValidator } from './config';

// 缓存管理器导出
export { CacheManager } from './cache';

// 错误处理导出
export { ErrorType, DataSourceError } from './error-handler';
