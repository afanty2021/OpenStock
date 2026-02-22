/**
 * A 股功能模块
 *
 * 提供 A 股市场专用功能：
 * - 代码格式标准化
 * - 市场类型检测
 * - 涨跌停检测
 * - 交易时间适配
 * @module data-sources/astock
 */

// 导出代码格式化工具
export {
  AStockCodeUtil,
  MarketType,
  EXCHANGE_SUFFIX,
} from './code-util';

// 导出涨跌停检测器
export {
  LimitDetector,
  type LimitStatus,
  type LimitPrediction,
} from './limit-detector';
