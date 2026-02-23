"use client";

import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUp, ArrowDown, Bell, ArrowUpDown, ArrowUpIcon, ArrowDownIcon } from "lucide-react";
import CreateAlertModal from "./CreateAlertModal";
import WatchlistButton from "@/components/WatchlistButton";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { removeFromWatchlist } from "@/lib/actions/watchlist.actions";
import { AStockCell, AStockPrice, AStockTag, CompactLimitPriceDisplay } from "@/components/astock";
import { AStockCodeUtil } from "@/lib/data-sources/astock";
import { cn } from "@/lib/utils";

/** 轮询间隔（毫秒） */
const PRICE_POLLING_INTERVAL = 5000;

/** A股换手率阈值 - 高 */
const TURNOVER_RATE_HIGH_THRESHOLD = 10;

/** A股换手率阈值 - 中 */
const TURNOVER_RATE_MEDIUM_THRESHOLD = 5;

/** A股成交量单位 - 万 */
const VOLUME_UNIT_WAN = 10000;

/** A股成交量单位 - 亿 */
const VOLUME_UNIT_YI = 100000000;

/** 排序字段类型 */
type SortField = 'changePercent' | 'turnoverRate' | 'volume' | 'price' | 'name';

/** 排序方向类型 */
type SortDirection = 'asc' | 'desc';

/** 观察列表数据类型 */
export interface WatchlistStock {
    symbol: string;
    price: number;
    change: number;
    changePercent: number;
    currency: string;
    name: string;
    logo?: string;
    marketCap?: number;
    peRatio?: number;
    /** A 股额外字段 */
    volume?: number;
    turnoverRate?: number;
    limitStatus?: 'limit_up' | 'limit_down' | 'normal';
}

/** 输入数据类型 */
export type WatchlistStockInput = Partial<WatchlistStock> & {
    symbol: string;
    price?: number;
    change?: number;
    changePercent?: number;
    currency?: string;
    name?: string;
};

interface WatchlistTableProps {
    data: WatchlistStockInput[];
    userId: string;
    onRefresh?: () => void;
    /** 是否使用 A 股模式（默认 false） */
    useAStockMode?: boolean;
}

export default function WatchlistTable({ data, userId, onRefresh, useAStockMode = false }: WatchlistTableProps) {
    const [stocks, setStocks] = useState<WatchlistStock[]>([]);
    const [sortField, setSortField] = useState<SortField>('changePercent');
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
    const stocksRef = useRef<WatchlistStock[]>(stocks);

    // 更新 ref
    useEffect(() => {
        stocksRef.current = stocks;
    }, [stocks]);

    // 初始化数据
    useEffect(() => {
        const mappedData: WatchlistStock[] = data.map((item: WatchlistStockInput) => ({
            symbol: item.symbol,
            price: item.price ?? 0,
            change: item.change ?? 0,
            changePercent: item.changePercent ?? 0,
            currency: item.currency ?? 'USD',
            name: item.name ?? item.symbol,
            logo: item.logo,
            marketCap: item.marketCap,
            peRatio: item.peRatio,
            volume: item.volume,
            turnoverRate: item.turnoverRate,
            limitStatus: item.limitStatus,
        }));
        setStocks(mappedData);
    }, [data]);

    // 价格轮询
    useEffect(() => {
        if (stocks.length === 0) return;

        // 使用 ref 存储 stocks 引用，避免依赖项变化导致 interval 重新创建
        const pollPrices = async () => {
            try {
                const symbols = stocksRef.current.map(s => s.symbol);
                if (symbols.length === 0) return;

                const { getWatchlistData } = await import('@/lib/actions/finnhub.actions');
                const updatedData = await getWatchlistData(symbols);

                if (updatedData && updatedData.length > 0) {
                    setStocks(current => {
                        const map = new Map(updatedData.map((item: WatchlistStockInput) => [item.symbol, item]));
                        return current.map(existing => {
                            const fresh = map.get(existing.symbol);
                            if (fresh) {
                                return {
                                    ...existing,
                                    price: fresh.price ?? existing.price,
                                    change: fresh.change ?? existing.change,
                                    changePercent: fresh.changePercent ?? existing.changePercent,
                                };
                            }
                            return existing;
                        });
                    });
                }
            } catch (err) {
                console.error("Failed to poll watchlist prices", err);
            }
        };

        const interval = setInterval(pollPrices, PRICE_POLLING_INTERVAL);
        return () => clearInterval(interval);
    }, [stocks.length]); // 仅依赖数组长度，避免每次价格更新都重新创建 interval

    // 排序后的数据
    const sortedStocks = useMemo(() => {
        return [...stocks].sort((a, b) => {
            let aVal: number | string = 0;
            let bVal: number | string = 0;

            switch (sortField) {
                case 'changePercent':
                    aVal = a.changePercent;
                    bVal = b.changePercent;
                    break;
                case 'turnoverRate':
                    aVal = a.turnoverRate || 0;
                    bVal = b.turnoverRate || 0;
                    break;
                case 'volume':
                    aVal = a.volume || 0;
                    bVal = b.volume || 0;
                    break;
                case 'price':
                    aVal = a.price;
                    bVal = b.price;
                    break;
                case 'name':
                    aVal = a.name;
                    bVal = b.name;
                    break;
            }

            if (typeof aVal === 'string' && typeof bVal === 'string') {
                return sortDirection === 'asc'
                    ? aVal.localeCompare(bVal)
                    : bVal.localeCompare(aVal);
            }

            return sortDirection === 'asc'
                ? (aVal as number) - (bVal as number)
                : (bVal as number) - (aVal as number);
        });
    }, [stocks, sortField, sortDirection]);

    // 处理排序点击
    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('desc');
        }
    };

    // 排序按钮组件
    const SortButton = ({ field, label }: { field: SortField; label: string }) => (
        <button
            onClick={() => handleSort(field)}
            className={cn(
                "flex items-center gap-1 px-2 py-1 rounded transition-colors",
                "hover:bg-white/10 text-gray-400 hover:text-white",
                sortField === field && "text-[#0FEDBE]"
            )}
            title={`点击排序: ${label}`}
        >
            {label}
            {sortField === field ? (
                sortDirection === 'asc' ? (
                    <ArrowUpIcon className="w-3 h-3" />
                ) : (
                    <ArrowDownIcon className="w-3 h-3" />
                )
            ) : (
                <ArrowUpDown className="w-3 h-3 opacity-50" />
            )}
        </button>
    );

    // 格式化成交量（A股常用手/万手）
    const formatVolume = useCallback((volume?: number): string => {
        if (!volume || volume === 0) return '--';
        if (volume >= VOLUME_UNIT_YI) {
            return (volume / VOLUME_UNIT_YI).toFixed(2) + '亿';
        }
        if (volume >= VOLUME_UNIT_WAN) {
            return (volume / VOLUME_UNIT_WAN).toFixed(2) + '万';
        }
        return volume.toString();
    }, []);

    // 格式化换手率
    const formatTurnoverRate = useCallback((rate?: number): string => {
        if (rate === undefined || rate === null || rate === 0) return '--';
        return rate.toFixed(2) + '%';
    }, []);

    // 判断是否为 A 股
    const isAStock = useCallback((symbol: string): boolean => {
        return AStockCodeUtil.isAStock(symbol);
    }, []);

    // 获取交易所代码
    const getExchange = useCallback((symbol: string): 'SH' | 'SZ' | 'BJ' => {
        return AStockCodeUtil.getExchange(symbol) as 'SH' | 'SZ' | 'BJ' || 'SH';
    }, []);

    // 判断涨跌停状态（使用正确的涨跌停阈值）
    const getLimitStatus = useCallback((stock: WatchlistStock): 'limit_up' | 'limit_down' | 'normal' => {
        if (stock.limitStatus) return stock.limitStatus;

        // 获取该股票的涨跌停限制比例
        const limitPct = AStockCodeUtil.getLimitPct(stock.symbol, stock.name);
        if (limitPct === 0) return 'normal'; // 非 A 股或无限制

        const changePct = stock.changePercent;
        // 使用 0.5% 容差判断涨跌停（与 LimitDetector 一致）
        const tolerance = limitPct * 0.005;

        if (changePct >= limitPct - tolerance) return 'limit_up';
        if (changePct <= -limitPct + tolerance) return 'limit_down';
        return 'normal';
    }, []);

    if (!sortedStocks || sortedStocks.length === 0) {
        return (
            <div className="text-center py-12 bg-gray-900/50 rounded-lg border border-gray-800">
                <h3 className="text-xl font-medium text-gray-300 mb-2">Your watchlist is empty</h3>
                <p className="text-gray-500 mb-6">Add stocks to track their performance and set alerts.</p>
            </div>
        );
    }

    // A 股模式渲染
    if (useAStockMode) {
        return (
            <div className="overflow-hidden rounded-xl border border-white/10 bg-black/40 backdrop-blur-md shadow-xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm border-collapse">
                        <thead className="bg-white/5 text-gray-400 font-medium border-b border-white/10">
                            <tr>
                                <th className="px-4 py-3 font-semibold tracking-wide w-[120px]">代码</th>
                                <th className="px-4 py-3 font-semibold tracking-wide w-[150px]">名称</th>
                                <th className="px-4 py-3 font-semibold tracking-wide w-[100px]">现价</th>
                                <th className="px-4 py-3 font-semibold tracking-wide w-[90px]">
                                    <SortButton field="changePercent" label="涨跌" />
                                </th>
                                <th className="px-4 py-3 font-semibold tracking-wide w-[100px]">涨停价</th>
                                <th className="px-4 py-3 font-semibold tracking-wide w-[100px]">跌停价</th>
                                <th className="px-4 py-3 font-semibold tracking-wide w-[90px]">
                                    <SortButton field="turnoverRate" label="换手率" />
                                </th>
                                <th className="px-4 py-3 font-semibold tracking-wide w-[100px]">
                                    <SortButton field="volume" label="成交量" />
                                </th>
                                <th className="px-4 py-3 font-semibold tracking-wide w-[70px]">涨跌停</th>
                                <th className="px-4 py-3 text-right font-semibold tracking-wide w-[100px]">操作</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/10">
                            {sortedStocks.map((stock) => {
                                const isAStockSymbol = isAStock(stock.symbol);
                                const exchange = getExchange(stock.symbol);
                                const limitStatus = getLimitStatus(stock);
                                const isPositive = stock.change >= 0;

                                return (
                                    <tr key={stock.symbol} className="hover:bg-white/5 transition-colors group">
                                        {/* 代码 */}
                                        <td className="px-4 py-3">
                                            <AStockCell
                                                tsCode={stock.symbol}
                                                companyName={stock.name}
                                                size="sm"
                                                showExchange={true}
                                            />
                                        </td>

                                        {/* 名称 */}
                                        <td className="px-4 py-3">
                                            <Link
                                                href={`/stocks/${stock.symbol}`}
                                                className="font-medium text-white hover:text-[#0FEDBE] transition-colors"
                                            >
                                                {stock.name}
                                            </Link>
                                        </td>

                                        {/* 现价 */}
                                        <td className="px-4 py-3">
                                            <AStockPrice
                                                price={stock.price}
                                                change={stock.change}
                                                changePercent={stock.changePercent}
                                                size="sm"
                                                showYuan={isAStockSymbol}
                                            />
                                        </td>

                                        {/* 涨跌 */}
                                        <td className="px-4 py-3">
                                            <div className={cn(
                                                "flex items-center w-fit px-2 py-1 rounded-md text-xs font-medium",
                                                isPositive ? "bg-red-500/10 text-red-400" : "bg-green-500/10 text-green-400"
                                            )}>
                                                {isPositive ? <ArrowUp className="w-3 h-3 mr-1" /> : <ArrowDown className="w-3 h-3 mr-1" />}
                                                {Math.abs(stock.changePercent).toFixed(2)}%
                                            </div>
                                        </td>

                                        {/* 涨停价 */}
                                        <td className="px-4 py-3">
                                            {stock.price > 0 && (
                                                <CompactLimitPriceDisplay
                                                    currentPrice={stock.price}
                                                    symbol={stock.symbol}
                                                    stockName={stock.name}
                                                    count={1}
                                                    size="sm"
                                                    className="text-red-400"
                                                />
                                            )}
                                        </td>

                                        {/* 跌停价 */}
                                        <td className="px-4 py-3">
                                            {stock.price > 0 && (() => {
                                                // 计算跌停价（使用 getLimitPct 获取正确的涨跌停比例）
                                                const limitPct = AStockCodeUtil.getLimitPct(stock.symbol, stock.name);
                                                const limitDownPrice = stock.price * (1 - limitPct / 100);
                                                return (
                                                    <span className="text-green-400 text-sm font-mono">
                                                        ¥{limitDownPrice.toFixed(2)}
                                                    </span>
                                                );
                                            })()}
                                        </td>

                                        {/* 换手率 */}
                                        <td className="px-4 py-3">
                                            <span className={cn(
                                                "text-sm",
                                                (stock.turnoverRate || 0) > TURNOVER_RATE_HIGH_THRESHOLD ? "text-orange-400" :
                                                (stock.turnoverRate || 0) > TURNOVER_RATE_MEDIUM_THRESHOLD ? "text-yellow-400" :
                                                "text-gray-400"
                                            )}>
                                                {formatTurnoverRate(stock.turnoverRate)}
                                            </span>
                                        </td>

                                        {/* 成交量 */}
                                        <td className="px-4 py-3">
                                            <span className="text-gray-400 text-sm">
                                                {formatVolume(stock.volume)}
                                            </span>
                                        </td>

                                        {/* 涨跌停状态 */}
                                        <td className="px-4 py-3">
                                            {limitStatus !== 'normal' && (
                                                <AStockTag
                                                    exchange={exchange}
                                                    status={limitStatus}
                                                    size="sm"
                                                />
                                            )}
                                        </td>

                                        {/* 操作 */}
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end space-x-2 opacity-80 group-hover:opacity-100 transition-opacity">
                                                <CreateAlertModal
                                                    userId={userId}
                                                    symbol={stock.symbol}
                                                    currentPrice={stock.price}
                                                    onAlertCreated={onRefresh}
                                                >
                                                    <button className="p-2 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-all" title="添加提醒">
                                                        <Bell className="w-4 h-4" />
                                                    </button>
                                                </CreateAlertModal>

                                                <div className="transform scale-95 hover:scale-100 transition-transform">
                                                    <WatchlistButton
                                                        symbol={stock.symbol}
                                                        company={stock.name}
                                                        isInWatchlist={true}
                                                        type="icon"
                                                        showTrashIcon={false}
                                                        onWatchlistChange={async (sym, added) => {
                                                            if (!added) {
                                                                await removeFromWatchlist(userId, sym);
                                                                setStocks((curr) => curr.filter((s) => s.symbol !== sym));
                                                                if (onRefresh) onRefresh();
                                                            }
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    }

    // 美股/默认模式渲染（保持原有功能）
    return (
        <div className="overflow-hidden rounded-xl border border-white/10 bg-black/40 backdrop-blur-md shadow-xl">
            <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-white/5 text-gray-400 font-medium border-b border-white/10">
                    <tr>
                        <th className="px-6 py-4 font-semibold tracking-wide">Company</th>
                        <th className="px-6 py-4 font-semibold tracking-wide">Symbol</th>
                        <th className="px-6 py-4 font-semibold tracking-wide">Price</th>
                        <th className="px-6 py-4 font-semibold tracking-wide">
                            <SortButton field="changePercent" label="Change" />
                        </th>
                        <th className="px-6 py-4 font-semibold tracking-wide">Market Cap</th>
                        <th className="px-6 py-4 text-right font-semibold tracking-wide">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                    {sortedStocks.map((stock) => {
                        const isPositive = stock.change >= 0;
                        return (
                            <tr key={stock.symbol} className="hover:bg-white/5 transition-colors group">
                                <td className="px-6 py-4">
                                    <div className="flex items-center space-x-4">
                                        {stock.logo ? (
                                            <div className="w-10 h-10 relative rounded-full overflow-hidden bg-white/10 shadow-sm border border-white/5">
                                                <Image
                                                    src={stock.logo}
                                                    alt={stock.symbol}
                                                    fill
                                                    className="object-contain p-1.5"
                                                />
                                            </div>
                                        ) : (
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center text-xs font-bold text-white shadow-sm border border-white/5">
                                                {stock.symbol[0]}
                                            </div>
                                        )}
                                        <div className="flex flex-col">
                                            <span className="font-semibold text-white text-base">{stock.name}</span>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 font-medium text-gray-300">
                                    <span className="bg-white/5 px-2.5 py-1 rounded-md text-xs font-mono border border-white/10">
                                        {stock.symbol}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-white font-medium text-base tracking-tight">
                                    {formatCurrency(stock.price)}
                                </td>
                                <td className={`px-6 py-4 font-medium`}>
                                    <div className={`flex items-center w-fit px-2 py-1 rounded-md ${isPositive ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
                                        {isPositive ? <ArrowUp className="w-3.5 h-3.5 mr-1.5" /> : <ArrowDown className="w-3.5 h-3.5 mr-1.5" />}
                                        {Math.abs(stock.changePercent).toFixed(2)}%
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-gray-400 font-medium">
                                    {stock.marketCap ? formatNumber(stock.marketCap) : '--'}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end space-x-3 opacity-80 group-hover:opacity-100 transition-opacity">
                                        <CreateAlertModal
                                            userId={userId}
                                            symbol={stock.symbol}
                                            currentPrice={stock.price}
                                            onAlertCreated={onRefresh}
                                        >
                                            <button className="p-2.5 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-all border border-transparent hover:border-white/10" title="Add Alert">
                                                <Bell className="w-4.5 h-4.5" />
                                            </button>
                                        </CreateAlertModal>

                                        <div className="transform scale-95 hover:scale-100 transition-transform">
                                            <WatchlistButton
                                                symbol={stock.symbol}
                                                company={stock.name}
                                                isInWatchlist={true}
                                                type="icon"
                                                showTrashIcon={false}
                                                onWatchlistChange={async (sym, added) => {
                                                    if (!added) {
                                                        await removeFromWatchlist(userId, sym);
                                                        setStocks((curr) => curr.filter((s) => s.symbol !== sym));
                                                        if (onRefresh) onRefresh();
                                                    }
                                                }}
                                            />
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
