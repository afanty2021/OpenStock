'use client';

import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  className?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

/**
 * 错误边界组件，用于捕获客户端错误
 * 防止错误级联并提供用户友好的错误消息
 */
export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // 在生产环境中将错误记录到监控服务
    if (process.env.NODE_ENV === 'production') {
      console.error('ErrorBoundary caught:', error, errorInfo);
    }
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className={`bg-red-900/20 border border-red-800 rounded-lg p-4 ${this.props.className || ''}`}>
            <div className="flex items-center space-x-2">
              <svg
                className="w-5 h-5 text-red-500 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <div>
                <p className="text-red-400 font-medium">数据加载失败</p>
                {this.state.error && process.env.NODE_ENV === 'development' && (
                  <p className="text-red-300/70 text-sm mt-1">{this.state.error.message}</p>
                )}
              </div>
            </div>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
