/**
 * 多数据源聚合系统 - 错误处理
 *
 * 定义错误类型和错误处理器
 * @module data-sources/error-handler
 */

/**
 * 错误类型枚举
 */
export enum ErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  API_RATE_LIMIT = 'API_RATE_LIMIT',
  INVALID_DATA = 'INVALID_DATA',
  TIMEOUT = 'TIMEOUT',
  UNKNOWN = 'UNKNOWN',
}

/**
 * 数据源错误类
 */
export class DataSourceError extends Error {
  constructor(
    public type: ErrorType,
    public source: string,
    message: string,
    public originalError?: any
  ) {
    super(`[${source}] ${message}`);
    this.name = 'DataSourceError';
  }
}

/**
 * 错误处理器
 * 管理错误重试逻辑和错误统计
 */
export class ErrorHandler {
  private errorCounts: Map<string, number> = new Map();
  private lastErrorTime: Map<string, number> = new Map();

  /**
   * 判断是否应该重试
   *
   * @param source 数据源名称
   * @param error 错误对象
   * @returns 是否应该重试
   */
  shouldRetry(source: string, error: DataSourceError): boolean {
    const now = Date.now();
    const lastError = this.lastErrorTime.get(source) || 0;
    const errorCount = this.errorCounts.get(source) || 0;

    switch (error.type) {
      case ErrorType.API_RATE_LIMIT:
        // 速率限制：等待后重试
        const cooldown = 60000; // 1 分钟冷却
        if (now - lastError < cooldown) {
          console.log(`[${source}] In cooldown period`);
          return false;
        }
        return errorCount < 3;

      case ErrorType.NETWORK_ERROR:
        // 网络错误：可以重试
        return errorCount < 5;

      case ErrorType.INVALID_DATA:
        // 无效数据：不重试
        return false;

      case ErrorType.TIMEOUT:
        // 超时：可以重试，但次数有限
        return errorCount < 3;

      default:
        return false;
    }
  }

  /**
   * 记录错误
   *
   * @param source 数据源名称
   * @param error 错误对象
   */
  recordError(source: string, error: DataSourceError): void {
    const count = (this.errorCounts.get(source) || 0) + 1;
    this.errorCounts.set(source, count);
    this.lastErrorTime.set(source, Date.now());

    console.error(`[ErrorHandler] ${source} error #${count}:`, error.message);
  }

  /**
   * 清除错误记录（成功时调用）
   *
   * @param source 数据源名称
   */
  clearError(source: string): void {
    this.errorCounts.delete(source);
    this.lastErrorTime.delete(source);
  }

  /**
   * 获取错误统计
   *
   * @param source 数据源名称
   * @returns 错误次数和最后错误时间
   */
  getErrorStats(source: string): { count: number; lastError: number | undefined } {
    return {
      count: this.errorCounts.get(source) || 0,
      lastError: this.lastErrorTime.get(source),
    };
  }
}
