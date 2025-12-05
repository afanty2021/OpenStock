[根目录](../../CLAUDE.md) > **hooks**

# Hooks 模块

## 模块职责

React 自定义 Hooks，封装常用业务逻辑和状态管理，提高组件复用性和代码组织。

## 目录结构

```
hooks/
├── useDebounce.ts         # 防抖 Hook
└── useTradingViewWidget.tsx # TradingView 组件管理
```

## Hooks 详情

### useDebounce

**用途**: 延迟执行函数，常用于搜索输入防抖

```typescript
import { useDebounce } from '@/hooks/useDebounce';

const debouncedValue = useDebounce(value, delay);
```

**特性**:
- 使用 useEffect 和 setTimeout 实现
- 清理机制防止内存泄漏
- TypeScript 类型安全

**使用场景**:
- 搜索框输入
- API 请求防抖
- 表单验证延迟

### useTradingViewWidget

**用途**: 管理 TradingView 小组件的加载和交互

```typescript
import { useTradingViewWidget } from '@/hooks/useTradingViewWidget';

const { ref } = useTradingViewWidget(config);
```

**功能**:
- 动态加载 TradingView 脚本
- 配置图表参数
- 处理组件卸载时的清理

## 开发指南

### 创建新 Hook

1. 命名约定：以 `use` 开头
2. 文件位置：放在 `hooks/` 目录
3. 导出方式：命名导出
4. 文档注释：说明用途和参数

### 示例模板

```typescript
import { useState, useEffect } from 'react';

/**
 * Hook 描述
 * @param param 参数说明
 * @returns 返回值说明
 */
export const useCustomHook = (param: string) => {
  const [state, setState] = useState(null);

  useEffect(() => {
    // 逻辑实现
  }, [param]);

  return { state, setState };
};
```

## 最佳实践

1. **单一职责**: 每个 Hook 只做一件事
2. **类型安全**: 使用 TypeScript 定义参数和返回类型
3. **性能优化**: 合理使用依赖数组
4. **文档完整**: 添加 JSDoc 注释

## 扩展建议

1. **常用业务 Hooks**
   - `useWatchlist`: 收藏夹管理
   - `useStockSearch`: 股票搜索状态
   - `useAuth`: 认证状态管理
   - `useLocalStorage`: 本地存储操作

2. **UI 交互 Hooks**
   - `useModal`: 模态框状态
   - `useToggle`: 开关状态
   - `useKeyPress`: 键盘事件监听

3. **数据获取 Hooks**
   - `useFetch`: 通用数据请求
   - `useInfiniteScroll`: 无限滚动
   - `useRealtimeData`: 实时数据更新