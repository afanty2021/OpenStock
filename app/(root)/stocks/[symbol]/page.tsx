import TradingViewWidget from "@/components/TradingViewWidget";
import WatchlistButton from "@/components/WatchlistButton";
import TopListPanel from "@/components/watchlist/TopListPanel";
import MoneyFlowCard from "@/components/watchlist/MoneyFlowCard";
import MarginPanel from "@/components/watchlist/MarginPanel";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import {
    SYMBOL_INFO_WIDGET_CONFIG,
    CANDLE_CHART_WIDGET_CONFIG,
    BASELINE_WIDGET_CONFIG,
    TECHNICAL_ANALYSIS_WIDGET_CONFIG,
    COMPANY_PROFILE_WIDGET_CONFIG,
    COMPANY_FINANCIALS_WIDGET_CONFIG,
} from "@/lib/constants";

import { auth } from '@/lib/better-auth/auth';
import { headers } from 'next/headers';
import { isStockInWatchlist } from '@/lib/actions/watchlist.actions';
import { getStockDetail } from '@/lib/actions/stock-detail.actions';
import { formatSymbolForTradingView } from '@/lib/utils';
import { AStockCodeUtil } from '@/lib/data-sources/astock';
import { Suspense } from 'react';
import { StockDetailHeader, StockDetailHeaderSkeleton } from '@/components/astock';

export default async function StockDetails({ params }: { params: Promise<{ symbol: string }> }) {
    const { symbol } = await params;
    const tvSymbol = formatSymbolForTradingView(symbol);
    const scriptUrl = `https://s3.tradingview.com/external-embedding/embed-widget-`;

    // 判断是否为 A 股
    const isAStock = AStockCodeUtil.isAStock(symbol);

    const session = await auth.api.getSession({
        headers: await headers()
    });
    const userId = session?.user?.id;
    const isInWatchlist = userId ? await isStockInWatchlist(userId, symbol) : false;

    // 获取股票详情数据 (仅 A 股)
    const stockDetailPromise = isAStock ? getStockDetail(symbol) : null;

    return (
        <div className="flex min-h-screen p-4 md:p-6 lg:p-8">
            <section className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
                {/* Left column */}
                <div className="flex flex-col gap-6">
                    {/* 股票详情头部 - A 股显示 */}
                    {isAStock && stockDetailPromise ? (
                        <Suspense fallback={<StockDetailHeaderSkeleton size="lg" showLimitPrice={true} />}>
                            <StockDetailHeaderWrapper detailPromise={stockDetailPromise} />
                        </Suspense>
                    ) : (
                        <TradingViewWidget
                            scriptUrl={`${scriptUrl}symbol-info.js`}
                            config={SYMBOL_INFO_WIDGET_CONFIG(tvSymbol)}
                            height={170}
                        />
                    )}

                    <TradingViewWidget
                        scriptUrl={`${scriptUrl}advanced-chart.js`}
                        config={CANDLE_CHART_WIDGET_CONFIG(tvSymbol)}
                        className="custom-chart"
                        height={600}
                        allowExpand={true}
                    />

                    <TradingViewWidget
                        scriptUrl={`${scriptUrl}advanced-chart.js`}
                        config={CANDLE_CHART_WIDGET_CONFIG(tvSymbol)}
                        className="custom-chart"
                        height={600}
                        allowExpand={true}
                    />

                    <TradingViewWidget
                        scriptUrl={`${scriptUrl}advanced-chart.js`}
                        config={BASELINE_WIDGET_CONFIG(tvSymbol)}
                        className="custom-chart"
                        height={600}
                        allowExpand={true}
                    />
                </div>

                {/* Right column */}
                <div className="flex flex-col gap-6">
                    <div className="flex items-center justify-between">
                        <WatchlistButton
                            symbol={symbol.toUpperCase()}
                            company={symbol.toUpperCase()}
                            isInWatchlist={isInWatchlist}
                            userId={userId}
                        />
                    </div>

                    <TradingViewWidget
                        scriptUrl={`${scriptUrl}technical-analysis.js`}
                        config={TECHNICAL_ANALYSIS_WIDGET_CONFIG(tvSymbol)}
                        height={400}
                    />

                    <TradingViewWidget
                        scriptUrl={`${scriptUrl}company-profile.js`}
                        config={COMPANY_PROFILE_WIDGET_CONFIG(tvSymbol)}
                        height={440}
                    />

                    <TradingViewWidget
                        scriptUrl={`${scriptUrl}financials.js`}
                        config={COMPANY_FINANCIALS_WIDGET_CONFIG(tvSymbol)}
                        height={800}
                    />

                    {/* 资金流向信息 - 仅 A 股显示 */}
                    {/* 资金流向数据展示主力资金、大单交易情况和5日趋势，帮助用户分析市场情绪 */}
                    {isAStock && (
                        <ErrorBoundary>
                            <Suspense fallback={<MoneyFlowCardSkeleton />}>
                                <MoneyFlowCard
                                    symbol={AStockCodeUtil.toTushareCode(symbol)}
                                    showTrend={true}
                                />
                            </Suspense>
                        </ErrorBoundary>
                    )}

                    {/* 融资融券信息 - 仅 A 股显示 */}
                    {/* 融资融券是 A 股市场特有的信用交易机制，展示融资余额、融券余额和多空情绪 */}
                    {isAStock && (
                        <ErrorBoundary>
                            <Suspense fallback={<MarginPanelSkeleton />}>
                                <MarginPanel
                                    symbol={AStockCodeUtil.toTushareCode(symbol)}
                                    showTrend={true}
                                />
                            </Suspense>
                        </ErrorBoundary>
                    )}

                    {/* 龙虎榜信息 - 仅 A 股显示 */}
                    {/* 龙虎榜是 A 股市场特有的交易信息公开机制，只有达到特定涨跌停或换手率等条件的股票才会上榜 */}
                    {isAStock && (
                        <Suspense fallback={<TopListPanelSkeleton />}>
                            <TopListPanel
                                symbol={AStockCodeUtil.toTushareCode(symbol)}
                                limit={10}
                                showReason={true}
                            />
                        </Suspense>
                    )}
                </div>
            </section>
        </div>
    );
}

/**
 * TopListPanel 加载骨架屏
 * 在龙虎榜数据加载时显示占位内容，提升用户体验
 */
function TopListPanelSkeleton() {
    return (
        <div className="bg-gray-900/30 rounded-lg border border-gray-800 p-4">
            <div className="flex items-center justify-between mb-4">
                <div className="h-6 w-40 bg-gray-800 rounded animate-pulse" />
                <div className="h-4 w-4 bg-gray-800 rounded animate-pulse" />
            </div>
            <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center justify-between py-2">
                        <div className="h-4 w-24 bg-gray-800 rounded animate-pulse" />
                        <div className="h-4 w-20 bg-gray-800 rounded animate-pulse" />
                        <div className="h-4 w-20 bg-gray-800 rounded animate-pulse" />
                    </div>
                ))}
            </div>
        </div>
    );
}

/**
 * MoneyFlowCard 加载骨架屏
 * 在资金流向数据加载时显示占位内容，提升用户体验
 */
function MoneyFlowCardSkeleton() {
    return (
        <div className="bg-gray-900/30 rounded-lg border border-gray-800 p-4">
            <div className="flex items-center justify-between mb-4">
                <div className="h-6 w-32 bg-gray-800 rounded animate-pulse" />
                <div className="h-4 w-4 bg-gray-800 rounded animate-pulse" />
            </div>
            <div className="space-y-4">
                {/* 主力净流入卡片骨架 */}
                <div className="bg-gray-800/40 rounded-lg p-4 border border-gray-700">
                    <div className="flex items-center justify-between mb-4">
                        <div className="space-y-2">
                            <div className="h-3 w-16 bg-gray-700 rounded animate-pulse" />
                            <div className="h-8 w-32 bg-gray-700 rounded animate-pulse" />
                            <div className="h-3 w-20 bg-gray-700 rounded animate-pulse" />
                        </div>
                        <div className="h-12 w-12 bg-gray-700 rounded-full animate-pulse" />
                    </div>
                    {/* 分项数据骨架 */}
                    <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-700">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="space-y-1">
                                <div className="h-2 w-12 bg-gray-700 rounded animate-pulse" />
                                <div className="h-4 w-20 bg-gray-700 rounded animate-pulse" />
                            </div>
                        ))}
                    </div>
                </div>
                {/* 趋势分析骨架 */}
                <div className="bg-gray-800/40 rounded-lg p-4 border border-gray-700">
                    <div className="flex items-center justify-between mb-3">
                        <div className="h-4 w-16 bg-gray-700 rounded animate-pulse" />
                        <div className="h-3 w-12 bg-gray-700 rounded animate-pulse" />
                    </div>
                    <div className="grid grid-cols-3 gap-2 mb-3 pb-3 border-b border-gray-700">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="text-center space-y-1">
                                <div className="h-2 w-12 mx-auto bg-gray-700 rounded animate-pulse" />
                                <div className="h-3 w-16 mx-auto bg-gray-700 rounded animate-pulse" />
                            </div>
                        ))}
                    </div>
                    {/* 趋势条形图骨架 */}
                    <div className="space-y-2">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="flex items-center space-x-2">
                                <div className="h-2 w-16 bg-gray-700 rounded animate-pulse" />
                                <div className="flex-1 h-3 bg-gray-700 rounded-full animate-pulse" />
                                <div className="h-2 w-16 bg-gray-700 rounded animate-pulse" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

/**
 * MarginPanel 加载骨架屏
 * 在融资融券数据加载时显示占位内容，提升用户体验
 */
function MarginPanelSkeleton() {
    return (
        <div className="bg-gray-900/30 rounded-lg border border-gray-800 p-4 animate-pulse">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="h-6 w-32 bg-gray-700 rounded"></div>
                <div className="h-6 w-6 bg-gray-700 rounded"></div>
            </div>

            {/* Balance cards */}
            <div className="grid grid-cols-2 gap-3 mb-4">
                {/* 融资余额卡片 */}
                <div className="bg-gray-800/40 rounded-lg p-4 border border-gray-700">
                    <div className="h-3 w-20 bg-gray-700 rounded mb-3"></div>
                    <div className="h-8 w-28 bg-gray-700 rounded mb-4"></div>
                    {/* 分项数据 */}
                    <div className="space-y-2 pt-3 border-t border-gray-700">
                        <div className="h-2 w-24 bg-gray-700 rounded"></div>
                        <div className="h-2 w-24 bg-gray-700 rounded"></div>
                    </div>
                </div>

                {/* 融券余额卡片 */}
                <div className="bg-gray-800/40 rounded-lg p-4 border border-gray-700">
                    <div className="h-3 w-20 bg-gray-700 rounded mb-3"></div>
                    <div className="h-8 w-28 bg-gray-700 rounded mb-4"></div>
                    {/* 分项数据 */}
                    <div className="space-y-2 pt-3 border-t border-gray-700">
                        <div className="h-2 w-24 bg-gray-700 rounded"></div>
                        <div className="h-2 w-24 bg-gray-700 rounded"></div>
                    </div>
                </div>
            </div>

            {/* 多空情绪指示器 */}
            <div className="bg-gray-800/40 rounded-lg p-4 border border-gray-700 mb-4">
                <div className="flex items-center space-x-3 mb-4">
                    <div className="h-10 w-10 bg-gray-700 rounded-full"></div>
                    <div className="space-y-2">
                        <div className="h-4 w-24 bg-gray-700 rounded"></div>
                        <div className="h-3 w-32 bg-gray-700 rounded"></div>
                    </div>
                </div>
                {/* 变化统计 */}
                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-700">
                    <div className="space-y-1">
                        <div className="h-2 w-20 bg-gray-700 rounded"></div>
                        <div className="h-4 w-24 bg-gray-700 rounded"></div>
                    </div>
                    <div className="space-y-1">
                        <div className="h-2 w-20 bg-gray-700 rounded"></div>
                        <div className="h-4 w-24 bg-gray-700 rounded"></div>
                    </div>
                </div>
            </div>

            {/* 趋势图 */}
            <div className="bg-gray-800/40 rounded-lg p-4 border border-gray-700">
                <div className="flex items-center justify-between mb-3">
                    <div className="h-4 w-24 bg-gray-700 rounded"></div>
                    <div className="h-3 w-16 bg-gray-700 rounded"></div>
                </div>
                {/* 趋势条形图骨架 */}
                <div className="space-y-2">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="flex items-center space-x-2">
                            <div className="h-2 w-16 bg-gray-700 rounded"></div>
                            <div className="flex-1 h-3 bg-gray-700 rounded-full"></div>
                            <div className="h-2 w-16 bg-gray-700 rounded"></div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Footer */}
            <div className="mt-4 pt-3 border-t border-gray-800">
                <div className="h-2 w-48 mx-auto bg-gray-700 rounded"></div>
            </div>
        </div>
    );
}

/**
 * 股票详情头部包装组件
 * 用于流式加载股票详情数据
 */
async function StockDetailHeaderWrapper({
    detailPromise,
}: {
    detailPromise: ReturnType<typeof getStockDetail>;
}) {
    const detail = await detailPromise;

    if (!detail.success || !detail.basic) {
        return null;
    }

    return (
        <StockDetailHeader
            symbol={detail.basic.symbol}
            name={detail.basic.name}
            price={detail.quote?.price}
            prevClose={detail.quote?.prevClose}
            change={detail.quote?.change}
            changePercent={detail.quote?.changePercent}
            industry={detail.basic.industry}
            industrySecond={detail.basic.industrySecond}
            industryThird={detail.basic.industryThird}
            size="lg"
            showLimitPrice={true}
        />
    );
}