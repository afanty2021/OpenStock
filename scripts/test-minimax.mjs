#!/usr/bin/env node

/**
 * MiniMax API 测试脚本
 * 验证 MiniMax API 连接和基本功能
 */

import 'dotenv/config';

const MINIMAX_API_KEY = process.env.MINIMAX_API_KEY;
const MINIMAX_BASE_URL = 'https://api.minimaxi.com/v1';

async function testMiniMaxAPI() {
    console.log('🧪 测试 MiniMax API 连接...\n');

    if (!MINIMAX_API_KEY) {
        console.error('❌ MINIMAX_API_KEY 未设置');
        console.log('请在 .env 文件中设置 MINIMAX_API_KEY');
        process.exit(1);
    }

    console.log(`📡 API Endpoint: ${MINIMAX_BASE_URL}`);
    console.log(`🔑 API Key: ${MINIMAX_API_KEY.substring(0, 20)}...***\n`);

    try {
        // 测试简单的聊天完成请求
        const testPrompt = '用一句话介绍你自己。';

        console.log('📝 发送测试请求...');
        console.log(`   Prompt: "${testPrompt}"\n`);

        const response = await fetch(`${MINIMAX_BASE_URL}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${MINIMAX_API_KEY}`
            },
            body: JSON.stringify({
                model: 'MiniMax-M2.5',
                messages: [
                    {
                        role: 'user',
                        content: testPrompt
                    }
                ],
                temperature: 0.7,
                max_tokens: 100
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`❌ API 请求失败: ${response.status} ${response.statusText}`);
            console.error(`   响应: ${errorText}`);
            process.exit(1);
        }

        const data = await response.json();

        console.log('✅ API 连接成功！\n');
        console.log('📊 响应数据:');
        console.log(`   模型: ${data.model || 'MiniMax-M2.5'}`);
        console.log(`   用途: ${data.usage ? `输入 ${data.usage.prompt_tokens} tokens, 输出 ${data.usage.completion_tokens} tokens` : 'N/A'}\n`);

        console.log('💬 AI 回复:');
        const reply = data.choices?.[0]?.message?.content || '无回复';
        console.log(`   ${reply}\n`);

        console.log('🎉 MiniMax API 测试通过！');
        console.log('   可以在 Inngest functions 中使用 MiniMax AI 了。');

    } catch (error) {
        console.error('❌ 测试失败:', error.message);
        process.exit(1);
    }
}

testMiniMaxAPI();
