'use client';

import { useState } from 'react';
import { getQuote, getCompanyProfile } from '@/lib/actions/finnhub.actions';

interface TestResult {
  symbol: string;
  status: 'pending' | 'success' | 'error';
  quote?: any;
  profile?: any;
  error?: string;
}

export default function TestMultiSourcePage() {
  const [results, setResults] = useState<Record<string, TestResult>>({});
  const [loading, setLoading] = useState(false);

  const testCases = [
    { symbol: 'AAPL', name: '苹果 (美股)', market: 'US' },
    { symbol: '600519.SS', name: '贵州茅台 (A股)', market: 'CN' },
    { symbol: '0005.HK', name: '汇丰控股 (港股)', market: 'HK' },
    { symbol: 'MSFT', name: '微软 (美股)', market: 'US' },
    { symbol: 'TSLA', name: '特斯拉 (美股)', market: 'US' },
  ];

  async function testSymbol(symbol: string) {
    setResults(prev => ({
      ...prev,
      [symbol]: { symbol, status: 'pending' }
    }));

    try {
      const [quote, profile] = await Promise.all([
        getQuote(symbol),
        getCompanyProfile(symbol)
      ]);

      setResults(prev => ({
        ...prev,
        [symbol]: {
          symbol,
          status: 'success',
          quote,
          profile
        }
      }));
    } catch (error) {
      setResults(prev => ({
        ...prev,
        [symbol]: {
          symbol,
          status: 'error',
          error: error instanceof Error ? error.message : String(error)
        }
      }));
    }
  }

  async function testAll() {
    setLoading(true);
    setResults({});

    for (const test of testCases) {
      await testSymbol(test.symbol);
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    setLoading(false);
  }

  async function testCache() {
    const symbol = 'AAPL';
    setResults(prev => ({ ...prev, [symbol]: { symbol, status: 'pending' } }));

    // 连续请求3次测试缓存
    const start = Date.now();
    const quote1 = await getQuote(symbol);
    const t1 = Date.now() - start;

    const quote2 = await getQuote(symbol);
    const t2 = Date.now() - start - t1;

    const quote3 = await getQuote(symbol);
    const t3 = Date.now() - start - t1 - t2;

    setResults(prev => ({
      ...prev,
      [symbol]: {
        symbol,
        status: 'success',
        quote: quote1,
        profile: {
          cacheTest: {
            request1: `${t1}ms`,
            request2: `${t2}ms`,
            request3: `${t3}ms`,
            note: '第二次和第三次应该更快（缓存命中）'
          }
        }
      }
    }));
  }

  function getResultIcon(status: string) {
    switch (status) {
      case 'pending': return '⏳';
      case 'success': return '✅';
      case 'error': return '❌';
      default: return '⚪';
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <h1 className="text-3xl font-bold mb-2">多数据源聚合系统测试</h1>
      <p className="text-muted-foreground mb-6">
        测试 Finnhub、Tushare、Alpha Vantage 数据源集成和聚合功能
      </p>

      <div className="flex gap-4 mb-8">
        <button
          onClick={testAll}
          disabled={loading}
          className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? '测试中...' : '测试全部股票'}
        </button>
        <button
          onClick={testCache}
          className="px-6 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90"
        >
          测试缓存性能
        </button>
        <button
          onClick={() => setResults({})}
          className="px-6 py-2 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90"
        >
          清除结果
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {testCases.map(test => (
          <div
            key={test.symbol}
            className="border rounded-lg p-4 hover:bg-accent/50 cursor-pointer"
            onClick={() => testSymbol(test.symbol)}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold">{test.symbol}</span>
              <span className="text-xs px-2 py-1 bg-secondary rounded-full">{test.market}</span>
            </div>
            <p className="text-sm text-muted-foreground">{test.name}</p>
            {results[test.symbol] && (
              <div className="mt-2 text-sm">
                {getResultIcon(results[test.symbol].status)} {
                  results[test.symbol].status === 'pending' ? '请求中...' :
                  results[test.symbol].status === 'success' ? '成功' :
                  '失败'
                }
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="space-y-4">
        <h2 className="text-2xl font-bold">测试结果</h2>
        {Object.entries(results).length === 0 ? (
          <p className="text-muted-foreground">点击上方股票或"测试全部"按钮开始测试</p>
        ) : (
          Object.entries(results).map(([symbol, result]) => (
            <div key={symbol} className="border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">{getResultIcon(result.status)}</span>
                <h3 className="text-xl font-bold">{symbol}</h3>
                <span className="text-sm px-2 py-1 bg-secondary rounded-full">
                  {result.status === 'success' ? '成功' : result.status === 'error' ? '错误' : '请求中'}
                </span>
              </div>

              {result.status === 'error' && (
                <div className="bg-destructive/10 text-destructive p-3 rounded-md">
                  错误: {result.error}
                </div>
              )}

              {result.status === 'success' && result.quote && (
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">报价数据</h4>
                    <div className="bg-muted p-3 rounded-md font-mono text-sm overflow-x-auto">
                      <pre>{JSON.stringify({
                        价格: result.quote.c || 'N/A',
                        涨跌额: result.quote.d || 'N/A',
                        涨跌幅: result.quote.dp ? `${result.quote.dp}%` : 'N/A',
                        最高价: result.quote.h || 'N/A',
                        最低价: result.quote.l || 'N/A',
                        开盘价: result.quote.o || 'N/A',
                        成交量: result-quote.v || 'N/A',
                        数据源: result.quote._source || 'N/A',
                        融合数量: result.quote._sourceCount || 1,
                      }, null, 2)}</pre>
                    </div>
                  </div>

                  {result.profile && (
                    <div>
                      <h4 className="font-semibold mb-2">公司资料</h4>
                      <div className="bg-muted p-3 rounded-md font-mono text-sm overflow-x-auto">
                        <pre>{JSON.stringify({
                          名称: result.profile.name || 'N/A',
                          交易所: result.profile.exchange || 'N/A',
                          行业: result.profile.gics || result.profile.industry || 'N/A',
                          市值: result.profile.marketCap || 'N/A',
                          Logo: result.profile.logo ? '已加载' : 'N/A',
                          数据源: result.profile._source || 'N/A',
                          ...(result.profile.cacheTest && result.profile.cacheTest)
                        }, null, 2)}</pre>
                      </div>
                    </div>
                  )}

                  <div className="bg-blue-500/10 text-blue-700 dark:text-blue-300 p-3 rounded-md text-sm">
                    💡 <strong>数据源分析:</strong> {
                      result.quote._source === 'fused' ? `数据已融合 (${result.quote._sourceCount} 个数据源)` :
                      result.quote._source === 'finnhub' ? '使用 Finnhub 数据' :
                      result.quote._source === 'tushare' ? '使用 Tushare 数据' :
                      result.quote._source === 'alpha_vantage' ? '使用 Alpha Vantage 数据' :
                      result.quote._source
                    }
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <div className="mt-8 p-4 bg-muted rounded-lg">
        <h3 className="font-semibold mb-2">测试说明</h3>
        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
          <li><strong>美股 (AAPL, MSFT, TSLA):</strong> 使用 Finnhub 数据源</li>
          <li><strong>A股 (600519.SS):</strong> 使用 Tushare 数据源，代码自动转换为 600519.SH</li>
          <li><strong>港股 (0005.HK):</strong> 使用 Tushare 数据源</li>
          <li><strong>数据融合:</strong> 当多个数据源可用时，系统会融合数据并显示 "fused"</li>
          <li><strong>缓存:</strong> 第二次请求相同股票会命中缓存，响应更快</li>
        </ul>
      </div>
    </div>
  );
}
