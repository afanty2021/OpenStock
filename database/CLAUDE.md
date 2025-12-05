[根目录](../../CLAUDE.md) > **database**

# Database 模块

## 模块职责

数据库连接和模型定义，使用 MongoDB 作为主数据库，Mongoose 作为 ODM。负责数据持久化、连接池管理和数据模型定义。

## 目录结构

```
database/
├── mongoose.ts            # MongoDB 连接管理
├── models/                # Mongoose 模型定义
│   └── watchlist.model.ts # 收藏夹模型
└── (future models)        # 未来扩展模型
```

## 数据库连接

### mongoose.ts
实现 MongoDB 连接池管理：
- **连接缓存**: 使用全局变量缓存连接实例
- **错误处理**: 连接失败时清理缓存并重试
- **环境配置**: 从 `MONGODB_URI` 环境变量读取连接字符串
- **日志输出**: 连接成功后输出连接信息和环境

```typescript
// 连接配置示例
{
  bufferCommands: false,  // 禁用缓冲命令
}
```

## 数据模型

### Watchlist 模型
用户股票收藏夹数据模型：

```typescript
interface WatchlistItem extends Document {
    userId: string;        // 用户唯一标识
    symbol: string;        // 股票代码（大写）
    company: string;       // 公司名称
    addedAt: Date;         // 添加时间
}
```

#### 模型特性
- **唯一约束**: 每个用户不能重复添加同一股票
- **索引优化**:
  - `userId` 单字段索引
  - `{ userId: 1, symbol: 1 }` 复合唯一索引
- **时间戳**: 禁用 Mongoose 默认时间戳，使用自定义 `addedAt`

## Better Auth 集成

数据库同时服务于 Better Auth 认证系统：
- 使用 MongoDB adapter 存储用户和会话数据
- 集合命名：`users`, `sessions`, `accounts`, `verifications`
- 自动创建必要的索引

## 性能优化

### 连接池
- 复用连接实例，避免频繁创建
- 生产环境建议配置连接池参数

### 索引策略
- 查询字段建立索引
- 复合索引优化常用查询组合

### 查询优化
- 使用 `lean()` 进行只读查询
- 限制返回字段（`select`）
- 分页查询大数据集

## 开发环境

### Docker 配置
```yaml
services:
  mongodb:
    image: mongo:7
    environment:
      MONGO_INITDB_ROOT_USERNAME: root
      MONGO_INITDB_ROOT_PASSWORD: example
    ports:
      - "27017:27017"
    volumes:
      - mongo-data:/data/db
```

### 连接字符串
- 本地 Docker: `mongodb://root:example@mongodb:27017/openstock?authSource=admin`
- MongoDB Atlas: `mongodb+srv://<user>:<pass>@<cluster>/<db>?retryWrites=true&w=majority`

## 数据迁移

当前版本没有实现数据迁移系统。建议：
1. 使用 Mongoose 的 `schema.pre('save')` 钩子进行数据转换
2. 编写迁移脚本处理现有数据
3. 版本控制数据库 schema 变更

## 备份策略

### 本地开发
- 使用 Docker volume 持久化数据
- 定期导出重要数据

### 生产环境
- MongoDB Atlas 自动备份
- 定期备份到云存储
- 实现数据导出功能

## 扩展建议

### 新增模型
1. **用户设置模型**
   ```typescript
   interface UserSettings {
       userId: string;
       theme: 'dark' | 'light';
       notifications: boolean;
       defaultChartType: string;
   }
   ```

2. **股票提醒模型**
   ```typescript
   interface StockAlert {
       userId: string;
       symbol: string;
       alertType: 'upper' | 'lower';
       threshold: number;
       isActive: boolean;
   }
   ```

3. **新闻缓存模型**
   ```typescript
   interface NewsCache {
       symbols: string[];
       articles: MarketNewsArticle[];
       cachedAt: Date;
       expiresAt: Date;
   }
   ```

### 性能改进
- 实现 Redis 缓存层
- 使用 MongoDB Change Streams 实现实时更新
- 优化大数据量查询

## 安全考虑

- 敏感数据加密存储
- 实施访问控制
- 定期更新数据库驱动
- 使用 prepared statements 防止注入