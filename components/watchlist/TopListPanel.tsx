"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { TrendingUp, TrendingDown, AlertCircle, RefreshCw } from "lucide-react";
import { getTopListData } from "@/lib/actions/toplist.actions";
import { formatWanAmount } from "@/lib/utils";

interface TopListPanelProps {
  symbol?: string;
  limit?: number;
  showReason?: boolean;
  className?: string;
}

export default function TopListPanel({
  symbol,
  limit = 10,
  showReason = true,
  className = "",
}: TopListPanelProps) {
  const [topList, setTopList] = useState<TopListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      setError(null);
      try {
        const data = await getTopListData(symbol, limit);
        setTopList(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load top list data");
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [symbol, limit]);

  const handleRefresh = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getTopListData(symbol, limit);
      setTopList(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load top list data");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`bg-gray-900/30 rounded-lg border border-gray-800 p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white flex items-center">
          <TrendingUp className="w-5 h-5 mr-2 text-yellow-500" />
          {symbol ? `${symbol} 龙虎榜` : "龙虎榜 TOP10"}
        </h2>
        <button
          onClick={handleRefresh}
          disabled={isLoading}
          className="text-gray-400 hover:text-white transition-colors p-1 rounded hover:bg-white/10 disabled:opacity-50"
          title="刷新数据"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
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
      ) : topList.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-gray-500 text-sm">暂无龙虎榜数据</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="px-3 py-2 text-gray-400 font-medium text-xs">#</th>
                <th className="px-3 py-2 text-gray-400 font-medium text-xs">股票</th>
                <th className="px-3 py-2 text-gray-400 font-medium text-xs text-right">买入(万)</th>
                <th className="px-3 py-2 text-gray-400 font-medium text-xs text-right">卖出(万)</th>
                <th className="px-3 py-2 text-gray-400 font-medium text-xs text-right">净买入(万)</th>
                {showReason && (
                  <th className="px-3 py-2 text-gray-400 font-medium text-xs">上榜理由</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {topList.map((item, index) => {
                const isPositive = item.netAmount > 0;
                const netAmountPercent = item.buyAmount + item.sellAmount > 0
                  ? (item.netAmount / (item.buyAmount + item.sellAmount)) * 100
                  : 0;

                return (
                  <tr key={`${item.tsCode}-${item.tradeDate}`} className="hover:bg-white/5 transition-colors">
                    {/* Rank */}
                    <td className="px-3 py-3 text-gray-500 font-medium">
                      {index + 1}
                    </td>

                    {/* Stock Info */}
                    <td className="px-3 py-3">
                      <Link
                        href={`/stocks/${item.tsCode}`}
                        className="flex flex-col hover:text-yellow-500 transition-colors"
                      >
                        <span className="font-semibold text-white text-sm">{item.name}</span>
                        <span className="text-xs text-gray-400 font-mono">{item.tsCode}</span>
                      </Link>
                    </td>

                    {/* Buy Amount */}
                    <td className="px-3 py-3 text-right">
                      <span className="text-red-400 font-mono text-xs">
                        {formatWanAmount(item.buyAmount)}
                      </span>
                    </td>

                    {/* Sell Amount */}
                    <td className="px-3 py-3 text-right">
                      <span className="text-green-400 font-mono text-xs">
                        {formatWanAmount(item.sellAmount)}
                      </span>
                    </td>

                    {/* Net Amount */}
                    <td className="px-3 py-3 text-right">
                      <div className={`flex items-center justify-end space-x-1 ${isPositive ? 'text-red-400' : 'text-green-400'}`}>
                        {isPositive ? (
                          <TrendingUp className="w-3 h-3" />
                        ) : (
                          <TrendingDown className="w-3 h-3" />
                        )}
                        <span className="font-mono text-xs font-semibold">
                          {isPositive ? '+' : ''}{formatWanAmount(Math.abs(item.netAmount))}
                        </span>
                        <span className="text-[10px] text-gray-500">
                          ({isPositive ? '+' : ''}{netAmountPercent.toFixed(1)}%)
                        </span>
                      </div>
                    </td>

                    {/* Reason */}
                    {showReason && (
                      <td className="px-3 py-3">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-white/5 text-gray-300 border border-white/10">
                          {item.reason}
                        </span>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer */}
      {topList.length > 0 && (
        <div className="mt-4 pt-3 border-t border-gray-800">
          <p className="text-xs text-gray-500 text-center">
            数据来源：Tushare · 交易日期：{topList[0]?.tradeDate}
          </p>
        </div>
      )}
    </div>
  );
}
