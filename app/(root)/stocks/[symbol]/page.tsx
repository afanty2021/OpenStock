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
import { TopListPanelSkeleton, MoneyFlowCardSkeleton, MarginPanelSkeleton } from '@/components/skeletons/AStockDetailSkeleton';

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