/**
 * 多数据源聚合系统测试 API
 *
 * GET /api/test-multi-source?symbol=AAPL&action=quote
 * GET /api/test-multi-source?symbol=AAPL&action=profile
 * GET /api/test-multi-source?action=test-all
 *
 * 测试结果返回 JSON 格式
 */

import { NextRequest, NextResponse } from 'next/server';
import { dataPipeline } from '@/lib/data-sources';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface TestResponse {
  success: boolean;
  action: string;
  data?: any;
  error?: string;
  metadata?: {
    timestamp: string;
    duration: number;
    source?: string;
    sourceCount?: number;
  };
}

async function testQuote(symbol: string): Promise<TestResponse> {
  const start = Date.now();

  try {
    const quote = await dataPipeline.getQuote(symbol);
    const duration = Date.now() - start;

    return {
      success: true,
      action: 'quote',
      data: {
        symbol,
        price: quote?.c || null,
        change: quote?.d || null,
        changePercent: quote?.dp || null,
        high: quote?.h || null,
        low: quote?.l || null,
        open: quote?.o || null,
        prevClose: quote?.pc || null,
        volume: quote?.v || null,
      },
      metadata: {
        timestamp: new Date().toISOString(),
        duration,
        source: quote?._source,
        sourceCount: quote?._sourceCount,
      },
    };
  } catch (error) {
    const duration = Date.now() - start;
    return {
      success: false,
      action: 'quote',
      error: error instanceof Error ? error.message : String(error),
      metadata: {
        timestamp: new Date().toISOString(),
        duration,
      },
    };
  }
}

async function testProfile(symbol: string): Promise<TestResponse> {
  const start = Date.now();

  try {
    const profile = await dataPipeline.getProfile(symbol);
    const duration = Date.now() - start;

    return {
      success: true,
      action: 'profile',
      data: {
        symbol,
        name: profile?.name || null,
        exchange: profile?.exchange || null,
        industry: profile?.gics || profile?.industry || null,
        marketCap: profile?.marketCap || null,
        logo: profile?.logo || null,
        website: profile?.weburl || null,
      },
      metadata: {
        timestamp: new Date().toISOString(),
        duration,
        source: profile?._source,
      },
    };
  } catch (error) {
    const duration = Date.now() - start;
    return {
      success: false,
      action: 'profile',
      error: error instanceof Error ? error.message : String(error),
      metadata: {
        timestamp: new Date().toISOString(),
        duration,
      },
    };
  }
}

async function testSearch(query: string): Promise<TestResponse> {
  const start = Date.now();

  try {
    const results = await dataPipeline.searchStocks(query);
    const duration = Date.now() - start;

    return {
      success: true,
      action: 'search',
      data: {
        query,
        count: results?.length || 0,
        results: results?.slice(0, 5) || [],
      },
      metadata: {
        timestamp: new Date().toISOString(),
        duration,
      },
    };
  } catch (error) {
    const duration = Date.now() - start;
    return {
      success: false,
      action: 'search',
      error: error instanceof Error ? error.message : String(error),
      metadata: {
        timestamp: new Date().toISOString(),
        duration,
      },
    };
  }
}

async function testAll(): Promise<TestResponse> {
  const testSymbols = [
    { symbol: 'AAPL', name: '苹果 (美股)' },
    { symbol: '600519.SS', name: '贵州茅台 (A股)' },
    { symbol: '0005.HK', name: '汇丰控股 (港股)' },
  ];

  const start = Date.now();
  const results: Record<string, any> = {};

  for (const test of testSymbols) {
    try {
      const quote = await dataPipeline.getQuote(test.symbol);
      const profile = await dataPipeline.getProfile(test.symbol);

      results[test.symbol] = {
        name: test.name,
        quote: {
          price: quote?.c,
          change: quote?.d,
          changePercent: quote?.dp,
          source: quote?._source,
          sourceCount: quote?._sourceCount,
        },
        profile: {
          name: profile?.name,
          exchange: profile?.exchange,
          source: profile?._source,
        },
        success: true,
      };
    } catch (error) {
      results[test.symbol] = {
        name: test.name,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  const duration = Date.now() - start;

  return {
    success: true,
    action: 'test-all',
    data: results,
    metadata: {
      timestamp: new Date().toISOString(),
      duration,
    },
  };
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const symbol = searchParams.get('symbol');
  const action = searchParams.get('action') || 'quote';

  try {
    switch (action) {
      case 'quote':
        if (!symbol) {
          return NextResponse.json(
            { success: false, error: 'symbol parameter required' },
            { status: 400 }
          );
        }
        return NextResponse.json(await testQuote(symbol));

      case 'profile':
        if (!symbol) {
          return NextResponse.json(
            { success: false, error: 'symbol parameter required' },
            { status: 400 }
          );
        }
        return NextResponse.json(await testProfile(symbol));

      case 'search':
        const query = searchParams.get('q') || symbol || '';
        return NextResponse.json(await testSearch(query));

      case 'test-all':
        return NextResponse.json(await testAll());

      case 'cache-stats':
        return NextResponse.json({
          success: true,
          action: 'cache-stats',
          data: dataPipeline.getStats(),
          metadata: {
            hitRate: dataPipeline.getCacheHitRate(),
            timestamp: new Date().toISOString(),
          },
        });

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
