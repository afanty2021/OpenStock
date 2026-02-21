/**
 * Tushare 数据源调试脚本
 */

const TUSHARE_API_TOKEN = 'eb13b3bfd2bd07fd9eb40234f19941c73f230e1e98cc212b8cd407c7';

// 获取最新交易日期
function getLatestTradeDate() {
  const date = new Date();
  const dayOfWeek = date.getDay();

  if (dayOfWeek === 0) {
    date.setDate(date.getDate() - 2);
  } else if (dayOfWeek === 6) {
    date.setDate(date.getDate() - 1);
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

// 转换股票代码
function toTushareCode(symbol) {
  if (symbol.endsWith('.SS')) return symbol.replace(/\.SS$/i, '.SH');
  if (symbol.endsWith('.se')) return symbol.replace(/\.se$/i, '.SZ');
  return symbol.toUpperCase();
}

// 测试 Tushare API
async function testTushareAPI() {
  const tradeDate = getLatestTradeDate();
  console.log('📅 交易日期:', tradeDate);

  const testCases = [
    { symbol: '600519.SS', name: '贵州茅台 (A股)' },
    { symbol: '0005.HK', name: '汇丰控股 (港股)' },
  ];

  for (const test of testCases) {
    const tsCode = toTushareCode(test.symbol);
    console.log(`\n📊 测试 ${test.name}`);
    console.log(`   原代码: ${test.symbol}`);
    console.log(`   Tushare代码: ${tsCode}`);

    try {
      const response = await fetch('http://api.tushare.pro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_name: 'daily',
          token: TUSHARE_API_TOKEN,
          params: {
            ts_code: tsCode,
            trade_date: tradeDate,
          },
          fields: 'ts_code,trade_date,open,high,low,close,pre_close,vol,amount'
        })
      });

      const result = await response.json();
      console.log(`   API响应码: ${result.code}`);

      if (result.code === 0) {
        if (result.data.items && result.data.items.length > 0) {
          const item = result.data.items[0];
          const fields = result.data.fields;
          const obj = fields.reduce((o, f, i) => { o[f] = item[i]; return o; }, {});
          console.log(`   ✅ 数据获取成功:`);
          console.log(`      收盘价: ${obj.close}`);
          console.log(`   涨跌幅: ${((obj.close - obj.pre_close) / obj.pre_close * 100).toFixed(2)}%`);
        } else {
          console.log(`   ⚠️ 无数据返回 (items 为空)`);
        }
      } else {
        console.log(`   ❌ API错误: ${result.msg}`);
      }
    } catch (error) {
      console.log(`   ❌ 请求失败: ${error.message}`);
    }
  }
}

testTushareAPI();
