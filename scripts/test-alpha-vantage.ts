/**
 * Alpha Vantage 数据源测试脚本
 *
 * 测试 Alpha Vantage API 配置和基本功能
 * 验证 API key 是否有效，以及能否获取美股数据
 */

import dotenv from 'dotenv';
import { resolve } from 'path';

// 加载环境变量
dotenv.config({ path: resolve(process.cwd(), '.env') });

const API_KEY = process.env.ALPHA_VANTAGE_API_KEY;
const BASE_URL = 'https://www.alphavantage.co/query';

// 颜色输出
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * 测试 API Key 配置
 */
function testApiKey() {
    log('\n=== Alpha Vantage API 配置检查 ===', 'blue');

    if (!API_KEY) {
        log('✗ Alpha Vantage API key 未配置', 'red');
        log('  请在 .env 文件中设置 ALPHA_VANTAGE_API_KEY', 'yellow');
        return false;
    }

    if (API_KEY === 'your_alpha_vantage_key_here') {
        log('✗ Alpha Vantage API key 未设置（使用占位符）', 'red');
        return false;
    }

    log(`✓ API Key 已配置: ${API_KEY.substring(0, 8)}...`, 'green');
    return true;
}

/**
 * 测试获取股票报价
 */
async function testQuote(symbol: string) {
    log(`\n--- 测试获取 ${symbol} 报价 ---`, 'blue');

    try {
        const url = `${BASE_URL}?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${API_KEY}`;
        log(`请求 URL: ${url.replace(API_KEY, '***')}`, 'yellow');

        const response = await fetch(url);
        const data = await response.json();

        // 检查错误
        if (data['Error Message']) {
            log(`✗ API 错误: ${data['Error Message']}`, 'red');
            return false;
        }

        if (data['Note']) {
            log(`✗ API 限制: ${data['Note']}`, 'red');
            log('  Alpha Vantage 免费版限制: 每分钟 5 次请求', 'yellow');
            return false;
        }

        const quote = data['Global Quote'];
        if (!quote) {
            log('✗ 响应中没有报价数据', 'red');
            log(`  完整响应: ${JSON.stringify(data, null, 2)}`, 'yellow');
            return false;
        }

        // 解析报价数据
        const price = parseFloat(quote['05. price']);
        const change = parseFloat(quote['09. change']);
        const changePercent = parseFloat(quote['10. change percent'].replace('%', ''));
        const high = parseFloat(quote['03. high']);
        const low = parseFloat(quote['04. low']);
        const volume = parseInt(quote['06. volume']);

        log(`✓ 成功获取 ${symbol} 报价:`, 'green');
        log(`  价格: $${price}`, 'reset');
        log(`  涨跌: $${change} (${changePercent}%)`, 'reset');
        log(`  今日最高: $${high}`, 'reset');
        log(`  今日最低: $${low}`, 'reset');
        log(`  成交量: ${volume.toLocaleString()}`, 'reset');

        return true;

    } catch (error) {
        log(`✗ 请求失败: ${error.message}`, 'red');
        return false;
    }
}

/**
 * 测试获取公司概览
 */
async function testOverview(symbol: string) {
    log(`\n--- 测试获取 ${symbol} 公司概览 ---`, 'blue');

    try {
        const url = `${BASE_URL}?function=OVERVIEW&symbol=${symbol}&apikey=${API_KEY}`;
        const response = await fetch(url);
        const data = await response.json();

        // 检查错误
        if (data['Error Message']) {
            log(`✗ API 错误: ${data['Error Message']}`, 'red');
            return false;
        }

        if (!data.Symbol) {
            log('✗ 响应中没有公司概览数据', 'red');
            return false;
        }

        log(`✓ 成功获取公司概览:`, 'green');
        log(`  名称: ${data.Name || 'N/A'}`, 'reset');
        log(`  行业: ${data.Sector || 'N/A'}`, 'reset');
        log(`  市值: ${data.MarketCapitalization || 'N/A'}`, 'reset');
        log(`  描述: ${(data.Description || 'N/A').substring(0, 100)}...`, 'reset');

        return true;

    } catch (error) {
        log(`✗ 请求失败: ${error.message}`, 'red');
        return false;
    }
}

/**
 * 主测试流程
 */
async function main() {
    log('\n╔════════════════════════════════════════╗', 'blue');
    log('║  Alpha Vantage 数据源测试工具        ║', 'blue');
    log('╚════════════════════════════════════════╝', 'blue');

    // 1. 检查 API Key
    if (!testApiKey()) {
        log('\n测试终止: API key 未配置或无效', 'red');
        process.exit(1);
    }

    // 2. 测试美股报价
    const quoteTest = await testQuote('AAPL');

    // 等待一下避免 API 限制
    if (quoteTest) {
        log('\n等待 12 秒以避免 API 限制...', 'yellow');
        await new Promise(resolve => setTimeout(resolve, 12000));
    }

    // 3. 测试公司概览
    const overviewTest = await testOverview('AAPL');

    // 总结
    log('\n╔════════════════════════════════════════╗', 'blue');
    log('║  测试结果总结                          ║', 'blue');
    log('╚════════════════════════════════════════╝', 'blue');

    log(`\nAPI Key 配置: ${API_KEY ? '✓' : '✗'}`, quoteTest ? 'green' : 'red');
    log(`股票报价测试: ${quoteTest ? '✓ 通过' : '✗ 失败'}`, quoteTest ? 'green' : 'red');
    log(`公司概览测试: ${overviewTest ? '✓ 通过' : '✗ 失败'}`, overviewTest ? 'green' : 'red');

    if (quoteTest && overviewTest) {
        log('\n✓ Alpha Vantage 数据源测试全部通过！', 'green');
        log('\n注意事项:', 'yellow');
        log('  - 免费版限制: 每分钟 5 次请求, 每天 500 次', 'reset');
        log('  - 建议在生产环境中使用缓存避免达到限制', 'reset');
        log('  - 仅支持美股市场（不支持 A 股、港股）', 'reset');

        process.exit(0);
    } else {
        log('\n✗ 部分测试失败，请检查配置', 'red');
        process.exit(1);
    }
}

// 运行测试
main().catch(error => {
    log(`\n测试过程出错: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
});
