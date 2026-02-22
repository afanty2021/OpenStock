/**
 * Tushare A 股特色数据测试脚本
 *
 * 测试场景：
 * 1. 龙虎榜数据获取 (top_list)
 * 2. 资金流向数据获取 (moneyflow)
 * 3. 每日指标数据获取 (daily_basic)
 */

import dotenv from 'dotenv';
import { resolve } from 'path';

// 加载环境变量
dotenv.config({ path: resolve(process.cwd(), '.env') });

// 测试配置
const TEST_SYMBOLS = {
  MAOTAI: '600519.SS',  // 贵州茅台
  TENCENT: '00700.HK',  // 腾讯控股
};

// 测试结果
const results: {
  test: string;
  success: boolean;
  duration?: number;
  error?: string;
  data?: any;
}[] = [];

/**
 * 初始化数据源模块
 */
async function initModules() {
  const { TushareSource } = await import('../lib/data-sources/sources/tushare');
  return new TushareSource();
}

/**
 * 测试龙虎榜数据获取
 */
async function testTopList(source: any, date?: string) {
  const testDate = date || new Date().toISOString().split('T')[0].replace(/-/g, '');
  console.log(`\n【测试 1】龙虎榜数据获取`);
  console.log(`  日期: ${testDate}`);

  const startTime = performance.now();

  try {
    const data = await source.getTopList(testDate);
    const duration = performance.now() - startTime;

    results.push({
      test: 'getTopList',
      success: true,
      duration: Math.round(duration),
      data: {
        count: data.length,
        first: data[0] || null,
      },
    });

    console.log(`  ✓ 成功 (${duration.toFixed(0)}ms)`);
    console.log(`  获取 ${data.length} 条龙虎榜数据`);

    if (data.length > 0) {
      console.log(`  示例: ${data[0].ts_code} ${data[0].name} - ${data[0].reason}`);
    }
  } catch (error: any) {
    const duration = performance.now() - startTime;
    results.push({
      test: 'getTopList',
      success: false,
      duration: Math.round(duration),
      error: error.message,
    });
    console.log(`  ✗ 失败: ${error.message}`);
  }
}

/**
 * 测试资金流向数据获取
 */
async function testMoneyFlow(source: any, symbol: string) {
  console.log(`\n【测试 2】资金流向数据获取`);
  console.log(`  股票: ${symbol}`);

  const startTime = performance.now();

  try {
    const data = await source.getMoneyFlow(symbol);
    const duration = performance.now() - startTime;

    results.push({
      test: 'getMoneyFlow',
      success: true,
      duration: Math.round(duration),
      data,
    });

    console.log(`  ✓ 成功 (${duration.toFixed(0)}ms)`);
    console.log(`  股票代码: ${data.ts_code}`);
    console.log(`  大单买入: ${data.buy_lg_vol || 'N/A'}`);
    console.log(`  大单卖出: ${data.sell_lg_vol || 'N/A'}`);
    console.log(`  净流入: ${data.net_mf_vol || 'N/A'}`);
  } catch (error: any) {
    const duration = performance.now() - startTime;
    results.push({
      test: 'getMoneyFlow',
      success: false,
      duration: Math.round(duration),
      error: error.message,
    });
    console.log(`  ✗ 失败: ${error.message}`);
  }
}

/**
 * 测试每日指标数据获取
 */
async function testDailyBasic(source: any, symbol: string) {
  console.log(`\n【测试 3】每日指标数据获取`);
  console.log(`  股票: ${symbol}`);

  const startTime = performance.now();

  try {
    const data = await source.getDailyBasic(symbol);
    const duration = performance.now() - startTime;

    results.push({
      test: 'getDailyBasic',
      success: true,
      duration: Math.round(duration),
      data,
    });

    console.log(`  ✓ 成功 (${duration.toFixed(0)}ms)`);
    console.log(`  股票代码: ${data.ts_code}`);
    console.log(`  市盈率 TTM: ${data.pe_ttm || 'N/A'}`);
    console.log(`  市净率: ${data.pb || 'N/A'}`);
    console.log(`  换手率: ${data.turnover || 'N/A'}%`);
    console.log(`  总市值: ${data.total_mv ? (data.total_mv / 10000).toFixed(2) + '亿' : 'N/A'}`);
    console.log(`  流通市值: ${data.circ_mv ? (data.circ_mv / 10000).toFixed(2) + '亿' : 'N/A'}`);
  } catch (error: any) {
    const duration = performance.now() - startTime;
    results.push({
      test: 'getDailyBasic',
      success: false,
      duration: Math.round(duration),
      error: error.message,
    });
    console.log(`  ✗ 失败: ${error.message}`);
  }
}

/**
 * 打印测试报告
 */
function printReport() {
  console.log('\n' + '='.repeat(60));
  console.log('测试报告');
  console.log('='.repeat(60));

  let successCount = 0;
  let totalDuration = 0;

  results.forEach((result, i) => {
    const status = result.success ? '✓' : '✗';
    const duration = result.duration ? `${result.duration}ms` : 'N/A';
    totalDuration += result.duration || 0;

    if (result.success) successCount++;

    console.log(`\n${status} 测试 ${i + 1}: ${result.test}`);
    console.log(`  状态: ${result.success ? '成功' : '失败'}`);
    console.log(`  耗时: ${duration}`);

    if (result.error) {
      console.log(`  错误: ${result.error}`);
    }
  });

  console.log('\n' + '-'.repeat(60));
  console.log(`总计: ${successCount}/${results.length} 通过`);
  console.log(`总耗时: ${totalDuration.toFixed(0)}ms`);
  console.log('='.repeat(60));
}

/**
 * 主测试流程
 */
async function main() {
  console.log('='.repeat(60));
  console.log('Tushare A 股特色数据测试');
  console.log('='.repeat(60));

  // 检查 API 配置
  const hasTushare = !!process.env.TUSHARE_API_TOKEN &&
    process.env.TUSHARE_API_TOKEN !== 'your_tushare_token_here';

  if (!hasTushare) {
    console.log('\n✗ Tushare API token 未配置');
    console.log('请在 .env 文件中设置 TUSHARE_API_TOKEN');
    process.exit(1);
  }

  console.log('\n✓ Tushare API 已配置');

  try {
    // 初始化数据源
    const source = await initModules();

    // 1. 测试龙虎榜数据
    await testTopList(source);

    // 2. 测试资金流向数据 - A 股
    await testMoneyFlow(source, TEST_SYMBOLS.MAOTAI);

    // 3. 测试每日指标数据 - A 股
    await testDailyBasic(source, TEST_SYMBOLS.MAOTAI);

    // 打印报告
    printReport();

    // 返回退出码
    const failedTests = results.filter(r => !r.success).length;
    process.exit(failedTests > 0 ? 1 : 0);

  } catch (error: any) {
    console.error(`\n测试失败: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// 运行测试
main();
