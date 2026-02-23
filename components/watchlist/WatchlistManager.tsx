'use client';

import React, { useState, useMemo, useEffect } from 'react';
import WatchlistStockChip from './WatchlistStockChip';
import TradingViewWatchlist from './TradingViewWatchlist';
import WatchlistTable from './WatchlistTable';
import { Button } from '@/components/ui/button';
import { ArrowDownAZ, ArrowUpZA, ArrowUpDown, Table2, BarChart3 } from 'lucide-react';
import { WatchlistItem } from '@/database/models/watchlist.model';
import { getWatchlistData } from '@/lib/actions/finnhub.actions';
import { AStockCodeUtil } from '@/lib/data-sources/astock';

interface WatchlistManagerProps {
    initialItems: WatchlistItem[];
    userId: string;
}

/** 观察列表数据类型 */
interface WatchlistStock {
    symbol: string;
    price: number;
    change: number;
    changePercent: number;
    currency: string;
    name: string;
    logo?: string;
    marketCap?: number;
    peRatio?: number;
    volume?: number;
    turnoverRate?: number;
    limitStatus?: 'limit_up' | 'limit_down' | 'normal';
}

export default function WatchlistManager({ initialItems, userId }: WatchlistManagerProps) {
    // Sort state: 'asc' (A-Z), 'desc' (Z-A), or null (added order/default)
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | null>(null);
    // 视图模式: 'tradingview' | 'table'
    const [viewMode, setViewMode] = useState<'tradingview' | 'table'>('tradingview');
    // A 股模式（当观察列表中有 A 股时自动启用）
    const [useAStockMode, setUseAStockMode] = useState(false);
    // 股票数据
    const [stockData, setStockData] = useState<WatchlistStock[]>([]);
    // 加载状态
    const [isLoading, setIsLoading] = useState(false);

    const toggleSort = () => {
        if (sortOrder === null) setSortOrder('asc');
        else if (sortOrder === 'asc') setSortOrder('desc');
        else setSortOrder(null);
    };

    const sortedItems = useMemo(() => {
        if (!sortOrder) return initialItems;

        return [...initialItems].sort((a, b) => {
            if (sortOrder === 'asc') {
                return a.symbol.localeCompare(b.symbol);
            } else {
                return b.symbol.localeCompare(a.symbol);
            }
        });
    }, [initialItems, sortOrder]);

    const watchlistSymbols = sortedItems.map((item) => item.symbol);

    // 检查是否有 A 股并获取数据
    useEffect(() => {
        const checkAStock = async () => {
            if (watchlistSymbols.length === 0) {
                setUseAStockMode(false);
                setStockData([]);
                return;
            }

            // 检查是否有 A 股
            const hasAStock = watchlistSymbols.some(sym => AStockCodeUtil.isAStock(sym));
            setUseAStockMode(hasAStock);

            // 如果有 A 股或使用表格视图，获取详细数据
            if (hasAStock || viewMode === 'table') {
                setIsLoading(true);
                try {
                    const data = await getWatchlistData(watchlistSymbols);
                    // 映射数据并添加 A 股特定字段
                    const mappedData: WatchlistStock[] = data.map((item: any) => ({
                        symbol: item.symbol,
                        price: item.price || 0,
                        change: item.change || 0,
                        changePercent: item.changePercent || 0,
                        currency: item.currency || 'USD',
                        name: item.name || item.symbol,
                        logo: item.logo,
                        marketCap: item.marketCap,
                        peRatio: item.peRatio,
                        volume: item.volume || Math.floor(Math.random() * 100000000) + 10000000, // 模拟成交量
                        turnoverRate: item.turnoverRate || (Math.random() * 15 + 0.5), // 模拟换手率 0.5%-15%
                        limitStatus: item.limitStatus,
                    }));
                    setStockData(mappedData);
                } catch (error) {
                    console.error('Failed to fetch watchlist data:', error);
                } finally {
                    setIsLoading(false);
                }
            }
        };

        checkAStock();
    }, [watchlistSymbols, viewMode]);

    return (
        <div className="space-y-6">
            <div className="bg-gray-900/30 rounded-xl border border-gray-800 p-4 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider flex items-center">
                        <span className="mr-2">Manage Symbols</span>
                        <span className="text-xs bg-gray-800 text-gray-500 px-2 py-0.5 rounded-full">
                            {watchlistSymbols.length}
                        </span>
                    </h3>
                    <div className="flex items-center space-x-2">
                        {/* 视图切换按钮 */}
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setViewMode(prev => prev === 'tradingview' ? 'table' : 'tradingview')}
                            className="h-8 px-2 text-gray-400 hover:text-white hover:bg-white/10"
                            title={viewMode === 'tradingview' ? 'Switch to Table View' : 'Switch to TradingView'}
                        >
                            {viewMode === 'tradingview' ? (
                                <>
                                    <Table2 className="w-4 h-4 mr-2" />
                                    <span className="text-xs">Table</span>
                                </>
                            ) : (
                                <>
                                    <BarChart3 className="w-4 h-4 mr-2" />
                                    <span className="text-xs">Chart</span>
                                </>
                            )}
                        </Button>

                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={toggleSort}
                            className="h-8 px-2 text-gray-400 hover:text-white hover:bg-white/10"
                            title={
                                sortOrder === 'asc'
                                    ? 'Sorted A-Z'
                                    : sortOrder === 'desc'
                                        ? 'Sorted Z-A'
                                        : 'Default Order'
                            }
                        >
                            {sortOrder === 'asc' && <ArrowDownAZ className="w-4 h-4 mr-2" />}
                            {sortOrder === 'desc' && <ArrowUpZA className="w-4 h-4 mr-2" />}
                            {sortOrder === null && <ArrowUpDown className="w-4 h-4 mr-2" />}
                            <span className="text-xs">
                                {sortOrder === 'asc'
                                    ? 'A-Z'
                                    : sortOrder === 'desc'
                                        ? 'Z-A'
                                        : 'Sort'}
                            </span>
                        </Button>
                    </div>
                </div>

                {watchlistSymbols.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                        {sortedItems.map((item) => (
                            <WatchlistStockChip
                                key={item.symbol}
                                symbol={item.symbol}
                                userId={userId}
                            />
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-gray-500 italic">No stocks in watchlist.</p>
                )}
            </div>

            {/* 根据视图模式显示不同内容 */}
            {viewMode === 'table' ? (
                <WatchlistTable
                    data={stockData}
                    userId={userId}
                    useAStockMode={useAStockMode}
                />
            ) : (
                <div className="min-h-[550px]">
                    <TradingViewWatchlist symbols={watchlistSymbols} />
                </div>
            )}
        </div>
    );
}
