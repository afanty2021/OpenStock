/**
 * A 股详情页骨架屏组件
 *
 * 用于股票详情页加载时显示占位内容
 * @module components/skeletons/AStockDetailSkeleton
 */

'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { StockDetailHeaderSkeleton } from '@/components/astock/StockDetailHeader';

export interface AStockDetailSkeletonProps {
  /** 是否显示图表 */
  showCharts?: boolean;
  /** 是否显示龙虎榜 */
  showTopList?: boolean;
  /** 是否显示资金流向 */
  showMoneyFlow?: boolean;
  /** 是否显示融资融券 */
  showMargin?: boolean;
  /** 额外的 className */
  className?: string;
}

/**
 * 股票详情页主骨架屏
 */
export function AStockDetailSkeleton({
  showCharts = true,
  showTopList = true,
  showMoneyFlow = true,
  showMargin = true,
  className,
}: AStockDetailSkeletonProps) {
  return (
    <div className={cn('flex min-h-screen p-4 md:p-6 lg:p-8', className)}>
      <section className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
        {/* Left column */}
        <div className="flex flex-col gap-6">
          {/* 股票头部骨架 */}
          <StockDetailHeaderSkeleton size="lg" showLimitPrice={true} />

          {showCharts && (
            <>
              {/* Symbol Info Widget Skeleton */}
              <div className="bg-gray-900/30 rounded-lg border border-gray-800 p-4">
                <div className="h-[170px] bg-gray-800 rounded animate-pulse" />
              </div>

              {/* K线图骨架 */}
              <div className="bg-gray-900/30 rounded-lg border border-gray-800 p-4">
                <div className="h-[600px] bg-gray-800 rounded animate-pulse" />
              </div>

              {/* 分时图骨架 */}
              <div className="bg-gray-900/30 rounded-lg border border-gray-800 p-4">
                <div className="h-[600px] bg-gray-800 rounded animate-pulse" />
              </div>
            </>
          )}
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-6">
          {/* 关注按钮骨架 */}
          <div className="flex items-center justify-between">
            <div className="h-10 w-32 bg-gray-800 rounded animate-pulse" />
          </div>

          {/* 技术分析骨架 */}
          <div className="bg-gray-900/30 rounded-lg border border-gray-800 p-4">
            <div className="h-[400px] bg-gray-800 rounded animate-pulse" />
          </div>

          {/* 公司资料骨架 */}
          <div className="bg-gray-900/30 rounded-lg border border-gray-800 p-4">
            <div className="h-[440px] bg-gray-800 rounded animate-pulse" />
          </div>

          {/* 财务数据骨架 */}
          <div className="bg-gray-900/30 rounded-lg border border-gray-800 p-4">
            <div className="h-[800px] bg-gray-800 rounded animate-pulse" />
          </div>

          {showMoneyFlow && <MoneyFlowCardSkeleton />}

          {showMargin && <MarginPanelSkeleton />}

          {showTopList && <TopListPanelSkeleton />}
        </div>
      </section>
    </div>
  );
}

/**
 * TopListPanel 加载骨架屏
 */
export function TopListPanelSkeleton() {
  return (
    <div className="bg-gray-900/30 rounded-lg border border-gray-800 p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="h-6 w-40 bg-gray-800 rounded animate-pulse" />
        <div className="h-4 w-4 bg-gray-800 rounded animate-pulse" />
      </div>
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center justify-between py-2">
            <div className="h-4 w-24 bg-gray-800 rounded animate-pulse" />
            <div className="h-4 w-20 bg-gray-800 rounded animate-pulse" />
            <div className="h-4 w-20 bg-gray-800 rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * MoneyFlowCard 加载骨架屏
 */
export function MoneyFlowCardSkeleton() {
  return (
    <div className="bg-gray-900/30 rounded-lg border border-gray-800 p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="h-6 w-32 bg-gray-800 rounded animate-pulse" />
        <div className="h-4 w-4 bg-gray-800 rounded animate-pulse" />
      </div>
      <div className="space-y-4">
        {/* 主力净流入卡片骨架 */}
        <div className="bg-gray-800/40 rounded-lg p-4 border border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div className="space-y-2">
              <div className="h-3 w-16 bg-gray-700 rounded animate-pulse" />
              <div className="h-8 w-32 bg-gray-700 rounded animate-pulse" />
              <div className="h-3 w-20 bg-gray-700 rounded animate-pulse" />
            </div>
            <div className="h-12 w-12 bg-gray-700 rounded-full animate-pulse" />
          </div>
          {/* 分项数据骨架 */}
          <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-700">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-1">
                <div className="h-2 w-12 bg-gray-700 rounded animate-pulse" />
                <div className="h-4 w-20 bg-gray-700 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
        {/* 趋势分析骨架 */}
        <div className="bg-gray-800/40 rounded-lg p-4 border border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <div className="h-4 w-16 bg-gray-700 rounded animate-pulse" />
            <div className="h-3 w-12 bg-gray-700 rounded animate-pulse" />
          </div>
          <div className="grid grid-cols-3 gap-2 mb-3 pb-3 border-b border-gray-700">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="text-center space-y-1">
                <div className="h-2 w-12 mx-auto bg-gray-700 rounded animate-pulse" />
                <div className="h-3 w-16 mx-auto bg-gray-700 rounded animate-pulse" />
              </div>
            ))}
          </div>
          {/* 趋势条形图骨架 */}
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center space-x-2">
                <div className="h-2 w-16 bg-gray-700 rounded animate-pulse" />
                <div className="flex-1 h-3 bg-gray-700 rounded-full animate-pulse" />
                <div className="h-2 w-16 bg-gray-700 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * MarginPanel 加载骨架屏
 */
export function MarginPanelSkeleton() {
  return (
    <div className="bg-gray-900/30 rounded-lg border border-gray-800 p-4 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="h-6 w-32 bg-gray-700 rounded"></div>
        <div className="h-6 w-6 bg-gray-700 rounded"></div>
      </div>

      {/* Balance cards */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {/* 融资余额卡片 */}
        <div className="bg-gray-800/40 rounded-lg p-4 border border-gray-700">
          <div className="h-3 w-20 bg-gray-700 rounded mb-3"></div>
          <div className="h-8 w-28 bg-gray-700 rounded mb-4"></div>
          {/* 分项数据 */}
          <div className="space-y-2 pt-3 border-t border-gray-700">
            <div className="h-2 w-24 bg-gray-700 rounded"></div>
            <div className="h-2 w-24 bg-gray-700 rounded"></div>
          </div>
        </div>

        {/* 融券余额卡片 */}
        <div className="bg-gray-800/40 rounded-lg p-4 border border-gray-700">
          <div className="h-3 w-20 bg-gray-700 rounded mb-3"></div>
          <div className="h-8 w-28 bg-gray-700 rounded mb-4"></div>
          {/* 分项数据 */}
          <div className="space-y-2 pt-3 border-t border-gray-700">
            <div className="h-2 w-24 bg-gray-700 rounded"></div>
            <div className="h-2 w-24 bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>

      {/* 多空情绪指示器 */}
      <div className="bg-gray-800/40 rounded-lg p-4 border border-gray-700 mb-4">
        <div className="flex items-center space-x-3 mb-4">
          <div className="h-10 w-10 bg-gray-700 rounded-full"></div>
          <div className="space-y-2">
            <div className="h-4 w-24 bg-gray-700 rounded"></div>
            <div className="h-3 w-32 bg-gray-700 rounded"></div>
          </div>
        </div>
        {/* 变化统计 */}
        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-700">
          <div className="space-y-1">
            <div className="h-2 w-20 bg-gray-700 rounded"></div>
            <div className="h-4 w-24 bg-gray-700 rounded"></div>
          </div>
          <div className="space-y-1">
            <div className="h-2 w-20 bg-gray-700 rounded"></div>
            <div className="h-4 w-24 bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>

      {/* 趋势图 */}
      <div className="bg-gray-800/40 rounded-lg p-4 border border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <div className="h-4 w-24 bg-gray-700 rounded"></div>
          <div className="h-3 w-16 bg-gray-700 rounded"></div>
        </div>
        {/* 趋势条形图骨架 */}
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center space-x-2">
              <div className="h-2 w-16 bg-gray-700 rounded"></div>
              <div className="flex-1 h-3 bg-gray-700 rounded-full"></div>
              <div className="h-2 w-16 bg-gray-700 rounded"></div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-4 pt-3 border-t border-gray-800">
        <div className="h-2 w-48 mx-auto bg-gray-700 rounded"></div>
      </div>
    </div>
  );
}

export default AStockDetailSkeleton;
