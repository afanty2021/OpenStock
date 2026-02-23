/**
 * Vitest 测试设置文件
 *
 * 配置 React Testing Library 和全局测试环境
 */

import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

// 扩展 Vitest 的 expect 断言
expect.extend(matchers);

// 每个测试后清理 DOM
afterEach(() => {
  cleanup();
});
