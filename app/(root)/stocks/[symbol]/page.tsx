import TradingViewWidget from "@/components/TradingViewWidget";
import WatchlistButton from "@/components/WatchlistButton";
import TopListPanel from "@/components/watchlist/TopListPanel";
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
import { formatSymbolForTradingView } from '@/lib/utils';
import { AStockCodeUtil } from '@/lib/data-sources/astock';
import { Suspense } from 'react';

export default async function StockDetails({ params }: StockDetailsPageProps) {
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

    return (
        <div className="flex min-h-screen p-4 md:p-6 lg:p-8">
            <section className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
                {/* Left column */}
                <div className="flex flex-col gap-6">
                    <TradingViewWidget
                        scriptUrl={`${scriptUrl}symbol-info.js`}
                        config={SYMBOL_INFO_WIDGET_CONFIG(tvSymbol)}
                        height={170}
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