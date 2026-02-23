import React from 'react';
import type { Metadata } from 'next';
import SectorHeatmap from '@/components/watchlist/SectorHeatmap';
import SectorRankTable from '@/components/watchlist/SectorRankTable';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Layers, TrendingUp } from 'lucide-react';

/**
 * 板块资金流向页面元数据
 */
export const metadata: Metadata = {
  title: '板块资金流向 - A股行业和概念板块排行',
  description: '实时追踪A股行业板块和概念板块的资金流向、涨跌幅排行、成交额等数据',
  keywords: '板块,行业板块,概念板块,资金流向,A股',
  openGraph: {
    title: '板块资金流向 - OpenStock',
    description: '实时追踪A股行业板块和概念板块的资金流向、涨跌幅排行、成交额等数据',
    type: 'website',
  },
};

/**
 * 板块资金流向页面
 *
 * 展示 A 股行业板块和概念板块的资金流向情况
 * - 热力图可视化
 * - 详细排名表格
 * - 支持行业/概念切换
 * - 可排序、可筛选
 *
 * 路由: /sectors
 */
export default function SectorsPage() {
  return (
    <div className="min-h-screen bg-black text-gray-100 p-6 md:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-500">
            板块资金流向
          </h1>
          <p className="text-gray-500 mt-1">
            实时追踪 A 股行业板块和概念板块的资金流向、涨跌幅排行、成交额等数据
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="space-y-8">
        {/* Tab 切换：行业 / 概念 */}
        <Tabs defaultValue="industry" className="w-full">
          <TabsList className="w-full md:w-auto mb-6">
            <TabsTrigger value="industry" className="flex items-center space-x-2">
              <Layers className="w-4 h-4" />
              <span>行业板块</span>
            </TabsTrigger>
            <TabsTrigger value="concept" className="flex items-center space-x-2">
              <TrendingUp className="w-4 h-4" />
              <span>概念板块</span>
            </TabsTrigger>
          </TabsList>

          {/* 行业板块 */}
          <TabsContent value="industry" className="space-y-8">
            {/* 热力图 */}
            <section>
              <SectorHeatmap type="industry" limit={50} />
            </section>

            {/* 排名表格 */}
            <section>
              <SectorRankTable type="industry" />
            </section>
          </TabsContent>

          {/* 概念板块 */}
          <TabsContent value="concept" className="space-y-8">
            {/* 热力图 */}
            <section>
              <SectorHeatmap type="concept" limit={50} />
            </section>

            {/* 排名表格 */}
            <section>
              <SectorRankTable type="concept" />
            </section>
          </TabsContent>
        </Tabs>
      </div>

      {/* 页面说明 */}
      <div className="mt-12 p-6 bg-gray-900/30 rounded-lg border border-gray-800">
        <h2 className="text-lg font-semibold text-white mb-4">数据说明</h2>
        <div className="space-y-3 text-sm text-gray-400">
          <div className="flex items-start space-x-2">
            <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 mt-1.5" />
            <p>
              <strong className="text-gray-300">数据来源：</strong>
              本页面数据来源于 Tushare 数据接口，包括板块价格、涨跌幅、成交额和资金流向等数据。
            </p>
          </div>
          <div className="flex items-start space-x-2">
            <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 mt-1.5" />
            <p>
              <strong className="text-gray-300">板块类型：</strong>
              行业板块采用申万一级行业分类，概念板块采用市场主流概念板块分类。
            </p>
          </div>
          <div className="flex items-start space-x-2">
            <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 mt-1.5" />
            <p>
              <strong className="text-gray-300">颜色含义：</strong>
              红色表示上涨/资金流入，绿色表示下跌/资金流出（符合 A 股习惯）。
            </p>
          </div>
          <div className="flex items-start space-x-2">
            <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 mt-1.5" />
            <p>
              <strong className="text-gray-300">更新频率：</strong>
              数据在交易时段实时更新，非交易时段显示最近一个交易日的数据。
            </p>
          </div>
          <div className="flex items-start space-x-2">
            <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 mt-1.5" />
            <p>
              <strong className="text-gray-300">成分股查询：</strong>
              点击板块名称或"成分股"链接可查看该板块的成分股列表。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
