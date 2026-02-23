'use client';

import { useCallback, useEffect, useRef } from 'react';

/**
 * 节流 Hook
 *
 * 限制函数在一定时间内只能执行一次，常用于滚动事件、resize 事件等
 *
 * @param callback - 需要节流的回调函数
 * @param delay - 节流延迟时间（毫秒）
 * @returns 节流后的回调函数
 *
 * @example
 * ```tsx
 * const throttledScroll = useThrottle(() => {
 *   console.log('Scroll position:', window.scrollY);
 * }, 200);
 *
 * useEffect(() => {
 *   window.addEventListener('scroll', throttledScroll);
 *   return () => window.removeEventListener('scroll', throttledScroll);
 * }, [throttledScroll]);
 * ```
 */
export function useThrottle<T extends (...args: unknown[]) => void>(
  callback: T,
  delay: number
): (...args: Parameters<T>) => void {
  // 使用 0 初始化，确保第一次调用可以立即执行
  const lastRunRef = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const callbackRef = useRef(callback);

  // 保持 callback ref 最新
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  return useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();
      const timeSinceLastRun = now - lastRunRef.current;

      if (timeSinceLastRun >= delay) {
        // 可以执行
        lastRunRef.current = now;
        callbackRef.current(...args);
      } else if (!timeoutRef.current) {
        // 设置定时器执行最后一次调用
        const timeToWait = delay - timeSinceLastRun;
        timeoutRef.current = setTimeout(() => {
          lastRunRef.current = Date.now();
          callbackRef.current(...args);
          timeoutRef.current = null;
        }, timeToWait);
      }
    },
    [delay]
  );

  // 清理定时器
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);
}

/**
 * 节流 Hook（立即执行版本）
 *
 * 第一次调用立即执行，后续调用进行节流
 *
 * @param callback - 需要节流的回调函数
 * @param delay - 节流延迟时间（毫秒）
 * @returns 节流后的回调函数
 *
 * @example
 * ```tsx
 * const throttledResize = useThrottleImmediate(() => {
 *   console.log('Window resized');
 * }, 300);
 * ```
 */
export function useThrottleImmediate<T extends (...args: unknown[]) => void>(
  callback: T,
  delay: number
): (...args: Parameters<T>) => void {
  const isThrottledRef = useRef(false);
  const callbackRef = useRef(callback);

  // 保持 callback ref 最新
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  return useCallback(
    (...args: Parameters<T>) => {
      if (!isThrottledRef.current) {
        // 立即执行
        isThrottledRef.current = true;
        callbackRef.current(...args);

        // 设置定时器重置状态
        setTimeout(() => {
          isThrottledRef.current = false;
        }, delay);
      }
    },
    [delay]
  );
}
