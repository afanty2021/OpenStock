[根目录](../../CLAUDE.md) > **middleware**

# Middleware 模块

## 模块职责

Next.js 中间件，处理请求拦截和路由保护，确保只有已认证用户才能访问受保护的路由。

## 文件结构

```
middleware/
└── index.ts    # 主中间件文件
```

## 功能实现

### 路由保护机制

```typescript
export async function middleware(request: NextRequest) {
    const sessionCookie = getSessionCookie(request);

    if (!sessionCookie) {
        return NextResponse.redirect(new URL('/sign-in', request.url));
    }

    return NextResponse.next();
}
```

### 路由匹配规则

```typescript
export const config = {
    matcher: [
        '/((?!api|_next/static|_next/image|favicon.ico|sign-in|sign-up|assets).*)',
    ],
};
```

**公开路由**（不需要认证）:
- `/api/*` - API 路由
- `/_next/*` - Next.js 内部资源
- `/favicon.ico` - 网站图标
- `/sign-in` - 登录页面
- `/sign-up` - 注册页面
- `/assets/*` - 静态资源

**受保护路由**（需要认证）:
- `/` - 仪表板
- `/stocks/*` - 股票相关页面
- `/search` - 搜索页面
- 其他所有未列出的路由

## 认证流程

1. 用户访问受保护路由
2. 中间件检查 session cookie
3. 如果无 cookie，重定向到登录页
4. 登录成功后，自动跳转回原始请求的页面

## 技术实现

### Better Auth 集成
- 使用 `getSessionCookie` 从 Better Auth 获取会话
- Cookie-based 认证机制
- 无服务器端状态存储

### 性能考虑
- 中间件在 Edge Runtime 运行
- 最小化执行逻辑
- 避免数据库查询

## 扩展建议

1. **角色权限控制**
   ```typescript
   // 检查用户角色
   const userRole = getUserRole(session);
   if (requiredRole && userRole !== requiredRole) {
       return NextResponse.redirect('/unauthorized');
   }
   ```

2. **地理位置限制**
   ```typescript
   // 基于地理位置的访问控制
   const country = request.geo?.country;
   if (!ALLOWED_COUNTRIES.includes(country)) {
       return NextResponse.redirect('/blocked');
   }
   ```

3. **请求日志**
   ```typescript
   // 记录访问日志
   console.log(`${request.method} ${request.url} - ${new Date().toISOString()}`);
   ```

4. **速率限制**
   ```typescript
   // 简单的速率限制
   const ip = request.ip;
   const requests = await getRequestsCount(ip);
   if (requests > RATE_LIMIT) {
       return new Response('Too Many Requests', { status: 429 });
   }
   ```

## 注意事项

1. 中间件不能使用 Node.js 特定的 API
2. 避免在中间件中执行重量级操作
3. matcher 规则按顺序匹配
4. 重定向会保留原始查询参数