# MarginPanel 使用示例

## 基本用法

```tsx
import MarginPanel from '@/components/watchlist/MarginPanel';

function StockDetailPage({ symbol }: { symbol: string }) {
  return (
    <div>
      <MarginPanel symbol={symbol} />
    </div>
  );
}
```

## 不显示趋势图

```tsx
<MarginPanel
  symbol="600519.SH"
  showTrend={false}
/>
```

## 自定义样式

```tsx
<MarginPanel
  symbol="600519.SH"
  className="my-custom-class"
  showTrend={true}
/>
```

## Server Actions

### 获取融资融券数据

```ts
import { getMarginData } from '@/lib/actions/margin.actions';

const result = await getMarginData('600519.SH');
if (result.success && result.data) {
  console.log('融资余额:', result.data.marginBalance);
  console.log('融券余额:', result.data.shortBalance);
}
```

### 获取融资融券趋势

```ts
import { getMarginTrend } from '@/lib/actions/margin.actions';

const result = await getMarginTrend('600519.SH', 5);
if (result.success && result.trend) {
  console.log('情绪:', result.trend.sentiment);
  console.log('融资余额变化:', result.trend.marginBalanceChange);
}
```

### 分析多空情绪

```ts
import { analyzeSentiment } from '@/lib/actions/margin.actions';

const result = await analyzeSentiment('600519.SH', 5);
if (result.success && result.data) {
  console.log('情绪:', result.data.sentiment);
  console.log('信心度:', result.data.confidence);
  console.log('原因:', result.data.reasons);
}
```

## 数据结构

### MarginData

```ts
interface MarginData {
  tsCode: string;           // 股票代码
  tradeDate: string;        // 交易日期 YYYY-MM-DD
  marginBalance: number;    // 融资余额(万元)
  marginBuy: number;        // 融资买入额(万元)
  marginRepay: number;      // 融资偿还额(万元)
  shortBalance: number;     // 融券余额(万元)
  shortSell: number;        // 融券卖出量(手)
  shortCover: number;       // 融券偿还量(手)
  marginRatio: number;      // 融资融券余额比
}
```

### TrendAnalysis

```ts
interface TrendAnalysis {
  marginBalanceChange: number;      // 融资余额变化(万元)
  marginBalanceChangeRate: number;  // 融资余额变化率(%)
  shortBalanceChange: number;       // 融券余额变化(万元)
  shortBalanceChangeRate: number;   // 融券余额变化率(%)
  marginRatioChange: number;        // 融资融券比变化
  sentiment: 'bullish' | 'bearish' | 'neutral';
}
```

## 颜色约定

组件遵循 A 股市场的颜色约定：

- **融资余额增加**: 红色（看涨信号）
- **融资余额减少**: 绿色
- **融券余额增加**: 绿色（看空信号）
- **融券余额减少**: 红色
- **中性情绪**: 灰色
