/**
 * 策略管理器
 *
 * 管理用户的自定义筛选策略，支持保存、编辑、克隆等功能
 * @module data-sources/astock/strategy-manager
 */

import type { SavedStrategy, ScreenerCriteria } from './types';

/**
 * 策略管理器配置
 */
interface StrategyManagerConfig {
  /** MongoDB 数据库连接（可选）*/
  mongoose?: any;
}

/**
 * 策略数据（数据库模型接口）
 */
interface StrategyDocument {
  _id: string;
  userId: string;
  name: string;
  description: string;
  criteria: ScreenerCriteria;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
  backtestSummary?: {
    totalReturn: number;
    winRate: number;
    sharpeRatio: number;
  };
}

/**
 * 策略管理器
 *
 * 提供用户策略管理功能：
 * - 保存和更新筛选策略
 * - 策略版本管理
 * - 策略克隆和分享
 * - 公开策略市场
 */
export class StrategyManager {
  private mongoose?: any;

  constructor(config: StrategyManagerConfig = {}) {
    this.mongoose = config.mongoose;
  }

  /**
   * 保存策略
   */
  async saveStrategy(
    userId: string,
    strategy: Omit<SavedStrategy, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<SavedStrategy> {
    const now = new Date();
    const id = this.generateId();

    const savedStrategy: SavedStrategy = {
      id,
      userId,
      name: strategy.name,
      description: strategy.description,
      criteria: strategy.criteria,
      isPublic: strategy.isPublic || false,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      backtestSummary: strategy.backtestSummary,
    };

    // 模拟保存到数据库
    // 实际实现需要 MongoDB 操作
    console.log(`Strategy saved: ${id} for user ${userId}`);

    return savedStrategy;
  }

  /**
   * 获取用户策略列表
   */
  async getUserStrategies(userId: string): Promise<SavedStrategy[]> {
    // 模拟从数据库获取
    // 实际实现需要 MongoDB 查询
    console.log(`Fetching strategies for user: ${userId}`);

    // 返回模拟数据
    return this.getMockUserStrategies(userId);
  }

  /**
   * 更新策略
   */
  async updateStrategy(
    id: string,
    updates: Partial<SavedStrategy>
  ): Promise<SavedStrategy> {
    // 模拟从数据库获取并更新
    console.log(`Updating strategy: ${id}`);

    const existing = this.getMockStrategyById(id);
    if (!existing) {
      throw new Error(`Strategy not found: ${id}`);
    }

    const updated: SavedStrategy = {
      ...existing,
      ...updates,
      id: existing.id,
      userId: existing.userId,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
    };

    return updated;
  }

  /**
   * 删除策略
   */
  async deleteStrategy(id: string): Promise<void> {
    // 模拟从数据库删除
    console.log(`Deleting strategy: ${id}`);
  }

  /**
   * 克隆公开策略
   */
  async cloneStrategy(strategyId: string, userId: string): Promise<SavedStrategy> {
    const source = this.getMockStrategyById(strategyId);
    if (!source) {
      throw new Error(`Strategy not found: ${strategyId}`);
    }

    if (!source.isPublic) {
      throw new Error('Cannot clone private strategy');
    }

    return this.saveStrategy(userId, {
      name: `${source.name} (克隆)`,
      description: source.description,
      criteria: { ...source.criteria },
      isPublic: false,
    });
  }

  /**
   * 获取公开策略
   */
  async getPublicStrategies(): Promise<SavedStrategy[]> {
    // 模拟获取公开策略
    return this.getMockPublicStrategies();
  }

  /**
   * 获取策略详情
   */
  async getStrategy(id: string): Promise<SavedStrategy | null> {
    return this.getMockStrategyById(id) || null;
  }

  /**
   * 更新回测结果摘要
   */
  async updateBacktestSummary(
    id: string,
    summary: SavedStrategy['backtestSummary']
  ): Promise<SavedStrategy> {
    return this.updateStrategy(id, { backtestSummary: summary });
  }

  /**
   * 生成唯一 ID
   */
  private generateId(): string {
    return `strat_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * 获取模拟的用户策略
   */
  private getMockUserStrategies(userId: string): SavedStrategy[] {
    return [
      {
        id: 'strat_001',
        userId,
        name: '我的价值投资策略',
        description: '低估值高ROE的优质股票',
        criteria: { pe: { max: 15 }, roe: { min: 10 }, pb: { max: 2 } },
        isPublic: false,
        createdAt: '2024-01-15T10:00:00Z',
        updatedAt: '2024-01-15T10:00:00Z',
        backtestSummary: { totalReturn: 25.5, winRate: 65, sharpeRatio: 1.2 },
      },
      {
        id: 'strat_002',
        userId,
        name: '成长股策略',
        description: '高增长的成长型企业',
        criteria: { revenueGrowth: { min: 20 }, profitGrowth: { min: 15 } },
        isPublic: true,
        createdAt: '2024-02-01T10:00:00Z',
        updatedAt: '2024-02-01T10:00:00Z',
        backtestSummary: { totalReturn: 18.2, winRate: 58, sharpeRatio: 0.9 },
      },
    ];
  }

  /**
   * 获取模拟的公开策略
   */
  private getMockPublicStrategies(): SavedStrategy[] {
    return [
      {
        id: 'strat_pub_001',
        userId: 'system',
        name: '经典价值投资',
        description: '巴菲特风格的价值投资策略',
        criteria: { pe: { max: 15 }, roe: { min: 15 }, pb: { max: 1.5 } },
        isPublic: true,
        createdAt: '2023-06-01T10:00:00Z',
        updatedAt: '2024-01-01T10:00:00Z',
        backtestSummary: { totalReturn: 22.3, winRate: 68, sharpeRatio: 1.4 },
      },
      {
        id: 'strat_pub_002',
        userId: 'system',
        name: '红利策略',
        description: '高股息稳定收益策略',
        criteria: { roe: { min: 10 }, netMargin: { min: 10 } },
        isPublic: true,
        createdAt: '2023-08-15T10:00:00Z',
        updatedAt: '2024-01-01T10:00:00Z',
        backtestSummary: { totalReturn: 15.8, winRate: 72, sharpeRatio: 1.6 },
      },
      {
        id: 'strat_pub_003',
        userId: 'system',
        name: '小市值成长',
        description: '小市值高成长潜力股策略',
        criteria: { marketCap: { min: 0, max: 100 }, revenueGrowth: { min: 30 } },
        isPublic: true,
        createdAt: '2023-10-01T10:00:00Z',
        updatedAt: '2024-01-01T10:00:00Z',
        backtestSummary: { totalReturn: 35.2, winRate: 52, sharpeRatio: 0.8 },
      },
    ];
  }

  /**
   * 根据 ID 获取策略
   */
  private getMockStrategyById(id: string): SavedStrategy | undefined {
    const userStrategies = this.getMockUserStrategies('current_user');
    const publicStrategies = this.getMockPublicStrategies();

    return (
      userStrategies.find(s => s.id === id) ||
      publicStrategies.find(s => s.id === id)
    );
  }
}

/**
 * 创建默认的策略管理器实例
 */
let defaultManager: StrategyManager | null = null;

export function getStrategyManager(config?: StrategyManagerConfig): StrategyManager {
  if (!defaultManager) {
    defaultManager = new StrategyManager(config);
  }
  return defaultManager;
}

// 导出类型
export type { StrategyManagerConfig };
