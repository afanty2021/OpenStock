/**
 * 多数据源聚合系统 - 统一日志记录
 *
 * 提供结构化日志记录、性能监控和上下文追踪
 * @module data-sources/logger
 */

/**
 * 日志级别枚举
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

/**
 * 日志级别名称映射
 */
const LOG_LEVEL_NAMES: Record<LogLevel, string> = {
  [LogLevel.DEBUG]: 'DEBUG',
  [LogLevel.INFO]: 'INFO',
  [LogLevel.WARN]: 'WARN',
  [LogLevel.ERROR]: 'ERROR',
};

/**
 * 日志级别颜色映射（控制台输出）
 */
const LOG_LEVEL_COLORS: Record<LogLevel, string> = {
  [LogLevel.DEBUG]: '\x1b[36m', // 青色
  [LogLevel.INFO]: '\x1b[32m',  // 绿色
  [LogLevel.WARN]: '\x1b[33m',  // 黄色
  [LogLevel.ERROR]: '\x1b[31m', // 红色
};

/**
 * 重置颜色
 */
const RESET_COLOR = '\x1b[0m';

/**
 * 日志条目接口
 */
export interface LogEntry {
  /** 时间戳 */
  timestamp: string;

  /** 日志级别 */
  level: LogLevel;

  /** 级别名称 */
  levelName: string;

  /** 数据源名称 */
  source: string;

  /** 消息 */
  message: string;

  /** 附加数据 */
  data?: any;

  /** 错误对象 */
  error?: Error;

  /** 操作类型（性能日志） */
  operation?: string;

  /** 执行时间（毫秒） */
  duration?: number;
}

/**
 * 日志配置接口
 */
export interface LoggerConfig {
  /** 最小日志级别 */
  minLevel: LogLevel;

  /** 是否启用彩色输出 */
  colors: boolean;

  /** 是否启用时间戳 */
  timestamp: boolean;

  /** 是否将日志持久化（未来扩展） */
  persist: boolean;

  /** 最大日志条目数（内存保护） */
  maxEntries: number;
}

/**
 * 从环境变量获取日志级别
 */
function getLogLevelFromEnv(): LogLevel {
  const envLevel = process.env.LOG_LEVEL?.toUpperCase();

  switch (envLevel) {
    case 'DEBUG':
      return LogLevel.DEBUG;
    case 'INFO':
      return LogLevel.INFO;
    case 'WARN':
      return LogLevel.WARN;
    case 'ERROR':
      return LogLevel.ERROR;
    default:
      // 开发环境默认 DEBUG，生产环境默认 INFO
      return process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG;
  }
}

/**
 * 格式化时间戳
 */
function formatTimestamp(): string {
  const now = new Date();
  const iso = now.toISOString();
  const millis = now.getMilliseconds().toString().padStart(3, '0');
  return iso.replace('Z', `.${millis}Z`);
}

/**
 * 数据源日志记录器
 *
 * 提供结构化日志记录和性能监控功能
 */
export class DataSourceLogger {
  /** 当前配置 */
  private config: LoggerConfig;

  /** 日志历史（内存中） */
  private history: LogEntry[] = [];

  /** 操作计时器 */
  private timers: Map<string, number> = new Map();

  constructor(config?: Partial<LoggerConfig>) {
    this.config = {
      minLevel: getLogLevelFromEnv(),
      colors: process.env.NODE_ENV !== 'production',
      timestamp: true,
      persist: false,
      maxEntries: 1000,
      ...config,
    };
  }

  /**
   * 判断是否应该记录该级别的日志
   */
  private shouldLog(level: LogLevel): boolean {
    return level >= this.config.minLevel;
  }

  /**
   * 格式化日志条目
   */
  private formatLogEntry(entry: LogEntry): string {
    const parts: string[] = [];

    // 添加时间戳
    if (this.config.timestamp) {
      parts.push(`[${entry.timestamp}]`);
    }

    // 添加级别
    if (this.config.colors) {
      const color = LOG_LEVEL_COLORS[entry.level];
      parts.push(`${color}[${entry.levelName}]${RESET_COLOR}`);
    } else {
      parts.push(`[${entry.levelName}]`);
    }

    // 添加数据源和消息
    parts.push(`[${entry.source}]`, entry.message);

    // 添加操作信息（性能日志）
    if (entry.operation && entry.duration !== undefined) {
      parts.push(`- ${entry.operation} (${entry.duration}ms)`);
    }

    // 添加数据
    if (entry.data !== undefined) {
      const dataStr = typeof entry.data === 'object'
        ? JSON.stringify(entry.data, null, 2)
        : String(entry.data);
      parts.push(`\n  Data: ${dataStr}`);
    }

    // 添加错误信息
    if (entry.error) {
      parts.push(`\n  Error: ${entry.error.message}`);
      if (entry.error.stack && this.config.minLevel <= LogLevel.DEBUG) {
        parts.push(`\n  Stack: ${entry.error.stack}`);
      }
    }

    return parts.join(' ');
  }

  /**
   * 记录日志
   */
  private log(
    level: LogLevel,
    source: string,
    message: string,
    data?: any,
    error?: Error,
    operation?: string,
    duration?: number
  ): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const entry: LogEntry = {
      timestamp: formatTimestamp(),
      level,
      levelName: LOG_LEVEL_NAMES[level],
      source,
      message,
      data,
      error,
      operation,
      duration,
    };

    // 添加到历史
    this.history.push(entry);
    if (this.history.length > this.config.maxEntries) {
      this.history.shift();
    }

    // 格式化并输出
    const formatted = this.formatLogEntry(entry);

    // 根据级别选择输出方法
    switch (level) {
      case LogLevel.DEBUG:
      case LogLevel.INFO:
        console.log(formatted);
        break;
      case LogLevel.WARN:
        console.warn(formatted);
        break;
      case LogLevel.ERROR:
        console.error(formatted);
        break;
    }
  }

  /**
   * DEBUG 级别日志
   *
   * @param source 数据源名称
   * @param message 日志消息
   * @param data 附加数据
   */
  debug(source: string, message: string, data?: any): void {
    this.log(LogLevel.DEBUG, source, message, data);
  }

  /**
   * INFO 级别日志
   *
   * @param source 数据源名称
   * @param message 日志消息
   * @param data 附加数据
   */
  info(source: string, message: string, data?: any): void {
    this.log(LogLevel.INFO, source, message, data);
  }

  /**
   * WARN 级别日志
   *
   * @param source 数据源名称
   * @param message 日志消息
   * @param data 附加数据
   */
  warn(source: string, message: string, data?: any): void {
    this.log(LogLevel.WARN, source, message, data);
  }

  /**
   * ERROR 级别日志
   *
   * @param source 数据源名称
   * @param message 日志消息
   * @param error 错误对象
   */
  error(source: string, message: string, error?: Error): void {
    this.log(LogLevel.ERROR, source, message, undefined, error);
  }

  /**
   * 开始性能计时
   *
   * @param source 数据源名称
   * @param operation 操作名称
   * @returns 计时器 ID
   */
  startTimer(source: string, operation: string): string {
    const timerId = `${source}:${operation}:${Date.now()}`;
    this.timers.set(timerId, Date.now());
    this.debug(source, `开始计时: ${operation}`);
    return timerId;
  }

  /**
   * 结束性能计时并记录
   *
   * @param timerId 计时器 ID
   * @param source 数据源名称
   * @param operation 操作名称
   */
  endTimer(timerId: string, source: string, operation: string): number {
    const startTime = this.timers.get(timerId);
    if (!startTime) {
      this.warn(source, `计时器未找到: ${operation}`);
      return 0;
    }

    const duration = Date.now() - startTime;
    this.timers.delete(timerId);

    this.info(source, `完成: ${operation}`, { duration });

    return duration;
  }

  /**
   * 记录异步操作的性能
   *
   * 自动测量函数执行时间并记录
   *
   * @param source 数据源名称
   * @param operation 操作名称
   * @param fn 要执行的异步函数
   * @returns 函数执行结果
   *
   * @example
   * const result = await logger.logPerformance(
   *   'finnhub',
   *   'getQuote',
   *   () => fetchQuote(symbol)
   * );
   */
  async logPerformance<T>(
    source: string,
    operation: string,
    fn: () => Promise<T>
  ): Promise<T> {
    const startTime = Date.now();
    this.debug(source, `开始: ${operation}`);

    try {
      const result = await fn();
      const duration = Date.now() - startTime;
      this.info(source, `成功: ${operation}`, { duration });
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const err = error instanceof Error ? error : new Error(String(error));
      this.error(source, `失败: ${operation}`, err);
      throw error;
    }
  }

  /**
   * 创建带日志的异步函数包装器
   *
   * @param source 数据源名称
   * @param operation 操作名称
   * @param fn 要包装的异步函数
   * @returns 包装后的函数
   *
   * @example
   * const loggedFetch = logger.withPerformanceLogging('finnhub', 'fetch', fetchQuote);
   * const result = await loggedFetch('AAPL');
   */
  withPerformanceLogging<T extends (...args: any[]) => Promise<any>>(
    source: string,
    operation: string,
    fn: T
  ): T {
    return (async (...args: any[]) => {
      return this.logPerformance(source, operation, () => fn(...args));
    }) as T;
  }

  /**
   * 获取日志历史
   *
   * @param level 可选的日志级别过滤
   * @param source 可选的数据源过滤
   * @returns 日志条目数组
   */
  getHistory(level?: LogLevel, source?: string): LogEntry[] {
    let filtered = this.history;

    if (level !== undefined) {
      filtered = filtered.filter(entry => entry.level >= level);
    }

    if (source !== undefined) {
      filtered = filtered.filter(entry => entry.source === source);
    }

    return filtered;
  }

  /**
   * 获取错误日志
   *
   * @returns 错误日志数组
   */
  getErrors(): LogEntry[] {
    return this.history.filter(entry => entry.level === LogLevel.ERROR);
  }

  /**
   * 获取性能统计
   *
   * @param source 可选的数据源过滤
   * @param operation 可选的操作过滤
   * @returns 性能统计信息
   */
  getPerformanceStats(source?: string, operation?: string): {
    count: number;
    totalDuration: number;
    avgDuration: number;
    minDuration: number;
    maxDuration: number;
  } {
    let filtered = this.history.filter(entry => entry.duration !== undefined);

    if (source !== undefined) {
      filtered = filtered.filter(entry => entry.source === source);
    }

    if (operation !== undefined) {
      filtered = filtered.filter(entry => entry.operation === operation);
    }

    const durations = filtered.map(entry => entry.duration!);

    if (durations.length === 0) {
      return {
        count: 0,
        totalDuration: 0,
        avgDuration: 0,
        minDuration: 0,
        maxDuration: 0,
      };
    }

    const totalDuration = durations.reduce((sum, d) => sum + d, 0);

    return {
      count: durations.length,
      totalDuration,
      avgDuration: Math.round(totalDuration / durations.length),
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
    };
  }

  /**
   * 清空日志历史
   */
  clearHistory(): void {
    this.history = [];
    this.info('logger', '日志历史已清空');
  }

  /**
   * 设置日志级别
   *
   * @param level 新的日志级别
   */
  setLevel(level: LogLevel): void {
    this.config.minLevel = level;
    this.info('logger', `日志级别已设置为: ${LOG_LEVEL_NAMES[level]}`);
  }

  /**
   * 获取当前日志级别
   */
  getLevel(): LogLevel {
    return this.config.minLevel;
  }

  /**
   * 导出日志（未来可用于持久化）
   *
   * @returns JSON 格式的日志数据
   */
  exportLogs(): string {
    return JSON.stringify(this.history, null, 2);
  }

  /**
   * 创建子日志记录器
   *
   * 子日志记录器会预填充数据源名称
   *
   * @param source 数据源名称
   * @returns 子日志记录器
   *
   * @example
   * const logger = new DataSourceLogger();
   * const finnhubLogger = logger.createChild('finnhub');
   * finnhubLogger.info('获取报价', { symbol: 'AAPL' });
   */
  createChild(source: string): ChildLogger {
    return new ChildLogger(this, source);
  }
}

/**
 * 子日志记录器类
 *
 * 预填充数据源名称的日志记录器
 */
export class ChildLogger {
  constructor(private parent: DataSourceLogger, private source: string) {}

  debug(message: string, data?: any): void {
    this.parent.debug(this.source, message, data);
  }

  info(message: string, data?: any): void {
    this.parent.info(this.source, message, data);
  }

  warn(message: string, data?: any): void {
    this.parent.warn(this.source, message, data);
  }

  error(message: string, error?: Error): void {
    this.parent.error(this.source, message, error);
  }

  async logPerformance<T>(operation: string, fn: () => Promise<T>): Promise<T> {
    return this.parent.logPerformance(this.source, operation, fn);
  }

  withPerformanceLogging<T extends (...args: any[]) => Promise<any>>(
    operation: string,
    fn: T
  ): T {
    return this.parent.withPerformanceLogging(this.source, operation, fn);
  }
}

/**
 * 全局单例日志记录器实例
 */
export const logger = new DataSourceLogger();

/**
 * 为数据源创建日志记录器的工厂函数
 *
 * @param source 数据源名称
 * @returns 子日志记录器
 *
 * @example
 * const finnhubLogger = createLogger('finnhub');
 * finnhubLogger.info('API 调用成功', { symbol: 'AAPL' });
 */
export function createLogger(source: string): ChildLogger {
  return logger.createChild(source);
}
