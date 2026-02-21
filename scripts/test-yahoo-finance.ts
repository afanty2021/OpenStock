/**
 * Yahoo Finance 数据源测试脚本
 *
 * 测试 Yahoo Finance API 配置和基本功能
 * Yahoo Finance 无需 API key，支持全球市场
 */

import dotenv from 'dotenv';
import { resolve } from 'path';

// 加载环境变量
dotenv.config({ path: resolve(process.cwd(), '.env') });

// 颜色输出
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

// 动态导入的数据源模块
let dataPipeline: any;
let logger: any;

/**
 * 初始化数据源模块
 */
async function initModules() {
    const modules = await import('../lib/data-sources/index');
    dataPipeline = modules.dataPipeline;
    logger = modules.logger;
}

/**
 * 测试股票报价
 */
async function testQuote(symbol: string, market: string) {
    log(`\n--- 测试 ${market}: ${symbol} ---`, 'blue');

    try {
        const startTime = Date.now();
        const result = await dataPipeline.getQuote(symbol);
        const duration = Date.now() - startTime;

        log(`✓ 成功获取报价 (${duration}ms)`, 'green');
        log(`  价格: ${result.c}`, 'reset');
        log(`  涨跌: ${result.d} (${result.dp.toFixed(2)}%)`, 'reset');
        log(`  今开: ${result.o}`, 'reset');
        log(`  最高: ${result.h}`, 'reset');
        log(`  最低: ${result.l}`, 'reset');
        log(`  成交量: ${result.v?.toLocaleString() || 'N/A'}`, 'reset');
        log(`  数据源: ${result._source}`, 'cyan');
        if (result._sourceCount) {
            log(`  融合源数量: ${result._sourceCount}`, 'cyan');
        }

        return { success: true, result };
    } catch (error) {
        log(`✗ 获取失败: ${error.message}`, 'red');
        return { success: false, error: error.message };
    }
}

/**
 * 测试公司资料
 */
async function testProfile(symbol: string, market: string) {
    log(`\n--- 测试公司资料: ${symbol} ---`, 'blue');

    try {
        const startTime = Date.now();
        const result = await dataPipeline.getProfile(symbol);
        const duration = Date.now() - startTime;

        log(`✓ 成功获取资料 (${duration}ms)`, 'green');
        log(`  名称: ${result.name}`, 'reset');
        log(`  交易所: ${result.exchange}`, 'reset');
        log(`  行业: ${result.industry || 'N/A'}`, 'reset');
        log(`  市值: ${result.marketCap ? result.marketCap.toLocaleString() : 'N/A'}`, 'reset');
        log(`  数据源: ${result._source}`, 'cyan');

        return { success: true, result };
    } catch (error) {
        log(`✗ 获取失败: ${error.message}`, 'red');
        return { success: false, error: error.message };
    }
}

/**
 * 主测试流程
 */
async function main() {
    // 初始化模块
    await initModules();

    log('\n╔════════════════════════════════════════╗', 'blue');
    log('║  Yahoo Finance 数据源测试工具        ║', 'blue');
    log('╚════════════════════════════════════════╝', 'blue');

    log('\n✓ Yahoo Finance 无需 API key，支持全球市场', 'green');

    // 测试不同市场的股票
    const tests = [
        { symbol: 'AAPL', market: '美股' },
        { symbol: '600519.SS', market: 'A股' },
        { symbol: '0005.HK', market: '港股' },
        { symbol: 'TSLA', market: '美股' },
    ];

    const results = [];

    for (const test of tests) {
        const quoteResult = await testQuote(test.symbol, test.market);
        results.push({ ...test, type: '报价', ...quoteResult });

        // 等待一下避免请求过快
        await new Promise(resolve => setTimeout(resolve, 500));

        const profileResult = await testProfile(test.symbol, test.market);
        results.push({ ...test, type: '资料', ...profileResult });

        // 等待一下避免请求过快
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    // 打印总结
    log('\n╔════════════════════════════════════════╗', 'blue');
    log('║  测试结果总结                          ║', 'blue');
    log('╚════════════════════════════════════════╝', 'blue');

    const quoteTests = results.filter(r => r.type === '报价');
    const profileTests = results.filter(r => r.type === '资料');

    log('\n【报价测试】', 'cyan');
    quoteTests.forEach(r => {
        if (r.success) {
            log(`  ${r.symbol.padEnd(12)} | ${r.market} | ✓`, 'green');
        } else {
            log(`  ${r.symbol.padEnd(12)} | ${r.market} | ✗ ${r.error}`, 'red');
        }
    });

    log('\n【资料测试】', 'cyan');
    profileTests.forEach(r => {
        if (r.success) {
            log(`  ${r.symbol.padEnd(12)} | ${r.market} | ✓`, 'green');
        } else {
            log(`  ${r.symbol.padEnd(12)} | ${r.market} | ✗ ${r.error}`, 'red');
        }
    });

    const successCount = results.filter(r => r.success).length;
    const totalCount = results.length;
    const successRate = ((successCount / totalCount) * 100).toFixed(1);

    log(`\n总计: ${successCount}/${totalCount} 测试通过 (${successRate}%)`, 'cyan');

    if (successCount === totalCount) {
        log('\n✓ Yahoo Finance 数据源测试全部通过！', 'green');
        log('\n注意事项:', 'yellow');
        log('  - Yahoo Finance 是免费 API，不需要认证', 'reset');
        log('  - 支持全球市场：美股、A股、港股等', 'reset');
        log('  - 建议配合缓存使用，避免请求过于频繁', 'reset');
        log('  - 作为备用数据源，提高系统可用性', 'reset');

        process.exit(0);
    } else {
        log('\n⚠ 部分测试失败，请检查网络连接或股票代码', 'yellow');
        process.exit(1);
    }
}

// 运行测试
main().catch(error => {
    log(`\n测试过程出错: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
});
