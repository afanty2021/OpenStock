'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

/**
 * 虚拟表格属性
 */
export interface VirtualTableProps<T> {
  /** 数据列表 */
  data: T[];
  /** 估计行高（像素） */
  estimateRowHeight?: number;
  /** 表头内容 */
  header?: React.ReactNode;
  /** 行渲染函数 */
  renderRow: (item: T, index: number) => React.ReactNode;
  /** 获取行唯一 Key */
  getKey: (item: T, index: number) => string | number;
  /** 容器高度 */
  height?: string | number;
  /** 自定义类名 */
  className?: string;
  /** 是否显示表头 */
  showHeader?: boolean;
  /** 空状态内容 */
  emptyState?: React.ReactNode;
  /** 加载状态 */
  isLoading?: boolean;
  /** 加载状态内容 */
  loadingState?: React.ReactNode;
}

/**
 * 虚拟列表表格组件
 *
 * 使用 @tanstack/react-virtual 实现高性能的大数据量表格渲染
 * 适用于龙虎榜、板块排行等数据量较大的场景
 *
 * @example
 * ```tsx
 * <VirtualTable
 *   data={topListData}
 *   estimateRowHeight={60}
 *   getKey={(item) => item.tsCode}
 *   renderRow={(item, index) => (
 *     <tr key={item.tsCode}>
 *       <td>{index + 1}</td>
 *       <td>{item.name}</td>
 *       <td>{item.amount}</td>
 *     </tr>
 *   )}
 *   header={
 *     <thead>
 *       <tr>
 *         <th>#</th>
 *         <th>名称</th>
 *         <th>金额</th>
 *       </tr>
 *     </thead>
 *   }
 *   height="600px"
 * />
 * ```
 */
export function VirtualTable<T>({
  data,
  estimateRowHeight = 60,
  header,
  renderRow,
  getKey,
  height = '100%',
  className = '',
  showHeader = true,
  emptyState,
  isLoading = false,
  loadingState,
}: VirtualTableProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);

  // 虚拟行配置
  const rowVirtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateRowHeight,
    overscan: 5,
    getItemKey: (index) => getKey(data[index], index),
  });

  const virtualRows = rowVirtualizer.getVirtualItems();
  const totalSize = rowVirtualizer.getTotalSize();

  // 渲染空状态
  if (!isLoading && data.length === 0 && emptyState) {
    return (
      <div className={className}>
        {showHeader && header}
        {emptyState}
      </div>
    );
  }

  // 渲染加载状态
  if (isLoading && loadingState) {
    return (
      <div className={className}>
        {showHeader && header}
        {loadingState}
      </div>
    );
  }

  return (
    <div className={`virtual-table-container ${className}`}>
      {/* 表头 */}
      {showHeader && header && (
        <div className="virtual-table-header">{header}</div>
      )}

      {/* 虚拟列表容器 */}
      <div
        ref={parentRef}
        className="virtual-table-scroll-container"
        style={{
          height: typeof height === 'number' ? `${height}px` : height,
          overflow: 'auto',
        }}
      >
        <div
          style={{
            height: `${totalSize}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualRows.map((virtualRow) => {
            const item = data[virtualRow.index];
            return (
              <div
                key={getKey(item, virtualRow.index)}
                data-index={virtualRow.index}
                ref={rowVirtualizer.measureElement}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                {renderRow(item, virtualRow.index)}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/**
 * 简化的虚拟列表组件（无表格结构）
 */
export interface VirtualListProps<T> {
  /** 数据列表 */
  data: T[];
  /** 估计项高（像素） */
  estimateItemHeight?: number;
  /** 项渲染函数 */
  renderItem: (item: T, index: number) => React.ReactNode;
  /** 获取项唯一 Key */
  getKey: (item: T, index: number) => string | number;
  /** 容器高度 */
  height?: string | number;
  /** 自定义类名 */
  className?: string;
  /** 空状态内容 */
  emptyState?: React.ReactNode;
  /** 加载状态 */
  isLoading?: boolean;
  /** 加载状态内容 */
  loadingState?: React.ReactNode;
  /** 过度扫描数量 */
  overscan?: number;
}

export function VirtualList<T>({
  data,
  estimateItemHeight = 50,
  renderItem,
  getKey,
  height = '100%',
  className = '',
  emptyState,
  isLoading = false,
  loadingState,
  overscan = 5,
}: VirtualListProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateItemHeight,
    overscan,
    getItemKey: (index) => getKey(data[index], index),
  });

  const virtualRows = rowVirtualizer.getVirtualItems();
  const totalSize = rowVirtualizer.getTotalSize();

  if (!isLoading && data.length === 0 && emptyState) {
    return <div className={className}>{emptyState}</div>;
  }

  if (isLoading && loadingState) {
    return <div className={className}>{loadingState}</div>;
  }

  return (
    <div ref={parentRef} className={`virtual-list-container ${className}`} style={{ height, overflow: 'auto' }}>
      <div
        style={{
          height: `${totalSize}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualRows.map((virtualRow) => {
          const item = data[virtualRow.index];
          return (
            <div
              key={getKey(item, virtualRow.index)}
              data-index={virtualRow.index}
              ref={rowVirtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              {renderItem(item, virtualRow.index)}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * 动态行高的虚拟表格
 *
 * 支持不同行高的数据表格渲染
 */
export interface DynamicVirtualTableProps<T> {
  /** 数据列表 */
  data: T[];
  /** 默认估计行高（像素） */
  defaultEstimateRowHeight?: number;
  /** 获取实际行高的函数（可选，用于动态行高） */
  getRowHeight?: (item: T, index: number) => number;
  /** 行渲染函数 */
  renderRow: (item: T, index: number) => React.ReactNode;
  /** 获取行唯一 Key */
  getKey: (item: T, index: number) => string | number;
  /** 容器高度 */
  height?: string | number;
  /** 自定义类名 */
  className?: string;
  /** 表头内容 */
  header?: React.ReactNode;
  /** 是否显示表头 */
  showHeader?: boolean;
}

export function DynamicVirtualTable<T>({
  data,
  defaultEstimateRowHeight = 60,
  getRowHeight,
  renderRow,
  getKey,
  height = '100%',
  className = '',
  header,
  showHeader = true,
}: DynamicVirtualTableProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);
  const resizeObserversRef = useRef<Map<number, ResizeObserver>>(new Map());
  const [measuredRowHeights, setMeasuredRowHeights] = useState<Map<number, number>>(new Map());

  // 测量行高
  const measureRow = (index: number, height: number) => {
    setMeasuredRowHeights((prev) => {
      const next = new Map(prev);
      next.set(index, height);
      return next;
    });
  };

  // 清理所有 ResizeObserver
  useEffect(() => {
    return () => {
      resizeObserversRef.current.forEach((observer) => {
        observer.disconnect();
      });
      resizeObserversRef.current.clear();
    };
  }, []);

  const rowVirtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => {
      // 如果已测量，使用实际高度
      if (measuredRowHeights.has(index)) {
        return measuredRowHeights.get(index)!;
      }
      // 如果提供了自定义行高函数，使用它
      if (getRowHeight) {
        return getRowHeight(data[index], index);
      }
      // 否则使用默认估计高度
      return defaultEstimateRowHeight;
    },
    overscan: 5,
    getItemKey: (index) => getKey(data[index], index),
  });

  const virtualRows = rowVirtualizer.getVirtualItems();
  const totalSize = rowVirtualizer.getTotalSize();

  return (
    <div className={`dynamic-virtual-table-container ${className}`}>
      {showHeader && header && <div className="virtual-table-header">{header}</div>}
      <div
        ref={parentRef}
        className="virtual-table-scroll-container"
        style={{
          height: typeof height === 'number' ? `${height}px` : height,
          overflow: 'auto',
        }}
      >
        <div
          style={{
            height: `${totalSize}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualRows.map((virtualRow) => {
            const item = data[virtualRow.index];
            return (
              <div
                key={getKey(item, virtualRow.index)}
                data-index={virtualRow.index}
                ref={(node) => {
                  if (node) {
                    rowVirtualizer.measureElement(node);

                    // 清理该行之前的 ResizeObserver
                    const existingObserver = resizeObserversRef.current.get(virtualRow.index);
                    if (existingObserver) {
                      existingObserver.disconnect();
                    }

                    // 创建新的 ResizeObserver
                    const resizeObserver = new ResizeObserver((entries) => {
                      for (const entry of entries) {
                        measureRow(virtualRow.index, entry.contentRect.height);
                      }
                    });
                    resizeObserver.observe(node);
                    resizeObserversRef.current.set(virtualRow.index, resizeObserver);
                  }
                }}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                {renderRow(item, virtualRow.index)}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
