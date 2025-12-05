[根目录](../../CLAUDE.md) > **types**

# Types 模块

## 模块职责

全局 TypeScript 类型定义，为整个应用提供统一的类型系统，增强代码的类型安全性和开发体验。

## 文件结构

```
types/
└── global.d.ts    # 全局类型声明
```

## 核心类型定义

### 认证相关

```typescript
// 登录表单数据
type SignInFormData = {
    email: string;
    password: string;
};

// 注册表单数据
type SignUpFormData = {
    fullName: string;
    email: string;
    password: string;
    country: string;
    investmentGoals: string;
    riskTolerance: string;
    preferredIndustry: string;
};

// 用户信息
type User = {
    id: string;
    name: string;
    email: string;
};
```

### 股票相关

```typescript
// 基础股票信息
type Stock = {
    symbol: string;
    name: string;
    exchange: string;
    type: string;
};

// 带收藏状态的股票
type StockWithWatchlistStatus = Stock & {
    isInWatchlist: boolean;
};

// Finnhub 搜索结果
type FinnhubSearchResult = {
    symbol: string;
    description: string;
    displaySymbol?: string;
    type: string;
};

// 选中的股票
type SelectedStock = {
    symbol: string;
    company: string;
    currentPrice?: number;
};
```

### 收藏夹相关

```typescript
// 收藏夹按钮属性
type WatchlistButtonProps = {
    symbol: string;
    company: string;
    isInWatchlist: boolean;
    showTrashIcon?: boolean;
    type?: 'button' | 'icon';
    onWatchlistChange?: (symbol: string, isAdded: boolean) => void;
};

// 带数据的收藏项
type StockWithData = {
    userId: string;
    symbol: string;
    company: string;
    addedAt: Date;
    currentPrice?: number;
    changePercent?: number;
    priceFormatted?: string;
    changeFormatted?: string;
    marketCap?: string;
    peRatio?: string;
};
```

### 新闻相关

```typescript
// 市场新闻文章
type MarketNewsArticle = {
    id: number;
    headline: string;
    summary: string;
    source: string;
    url: string;
    datetime: number;
    category: string;
    related: string;
    image?: string;
};

// 原始新闻数据
type RawNewsArticle = {
    id: number;
    headline?: string;
    summary?: string;
    source?: string;
    url?: string;
    datetime?: number;
    image?: string;
    category?: string;
    related?: string;
};
```

### 价格提醒相关

```typescript
// 提醒数据
type AlertData = {
    symbol: string;
    company: string;
    alertName: string;
    alertType: 'upper' | 'lower';
    threshold: string;
};

// 完整的提醒信息
type Alert = {
    id: string;
    symbol: string;
    company: string;
    alertName: string;
    currentPrice: number;
    alertType: 'upper' | 'lower';
    threshold: number;
    changePercent?: number;
};
```

### UI 组件相关

```typescript
// 表单输入框属性
type FormInputProps = {
    name: string;
    label: string;
    placeholder: string;
    type?: string;
    register: UseFormRegister;
    error?: FieldError;
    validation?: RegisterOptions;
    disabled?: boolean;
    value?: string;
};

// 选择框属性
type SelectFieldProps = {
    name: string;
    label: string;
    placeholder: string;
    options: readonly Option[];
    control: Control;
    error?: FieldError;
    required?: boolean;
};

// 搜索命令属性
type SearchCommandProps = {
    open?: boolean;
    setOpen?: (open: boolean) => void;
    renderAs?: 'button' | 'text';
    buttonLabel?: string;
    buttonVariant?: 'primary' | 'secondary';
    className?: string;
};
```

### 邮件相关

```typescript
// 欢迎邮件数据
type WelcomeEmailData = {
    email: string;
    name: string;
    intro: string;
};
```

### 页面属性

```typescript
// 股票详情页属性
type StockDetailsPageProps = {
    params: Promise<{
        symbol: string;
    }>;
};
```

## 类型扩展

### React Hook Form 类型

依赖 `@types/react-hook-form`：
```typescript
import { Control, UseFormRegister, RegisterOptions, FieldError } from 'react-hook-form';
```

## 使用建议

1. **优先使用全局类型**
   - 避免重复定义
   - 保持类型一致性

2. **扩展而非修改**
   - 使用交叉类型扩展
   - 避免修改全局声明

3. **保持向后兼容**
   - 添加可选属性而非必需属性
   - 使用类型断言谨慎

4. **文档注释**
   - 为复杂类型添加注释
   - 说明属性用途

## 扩展建议

1. **API 响应类型**
   ```typescript
   type ApiResponse<T> = {
       success: boolean;
       data?: T;
       error?: string;
       message?: string;
   };
   ```

2. **分页类型**
   ```typescript
   type PaginatedResponse<T> = {
       items: T[];
       total: number;
       page: number;
       pageSize: number;
       hasNext: boolean;
       hasPrev: boolean;
   };
   ```

3. **主题类型**
   ```typescript
   type Theme = 'light' | 'dark' | 'system';

   type ThemeConfig = {
       primary: string;
       secondary: string;
       background: string;
       text: string;
   };
   ```

4. **错误类型**
   ```typescript
   type AppError = {
       code: string;
       message: string;
       details?: any;
       timestamp: Date;
   };
   ```