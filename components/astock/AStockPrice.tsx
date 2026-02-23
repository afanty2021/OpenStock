/**
 * A 股价格显示组件
 *
 * 用于展示 A 股价格，支持颜色编码（红涨绿跌）、涨跌额和涨跌幅显示。
 * @module components/astock/AStockPrice
 */

'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface AStockPriceProps {
  /** 当前价格 */
  price: number;
  /** 涨跌额 */
  change: number;
  /** 涨跌幅 % */
  changePercent: number;
  /** 尺寸: sm | md | lg */
  size?: 'sm' | 'md' | 'lg';
  /** 是否显示 ¥ 符号，默认 true */
  showYuan?: boolean;
  /** 额外的 className */
  className?: string;
  /** 价格格式化选项 */
  formatOptions?: {
    /** 价格小数位数，默认 2 */
    priceDecimals?: number;
    /** 涨跌幅小数位数，默认 2 */
    changeDecimals?: number;
  };
}

/**
 * A 股颜色常量
 * A 股惯例：上涨红色，下跌绿色
 */
const PRICE_COLORS = {
  /** 上涨颜色 */
  UP: '#FF4444',
  /** 下跌颜色 */
  DOWN: '#00CC66',
  /** 平盘颜色 */
  FLAT: '#999999',
} as const;

/**
 * 格式化数字
 */
function formatNumber(value: number, decimals: number = 2): string {
  if (isNaN(value) || !isFinite(value)) {
    return '--';
  }
  return value.toFixed(decimals);
}

export interface PriceDisplayProps {
  price: number;
  change: number;
  changePercent: number;
  showYuan?: boolean;
  size?: 'sm' | 'md' | 'lg';
  priceDecimals?: number;
  changeDecimals?: number;
}

/**
 * 价格显示内部组件
 */
function PriceDisplay({
  price,
  change,
  changePercent,
  showYuan = true,
  size = 'md',
  priceDecimals = 2,
  changeDecimals = 2,
}: PriceDisplayProps) {
  // 判断涨跌方向
  const isUp = change > 0;
  const isDown = change < 0;
  const isFlat = change === 0;

  // 颜色类名
  const colorClass = isUp
    ? 'text-[#FF4444]'
    : isDown
    ? 'text-[#00CC66]'
    : 'text-[#999999]';

  // 箭头符号
  const arrow = isUp ? '▲' : isDown ? '▼' : '─';

  // 尺寸样式
  const sizeClasses = {
    sm: {
      price: 'text-sm',
      change: 'text-xs',
    },
    md: {
      price: 'text-base',
      change: 'text-sm',
    },
    lg: {
      price: 'text-lg font-semibold',
      change: 'text-base',
    },
  };

  return (
    <div className="inline-flex items-baseline gap-1.5">
      {/* 价格 */}
      <span className={cn('font-mono', sizeClasses[size].price)}>
        {showYuan && <span className="text-muted-foreground mr-0.5">¥</span>}
        {formatNumber(price, priceDecimals)}
      </span>

      {/* 涨跌额和涨跌幅 */}
      <span className={cn('inline-flex items-center gap-1', colorClass, sizeClasses[size].change)}>
        <span className="tabular-nums">
          {arrow} {formatNumber(Math.abs(change), changeDecimals)}
        </span>
        <span className="tabular-nums">
          ({isUp ? '+' : ''}{formatNumber(changePercent, changeDecimals)}%)
        </span>
      </span>
    </div>
  );
}

/**
 * A 股价格显示组件
 *
 * @example
 * ```tsx
 * <AStockPrice price={152.50} change={2.30} changePercent={1.53} size="md" />
 * <AStockPrice price={100} change={-5} changePercent={-4.76} showYuan={false} />
 * ```
 */
export function AStockPrice({
  price,
  change,
  changePercent,
  size = 'md',
  showYuan = true,
  className,
  formatOptions,
}: AStockPriceProps) {
  return (
    <div className={cn('inline-flex items-center', className)}>
      <PriceDisplay
        price={price}
        change={change}
        changePercent={changePercent}
        showYuan={showYuan}
        size={size}
        priceDecimals={formatOptions?.priceDecimals}
        changeDecimals={formatOptions?.changeDecimals}
      />
    </div>
  );
}

/**
 * 获取价格颜色
 *
 * @param change - 涨跌额
 * @returns 颜色值
 */
export function getPriceColor(change: number): string {
  if (change > 0) return PRICE_COLORS.UP;
  if (change < 0) return PRICE_COLORS.DOWN;
  return PRICE_COLORS.FLAT;
}

/**
 * 获取涨跌箭头
 *
 * @param change - 涨跌额
 * @returns 箭头符号
 */
export function getChangeArrow(change: number): string {
  if (change > 0) return '▲';
  if (change < 0) return '▼';
  return '─';
}

export default AStockPrice;
