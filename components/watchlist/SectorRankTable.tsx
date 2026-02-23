"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { TrendingUp, TrendingDown, AlertCircle, RefreshCw, ChevronRight } from "lucide-react";
import { getSectorHeatmapData, type SectorHeatmapData } from "@/lib/actions/sector.actions";
import { formatWanAmount } from "@/lib/utils";

/**
 * 板块排名表格组件属性
 */
interface SectorRankTableProps {
  /** 板块类型 */
  type: 'industry' | 'concept';
  /** 自定义类名 */
  className?: string;
}

/**
 * 板块表格行组件
 */
interface SectorRowProps {
  sector: SectorHeatmapData;
  index: number;
}

function SectorRow({ sector, index }: SectorRowProps) {
  const isPositive = sector.pctChg > 0;
  const isNegative = sector.pctChg < 0;

  return (
    <tr className="hover:bg-white/5 transition-colors border-b border-gray-800/50">
      {/* 排名 */}
      <td className="px-3 py-3 text-gray-500 font-medium text-xs">
        {index + 1}
      </td>

      {/* 板块信息 */}
      <td className="px-3 py-3">
        <Link
          href={`/sectors/${sector.tsCode}`}
          className="flex flex-col hover:text-yellow-500 transition-colors group"
        >
          <span className="font-semibold text-white text-sm">{sector.name}</span>
          <span className="text-xs text-gray-500 font-mono">{sector.tsCode}</span>
        </Link>
      </td>

      {/* 收盘点位 */}
      <td className="px-3 py-3 text-right">
        <span className="text-gray-300 font-mono text-xs">
          {sector.close.toFixed(2)}
        </span>
      </td>

      {/* 涨跌幅 */}
      <td className="px-3 py-3 text-right">
        <div className={`flex items-center justify-end space-x-1 ${isPositive ? 'text-red-400' : isNegative ? 'text-green-400' : 'text-gray-400'}`}>
          {isPositive ? (
            <TrendingUp className="w-3 h-3" />
          ) : isNegative ? (
            <TrendingDown className="w-3 h-3" />
          ) : null}
          <span className="font-mono text-xs font-semibold">
            {isPositive ? '+' : ''}{sector.pctChg.toFixed(2)}%
          </span>
        </div>
      </td>

      {/* 成交额 */}
      <td className="px-3 py-3 text-right">
        <span className="text-gray-400 font-mono text-xs">
          {formatWanAmount(sector.amount)}万
        </span>
      </td>

      {/* 净流入 */}
      <td className="px-3 py-3 text-right">
        <span className={`font-mono text-xs font-semibold ${sector.netMfAmount > 0 ? 'text-red-400' : sector.netMfAmount < 0 ? 'text-green-400' : 'text-gray-400'}`}>
          {sector.netMfAmount > 0 ? '+' : ''}{formatWanAmount(sector.netMfAmount)}万
        </span>
      </td>

      {/* 操作 */}
      <td className="px-3 py-3 text-right">
        <Link
          href={`/sectors/${sector.tsCode}`}
          className="inline-flex items-center text-xs text-gray-500 hover:text-yellow-500 transition-colors"
          title="查看成分股"
        >
          成分股
          <ChevronRight className="w-3 h-3 ml-0.5" />
        </Link>
      </td>
    </tr>
  );
}

/**
 * 加载骨架屏组件
 */
function TableSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center space-x-4 animate-pulse">
          <div className="w-8 h-4 bg-gray-800 rounded" />
          <div className="w-24 h-4 bg-gray-800 rounded" />
          <div className="flex-1 h-4 bg-gray-800 rounded" />
        </div>
      ))}
    </div>
  );
}

/**
 * 板块排名表格组件
 *
 * 展示行业或概念板块的资金流向排名表格
 * - 支持按涨跌幅、成交额、净流入排序
 * - 点击板块可查看成分股
 * - 实时数据刷新
 *
 * @example
 * ```tsx
 * <SectorRankTable type="industry" />
 * <SectorRankTable type="concept" />
 * ```
 */
export default function SectorRankTable({ type, className = "" }: SectorRankTableProps) {
  const [sectors, setSectors] = useState<SectorHeatmapData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<'rank' | 'pctChg' | 'amount' | 'netMfAmount'>('rank');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // 提取公共数据获取逻辑
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getSectorHeatmapData(type, 100);

      if (result.success && result.data) {
        setSectors(result.data);
        if (result.data.length === 0) {
          setError(null);
        }
      } else {
        setError(result.error || 'Failed to load sector data');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sector data');
    } finally {
      setIsLoading(false);
    }
  }, [type]);

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

  // 排序处理函数
  const handleSort = (field: 'rank' | 'pctChg' | 'amount' | 'netMfAmount') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // 排序后的数据
  const sortedSectors = React.useMemo(() => {
    const sorted = [...sectors];
    sorted.sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];
      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
    return sorted;
  }, [sectors, sortField, sortDirection]);

  // 统计信息
  const stats = {
    upCount: sectors.filter(s => s.pctChg > 0).length,
    downCount: sectors.filter(s => s.pctChg < 0).length,
    avgPctChg: sectors.length > 0
      ? sectors.reduce((sum, s) => sum + s.pctChg, 0) / sectors.length
      : 0,
    totalAmount: sectors.reduce((sum, s) => sum + s.amount, 0),
  };

  return (
    <div className={`bg-gray-900/30 rounded-lg border border-gray-800 p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white flex items-center">
          <TrendingUp className="w-5 h-5 mr-2 text-yellow-500" />
          {type === 'industry' ? '行业板块' : '概念板块'}排名
        </h2>
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
              <p className="text-[10px] text-gray-500">总成交额</p>
              <p className="text-lg font-bold text-gray-300">
                {formatWanAmount(stats.totalAmount)}万
              </p>
            </div>
          </div>

          {/* 表格 */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <th
                    onClick={() => handleSort('rank')}
                    className="px-3 py-2 text-gray-400 font-medium text-xs cursor-pointer hover:text-white transition-colors select-none"
                  >
                    排名
                  </th>
                  <th className="px-3 py-2 text-gray-400 font-medium text-xs">板块</th>
                  <th className="px-3 py-2 text-gray-400 font-medium text-xs text-right">收盘点位</th>
                  <th
                    onClick={() => handleSort('pctChg')}
                    className="px-3 py-2 text-gray-400 font-medium text-xs text-right cursor-pointer hover:text-white transition-colors select-none"
                  >
                    涨跌幅(%)
                    {sortField === 'pctChg' && (
                      <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </th>
                  <th
                    onClick={() => handleSort('amount')}
                    className="px-3 py-2 text-gray-400 font-medium text-xs text-right cursor-pointer hover:text-white transition-colors select-none"
                  >
                    成交额(万)
                    {sortField === 'amount' && (
                      <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </th>
                  <th
                    onClick={() => handleSort('netMfAmount')}
                    className="px-3 py-2 text-gray-400 font-medium text-xs text-right cursor-pointer hover:text-white transition-colors select-none"
                  >
                    净流入(万)
                    {sortField === 'netMfAmount' && (
                      <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </th>
                  <th className="px-3 py-2 text-gray-400 font-medium text-xs text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {sortedSectors.map((sector, index) => (
                  <SectorRow
                    key={sector.tsCode}
                    sector={sector}
                    index={index}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Footer */}
      {sectors.length > 0 && (
        <div className="mt-4 pt-3 border-t border-gray-800">
          <p className="text-xs text-gray-500 text-center">
            数据来源：Tushare · 点击板块查看成分股详情
          </p>
        </div>
      )}
    </div>
  );
}
