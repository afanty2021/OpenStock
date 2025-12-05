[根目录](../../CLAUDE.md) > **app**

# App 模块

## 模块职责

Next.js App Router 应用的核心目录，包含所有页面路由、布局和 API 路由。采用 App Router 结构，支持 React Server Components 和 Streaming SSR。

## 目录结构

```
app/
├── (auth)/                 # 认证相关路由组
│   ├── layout.tsx         # 认证页面布局
│   ├── sign-in/           # 登录页面
│   │   └── page.tsx
│   └── sign-up/           # 注册页面
│       └── page.tsx
├── (root)/                # 主应用路由组
│   ├── layout.tsx         # 根布局（已认证用户）
│   ├── page.tsx           # 仪表板首页
│   ├── api-docs/          # API 文档页面
│   ├── help/              # 帮助页面
│   ├── stocks/            # 股票详情页
│   │   └── [symbol]/      # 动态路由：股票代码
│   │       └── page.tsx
│   └── terms/             # 服务条款页面
├── api/                   # API 路由
│   └── inngest/           # Inngest webhook 路由
│       └── route.ts
├── globals.css            # 全局样式
├── layout.tsx             # 根布局
└── favicon.ico            # 网站图标
```

## 入口与启动

### 根布局 (`layout.tsx`)
- 配置全局字体：Geist Sans 和 Geist Mono
- 设置深色主题（`dark` class）
- 集成 Sonner Toast 组件
- 元数据配置：标题和描述

### 路由保护
- 通过 Next.js 中间件实现路由保护
- 未认证用户重定向到 `/sign-in`
- 公开路由：`sign-in`、`sign-up`、`assets`、API 路由等

## 对外接口

### API Routes
- `/api/inngest`: Inngest 事件处理 webhook
  - 处理用户创建事件
  - 处理定时任务触发

### 页面路由
- `/`: 仪表板，显示市场概览和热门股票
- `/stocks/[symbol]`: 股票详情页，显示图表、新闻等
- `/search`: 股票搜索页面（通过 SearchCommand 组件）
- `/api-docs`: API 文档页面
- `/help`: 帮助和说明页面
- `/terms`: 服务条款页面

## 关键特性

### 认证流程
- 登录页面：邮箱密码登录
- 注册页面：收集用户信息（国家、投资目标、风险承受能力等）
- 注册后触发 Inngest 工作流发送个性化欢迎邮件

### 市场数据展示
- 使用 TradingView 小组件展示：
  - 市场概览
  - 股票热力图
  - 市场报价
  - 热门新闻时间线

### 响应式设计
- 移动端友好布局
- 自适应网格系统
- 触摸优化的交互

## 重要组件集成

- **TradingViewWidget**: 嵌入式图表组件
- **Header**: 导航栏，包含用户信息和搜索
- **Footer**: 页脚信息和品牌标识

## 性能优化

- 使用 Next.js Image 组件优化图片加载
- 实施路由级别的代码分割
- 利用 React Suspense 进行流式渲染

## 开发提示

1. 新增页面时注意路由组的正确使用
2. API 路由应放在 `api/` 目录下
3. 使用 Server Components 进行数据获取
4. Client Components 需要添加 `"use client"` 指令