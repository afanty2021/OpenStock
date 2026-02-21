/**
 * 多数据源聚合系统测试脚本
 *
 * 测试场景：
 * 1. 美股股票 (AAPL) - 使用 Finnhub
 * 2. A股股票 (600519.SS - 贵州茅台) - 使用 Tushare
 * 3. 港股股票 (0005.HK - 汇丰控股) - 使用 Tushare
 * 4. 搜索功能测试
 */

import { dataPipeline } from '../lib/data-sources/pipeline.ts';

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function section(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'bright');
  console.log('='.repeat(60));
}

async function testUSStock() {
  section('测试 1: 美股股票 (AAPL)');
  const symbol = 'AAPL';

  try {
    log(`📊 获取 ${symbol} 报价...`, 'cyan');

    const quote = await dataPipeline.getQuote(symbol);

    if (quote) {
      log('✅ 报价获取成功!', 'green');
      console.log(JSON.stringify({
        symbol: quote.c || 'N/A',
        price: quote.c || 'N/A',
        change: quote.d || 'N/A',
        changePercent: quote.dp || 'N/A',
        high: quote.h || 'N/A',
        low: quote.l || 'N/A',
        source: quote._source || 'N/A',
        sourceCount: quote._sourceCount || 1,
      }, null, 2));

      // 获取公司资料
      log(`\n📰 获取 ${symbol} 公司资料...`, 'cyan');
      const profile = await dataPipeline.getProfile(symbol);

      if (profile) {
        log('✅ 公司资料获取成功!', 'green');
        console.log(JSON.stringify({
          name: profile.name || 'N/A',
          exchange: profile.exchange || 'N/A',
          industry: profile.gics || 'N/A',
          marketCap: profile.marketCap || 'N/A',
          logo: profile.logo || 'N/A',
          source: profile._source || 'N/A',
        }, null, 2));
      }
    } else {
      log('❌ 报价获取失败', 'red');
    }
  } catch (error) {
    log(`❌ 错误: ${error.message}`, 'red');
    console.error(error);
  }
}

async function testAStock() {
  section('测试 2: A股股票 (600519.SS - 贵州茅台)');
  const symbol = '600519.SS';

  try {
    log(`📊 获取 ${symbol} 报价...`, 'cyan');

    const quote = await dataPipeline.getQuote(symbol);

    if (quote) {
      log('✅ 报价获取成功!', 'green');
      console.log(JSON.stringify({
        symbol: symbol,
        price: quote.c || 'N/A',
        change: quote.d || 'N/A',
        changePercent: quote.dp || 'N/A',
        high: quote.h || 'N/A',
        low: quote.l || 'N/A',
        source: quote._source || 'N/A',
        sourceCount: quote._sourceCount || 1,
      }, null, 2));

      // 获取公司资料
      log(`\n📰 获取 ${symbol} 公司资料...`, 'cyan');
      const profile = await dataPipeline.getProfile(symbol);

      if (profile) {
        log('✅ 公司资料获取成功!', 'green');
        console.log(JSON.stringify({
          name: profile.name || 'N/A',
          exchange: profile.exchange || 'N/A',
          industry: profile.industry || 'N/A',
          marketCap: profile.marketCap || 'N/A',
          source: profile._source || 'N/A',
        }, null, 2));
      }
    } else {
      log('❌ 报价获取失败', 'red');
    }
  } catch (error) {
    log(`❌ 错误: ${error.message}`, 'red');
    console.error(error);
  }
}

async function testHKStock() {
  section('测试 3: 港股股票 (0005.HK - 汇丰控股)');
  const symbol = '0005.HK';

  try {
    log(`📊 获取 ${symbol} 报价...`, 'cyan');

    const quote = await dataPipeline.getQuote(symbol);

    if (quote) {
      log('✅ 报价获取成功!', 'green');
      console.log(JSON.stringify({
        symbol: symbol,
        price: quote.c || 'N/A',
        change: quote.d || 'N/A',
        changePercent: quote.dp || 'N/A',
        high: quote.h || 'N/A',
        low: quote.l || 'N/A',
        source: quote._source || 'N/A',
        sourceCount: quote._sourceCount || 1,
      }, null, 2));

      // 获取公司资料
      log(`\n📰 获取 ${symbol} 公司资料...`, 'cyan');
      const profile = await dataPipeline.getProfile(symbol);

      if (profile) {
        log('✅ 公司资料获取成功!', 'green');
        console.log(JSON.stringify({
          name: profile.name || 'N/A',
          exchange: profile.exchange || 'N/A',
          industry: profile.industry || 'N/A',
          marketCap: profile.marketCap || 'N/A',
          source: profile._source || 'N/A',
        }, null, 2));
      }
    } else {
      log('❌ 报价获取失败', 'red');
    }
  } catch (error) {
    log(`❌ 错误: ${error.message}`, 'red');
    console.error(error);
  }
}

async function testSearch() {
  section('测试 4: 股票搜索功能');

  const queries = ['AAPL', '茅台', '腾讯'];

  for (const query of queries) {
    try {
      log(`\n🔍 搜索 "${query}"...`, 'cyan');

      const results = await dataPipeline.searchStocks(query);

      if (results && results.length > 0) {
        log(`✅ 找到 ${results.length} 个结果`, 'green');
        console.log(JSON.stringify(results.slice(0, 3), null, 2));
      } else {
        log(`⚠️ 未找到 "${query}" 的结果`, 'yellow');
      }
    } catch (error) {
      log(`❌ 搜索错误: ${error.message}`, 'red');
    }
  }
}

async function testBatchQuotes() {
  section('测试 5: 批量获取报价');

  const symbols = ['AAPL', 'MSFT', 'GOOGL'];

  try {
    log(`📊 批量获取 ${symbols.length} 只股票报价...`, 'cyan');

    const quotes = await dataPipeline.getBatchQuotes(symbols);

    if (quotes && quotes.length > 0) {
      log(`✅ 成功获取 ${quotes.length}/${symbols.length} 只股票报价`, 'green');
      console.log(JSON.stringify(quotes.map(q => ({
        symbol: q._symbol || 'N/A',
        price: q.c,
        source: q._source,
      })), null, 2));
    } else {
      log('❌ 批量获取失败', 'red');
    }
  } catch (error) {
    log(`❌ 错误: ${error.message}`, 'red');
    console.error(error);
  }
}

async function testCacheHitRate() {
  section('测试 6: 缓存命中率');

  const symbol = 'AAPL';

  try {
    log(`🔄 重复获取 ${symbol} 报价 3 次以测试缓存...`, 'cyan');

    // 第一次请求（缓存未命中）
    await dataPipeline.getQuote(symbol);

    // 第二次请求（缓存命中）
    await dataPipeline.getQuote(symbol);

    // 第三次请求（缓存命中）
    await dataPipeline.getQuote(symbol);

    const stats = dataPipeline.getStats();

    log('\n📊 缓存统计:', 'cyan');
    console.log(JSON.stringify({
      cacheHits: stats.cacheHits,
      cacheMisses: stats.cacheMisses,
      totalRequests: stats.totalRequests,
      hitRate: `${(dataPipeline.getCacheHitRate() * 100).toFixed(1)}%`,
    }, null, 2));

    if (dataPipeline.getCacheHitRate() > 0.5) {
      log(`✅ 缓存工作正常! 命中率: ${(dataPipeline.getCacheHitRate() * 100).toFixed(1)}%`, 'green');
    } else {
      log('⚠️ 缓存命中率较低', 'yellow');
    }
  } catch (error) {
    log(`❌ 错误: ${error.message}`, 'red');
    console.error(error);
  }
}

async function main() {
  log('\n🚀 多数据源聚合系统测试开始', 'bright');
  log('========================\n', 'bright');

  try {
    await testUSStock();
    await new Promise(resolve => setTimeout(resolve, 1000));

    await testAStock();
    await new Promise(resolve => setTimeout(resolve, 1000));

    await testHKStock();
    await new Promise(resolve => setTimeout(resolve, 1000));

    await testSearch();
    await new Promise(resolve => setTimeout(resolve, 1000));

    await testBatchQuotes();
    await new Promise(resolve => setTimeout(resolve, 1000));

    await testCacheHitRate();

    section('测试完成');
    log('✅ 所有测试已完成!', 'green');
    log('\n💡 提示: 检查日志中的数据源(_source)字段以验证多源聚合是否工作', 'yellow');

  } catch (error) {
    log('\n❌ 测试失败', 'red');
    console.error(error);
    process.exit(1);
  }
}

main();
