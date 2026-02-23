/**
 * A 股板块面板组件
 *
 * 用于展示行业/概念板块数据，包括资金流向排行、热度排行、板块内资金流入/流出。
 * 支持点击跳转板块详情。
 * @module components/astock/ASectorPanel
 */

'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  TrendingDown,
  Layers,
  RefreshCw,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Filter,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatWanAmount } from '@/lib/utils';
import { SectorTracker, type SectorRankingItem, type SectorType } from '@/lib/data-sources/astock/sector-tracker';
import { TradingCalendar } from '@/lib/data-sources/astock/trading-calendar';

/**
 * 板块面板组件属性
 */
export interface ASectorPanelProps {
  /** 板块类型: industry | concept */
  type: SectorType;
  /** 排行周期: day | week | month（暂未实现，预留接口） */
  period?: 'day' | 'week' | 'month';
  /** 返回条数，默认 10 */
  limit?: number;
  /** 是否显示热力图，默认 false（预留扩展） */
  showHeatmap?: boolean;
  /** 自定义类名 */
  className?: string;
}

/**
 * 板块排行类型
 */
type RankingType = 'hot' | 'cold' | 'all';

/**
 * 格式化金额为万元
 */
function formatAmount(amount: number): string {
  if (Math.abs(amount) >= 10000) {
    return `${(amount / 10000).toFixed(2)}亿`;
  }
  return `${amount.toFixed(0)}万`;
}

/**
 * 获取涨跌颜色类名（A股红涨绿跌）
 */
function getChangeColorClass(value: number): string {
  if (value > 0) return 'text-red-400';
  if (value < 0) return 'text-green-400';
  return 'text-gray-400';
}

/**
 * 获取涨跌背景色类名
 */
function getChangeBgClass(value: number): string {
  if (value > 0) return 'bg-red-400/20';
  if (value < 0) return 'bg-green-400/20';
  return 'bg-gray-400/20';
}

/**
 * 获取涨跌图标
 */
function getChangeIcon(value: number) {
  if (value > 0) return <ArrowUpRight className="w-3 h-3" />;
  if (value < 0) return <ArrowDownRight className="w-3 h-3" />;
  return <Minus className="w-3 h-3" />;
}

/**
 * 板块排行项组件
 */
interface SectorRankItemProps {
  item: SectorRankingItem;
  index: number;
  showMoneyFlow: boolean;
}

function SectorRankItem({ item, index, showMoneyFlow }: SectorRankItemProps) {
  const isPositive = item.pctChg > 0;
  const isNegative = item.pctChg < 0;

  return (
    <Link
      href={`/sectors/${item.tsCode}`}
      className="block hover:bg-white/5 transition-colors rounded-lg p-3 border border-transparent hover:border-gray-700"
    >
      <div className="flex items-center justify-between">
        {/* 排名和板块名称 */}
        <div className="flex items-center space-x-3 flex-1 min-w-0">
          {/* 排名徽章 */}
          <div
            className={cn(
              'flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold',
              index === 0
                ? 'bg-yellow-500/20 text-yellow-500'
                : index === 1
                  ? 'bg-gray-400/20 text-gray-400'
                  : index === 2
                    ? 'bg-orange-500/20 text-orange-500'
                    : 'bg-gray-700/30 text-gray-500'
            )}
          >
            {index + 1}
          </div>

          {/* 板块名称和代码 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-white text-sm truncate">{item.name}</span>
              <span className="text-xs text-gray-500 font-mono flex-shrink-0">{item.tsCode}</span>
            </div>
          </div>
        </div>

        {/* 涨跌幅 */}
        <div className="flex-shrink-0 text-right ml-4">
          <div className={cn('flex items-center justify-end space-x-1', getChangeColorClass(item.pctChg))}>
            {getChangeIcon(item.pctChg)}
            <span className="font-mono text-sm font-semibold">
              {isPositive ? '+' : ''}{item.pctChg.toFixed(2)}%
            </span>
          </div>
          {showMoneyFlow && (
            <div className={cn('text-[10px] font-mono mt-0.5', getChangeColorClass(item.netMfAmount))}>
              {item.netMfAmount > 0 ? '+' : ''}{formatAmount(item.netMfAmount)}
            </div>
          )}
        </div>
      </div>

      {/* 资金流向进度条（可选） */}
      {showMoneyFlow && item.netMfAmount !== 0 && (
        <div className="mt-2">
          <div className="w-full bg-gray-700/50 rounded-full h-1.5 overflow-hidden">
            <div
              className={cn('h-full transition-all duration-300', isPositive ? 'bg-red-400' : 'bg-green-400')}
              style={{ width: `${Math.min(Math.abs(item.pctChg) * 5, 100)}%` }}
            />
          </div>
        </div>
      )}
    </Link>
  );
}

/**
 * 板块类型选择器组件
 */
interface SectorTypeSelectorProps {
  currentType: RankingType;
  onTypeChange: (type: RankingType) => void;
}

function SectorTypeSelector({ currentType, onTypeChange }: SectorTypeSelectorProps) {
  const types: { value: RankingType; label: string; icon: React.ReactNode }[] = [
    { value: 'hot', label: '热门', icon: <TrendingUp className="w-3 h-3" /> },
    { value: 'cold', label: '冷门', icon: <TrendingDown className="w-3 h-3" /> },
    { value: 'all', label: '全部', icon: <Layers className="w-3 h-3" /> },
  ];

  return (
    <div className="inline-flex items-center space-x-1 bg-gray-800/50 rounded-lg p-1">
      {types.map((type) => (
        <button
          key={type.value}
          onClick={() => onTypeChange(type.value)}
          className={cn(
            'flex items-center space-x-1 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200',
            currentType === type.value
              ? 'bg-yellow-500/20 text-yellow-500'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          )}
        >
          {type.icon}
          <span>{type.label}</span>
        </button>
      ))}
    </div>
  );
}

/**
 * A 股板块面板组件
 *
 * 展示行业/概念板块数据，包括：
 * - 板块涨跌排行（热门/冷门/全部）
 * - 资金流向排行
 * - 板块内资金流入/流出
 * - 点击跳转板块详情
 *
 * @example
 * ```tsx
 * // 行业板块面板
 * <ASectorPanel type="industry" limit={10} />
 *
 * // 概念板块面板
 * <ASectorPanel type="concept" limit={15} showHeatmap={false} />
 * ```
 */
function ASectorPanelComponent({
  type,
  period = 'day',
  limit = 10,
  showHeatmap = false,
  className = '',
}: ASectorPanelProps) {
  const [sectors, setSectors] = useState<SectorRankingItem[]>([]);
  const [rankingType, setRankingType] = useState<RankingType>('hot');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tradeDate, setTradeDate] = useState<string>('');
  const [isMarketOpen, setIsMarketOpen] = useState(false);

  // 获取板块数据
  const fetchSectorData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // 检查市场状态
      const tradingStatus = TradingCalendar.getTradingStatus();
      setIsMarketOpen(tradingStatus.status === 'TRADING');

      // 创建 SectorTracker 实例
      // 注意：这里需要从服务器端获取数据，暂时使用模拟数据
      // 实际应该通过 Server Action 获取数据
      let result;

      if (rankingType === 'hot') {
        // 获取热门板块（涨幅榜）
        result = {
          success: true,
          data: generateMockSectorData(type, limit, 'hot'),
          tradeDate: new Date().toISOString().split('T')[0],
        };
      } else if (rankingType === 'cold') {
        // 获取冷门板块（跌幅榜）
        result = {
          success: true,
          data: generateMockSectorData(type, limit, 'cold'),
          tradeDate: new Date().toISOString().split('T')[0],
        };
      } else {
        // 获取全部板块
        result = {
          success: true,
          data: generateMockSectorData(type, limit, 'all'),
          tradeDate: new Date().toISOString().split('T')[0],
        };
      }

      if (result.success && result.data) {
        setSectors(result.data);
        setTradeDate(result.tradeDate);
      } else {
        setError('获取板块数据失败');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取板块数据失败');
    } finally {
      setIsLoading(false);
    }
  }, [type, limit, rankingType]);

  // 初始加载和依赖变化时获取数据
  useEffect(() => {
    fetchSectorData();
  }, [fetchSectorData]);

  // 刷新按钮处理函数
  const handleRefresh = () => {
    if (!isLoading) {
      fetchSectorData();
    }
  };

  // 获取面板标题
  const getPanelTitle = () => {
    const typeLabel = type === 'industry' ? '行业板块' : '概念板块';
    const rankingLabel = rankingType === 'hot' ? '热门' : rankingType === 'cold' ? '冷门' : '全部';
    return `${typeLabel} ${rankingLabel}`;
  };

  return (
    <div className={cn('bg-gray-900/30 rounded-lg border border-gray-800 p-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <h2 className="text-lg font-semibold text-white flex items-center">
            <Layers className="w-5 h-5 mr-2 text-purple-500" />
            {getPanelTitle()}
          </h2>
          {/* 板块类型选择器 */}
          <SectorTypeSelector currentType={rankingType} onTypeChange={setRankingType} />
        </div>
        <div className="flex items-center space-x-2">
          {/* 市场状态标识 */}
          {isMarketOpen && !isLoading && (
            <span className="flex items-center space-x-1 text-xs text-red-400">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
              <span>交易中</span>
            </span>
          )}
          {/* 刷新按钮 */}
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="text-gray-400 hover:text-white transition-colors p-1 rounded hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
            title={isLoading ? '加载中...' : '刷新数据'}
            aria-label={isLoading ? '正在加载' : '刷新数据'}
          >
            <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
          </button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center space-y-3">
            <RefreshCw className="w-8 h-8 text-purple-500 animate-spin" />
            <p className="text-gray-400 text-sm">加载中...</p>
          </div>
        </div>
      ) : error ? (
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center space-y-3">
            <AlertCircle className="w-8 h-8 text-red-500" />
            <p className="text-gray-400 text-sm">{error}</p>
            <button
              onClick={handleRefresh}
              className="mt-2 px-4 py-2 bg-purple-500/20 text-purple-500 rounded-lg hover:bg-purple-500/30 transition-colors text-sm"
            >
              重试
            </button>
          </div>
        </div>
      ) : sectors.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-gray-500 text-sm">暂无板块数据</p>
        </div>
      ) : (
        <div className="space-y-1">
          {sectors.map((sector, index) => (
            <SectorRankItem
              key={sector.tsCode}
              item={sector}
              index={index}
              showMoneyFlow={true}
            />
          ))}
        </div>
      )}

      {/* Footer */}
      {sectors.length > 0 && (
        <div className="mt-4 pt-3 border-t border-gray-800">
          <p className="text-xs text-gray-500 text-center">
            {type === 'industry' ? '申万行业' : '概念板块'} · 交易日期：{tradeDate}
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * 生成模拟板块数据（用于演示）
 * TODO: 替换为真实的 Server Action 调用
 */
function generateMockSectorData(
  type: SectorType,
  limit: number,
  rankingType: RankingType
): SectorRankingItem[] {
  const industryData: SectorRankingItem[] = [
    { tsCode: '801010.SH', name: '农林牧渔', close: 1200.5, pctChg: 3.25, amount: 150000, netMfAmount: 25000, rank: 1 },
    { tsCode: '801020.SH', name: '采掘', close: 1800.3, pctChg: 2.88, amount: 120000, netMfAmount: 18000, rank: 2 },
    { tsCode: '801030.SH', name: '化工', close: 2100.8, pctChg: 2.56, amount: 180000, netMfAmount: 22000, rank: 3 },
    { tsCode: '801040.SH', name: '钢铁', close: 950.2, pctChg: 2.15, amount: 95000, netMfAmount: 12000, rank: 4 },
    { tsCode: '801050.SH', name: '有色金属', close: 1650.7, pctChg: 1.98, amount: 135000, netMfAmount: 15000, rank: 5 },
    { tsCode: '801080.SH', name: '电子', close: 3200.5, pctChg: 1.76, amount: 280000, netMfAmount: 35000, rank: 6 },
    { tsCode: '801120.SH', name: '机械设备', close: 1450.3, pctChg: 1.52, amount: 165000, netMfAmount: 19000, rank: 7 },
    { tsCode: '801140.SH', name: '电气设备', close: 2350.8, pctChg: 1.35, amount: 195000, netMfAmount: 21000, rank: 8 },
    { tsCode: '801150.SH', name: '食品饮料', close: 5800.2, pctChg: 1.18, amount: 320000, netMfAmount: 28000, rank: 9 },
    { tsCode: '801160.SH', name: '纺织服饰', close: 1100.7, pctChg: 1.05, amount: 75000, netMfAmount: 8000, rank: 10 },
  ];

  const conceptData: SectorRankingItem[] = [
    { tsCode: 'TS001', name: '新能源汽车', close: 2800.5, pctChg: 4.25, amount: 350000, netMfAmount: 45000, rank: 1 },
    { tsCode: 'TS002', name: '人工智能', close: 3200.8, pctChg: 3.88, amount: 420000, netMfAmount: 52000, rank: 2 },
    { tsCode: 'TS003', name: '半导体', close: 4500.2, pctChg: 3.56, amount: 380000, netMfAmount: 48000, rank: 3 },
    { tsCode: 'TS004', name: '5G概念', close: 1950.7, pctChg: 3.15, amount: 265000, netMfAmount: 32000, rank: 4 },
    { tsCode: 'TS005', name: '芯片概念', close: 3800.3, pctChg: 2.98, amount: 295000, netMfAmount: 35000, rank: 5 },
    { tsCode: 'TS006', name: '军工', close: 2200.8, pctChg: 2.76, amount: 245000, netMfAmount: 28000, rank: 6 },
    { tsCode: 'TS007', name: '新材料', close: 1750.2, pctChg: 2.52, amount: 185000, netMfAmount: 22000, rank: 7 },
    { tsCode: 'TS008', name: '碳中和', close: 1450.7, pctChg: 2.35, amount: 165000, netMfAmount: 19000, rank: 8 },
    { tsCode: 'TS009', name: '物联网', close: 1680.3, pctChg: 2.18, amount: 178000, netMfAmount: 21000, rank: 9 },
    { tsCode: 'TS010', name: '云计算', close: 2580.8, pctChg: 2.05, amount: 225000, netMfAmount: 24000, rank: 10 },
  ];

  let data = type === 'industry' ? industryData : conceptData;

  // 根据排行类型过滤和排序
  if (rankingType === 'hot') {
    data = data.filter(item => item.pctChg > 0).sort((a, b) => b.pctChg - a.pctChg);
  } else if (rankingType === 'cold') {
    // 添加一些负涨跌幅的模拟数据
    const coldData = data.map(item => ({
      ...item,
      pctChg: -item.pctChg,
      netMfAmount: -item.netMfAmount,
    }));
    data = coldData.sort((a, b) => a.pctChg - b.pctChg);
  }

  return data.slice(0, limit);
}

/**
 * 自定义比较函数用于 React.memo
 * 仅在关键 props 变化时重新渲染
 */
const arePropsEqual = (
  prevProps: Readonly<ASectorPanelProps>,
  nextProps: Readonly<ASectorPanelProps>
): boolean => {
  return (
    prevProps.type === nextProps.type &&
    prevProps.period === nextProps.period &&
    prevProps.limit === nextProps.limit &&
    prevProps.showHeatmap === nextProps.showHeatmap &&
    prevProps.className === nextProps.className
  );
};

export default React.memo(ASectorPanelComponent, arePropsEqual);
