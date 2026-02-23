'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  type LimitPriceParams,
  type LimitPriceResult,
  type MAParams,
  type MAResult,
  type RSIParams,
  type RSIResult,
  type BollingerBandsParams,
  type BollingerBandsResult,
  WorkerMessageType,
} from '@/workers/calculations';

/**
 * Worker 响应接口
 */
interface WorkerResponse<T> {
  id: number;
  type: WorkerMessageType;
  success: boolean;
  result?: T;
  error?: string;
}

/**
 * Web Worker Hook 状态
 */
interface WorkerState<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * 使用计算 Worker 的 Hook
 *
 * 在 Web Worker 中执行复杂计算，避免阻塞主线程
 *
 * @returns 计算函数和状态
 *
 * @example
 * ```tsx
 * const { calculateLimitPrice, result, isLoading, error } = useCalculationsWorker();
 *
 * const handleCalculate = () => {
 *   calculateLimitPrice({ prevClose: 100, isST: false });
 * };
 * ```
 */
export function useCalculationsWorker() {
  const workerRef = useRef<Worker | null>(null);
  const messageIdRef = useRef(0);
  const pendingCallbacksRef = useRef<Map<number, (result: unknown) => void>>(new Map());

  const [limitPriceState, setLimitPriceState] = useState<WorkerState<LimitPriceResult>>({
    data: null,
    isLoading: false,
    error: null,
  });

  // 初始化 Worker
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      // 创建 Worker（需要将 calculations.ts 编译为单独的文件）
      workerRef.current = new Worker(
        new URL('../workers/calculations.ts', import.meta.url),
        { type: 'module' }
      );

      workerRef.current.addEventListener('message', (event: MessageEvent<WorkerResponse<unknown>>) => {
        const { id, success, result, error } = event.data;
        const callback = pendingCallbacksRef.current.get(id);

        if (callback) {
          callback(success ? result : error);
          pendingCallbacksRef.current.delete(id);
        }
      });

      return () => {
        workerRef.current?.terminate();
      };
    } catch (err) {
      console.error('Failed to initialize worker:', err);
    }
  }, []);

  /**
   * 计算涨跌停价格
   */
  const calculateLimitPrice = useCallback((params: LimitPriceParams): Promise<LimitPriceResult> => {
    return new Promise((resolve, reject) => {
      setLimitPriceState({ data: null, isLoading: true, error: null });

      const id = ++messageIdRef.current;
      pendingCallbacksRef.current.set(id, (result: unknown) => {
        if (result instanceof Error) {
          setLimitPriceState({ data: null, isLoading: false, error: result.message });
          reject(result);
        } else {
          setLimitPriceState({ data: result as LimitPriceResult, isLoading: false, error: null });
          resolve(result as LimitPriceResult);
        }
      });

      workerRef.current?.postMessage({
        id,
        type: WorkerMessageType.CALCULATE_LIMIT_PRICE,
        payload: params,
      });
    });
  }, []);

  /**
   * 批量计算涨跌停价格
   */
  const calculateLimitPrices = useCallback((params: LimitPriceParams[]): Promise<LimitPriceResult[]> => {
    return new Promise((resolve, reject) => {
      const id = ++messageIdRef.current;
      pendingCallbacksRef.current.set(id, (result: unknown) => {
        if (result instanceof Error) {
          reject(result);
        } else {
          resolve(result as LimitPriceResult[]);
        }
      });

      workerRef.current?.postMessage({
        id,
        type: WorkerMessageType.CALCULATE_LIMIT_PRICES,
        payload: params,
      });
    });
  }, []);

  /**
   * 计算移动平均线
   */
  const calculateMA = useCallback((params: MAParams): Promise<MAResult> => {
    return new Promise((resolve, reject) => {
      const id = ++messageIdRef.current;
      pendingCallbacksRef.current.set(id, (result: unknown) => {
        if (result instanceof Error) {
          reject(result);
        } else {
          resolve(result as MAResult);
        }
      });

      workerRef.current?.postMessage({
        id,
        type: WorkerMessageType.CALCULATE_MA,
        payload: params,
      });
    });
  }, []);

  /**
   * 计算 RSI 指标
   */
  const calculateRSI = useCallback((params: RSIParams): Promise<RSIResult> => {
    return new Promise((resolve, reject) => {
      const id = ++messageIdRef.current;
      pendingCallbacksRef.current.set(id, (result: unknown) => {
        if (result instanceof Error) {
          reject(result);
        } else {
          resolve(result as RSIResult);
        }
      });

      workerRef.current?.postMessage({
        id,
        type: WorkerMessageType.CALCULATE_RSI,
        payload: params,
      });
    });
  }, []);

  /**
   * 计算布林带
   */
  const calculateBollingerBands = useCallback((params: BollingerBandsParams): Promise<BollingerBandsResult> => {
    return new Promise((resolve, reject) => {
      const id = ++messageIdRef.current;
      pendingCallbacksRef.current.set(id, (result: unknown) => {
        if (result instanceof Error) {
          reject(result);
        } else {
          resolve(result as BollingerBandsResult);
        }
      });

      workerRef.current?.postMessage({
        id,
        type: WorkerMessageType.CALCULATE_BOLLINGER_BANDS,
        payload: params,
      });
    });
  }, []);

  return {
    calculateLimitPrice,
    calculateLimitPrices,
    calculateMA,
    calculateRSI,
    calculateBollingerBands,
    limitPriceResult: limitPriceState.data,
    isLoadingLimitPrice: limitPriceState.isLoading,
    limitPriceError: limitPriceState.error,
  };
}

/**
 * 简化版涨跌停价格计算 Hook
 *
 * @example
 * ```tsx
 * const { upperLimit, lowerLimit, isLoading, error, calculate } = useLimitPriceCalculation();
 *
 * calculate({ prevClose: 100, isST: false });
 * ```
 */
export function useLimitPriceCalculation() {
  const [result, setResult] = useState<LimitPriceResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calculate = useCallback(async (params: LimitPriceParams) => {
    setIsLoading(true);
    setError(null);

    try {
      // 如果 Worker 不可用，使用同步计算作为后备
      if (typeof window === 'undefined') {
        // SSR 环境下直接计算
        const { calculateLimitPriceSync } = await import('@/workers/calculations-sync');
        const syncResult = calculateLimitPriceSync(params);
        setResult(syncResult);
        return syncResult;
      }

      // 使用 Worker 计算
      const { calculateLimitPrice } = await import('@/workers/calculations');
      const workerResult = await calculateLimitPrice(params);
      setResult(workerResult);
      return workerResult;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '计算失败';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    upperLimit: result?.upperLimit,
    lowerLimit: result?.lowerLimit,
    upperLimitPercent: result?.upperLimitPercent,
    lowerLimitPercent: result?.lowerLimitPercent,
    result,
    isLoading,
    error,
    calculate,
  };
}
