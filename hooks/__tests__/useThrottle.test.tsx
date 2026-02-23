/**
 * useThrottle Hook 测试
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useThrottle, useThrottleImmediate } from '../useThrottle';

describe('useThrottle', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('应该在延迟时间内限制函数执行', () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useThrottle(callback, 200));

    // 第一次调用立即执行
    act(() => {
      result.current('first');
    });
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith('first');

    // 在延迟时间内再次调用，不执行
    act(() => {
      result.current('second');
    });
    expect(callback).toHaveBeenCalledTimes(1);

    // 前进 200ms
    act(() => {
      vi.advanceTimersByTime(200);
    });

    // 现在应该执行最后一次调用
    expect(callback).toHaveBeenCalledTimes(2);
    expect(callback).toHaveBeenCalledWith('second');
  });

  it('应该正确处理多次快速调用', () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useThrottle(callback, 100));

    // 快速多次调用
    act(() => {
      result.current('call1');
      result.current('call2');
      result.current('call3');
    });

    // 只有第一次立即执行
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith('call1');

    // 前进 100ms
    act(() => {
      vi.advanceTimersByTime(100);
    });

    // 第二次调用执行（使用 call2 参数，因为是第二次设置定时器时的参数）
    expect(callback).toHaveBeenCalledTimes(2);
    // 注意：当前实现在第二次调用时设置了新的定时器参数
    expect(callback).toHaveBeenLastCalledWith('call2');
  });

  it('应该在节流周期结束后允许新的调用', () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useThrottle(callback, 100));

    // 第一次调用
    act(() => {
      result.current('first');
    });
    expect(callback).toHaveBeenCalledTimes(1);

    // 等待节流周期结束
    act(() => {
      vi.advanceTimersByTime(150);
    });

    // 新的调用应该立即执行
    act(() => {
      result.current('second');
    });
    expect(callback).toHaveBeenCalledTimes(2);
    expect(callback).toHaveBeenCalledWith('second');
  });

  it('应该在组件卸载时清理定时器', () => {
    const callback = vi.fn();
    const { result, unmount } = renderHook(() => useThrottle(callback, 200));

    act(() => {
      result.current('call');
    });

    // 卸载组件
    unmount();

    // 前进时间，不应该执行回调
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(callback).toHaveBeenCalledTimes(1);
  });
});

describe('useThrottleImmediate', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('应该立即执行第一次调用', () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useThrottleImmediate(callback, 200));

    act(() => {
      result.current('first');
    });

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith('first');
  });

  it('应该在节流期间阻止后续调用', () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useThrottleImmediate(callback, 200));

    act(() => {
      result.current('first');
      result.current('second');
      result.current('third');
    });

    expect(callback).toHaveBeenCalledTimes(1);

    // 前进 200ms
    act(() => {
      vi.advanceTimersByTime(200);
    });

    // 现在可以再次调用
    act(() => {
      result.current('fourth');
    });

    expect(callback).toHaveBeenCalledTimes(2);
    expect(callback).toHaveBeenCalledWith('fourth');
  });

  it('应该正确重置节流状态', () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useThrottleImmediate(callback, 100));

    act(() => {
      result.current('first');
    });
    expect(callback).toHaveBeenCalledTimes(1);

    // 等待节流周期结束
    act(() => {
      vi.advanceTimersByTime(150);
    });

    // 应该可以再次调用
    act(() => {
      result.current('second');
    });
    expect(callback).toHaveBeenCalledTimes(2);
  });
});
