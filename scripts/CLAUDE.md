[根目录](../../CLAUDE.md) > **scripts**

# Scripts 模块

## 模块职责

开发和部署相关的脚本工具，用于数据库测试、构建辅助和自动化任务。

## 目录结构

```
scripts/
├── check-env.mjs   # 环境变量检查工具
├── test-db.mjs     # 数据库连接测试 (ES模块)
└── test-db.ts      # 数据库连接测试 (TS版本)
```

## 脚本详情

### check-env.mjs

**用途**: 验证项目运行所需的环境变量是否完整配置

**使用方式**:
```bash
node scripts/check-env.mjs
```

**功能特性**:
- ✅ 检查所有必需的环境变量
- ⚠️ 提示可选/已弃用的变量
- 🔒 敏感值掩码显示（保护密钥安全）
- 📊 生成详细的检查报告
- 🚫 配置不完整时退出并返回错误码

**必需环境变量**:
```javascript
// 核心配置
NODE_ENV                    // 运行环境 (development/production)

// 数据库
MONGODB_URI                 // MongoDB 连接字符串

// Better Auth
BETTER_AUTH_SECRET          // 认证密钥
BETTER_AUTH_URL             // 认证服务 URL

// Finnhub API
NEXT_PUBLIC_FINNHUB_API_KEY // Finnhub 公开 API 密钥
FINNHUB_BASE_URL            // Finnhub API 基础 URL

// Inngest 自动化
GEMINI_API_KEY              // Google Gemini AI 密钥
INNGEST_SIGNING_KEY         // Inngest 签名密钥 (Vercel 部署)

// 邮件服务
NODEMAILER_EMAIL            // Gmail 发件地址
NODEMAILER_PASSWORD         // Gmail 应用密码
```

**输出示例**:
```
🔍 Checking Environment Variables...
============================================================

✅ Present Variables:
------------------------------------------------------------
  ✓ NODE_ENV
    development or production
    Value: deve***

  ✓ MONGODB_URI
    MongoDB connection string
    Value: mong***

❌ Missing Variables:
------------------------------------------------------------
  ✗ BETTER_AUTH_SECRET
    Secret key for Better Auth

============================================================
Summary: 7/9 required variables present

⚠️  Missing 2 required variable(s).
```

**使用场景**:
- 🆕 新项目初始化时验证配置
- 🚀 部署前环境检查
- 🐛 调试配置问题
- 📝 CI/CD 流程中的验证步骤

### test-db.mjs/test-db.ts

**用途**: 测试 MongoDB 数据库连接是否正常

**功能**:
- 验证 `MONGODB_URI` 环境变量
- 尝试建立数据库连接
- 执行简单的 ping 命令
- 输出连接结果

**使用方式**:
```bash
npm run test:db
```

**实现逻辑**:
1. 读取环境变量
2. 使用 Mongoose 连接数据库
3. 执行 `adminCommand('ping')` 测试连接
4. 输出成功/失败信息

## package.json 配置

```json
{
  "scripts": {
    "check-env": "node scripts/check-env.mjs",
    "test:db": "node scripts/test-db.mjs"
  }
}
```

**建议使用顺序**:
```bash
# 1. 首先检查环境变量配置
npm run check-env

# 2. 环境变量通过后，测试数据库连接
npm run test:db

# 3. 最后启动开发服务器
npm run dev
```

## 开发建议

### 添加新脚本

1. **数据迁移脚本** (`migrate.ts`)
   - 数据库 schema 更新
   - 数据格式转换
   - 批量数据操作

2. **种子数据脚本** (`seed.ts`)
   - 初始化测试数据
   - 热门股票数据
   - 示例用户数据

3. **备份脚本** (`backup.ts`)
   - 数据库备份
   - 文件备份
   - 增量备份

4. **清理脚本** (`cleanup.ts`)
   - 清理过期数据
   - 清理日志文件
   - 清理缓存

5. **部署脚本** (`deploy.sh`)
   - 构建检查
   - 环境验证
   - 自动化部署

### 最佳实践

1. **错误处理**
   - 完善的错误捕获
   - 优雅的退出
   - 详细的错误信息

2. **日志记录**
   - 使用标准日志格式
   - 包含时间戳
   - 区分日志级别

3. **环境检查**
   - 验证必需的环境变量
   - 检查依赖服务状态
   - 确认权限设置

4. **参数化**
   - 支持命令行参数
   - 配置文件支持
   - 默认值设置

## 示例：数据迁移脚本模板

```typescript
#!/usr/bin/env tsx

import mongoose from 'mongoose';
import { connectToDatabase } from '../database/mongoose';

async function migrate() {
  try {
    console.log('Starting migration...');

    // 连接数据库
    await connectToDatabase();

    // 迁移逻辑
    // ...

    console.log('Migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
```

## 工具建议

- **tsx**: TypeScript 执行器
- **dotenv**: 环境变量管理
- **commander.js**: 命令行参数解析
- **ora**: 加载动画
- **chalk**: 终端颜色输出