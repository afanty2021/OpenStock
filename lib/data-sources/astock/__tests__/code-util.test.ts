/**
 * AStockCodeUtil 单元测试
 *
 * 测试 A 股代码格式标准化功能
 * @module data-sources/astock/__tests__/code-util
 */

import { describe, it, expect } from 'vitest';
import {
  AStockCodeUtil,
  MarketType,
  EXCHANGE_SUFFIX,
} from '../code-util';

describe('AStockCodeUtil', () => {
  describe('isAStock', () => {
    describe('上海主板 (SH_MAIN)', () => {
      it('应识别 600xxx 代码', () => {
        expect(AStockCodeUtil.isAStock('600000')).toBe(true);
        expect(AStockCodeUtil.isAStock('600519')).toBe(true);
        expect(AStockCodeUtil.isAStock('600999')).toBe(true);
      });

      it('应识别 601xxx 代码', () => {
        expect(AStockCodeUtil.isAStock('601000')).toBe(true);
        expect(AStockCodeUtil.isAStock('601398')).toBe(true);
        expect(AStockCodeUtil.isAStock('601988')).toBe(true);
      });

      it('应识别 603xxx 代码', () => {
        expect(AStockCodeUtil.isAStock('603000')).toBe(true);
        expect(AStockCodeUtil.isAStock('603259')).toBe(true);
      });

      it('应识别 605xxx 代码', () => {
        expect(AStockCodeUtil.isAStock('605000')).toBe(true);
        expect(AStockCodeUtil.isAStock('605888')).toBe(true);
      });

      it('应识别带后缀的代码', () => {
        expect(AStockCodeUtil.isAStock('600519.SH')).toBe(true);
        expect(AStockCodeUtil.isAStock('600519.SS')).toBe(true);
        expect(AStockCodeUtil.isAStock('600519.sh')).toBe(true);
        expect(AStockCodeUtil.isAStock('600519.ss')).toBe(true);
      });
    });

    describe('上海科创板 (SH_STAR)', () => {
      it('应识别 688xxx 代码', () => {
        expect(AStockCodeUtil.isAStock('688001')).toBe(true);
        expect(AStockCodeUtil.isAStock('688981')).toBe(true);
      });

      it('应识别 689xxx 代码', () => {
        expect(AStockCodeUtil.isAStock('689009')).toBe(true);
      });

      it('应识别带后缀的代码', () => {
        expect(AStockCodeUtil.isAStock('688001.SH')).toBe(true);
        expect(AStockCodeUtil.isAStock('688001.SS')).toBe(true);
      });
    });

    describe('深圳主板 (SZ_MAIN)', () => {
      it('应识别 000xxx 代码', () => {
        expect(AStockCodeUtil.isAStock('000001')).toBe(true);
        expect(AStockCodeUtil.isAStock('000002')).toBe(true);
        expect(AStockCodeUtil.isAStock('000858')).toBe(true);
      });

      it('应识别 001xxx 代码', () => {
        expect(AStockCodeUtil.isAStock('001001')).toBe(true);
        expect(AStockCodeUtil.isAStock('001234')).toBe(true);
      });

      it('应识别带后缀的代码', () => {
        expect(AStockCodeUtil.isAStock('000001.SZ')).toBe(true);
        expect(AStockCodeUtil.isAStock('000001.se')).toBe(true);
      });
    });

    describe('深圳创业板 (SZ_GEM)', () => {
      it('应识别 300xxx 代码', () => {
        expect(AStockCodeUtil.isAStock('300001')).toBe(true);
        expect(AStockCodeUtil.isAStock('300750')).toBe(true);
      });

      it('应识别 301xxx 代码', () => {
        expect(AStockCodeUtil.isAStock('301001')).toBe(true);
        expect(AStockCodeUtil.isAStock('301578')).toBe(true);
      });

      it('应识别带后缀的代码', () => {
        expect(AStockCodeUtil.isAStock('300001.SZ')).toBe(true);
        expect(AStockCodeUtil.isAStock('300001.se')).toBe(true);
      });
    });

    describe('北京证券交易所 (BSE)', () => {
      it('应识别 8xxxxx 代码', () => {
        expect(AStockCodeUtil.isAStock('800000')).toBe(true);
        expect(AStockCodeUtil.isAStock('832566')).toBe(true);
        expect(AStockCodeUtil.isAStock('836078')).toBe(true);
      });

      it('应识别 4xxxxx 代码', () => {
        expect(AStockCodeUtil.isAStock('400000')).toBe(true);
        expect(AStockCodeUtil.isAStock('430002')).toBe(true);
      });

      it('应识别带后缀的代码', () => {
        expect(AStockCodeUtil.isAStock('832566.BJ')).toBe(true);
        expect(AStockCodeUtil.isAStock('832566.bj')).toBe(true);
      });
    });

    describe('非 A 股代码', () => {
      it('应拒绝美股代码', () => {
        expect(AStockCodeUtil.isAStock('AAPL')).toBe(false);
        expect(AStockCodeUtil.isAStock('TSLA')).toBe(false);
        expect(AStockCodeUtil.isAStock('MSFT')).toBe(false);
      });

      it('应拒绝港股代码', () => {
        expect(AStockCodeUtil.isAStock('0005.HK')).toBe(false);
        expect(AStockCodeUtil.isAStock('0700.HK')).toBe(false);
        expect(AStockCodeUtil.isAStock('9988.HK')).toBe(false);
      });

      it('应拒绝无效代码', () => {
        expect(AStockCodeUtil.isAStock('123456')).toBe(false);
        expect(AStockCodeUtil.isAStock('999999')).toBe(false);
        expect(AStockCodeUtil.isAStock('')).toBe(false);
        expect(AStockCodeUtil.isAStock('ABC')).toBe(false);
      });

      it('应拒绝非 A 股后缀', () => {
        expect(AStockCodeUtil.isAStock('600519.US')).toBe(false);
        expect(AStockCodeUtil.isAStock('600519.HK')).toBe(false);
      });
    });
  });

  describe('getMarketType', () => {
    it('应正确识别上海主板', () => {
      expect(AStockCodeUtil.getMarketType('600519.SH')).toBe(MarketType.SH_MAIN);
      expect(AStockCodeUtil.getMarketType('601398.SH')).toBe(MarketType.SH_MAIN);
      expect(AStockCodeUtil.getMarketType('603259.SH')).toBe(MarketType.SH_MAIN);
      expect(AStockCodeUtil.getMarketType('605000.SH')).toBe(MarketType.SH_MAIN);
    });

    it('应正确识别上海科创板', () => {
      expect(AStockCodeUtil.getMarketType('688001.SH')).toBe(MarketType.SH_STAR);
      expect(AStockCodeUtil.getMarketType('688981.SH')).toBe(MarketType.SH_STAR);
      expect(AStockCodeUtil.getMarketType('689009.SH')).toBe(MarketType.SH_STAR);
    });

    it('应正确识别深圳主板', () => {
      expect(AStockCodeUtil.getMarketType('000001.SZ')).toBe(MarketType.SZ_MAIN);
      expect(AStockCodeUtil.getMarketType('000858.SZ')).toBe(MarketType.SZ_MAIN);
      expect(AStockCodeUtil.getMarketType('001001.SZ')).toBe(MarketType.SZ_MAIN);
    });

    it('应正确识别深圳创业板', () => {
      expect(AStockCodeUtil.getMarketType('300001.SZ')).toBe(MarketType.SZ_GEM);
      expect(AStockCodeUtil.getMarketType('300750.SZ')).toBe(MarketType.SZ_GEM);
      expect(AStockCodeUtil.getMarketType('301001.SZ')).toBe(MarketType.SZ_GEM);
    });

    it('应正确识别北交所', () => {
      expect(AStockCodeUtil.getMarketType('832566.BJ')).toBe(MarketType.BSE);
      expect(AStockCodeUtil.getMarketType('836078.BJ')).toBe(MarketType.BSE);
      expect(AStockCodeUtil.getMarketType('430002.BJ')).toBe(MarketType.BSE);
    });

    it('应支持不带后缀的代码', () => {
      expect(AStockCodeUtil.getMarketType('600519')).toBe(MarketType.SH_MAIN);
      expect(AStockCodeUtil.getMarketType('688001')).toBe(MarketType.SH_STAR);
      expect(AStockCodeUtil.getMarketType('300001')).toBe(MarketType.SZ_GEM);
      expect(AStockCodeUtil.getMarketType('832566')).toBe(MarketType.BSE);
    });

    it('应处理 Finnhub 格式 (.SS)', () => {
      expect(AStockCodeUtil.getMarketType('600519.SS')).toBe(MarketType.SH_MAIN);
      expect(AStockCodeUtil.getMarketType('688001.SS')).toBe(MarketType.SH_STAR);
    });

    it('应处理 Finnhub 格式 (.se)', () => {
      expect(AStockCodeUtil.getMarketType('000001.se')).toBe(MarketType.SZ_MAIN);
      expect(AStockCodeUtil.getMarketType('300001.se')).toBe(MarketType.SZ_GEM);
    });

    it('对非 A 股代码应返回 undefined', () => {
      expect(AStockCodeUtil.getMarketType('AAPL')).toBeUndefined();
      expect(AStockCodeUtil.getMarketType('0005.HK')).toBeUndefined();
    });
  });

  describe('getLimitPct', () => {
    describe('主板股票 (10%)', () => {
      it('上海主板应为 10%', () => {
        expect(AStockCodeUtil.getLimitPct('600519.SH')).toBe(10);
        expect(AStockCodeUtil.getLimitPct('601398.SH')).toBe(10);
        expect(AStockCodeUtil.getLimitPct('603259.SH')).toBe(10);
      });

      it('深圳主板应为 10%', () => {
        expect(AStockCodeUtil.getLimitPct('000001.SZ')).toBe(10);
        expect(AStockCodeUtil.getLimitPct('000858.SZ')).toBe(10);
        expect(AStockCodeUtil.getLimitPct('001001.SZ')).toBe(10);
      });
    });

    describe('科创板/创业板 (20%)', () => {
      it('科创板应为 20%', () => {
        expect(AStockCodeUtil.getLimitPct('688001.SH')).toBe(20);
        expect(AStockCodeUtil.getLimitPct('688981.SH')).toBe(20);
        expect(AStockCodeUtil.getLimitPct('689009.SH')).toBe(20);
      });

      it('创业板应为 20%', () => {
        expect(AStockCodeUtil.getLimitPct('300001.SZ')).toBe(20);
        expect(AStockCodeUtil.getLimitPct('300750.SZ')).toBe(20);
        expect(AStockCodeUtil.getLimitPct('301001.SZ')).toBe(20);
      });
    });

    describe('北交所 (30%)', () => {
      it('北交所应为 30%', () => {
        expect(AStockCodeUtil.getLimitPct('832566.BJ')).toBe(30);
        expect(AStockCodeUtil.getLimitPct('836078.BJ')).toBe(30);
        expect(AStockCodeUtil.getLimitPct('430002.BJ')).toBe(30);
      });
    });

    describe('ST 股票 (5%)', () => {
      it('应识别 ST 前缀', () => {
        expect(AStockCodeUtil.getLimitPct('600519.SH', 'STPingAn')).toBe(5);
        expect(AStockCodeUtil.getLimitPct('600519.SH', 'st-ping-an')).toBe(5);
      });

      it('应识别 *ST 前缀', () => {
        expect(AStockCodeUtil.getLimitPct('600519.SH', '*STPingAn')).toBe(5);
        expect(AStockCodeUtil.getLimitPct('600519.SH', '*st-ping-an')).toBe(5);
      });

      it('应识别 S*ST 前缀', () => {
        expect(AStockCodeUtil.getLimitPct('600519.SH', 'S*STPingAn')).toBe(5);
        expect(AStockCodeUtil.getLimitPct('600519.SH', 's*st-ping-an')).toBe(5);
      });

      it('应识别 ST 在名称中间', () => {
        expect(AStockCodeUtil.getLimitPct('600519.SH', '平安ST')).toBe(5);
        expect(AStockCodeUtil.getLimitPct('600519.SH', 'Ping An ST')).toBe(5);
      });

      it('应忽略非 ST 股票', () => {
        expect(AStockCodeUtil.getLimitPct('600519.SH', '贵州茅台')).toBe(10);
        expect(AStockCodeUtil.getLimitPct('600519.SH', 'Kweichow Moutai')).toBe(10);
      });
    });

    describe('非 A 股代码', () => {
      it('应返回 0', () => {
        expect(AStockCodeUtil.getLimitPct('AAPL')).toBe(0);
        expect(AStockCodeUtil.getLimitPct('0005.HK')).toBe(0);
        expect(AStockCodeUtil.getLimitPct('TSLA')).toBe(0);
      });
    });
  });

  describe('normalize', () => {
    describe('无后缀代码', () => {
      it('应添加 .SH 后缀到上海股票', () => {
        expect(AStockCodeUtil.normalize('600519')).toBe('600519.SH');
        expect(AStockCodeUtil.normalize('601398')).toBe('601398.SH');
        expect(AStockCodeUtil.normalize('688001')).toBe('688001.SH');
      });

      it('应添加 .SZ 后缀到深圳股票', () => {
        expect(AStockCodeUtil.normalize('000001')).toBe('000001.SZ');
        expect(AStockCodeUtil.normalize('300001')).toBe('300001.SZ');
      });

      it('应添加 .BJ 后缀到北交所股票', () => {
        expect(AStockCodeUtil.normalize('832566')).toBe('832566.BJ');
        expect(AStockCodeUtil.normalize('430002')).toBe('430002.BJ');
      });
    });

    describe('Finnhub 格式转换', () => {
      it('应将 .SS 转换为 .SH', () => {
        expect(AStockCodeUtil.normalize('600519.SS')).toBe('600519.SH');
        expect(AStockCodeUtil.normalize('688001.SS')).toBe('688001.SH');
        expect(AStockCodeUtil.normalize('600519.ss')).toBe('600519.SH');
      });

      it('应将 .se 转换为 .SZ', () => {
        expect(AStockCodeUtil.normalize('000001.se')).toBe('000001.SZ');
        expect(AStockCodeUtil.normalize('300001.se')).toBe('300001.SZ');
        expect(AStockCodeUtil.normalize('000001.se')).toBe('000001.SZ');
      });
    });

    describe('已经是标准格式', () => {
      it('应保持 .SH 格式', () => {
        expect(AStockCodeUtil.normalize('600519.SH')).toBe('600519.SH');
        expect(AStockCodeUtil.normalize('600519.sh')).toBe('600519.SH');
      });

      it('应保持 .SZ 格式', () => {
        expect(AStockCodeUtil.normalize('000001.SZ')).toBe('000001.SZ');
        expect(AStockCodeUtil.normalize('000001.sz')).toBe('000001.SZ');
      });

      it('应保持 .BJ 格式', () => {
        expect(AStockCodeUtil.normalize('832566.BJ')).toBe('832566.BJ');
        expect(AStockCodeUtil.normalize('832566.bj')).toBe('832566.BJ');
      });
    });

    describe('非 A 股代码', () => {
      it('应保持美股代码不变', () => {
        expect(AStockCodeUtil.normalize('AAPL')).toBe('AAPL');
        expect(AStockCodeUtil.normalize('TSLA')).toBe('TSLA');
      });

      it('应保持港股代码不变', () => {
        expect(AStockCodeUtil.normalize('0005.HK')).toBe('0005.HK');
        expect(AStockCodeUtil.normalize('0700.HK')).toBe('0700.HK');
      });

      it('应返回空字符串', () => {
        expect(AStockCodeUtil.normalize('')).toBe('');
      });
    });
  });

  describe('toFinnhubCode', () => {
    it('应将 .SH 转换为 .SS', () => {
      expect(AStockCodeUtil.toFinnhubCode('600519.SH')).toBe('600519.SS');
      expect(AStockCodeUtil.toFinnhubCode('688001.SH')).toBe('688001.SS');
    });

    it('应将 .SZ 转换为 .se', () => {
      expect(AStockCodeUtil.toFinnhubCode('000001.SZ')).toBe('000001.se');
      expect(AStockCodeUtil.toFinnhubCode('300001.SZ')).toBe('300001.se');
    });

    it('应保持 .BJ 不变（Finnhub 不支持）', () => {
      expect(AStockCodeUtil.toFinnhubCode('832566.BJ')).toBe('832566.BJ');
    });

    it('非 A 股代码应保持不变', () => {
      expect(AStockCodeUtil.toFinnhubCode('AAPL')).toBe('AAPL');
      expect(AStockCodeUtil.toFinnhubCode('0005.HK')).toBe('0005.HK');
    });
  });

  describe('toTushareCode', () => {
    it('应将 .SS 转换为 .SH', () => {
      expect(AStockCodeUtil.toTushareCode('600519.SS')).toBe('600519.SH');
      expect(AStockCodeUtil.toTushareCode('688001.SS')).toBe('688001.SH');
    });

    it('应将 .se 转换为 .SZ', () => {
      expect(AStockCodeUtil.toTushareCode('000001.se')).toBe('000001.SZ');
      expect(AStockCodeUtil.toTushareCode('300001.se')).toBe('300001.SZ');
    });

    it('应保持其他后缀不变', () => {
      expect(AStockCodeUtil.toTushareCode('600519.SH')).toBe('600519.SH');
      expect(AStockCodeUtil.toTushareCode('000001.SZ')).toBe('000001.SZ');
      expect(AStockCodeUtil.toTushareCode('832566.BJ')).toBe('832566.BJ');
    });

    it('非 A 股代码应保持不变', () => {
      expect(AStockCodeUtil.toTushareCode('AAPL')).toBe('AAPL');
      expect(AStockCodeUtil.toTushareCode('0005.HK')).toBe('0005.HK');
    });
  });

  describe('getExchange', () => {
    it('应正确识别上海交易所', () => {
      expect(AStockCodeUtil.getExchange('600519')).toBe(EXCHANGE_SUFFIX.SH);
      expect(AStockCodeUtil.getExchange('600519.SH')).toBe(EXCHANGE_SUFFIX.SH);
      expect(AStockCodeUtil.getExchange('600519.SS')).toBe(EXCHANGE_SUFFIX.SH);
      expect(AStockCodeUtil.getExchange('688001')).toBe(EXCHANGE_SUFFIX.SH);
    });

    it('应正确识别深圳交易所', () => {
      expect(AStockCodeUtil.getExchange('000001')).toBe(EXCHANGE_SUFFIX.SZ);
      expect(AStockCodeUtil.getExchange('000001.SZ')).toBe(EXCHANGE_SUFFIX.SZ);
      expect(AStockCodeUtil.getExchange('000001.se')).toBe(EXCHANGE_SUFFIX.SZ);
      expect(AStockCodeUtil.getExchange('300001')).toBe(EXCHANGE_SUFFIX.SZ);
    });

    it('应正确识别北交所', () => {
      expect(AStockCodeUtil.getExchange('832566')).toBe(EXCHANGE_SUFFIX.BJ);
      expect(AStockCodeUtil.getExchange('832566.BJ')).toBe(EXCHANGE_SUFFIX.BJ);
      expect(AStockCodeUtil.getExchange('430002')).toBe(EXCHANGE_SUFFIX.BJ);
    });

    it('非 A 股代码应返回 undefined', () => {
      expect(AStockCodeUtil.getExchange('AAPL')).toBeUndefined();
      expect(AStockCodeUtil.getExchange('0005.HK')).toBeUndefined();
    });
  });

  describe('isValidCode', () => {
    it('应接受有效的 A 股代码', () => {
      expect(AStockCodeUtil.isValidCode('600519')).toBe(true);
      expect(AStockCodeUtil.isValidCode('688001')).toBe(true);
      expect(AStockCodeUtil.isValidCode('000001')).toBe(true);
      expect(AStockCodeUtil.isValidCode('300001')).toBe(true);
      expect(AStockCodeUtil.isValidCode('832566')).toBe(true);
    });

    it('应接受带后缀的代码', () => {
      expect(AStockCodeUtil.isValidCode('600519.SH')).toBe(true);
      expect(AStockCodeUtil.isValidCode('600519.SS')).toBe(true);
      expect(AStockCodeUtil.isValidCode('000001.SZ')).toBe(true);
      expect(AStockCodeUtil.isValidCode('000001.se')).toBe(true);
    });

    it('应拒绝无效的代码', () => {
      expect(AStockCodeUtil.isValidCode('123456')).toBe(false);
      expect(AStockCodeUtil.isValidCode('999999')).toBe(false);
      expect(AStockCodeUtil.isValidCode('')).toBe(false);
      expect(AStockCodeUtil.isValidCode('ABC')).toBe(false);
    });

    it('应拒绝非 A 股代码', () => {
      expect(AStockCodeUtil.isValidCode('AAPL')).toBe(false);
      expect(AStockCodeUtil.isValidCode('0005.HK')).toBe(false);
    });
  });

  describe('extractCode', () => {
    it('应从带后缀的代码中提取纯代码', () => {
      expect(AStockCodeUtil.extractCode('600519.SH')).toBe('600519');
      expect(AStockCodeUtil.extractCode('000001.SZ')).toBe('000001');
      expect(AStockCodeUtil.extractCode('832566.BJ')).toBe('832566');
    });

    it('应处理 Finnhub 格式', () => {
      expect(AStockCodeUtil.extractCode('600519.SS')).toBe('600519');
      expect(AStockCodeUtil.extractCode('000001.se')).toBe('000001');
    });

    it('无后缀的代码应保持不变', () => {
      expect(AStockCodeUtil.extractCode('600519')).toBe('600519');
      expect(AStockCodeUtil.extractCode('AAPL')).toBe('AAPL');
    });

    it('空字符串应返回空字符串', () => {
      expect(AStockCodeUtil.extractCode('')).toBe('');
    });
  });
});
