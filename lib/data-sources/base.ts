/**
 * 多数据源聚合系统 - 基础数据源类
 *
 * 提供数据源的抽象基类，包含通用功能如重试机制、质量评分等
 * @module data-sources/base
 */

import type {
  StockDataSource,
  DataSourceCapabilities,
  DataSourceResult,
  QualityScore,
} from './types';

/**
 * 数据源抽象基类
 * 所有数据源实现都应继承此类以获得通用功能
 */
export abstract class BaseDataSource implements StockDataSource {
  /** 数据源名称 */
  abstract name: string;

  /** 数据源优先级 */
  abstract priority: number;

  /** 数据源能力 */
  abstract capabilities: DataSourceCapabilities;

  /** 历史成功率 (0-100) */
  protected successRate: number = 100;

  /**
   * 判断是否支持该股票代码（由子类实现）
   */
  abstract supportsSymbol(symbol: string): boolean;

  /**
   * 获取股票报价（由子类实现）
   */
  abstract getQuote(symbol: string): Promise<DataSourceResult<QuoteDataType>>;

  /**
   * 获取公司资料（由子类实现）
   */
  abstract getProfile(symbol: string): Promise<DataSourceResult<ProfileDataType>>;

  /**
   * 搜索股票（由子类实现）
   */
  abstract searchStocks(query: string): Promise<DataSourceResult<SearchResultType[]>>;

  /**
   * 通用重试包装器
   * 使用指数退避算法进行重试
   *
   * @param fn 要执行的异步函数
   * @param maxRetries 最大重试次数
   * @returns 函数结果或 null（全部失败时）
   * @throws 当所有重试都失败时，保留最后一次错误并抛出
   */
  protected async fetchWithRetry<T>(
    fn: () => Promise<T>,
    maxRetries = 3
  ): Promise<T | null> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const result = await fn();
        this.updateSuccessRate(true);
        return result;
      } catch (error) {
        // 保留原始错误
        lastError = error instanceof Error ? error : new Error(String(error));
        const delay = Math.pow(2, attempt) * 1000; // 指数退避：1s, 2s, 4s

        console.warn(
          `[${this.name}] Retry ${attempt + 1}/${maxRetries} after ${delay}ms`,
          lastError.message
        );

        if (attempt === maxRetries - 1) {
          this.updateSuccessRate(false);
          // 抛出保留的原始错误，而不是返回 null
          throw lastError;
        }

        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
    return null;
  }

  /**
   * 更新成功率（使用移动平均）
   *
   * @param success 是否成功
   */
  protected updateSuccessRate(success: boolean): void {
    // 移动平均：旧值占 90%，新值占 10%
    this.successRate = this.successRate * 0.9 + (success ? 100 : 0) * 0.1;
  }

  /**
   * 创建质量评分
   * 子类可以覆盖此方法以自定义评分逻辑
   *
   * @param data 原始数据
   * @returns 质量评分
   */
  protected createQualityScore(data: any): QualityScore {
    return {
      total: Math.round(
        this.scoreCompleteness(data) * 0.4 +
          this.scoreFreshness(data) * 0.3 +
          this.successRate * 0.3
      ),
      completeness: this.scoreCompleteness(data),
      freshness: this.scoreFreshness(data),
      reliability: Math.round(this.successRate),
    };
  }

  /**
   * 评分：数据完整性
   * 根据必需字段和可选字段的存在情况计算
   *
   * @param data 数据对象
   * @returns 完整性分数 (0-100)
   */
  protected scoreCompleteness(data: any): number {
    if (!data) return 0;

    let score = 0;
    let weight = 0;

    // 必需字段（高权重）
    const required: Record<string, number> = {
      c: 3, // 当前价格
      d: 2, // 涨跌额
      dp: 2, // 涨跌幅
    };

    // 可选字段（低权重）
    const optional: Record<string, number> = {
      h: 1, // 最高价
      l: 1, // 最低价
      o: 1, // 开盘价
      pc: 1, // 前收盘价
      t: 1, // 时间戳
    };

    // 计算必需字段分数
    for (const [field, w] of Object.entries(required)) {
      weight += w;
      if (data[field] !== null && data[field] !== undefined && !isNaN(data[field])) {
        score += w;
      }
    }

    // 计算可选字段分数
    for (const [field, w] of Object.entries(optional)) {
      weight += w;
      if (data[field] !== null && data[field] !== undefined && !isNaN(data[field])) {
        score += w;
      }
    }

    return Math.round((score / weight) * 100);
  }

  /**
   * 评分：数据新鲜度
   * 根据数据年龄计算分数
   *
   * @param data 数据对象
   * @returns 新鲜度分数 (0-100)
   */
  protected scoreFreshness(data: any): number {
    if (!data || !data.t) return 70; // 默认分数

    const now = Date.now() / 1000;
    const dataAge = now - data.t;

    // 延迟越少，分数越高
    if (dataAge < 15) return 100; // 15 秒内（实时）
    if (dataAge < 60) return 95; // 1 分钟内
    if (dataAge < 300) return 85; // 5 分钟内
    if (dataAge < 900) return 70; // 15 分钟内
    if (dataAge < 3600) return 50; // 1 小时内
    return 30; // 超过 1 小时
  }

  /**
   * 评分：数据合理性
   * 检查数据的逻辑一致性
   *
   * @param data 数据对象
   * @returns 合理性分数 (0-100)
   */
  protected scoreConsistency(data: any): number {
    if (!data) return 0;

    let score = 100;

    // 检查价格合理性
    if (data.c <= 0 || !isFinite(data.c)) score -= 50;
    if (data.h && data.l && data.h < data.l) score -= 30; // 最高价应 >= 最低价
    if (data.c && data.h && data.c > data.h * 1.1) score -= 20; // 当前价不应超过最高价 10%
    if (data.c && data.l && data.c < data.l * 0.9) score -= 20; // 当前价不应低于最低价 10%

    // 检查涨跌幅合理性
    if (data.dp && Math.abs(data.dp) > 20) score -= 10; // 单日涨跌幅超过 20% 可能异常
    if (data.dp && Math.abs(data.dp) > 50) score -= 20; // 单日涨跌幅超过 50% 高度异常

    return Math.max(0, score);
  }
}

// 类型别名，简化子类中的类型声明
type QuoteDataType = {
  symbol: string;
  c: number;
  d: number;
  dp: number;
  h?: number;
  l?: number;
  o?: number;
  pc?: number;
  t?: number;
  _source: string;
  [key: string]: any;
};

type ProfileDataType = {
  symbol: string;
  name: string;
  exchange: string;
  industry?: string;
  marketCap?: number;
  logo?: string;
  website?: string;
  description?: string;
  _source: string;
  [key: string]: any;
};

type SearchResultType = {
  symbol: string;
  name: string;
  exchange: string;
  type: string;
  [key: string]: any;
};
