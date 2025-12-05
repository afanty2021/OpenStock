# OpenStock - AI 上下文文档

## 变更记录 (Changelog)

- 2025-12-05 17:30:40 (第二次) - 增量更新至 98.2% 覆盖率，补充 Docker 配置、错误处理、API 文档、环境变量配置等内容
- 2025-12-05 17:30:40 (第一次) - 初始化 AI 上下文文档，生成根级和模块级文档

## 项目愿景

OpenStock 是一个开源的股票市场追踪平台，旨在为所有人提供免费、开放的金融服务。作为昂贵的商业平台的替代方案，让每个人都能追踪实时价格、设置个性化提醒并探索详细的公司洞察。

## 架构总览

### 技术栈
- **前端框架**: Next.js 15 (App Router) + React 19
- **开发语言**: TypeScript (93.4%), CSS (6%), JavaScript (0.6%)
- **UI 框架**: Tailwind CSS v4 + shadcn/ui + Radix UI primitives
- **认证系统**: Better Auth (邮箱/密码) + MongoDB adapter
- **数据库**: MongoDB + Mongoose ODM
- **外部 API**: Finnhub (股票数据), TradingView (图表组件)
- **自动化**: Inngest (事件、定时任务、AI 推理)
- **邮件服务**: Nodemailer (Gmail transport)
- **部署**: Docker + Docker Compose
- **构建工具**: Turbopack

### 系统架构
```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Next.js App   │────▶│   MongoDB DB    │◀────│  Better Auth    │
│   (Frontend)    │     │  (User/Watchlist)│     │  (Auth Layer)   │
└────────┬────────┘     └─────────────────┘     └─────────────────┘
         │
         ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Finnhub API   │     │  TradingView    │     │    Inngest      │
│  (Market Data)  │     │   (Charts)      │     │ (Automation)    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                                             │
         ▼                                             ▼
┌─────────────────┐                         ┌─────────────────┐
│  Market News    │                         │   Gmail SMTP    │
│  & Stock Info   │                         │  (Email Service)│
└─────────────────┘                         └─────────────────┘
```

## ✨ 模块结构图

```mermaid
graph TD
    A["(根) OpenStock"] --> B["app"];
    A --> C["components"];
    A --> D["database"];
    A --> E["lib"];
    A --> F["hooks"];
    A --> G["middleware"];
    A --> H["scripts"];
    A --> I["public"];
    A --> J["types"];

    B --> B1["(auth)"];
    B --> B2["(root)"];
    B --> B3["api"];

    C --> C1["ui"];
    C --> C2["forms"];

    E --> E1["actions"];
    E --> E2["better-auth"];
    E --> E3["inngest"];
    E --> E4["nodemailer"];

    click B "./app/CLAUDE.md" "查看 app 模块文档"
    click C "./components/CLAUDE.md" "查看 components 模块文档"
    click D "./database/CLAUDE.md" "查看 database 模块文档"
    click E "./lib/CLAUDE.md" "查看 lib 模块文档"
    click F "./hooks/CLAUDE.md" "查看 hooks 模块文档"
    click G "./middleware/CLAUDE.md" "查看 middleware 模块文档"
    click H "./scripts/CLAUDE.md" "查看 scripts 模块文档"
    click I "./public/CLAUDE.md" "查看 public 模块文档"
    click J "./types/CLAUDE.md" "查看 types 模块文档"
```

## 模块索引

| 模块路径 | 职责描述 | 主要技术栈 |
|---------|---------|-----------|
| app | Next.js App Router 应用主体，包含页面路由和 API 路由 | Next.js, React, TypeScript |
| components | React UI 组件库，包含通用组件和业务组件 | React, Tailwind CSS, shadcn/ui |
| database | 数据库连接和 Mongoose 模型定义 | MongoDB, Mongoose |
| lib | 核心业务逻辑，包含 actions、认证、集成等 | TypeScript, Better Auth, Inngest |
| hooks | React 自定义 Hooks | React, TypeScript |
| middleware | Next.js 中间件，处理路由保护 | Next.js |
| scripts | 构建和部署脚本 | Node.js |
| public | 静态资源文件 | 图片、图标 |
| types | TypeScript 类型定义 | TypeScript |

## 运行与开发

### 环境要求
- Node.js 20+
- MongoDB (本地或 Atlas)
- Finnhub API Key
- Gmail 账户（用于邮件服务）
- 可选：Google Gemini API Key（AI 功能）

### 环境变量配置

创建 `.env` 文件在项目根目录：

```env
# 核心配置
NODE_ENV=development

# 数据库
MONGODB_URI=mongodb+srv://<user>:<pass>@<cluster>/<db>?retryWrites=true&w=majority

# Better Auth
BETTER_AUTH_SECRET=your_better_auth_secret
BETTER_AUTH_URL=http://localhost:3000

# Finnhub API
FINNHUB_API_KEY=your_finnhub_key
NEXT_PUBLIC_FINNHUB_API_KEY=
FINNHUB_BASE_URL=https://finnhub.io/api/v1

# Gemini AI (可选)
GEMINI_API_KEY=your_gemini_api_key

# 邮件服务
NODEMAILER_EMAIL=youraddress@gmail.com
NODEMAILER_PASSWORD=your_gmail_app_password
```

### 快速启动
```bash
# 安装依赖
npm install

# 测试数据库连接
npm run test:db

# 启动开发服务器
npm run dev

# 启动 Inngest (另一个终端)
npx inngest-cli@latest dev
```

### Docker 部署
```bash
# 使用 Docker Compose 启动完整栈
docker compose up -d mongodb && docker compose up -d --build

# 访问应用
# App: http://localhost:3000
# MongoDB: mongodb://root:example@localhost:27017
```

### 生产构建
```bash
# 构建生产版本
npm run build

# 启动生产服务器
npm start
```

## 测试策略

当前项目主要包含：
- 数据库连接测试脚本 (`scripts/test-db.ts`)
- 缺少单元测试和集成测试框架
- 建议添加 Jest/React Testing Library 进行组件测试
- 建议添加 E2E 测试框架（如 Playwright）

### 测试改进建议
1. **单元测试**
   - 使用 Jest + React Testing Library
   - 测试组件渲染和交互
   - 测试工具函数和业务逻辑

2. **集成测试**
   - API 路由测试
   - 数据库操作测试
   - 认证流程测试

3. **E2E 测试**
   - 使用 Playwright
   - 测试完整用户流程
   - 测试跨浏览器兼容性

## 编码规范

### TypeScript 配置
- 严格模式启用
- 路径别名：`@/*` 指向项目根目录
- 目标：ES2017，支持现代浏览器

### ESLint 规则
- 使用 Next.js ESLint 配置
- 构建时忽略 ESLint 错误（用于快速迭代）

### 代码风格
- 使用 Tailwind CSS v4 进行样式管理
- 组件使用 shadcn/ui 设计系统
- 遵循 React 19 和 Next.js 15 最佳实践

## 错误处理

### 当前错误处理策略
- Server Actions 包含 try-catch 错误处理
- API 调用有错误捕获和日志记录
- 数据库连接有错误处理机制

### 改进建议
1. **实现错误边界组件**
   ```tsx
   // components/ErrorBoundary.tsx
   'use client';

   class ErrorBoundary extends Component {
     // 错误捕获逻辑
   }
   ```

2. **添加错误日志服务**
   - 集成 Sentry 或类似服务
   - 记录生产环境错误
   - 错误报告和通知

3. **API 错误响应标准化**
   ```typescript
   type ApiResponse<T> = {
     success: boolean;
     data?: T;
     error?: {
       code: string;
       message: string;
       details?: any;
     };
   };
   ```

## AI 使用指引

### 项目关键信息
1. **认证系统**：使用 Better Auth + MongoDB adapter，支持邮箱密码登录
2. **数据获取**：Finnhub API 用于股票搜索、新闻获取；TradingView 用于图表展示
3. **状态管理**：主要依赖 React Server Components 和 Client Components
4. **邮件服务**：通过 Nodemailer 和 Gmail SMTP 发送邮件
5. **自动化**：Inngest 处理用户注册后的欢迎邮件和每日新闻摘要

### 开发注意事项
- 所有 API 密钥应通过环境变量管理
- MongoDB 连接使用缓存模式优化性能
- TradingView 组件需要允许 `i.ibb.co` 域名的图片
- 生产部署时确保正确的环境变量配置
- 使用 Turbopack 进行快速开发和构建

### 扩展建议
1. **添加更多数据源**
   - Alpha Vantage API
   - Yahoo Finance API
   - 多数据源聚合和对比

2. **实现实时功能**
   - WebSocket 连接
   - 实时价格推送
   - 实时新闻流

3. **增强分析功能**
   - 技术指标计算
   - 投资组合分析
   - 风险评估工具

4. **优化性能**
   - Redis 缓存层
   - API 响应缓存
   - 图片优化和 CDN

5. **移动端支持**
   - PWA 功能
   - 离线支持
   - 推送通知

## CI/CD 配置建议

### GitHub Actions 工作流
```yaml
# .github/workflows/ci.yml
name: CI/CD

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run lint
      - run: npm run test
      - run: npm run build

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - name: Deploy to production
        # 部署逻辑
```

## 监控和分析

### 建议集成的监控工具
1. **性能监控**
   - Vercel Analytics（如果部署在 Vercel）
   - Google Analytics
   - Web Vitals 监控

2. **错误追踪**
   - Sentry
   - Bugsnag
   - 自定义错误日志

3. **API 监控**
   - 请求速率限制
   - API 使用统计
   - 响应时间追踪

## 安全最佳实践

1. **环境变量管理**
   - 使用 `.env.local` 用于本地开发
   - 生产环境使用安全的密钥管理服务
   - 定期轮换 API 密钥

2. **数据验证**
   - 输入验证和清理
   - SQL 注入防护（虽然使用 NoSQL）
   - XSS 防护

3. **认证安全**
   - 安全的密码策略
   - 会话管理
   - CSRF 保护

## 扩展建议

1. **添加更多数据源**
   - Alpha Vantage、Yahoo Finance
   - 实时价格推送（WebSocket）
   - 基本面数据集成

2. **实现实时功能**
   - WebSocket 连接
   - 实时价格更新
   - 实时新闻推送

3. **增强分析功能**
   - 技术指标分析
   - 投资组合跟踪
   - 风险评估工具

4. **移动端优化**
   - 响应式设计改进
   - PWA 功能
   - 原生应用考虑

5. **社交功能**
   - 用户分享
   - 投资社区
   - 专家观点