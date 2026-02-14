# OpenStock - AI 上下文文档

## 变更记录 (Changelog)

- 2026-02-14 - 新增 SirayBanner 品牌组件，更新 TradingView 股票代码格式转换（A/H股支持），优化帮助和条款页面，移除 spec-workflow 模板
- 2026-02-10 - 更新至 Next.js 15.5.7 + React 19.1.0，新增股票提醒功能、观察列表增强组件、API 文档页面，添加 10+ 个新脚本
- 2025-12-27 16:00:00 - 更新至 98% 覆盖率，添加 check-env.mjs 环境检查工具文档，更新快速启动流程
- 2025-12-05 17:30:40 (第二次) - 增量更新至 98.2% 覆盖率，补充 Docker 配置、错误处理、API 文档、环境变量配置等内容
- 2025-12-05 17:30:40 (第一次) - 初始化 AI 上下文文档，生成根级和模块级文档

## 项目愿景

OpenStock 是一个开源的股票市场追踪平台，旨在为所有人提供免费、开放的金融服务。作为昂贵的商业平台的替代方案，让每个人都能追踪实时价格、设置个性化提醒并探索详细的公司洞察。

## 架构总览

### 技术栈
- **前端框架**: Next.js 15.5.7 (App Router) + React 19.1.0
- **开发语言**: TypeScript (93.4%), CSS (6%), JavaScript (0.6%)
- **UI 框架**: Tailwind CSS v4 + shadcn/ui + Radix UI primitives
- **认证系统**: Better Auth 1.3.25 (邮箱/密码) + MongoDB adapter
- **数据库**: MongoDB + Mongoose 8.19 ODM
- **外部 API**: Finnhub (股票数据), TradingView (图表组件)
- **自动化**: Inngest 3.47.0 (事件、定时任务、AI 推理)
- **邮件服务**: Nodemailer (Gmail transport)
- **分析**: Vercel Analytics
- **部署**: Docker + Docker Compose
- **构建工具**: Turbopack

### 系统架构
```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Next.js App   │────▶│   MongoDB DB    │◀────│  Better Auth    │
│   (Frontend)    │     │  (User/Watchlist/Alert)││  (Auth Layer)   │
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

    C --> C1["ui"];
    C --> C2["forms"];
    C --> C3["watchlist"];
    C --> C4["charts"];

    D --> D1["models"];
    D --> D2["mongoose.ts"];

    E --> E1["actions"];
    E --> E2["better-auth"];
    E --> E3["inngest"];
    E --> E4["nodemailer"];
    E --> E5["kit.ts"];

    F --> F1["useTradingViewWidget.ts"];

    G --> G1["middleware.ts"];

    H --> H1["脚本目录 (10+ 脚本)"];

    I --> I1["assets/icons"];
    I --> I2["assets/images"];

    click B "./app/CLAUDE.md" "查看 app 模块文档"
    click C "./components/CLAUDE.md" "查看 components 模块文档"
    click D "./database/CLAUDE.md" "查看 database 模块文档"
    click E "./lib/CLAUDE.md" "查看 lib 模块文档"
    click F "./hooks/CLAUDE.md" "查看 hooks 模块文档"
    click G "./middleware/CLAUDE.md" "查看 middleware 模块文档"
    click H "./scripts/CLAUDE.md" "查看 scripts 模块文档"
```

## 模块索引

| 模块路径 | 职责描述 | 主要技术栈 |
|---------|---------|-----------|
| app | Next.js App Router 应用主体，包含页面路由和 API 路由 | Next.js, React, TypeScript |
| components | React UI 组件库，包含通用组件和业务组件 | React, Tailwind CSS, shadcn/ui |
| components/watchlist | 观察列表专用组件（表格、提醒、新闻等） | React, TradingView API |
| database | 数据库连接和 Mongoose 模型定义 | MongoDB, Mongoose |
| database/models | 数据模型定义（User, Watchlist, Alert） | TypeScript, Mongoose |
| lib | 核心业务逻辑，包含 actions、认证、集成等 | TypeScript, Better Auth, Inngest |
| lib/actions | Server Actions（alert, auth, finnhub, watchlist） | TypeScript |
| lib/kit.ts | Better Auth 与第三方集成的适配层 | TypeScript |
| hooks | React 自定义 Hooks | React, TypeScript |
| middleware | Next.js 中间件，处理路由保护 | Next.js |
| scripts | 构建和部署脚本（10+ 个） | Node.js |
| public | 静态资源文件 | 图片、图标 |
| types | TypeScript 类型定义 | TypeScript |

## 核心功能模块

### 股票数据功能
- **搜索与浏览**: 通过 Finnhub API 搜索股票、获取实时报价
- **图表展示**: TradingView Widget 集成，支持 K 线图和技术指标，支持 A 股/港股代码格式转换
- **公司信息**: 展示公司概况、财务数据、基本面分析
- **市场新闻**: 聚合相关新闻和公告

### 用户功能
- **认证系统**: Better Auth 支持邮箱/密码注册登录
- **观察列表**: 自定义股票观察列表，支持排序
- **价格提醒**: 设置价格阈值提醒，实时监控
- **新闻订阅**: 每日市场新闻摘要（Inngest 自动化）

### 管理功能
- **用户管理**: 用户数据迁移、Kit 集成
- **数据脚本**: 数据库迁移、用户迁移、Kit 转换工具

## 运行与开发

### 环境要求
- Node.js 20+
- MongoDB (本地或 Atlas)
- Finnhub API Key
- Google Gemini API Key（AI 功能）
- Gmail 账户（用于邮件服务）
- 可选：Inngest Signing Key（Vercel 部署）

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
NEXT_PUBLIC_FINNHUB_API_KEY=your_finnhub_key
FINNHUB_BASE_URL=https://finnhub.io/api/v1

# Gemini AI
GEMINI_API_KEY=your_gemini_api_key

# Inngest (Vercel 部署时需要)
INNGEST_SIGNING_KEY=your_inngest_signing_key

# 邮件服务
NODEMAILER_EMAIL=youraddress@gmail.com
NODEMAILER_PASSWORD=your_gmail_app_password
```

**验证环境配置**:
```bash
npm run check-env
```

### 快速启动
```bash
# 1. 安装依赖
npm install

# 2. 验证环境变量配置
npm run check-env

# 3. 测试数据库连接
npm run test:db

# 4. 启动开发服务器
npm run dev

# 5. 启动 Inngest (另一个终端)
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

## 新增功能详情 (2026-02)

### 股票提醒系统
- `CreateAlertModal.tsx` - 创建价格提醒的模态框
- `AlertsPanel.tsx` - 展示和管理用户提醒
- `lib/actions/alert.actions.ts` - 提醒相关的 Server Actions
- `database/models/alert.model.ts` - 提醒数据模型

### 观察列表增强
- `WatchlistTable.tsx` - 股票观察列表表格组件
- `WatchlistManager.tsx` - 观察列表管理界面
- `WatchlistStockChip.tsx` - 股票标签芯片
- `TradingViewWatchlist.tsx` - TradingView 集成观察列表
- `NewsGrid.tsx` - 相关新闻网格组件

### 页面更新
- `app/(root)/api-docs/page.tsx` - API 文档页面（重写）
- `app/(root)/about/page.tsx` - 关于页面
- `app/(root)/help/page.tsx` - 帮助页面（重写）
- `app/(root)/terms/page.tsx` - 条款页面（重写）
- `app/(root)/watchlist/page.tsx` - 观察列表页面（增强）

### 脚本工具 (10+ 新增)
- `scripts/migrate-users-to-kit.mjs` - 用户迁移到 Kit 认证
- `scripts/seed-inactive-user.mjs` - 播种非活跃用户
- `scripts/verify-watchlist.mjs` - 验证观察列表数据
- `scripts/test-kit.mjs` - 测试 Kit 集成
- `scripts/resolve_srv.js` - 解析 SRV 记录
- `scripts/check_db_name.js` - 检查数据库名称
- `scripts/create-kit-tag.mjs` - 创建 Kit 标签
- `scripts/inspect-user.mjs` - 检查用户信息
- `scripts/list-kit-forms.mjs` - 列出 Kit 表单

### 品牌组件
- `components/SirayBanner.tsx` - Siray 品牌横幅组件（捐赠弹窗、社交链接）
- `components/OpenDevSocietyBranding.tsx` - Open Dev Society 品牌组件

## 测试策略

当前项目主要包含：
- **环境变量检查脚本** (`scripts/check-env.mjs`) - 验证必需的环境配置
- **数据库连接测试脚本** (`scripts/test-db.mjs`) - 测试 MongoDB 连接
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
- 使用 `sonner` 作为 toast 通知库

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
1. **认证系统**：使用 Better Auth 1.3.25 + MongoDB adapter，支持邮箱密码登录，集成 Better Auth Kit
2. **数据获取**：Finnhub API 用于股票搜索、新闻获取；TradingView 用于图表展示
3. **状态管理**：主要依赖 React Server Components 和 Client Components
4. **邮件服务**：通过 Nodemailer 和 Gmail SMTP 发送邮件
5. **自动化**：Inngest 处理用户注册后的欢迎邮件和每日新闻摘要
6. **分析集成**：Vercel Analytics 用于用户行为分析
7. **提醒系统**：用户可设置价格阈值提醒，支持多种触发条件

### 开发注意事项
- 所有 API 密钥应通过环境变量管理
- MongoDB 连接使用缓存模式优化性能
- TradingView 组件需要允许 `i.ibb.co` 域名的图片
- TradingView 集成支持 A 股（如 600519.SS）和港股（如 0005.HK）代码格式自动转换
- 生产部署时确保正确的环境变量配置
- 使用 Turbopack 进行快速开发和构建
- Better Auth Kit 迁移需要运行 `scripts/migrate-users-to-kit.mjs`

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
      - run: npm run test:db
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
   - Vercel Analytics（已集成）
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
   - Better Auth Kit 集成提供额外的安全层

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

## 相关文档

- [API 文档](/api-docs) - 完整的 API 参考
- [API_DOCS.md](./API_DOCS.md) - API 文档 Markdown 版本
- [README.md](/README.md) - 项目主文档
- [scripts/CLAUDE.md](./scripts/CLAUDE.md) - 脚本工具详细文档
- [app/CLAUDE.md](./app/CLAUDE.md) - 应用模块文档
- [components/CLAUDE.md](./components/CLAUDE.md) - 组件库文档
- [database/CLAUDE.md](./database/CLAUDE.md) - 数据库文档
