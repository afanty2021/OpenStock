#!/usr/bin/env node
/**
 * 资金流向接口测试脚本
 *
 * 测试 TushareSource.getMoneyFlow() 的各种功能
 */

import { TushareSource } from '../lib/data-sources/sources/tushare.js';

// 确保环境变量已设置
if (!process.env.TUSHARE_API_TOKEN) {
  console.error('错误：TUSHARE_API_TOKEN 环境变量未设置');
  console.error('请设置环境变量：export TUSHARE_API_TOKEN=your_token');
  process.exit(1);
}

const tushare = new TushareSource();

async function testGetMoneyFlow() {
  console.log('测试 getMoneyFlow 接口...\n');

  // 测试 1: 获取当日资金流向
  console.log('测试 1: 获取当日资金流向（600519.SH 贵州茅台）');
  try {
    const today = await tushare.getMoneyFlow({ tsCode: '600519.SH' });
    console.log('✓ 成功获取数据');
    console.log(`  返回记录数: ${today.length}`);
    if (today.length > 0) {
      const record = today[0];
      console.log(`  股票代码: ${record.ts_code}`);
      console.log(`  交易日期: ${record.trade_date}`);
      console.log(`  主力净流入量: ${record.net_mf_vol ?? 'N/A'} 手`);
      console.log(`  主力净流入额: ${record.net_mf_amount ?? 'N/A'} 万元`);
      console.log(`  超大单净买入: ${record.net_buy_mf_vol ?? 'N/A'} 手`);
      console.log(`  大单净买入: ${record.net_buy_elg_vol ?? 'N/A'} 手`);
      console.log(`  中单净买入: ${record.net_buy_nr_vol ?? 'N/A'} 手`);
      console.log(`  小单净买入: ${record.net_buy_lg_vol ?? 'N/A'} 手`);
    }
  } catch (error) {
    console.error(`✗ 失败: ${error.message}`);
  }

  console.log('\n---\n');

  // 测试 2: 获取历史资金流向
  console.log('测试 2: 获取最近 5 天资金流向');
  try {
    const history = await tushare.getMoneyFlow({
      tsCode: '600519.SH',
      limit: 5,
    });
    console.log('✓ 成功获取数据');
    console.log(`  返回记录数: ${history.length}`);
    if (history.length > 0) {
      console.log('  日期范围:');
      console.log(`    最早: ${history[history.length - 1].trade_date}`);
      console.log(`    最新: ${history[0].trade_date}`);
    }
  } catch (error) {
    console.error(`✗ 失败: ${error.message}`);
  }

  console.log('\n---\n');

  // 测试 3: 获取指定日期范围资金流向
  console.log('测试 3: 获取指定日期范围资金流向');
  try {
    const range = await tushare.getMoneyFlow({
      tsCode: '600519.SH',
      startDate: '20260210',
      endDate: '20260220',
      limit: 3,
    });
    console.log('✓ 成功获取数据');
    console.log(`  返回记录数: ${range.length}`);
    if (range.length > 0) {
      console.log('  记录列表:');
      range.forEach((record, index) => {
        console.log(`    ${index + 1}. ${record.trade_date}: 主力净流入 ${record.net_mf_vol ?? 'N/A'} 手`);
      });
    }
  } catch (error) {
    console.error(`✗ 失败: ${error.message}`);
  }

  console.log('\n---\n');

  // 测试 4: Finnhub 格式代码转换
  console.log('测试 4: Finnhub 格式代码转换');
  try {
    const result = await tushare.getMoneyFlow({ tsCode: '600519.SS' }); // Finnhub 格式
    console.log('✓ 成功获取数据（Finnhub 格式已自动转换为 Tushare 格式）');
    console.log(`  返回记录数: ${result.length}`);
  } catch (error) {
    console.error(`✗ 失败: ${error.message}`);
  }

  console.log('\n---\n');

  // 测试 5: 字段完整性检查
  console.log('测试 5: 字段完整性检查');
  try {
    const data = await tushare.getMoneyFlow({ tsCode: '600519.SH', limit: 1 });
    if (data.length > 0) {
      const record = data[0];
      const fields = [
        'ts_code',
        'trade_date',
        'net_mf_vol',
        'net_mf_amount',
        'net_buy_mf_vol',
        'net_buy_mf_amount',
        'net_buy_elg_vol',
        'net_buy_elg_amount',
        'net_buy_nr_vol',
        'net_buy_nr_amount',
        'net_buy_lg_vol',
        'net_buy_lg_amount',
      ];

      const presentFields = fields.filter(field => record[field] !== undefined);
      const missingFields = fields.filter(field => record[field] === undefined);

      console.log('✓ 字段检查完成');
      console.log(`  总字段数: ${fields.length}`);
      console.log(`  存在字段: ${presentFields.length}`);
      console.log(`  缺失字段: ${missingFields.length}`);

      if (missingFields.length > 0) {
        console.log(`  缺失字段列表: ${missingFields.join(', ')}`);
      }
    }
  } catch (error) {
    console.error(`✗ 失败: ${error.message}`);
  }

  console.log('\n测试完成！');
}

// 运行测试
testGetMoneyFlow().catch(error => {
  console.error('测试过程中发生错误:', error);
  process.exit(1);
});
