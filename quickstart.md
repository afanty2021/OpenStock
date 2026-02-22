# OpenStock 环境搭建快速指南

## 依赖项

### 核心依赖

| 类别 | 依赖项 | 版本 | 说明 |
|------|--------|------|------|
| **框架** | `next` | 15.5.7 | Next.js 15 App Router |
| | `react` | 19.1.0 | React 19 |
| | `react-dom` | 19.1.0 | React DOM |
| **UI** | `tailwindcss` | ^4 | Tailwind CSS v4 |
| | `@radix-ui/*` | 多种 | Radix UI 原始组件（dialog, popover, select 等） |
| | `lucide-react` | ^0.544.0 | 图标库 |
| | `sonner` | ^2.0.7 | Toast 通知 |
| | `class-variance-authority` | ^0.7.1 | CVA 变体工具 |
| | `clsx` / `tailwind-merge` | - | 类名合并工具 |
| **数据库** | `mongoose` | ^8.19.0 | MongoDB ODM |
| | `mongodb` | ^6.20.0 | MongoDB 驱动 |
| **认证** | `better-auth` | ^1.3.25 | 认证系统 |
| **数据获取** | `inngest` | ^3.47.0 | 事件/定时任务 |
| | `nodemailer` | ^7.0.6 | 邮件服务 |
| **分析** | `@vercel/analytics` | ^1.6.1 | Vercel 分析 |
| **表单** | `react-hook-form` | ^7.63.0 | 表单管理 |
| **工具** | `date-fns` | ^4.1.0 | 日期处理 |
| | `dotenv` | ^17.2.3 | 环境变量 |

### 开发依赖

| 依赖项 | 版本 | 说明 |
|--------|------|------|
| `typescript` | ^5 | TypeScript |
| `eslint` / `eslint-config-next` | ^9 / 15.5.4 | 代码检查 |
| `@tailwindcss/postcss` | ^4 | Tailwind PostCSS |
| `@types/node` | ^20 | Node.js 类型 |
| `@types/react` / `@types/react-dom` | ^19 | React 类型 |
| `@types/nodemailer` | ^7.0.2 | Nodemailer 类型 |
| `tw-animate-css` | ^1.4.0 | 动画库 |

---

## 运行环境搭建

### 1. 环境要求
- **Node.js**: 20+
- **MongoDB**: 本地或 Atlas 云端
- **Finnhub API Key**: 股票数据（免费注册获取）

### 2. 环境变量配置

在项目根目录创建 `.env` 文件：

```env
# 核心配置
NODE_ENV=development

# 数据库
MONGODB_URI=mongodb+srv://<user>:<pass>@<cluster>/<db>?retryWrites=true&w=majority

# Better Auth
BETTER_AUTH_SECRET=your_better_auth_secret_min_32_chars
BETTER_AUTH_URL=http://localhost:3000

# Finnhub API（必需）
NEXT_PUBLIC_FINNHUB_API_KEY=your_finnhub_api_key
FINNHUB_BASE_URL=https://finnhub.io/api/v1

# Gmail 邮件服务
NODEMAILER_EMAIL=youraddress@gmail.com
NODEMAILER_PASSWORD=your_gmail_app_password

# 可选：AI 功能
MINIMAX_API_KEY=your_minimax_api_key

# 可选：Inngest（Vercel 部署需要）
INNGEST_SIGNING_KEY=your_inngest_signing_key
```

### 3. 安装与启动

```bash
# 安装依赖
npm install

# 验证环境变量
npm run check-env

# 测试数据库连接
npm run test:db

# 启动开发服务器（使用 Turbopack）
npm run dev

# 另一个终端启动 Inngest（本地开发需要）
npx inngest-cli@latest dev
```

### 4. Docker 部署（可选）

```bash
# 启动 MongoDB
docker compose up -d mongodb

# 构建并启动应用
docker compose up -d --build
```

---

## 技术亮点

1. **Radix UI + Tailwind v4** 组合提供无样式原始组件，配合 CVA 实现类型安全的变体系统
2. **Better Auth** 作为全栈认证方案，相比 NextAuth 有更好的类型推断和插件生态
3. **Inngest** 处理后台任务（邮件、定时任务），避免自行搭建队列系统
