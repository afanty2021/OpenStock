/**
 * A 股代码格式标准化工具
 *
 * 提供精确的 A 股代码识别、格式转换、市场类型检测和涨跌停限制计算
 * @module data-sources/astock/code-util
 */

/**
 * A 股市场类型枚举
 */
export enum MarketType {
  /** 上海主板 */
  SH_MAIN = 'SH_MAIN',
  /** 上海科创板 */
  SH_STAR = 'SH_STAR',
  /** 深圳主板 */
  SZ_MAIN = 'SZ_MAIN',
  /** 深圳创业板 */
  SZ_GEM = 'SZ_GEM',
  /** 北京证券交易所 */
  BSE = 'BSE',
}

/**
 * 交易所后缀常量
 */
export enum EXCHANGE_SUFFIX {
  /** 上海证券交易所 */
  SH = 'SH',
  /** 深圳证券交易所 */
  SZ = 'SZ',
  /** 北京证券交易所 */
  BJ = 'BJ',
}

/**
 * A 股代码模式定义
 * 使用精确的正则表达式匹配各市场板块的代码范围
 *
 * A 股代码规则（6位数字）：
 * - 上海主板：600000-605999 (600xxx, 601xxx, 603xxx, 605xxx)
 * - 上海科创板：688000-689999 (688xxx, 689xxx)
 * - 深圳主板：000001-001999 (000xxx, 001xxx)
 * - 深圳创业板：300000-301999 (300xxx, 301xxx)
 * - 北交所：400000-499999 (原新三板), 800000-899999 (创新层)
 *
 * 正则表达式说明：
 * - \d{3} 表示恰好3位数字
 * - 例如：/^60[0-5]\d{3}$/ = "60" + [0-5] + 3位数字 = 6位数字
 */
const PATTERNS = {
  /** 上海主板：600000-605999 */
  SH_MAIN: /^60[0-5]\d{3}$/,
  /** 上海科创板：688000-689999 */
  SH_STAR: /^68[89]\d{3}$/,
  /** 深圳主板：000001-001999 */
  SZ_MAIN: /^00[0-1]\d{3}$/,
  /** 深圳创业板：300000-301999 */
  SZ_GEM: /^30[0-1]\d{3}$/,
  /** 北京证券交易所：800000-899999, 400000-499999 */
  BSE: /^[48]\d{5}$/,
} as const;

/**
 * Finnhub 格式后缀映射
 * Finnhub 使用 .SS 表示上海，.se 表示深圳（小写）
 */
const FINNHUB_SUFFIXES = {
  SS: '.SS',
  se: '.se',
} as const;

/**
 * 涨跌停限制比例常量
 */
const LIMIT_PCT = {
  /** 主板股票涨跌停限制 */
  MAIN_BOARD: 10,
  /** 科创板/创业板涨跌停限制 */
  STAR_GEM: 20,
  /** 北交所涨跌停限制 */
  BSE: 30,
  /** ST 股票涨跌停限制 */
  ST: 5,
  /** 非 A 股股票（无限制） */
  NON_ASTOCK: 0,
} as const;

/**
 * A 股代码格式标准化工具类
 *
 * 提供以下功能：
 * - 精确的 A 股代码模式匹配
 * - 市场类型检测
 * - 涨跌停限制比例计算
 * - 代码格式标准化（Finnhub ↔ Tushare）
 * - 交易所识别
 */
export class AStockCodeUtil {
  /**
   * 判断是否为 A 股代码
   *
   * 支持以下格式：
   * - 纯数字代码：600519, 000001, 300001, 832566
   * - 带交易所后缀：600519.SH, 000001.SZ, 832566.BJ
   * - Finnhub 格式：600519.SS, 000001.se
   *
   * @param symbol - 股票代码
   * @returns 是否为有效的 A 股代码
   *
   * @example
   * ```ts
   * AStockCodeUtil.isAStock('600519') // true
   * AStockCodeUtil.isAStock('600519.SH') // true
   * AStockCodeUtil.isAStock('600519.SS') // true
   * AStockCodeUtil.isAStock('AAPL') // false
   * ```
   */
  static isAStock(symbol: string): boolean {
    const code = this.extractCode(symbol);
    if (!code) return false;

    // 检查是否匹配任何 A 股模式
    return Object.values(PATTERNS).some(pattern => pattern.test(code));
  }

  /**
   * 获取股票的市场类型
   *
   * @param symbol - 股票代码
   * @returns 市场类型枚举值，非 A 股返回 undefined
   *
   * @example
   * ```ts
   * AStockCodeUtil.getMarketType('600519.SH') // MarketType.SH_MAIN
   * AStockCodeUtil.getMarketType('688001.SH') // MarketType.SH_STAR
   * AStockCodeUtil.getMarketType('300001.SZ') // MarketType.SZ_GEM
   * AStockCodeUtil.getMarketType('832566.BJ') // MarketType.BSE
   * ```
   */
  static getMarketType(symbol: string): MarketType | undefined {
    const code = this.extractCode(symbol);

    if (PATTERNS.SH_MAIN.test(code)) return MarketType.SH_MAIN;
    if (PATTERNS.SH_STAR.test(code)) return MarketType.SH_STAR;
    if (PATTERNS.SZ_MAIN.test(code)) return MarketType.SZ_MAIN;
    if (PATTERNS.SZ_GEM.test(code)) return MarketType.SZ_GEM;
    if (PATTERNS.BSE.test(code)) return MarketType.BSE;

    return undefined;
  }

  /**
   * 获取涨跌停限制比例
   *
   * 规则：
   * - 主板股票（上海/深圳）：10%
   * - 科创板/创业板：20%
   * - 北交所：30%
   * - ST 股票：5%（根据股票名称判断）
   *
   * @param symbol - 股票代码
   * @param name - 股票名称（可选，用于识别 ST 股票）
   * @returns 涨跌停限制百分比（0 表示非 A 股）
   *
   * @example
   * ```ts
   * AStockCodeUtil.getLimitPct('600519.SH') // 10
   * AStockCodeUtil.getLimitPct('688001.SH') // 20
   * AStockCodeUtil.getLimitPct('300001.SZ') // 20
   * AStockCodeUtil.getLimitPct('832566.BJ') // 30
   * AStockCodeUtil.getLimitPct('600519.SH', 'STPingAn') // 5
   * ```
   */
  static getLimitPct(symbol: string, name?: string): number {
    const marketType = this.getMarketType(symbol);

    // 非 A 股返回 0
    if (!marketType) return LIMIT_PCT.NON_ASTOCK;

    // ST 股票判断（优先级最高）
    if (name && this.isSTStock(name)) {
      return LIMIT_PCT.ST;
    }

    // 根据市场类型返回涨跌停限制
    switch (marketType) {
      case MarketType.SH_MAIN:
      case MarketType.SZ_MAIN:
        return LIMIT_PCT.MAIN_BOARD;
      case MarketType.SH_STAR:
      case MarketType.SZ_GEM:
        return LIMIT_PCT.STAR_GEM;
      case MarketType.BSE:
        return LIMIT_PCT.BSE;
      default:
        return LIMIT_PCT.NON_ASTOCK;
    }
  }

  /**
   * 标准化 A 股代码格式
   *
   * 转换规则：
   * - 无后缀：添加交易所后缀（600519 → 600519.SH）
   * - Finnhub 格式：.SS → .SH, .se → .SZ
   * - 已是标准格式：保持不变（但统一大写）
   * - 非 A 股：保持不变
   *
   * @param symbol - 股票代码
   * @returns 标准化后的代码（XXXX.SH 或 XXXX.SZ 或 XXXX.BJ 格式）
   *
   * @example
   * ```ts
   * AStockCodeUtil.normalize('600519') // '600519.SH'
   * AStockCodeUtil.normalize('600519.SS') // '600519.SH'
   * AStockCodeUtil.normalize('600519.SH') // '600519.SH'
   * AStockCodeUtil.normalize('AAPL') // 'AAPL'
   * ```
   */
  static normalize(symbol: string): string {
    if (!symbol) return symbol;

    const upperSymbol = symbol.toUpperCase();

    // 非 A 股代码保持不变
    if (!this.isAStock(upperSymbol)) {
      return symbol;
    }

    const code = this.extractCode(upperSymbol);
    const exchange = this.getExchange(upperSymbol);

    if (exchange) {
      return `${code}.${exchange}`;
    }

    return code;
  }

  /**
   * 转换为 Finnhub 代码格式
   *
   * Finnhub 使用 .SS 表示上海，.se（小写）表示深圳
   *
   * @param symbol - 标准格式代码（.SH/.SZ）
   * @returns Finnhub 格式代码
   *
   * @example
   * ```ts
   * AStockCodeUtil.toFinnhubCode('600519.SH') // '600519.SS'
   * AStockCodeUtil.toFinnhubCode('000001.SZ') // '000001.se'
   * AStockCodeUtil.toFinnhubCode('AAPL') // 'AAPL'
   * ```
   */
  static toFinnhubCode(symbol: string): string {
    if (!symbol) return symbol;

    const code = this.extractCode(symbol);
    const exchange = this.getExchange(symbol);

    if (exchange === EXCHANGE_SUFFIX.SH) {
      return `${code}.SS`;
    }
    if (exchange === EXCHANGE_SUFFIX.SZ) {
      return `${code}.se`;
    }

    return symbol;
  }

  /**
   * 转换为 Tushare 代码格式
   *
   * Tushare 使用 .SH 表示上海，.SZ 表示深圳
   *
   * @param symbol - 股票代码（可以是 Finnhub 格式）
   * @returns Tushare 格式代码
   *
   * @example
   * ```ts
   * AStockCodeUtil.toTushareCode('600519.SS') // '600519.SH'
   * AStockCodeUtil.toTushareCode('000001.se') // '000001.SZ'
   * AStockCodeUtil.toTushareCode('AAPL') // 'AAPL'
   * ```
   */
  static toTushareCode(symbol: string): string {
    if (!symbol) return symbol;

    const code = this.extractCode(symbol);
    const exchange = this.getExchange(symbol);

    if (exchange === EXCHANGE_SUFFIX.SH) {
      return `${code}.SH`;
    }
    if (exchange === EXCHANGE_SUFFIX.SZ) {
      return `${code}.SZ`;
    }

    return symbol;
  }

  /**
   * 获取交易所后缀
   *
   * @param symbol - 股票代码
   * @returns 交易所后缀（SH/SZ/BJ），非 A 股返回 undefined
   *
   * @example
   * ```ts
   * AStockCodeUtil.getExchange('600519') // 'SH'
   * AStockCodeUtil.getExchange('600519.SH') // 'SH'
   * AStockCodeUtil.getExchange('600519.SS') // 'SH'
   * AStockCodeUtil.getExchange('AAPL') // undefined
   * ```
   */
  static getExchange(symbol: string): EXCHANGE_SUFFIX | undefined {
    const marketType = this.getMarketType(symbol);

    if (!marketType) return undefined;

    if (marketType === MarketType.SH_MAIN || marketType === MarketType.SH_STAR) {
      return EXCHANGE_SUFFIX.SH;
    }
    if (marketType === MarketType.SZ_MAIN || marketType === MarketType.SZ_GEM) {
      return EXCHANGE_SUFFIX.SZ;
    }
    if (marketType === MarketType.BSE) {
      return EXCHANGE_SUFFIX.BJ;
    }

    return undefined;
  }

  /**
   * 验证代码格式是否有效
   *
   * @param symbol - 股票代码
   * @returns 是否为有效的 A 股代码
   *
   * @example
   * ```ts
   * AStockCodeUtil.isValidCode('600519') // true
   * AStockCodeUtil.isValidCode('600519.SH') // true
   * AStockCodeUtil.isValidCode('123456') // false
   * ```
   */
  static isValidCode(symbol: string): boolean {
    return this.isAStock(symbol);
  }

  /**
   * 提取纯代码（去除交易所后缀）
   *
   * @param symbol - 股票代码
   * @returns 纯数字代码
   *
   * @example
   * ```ts
   * AStockCodeUtil.extractCode('600519.SH') // '600519'
   * AStockCodeUtil.extractCode('600519.SS') // '600519'
   * AStockCodeUtil.extractCode('600519') // '600519'
   * ```
   */
  static extractCode(symbol: string): string {
    if (!symbol) return '';

    // 先检查是否包含 '.'，避免不必要的正则替换操作
    if (!symbol.includes('.')) {
      return symbol;
    }

    // 移除交易所后缀
    return symbol.replace(/\.(SH|SZ|BJ|SS|se|SS)$/i, '');
  }

  /**
   * 判断是否为 ST 股票
   *
   * ST 股票的涨跌停限制为 5%
   * 匹配规则：名称以 ST、*ST、S*ST 开头（不区分大小写）
   *
   * @param name - 股票名称
   * @returns 是否为 ST 股票
   *
   * @private
   *
   * @example
   * ```ts
   * AStockCodeUtil.isSTStock('ST东方') // true
   * AStockCodeUtil.isSTStock('*ST中安') // true
   * AStockCodeUtil.isSTStock('S*ST华业') // true
   * AStockCodeUtil.isSTStock('贵州茅台') // false
   * AStockCodeUtil.isSTStock('平安ST') // false（不在开头）
   * ```
   */
  private static isSTStock(name: string): boolean {
    if (!this.validateStringInput(name)) return false;

    // 只匹配开头的 ST 标记：*ST、S*ST、ST（不区分大小写）
    const trimmedName = name.trim().toUpperCase();
    return /^(\*ST|S\*ST|ST)/.test(trimmedName);
  }

  /**
   * 验证字符串输入
   *
   * @param value - 待验证的值
   * @returns 是否为有效的非空字符串
   *
   * @private
   */
  private static validateStringInput(value: unknown): value is string {
    return typeof value === 'string' && value.length > 0;
  }
}
