'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * 防抖回调函数 Hook
 *
 * 延迟执行函数，如果在延迟时间内再次调用则重新计时
 * 常用于搜索输入、表单验证等场景
 *
 * @param callback - 需要防抖的回调函数
 * @param delay - 防抖延迟时间（毫秒）
 * @returns 防抖后的回调函数
 *
 * @example
 * ```tsx
 * const debouncedSearch = useDebounceCallback((query: string) => {
 *   console.log('Searching:', query);
 * }, 500);
 *
 * <input onChange={(e) => debouncedSearch(e.target.value)} />
 * ```
 */
export function useDebounceCallback<T extends (...args: unknown[]) => void>(
  callback: T,
  delay: number
): (...args: Parameters<T>) => void {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const callbackRef = useRef(callback);

  // 保持 callback ref 最新
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args);
      }, delay);
    },
    [delay]
  );
}

/**
 * 防抖值 Hook
 *
 * 延迟更新值，常用于搜索输入框
 *
 * @param value - 需要防抖的值
 * @param delay - 防抖延迟时间（毫秒）
 * @returns 防抖后的值
 *
 * @example
 * ```tsx
 * const [searchTerm, setSearchTerm] = useState('');
 * const debouncedSearchTerm = useDebounce(searchTerm, 500);
 *
 * useEffect(() => {
 *   if (debouncedSearchTerm) {
 *     performSearch(debouncedSearchTerm);
 *   }
 * }, [debouncedSearchTerm]);
 *
 * <input
 *   value={searchTerm}
 *   onChange={(e) => setSearchTerm(e.target.value)}
 * />
 * ```
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timeout);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * 防抖状态 Hook（带加载状态）
 *
 * 返回防抖值和是否正在等待更新的状态
 *
 * @param value - 需要防抖的值
 * @param delay - 防抖延迟时间（毫秒）
 * @returns [防抖值, 是否等待中]
 *
 * @example
 * ```tsx
 * const [searchTerm, setSearchTerm] = useState('');
 * const [debouncedTerm, isPending] = useDebouncePending(searchTerm, 500);
 *
 * return (
 *   <>
 *     <input onChange={(e) => setSearchTerm(e.target.value)} />
 *     {isPending && <Spinner />}
 *   </>
 * );
 * ```
 */
export function useDebouncePending<T>(value: T, delay: number): [T, boolean] {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    setIsPending(true);
    const timeout = setTimeout(() => {
      setDebouncedValue(value);
      setIsPending(false);
    }, delay);

    return () => {
      clearTimeout(timeout);
      setIsPending(false);
    };
  }, [value, delay]);

  return [debouncedValue, isPending];
}

// 向后兼容：保留原有的导出
export { useDebounceCallback as useDebounce };
