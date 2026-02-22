/**
 * Tushare A 股特色数据接口最终测试
 * 验证新增的三个方法
 */

import dotenv from 'dotenv';
import { resolve } from 'path';

// 加载环境变量
dotenv.config({ path: resolve(process.cwd(), '.env') });

const TUSHARE_TOKEN = process.env.TUSHARE_API_TOKEN;

if (!TUSHARE_TOKEN) {
  console.log('✗ Tushare API token 未配置');
  process.exit(1);
}

// 动态导入数据源模块
async function testNewMethods() {
  console.log('='.repeat(60));
  console.log('Tushare A 股特色数据接口测试');
  console.log('='.repeat(60));

  // 动态导入 ES 模块
  const module = await import('../lib/data-sources/sources/tushare.ts');
  const TushareSource = module.TushareSource;

  const source = new TushareSource();
  const results = [];

  // 测试 1: 龙虎榜数据
  console.log('\n【测试 1】龙虎榜数据 (getTopList)');
  try {
    const startTime = performance.now();
    const topList = await source.getTopList();
    const duration = performance.now() - startTime;

    results.push({ test: 'getTopList', success: true, duration });
    console.log(`  ✓ 成功 (${duration.toFixed(0)}ms)`);
    console.log(`  获取 ${topList.length} 条记录`);
    if (topList.length > 0) {
      console.log(`  示例: ${topList[0].ts_code} - ${topList[0].name}`);
    }
  } catch (error) {
    results.push({ test: 'getTopList', success: false, error: error.message });
    console.log(`  ✗ 失败: ${error.message}`);
  }

  // 测试 2: 资金流向数据
  console.log('\n【测试 2】资金流向数据 (getMoneyFlow)');
  try {
    const startTime = performance.now();
    const moneyFlow = await source.getMoneyFlow('600519.SS');
    const duration = performance.now() - startTime;

    results.push({ test: 'getMoneyFlow', success: true, duration });
    console.log(`  ✓ 成功 (${duration.toFixed(0)}ms)`);
    console.log(`  股票: ${moneyFlow.ts_code}`);
    console.log(`  净流入: ${moneyFlow.net_mf_vol || 'N/A'}`);
  } catch (error) {
    results.push({ test: 'getMoneyFlow', success: false, error: error.message });
    console.log(`  ✗ 失败: ${error.message}`);
    console.log(`  注: 这是预期的，因为今日可能无资金流向数据`);
  }

  // 测试 3: 每日指标数据
  console.log('\n【测试 3】每日指标数据 (getDailyBasic)');
  try {
    const startTime = performance.now();
    const dailyBasic = await source.getDailyBasic('600519.SS');
    const duration = performance.now() - startTime;

    results.push({ test: 'getDailyBasic', success: true, duration });
    console.log(`  ✓ 成功 (${duration.toFixed(0)}ms)`);
    console.log(`  股票: ${dailyBasic.ts_code}`);
    console.log(`  市盈率 TTM: ${dailyBasic.pe_ttm || 'N/A'}`);
    console.log(`  市净率: ${dailyBasic.pb || 'N/A'}`);
    console.log(`  换手率: ${dailyBasic.turnover || 'N/A'}%`);
    console.log(`  总市值: ${dailyBasic.total_mv ? (dailyBasic.total_mv / 10000).toFixed(2) + '亿' : 'N/A'}`);
  } catch (error) {
    results.push({ test: 'getDailyBasic', success: false, error: error.message });
    console.log(`  ✗ 失败: ${error.message}`);
  }

  // 打印总结
  console.log('\n' + '='.repeat(60));
  const successCount = results.filter(r => r.success).length;
  console.log(`测试完成: ${successCount}/${results.length} 通过`);
  console.log('='.repeat(60));

  return results;
}

// 运行测试
testNewMethods()
  .then(results => {
    const failed = results.filter(r => !r.success).length;
    process.exit(filed > 0 ? 1 : 0);
  })
  .catch(error => {
    console.error('测试失败:', error);
    process.exit(1);
  });
