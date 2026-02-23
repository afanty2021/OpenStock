/**
 * A 股功能模块
 *
 * 提供 A 股市场专用功能：
 * - 代码格式标准化
 * - 市场类型检测
 * - 涨跌停检测
 * - 交易时间适配
 * - 交易时段感知调度
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

// 导出交易日历管理
export {
  TradingCalendar,
  type TradingStatusCode,
  type TradingStatus,
  type TradingSession,
} from './trading-calendar';

// 导出交易时段感知调度器
export { TradingAwareScheduler } from './trading-aware-scheduler';

// 导出龙虎榜查看器
export {
  TopListViewer,
  type TopListItem,
} from './top-list-viewer';

// 导出资金流向监控器
export {
  MoneyFlowMonitor,
  type MoneyFlowData,
  type LargeOrder,
  type MoneyFlowTrendAnalysis,
} from './money-flow-monitor';
