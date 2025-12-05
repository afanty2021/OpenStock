[根目录](../../CLAUDE.md) > **lib**

# Lib 模块

## 模块职责

核心业务逻辑和工具函数库，包含认证、数据获取、邮件服务、自动化任务等核心功能实现。

## 目录结构

```
lib/
├── actions/                # Server Actions
│   ├── auth.actions.ts    # 认证相关操作
│   ├── finnhub.actions.ts # Finnhub API 集成
│   ├── user.actions.ts    # 用户数据操作
│   └── watchlist.actions.ts # 收藏夹操作
├── better-auth/            # Better Auth 配置
│   └── auth.ts           # 认证实例和配置
├── inngest/               # Inngest 自动化
│   ├── client.ts         # Inngest 客户端
│   ├── functions.ts      # 工作流定义
│   └── prompts.ts        # AI 提示词模板
├── nodemailer/            # 邮件服务
│   ├── index.ts          # 邮件发送器配置
│   └── templates.ts      # 邮件模板
├── constants.ts          # 应用常量
└── utils.ts              # 工具函数
```

## 认证系统 (better-auth/)

### auth.ts
配置 Better Auth 实例：
- **适配器**: MongoDB adapter
- **认证方式**: 邮箱密码登录
- **配置项**:
  - 最小密码长度: 8
  - 最大密码长度: 128
  - 自动登录: 启用
  - 邮箱验证: 非必需（简化流程）

## Server Actions (actions/)

### auth.actions.ts
认证相关的服务器操作：
- `signUpWithEmail`: 用户注册，触发欢迎邮件
- `signInWithEmail`: 用户登录
- `signOut`: 用户登出

### finnhub.actions.ts
Finnhub API 集成：
- `searchStocks`: 股票搜索（带缓存）
- `getNews`: 获取市场新闻
- **缓存策略**:
  - 搜索结果: 30分钟
  - 公司资料: 1小时
  - 新闻: 5分钟

### watchlist.actions.ts
收藏夹 CRUD 操作：
- 添加/移除股票
- 获取用户收藏列表
- 检查股票是否已收藏

### user.actions.ts
用户数据管理：
- 获取用户信息
- 更新用户设置
- 获取邮件订阅用户列表

## 自动化系统 (inngest/)

### client.ts
Inngest 客户端配置，连接到 Inngest 服务。

### functions.ts
定义自动化工作流：

1. **用户欢迎邮件** (`sendSignUpEmail`)
   - 触发事件: `app/user.created`
   - 使用 Gemini AI 生成个性化欢迎语
   - 发送 HTML 格式邮件

2. **每日新闻摘要** (`sendDailyNewsSummary`)
   - 定时触发: 每日 12:00 (UTC)
   - 获取用户收藏列表
   - 获取相关新闻
   - AI 生成新闻摘要
   - 发送个性化邮件

### prompts.ts
AI 提示词模板：
- 欢迎邮件生成模板
- 新闻摘要生成模板

## 邮件服务 (nodemailer/)

### index.ts
Gmail SMTP 配置：
- 使用 Nodemailer 传输
- 支持 App Password 认证
- HTML 邮件发送

### templates.ts
邮件模板定义：
- 欢迎邮件模板
- 新闻摘要邮件模板
- 使用 Tailwind CSS 内联样式

## 应用常量 (constants.ts)

### 导航配置
```typescript
export const NAV_ITEMS = [
    { href: '/', label: 'Dashboard' },
    { href: '/search', label: 'Search' },
];
```

### 表单选项
- 投资目标: Growth, Income, Balanced, Conservative
- 风险承受能力: Low, Medium, High
- 偏好行业: Technology, Healthcare, Finance 等

### TradingView 配置
- 市场概览小部件配置
- 热力图配置
- K线图配置
- 技术分析配置

### 热门股票列表
包含 50+ 流行股票代码，分类为：
- 科技巨头
- 成长型科技公司
- 新兴科技公司
- 消费与配送应用
- 国际公司

## 工具函数 (utils.ts)

常用工具函数：
- 日期格式化
- 字符串处理
- 数据验证
- 文章格式化
- 防抖函数实现

## 环境变量依赖

```env
# Better Auth
BETTER_AUTH_SECRET=your_secret
BETTER_AUTH_URL=http://localhost:3000

# Finnhub API
FINNHUB_API_KEY=your_key
NEXT_PUBLIC_FINNHUB_API_KEY=public_key

# Gemini AI
GEMINI_API_KEY=your_gemini_key

# Email Service
NODEMAILER_EMAIL=your_email@gmail.com
NODEMAILER_PASSWORD=your_app_password

# Database
MONGODB_URI=your_mongodb_uri
```

## 错误处理

所有 actions 实施统一的错误处理：
- 捕获并记录错误
- 返回用户友好的错误消息
- 避免敏感信息泄露

## 性能优化

- React Cache 缓存搜索结果
- 数据库连接复用
- API 响应缓存
- 批量操作优化

## 扩展建议

1. **添加更多数据源**
   - Alpha Vantage 集成
   - Yahoo Finance 集成
   - 多数据源聚合

2. **增强 AI 功能**
   - 股票推荐
   - 市场分析报告
   - 投资建议生成

3. **缓存层**
   - Redis 集成
   - 智能缓存策略
   - 缓存失效机制

4. **API 限流**
   - 实现请求速率限制
   - 配额管理
   - 优先级队列