# A 股 UI 基础组件

## 模块概述

提供 A 股市场专用的 UI 基础组件，用于展示股票代码、价格、状态标签、涨跌停价格和板块排行等信息。

## 目录结构

```
components/astock/
├── index.ts                  # 模块入口
├── AStockCell.tsx           # A 股股票代码单元格
├── AStockPrice.tsx          # A 股价格显示
├── AStockTag.tsx            # 状态标签组件
├── LimitPriceDisplay.tsx    # 涨跌停价格显示
├── ASectorPanel.tsx         # 板块面板组件
└── __tests__/
    ├── AStockCell.test.tsx
    ├── AStockPrice.test.tsx
    ├── AStockTag.test.tsx
    ├── LimitPriceDisplay.test.tsx
    └── ASectorPanel.test.tsx
```

## 组件列表

### AStockCell

A 股股票代码单元格组件，用于展示股票代码，支持点击复制、悬停显示公司名称等功能。

**Props:**

| 属性 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `tsCode` | `string` | 必填 | 股票代码 (如 600519.SH) |
| `companyName` | `string` | - | 公司名称 (悬停显示) |
| `showExchange` | `boolean` | `true` | 是否显示交易所后缀 |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | 尺寸 |
| `onClick` | `() => void` | - | 点击事件 |
| `copyable` | `boolean` | `true` | 是否可复制 |

**使用示例:**

```tsx
import { AStockCell } from '@/components/astock';

<AStockCell tsCode="600519.SH" companyName="贵州茅台" size="md" />
<AStockCell tsCode="000001.SZ" showExchange={false} />
```

### AStockPrice

A 股价格显示组件，用于展示股票价格、涨跌额和涨跌幅，支持颜色编码（红涨绿跌）。

**Props:**

| 属性 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `price` | `number` | 必填 | 当前价格 |
| `change` | `number` | 必填 | 涨跌额 |
| `changePercent` | `number` | 必填 | 涨跌幅 % |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | 尺寸 |
| `showYuan` | `boolean` | `true` | 是否显示 ¥ 符号 |
| `formatOptions` | `object` | - | 格式化选项 |

**颜色规则:**
- 上涨: 红色 `#FF4444`
- 下跌: 绿色 `#00CC66`
- 平盘: 灰色 `#999999`

**使用示例:**

```tsx
import { AStockPrice } from '@/components/astock';

<AStockPrice price={152.50} change={2.30} changePercent={1.53} size="md" />
<AStockPrice price={100} change={-5} changePercent={-4.76} showYuan={false} />
```

### AStockTag

A 股状态标签组件，用于展示交易所标签和股票状态。

**Props:**

| 属性 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `exchange` | `'SH' \| 'SZ' \| 'BJ'` | 必填 | 交易所 |
| `status` | `'normal' \| 'limit_up' \| 'limit_down' \| 'suspended' \| 'st'` | `'normal'` | 股票状态 |
| `variant` | `'exchange' \| 'status'` | `'status'` | 组件变体 |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | 尺寸 |

**颜色规则:**
- SH: 蓝色 `#1890FF`
- SZ: 橙色 `#FA8C16`
- BJ: 绿色 `#52C41A`

**状态标签:**
- 正常: 灰色
- 涨停: 红色
- 跌停: 绿色
- 停牌: 黄色
- ST: 紫色

**使用示例:**

```tsx
import { AStockTag, ExchangeSelector } from '@/components/astock';

// 交易所标签
<AStockTag exchange="SH" variant="exchange" />

// 状态标签
<AStockTag exchange="SH" status="limit_up" />

// 交易所选择器
<ExchangeSelector value={exchange} onChange={setExchange} />
```

### LimitPriceDisplay

涨跌停价格显示组件，用于展示股票的涨跌停价格限制。

**Props:**

| 属性 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `currentPrice` | `number` | 必填 | 当前价格 |
| `symbol` | `string` | - | 股票代码（用于自动判断涨跌停限制） |
| `limitType` | `'10%' \| '5%' \| '20%' \| '30%'` | 自动判断 | 涨跌停类型 |
| `stockName` | `string` | - | 股票名称（用于识别 ST 股票） |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | 尺寸 |
| `showLabel` | `boolean` | `true` | 是否显示百分比标签 |
| `showBoth` | `boolean` | `false` | 是否同时显示涨停和跌停价格 |

**涨跌停规则:**

| 市场类型 | 涨跌停限制 | 代码范围 |
|---------|-----------|---------|
| 主板 | 10% | 600000-605999, 000001-001999 |
| 科创板/创业板 | 20% | 688000-689999, 300000-301999 |
| 北交所 | 30% | 800000-899999, 400000-499999 |
| ST 股票 | 5% | 名称包含 ST/*ST/S*ST |

**使用示例:**

```tsx
import { LimitPriceDisplay, CompactLimitPriceDisplay } from '@/components/astock';

// 自动判断涨跌停类型
<LimitPriceDisplay currentPrice={152.50} symbol="600519.SH" />

// 指定涨跌停类型
<LimitPriceDisplay currentPrice={100} limitType="20%" showBoth />

// 简洁版
<CompactLimitPriceDisplay currentPrice={100} symbol="300001.SZ" count={2} />
```

### ASectorPanel

板块面板组件，用于展示行业/概念板块排行数据。

**Props:**

| 属性 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `type` | `'industry' \| 'concept'` | 必填 | 板块类型（行业/概念） |
| `period` | `'day' \| 'week' \| 'month'` | `'day'` | 排行周期（暂未实现） |
| `limit` | `number` | `10` | 返回条数 |
| `showHeatmap` | `boolean` | `false` | 是否显示热力图（预留） |
| `className` | `string` | - | 自定义类名 |

**功能特性:**
- 三种排行模式：热门（涨幅榜）、冷门（跌幅榜）、全部
- 板块资金流向排行
- 实时市场状态显示
- 点击跳转板块详情
- 刷新数据功能

**使用示例:**

```tsx
import { ASectorPanel } from '@/components/astock';

// 行业板块面板
<ASectorPanel type="industry" limit={10} />

// 概念板块面板
<ASectorPanel type="concept" limit={15} showHeatmap={false} />

// 自定义样式
<ASectorPanel type="industry" className="custom-panel-class" />
```

## 测试

```bash
# 运行所有组件测试
npm run test -- components/astock

# 运行单个组件测试
npm run test -- components/astock/__tests__/AStockCell.test.tsx
npm run test -- components/astock/__tests__/AStockPrice.test.tsx
npm run test -- components/astock/__tests__/AStockTag.test.tsx
npm run test -- components/astock/__tests__/LimitPriceDisplay.test.tsx
```

### 测试统计

| 组件 | 测试用例 | 状态 |
|------|---------|------|
| AStockCell | 8 | ✅ 通过 |
| AStockPrice | 24 | ✅ 通过 |
| AStockTag | 33 | ✅ 通过 |
| LimitPriceDisplay | 31 | ✅ 通过 |
| ASectorPanel | 20+ | ✅ 通过 |
| **总计** | **116+** | ✅ |

## 设计考虑

1. **A 股颜色惯例**: 使用红涨绿跌的传统配色
2. **类型安全**: 完整的 TypeScript 类型定义
3. **可访问性**: 支持键盘导航和屏幕阅读器
4. **响应式**: 支持 sm/md/lg 三种尺寸
5. **灵活性**: 支持自定义样式和事件处理

## 扩展建议

1. 添加更多状态标签变体
2. 支持自定义颜色配置
3. 添加动画效果
4. 支持主题切换
