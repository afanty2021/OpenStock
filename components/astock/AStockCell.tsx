/**
 * A 股股票代码单元格组件
 *
 * 用于展示 A 股股票代码，支持点击复制、悬停显示公司名称等功能。
 * @module components/astock/AStockCell
 */

'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { AStockCodeUtil } from '@/lib/data-sources/astock';

export interface AStockCellProps {
  /** 股票代码 (如 600519.SH) */
  tsCode: string;
  /** 公司名称 (悬停显示) */
  companyName?: string;
  /** 是否显示交易所后缀，默认 true */
  showExchange?: boolean;
  /** 尺寸: sm | md | lg */
  size?: 'sm' | 'md' | 'lg';
  /** 点击事件 */
  onClick?: () => void;
  /** 额外的 className */
  className?: string;
  /** 是否可复制，默认 true */
  copyable?: boolean;
}

/**
 * A 股股票代码单元格
 *
 * @example
 * ```tsx
 * <AStockCell tsCode="600519.SH" companyName="贵州茅台" size="md" />
 * <AStockCell tsCode="000001.SZ" showExchange={false} />
 * ```
 */
export function AStockCell({
  tsCode,
  companyName,
  showExchange = true,
  size = 'md',
  onClick,
  className,
  copyable = true,
}: AStockCellProps) {
  const [copied, setCopied] = useState(false);

  // 提取纯代码和交易所
  const code = AStockCodeUtil.extractCode(tsCode);
  const exchange = AStockCodeUtil.getExchange(tsCode);

  // 显示格式: 600519 (茅台) 或 600519 茅台 (SH)
  const displayText = showExchange && exchange
    ? `${code} (${exchange})`
    : code;

  // 处理点击复制
  const handleClick = async (e: React.MouseEvent) => {
    if (onClick) {
      onClick();
      return;
    }

    if (copyable) {
      try {
        await navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }
  };

  // 尺寸样式
  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
    lg: 'text-base px-2.5 py-1.5',
  };

  // 如果有公司名称，使用 title 属性显示
  const title = companyName ? `${companyName} (${code})` : undefined;

  return (
    <span
      className={cn(
        'inline-flex items-center font-mono rounded cursor-pointer',
        'transition-colors duration-200',
        'hover:bg-accent hover:text-accent-foreground',
        'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
        sizeClasses[size],
        onClick || copyable ? 'cursor-pointer' : 'cursor-default',
        className
      )}
      onClick={handleClick}
      role={copyable ? 'button' : undefined}
      tabIndex={copyable ? 0 : undefined}
      aria-label={copyable ? `股票代码 ${code}, 点击复制` : undefined}
      title={title}
    >
      <code>{displayText}</code>
      {copied && (
        <span className="ml-1 text-xs text-green-500" aria-live="polite">
          已复制
        </span>
      )}
    </span>
  );
}

export default AStockCell;
