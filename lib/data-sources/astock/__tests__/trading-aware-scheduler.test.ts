/**
 * TradingAwareScheduler 单元测试
 *
 * 测试交易时段感知调度器功能
 * @module data-sources/astock/__tests__/trading-aware-scheduler.test
 */

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { TradingAwareScheduler } from '../trading-aware-scheduler';
import { TradingCalendar } from '../trading-calendar';
import { TradingStatusCode } from '../trading-calendar';

// Mock TradingCalendar
vi.mock('../trading-calendar', () => ({
  TradingCalendar: {
    getTradingStatus: vi.fn(),
  },
  TradingStatusCode: {
    TRADING: 'TRADING',
    PRE_MARKET: 'PRE_MARKET',
    LUNCH_BREAK: 'LUNCH_BREAK',
    CLOSED: 'CLOSED',
    HOLIDAY: 'HOLIDAY',
  },
}));

describe('TradingAwareScheduler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('shouldRequest', () => {
    describe('交易时段应允许请求', () => {
      test('TRADING 状态应返回 true', () => {
        vi.mocked(TradingCalendar.getTradingStatus).mockReturnValue({
          status: 'TRADING' as TradingStatusCode,
          session: 'MORNING',
        });

        expect(TradingAwareScheduler.shouldRequest()).toBe(true);
        expect(TradingCalendar.getTradingStatus).toHaveBeenCalledTimes(1);
      });

      test('PRE_MARKET 状态应返回 true', () => {
        vi.mocked(TradingCalendar.getTradingStatus).mockReturnValue({
          status: 'PRE_MARKET' as TradingStatusCode,
          note: '集合竞价中',
        });

        expect(TradingAwareScheduler.shouldRequest()).toBe(true);
      });
    });

    describe('休市时段应暂停请求', () => {
      test('LUNCH_BREAK 状态应返回 false', () => {
        vi.mocked(TradingCalendar.getTradingStatus).mockReturnValue({
          status: 'LUNCH_BREAK' as TradingStatusCode,
          note: '午间休市',
        });

        expect(TradingAwareScheduler.shouldRequest()).toBe(false);
      });

      test('CLOSED 状态应返回 false', () => {
        vi.mocked(TradingCalendar.getTradingStatus).mockReturnValue({
          status: 'CLOSED' as TradingStatusCode,
          note: '休市中',
          nextOpen: new Date(),
        });

        expect(TradingAwareScheduler.shouldRequest()).toBe(false);
      });

      test('HOLIDAY 状态应返回 false', () => {
        vi.mocked(TradingCalendar.getTradingStatus).mockReturnValue({
          status: 'HOLIDAY' as TradingStatusCode,
          note: '法定节假日',
          nextOpen: new Date(),
        });

        expect(TradingAwareScheduler.shouldRequest()).toBe(false);
      });
    });

    describe('默认参数', () => {
      test('不传参数应使用当前时间', () => {
        vi.mocked(TradingCalendar.getTradingStatus).mockReturnValue({
          status: 'TRADING' as TradingStatusCode,
          session: 'MORNING',
        });

        TradingAwareScheduler.shouldRequest();
        expect(TradingCalendar.getTradingStatus).toHaveBeenCalledWith(new Date(), false);
      });
    });
  });

  describe('getRecommendedInterval', () => {
    describe('请求频率配置', () => {
      test('TRADING 状态应返回 3000ms (3秒)', () => {
        vi.mocked(TradingCalendar.getTradingStatus).mockReturnValue({
          status: 'TRADING' as TradingStatusCode,
          session: 'MORNING',
        });

        expect(TradingAwareScheduler.getRecommendedInterval()).toBe(3000);
      });

      test('PRE_MARKET 状态应返回 5000ms (5秒)', () => {
        vi.mocked(TradingCalendar.getTradingStatus).mockReturnValue({
          status: 'PRE_MARKET' as TradingStatusCode,
          note: '集合竞价中',
        });

        expect(TradingAwareScheduler.getRecommendedInterval()).toBe(5000);
      });

      test('LUNCH_BREAK 状态应返回 60000ms (1分钟)', () => {
        vi.mocked(TradingCalendar.getTradingStatus).mockReturnValue({
          status: 'LUNCH_BREAK' as TradingStatusCode,
          note: '午间休市',
        });

        expect(TradingAwareScheduler.getRecommendedInterval()).toBe(60000);
      });

      test('CLOSED 状态应返回 300000ms (5分钟)', () => {
        vi.mocked(TradingCalendar.getTradingStatus).mockReturnValue({
          status: 'CLOSED' as TradingStatusCode,
          note: '休市中',
          nextOpen: new Date(),
        });

        expect(TradingAwareScheduler.getRecommendedInterval()).toBe(300000);
      });

      test('HOLIDAY 状态应返回 600000ms (10分钟)', () => {
        vi.mocked(TradingCalendar.getTradingStatus).mockReturnValue({
          status: 'HOLIDAY' as TradingStatusCode,
          note: '法定节假日',
          nextOpen: new Date(),
        });

        expect(TradingAwareScheduler.getRecommendedInterval()).toBe(600000);
      });
    });

    describe('默认参数', () => {
      test('不传参数应使用当前时间', () => {
        vi.mocked(TradingCalendar.getTradingStatus).mockReturnValue({
          status: 'TRADING' as TradingStatusCode,
          session: 'MORNING',
        });

        TradingAwareScheduler.getRecommendedInterval();
        expect(TradingCalendar.getTradingStatus).toHaveBeenCalledWith(new Date(), false);
      });
    });
  });

  describe('smartDelay', () => {
    describe('延迟行为', () => {
      test('TRADING 状态应延迟 3000ms', async () => {
        vi.mocked(TradingCalendar.getTradingStatus).mockReturnValue({
          status: 'TRADING' as TradingStatusCode,
          session: 'MORNING',
        });

        vi.useFakeTimers();
        const delayPromise = TradingAwareScheduler.smartDelay();

        // 快进 2999ms，Promise 不应完成
        vi.advanceTimersByTime(2999);
        let resolved = false;
        delayPromise.then(() => { resolved = true; });
        await vi.runAllTimersAsync();

        // 快进到 3000ms
        vi.advanceTimersByTime(1);
        await vi.runAllTimersAsync();

        vi.useRealTimers();
      });

      test('PRE_MARKET 状态应延迟 5000ms', async () => {
        vi.mocked(TradingCalendar.getTradingStatus).mockReturnValue({
          status: 'PRE_MARKET' as TradingStatusCode,
          note: '集合竞价中',
        });

        vi.useFakeTimers();
        const delayPromise = TradingAwareScheduler.smartDelay();

        // 快进到 5000ms
        vi.advanceTimersByTime(5000);
        await vi.runAllTimersAsync();

        vi.useRealTimers();
      });

      test('LUNCH_BREAK 状态应延迟 60000ms', async () => {
        vi.mocked(TradingCalendar.getTradingStatus).mockReturnValue({
          status: 'LUNCH_BREAK' as TradingStatusCode,
          note: '午间休市',
        });

        vi.useFakeTimers();
        const delayPromise = TradingAwareScheduler.smartDelay();

        // 快进到 60000ms
        vi.advanceTimersByTime(60000);
        await vi.runAllTimersAsync();

        vi.useRealTimers();
      });

      test('CLOSED 状态应延迟 300000ms', async () => {
        vi.mocked(TradingCalendar.getTradingStatus).mockReturnValue({
          status: 'CLOSED' as TradingStatusCode,
          note: '休市中',
          nextOpen: new Date(),
        });

        vi.useFakeTimers();
        const delayPromise = TradingAwareScheduler.smartDelay();

        // 快进到 300000ms
        vi.advanceTimersByTime(300000);
        await vi.runAllTimersAsync();

        vi.useRealTimers();
      });

      test('HOLIDAY 状态应延迟 600000ms', async () => {
        vi.mocked(TradingCalendar.getTradingStatus).mockReturnValue({
          status: 'HOLIDAY' as TradingStatusCode,
          note: '法定节假日',
          nextOpen: new Date(),
        });

        vi.useFakeTimers();
        const delayPromise = TradingAwareScheduler.smartDelay();

        // 快进到 600000ms
        vi.advanceTimersByTime(600000);
        await vi.runAllTimersAsync();

        vi.useRealTimers();
      });
    });

    describe('默认参数', () => {
      test('不传参数应使用当前时间', async () => {
        vi.mocked(TradingCalendar.getTradingStatus).mockReturnValue({
          status: 'TRADING' as TradingStatusCode,
          session: 'MORNING',
        });

        vi.useFakeTimers();
        TradingAwareScheduler.smartDelay();

        expect(TradingCalendar.getTradingStatus).toHaveBeenCalledWith(new Date(), false);

        vi.advanceTimersByTime(3000);
        await vi.runAllTimersAsync();

        vi.useRealTimers();
      });
    });
  });

  describe('间隔时间映射', () => {
    test('所有交易状态都应有对应的间隔时间', () => {
      const statuses: TradingStatusCode[] = [
        'TRADING',
        'PRE_MARKET',
        'LUNCH_BREAK',
        'CLOSED',
        'HOLIDAY',
      ];

      const expectedIntervals = {
        TRADING: 3000,
        PRE_MARKET: 5000,
        LUNCH_BREAK: 60000,
        CLOSED: 300000,
        HOLIDAY: 600000,
      };

      for (const status of statuses) {
        vi.mocked(TradingCalendar.getTradingStatus).mockReturnValue({
          status,
          note: '测试',
        });

        const interval = TradingAwareScheduler.getRecommendedInterval();
        expect(interval).toBe(expectedIntervals[status]);
      }
    });
  });

  describe('请求暂停映射', () => {
    test('应正确映射哪些状态暂停请求', () => {
      const pauseCases: Array<{ status: TradingStatusCode; shouldPause: boolean }> = [
        { status: 'TRADING', shouldPause: false },
        { status: 'PRE_MARKET', shouldPause: false },
        { status: 'LUNCH_BREAK', shouldPause: true },
        { status: 'CLOSED', shouldPause: true },
        { status: 'HOLIDAY', shouldPause: true },
      ];

      for (const { status, shouldPause } of pauseCases) {
        vi.mocked(TradingCalendar.getTradingStatus).mockReturnValue({
          status,
          note: '测试',
        });

        const result = TradingAwareScheduler.shouldRequest();
        expect(result).toBe(!shouldPause);
      }
    });
  });

  describe('边界情况', () => {
    test('应处理 TradingCalendar 返回 undefined 的状态', () => {
      vi.mocked(TradingCalendar.getTradingStatus).mockReturnValue({
        status: 'CLOSED' as TradingStatusCode,
        note: '默认收市',
      });

      expect(TradingAwareScheduler.shouldRequest()).toBe(false);
      expect(TradingAwareScheduler.getRecommendedInterval()).toBe(300000);
    });

    test('所有方法都应正确处理 Date 参数', () => {
      const testDate = new Date('2026-02-24T10:00:00+08:00');
      vi.mocked(TradingCalendar.getTradingStatus).mockReturnValue({
        status: 'TRADING' as TradingStatusCode,
        session: 'MORNING',
      });

      TradingAwareScheduler.shouldRequest(testDate);
      TradingAwareScheduler.getRecommendedInterval(testDate);

      expect(TradingCalendar.getTradingStatus).toHaveBeenCalledTimes(2);
      expect(TradingCalendar.getTradingStatus).toHaveBeenLastCalledWith(testDate, false);
    });
  });

  describe('性能考虑', () => {
    test('应避免重复调用 TradingCalendar.getTradingStatus', () => {
      vi.mocked(TradingCalendar.getTradingStatus).mockReturnValue({
        status: 'TRADING' as TradingStatusCode,
        session: 'MORNING',
      });

      // 连续调用应每次都获取最新状态
      TradingAwareScheduler.shouldRequest();
      TradingAwareScheduler.shouldRequest();

      expect(TradingCalendar.getTradingStatus).toHaveBeenCalledTimes(2);
    });
  });

  describe('集成场景', () => {
    test('模拟一天中的不同时段', () => {
      const scenarios = [
        { hour: 9, minute: 20, expectedInterval: 5000, shouldRequest: true },    // 集合竞价
        { hour: 10, minute: 0, expectedInterval: 3000, shouldRequest: true },    // 上午交易
        { hour: 12, minute: 0, expectedInterval: 60000, shouldRequest: false },  // 午间休市
        { hour: 14, minute: 0, expectedInterval: 3000, shouldRequest: true },    // 下午交易
        { hour: 18, minute: 0, expectedInterval: 300000, shouldRequest: false }, // 收市后
      ];

      for (const scenario of scenarios) {
        const testDate = new Date(`2026-02-24T${scenario.hour}:${scenario.minute}:00+08:00`);
        vi.mocked(TradingCalendar.getTradingStatus).mockReturnValue({
          status: getMockStatus(scenario.hour, scenario.minute) as TradingStatusCode,
          note: '测试',
        });

        const interval = TradingAwareScheduler.getRecommendedInterval(testDate);
        const shouldReq = TradingAwareScheduler.shouldRequest(testDate);

        expect(interval).toBe(scenario.expectedInterval);
        expect(shouldReq).toBe(scenario.shouldRequest);
      }
    });
  });
});

/**
 * 辅助函数：根据小时和分钟返回模拟的交易状态
 */
function getMockStatus(hour: number, minute: number): string {
  if (hour === 9 && minute >= 15 && minute <= 25) return 'PRE_MARKET';
  if ((hour === 9 && minute >= 30) || (hour === 10) || (hour === 11 && minute <= 30)) return 'TRADING';
  if (hour === 11 && minute > 30) return 'LUNCH_BREAK';
  if (hour === 12 || (hour === 13 && minute === 0)) return 'LUNCH_BREAK';
  if (hour >= 13 && hour < 15) return 'TRADING';
  return 'CLOSED';
}
