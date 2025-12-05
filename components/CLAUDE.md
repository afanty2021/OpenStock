[根目录](../../CLAUDE.md) > **components**

# Components 模块

## 模块职责

React UI 组件库，包含可复用的基础 UI 组件和业务特定组件。基于 shadcn/ui 设计系统和 Tailwind CSS v4 构建。

## 目录结构

```
components/
├── ui/                     # shadcn/ui 基础组件
│   ├── avatar.tsx         # 用户头像
│   ├── button.tsx         # 按钮组件
│   ├── command.tsx        # 命令面板（cmdk）
│   ├── dialog.tsx         # 对话框
│   ├── dropdown-menu.tsx  # 下拉菜单
│   ├── input.tsx          # 输入框
│   ├── label.tsx          # 标签
│   ├── popover.tsx        # 弹出层
│   ├── select.tsx         # 选择器
│   └── sonner.tsx         # Toast 通知
├── forms/                  # 表单组件
│   ├── CountrySelectField.tsx  # 国家选择器
│   ├── FooterLink.tsx          # 页脚链接
│   ├── InputField.tsx          # 输入字段
│   └── SelectField.tsx         # 选择字段
├── Header.tsx             # 页头导航
├── Footer.tsx             # 页脚
├── NavItems.tsx           # 导航项
├── OpenDevSocietyBranding.tsx  # 品牌标识
├── SearchCommand.tsx      # 搜索命令面板
├── TradingViewWidget.tsx  # TradingView 图表组件
├── UserDropdown.tsx       # 用户下拉菜单
└── WatchlistButton.tsx    # 收藏夹按钮
```

## 基础 UI 组件 (ui/)

基于 Radix UI primitives 构建，提供：
- **可访问性**: 符合 WAI-ARIA 标准
- **键盘导航**: 完整的键盘支持
- **主题支持**: 深色/浅色模式
- **类型安全**: 完整的 TypeScript 类型

### 使用示例
```tsx
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";

<Button variant="default">Click me</Button>
<Dialog open={isOpen} onOpenChange={setOpen}>
  {/* Content */}
</Dialog>
```

## 表单组件 (forms/)

封装的表单控件，集成 react-hook-form：
- **InputField**: 带验证的输入框
- **SelectField**: 下拉选择器
- **CountrySelectField**: 国家选择器（带国旗图标）
- **FooterLink**: 底部链接组件

## 业务组件

### SearchCommand
- **功能**: 全局搜索和快速操作面板
- **快捷键**: Cmd/Ctrl + K
- **特性**:
  - 防抖搜索
  - 热门股票展示
  - 搜索结果高亮

### TradingViewWidget
- **用途**: 嵌入 TradingView 图表组件
- **支持的图表类型**:
  - 市场概览
  - 股票热力图
  - K线图
  - 技术分析图
  - 公司资料

### WatchlistButton
- **功能**: 添加/移除股票到收藏夹
- **状态**: 实时同步收藏状态
- **样式**: 支持按钮和图标两种模式

### UserDropdown
- **内容**: 用户信息、登出等操作
- **位置**: 页头右侧
- **交互**: 点击展开下拉菜单

## 设计系统

### 颜色主题
- 主色调：深色模式 (`dark`)
- 强调色：`#0FEDBE`（绿色上涨，红色下跌）
- 背景色：`#141414`（深灰）

### 间距系统
使用 Tailwind CSS 默认间距：
- 4px 基础单位
- 响应式间距调整

### 字体系统
- Sans: Geist Sans
- Mono: Geist Mono
- 权重：400 (regular), 500 (medium), 700 (bold)

## 开发指南

### 创建新组件
1. 确定组件类型：基础 UI 或业务组件
2. 使用 TypeScript 定义 Props 接口
3. 遵循现有的命名约定
4. 添加适当的文档注释

### 样式原则
- 优先使用 Tailwind 类名
- 避免内联样式
- 使用组件变量进行主题定制
- 保持一致的视觉层次

### 性能考虑
- 使用 React.memo 优化重渲染
- 懒加载大型组件
- 合理使用 useCallback 和 useMemo

## 测试建议

- 单元测试：测试组件渲染和交互
- 快照测试：确保 UI 一致性
- 可访问性测试：使用 axe-core 进行 a11y 检查