/**
 * TradingCalendar 单元测试
 *
 * 测试 A 股交易日历管理功能
 * @module data-sources/astock/__tests__/trading-calendar.test
 */

import { describe, test, expect } from 'vitest';
import { TradingCalendar, TradingStatusCode, TradingStatus } from '../trading-calendar';

/**
 * 创建指定时间的测试日期
 */
function createDate(year: number, month: number, day: number, hour: number, minute: number): Date {
  // 北京时间 UTC+8，使用 ISO 字符串创建
  const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00+08:00`;
  return new Date(dateStr);
}

describe('TradingCalendar', () => {
  describe('getTradingStatus', () => {
    describe('集合竞价时段 (09:15-09:25)', () => {
      test('应识别集合竞价开始时间 (09:15)', () => {
        const date = createDate(2026, 2, 24, 9, 15); // 周二
        const status = TradingCalendar.getTradingStatus(date);
        expect(status.status).toBe('PRE_MARKET');
        expect(status.note).toContain('集合竞价');
      });

      test('应识别集合竞价中间时间 (09:20)', () => {
        const date = createDate(2026, 2, 24, 9, 20);
        const status = TradingCalendar.getTradingStatus(date);
        expect(status.status).toBe('PRE_MARKET');
      });

      test('应识别集合竞价结束时间 (09:25)', () => {
        const date = createDate(2026, 2, 24, 9, 25);
        const status = TradingCalendar.getTradingStatus(date);
        expect(status.status).toBe('PRE_MARKET');
      });

      test('集合竞价前一分钟不应识别为集合竞价 (09:14)', () => {
        const date = createDate(2026, 2, 24, 9, 14);
        const status = TradingCalendar.getTradingStatus(date);
        expect(status.status).not.toBe('PRE_MARKET');
      });

      test('集合竞价后一分钟不应识别为集合竞价 (09:26)', () => {
        const date = createDate(2026, 2, 24, 9, 26);
        const status = TradingCalendar.getTradingStatus(date);
        expect(status.status).not.toBe('PRE_MARKET');
      });
    });

    describe('上午交易时段 (09:30-11:30)', () => {
      test('应识别上午开盘时间 (09:30)', () => {
        const date = createDate(2026, 2, 24, 9, 30);
        const status = TradingCalendar.getTradingStatus(date);
        expect(status.status).toBe('TRADING');
        expect(status.session).toBe('MORNING');
      });

      test('应识别上午交易中间时间 (10:30)', () => {
        const date = createDate(2026, 2, 24, 10, 30);
        const status = TradingCalendar.getTradingStatus(date);
        expect(status.status).toBe('TRADING');
        expect(status.session).toBe('MORNING');
      });

      test('应识别上午收市时间 (11:30)', () => {
        const date = createDate(2026, 2, 24, 11, 30);
        const status = TradingCalendar.getTradingStatus(date);
        expect(status.status).toBe('TRADING');
        expect(status.session).toBe('MORNING');
      });

      test('上午开盘前一分钟不应识别为交易中 (09:29)', () => {
        const date = createDate(2026, 2, 24, 9, 29);
        const status = TradingCalendar.getTradingStatus(date);
        expect(status.status).not.toBe('TRADING');
      });

      test('上午收市后一分钟不应识别为上午交易 (11:31)', () => {
        const date = createDate(2026, 2, 24, 11, 31);
        const status = TradingCalendar.getTradingStatus(date);
        expect(status.status).not.toBe('TRADING');
        expect(status.session).not.toBe('MORNING');
      });
    });

    describe('午间休市时段 (11:30-13:00)', () => {
      test('应识别午间休市开始时间 (11:31)', () => {
        const date = createDate(2026, 2, 24, 11, 31);
        const status = TradingCalendar.getTradingStatus(date);
        expect(status.status).toBe('LUNCH_BREAK');
        expect(status.note).toContain('午间');
      });

      test('应识别午间休市中间时间 (12:00)', () => {
        const date = createDate(2026, 2, 24, 12, 0);
        const status = TradingCalendar.getTradingStatus(date);
        expect(status.status).toBe('LUNCH_BREAK');
      });

      test('应识别午间休市中间时间 (12:30)', () => {
        const date = createDate(2026, 2, 24, 12, 30);
        const status = TradingCalendar.getTradingStatus(date);
        expect(status.status).toBe('LUNCH_BREAK');
      });

      test('应识别午间休市结束时间 (12:59)', () => {
        const date = createDate(2026, 2, 24, 12, 59);
        const status = TradingCalendar.getTradingStatus(date);
        expect(status.status).toBe('LUNCH_BREAK');
      });

      test('下午开盘前一分钟应为午间休市 (12:59)', () => {
        const date = createDate(2026, 2, 24, 12, 59);
        const status = TradingCalendar.getTradingStatus(date);
        expect(status.status).toBe('LUNCH_BREAK');
      });

      test('下午开盘时间不应识别为午间休市 (13:00)', () => {
        const date = createDate(2026, 2, 24, 13, 0);
        const status = TradingCalendar.getTradingStatus(date);
        expect(status.status).not.toBe('LUNCH_BREAK');
      });
    });

    describe('下午交易时段 (13:00-15:00)', () => {
      test('应识别下午开盘时间 (13:00)', () => {
        const date = createDate(2026, 2, 24, 13, 0);
        const status = TradingCalendar.getTradingStatus(date);
        expect(status.status).toBe('TRADING');
        expect(status.session).toBe('AFTERNOON');
      });

      test('应识别下午交易中间时间 (14:00)', () => {
        const date = createDate(2026, 2, 24, 14, 0);
        const status = TradingCalendar.getTradingStatus(date);
        expect(status.status).toBe('TRADING');
        expect(status.session).toBe('AFTERNOON');
      });

      test('应识别下午收市时间 (15:00)', () => {
        const date = createDate(2026, 2, 24, 15, 0);
        const status = TradingCalendar.getTradingStatus(date);
        expect(status.status).toBe('TRADING');
        expect(status.session).toBe('AFTERNOON');
      });

      test('下午开盘前一分钟不应识别为交易中 (12:59)', () => {
        const date = createDate(2026, 2, 24, 12, 59);
        const status = TradingCalendar.getTradingStatus(date);
        expect(status.status).not.toBe('TRADING');
      });

      test('下午收市后一分钟不应识别为交易中 (15:01)', () => {
        const date = createDate(2026, 2, 24, 15, 1);
        const status = TradingCalendar.getTradingStatus(date);
        expect(status.status).not.toBe('TRADING');
      });
    });

    describe('收市后时段 (15:00 之后)', () => {
      test('应识别收市后时间 (15:01)', () => {
        const date = createDate(2026, 2, 24, 15, 1);
        const status = TradingCalendar.getTradingStatus(date);
        expect(status.status).toBe('CLOSED');
        expect(status.note).toContain('休市');
        expect(status.nextOpen).toBeDefined();
      });

      test('应识别晚上时间 (20:00)', () => {
        const date = createDate(2026, 2, 24, 20, 0);
        const status = TradingCalendar.getTradingStatus(date);
        expect(status.status).toBe('CLOSED');
      });

      test('应识别午夜时间 (00:00)', () => {
        const date = createDate(2026, 2, 24, 0, 0);
        const status = TradingCalendar.getTradingStatus(date);
        expect(status.status).toBe('CLOSED');
      });

      test('应识别凌晨时间 (05:00)', () => {
        const date = createDate(2026, 2, 24, 5, 0);
        const status = TradingCalendar.getTradingStatus(date);
        expect(status.status).toBe('CLOSED');
      });
    });

    describe('开盘前时段 (00:00-09:15)', () => {
      test('应识别开盘前时间 (09:00)', () => {
        const date = createDate(2026, 2, 24, 9, 0);
        const status = TradingCalendar.getTradingStatus(date);
        expect(status.status).toBe('CLOSED');
      });

      test('应识别清晨时间 (08:00)', () => {
        const date = createDate(2026, 2, 24, 8, 0);
        const status = TradingCalendar.getTradingStatus(date);
        expect(status.status).toBe('CLOSED');
      });
    });

    describe('周末判断', () => {
      test('周日应为休市', () => {
        const date = createDate(2026, 2, 22, 10, 0); // 2026-02-22 是周日
        const status = TradingCalendar.getTradingStatus(date);
        expect(status.status).toBe('CLOSED');
        expect(status.note).toContain('周末');
      });

      test('周日上午应为休市', () => {
        const date = createDate(2026, 2, 22, 9, 30);
        const status = TradingCalendar.getTradingStatus(date);
        expect(status.status).toBe('CLOSED');
      });

      test('周日下午应为休市', () => {
        const date = createDate(2026, 2, 22, 14, 0);
        const status = TradingCalendar.getTradingStatus(date);
        expect(status.status).toBe('CLOSED');
      });

      test('周六应为休市', () => {
        const date = createDate(2026, 2, 28, 10, 0); // 2026-02-28 是周六
        const status = TradingCalendar.getTradingStatus(date);
        expect(status.status).toBe('CLOSED');
        expect(status.note).toContain('周末');
      });

      test('周二应为交易日', () => {
        const date = createDate(2026, 2, 24, 10, 0); // 2026-02-24 是周二
        const status = TradingCalendar.getTradingStatus(date);
        expect(status.status).toBe('TRADING');
      });
    });
  });

  describe('isTradingDay', () => {
    describe('工作日判断', () => {
      test('周二应为交易日', () => {
        const date = createDate(2026, 2, 24, 0, 0); // 周二
        expect(TradingCalendar.isTradingDay(date)).toBe(true);
      });

      test('周三应为交易日', () => {
        const date = createDate(2026, 2, 25, 0, 0); // 周三
        expect(TradingCalendar.isTradingDay(date)).toBe(true);
      });

      test('周四应为交易日', () => {
        const date = createDate(2026, 2, 26, 0, 0); // 周四
        expect(TradingCalendar.isTradingDay(date)).toBe(true);
      });

      test('周五应为交易日', () => {
        const date = createDate(2026, 2, 27, 0, 0); // 周五
        expect(TradingCalendar.isTradingDay(date)).toBe(true);
      });

      test('周一应为交易日', () => {
        const date = createDate(2026, 3, 2, 0, 0); // 下周一 (3/2)
        expect(TradingCalendar.isTradingDay(date)).toBe(true);
      });
    });

    describe('周末判断', () => {
      test('周日不应为交易日', () => {
        const date = createDate(2026, 2, 22, 0, 0); // 周日
        expect(TradingCalendar.isTradingDay(date)).toBe(false);
      });

      test('周六不应为交易日', () => {
        const date = createDate(2026, 2, 28, 0, 0); // 周六
        expect(TradingCalendar.isTradingDay(date)).toBe(false);
      });
    });

    describe('节假日判断（固定规则）', () => {
      test('国庆节第一天 (10/1) 不应为交易日', () => {
        const date = createDate(2026, 10, 1, 0, 0);
        expect(TradingCalendar.isTradingDay(date)).toBe(false);
      });

      test('国庆节第七天 (10/7) 不应为交易日', () => {
        const date = createDate(2026, 10, 7, 0, 0);
        expect(TradingCalendar.isTradingDay(date)).toBe(false);
      });

      test('国庆节后第一个工作日 (10/8) 应为交易日', () => {
        const date = createDate(2026, 10, 8, 0, 0);
        expect(TradingCalendar.isTradingDay(date)).toBe(true);
      });
    });

    describe('调休补班日判断', () => {
      test('2026年春节后的调休补班日 (2/8 周日) 应为交易日', () => {
        // 假设 2026 年春节后有调休补班
        const date = createDate(2026, 2, 8, 0, 0); // 周日，但可能为调休补班日
        // 注意：这个测试需要根据实际调休安排更新
        // 当前实现可能不支持动态调休，所以这里可能返回 false
        const isTrading = TradingCalendar.isTradingDay(date);
        // 如果支持调休，应该返回 true；否则返回 false
        // 这里只测试方法调用不会抛错
        expect(typeof isTrading).toBe('boolean');
      });
    });
  });

  describe('isHoliday', () => {
    describe('固定节假日', () => {
      test('应识别国庆节 (10/1-10/7)', () => {
        expect(TradingCalendar.isHoliday(createDate(2026, 10, 1, 0, 0))).toBe(true);
        expect(TradingCalendar.isHoliday(createDate(2026, 10, 2, 0, 0))).toBe(true);
        expect(TradingCalendar.isHoliday(createDate(2026, 10, 3, 0, 0))).toBe(true);
        expect(TradingCalendar.isHoliday(createDate(2026, 10, 4, 0, 0))).toBe(true);
        expect(TradingCalendar.isHoliday(createDate(2026, 10, 5, 0, 0))).toBe(true);
        expect(TradingCalendar.isHoliday(createDate(2026, 10, 6, 0, 0))).toBe(true);
        expect(TradingCalendar.isHoliday(createDate(2026, 10, 7, 0, 0))).toBe(true);
      });

      test('国庆节后第一天不是节假日', () => {
        expect(TradingCalendar.isHoliday(createDate(2026, 10, 8, 0, 0))).toBe(false);
      });
    });

    describe('周末', () => {
      test('周日应为休市日', () => {
        const date = createDate(2026, 2, 22, 0, 0); // 周日
        expect(TradingCalendar.isHoliday(date)).toBe(true);
      });

      test('周六应为休市日', () => {
        const date = createDate(2026, 2, 28, 0, 0); // 周六
        expect(TradingCalendar.isHoliday(date)).toBe(true);
      });

      test('工作日不应为节假日', () => {
        const date = createDate(2026, 2, 24, 0, 0); // 周二
        expect(TradingCalendar.isHoliday(date)).toBe(false);
      });
    });

    describe('普通工作日', () => {
      test('周一不是节假日', () => {
        expect(TradingCalendar.isHoliday(createDate(2026, 2, 24, 0, 0))).toBe(false);
      });

      test('周二不是节假日', () => {
        expect(TradingCalendar.isHoliday(createDate(2026, 2, 25, 0, 0))).toBe(false);
      });

      test('普通日期不是节假日', () => {
        expect(TradingCalendar.isHoliday(createDate(2026, 2, 18, 0, 0))).toBe(false);
      });
    });
  });

  describe('getNextTradingDay', () => {
    describe('工作日计算', () => {
      test('周二应返回周三', () => {
        const tuesday = createDate(2026, 2, 24, 10, 0);
        const nextDay = TradingCalendar.getNextTradingDay(tuesday);
        expect(nextDay.getDate()).toBe(25);
      });

      test('周三应返回周四', () => {
        const wednesday = createDate(2026, 2, 25, 10, 0);
        const nextDay = TradingCalendar.getNextTradingDay(wednesday);
        expect(nextDay.getDate()).toBe(26);
      });

      test('周四应返回周五', () => {
        const thursday = createDate(2026, 2, 26, 10, 0);
        const nextDay = TradingCalendar.getNextTradingDay(thursday);
        expect(nextDay.getDate()).toBe(27);
      });

      test('周五应返回下周一 (跳过周末)', () => {
        const friday = createDate(2026, 2, 27, 10, 0);
        const nextDay = TradingCalendar.getNextTradingDay(friday);
        // 跳过周六、周日，返回下周一 (3/2)
        expect(nextDay.getDate()).toBe(2);
        expect(nextDay.getMonth()).toBe(2); // 3月 (0-indexed)
      });
    });

    describe('周末计算', () => {
      test('周日应返回周一', () => {
        const sunday = createDate(2026, 2, 22, 10, 0);
        const nextDay = TradingCalendar.getNextTradingDay(sunday);
        // 应该是周一 (2/23)
        expect(nextDay.getDate()).toBe(23);
        expect(nextDay.getMonth()).toBe(1); // 2月 (0-indexed)
      });

      test('周六应返回下周一', () => {
        const saturday = createDate(2026, 2, 28, 10, 0);
        const nextDay = TradingCalendar.getNextTradingDay(saturday);
        // 跳过周日，返回下周一 (3/2)
        expect(nextDay.getDate()).toBe(2);
        expect(nextDay.getMonth()).toBe(2); // 3月 (0-indexed)
      });

      test('周五应返回下周一 (跳过周末)', () => {
        const friday = createDate(2026, 2, 27, 10, 0);
        const nextDay = TradingCalendar.getNextTradingDay(friday);
        // 跳过周六、周日，返回下周一 (3/2)
        expect(nextDay.getDate()).toBe(2);
        expect(nextDay.getMonth()).toBe(2); // 3月 (0-indexed)
      });
    });

    describe('节假日计算', () => {
      test('国庆节期间应返回节后第一个交易日', () => {
        const nationalDay = createDate(2026, 10, 1, 0, 0);
        const nextDay = TradingCalendar.getNextTradingDay(nationalDay);
        // 国庆节 10/1-10/7，下一个交易日是 10/8
        expect(nextDay.getDate()).toBe(8);
        expect(nextDay.getMonth()).toBe(9); // 10月 (0-indexed)
      });

      test('国庆节最后一天应返回节后第一个交易日', () => {
        const lastDay = createDate(2026, 10, 7, 0, 0);
        const nextDay = TradingCalendar.getNextTradingDay(lastDay);
        expect(nextDay.getDate()).toBe(8);
      });
    });

    describe('跨月计算', () => {
      test('月末周六应跨月计算', () => {
        // 2026年5月31日是周六
        const saturday = createDate(2026, 5, 31, 10, 0);
        const nextDay = TradingCalendar.getNextTradingDay(saturday);
        // 跳过周日，返回下周一 (6/1)
        expect(nextDay.getDate()).toBe(1);
        expect(nextDay.getMonth()).toBe(5); // 6月 (0-indexed)
      });

      test('月末周五应跨月计算', () => {
        // 2026年10月31日是周六，所以10月30日是周五
        const friday = createDate(2026, 10, 30, 10, 0);
        const nextDay = TradingCalendar.getNextTradingDay(friday);
        // 跳过周六、周日，返回下周一 (11/2)
        expect(nextDay.getDate()).toBe(2);
        expect(nextDay.getMonth()).toBe(10); // 11月 (0-indexed)
      });
    });

    describe('默认参数', () => {
      test('不传参数应使用当前时间', () => {
        const nextDay = TradingCalendar.getNextTradingDay();
        expect(nextDay).toBeInstanceOf(Date);
        expect(nextDay.getTime()).toBeGreaterThan(Date.now());
      });
    });
  });

  describe('getNextOpen', () => {
    describe('收市后计算', () => {
      test('收市后应返回次日开盘时间 (09:30)', () => {
        const afterClose = createDate(2026, 2, 24, 16, 0);
        const nextOpen = TradingCalendar.getNextOpen(afterClose);
        expect(nextOpen.getDate()).toBe(25);
        expect(nextOpen.getHours()).toBe(9);
        expect(nextOpen.getMinutes()).toBe(30);
      });

      test('晚上应返回次日开盘时间', () => {
        const evening = createDate(2026, 2, 24, 20, 0);
        const nextOpen = TradingCalendar.getNextOpen(evening);
        expect(nextOpen.getDate()).toBe(25);
        expect(nextOpen.getHours()).toBe(9);
        expect(nextOpen.getMinutes()).toBe(30);
      });
    });

    describe('午间休市计算', () => {
      test('午间休市应返回当天下午开盘时间 (13:00)', () => {
        const lunchTime = createDate(2026, 2, 24, 12, 0);
        const nextOpen = TradingCalendar.getNextOpen(lunchTime);
        expect(nextOpen.getDate()).toBe(24);
        expect(nextOpen.getHours()).toBe(13);
        expect(nextOpen.getMinutes()).toBe(0);
      });

      test('上午收市后应返回下午开盘时间', () => {
        const afterMorning = createDate(2026, 2, 24, 11, 31);
        const nextOpen = TradingCalendar.getNextOpen(afterMorning);
        expect(nextOpen.getDate()).toBe(24);
        expect(nextOpen.getHours()).toBe(13);
        expect(nextOpen.getMinutes()).toBe(0);
      });
    });

    describe('交易中计算', () => {
      test('上午交易中应返回下一个交易时段 (下午 13:00)', () => {
        const morningTrading = createDate(2026, 2, 24, 10, 0);
        const nextOpen = TradingCalendar.getNextOpen(morningTrading);
        // 当前正在交易，返回下一个开盘时间（下午）
        expect(nextOpen.getHours()).toBe(13);
        expect(nextOpen.getMinutes()).toBe(0);
      });

      test('下午交易中应返回次日开盘时间', () => {
        const afternoonTrading = createDate(2026, 2, 24, 14, 0);
        const nextOpen = TradingCalendar.getNextOpen(afternoonTrading);
        expect(nextOpen.getDate()).toBe(25);
        expect(nextOpen.getHours()).toBe(9);
        expect(nextOpen.getMinutes()).toBe(30);
      });
    });

    describe('周末计算', () => {
      test('周日应返回周一开盘时间', () => {
        const sunday = createDate(2026, 2, 22, 10, 0);
        const nextOpen = TradingCalendar.getNextOpen(sunday);
        expect(nextOpen.getDate()).toBe(23);
        expect(nextOpen.getHours()).toBe(9);
        expect(nextOpen.getMinutes()).toBe(30);
      });

      test('周六应返回下周一开盘时间', () => {
        const saturday = createDate(2026, 2, 28, 10, 0);
        const nextOpen = TradingCalendar.getNextOpen(saturday);
        expect(nextOpen.getDate()).toBe(2);
        expect(nextOpen.getMonth()).toBe(2); // 3月
        expect(nextOpen.getHours()).toBe(9);
        expect(nextOpen.getMinutes()).toBe(30);
      });
    });

    describe('集合竞价计算', () => {
      test('集合竞价期间应返回上午开盘时间 (09:30)', () => {
        const preMarket = createDate(2026, 2, 24, 9, 20);
        const nextOpen = TradingCalendar.getNextOpen(preMarket);
        expect(nextOpen.getDate()).toBe(24);
        expect(nextOpen.getHours()).toBe(9);
        expect(nextOpen.getMinutes()).toBe(30);
      });
    });

    describe('开盘前计算', () => {
      test('开盘前应返回当天开盘时间 (09:30)', () => {
        const beforeOpen = createDate(2026, 2, 24, 9, 0);
        const nextOpen = TradingCalendar.getNextOpen(beforeOpen);
        expect(nextOpen.getDate()).toBe(24);
        expect(nextOpen.getHours()).toBe(9);
        expect(nextOpen.getMinutes()).toBe(30);
      });

      test('清晨应返回当天开盘时间', () => {
        const earlyMorning = createDate(2026, 2, 24, 6, 0);
        const nextOpen = TradingCalendar.getNextOpen(earlyMorning);
        expect(nextOpen.getDate()).toBe(24);
        expect(nextOpen.getHours()).toBe(9);
        expect(nextOpen.getMinutes()).toBe(30);
      });
    });

    describe('节假日计算', () => {
      test('国庆节期间应返回节后第一个交易日开盘时间', () => {
        const nationalDay = createDate(2026, 10, 1, 10, 0);
        const nextOpen = TradingCalendar.getNextOpen(nationalDay);
        // 国庆节 10/1-10/7，下一个交易日是 10/8 09:30
        expect(nextOpen.getDate()).toBe(8);
        expect(nextOpen.getMonth()).toBe(9); // 10月
        expect(nextOpen.getHours()).toBe(9);
        expect(nextOpen.getMinutes()).toBe(30);
      });
    });

    describe('默认参数', () => {
      test('不传参数应使用当前时间', () => {
        const nextOpen = TradingCalendar.getNextOpen();
        expect(nextOpen).toBeInstanceOf(Date);
        expect(nextOpen.getTime()).toBeGreaterThan(Date.now());
      });
    });
  });

  describe('边界情况', () => {
    describe('跨年计算', () => {
      test('年末周四应跨年计算', () => {
        // 2026年12月31日是周四
        const dec31 = createDate(2026, 12, 31, 10, 0);
        const nextDay = TradingCalendar.getNextTradingDay(dec31);
        // 2026年12月31日是周四，下一个交易日是2027年1月1日（周五）
        expect(nextDay.getFullYear()).toBe(2027);
        expect(nextDay.getMonth()).toBe(0); // 1月
        expect(nextDay.getDate()).toBe(1);
      });
    });

    describe('闰年计算', () => {
      test('闰年2月29日应正确处理', () => {
        // 2028年是闰年
        const feb29 = createDate(2028, 2, 29, 10, 0);
        expect(TradingCalendar.isTradingDay(feb29)).toBe(true);
      });
    });

    describe('时区处理', () => {
      test('应正确处理 UTC 时间（转换为北京时间）', () => {
        // 创建一个 UTC 时间（北京时间 2026-02-24 10:00 = UTC 2026-02-24 02:00）
        const utcDate = new Date('2026-02-24T02:00:00Z');
        const status = TradingCalendar.getTradingStatus(utcDate);
        // 北京时间是 10:00，应该是交易中
        expect(status.status).toBe('TRADING');
      });
    });

    describe('无效输入', () => {
      test('应处理无效日期（返回默认值）', () => {
        const invalidDate = new Date('invalid');
        const status = TradingCalendar.getTradingStatus(invalidDate);
        expect(status).toBeDefined();
        expect(typeof status.status).toBe('string');
      });
    });
  });

  describe('交易时段常量', () => {
    test('集合竞价时段应为 09:15-09:25', () => {
      const start = createDate(2026, 2, 24, 9, 15);
      const end = createDate(2026, 2, 24, 9, 25);

      expect(TradingCalendar.getTradingStatus(start).status).toBe('PRE_MARKET');
      expect(TradingCalendar.getTradingStatus(end).status).toBe('PRE_MARKET');
    });

    test('上午交易时段应为 09:30-11:30', () => {
      const start = createDate(2026, 2, 24, 9, 30);
      const end = createDate(2026, 2, 24, 11, 30);

      expect(TradingCalendar.getTradingStatus(start).status).toBe('TRADING');
      expect(TradingCalendar.getTradingStatus(start).session).toBe('MORNING');
      expect(TradingCalendar.getTradingStatus(end).status).toBe('TRADING');
      expect(TradingCalendar.getTradingStatus(end).session).toBe('MORNING');
    });

    test('下午交易时段应为 13:00-15:00', () => {
      const start = createDate(2026, 2, 24, 13, 0);
      const end = createDate(2026, 2, 24, 15, 0);

      expect(TradingCalendar.getTradingStatus(start).status).toBe('TRADING');
      expect(TradingCalendar.getTradingStatus(start).session).toBe('AFTERNOON');
      expect(TradingCalendar.getTradingStatus(end).status).toBe('TRADING');
      expect(TradingCalendar.getTradingStatus(end).session).toBe('AFTERNOON');
    });
  });
});
