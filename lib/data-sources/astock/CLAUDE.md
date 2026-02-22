# A 股功能模块 (astock)

## 模块概述

提供 A 股市场专用功能，包括代码格式标准化、市场类型检测、涨跌停限制计算等。

## 目录结构

```
lib/data-sources/astock/
├── index.ts           # 模块入口，导出公共 API
├── code-util.ts       # 代码格式标准化工具
└── __tests__/
    └── code-util.test.ts  # 单元测试（72 个测试用例，90%+ 覆盖率）
```

## 核心功能

### AStockCodeUtil - 代码格式标准化工具

#### 主要方法

| 方法 | 描述 | 返回值 |
|------|------|--------|
| `isAStock(symbol)` | 判断是否为 A 股代码 | `boolean` |
| `getMarketType(symbol)` | 获取市场类型 | `MarketType \| undefined` |
| `getLimitPct(symbol, name?)` | 获取涨跌停限制比例 | `number` |
| `normalize(symbol)` | 标准化代码格式 | `string` |
| `toFinnhubCode(symbol)` | 转换为 Finnhub 格式 | `string` |
| `toTushareCode(symbol)` | 转换为 Tushare 格式 | `string` |
| `getExchange(symbol)` | 获取交易所后缀 | `EXCHANGE_SUFFIX \| undefined` |
| `isValidCode(symbol)` | 验证代码格式 | `boolean` |
| `extractCode(symbol)` | 提取纯代码 | `string` |

#### 支持的市场类型

```typescript
enum MarketType {
  SH_MAIN = 'SH_MAIN',  // 上海主板 (600xxx, 601xxx, 603xxx, 605xxx)
  SH_STAR = 'SH_STAR',  // 上海科创板 (688xxx, 689xxx)
  SZ_MAIN = 'SZ_MAIN',  // 深圳主板 (000xxx, 001xxx)
  SZ_GEM = 'SZ_GEM',    // 深圳创业板 (300xxx, 301xxx)
  BSE = 'BSE',          // 北交所 (8xxxxx, 4xxxxx)
}
```

#### 涨跌停限制规则

| 市场类型 | 涨跌停限制 | 代码范围 |
|---------|-----------|---------|
| 上海主板 | ±10% | 600000-605999 |
| 上海科创板 | ±20% | 688000-689999 |
| 深圳主板 | ±10% | 000001-001999 |
| 深圳创业板 | ±20% | 300000-301999 |
| 北交所 | ±30% | 800000-899999, 400000-499999 |
| ST 股票 | ±5% | 名称包含 ST/*ST/S*ST |

## 使用示例

### 代码格式标准化

```typescript
import { AStockCodeUtil } from '@/lib/data-sources/astock';

// 判断是否为 A 股
AStockCodeUtil.isAStock('600519');        // true
AStockCodeUtil.isAStock('600519.SH');     // true
AStockCodeUtil.isAStock('AAPL');          // false

// 标准化代码格式
AStockCodeUtil.normalize('600519');       // '600519.SH'
AStockCodeUtil.normalize('600519.SS');    // '600519.SH' (Finnhub → 标准)
AStockCodeUtil.normalize('600519.SH');    // '600519.SH'

// 获取市场类型
AStockCodeUtil.getMarketType('600519.SH'); // MarketType.SH_MAIN
AStockCodeUtil.getMarketType('688001.SH'); // MarketType.SH_STAR
AStockCodeUtil.getMarketType('300001.SZ'); // MarketType.SZ_GEM
```

### 涨跌停限制计算

```typescript
// 获取涨跌停限制
AStockCodeUtil.getLimitPct('600519.SH');              // 10 (主板 10%)
AStockCodeUtil.getLimitPct('688001.SH');              // 20 (科创板 20%)
AStockCodeUtil.getLimitPct('300001.SZ');              // 20 (创业板 20%)
AStockCodeUtil.getLimitPct('832566.BJ');              // 30 (北交所 30%)
AStockCodeUtil.getLimitPct('600519.SH', 'STPingAn');  // 5 (ST 股票 5%)
```

### 数据源代码转换

```typescript
// Finnhub 格式转换
AStockCodeUtil.toFinnhubCode('600519.SH');  // '600519.SS'
AStockCodeUtil.toFinnhubCode('000001.SZ');  // '000001.se'

// Tushare 格式转换
AStockCodeUtil.toTushareCode('600519.SS');  // '600519.SH'
AStockCodeUtil.toTushareCode('000001.se');  // '000001.SZ'
```

## 测试

```bash
# 运行单元测试
npm run test -- lib/data-sources/astock/__tests__/code-util.test.ts

# 运行测试覆盖率
npm run test:coverage -- lib/data-sources/astock/__tests__/code-util.test.ts
```

### 测试覆盖率

- **语句覆盖率**: 93.1%
- **分支覆盖率**: 90.32%
- **函数覆盖率**: 100%
- **行覆盖率**: 95.77%
- **测试用例数**: 72 个

## A 股代码模式

### 正则表达式规则

```typescript
// 上海主板：600000-605999
/^60[0-5]\d{3}$/

// 上海科创板：688000-689999
/^68[89]\d{3}$/

// 深圳主板：000001-001999
/^00[0-1]\d{3}$/

// 深圳创业板：300000-301999
/^30[0-1]\d{3}$/

// 北交所：800000-899999, 400000-499999
/^[48]\d{5}$/
```

### 代码格式对照表

| 数据源 | 格式示例 | 说明 |
|--------|---------|------|
| **标准格式** | 600519.SH | 使用 .SH/.SZ/.BJ 后缀 |
| **Finnhub** | 600519.SS | 上海使用 .SS，深圳使用 .se（小写） |
| **Tushare** | 600519.SH | 与标准格式一致 |
| **Yahoo Finance** | 600519.SS | 与 Finnhub 一致 |

## 设计考虑

1. **精确模式匹配**: 使用严格的正则表达式，避免误匹配
2. **多格式支持**: 支持 Finnhub、Tushare、Yahoo Finance 等主流数据源格式
3. **涨跌停规则**: 根据市场类型和股票名称（ST）动态计算限制
4. **类型安全**: 使用 TypeScript 枚举确保类型安全

## 相关文档

- [设计文档](../../../../docs/plans/2026-02-22-astock-phase1-design.md) - A 股功能扩展第一阶段设计
- [lib/data-sources/CLAUDE.md](../CLAUDE.md) - 多数据源聚合系统文档

## 扩展计划

### 第一阶段（当前）

- [x] 代码格式标准化工具
- [ ] 涨跌停检测器
- [ ] 交易时间适配
- [ ] 交易时段感知调度器
- [ ] Tushare A 股特色数据扩展

### 第二阶段（规划中）

- [ ] A 股板块识别
- [ ] 股票名称标准化
- [ ] A 股特定指标计算
