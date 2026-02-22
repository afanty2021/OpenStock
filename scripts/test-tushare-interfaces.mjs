/**
 * Tushare A 股特色数据接口直接测试
 * 用于验证接口参数和响应格式
 */

import dotenv from 'dotenv';
import { resolve } from 'path';

// 加载环境变量
dotenv.config({ path: resolve(process.cwd(), '.env') });

const TUSHARE_API_URL = 'http://api.tushare.pro';
const TUSHARE_TOKEN = process.env.TUSHARE_API_TOKEN || '';

// 获取昨天日期
function getYesterday() {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

// 转换股票代码为 Tushare 格式
function toTushareCode(symbol) {
  if (symbol.endsWith('.SS')) return symbol.replace(/\.SS$/i, '.SH');
  if (symbol.endsWith('.se')) return symbol.replace(/\.se$/i, '.SZ');
  return symbol.toUpperCase();
}

// 数据转换工具
function transformTushareData(response) {
  if (!response.data || !response.data.fields || !response.data.items) {
    return [];
  }
  const { fields, items } = response.data;
  return items.map(item =>
    fields.reduce((obj, field, i) => {
      obj[field] = item[i];
      return obj;
    }, {})
  );
}

// 测试龙虎榜接口
async function testTopList() {
  console.log('\n【测试 1】龙虎榜接口 (top_list)');
  const tradeDate = getYesterday();
  console.log(`  日期: ${tradeDate}`);

  try {
    const response = await fetch(TUSHARE_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_name: 'top_list',
        token: TUSHARE_TOKEN,
        params: { trade_date: tradeDate },
        fields: 'ts_code,name,reason,buy_amount,sell_amount,net_amount'
      })
    });

    const result = await response.json();
    console.log(`  响应码: ${result.code}`);

    if (result.code === 0) {
      const data = transformTushareData(result);
      console.log(`  ✓ 成功! 获取 ${data.length} 条记录`);
      if (data.length > 0) {
        console.log(`  示例: ${JSON.stringify(data[0], null, 2)}`);
      }
    } else {
      console.log(`  ✗ 失败: ${result.msg}`);
    }
  } catch (error) {
    console.log(`  ✗ 错误: ${error.message}`);
  }
}

// 测试资金流向接口
async function testMoneyFlow() {
  console.log('\n【测试 2】资金流向接口 (moneyflow)');
  const symbol = '600519.SH'; // 贵州茅台
  const tradeDate = getYesterday();
  console.log(`  股票: ${symbol}`);
  console.log(`  日期: ${tradeDate}`);

  try {
    const response = await fetch(TUSHARE_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_name: 'moneyflow',
        token: TUSHARE_TOKEN,
        params: { ts_code: symbol, trade_date: tradeDate },
        fields: 'ts_code,trade_date,buy_elg_vol,sell_elg_vol,buy_lg_vol,sell_lg_vol,net_mf_vol'
      })
    });

    const result = await response.json();
    console.log(`  响应码: ${result.code}`);

    if (result.code === 0) {
      const data = transformTushareData(result);
      console.log(`  ✓ 成功! 获取 ${data.length} 条记录`);
      if (data.length > 0) {
        console.log(`  数据: ${JSON.stringify(data[0], null, 2)}`);
      }
    } else {
      console.log(`  ✗ 失败: ${result.msg}`);
    }
  } catch (error) {
    console.log(`  ✗ 错误: ${error.message}`);
  }
}

// 测试每日指标接口
async function testDailyBasic() {
  console.log('\n【测试 3】每日指标接口 (daily_basic)');
  const symbol = '600519.SH'; // 贵州茅台
  const tradeDate = getYesterday();
  console.log(`  股票: ${symbol}`);
  console.log(`  日期: ${tradeDate}`);

  try {
    const response = await fetch(TUSHARE_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_name: 'daily_basic',
        token: TUSHARE_TOKEN,
        params: { ts_code: symbol, trade_date: tradeDate },
        fields: 'ts_code,trade_date,pe_ttm,pb,ps_ttm,pcf_ratio,turnover,volume_ratio,total_mv,circ_mv'
      })
    });

    const result = await response.json();
    console.log(`  响应码: ${result.code}`);

    if (result.code === 0) {
      const data = transformTushareData(result);
      console.log(`  ✓ 成功! 获取 ${data.length} 条记录`);
      if (data.length > 0) {
        console.log(`  数据: ${JSON.stringify(data[0], null, 2)}`);
      }
    } else {
      console.log(`  ✗ 失败: ${result.msg}`);
    }
  } catch (error) {
    console.log(`  ✗ 错误: ${error.message}`);
  }
}

// 测试每日指标接口（不指定日期）
async function testDailyBasicNoDate() {
  console.log('\n【测试 4】每日指标接口 (daily_basic) - 不指定日期');
  const symbol = '600519.SH'; // 贵州茅台
  console.log(`  股票: ${symbol}`);

  try {
    const response = await fetch(TUSHARE_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_name: 'daily_basic',
        token: TUSHARE_TOKEN,
        params: { ts_code: symbol },
        fields: 'ts_code,trade_date,pe_ttm,pb,ps_ttm,pcf_ratio,turnover,volume_ratio,total_mv,circ_mv'
      })
    });

    const result = await response.json();
    console.log(`  响应码: ${result.code}`);

    if (result.code === 0) {
      const data = transformTushareData(result);
      console.log(`  ✓ 成功! 获取 ${data.length} 条记录`);
      if (data.length > 0) {
        console.log(`  最新数据: ${JSON.stringify(data[0], null, 2)}`);
      }
    } else {
      console.log(`  ✗ 失败: ${result.msg}`);
    }
  } catch (error) {
    console.log(`  ✗ 错误: ${error.message}`);
  }
}

// 主函数
async function main() {
  console.log('='.repeat(60));
  console.log('Tushare A 股特色数据接口测试');
  console.log('='.repeat(60));

  if (!TUSHARE_TOKEN) {
    console.log('\n✗ TUSHARE_API_TOKEN 未设置');
    process.exit(1);
  }

  await testTopList();
  await testMoneyFlow();
  await testDailyBasic();
  await testDailyBasicNoDate();

  console.log('\n' + '='.repeat(60));
  console.log('测试完成');
  console.log('='.repeat(60));
}

main();
