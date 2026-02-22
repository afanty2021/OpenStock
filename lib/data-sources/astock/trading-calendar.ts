/**
 * A 股交易日历管理模块
 *
 * 提供交易时段判断、交易日判断、休市检测和下一交易日计算功能
 * @module data-sources/astock/trading-calendar
 */

/**
 * 交易状态代码
 *
 * 表示 A 股市场的各种交易状态
 */
export type TradingStatusCode =
  | 'TRADING'      // 交易中
  | 'PRE_MARKET'   // 集合竞价
  | 'LUNCH_BREAK'  // 午间休市
  | 'CLOSED'       // 收市后
  | 'HOLIDAY';     // 法定节假日

/**
 * 交易时段标识
 *
 * 用于区分上午和下午交易时段
 */
export type TradingSession = 'MORNING' | 'AFTERNOON';

/**
 * 交易状态信息
 *
 * 包含当前交易状态的详细信息
 */
export interface TradingStatus {
  /** 交易状态代码 */
  status: TradingStatusCode;
  /** 交易时段（仅在交易中时有值） */
  session?: TradingSession;
  /** 状态说明备注 */
  note?: string;
  /** 下一个开盘时间（仅在休市时有值） */
  nextOpen?: Date;
}

/**
 * 交易时段常量（分钟数）
 *
 * 使用分钟数表示一天的各个交易时段，便于比较计算
 * 一天有 24 * 60 = 1440 分钟
 */
const SESSIONS = {
  /** 集合竞价: 09:15-09:25 */
  PRE_MARKET: { start: 9 * 60 + 15, end: 9 * 60 + 25 },
  /** 上午交易: 09:30-11:30 */
  MORNING: { start: 9 * 60 + 30, end: 11 * 60 + 30 },
  /** 下午交易: 13:00-15:00 */
  AFTERNOON: { start: 13 * 60, end: 15 * 60 },
} as const;

/**
 * 周末日（dayOfWeek 值）
 *
 * JavaScript Date.getDay() 返回值：
 * - 0 = 周日
 * - 1 = 周一
 * - ...
 * - 6 = 周六
 */
const WEEKEND = [0, 6];

/**
 * 固定节假日规则（月份-日期）
 *
 * 第一阶段实现：支持国庆节等固定日期节假日
 * 未来可扩展支持春节等农历节假日
 */
const FIXED_HOLIDAYS = [
  // 国庆节：10月1日-10月7日
  { month: 10, day: 1, name: '国庆节' },
  { month: 10, day: 2, name: '国庆节' },
  { month: 10, day: 3, name: '国庆节' },
  { month: 10, day: 4, name: '国庆节' },
  { month: 10, day: 5, name: '国庆节' },
  { month: 10, day: 6, name: '国庆节' },
  { month: 10, day: 7, name: '国庆节' },
] as const;

/**
 * 时区偏移量（北京时间 UTC+8）
 *
 * 用于处理本地时间与 UTC 时间的转换
 */
const CHINA_TIMEZONE_OFFSET = 8; // UTC+8

/**
 * A 股交易日历管理类
 *
 * 提供以下功能：
 * - 获取当前交易时段状态
 * - 判断是否为交易日
 * - 判断是否为休市日
 * - 获取下一个交易日
 * - 获取下一个开盘时间
 *
 * @example
 * ```ts
 * import { TradingCalendar } from '@/lib/data-sources/astock';
 *
 * // 获取当前交易状态
 * const status = TradingCalendar.getTradingStatus();
 * console.log(status.status); // 'TRADING'
 * console.log(status.session); // 'MORNING'
 *
 * // 判断是否为交易日
 * const isTrading = TradingCalendar.isTradingDay(new Date());
 *
 * // 获取下一个开盘时间
 * const nextOpen = TradingCalendar.getNextOpen();
 * ```
 */
export class TradingCalendar {
  /**
   * 获取当前交易时段状态
   *
   * 根据给定时间判断 A 股市场的交易状态
   *
   * @param date - 要检查的日期时间，默认为当前时间
   * @returns 交易状态信息
   *
   * @example
   * ```ts
   * const status = TradingCalendar.getTradingStatus(new Date('2026-02-24T10:00:00+08:00'));
   * console.log(status.status); // 'TRADING'
   * console.log(status.session); // 'MORNING'
   * ```
   */
  static getTradingStatus(date: Date = new Date(), computeNextOpen: boolean = true): TradingStatus {
    // 验证日期有效性
    if (!(date instanceof Date) || isNaN(date.getTime())) {
      return {
        status: 'CLOSED',
        note: '无效日期',
        nextOpen: computeNextOpen ? this.getNextDayOpenTime(new Date()) : undefined,
      };
    }

    // 检查是否为休市日（周末或节假日）
    const isWeekendOrHoliday = this.isHoliday(date);

    // 获取当前时间的分钟数（基于 00:00）
    const hour = date.getHours();
    const minute = date.getMinutes();
    const currentTime = hour * 60 + minute;

    // 如果是周末或节假日，提前返回避免递归
    if (isWeekendOrHoliday) {
      const nextOpen = computeNextOpen ? this.getNextDayOpenTime(date) : undefined;
      const dayOfWeek = date.getDay();
      if (WEEKEND.includes(dayOfWeek)) {
        return {
          status: 'CLOSED',
          note: '周末休市',
          nextOpen,
        };
      }
      return {
        status: 'HOLIDAY',
        note: '法定节假日',
        nextOpen,
      };
    }

    // 判断集合竞价时段 (09:15-09:25)
    if (currentTime >= SESSIONS.PRE_MARKET.start && currentTime <= SESSIONS.PRE_MARKET.end) {
      return {
        status: 'PRE_MARKET',
        note: '集合竞价中',
      };
    }

    // 判断上午交易时段 (09:30-11:30)
    if (currentTime >= SESSIONS.MORNING.start && currentTime <= SESSIONS.MORNING.end) {
      return {
        status: 'TRADING',
        session: 'MORNING',
      };
    }

    // 判断午间休市时段 (11:30-13:00)
    if (currentTime > SESSIONS.MORNING.end && currentTime < SESSIONS.AFTERNOON.start) {
      return {
        status: 'LUNCH_BREAK',
        note: '午间休市',
      };
    }

    // 判断下午交易时段 (13:00-15:00)
    if (currentTime >= SESSIONS.AFTERNOON.start && currentTime <= SESSIONS.AFTERNOON.end) {
      return {
        status: 'TRADING',
        session: 'AFTERNOON',
      };
    }

    // 收市后时段
    return {
      status: 'CLOSED',
      note: '休市中',
      nextOpen: computeNextOpen ? this.getNextDayOpenTime(date) : undefined,
    };
  }

  /**
   * 判断是否为交易日
   *
   * 排除周末和法定节假日
   *
   * @param date - 要检查的日期
   * @returns 是否为交易日
   *
   * @example
   * ```ts
   * const monday = new Date('2026-02-24');
   * console.log(TradingCalendar.isTradingDay(monday)); // true
   *
   * const saturday = new Date('2026-02-22');
   * console.log(TradingCalendar.isTradingDay(saturday)); // false
   * ```
   */
  static isTradingDay(date: Date): boolean {
    // 验证日期有效性
    if (!(date instanceof Date) || isNaN(date.getTime())) {
      return false;
    }

    const dayOfWeek = date.getDay();

    // 检查是否为周末
    if (WEEKEND.includes(dayOfWeek)) {
      return false;
    }

    // 检查是否为节假日
    return !this.isHoliday(date);
  }

  /**
   * 判断是否为休市日
   *
   * 包括周末和法定节假日
   *
   * @param date - 要检查的日期
   * @returns 是否为休市日
   *
   * @example
   * ```ts
   * const nationalDay = new Date('2026-10-01');
   * console.log(TradingCalendar.isHoliday(nationalDay)); // true
   *
   * const workday = new Date('2026-02-24');
   * console.log(TradingCalendar.isHoliday(workday)); // false
   * ```
   */
  static isHoliday(date: Date): boolean {
    // 验证日期有效性
    if (!(date instanceof Date) || isNaN(date.getTime())) {
      return false;
    }

    const dayOfWeek = date.getDay();

    // 检查是否为周末
    if (WEEKEND.includes(dayOfWeek)) {
      return true;
    }

    // 检查是否为固定节假日
    const month = date.getMonth() + 1; // getMonth() 返回 0-11
    const day = date.getDate();

    return FIXED_HOLIDAYS.some(
      (holiday) => holiday.month === month && holiday.day === day
    );
  }

  /**
   * 获取下一个交易日
   *
   * 从给定日期开始，查找下一个交易日（排除周末和节假日）
   *
   * @param date - 起始日期，默认为当前日期
   * @returns 下一个交易日（返回新的 Date 实例，不修改原日期）
   *
   * @example
   * ```ts
   * const friday = new Date('2026-02-28');
   * const nextDay = TradingCalendar.getNextTradingDay(friday);
   * console.log(nextDay.getDate()); // 2 (下周一)
   * ```
   */
  static getNextTradingDay(date: Date = new Date()): Date {
    // 验证日期有效性
    if (!(date instanceof Date) || isNaN(date.getTime())) {
      date = new Date();
    }

    // 创建日期副本，避免修改原日期
    const nextDay = new Date(date);

    // 从下一天开始查找
    nextDay.setDate(nextDay.getDate() + 1);

    // 最多查找 7 天（一周内必定有交易日）
    for (let i = 0; i < 7; i++) {
      if (this.isTradingDay(nextDay)) {
        return nextDay;
      }
      nextDay.setDate(nextDay.getDate() + 1);
    }

    // 理论上不应该到达这里，但作为保险措施
    return nextDay;
  }

  /**
   * 获取下一个开盘时间
   *
   * 根据当前时间计算下一个开盘时间：
   * - 如果在交易中，返回下一个交易时段（下午/次日）
   * - 如果在午间休市，返回下午开盘时间（13:00）
   * - 如果在收市后或周末/节假日，返回下一个交易日 09:30
   *
   * @param date - 起始时间，默认为当前时间
   * @returns 下一个开盘时间（返回新的 Date 实例，不修改原时间）
   *
   * @example
   * ```ts
   * const lunchTime = new Date('2026-02-24T12:00:00+08:00');
   * const nextOpen = TradingCalendar.getNextOpen(lunchTime);
   * console.log(nextOpen.getHours()); // 13
   * console.log(nextOpen.getMinutes()); // 0
   * ```
   */
  static getNextOpen(date: Date = new Date()): Date {
    // 验证日期有效性
    if (!(date instanceof Date) || isNaN(date.getTime())) {
      date = new Date();
    }

    // 创建时间副本，避免修改原时间
    const nextOpen = new Date(date);

    // 获取当前时间的分钟数（基于 00:00）
    const hour = date.getHours();
    const minute = date.getMinutes();
    const currentTime = hour * 60 + minute;

    // 检查是否为休市日
    const isWeekendOrHoliday = this.isHoliday(date);

    // 如果是周末或节假日，直接返回下一个交易日开盘时间
    if (isWeekendOrHoliday) {
      return this.getNextDayOpenTime(date);
    }

    // 根据当前时间判断下一个开盘时间
    // 集合竞价前或集合竞价期间：返回上午开盘时间 09:30
    if (currentTime < SESSIONS.PRE_MARKET.end) {
      nextOpen.setHours(9, 30, 0, 0);
      return nextOpen;
    }

    // 集合竞价结束到上午开盘之间：返回上午开盘时间 09:30
    if (currentTime >= SESSIONS.PRE_MARKET.end && currentTime < SESSIONS.MORNING.start) {
      nextOpen.setHours(9, 30, 0, 0);
      return nextOpen;
    }

    // 上午交易中：返回下午开盘时间 13:00
    if (currentTime >= SESSIONS.MORNING.start && currentTime <= SESSIONS.MORNING.end) {
      nextOpen.setHours(13, 0, 0, 0);
      return nextOpen;
    }

    // 午间休市：返回下午开盘时间 13:00
    if (currentTime > SESSIONS.MORNING.end && currentTime < SESSIONS.AFTERNOON.start) {
      nextOpen.setHours(13, 0, 0, 0);
      return nextOpen;
    }

    // 下午交易中到收市后：返回下一个交易日开盘时间
    if (currentTime >= SESSIONS.AFTERNOON.start) {
      return this.getNextDayOpenTime(date);
    }

    // 默认返回下一个交易日开盘时间
    return this.getNextDayOpenTime(date);
  }

  /**
   * 获取下一个交易日 09:30 开盘时间
   *
   * @param date - 起始时间
   * @returns 下一个交易日 09:30
   *
   * @private
   */
  private static getNextDayOpenTime(date: Date): Date {
    // 获取下一个交易日
    const nextTradingDay = this.getNextTradingDay(date);

    // 设置开盘时间 09:30:00
    nextTradingDay.setHours(9, 30, 0, 0);

    return nextTradingDay;
  }
}
