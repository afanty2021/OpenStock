/**
 * 涨跌停价格显示组件
 *
 * 用于展示股票的涨跌停价格限制，根据板块自动判断涨跌停比例。
 * @module components/astock/LimitPriceDisplay
 */

'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { AStockCodeUtil, MarketType } from '@/lib/data-sources/astock';

export type LimitType = '10%' | '5%' | '20%' | '30%';

export interface LimitPriceDisplayProps {
  /** 当前价格 */
  currentPrice: number;
  /** 股票代码，用于自动判断涨跌停限制 */
  symbol?: string;
  /** 涨跌停类型: 10% | 5% | 20% | 30% */
  limitType?: LimitType;
  /** 股票名称，用于识别 ST 股票 */
  stockName?: string;
  /** 尺寸: sm | md | lg */
  size?: 'sm' | 'md' | 'lg';
  /** 是否显示百分比标签 */
  showLabel?: boolean;
  /** 是否同时显示涨停和跌停价格 */
  showBoth?: boolean;
  /** 额外的 className */
  className?: string;
}

/**
 * 涨跌停类型颜色
 */
const LIMIT_COLORS = {
  '10%': {
    up: 'text-red-600',
    down: 'text-green-600',
    bg: 'bg-red-50',
  },
  '5%': {
    up: 'text-red-600',
    down: 'text-green-600',
    bg: 'bg-red-50',
  },
  '20%': {
    up: 'text-red-600',
    down: 'text-green-600',
    bg: 'bg-orange-50',
  },
  '30%': {
    up: 'text-red-600',
    down: 'text-green-600',
    bg: 'bg-yellow-50',
  },
} as const;

/**
 * 涨跌停类型标签
 */
const LIMIT_LABELS = {
  '10%': '主板',
  '5%': 'ST',
  '20%': '创业板/科创板',
  '30%': '北交所',
} as const;

/**
 * 计算涨停价格
 */
function calculateLimitUpPrice(price: number, limitPct: number): number {
  return price * (1 + limitPct / 100);
}

/**
 * 计算跌停价格
 */
function calculateLimitDownPrice(price: number, limitPct: number): number {
  return price * (1 - limitPct / 100);
}

/**
 * 格式化价格
 */
function formatPrice(price: number, decimals: number = 2): string {
  if (isNaN(price) || !isFinite(price)) {
    return '--';
  }
  return price.toFixed(decimals);
}

/**
 * 从涨跌停类型获取百分比数值
 */
function getLimitPctValue(limitType: LimitType): number {
  const values: Record<LimitType, number> = {
    '10%': 10,
    '5%': 5,
    '20%': 20,
    '30%': 30,
  };
  return values[limitType];
}

/**
 * 根据股票代码和名称自动判断涨跌停类型
 */
function getAutoLimitType(symbol?: string, stockName?: string): LimitType {
  if (!symbol) return '10%';

  const limitPct = AStockCodeUtil.getLimitPct(symbol, stockName);

  switch (limitPct) {
    case 5:
      return '5%';
    case 20:
      return '20%';
    case 30:
      return '30%';
    case 10:
    default:
      return '10%';
  }
}

/**
 * 尺寸样式配置
 */
const SIZE_CONFIG = {
  sm: {
    container: 'text-xs gap-1',
    label: 'text-[10px]',
    price: 'text-sm font-mono',
  },
  md: {
    container: 'text-sm gap-2',
    label: 'text-xs',
    price: 'text-base font-mono',
  },
  lg: {
    container: 'text-base gap-3',
    label: 'text-sm',
    price: 'text-lg font-mono font-semibold',
  },
};

/**
 * 涨跌停价格项组件
 */
interface LimitPriceItemProps {
  type: 'up' | 'down';
  price: number;
  limitType: LimitType;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

function LimitPriceItem({
  type,
  price,
  limitType,
  size = 'md',
  showLabel = true,
}: LimitPriceItemProps) {
  const colors = LIMIT_COLORS[limitType];
  const colorClass = type === 'up' ? colors.up : colors.down;
  const label = type === 'up' ? '涨停' : '跌停';
  const arrow = type === 'up' ? '▲' : '▼';

  return (
    <div className={cn('flex items-center gap-1', colorClass)}>
      <span className="font-medium">{arrow}</span>
      {showLabel && (
        <span className={cn('text-muted-foreground', SIZE_CONFIG[size].label)}>
          {label}
        </span>
      )}
      <span className={cn(SIZE_CONFIG[size].price)}>
        ¥{formatPrice(price)}
      </span>
    </div>
  );
}

/**
 * LimitPriceDisplay 组件
 *
 * @example
 * ```tsx
 * // 自动判断涨跌停类型
 * <LimitPriceDisplay currentPrice={152.50} symbol="600519.SH" />
 *
 * // 指定涨跌停类型
 * <LimitPriceDisplay currentPrice={100} limitType="20%" showBoth />
 *
 * // 带标签
 * <LimitPriceDisplay currentPrice={50} symbol="300001.SZ" showLabel size="lg" />
 * ```
 */
export function LimitPriceDisplay({
  currentPrice,
  symbol,
  limitType: propLimitType,
  stockName,
  size = 'md',
  showLabel = true,
  showBoth = false,
  className,
}: LimitPriceDisplayProps) {
  // 自动判断涨跌停类型
  const limitType = propLimitType || getAutoLimitType(symbol, stockName);
  const limitPct = getLimitPctValue(limitType);

  // 计算涨跌停价格
  const limitUpPrice = calculateLimitUpPrice(currentPrice, limitPct);
  const limitDownPrice = calculateLimitDownPrice(currentPrice, limitPct);

  // 颜色配置
  const colors = LIMIT_COLORS[limitType];

  // 尺寸样式
  const sizeStyle = SIZE_CONFIG[size];

  return (
    <div className={cn('flex flex-col', sizeStyle.container, className)}>
      {/* 涨跌停类型标签 */}
      {showLabel && (
        <div className="flex items-center gap-2 mb-1">
          <span
            className={cn(
              'inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium',
              colors.bg,
              colors.up
            )}
          >
            {limitType} {LIMIT_LABELS[limitType]}
          </span>
        </div>
      )}

      {/* 价格显示 */}
      <div className={cn('flex items-center gap-3', showBoth && 'flex-col items-start')}>
        {showBoth ? (
          <>
            <LimitPriceItem
              type="up"
              price={limitUpPrice}
              limitType={limitType}
              size={size}
              showLabel={showLabel}
            />
            <LimitPriceItem
              type="down"
              price={limitDownPrice}
              limitType={limitType}
              size={size}
              showLabel={showLabel}
            />
          </>
        ) : (
          <LimitPriceItem
            type="up"
            price={limitUpPrice}
            limitType={limitType}
            size={size}
            showLabel={showLabel}
          />
        )}
      </div>
    </div>
  );
}

/**
 * 简洁版涨跌停价格显示
 *
 * 只显示涨跌停价格，不显示标签
 */
export interface CompactLimitPriceDisplayProps {
  /** 当前价格 */
  currentPrice: number;
  /** 股票代码 */
  symbol?: string;
  /** 涨跌停类型 */
  limitType?: LimitType;
  /** 股票名称 */
  stockName?: string;
  /** 显示数量: 1 | 2 */
  count?: 1 | 2;
  /** 尺寸 */
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function CompactLimitPriceDisplay({
  currentPrice,
  symbol,
  limitType: propLimitType,
  stockName,
  count = 1,
  size = 'md',
  className,
}: CompactLimitPriceDisplayProps) {
  const limitType = propLimitType || getAutoLimitType(symbol, stockName);
  const limitPct = getLimitPctValue(limitType);

  const limitUpPrice = calculateLimitUpPrice(currentPrice, limitPct);
  const limitDownPrice = calculateLimitDownPrice(currentPrice, limitPct);

  const colors = LIMIT_COLORS[limitType];

  return (
    <div className={cn('inline-flex items-center gap-2', className)}>
      <span className={cn('text-red-600', SIZE_CONFIG[size].price)}>
        ▲ ¥{formatPrice(limitUpPrice)}
      </span>
      {count === 2 && (
        <span className={cn('text-green-600', SIZE_CONFIG[size].price)}>
          ▼ ¥{formatPrice(limitDownPrice)}
        </span>
      )}
    </div>
  );
}

export default LimitPriceDisplay;
