# A 股功能扩展 - 第四阶段设计文档

**项目**: OpenStock
**日期**: 2026-02-23
**版本**: 1.0
**状态**: 规划中

---

## 概述

### 背景

前三阶段已完成：
- **Phase 1**: A 股核心基础设施（代码标准化、涨跌停检测、交易日历）
- **Phase 2**: A 股特色数据展示（龙虎榜、资金流向、板块指数、融资融券）
- **Phase 3**: 智能分析（AI 新闻分析、财报解读、选股筛选、回测框架）

### 第四阶段目标

完善用户体验，实现 A 股专属 UI 和性能优化：

1. **A 股专属 UI** - 符合国内投资者习惯的界面展示
2. **性能优化** - 加载速度和运行时性能提升

### 设计原则

- **渐进式适配** - 在现有组件基础上扩展，而非完全重写
- **保持一致性** - 与现有美股/港股风格统一
- **A 股特色** - 保留国内投资者熟悉的展示方式
- **YAGNI** - 仅实现当前明确所需的功能

---

## UI 设计规范

### 股票展示规范

| 元素 | A 股展示方式 | 美股/港股展示方式 |
|------|-------------|------------------|
| 股票名称 | `600519 茅台 (SH)` | `AAPL Apple Inc.` |
| 涨跌颜色 | 🔴 红涨 🟢 绿跌 | 🟢 红涨 🔴 绿跌 |
| 价格单位 | ¥ 人民币 | $ 美元 / $ 港币 |
| 交易所 | SH（上交所）/ SZ（深交所） | NASDAQ / NYSE / HKEX |
| 股票代码 | 6位数字 + .SH/.SZ | 字母代码 |

### 颜色系统

```typescript
// A 股特色：红涨绿跌
const ASTOCK_COLORS = {
  up: '#FF4444',      // 上涨红色
  down: '#00CC66',    // 下跌绿色
  neutral: '#888888', // 持平灰色
  limitUp: '#FF0000', // 涨停红色
  limitDown: '#00FF00', // 跌停绿色
};

// 国际惯例：绿涨红跌（用于美股/港股）
const US_STOCK_COLORS = {
  up: '#00CC66',
  down: '#FF4444',
  neutral: '#888888',
};
```

### 字体与间距

- **中文**: 使用系统默认中文（PingFang SC / Microsoft YaHei）
- **数字/代码**: 使用等宽字体（Geist Mono / JetBrains Mono）
- **间距**: 基于 4px 网格系统

---

## 组件设计

### 1. AStockCell - A 股股票代码单元格

**功能**: 以符合国内习惯的格式展示股票代码

**接口设计**:

```typescript
interface AStockCellProps {
  tsCode: string;           // 600519.SH
  showExchange?: boolean;   // 是否显示交易所，默认 true
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;    // 点击事件
}

// 展示格式
// - 600519 茅台 (SH)
// - 000001 平安银行 (SZ)
```

**实现要点**:
- 使用 `AStockCodeUtil` 解析代码和交易所
- 悬停显示完整公司名称（tooltip）
- 点击可复制股票代码

### 2. AStockPrice - A 股价格显示

**功能**: 展示价格和涨跌，红色上涨/绿色下跌

**接口设计**:

```typescript
interface AStockPriceProps {
  price: number;           // 当前价格
  change: number;         // 涨跌额
  changePercent: number;  // 涨跌幅 %
  size?: 'sm' | 'md' | 'lg';
  showYuan?: boolean;    // 是否显示 ¥ 符号，默认 true
}

// 展示格式
// ¥152.50  ▲2.30 (+1.53%)
```

**实现要点**:
- 颜色编码：上涨红色 #FF4444，下跌绿色 #00CC66
- 涨跌幅箭头指示 ▲/▼

### 3. AStockTag - 状态标签组件

**功能**: 展示交易所、涨跌停状态

**接口设计**:

```typescript
type Exchange = 'SH' | 'SZ';
type StockStatus = 'normal' | 'limit_up' | 'limit_down' | 'suspended' | 'st';

interface AStockTagProps {
  exchange: Exchange;
  status?: StockStatus;
  size?: 'sm' | 'md' | 'lg';
}

// 标签样式
// SH - 上交所（蓝色 #1890FF）
// SZ - 深交所（橙色 #FA8C16）
// 🔴 涨停
// 🟢 跌停
// ⏸️ 停牌
```

### 4. LimitPriceDisplay - 涨跌停价格显示

**功能**: 计算并显示股票的涨停价和跌停价

**接口设计**:

```typescript
interface LimitPriceDisplayProps {
  currentPrice: number;
  limitType: '10%' | '5%' | '20%';  // 涨跌幅限制
  size?: 'sm' | 'md' | 'lg';
}

// 根据板块自动判断限制
// 主板: 10%
// 创业板/科创板: 20%
// ST股票: 5%
```

---

## 页面增强设计

### 1. AStockDetailPage - A 股详情页

在现有 `/stocks/[symbol]` 页面基础上增强：

```tsx
// 现有组件基础上添加
interface AStockDetailEnhancement {
  // 龙虎榜数据
  topList?: TopListData[];

  // 资金流向
  moneyFlow?: MoneyFlowData;

  // 融资融券
  margin?: MarginData;

  // 板块归属
  sectors?: SectorInfo[];

  // 涨跌停状态
  limitStatus?: 'limit_up' | 'limit_down' | 'normal';
}
```

**新增组件区域**:

```
┌─────────────────────────────────────────────┐
│  股票代码 (600519)  贵州茅台  [SH] [🔴涨停]  │
├─────────────────────────────────────────────┤
│  ¥1850.00  ▲50.00 (+2.78%)                │
├─────────────────────────────────────────────┤
│  [K线图] [分时图] [龙虎榜] [资金流向]       │
├──────────────────┬──────────────────────────┤
│                  │                          │
│   K线图表        │   资金流向               │
│                  │   [主力净流入 XXX 万]    │
│                  │                          │
├──────────────────┼──────────────────────────┤
│                  │                          │
│   基本面         │   融资融券               │
│   [财报要点]    │   [融资余额 XXX 亿]       │
│                  │                          │
└──────────────────┴──────────────────────────┘
```

### 2. AStockWatchlistTable - A 股观察列表

增强现有 `WatchlistTable` 组件：

**新增列**:

| 列名 | 说明 | 宽度 |
|------|------|------|
| 代码 | 600519 (SH) | 120px |
| 名称 | 贵州茅台 | 150px |
| 现价 | ¥1850.00 | 100px |
| 涨跌 | +2.78% | 80px |
| 涨停价 | ¥2035.00 | 100px |
| 跌停价 | ¥1665.00 | 100px |
| 换手率 | 2.35% | 80px |
| 成交量 | 1.2亿手 | 100px |
| 涨跌停 | 🔴涨停 | 60px |

**排序支持**:
- 按涨跌幅排序
- 按换手率排序
- 按成交量排序

### 3. ASectorPanel - 板块面板

展示行业/概念板块数据：

```tsx
interface ASectorPanelProps {
  type: 'industry' | 'concept';
  period?: 'day' | 'week' | 'month';
}
```

**功能**:
- 行业板块资金流向排行
- 概念板块热度排行
- 板块内资金流入/流出
- 点击跳转板块详情

---

## 性能优化设计

### 1. 加载速度优化

#### 1.1 Streaming SSR

```typescript
// 使用 React Suspense 实现流式渲染
// app/(root)/stocks/[symbol]/page.tsx

import { Suspense } from 'react';
import { AStockDetailSkeleton } from '@/components/skeletons';

export default async function StockDetail({ params }) {
  return (
    <div>
      {/* 核心内容立即加载 */}
      <StockHeader symbol={params.symbol} />

      {/* 次要内容流式加载 */}
      <Suspense fallback={<AStockDetailSkeleton />}>
        <MoneyFlowCard symbol={params.symbol} />
      </Suspense>

      <Suspense fallback={<AStockDetailSkeleton />}>
        <MarginPanel symbol={params.symbol} />
      </Suspense>
    </div>
  );
}
```

**目标指标**:
| 指标 | 目标值 | 当前参考 |
|------|--------|---------|
| LCP | < 2.5s | ~4s |
| FCP | < 1.8s | ~3s |
| TTFB | < 600ms | ~800ms |

#### 1.2 API 缓存策略

```typescript
// lib/cache/strategies.ts

export const CACHE_STRATEGIES = {
  // 股票报价 - 60秒缓存
  quote: { ttl: 60, staleWhileRevalidate: 30 },

  // K线数据 - 5分钟缓存
  kline: { ttl: 300, staleWhileRevalidate: 60 },

  // 公司信息 - 1小时缓存
  profile: { ttl: 3600, staleWhileRevalidate: 300 },

  // 财报数据 - 24小时缓存
  financial: { ttl: 86400, staleWhileRevalidate: 3600 },

  // 龙虎榜 - 当日有效
  toplist: { ttl: 0, staleWhileRevalidate: 0 },
};
```

#### 1.3 图片优化

- 使用 Next.js Image 组件
- 配置合理的占位符
- 启用懒加载

```tsx
<Image
  src={chartUrl}
  alt="K线图"
  width={800}
  height={400}
  placeholder="blur"
  blurDataURL="data:image/png;base64,..."
  loading="lazy"
/>
```

#### 1.4 代码分割

```
优化前: 初始加载 JS ~500KB
优化后: 初始加载 JS ~180KB

分割策略:
- 路由级分割
- 组件级动态导入
- TradingView 组件延迟加载
```

### 2. 运行时性能优化

#### 2.1 虚拟列表 (Virtual List)

用于大数据量表格（龙虎榜、板块排行）：

```tsx
import { useVirtualizer } from '@tanstack/react-virtual';

function LargeTable({ data }) {
  const parentRef = useRef(null);

  const virtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 48,
    overscan: 5,
  });

  return (
    <div ref={parentRef} style={{ height: '500px', overflow: 'auto' }}>
      <div style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map(virtualRow => (
          <div
            key={virtualRow.key}
            style={{
              position: 'absolute',
              top: virtualRow.start,
              height: virtualRow.size,
            }}
          >
            {data[virtualRow.index]}
          </div>
        ))}
      </div>
    </div>
  );
}
```

#### 2.2 状态管理优化

使用 React Query 优化数据获取和缓存：

```tsx
// 使用 useQuery 获取数据
const { data, isLoading, error } = useQuery({
  queryKey: ['quote', symbol],
  queryFn: () => getQuote(symbol),
  // 缓存策略
  staleTime: 60 * 1000,
  cacheTime: 5 * 60 * 1000,
  // 后台刷新
  refetchOnWindowFocus: false,
  refetchInterval: 60 * 1000,
});
```

#### 2.3 Web Worker

将复杂计算移至 Web Worker：

```typescript
// workers/calculations.worker.ts

// 计算漲跌停价格
function calculateLimitPrices(price: number, limitType: string): { up: number; down: number } {
  const ratio = limitType === '20%' ? 0.2 : limitType === '5%' ? 0.05 : 0.1;
  return {
    up: Math.round(price * (1 + ratio) * 100) / 100,
    down: Math.round(price * (1 - ratio) * 100) / 100,
  };
}

export { calculateLimitPrices };
```

#### 2.4 防抖与节流

```typescript
// hooks/useDebounce.ts
import { useDebouncedCallback } from 'use-debounce';

// 搜索防抖
const debouncedSearch = useDebouncedCallback((value) => {
  setSearchQuery(value);
}, 300);

// 滚动节流
const handleScroll = useThrottledCallback(() => {
  setScrollPosition(window.scrollY);
}, 100);
```

### 3. 监控体系

#### 3.1 Core Web Vitals 监控

```typescript
// lib/monitoring/web-vitals.ts
import { onCLS, onFID, onLCP } from 'web-vitals';

export function reportWebVitals(metric) {
  // 发送到分析服务
  analytics.track('WebVitals', {
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
  });
}

// 使用
onCLS(reportWebVitals);
onFID(reportWebVitals);
onLCP(reportWebVitals);
```

#### 3.2 API 性能追踪

```typescript
// middleware.ts
export function middleware(request: NextRequest) {
  const start = Date.now();

  // ... 处理请求

  const duration = Date.now() - start;
  if (duration > 1000) {
    // 记录慢请求
    logger.warn('Slow API request', {
      path: request.nextUrl.pathname,
      duration,
    });
  }
}
```

---

## 实施计划

### 任务拆分

#### Task 1: A 股 UI 基础组件
- [ ] 1.1 创建 AStockCell 组件
- [ ] 1.2 创建 AStockPrice 组件
- [ ] 1.3 创建 AStockTag 组件
- [ ] 1.4 创建 LimitPriceDisplay 组件
- [ ] 1.5 编写单元测试

#### Task 2: A 股详情页增强
- [ ] 2.1 扩展股票详情页数据获取
- [ ] 2.2 添加涨跌停状态显示
- [ ] 2.3 添加板块归属展示
- [ ] 2.4 优化组件加载顺序
- [ ] 2.5 编写集成测试

#### Task 3: A 股观察列表增强
- [ ] 3.1 扩展 WatchlistTable 组件
- [ ] 3.2 添加新列（换手率、成交量等）
- [ ] 3.3 添加排序功能
- [ ] 3.4 编写测试

#### Task 4: 板块面板
- [ ] 4.1 创建 ASectorPanel 组件
- [ ] 4.2 集成板块数据
- [ ] 4.3 添加交互功能
- [ ] 4.4 编写测试

#### Task 5: 性能优化
- [ ] 5.1 实现 Streaming SSR
- [ ] 5.2 优化 API 缓存策略
- [ ] 5.3 添加虚拟列表
- [ ] 5.4 实现 Web Worker
- [ ] 5.5 添加性能监控
- [ ] 5.6 测试验证

### 交付标准

- [ ] A 股 UI 组件完整可用
- [ ] 页面加载速度提升 50%+
- [ ] 测试覆盖率 > 80%
- [ ] 文档更新（CLAUDE.md）
- [ ] 提交信息遵循 conventional commits

---

## 验收标准

### 功能验收

| 功能 | 验收条件 |
|------|---------|
| AStockCell | 正确显示 600519 茅台 (SH) 格式 |
| AStockPrice | 红涨绿跌颜色正确 |
| AStockTag | 交易所标签显示正确 |
| 详情页 | 涨跌停状态正确显示 |
| 观察列表 | 新增列正确显示 |

### 性能验收

| 指标 | 目标 | 验收方式 |
|------|------|---------|
| LCP | < 2.5s | Lighthouse |
| FCP | < 1.8s | Lighthouse |
| 初始 JS | < 200KB | Bundle 分析 |
| 列表渲染 | 1000+ 行流畅 | 实际测试 |

---

## 后续扩展

### 移动端适配（未来）

- 响应式布局
- 触摸优化
- 简化数据展示
- 手势交互

### PWA 支持（未来）

- 离线缓存
- 主屏添加
- 推送通知
