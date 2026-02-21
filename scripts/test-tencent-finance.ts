/**
 * 腾讯财经数据源测试脚本
 *
 * 测试腾讯财经 API 配置和基本功能
 * 腾讯财经无需 API key，支持港股和A股
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
        log(`  昨收: ${result.pc}`, 'reset');
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
 * 主测试流程
 */
async function main() {
    // 初始化模块
    await initModules();

    log('\n╔════════════════════════════════════════╗', 'blue');
    log('║  腾讯财经数据源测试工具              ║', 'blue');
    log('╚════════════════════════════════════════╝', 'blue');

    log('\n✓ 腾讯财经无需 API key，支持港股和A股', 'green');

    // 测试港股和A股
    const tests = [
        { symbol: '0005.HK', market: '港股' },      // 汇丰控股
        { symbol: '0700.HK', market: '港股' },      // 腾讯控股
        { symbol: '600519.SS', market: 'A股' },    // 贵州茅台
        { symbol: '000001.SZ', market: 'A股' },    // 平安银行
    ];

    const results = [];

    for (const test of tests) {
        const quoteResult = await testQuote(test.symbol, test.market);
        results.push({ ...test, ...quoteResult });

        // 等待一下避免请求过快
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    // 打印总结
    log('\n╔════════════════════════════════════════╗', 'blue');
    log('║  测试结果总结                          ║', 'blue');
    log('╚════════════════════════════════════════╝', 'blue');

    log('\n【测试结果】', 'cyan');
    results.forEach(r => {
        if (r.success) {
            const price = r.result?.c || 'N/A';
            const change = r.result?.d?.toFixed(2) || 'N/A';
            log(`  ${r.symbol.padEnd(12)} | ${r.market.padEnd(6)} | ✓ ${price} (${change}%)`, 'green');
        } else {
            log(`  ${r.symbol.padEnd(12)} | ${r.market.padEnd(6)} | ✗ ${r.error}`, 'red');
        }
    });

    const successCount = results.filter(r => r.success).length;
    const totalCount = results.length;
    const successRate = ((successCount / totalCount) * 100).toFixed(1);

    log(`\n总计: ${successCount}/${totalCount} 测试通过 (${successRate}%)`, 'cyan');

    if (successCount === totalCount) {
        log('\n✓ 腾讯财经数据源测试全部通过！', 'green');
        log('\n注意事项:', 'yellow');
        log('  - 腾讯财经是免费 API，不需要认证', 'reset');
        log('  - 支持港股和 A 股市场', 'reset');
        log('  - 数据实时更新，延迟低', 'reset');
        log('  - 作为港股首选数据源', 'reset');

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
