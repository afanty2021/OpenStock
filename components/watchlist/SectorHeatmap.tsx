'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { TrendingUp, TrendingDown, AlertCircle, RefreshCw, Layers, Flame } from 'lucide-react';
import { getSectorHeatmapData, type SectorHeatmapData } from '@/lib/actions/sector.actions';
import { formatWanAmount } from '@/lib/utils';

/**
 * 板块热力图组件属性
 */
interface SectorHeatmapProps {
  /** 板块类型 */
  type?: 'industry' | 'concept';
  /** 周期（预留扩展，目前仅支持当日） */
  period?: 'day' | 'week' | 'month';
  /** 返回条数限制 */
  limit?: number;
  /** 自定义类名 */
  className?: string;
}

/**
 * 计算热力图颜色（A 股红涨绿跌）
 *
 * @param pctChg - 涨跌幅百分比
 * @returns 颜色类名和背景色
 */
function getHeatmapColor(pctChg: number): { bgClass: string; textClass: string } {
  if (pctChg > 5) {
    return { bgClass: 'bg-red-600', textClass: 'text-white' };
  }
  if (pctChg > 3) {
    return { bgClass: 'bg-red-500', textClass: 'text-white' };
  }
  if (pctChg > 1) {
    return { bgClass: 'bg-red-400', textClass: 'text-white' };
  }
  if (pctChg > 0) {
    return { bgClass: 'bg-red-300', textClass: 'text-gray-900' };
  }
  if (pctChg === 0) {
    return { bgClass: 'bg-gray-400', textClass: 'text-gray-900' };
  }
  if (pctChg > -1) {
    return { bgClass: 'bg-green-300', textClass: 'text-gray-900' };
  }
  if (pctChg > -3) {
    return { bgClass: 'bg-green-400', textClass: 'text-white' };
  }
  if (pctChg > -5) {
    return { bgClass: 'bg-green-500', textClass: 'text-white' };
  }
  return { bgClass: 'bg-green-600', textClass: 'text-white' };
}

/**
 * 板块热力图单元格组件
 */
interface SectorCellProps {
  sector: SectorHeatmapData;
  totalAmount: number;
  onClick?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

function SectorCell({ sector, totalAmount, onClick, onMouseEnter, onMouseLeave }: SectorCellProps) {
  const { bgClass, textClass } = getHeatmapColor(sector.pctChg);
  const sizePercent = totalAmount > 0 ? (sector.amount / totalAmount) * 100 : 0;
  const isPositive = sector.pctChg > 0;

  return (
    <button
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={`
        relative p-3 rounded-lg transition-all duration-200 hover:scale-105
        hover:shadow-lg hover:ring-2 hover:ring-white/30 active:scale-95
        ${bgClass} ${textClass}
      `}
      style={{
        minWidth: sizePercent > 5 ? `${Math.max(sizePercent, 8)}%` : '8%',
        minHeight: '80px',
      }}
      title={`${sector.name}: ${sector.pctChg > 0 ? '+' : ''}${sector.pctChg.toFixed(2)}%`}
    >
      <div className="flex flex-col h-full justify-between">
        {/* 板块名称 */}
        <div className="text-xs font-medium truncate text-left" title={sector.name}>
          {sector.name}
        </div>

        {/* 涨跌幅 */}
        <div className="flex items-center justify-between mt-1">
          <div className="flex items-center space-x-1">
            {isPositive ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            <span className="text-sm font-bold font-mono">
              {isPositive ? '+' : ''}{sector.pctChg.toFixed(2)}%
            </span>
          </div>
        </div>

        {/* 成交额 */}
        <div className="text-[10px] opacity-80 text-left mt-1" title={`成交额: ${formatWanAmount(sector.amount)}万元`}>
          {formatWanAmount(sector.amount)}万
        </div>
      </div>
    </button>
  );
}

/**
 * 板块热力图组件
 *
 * 以热力图形式展示板块资金流向情况
 * - 红色系表示上涨/资金流入
 * - 绿色系表示下跌/资金流出
 * - 单元格大小代表成交额占比
 *
 * @example
 * ```tsx
 * <SectorHeatmap type="industry" limit={50} />
 * ```
 */
function SectorHeatmapComponent({
  type = 'industry',
  period = 'day',
  limit = 50,
  className = '',
}: SectorHeatmapProps) {
  const [sectors, setSectors] = useState<SectorHeatmapData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<'industry' | 'concept'>(type);
  const [selectedPeriod, setSelectedPeriod] = useState<'day' | 'week' | 'month'>(period);
  const [hoveredSector, setHoveredSector] = useState<SectorHeatmapData | null>(null);

  // 提取公共数据获取逻辑
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getSectorHeatmapData(selectedType, limit);

      if (result.success && result.data) {
        setSectors(result.data);
        if (result.data.length === 0) {
          setError(null);
        }
      } else {
        setError(result.error || 'Failed to load sector heatmap data');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sector heatmap data');
    } finally {
      setIsLoading(false);
    }
  }, [selectedType, limit]);

  // 初始加载和依赖变化时获取数据
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 刷新按钮处理函数
  const handleRefresh = () => {
    if (!isLoading) {
      fetchData();
    }
  };

  // 切换板块类型
  const handleTypeChange = (newType: 'industry' | 'concept') => {
    setSelectedType(newType);
  };

  // 计算总成交额用于大小分配
  const totalAmount = sectors.reduce((sum, s) => sum + s.amount, 0);

  // 统计信息
  const stats = {
    upCount: sectors.filter(s => s.pctChg > 0).length,
    downCount: sectors.filter(s => s.pctChg < 0).length,
    flatCount: sectors.filter(s => s.pctChg === 0).length,
    avgPctChg: sectors.length > 0
      ? sectors.reduce((sum, s) => sum + s.pctChg, 0) / sectors.length
      : 0,
    totalNetInflow: sectors.reduce((sum, s) => sum + s.netMfAmount, 0),
  };

  return (
    <div className={`bg-gray-900/30 rounded-lg border border-gray-800 p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white flex items-center">
          <Layers className="w-5 h-5 mr-2 text-yellow-500" />
          {selectedType === 'industry' ? '行业板块' : '概念板块'}热力图
        </h2>
        <div className="flex items-center space-x-2">
          {/* 板块类型切换 */}
          <div className="flex bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => handleTypeChange('industry')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                selectedType === 'industry'
                  ? 'bg-yellow-500 text-gray-900'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              行业
            </button>
            <button
              onClick={() => handleTypeChange('concept')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                selectedType === 'concept'
                  ? 'bg-yellow-500 text-gray-900'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              概念
            </button>
          </div>

          {/* 刷新按钮 */}
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="text-gray-400 hover:text-white transition-colors p-1 rounded hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
            title={isLoading ? '加载中...' : '刷新数据'}
            aria-label={isLoading ? '正在加载' : '刷新数据'}
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center space-y-3">
            <RefreshCw className="w-8 h-8 text-yellow-500 animate-spin" />
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
              className="mt-2 px-4 py-2 bg-yellow-500/20 text-yellow-500 rounded-lg hover:bg-yellow-500/30 transition-colors text-sm"
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
        <div className="space-y-4">
          {/* 统计信息 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-gray-800/40 rounded-lg p-3 border border-gray-700">
              <p className="text-[10px] text-gray-500">上涨板块</p>
              <p className="text-lg font-bold text-red-400">{stats.upCount}</p>
            </div>
            <div className="bg-gray-800/40 rounded-lg p-3 border border-gray-700">
              <p className="text-[10px] text-gray-500">下跌板块</p>
              <p className="text-lg font-bold text-green-400">{stats.downCount}</p>
            </div>
            <div className="bg-gray-800/40 rounded-lg p-3 border border-gray-700">
              <p className="text-[10px] text-gray-500">平均涨跌</p>
              <p className={`text-lg font-bold ${stats.avgPctChg > 0 ? 'text-red-400' : stats.avgPctChg < 0 ? 'text-green-400' : 'text-gray-400'}`}>
                {stats.avgPctChg > 0 ? '+' : ''}{stats.avgPctChg.toFixed(2)}%
              </p>
            </div>
            <div className="bg-gray-800/40 rounded-lg p-3 border border-gray-700">
              <p className="text-[10px] text-gray-500">主力净流入</p>
              <p className={`text-lg font-bold ${stats.totalNetInflow > 0 ? 'text-red-400' : stats.totalNetInflow < 0 ? 'text-green-400' : 'text-gray-400'}`}>
                {stats.totalNetInflow > 0 ? '+' : ''}{formatWanAmount(stats.totalNetInflow)}万
              </p>
            </div>
          </div>

          {/* 热力图网格 */}
          <div className="flex flex-wrap gap-2">
            {sectors.map((sector) => (
              <SectorCell
                key={sector.tsCode}
                sector={sector}
                totalAmount={totalAmount}
                onClick={() => {
                  // 跳转到板块详情页（待实现）
                  console.log('Navigate to sector:', sector.tsCode);
                }}
                onMouseEnter={() => setHoveredSector(sector)}
                onMouseLeave={() => setHoveredSector(null)}
              />
            ))}
          </div>

          {/* 悬停提示 */}
          {hoveredSector && (
            <div className="fixed bottom-4 right-4 bg-gray-800 rounded-lg p-4 shadow-xl border border-gray-700 z-50 max-w-xs">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-white">{hoveredSector.name}</h3>
                <span className={`text-xs font-mono ${hoveredSector.pctChg > 0 ? 'text-red-400' : hoveredSector.pctChg < 0 ? 'text-green-400' : 'text-gray-400'}`}>
                  {hoveredSector.pctChg > 0 ? '+' : ''}{hoveredSector.pctChg.toFixed(2)}%
                </span>
              </div>
              <div className="space-y-1 text-xs text-gray-400">
                <div className="flex justify-between">
                  <span>成交额:</span>
                  <span className="text-white font-mono">{formatWanAmount(hoveredSector.amount)}万</span>
                </div>
                <div className="flex justify-between">
                  <span>主力净流入:</span>
                  <span className={`font-mono ${hoveredSector.netMfAmount > 0 ? 'text-red-400' : hoveredSector.netMfAmount < 0 ? 'text-green-400' : 'text-gray-400'}`}>
                    {hoveredSector.netMfAmount > 0 ? '+' : ''}{formatWanAmount(hoveredSector.netMfAmount)}万
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>排名:</span>
                  <span className="text-white">#{hoveredSector.rank}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      {sectors.length > 0 && (
        <div className="mt-4 pt-3 border-t border-gray-800">
          <p className="text-xs text-gray-500 text-center">
            数据来源：Tushare · 颜色代表涨跌幅（红涨绿跌）· 大小代表成交额占比
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * 自定义比较函数用于 React.memo
 * 仅在关键 props 变化时重新渲染
 */
const arePropsEqual = (
  prevProps: Readonly<SectorHeatmapProps>,
  nextProps: Readonly<SectorHeatmapProps>
): boolean => {
  return (
    prevProps.type === nextProps.type &&
    prevProps.period === nextProps.period &&
    prevProps.limit === nextProps.limit &&
    prevProps.className === nextProps.className
  );
};

export default React.memo(SectorHeatmapComponent, arePropsEqual);
