/**
 * A 股状态标签组件
 *
 * 用于展示 A 股交易所标签和股票状态（正常、涨停、跌停、停牌、ST）。
 * @module components/astock/AStockTag
 */

'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';

export type Exchange = 'SH' | 'SZ' | 'BJ';
export type StockStatus = 'normal' | 'limit_up' | 'limit_down' | 'suspended' | 'st';

/**
 * 交易所颜色常量
 */
const EXCHANGE_COLORS = {
  /** 上海证券交易所 - 蓝色 */
  SH: {
    bg: 'bg-[#1890FF]',
    text: 'text-white',
    hover: 'hover:bg-[#1890FF]/90',
  },
  /** 深圳证券交易所 - 橙色 */
  SZ: {
    bg: 'bg-[#FA8C16]',
    text: 'text-white',
    hover: 'hover:bg-[#FA8C16]/90',
  },
  /** 北京证券交易所 - 绿色 */
  BJ: {
    bg: 'bg-[#52C41A]',
    text: 'text-white',
    hover: 'hover:bg-[#52C41A]/90',
  },
} as const;

/**
 * 股票状态颜色常量
 */
const STATUS_COLORS = {
  /** 正常 - 灰色 */
  normal: {
    bg: 'bg-gray-100',
    text: 'text-gray-700',
    border: 'border-gray-300',
  },
  /** 涨停 - 红色 */
  limit_up: {
    bg: 'bg-red-100',
    text: 'text-red-700',
    border: 'border-red-300',
  },
  /** 跌停 - 绿色 */
  limit_down: {
    bg: 'bg-green-100',
    text: 'text-green-700',
    border: 'border-green-300',
  },
  /** 停牌 - 黄色 */
  suspended: {
    bg: 'bg-yellow-100',
    text: 'text-yellow-700',
    border: 'border-yellow-300',
  },
  /** ST - 紫色 */
  st: {
    bg: 'bg-purple-100',
    text: 'text-purple-700',
    border: 'border-purple-300',
  },
} as const;

/**
 * 状态标签变体
 */
const statusTagVariants = cva(
  'inline-flex items-center justify-center font-medium rounded transition-colors duration-200',
  {
    variants: {
      variant: {
        // 交易所标签
        exchange: 'border-none',
        // 状态标签
        status: 'border',
      },
    },
    defaultVariants: {
      variant: 'status',
    },
  }
);

export interface AStockTagProps {
  /** 交易所: SH | SZ | BJ */
  exchange: Exchange;
  /** 股票状态: normal | limit_up | limit_down | suspended | st */
  status?: StockStatus;
  /** 组件变体: exchange | status */
  variant?: 'exchange' | 'status';
  /** 尺寸: sm | md | lg */
  size?: 'sm' | 'md' | 'lg';
  /** 额外的 className */
  className?: string;
  /** 是否禁用 */
  disabled?: boolean;
}

interface SizeConfig {
  sm: string;
  md: string;
  lg: string;
}

/**
 * 尺寸配置
 */
const SIZE_CONFIG: SizeConfig = {
  sm: 'text-[10px] px-1.5 py-0.5 min-w-[24px] h-5',
  md: 'text-xs px-2 py-0.5 min-w-[28px] h-6',
  lg: 'text-sm px-2.5 py-1 min-w-[32px] h-7',
};

/**
 * 获取交易所显示文本
 */
function getExchangeLabel(exchange: Exchange): string {
  const labels: Record<Exchange, string> = {
    SH: 'SH',
    SZ: 'SZ',
    BJ: 'BJ',
  };
  return labels[exchange];
}

/**
 * 获取状态显示文本
 */
function getStatusLabel(status: StockStatus): string {
  const labels: Record<StockStatus, string> = {
    normal: '正常',
    limit_up: '涨停',
    limit_down: '跌停',
    suspended: '停牌',
    st: 'ST',
  };
  return labels[status];
}

/**
 * AStockTag 组件
 *
 * @example
 * ```tsx
 * // 交易所标签
 * <AStockTag exchange="SH" variant="exchange" />
 * <AStockTag exchange="SZ" size="sm" />
 *
 * // 状态标签
 * <AStockTag exchange="SH" status="limit_up" />
 * <AStockTag exchange="SZ" status="st" size="lg" />
 * ```
 */
export function AStockTag({
  exchange,
  status = 'normal',
  variant = 'status',
  size = 'md',
  className,
  disabled = false,
}: AStockTagProps) {
  // 交易所配置
  const exchangeConfig = EXCHANGE_COLORS[exchange];
  // 状态配置
  const statusConfig = STATUS_COLORS[status];

  // 确定颜色配置
  const colors = variant === 'exchange' ? exchangeConfig : statusConfig;

  // 组合类名
  const variantClass = variant === 'exchange'
    ? cn(exchangeConfig.bg, exchangeConfig.text, !disabled && exchangeConfig.hover)
    : cn(statusConfig.bg, statusConfig.text, statusConfig.border, 'border');

  return (
    <span
      className={cn(
        statusTagVariants({ variant }),
        SIZE_CONFIG[size],
        variantClass,
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
      role={variant === 'status' ? 'status' : undefined}
      aria-label={variant === 'exchange' ? `交易所: ${exchange}` : `状态: ${getStatusLabel(status)}`}
    >
      {variant === 'exchange' ? getExchangeLabel(exchange) : getStatusLabel(status)}
    </span>
  );
}

/**
 * A 股交易所选择器组件
 *
 * @example
 * ```tsx
 * <ExchangeSelector value="SH" onChange={(val) => setExchange(val)} />
 * ```
 */
export interface ExchangeSelectorProps {
  /** 当前选中的交易所 */
  value: Exchange;
  /** 值变更回调 */
  onChange: (value: Exchange) => void;
  /** 是否禁用 */
  disabled?: boolean;
  /** 额外的 className */
  className?: string;
}

export function ExchangeSelector({
  value,
  onChange,
  disabled = false,
  className,
}: ExchangeSelectorProps) {
  const exchanges: Exchange[] = ['SH', 'SZ', 'BJ'];

  return (
    <div className={cn('inline-flex gap-1', className)} role="radiogroup" aria-label="选择交易所">
      {exchanges.map((exchange) => (
        <button
          key={exchange}
          type="button"
          disabled={disabled}
          onClick={() => onChange(exchange)}
          className={cn(
            'px-2 py-1 text-xs font-medium rounded transition-colors duration-200',
            value === exchange
              ? EXCHANGE_COLORS[exchange].bg
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200',
            value === exchange && EXCHANGE_COLORS[exchange].text,
            disabled && 'opacity-50 cursor-not-allowed'
          )}
          role="radio"
          aria-checked={value === exchange}
        >
          {exchange}
        </button>
      ))}
    </div>
  );
}

/**
 * 快速创建交易所标签的工厂函数
 *
 * @example
 * ```tsx
 * const SHTag = createExchangeTag('SH');
 * <SHTag size="sm" />
 * ```
 */
export function createExchangeTag(exchange: Exchange) {
  return function ExchangeTag(props: Omit<AStockTagProps, 'exchange'>) {
    return <AStockTag exchange={exchange} variant="exchange" {...props} />;
  };
}

export { AStockTag as default, EXCHANGE_COLORS, STATUS_COLORS };
