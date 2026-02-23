/**
 * 股票详情页头部组件
 *
 * 展示股票代码、名称、价格、涨跌停状态等信息
 * @module components/astock/StockDetailHeader
 */

'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { AStockCell } from './AStockCell';
import { AStockPrice } from './AStockPrice';
import { AStockTag, type StockStatus } from './AStockTag';
import { CompactLimitPriceDisplay } from './LimitPriceDisplay';
import { AStockCodeUtil } from '@/lib/data-sources/astock';
import { LimitDetector } from '@/lib/data-sources/astock/limit-detector';
import type { QuoteData } from '@/lib/data-sources/types';

export interface StockDetailHeaderProps {
  /** 股票代码 */
  symbol: string;
  /** 股票名称 */
  name?: string;
  /** 当前价格 */
  price?: number;
  /** 前收盘价 */
  prevClose?: number;
  /** 涨跌额 */
  change?: number;
  /** 涨跌幅(%) */
  changePercent?: number;
  /** 尺寸: sm | md | lg */
  size?: 'sm' | 'md' | 'lg';
  /** 是否显示涨跌停价格 */
  showLimitPrice?: boolean;
  /** 所属行业（申万一级行业） */
  industry?: string;
  /** 申万二级行业 */
  industrySecond?: string;
  /** 申万三级行业 */
  industryThird?: string;
  /** 额外的 className */
  className?: string;
}

/**
 * 获取股票交易所
 */
function getExchange(symbol: string): 'SH' | 'SZ' | 'BJ' {
  const suffix = AStockCodeUtil.getExchange(symbol);
  // Handle the exchange suffix comparison using enum values
  if (suffix === 'SH') return 'SH';
  if (suffix === 'SZ') return 'SZ';
  if (suffix === 'BJ') return 'BJ';
  return 'SH'; // 默认
}

/**
 * 检测涨跌停状态
 */
function detectStockStatus(symbol: string, price?: number, prevClose?: number, changePercent?: number): StockStatus {
  if (!price || !prevClose) return 'normal';

  // 如果涨跌幅达到涨跌停限制
  if (changePercent !== undefined) {
    // Create minimal quote object for limit detection
    const quote = {
      symbol,
      c: price,
      pc: prevClose,
      dp: changePercent,
    } as QuoteData;
    const status = LimitDetector.detectLimitStatus(quote);
    if (status === 'UPPER') return 'limit_up';
    if (status === 'LOWER') return 'limit_down';
  }

  return 'normal';
}

/**
 * 股票详情页头部组件
 *
 * @example
 * ```tsx
 * <StockDetailHeader
 *   symbol="600519.SH"
 *   name="贵州茅台"
 *   price={1850.00}
 *   prevClose={1800.00}
 *   change={50.00}
 *   changePercent={2.78}
 *   size="lg"
 * />
 * ```
 */
export function StockDetailHeader({
  symbol,
  name,
  price,
  prevClose,
  change,
  changePercent,
  size = 'md',
  showLimitPrice = true,
  industry,
  industrySecond,
  industryThird,
  className,
}: StockDetailHeaderProps) {
  // 检测涨跌停状态
  const [stockStatus, setStockStatus] = useState<StockStatus>('normal');

  useEffect(() => {
    const status = detectStockStatus(symbol, price, prevClose, changePercent);
    setStockStatus(status);
  }, [symbol, price, prevClose, changePercent]);

  const exchange = getExchange(symbol);
  const displayName = name || symbol.toUpperCase();

  // 尺寸配置
  const sizeConfig: Record<'sm' | 'md' | 'lg', { cell: 'sm' | 'md' | 'lg'; price: 'sm' | 'md' | 'lg'; tag: 'sm' | 'md' | 'lg'; limit: 'sm' | 'md' | 'lg' }> = {
    sm: {
      cell: 'sm',
      price: 'sm',
      tag: 'sm',
      limit: 'sm',
    },
    md: {
      cell: 'md',
      price: 'md',
      tag: 'md',
      limit: 'md',
    },
    lg: {
      cell: 'lg',
      price: 'lg',
      tag: 'lg',
      limit: 'lg',
    },
  };

  const config = sizeConfig[size];

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {/* 股票代码和名称行 */}
      <div className="flex items-center gap-3">
        <AStockCell
          tsCode={symbol}
          companyName={displayName}
          size={config.cell}
          showExchange={false}
        />
        <span className={cn(
          'font-medium text-foreground',
          size === 'sm' && 'text-sm',
          size === 'md' && 'text-base',
          size === 'lg' && 'text-lg'
        )}>
          {displayName}
        </span>
        <AStockTag
          exchange={exchange}
          variant="exchange"
          size={config.tag}
        />
        {stockStatus !== 'normal' && (
          <AStockTag
            exchange={exchange}
            status={stockStatus}
            size={config.tag}
          />
        )}
      </div>

      {/* 板块归属信息 */}
      {(industry || industrySecond || industryThird) && (
        <div className="flex items-center gap-2 flex-wrap">
          {industry && (
            <span className={cn(
              'px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30',
              size === 'sm' && 'text-xs',
              size === 'md' && 'text-sm',
              size === 'lg' && 'text-base'
            )}>
              {industry}
            </span>
          )}
          {industrySecond && (
            <span className={cn(
              'text-muted-foreground',
              size === 'sm' && 'text-xs',
              size === 'md' && 'text-sm',
              size === 'lg' && 'text-base'
            )}>
              {industrySecond}
            </span>
          )}
          {industryThird && (
            <span className={cn(
              'text-muted-foreground/70',
              size === 'sm' && 'text-xs',
              size === 'md' && 'text-sm',
              size === 'lg' && 'text-base'
            )}>
              {industryThird}
            </span>
          )}
        </div>
      )}

      {/* 价格行 */}
      {price !== undefined && (
        <div className="flex items-center gap-4">
          <AStockPrice
            price={price}
            change={change || 0}
            changePercent={changePercent || 0}
            size={config.price}
            showYuan={true}
          />
        </div>
      )}

      {/* 涨跌停价格显示 */}
      {showLimitPrice && price !== undefined && price > 0 && (
        <CompactLimitPriceDisplay
          currentPrice={price}
          symbol={symbol}
          stockName={name}
          count={1}
          size={config.limit}
          className="mt-1"
        />
      )}
    </div>
  );
}

/**
 * 股票详情页头部骨架屏
 */
export interface StockDetailHeaderSkeletonProps {
  /** 尺寸 */
  size?: 'sm' | 'md' | 'lg';
  /** 是否显示涨跌停价格 */
  showLimitPrice?: boolean;
  className?: string;
}

export function StockDetailHeaderSkeleton({
  size = 'md',
  showLimitPrice = true,
  className,
}: StockDetailHeaderSkeletonProps) {
  const sizeClasses: Record<'sm' | 'md' | 'lg', string> = {
    sm: 'h-4',
    md: 'h-5',
    lg: 'h-6',
  };

  return (
    <div className={cn('flex flex-col gap-3 animate-pulse', className)}>
      {/* 股票代码和名称行 */}
      <div className="flex items-center gap-3">
        <div className={cn('bg-gray-700 rounded w-20', sizeClasses[size])} />
        <div className={cn('bg-gray-700 rounded w-24', sizeClasses[size])} />
        <div className={cn('bg-gray-700 rounded w-8 h-6')} />
      </div>

      {/* 价格行 */}
      <div className="flex items-center gap-2">
        <div className={cn('bg-gray-700 rounded w-32 h-6')} />
        <div className={cn('bg-gray-700 rounded w-24 h-5')} />
      </div>

      {/* 涨跌停价格 */}
      {showLimitPrice && (
        <div className={cn('bg-gray-700 rounded w-40 h-5 mt-1')} />
      )}
    </div>
  );
}

export default StockDetailHeader;
