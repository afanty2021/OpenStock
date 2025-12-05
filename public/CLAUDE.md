[根目录](../../CLAUDE.md) > **public**

# Public 模块

## 模块职责

静态资源目录，存放所有可通过 URL 直接访问的资源文件，包括图片、图标、favicon 等静态资产。

## 目录结构

```
public/
├── assets/
│   ├── icons/          # 图标文件
│   │   ├── logo.svg    # 应用主 Logo
│   │   ├── odsLogo.svg # Open Dev Society Logo
│   │   └── star.svg    # 星星图标（收藏）
│   └── images/         # 图片资源
│       ├── dashboard.png  # 仪表板截图
│       └── logo.png      # Logo 图片版本
├── favicon.ico         # 网站图标
└── (next generated)    # Next.js 自动生成的文件
```

## 资源说明

### 图标文件 (icons/)

- **logo.svg**: OpenStock 品牌标志
  - SVG 格式，可缩放
  - 深色主题优化
  - 用于页头和品牌展示

- **odsLogo.svg**: Open Dev Society 标志
  - 展示开源社区归属
  - 用于页脚和关于页面

- **star.svg**: 星星图标
  - 收藏功能使用
  - 空心/实心两种状态

### 图片资源 (images/)

- **dashboard.png**: 应用仪表板截图
  - 展示主要功能
  - 用于 README 和着陆页
  - 1920x1080 分辨率

- **logo.png**: Logo 的 PNG 版本
  - 兼容性考虑
  - 用于不支持 SVG 的场景

### favicon.ico

- 浏览器标签页图标
- 16x16, 32x32, 48x48 多尺寸
- 自动从 assets/icons/logo.svg 生成

## 使用方式

### 在代码中引用

```typescript
// Next.js Image 组件
import Image from 'next/image';
<Image src="/assets/images/dashboard.png" alt="Dashboard" width={800} height={600} />

// 普通引用
<img src="/assets/icons/logo.svg" alt="OpenStock Logo" />

// CSS 中使用
background-image: url('/assets/images/dashboard.png');
```

### 优化建议

1. **图片优化**
   - 使用 Next.js Image 组件
   - 提供 WebP 格式
   - 实现懒加载

2. **图标管理**
   - 考虑使用 SVG Sprite
   - 统一图标尺寸规范
   - 添加主题变体

3. **资源压缩**
   - SVG 压缩优化
   - PNG 无损压缩
   - 移除元数据

## 扩展资源

### 建议添加

1. **Logo 变体**
   - 浅色主题版本
   - 反色版本
   - 单色版本

2. **示例图片**
   - 股票详情页截图
   - 移动端展示图
   - 功能演示 GIF

3. **文档图片**
   - API 文档插图
   - 架构图
   - 流程图

4. **社交媒体资源**
   - Open Graph 图片
   - Twitter Card 图片
   - 社交分享图标

### 文件命名规范

- 使用小写字母
- 用连字符分隔单词
- 包含尺寸信息（如 `logo-64x64.png`）
- 版本控制（如 `chart-v2.svg`）

## 性能考虑

1. **CDN 分发**
   - 生产环境使用 CDN
   - 实现资源缓存
   - 地理位置优化

2. **缓存策略**
   - 设置合适的 Cache-Control
   - 版本化更新资源
   - 浏览器缓存利用

3. **资源预加载**
   - 关键资源预加载
   - DNS 预解析
   - 预连接重要域名