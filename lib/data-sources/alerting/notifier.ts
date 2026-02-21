/**
 * 告警通知服务
 *
 * 集成邮件和 Toast 通知
 * @module data-sources/alerting/notifier
 */

import { transporter } from '../../nodemailer';
import type { Alert, AlertLevel, EmailParams, ToastParams } from './types';
import { logger } from '../logger';

/**
 * Toast 通知存储（用于 Server Action 轮询获取）
 */
class ToastNotificationStore {
  private toasts: Array<ToastParams & { id: string; createdAt: number }> = [];
  private readonly maxAge = 5 * 60 * 1000; // 5分钟

  add(toast: ToastParams): string {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    this.toasts.push({
      ...toast,
      id,
      createdAt: Date.now(),
    });
    return id;
  }

  getAll(): Array<ToastParams & { id: string; createdAt: number }> {
    this.cleanup();
    return [...this.toasts];
  }

  consume(id: string): boolean {
    const index = this.toasts.findIndex(t => t.id === id);
    if (index >= 0) {
      this.toasts.splice(index, 1);
      return true;
    }
    return false;
  }

  private cleanup(): void {
    const now = Date.now();
    this.toasts = this.toasts.filter(t => now - t.createdAt < this.maxAge);
  }

  clear(): void {
    this.toasts = [];
  }
}

export const toastStore = new ToastNotificationStore();

/**
 * 邮件模板
 */
const ALERT_EMAIL_TEMPLATE = (alert: Alert): string => `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
    .alert-critical { background: #ef4444; }
    .alert-warning { background: #f59e0b; }
    .alert-info { background: #3b82f6; }
    .metrics { background: white; padding: 15px; border-radius: 4px; margin-top: 15px; }
    .metrics table { width: 100%; border-collapse: collapse; }
    .metrics td { padding: 8px; border-bottom: 1px solid #eee; }
    .footer { margin-top: 20px; text-align: center; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header alert-${alert.level}">
      <h1>${alert.title}</h1>
      <p>${alert.source}</p>
    </div>
    <div class="content">
      <p><strong>告警级别:</strong> ${alert.level.toUpperCase()}</p>
      <p><strong>告警消息:</strong> ${alert.message}</p>
      <p><strong>触发时间:</strong> ${new Date(alert.createdAt).toLocaleString('zh-CN')}</p>

      <div class="metrics">
        <h3>📊 当前指标</h3>
        <table>
          <tr><td>成功率</td><td>${(alert.metrics.successRate * 100).toFixed(1)}%</td></tr>
          <tr><td>平均响应时间</td><td>${alert.metrics.avgResponseTime.toFixed(0)}ms</td></tr>
          <tr><td>错误计数</td><td>${alert.metrics.errorCount}</td></tr>
          <tr><td>速率限制触发</td><td>${alert.metrics.rateLimitHits} 次</td></tr>
          <tr><td>总请求数</td><td>${alert.metrics.totalRequests}</td></tr>
        </table>
      </div>

      <p style="margin-top: 20px;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/admin/monitoring"
           style="display: inline-block; padding: 10px 20px; background: #667eea; color: white; text-decoration: none; border-radius: 4px;">
           查看监控仪表板
        </a>
      </p>
    </div>
    <div class="footer">
      <p>OpenStock 数据源监控系统 | 自动发送，请勿回复</p>
    </div>
  </div>
</body>
</html>`;

/**
 * 告警通知服务
 */
export class AlertNotifier {
  private adminEmail: string;

  constructor() {
    // 从环境变量读取管理员邮箱
    this.adminEmail = process.env.ADMIN_EMAIL || process.env.NODEMAILER_EMAIL || 'admin@example.com';
  }

  /**
   * 发送告警（根据配置的渠道）
   */
  async sendAlert(alert: Alert): Promise<void> {
    const promises: Promise<void>[] = [];

    // 邮件通知
    if (alert.channels.includes('email')) {
      promises.push(this.sendEmailAlert(alert));
    }

    // Toast 通知
    if (alert.channels.includes('toast')) {
      promises.push(this.showToastAlert(alert));
    }

    // 并行发送，但不因为失败而中断
    const results = await Promise.allSettled(promises);

    // 更新通知状态
    if (alert.channels.includes('email')) {
      alert.notified.email = results[0].status === 'fulfilled';
    }
    if (alert.channels.includes('toast')) {
      const toastResult = alert.channels.includes('email') ? results[1] : results[0];
      alert.notified.toast = toastResult.status === 'fulfilled';
    }

    // 记录失败的通知
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        logger.error(`通知发送失败 [${alert.channels[index]}]:`, result.reason);
      }
    });
  }

  /**
   * 发送邮件告警
   */
  async sendEmailAlert(alert: Alert): Promise<void> {
    try {
      if (!process.env.NODEMAILER_EMAIL || !process.env.NODEMAILER_PASSWORD) {
        throw new Error('Email credentials not configured');
      }

      const mailOptions = {
        from: `"OpenStock Monitor" <${process.env.NODEMAILER_EMAIL}>`,
        to: this.adminEmail,
        subject: `[${alert.level.toUpperCase()}] ${alert.title} - ${alert.source}`,
        html: ALERT_EMAIL_TEMPLATE(alert),
      };

      const info = await transporter.sendMail(mailOptions);
      logger.info(`✅ 告警邮件已发送: ${alert.id} -> ${info.messageId}`);
    } catch (error) {
      logger.error(`❌ 邮件发送失败: ${alert.id}`, error);
      throw error;
    }
  }

  /**
   * 发送 Toast 告警（存储到 store，供前端轮询）
   */
  async showToastAlert(alert: Alert): Promise<void> {
    try {
      const toast: ToastParams = {
        message: alert.message,
        level: alert.level,
        duration: this.getToastDuration(alert.level),
      };

      const id = toastStore.add(toast);
      logger.info(`✅ Toast 已添加: ${id} - ${toast.message}`);
    } catch (error) {
      logger.error(`❌ Toast 添加失败: ${alert.id}`, error);
      throw error;
    }
  }

  /**
   * 获取 Toast 持续时间
   */
  private getToastDuration(level: AlertLevel): number {
    switch (level) {
      case 'critical':
        return 10000; // 10秒
      case 'warning':
        return 5000; // 5秒
      case 'info':
        return 3000; // 3秒
    }
  }

  /**
   * 发送自定义邮件
   */
  async sendEmail(params: EmailParams): Promise<void> {
    try {
      if (!process.env.NODEMAILER_EMAIL || !process.env.NODEMAILER_PASSWORD) {
        throw new Error('Email credentials not configured');
      }

      const mailOptions = {
        from: `"OpenStock" <${process.env.NODEMAILER_EMAIL}>`,
        to: params.to,
        subject: params.subject,
        html: params.html,
        text: params.text,
      };

      await transporter.sendMail(mailOptions);
      logger.info(`✅ 邮件已发送: ${params.subject}`);
    } catch (error) {
      logger.error(`❌ 邮件发送失败: ${params.subject}`, error);
      throw error;
    }
  }

  /**
   * 添加 Toast 通知（供外部调用）
   */
  showToast(params: ToastParams): string {
    return toastStore.add(params);
  }

  /**
   * 获取所有待显示的 Toast
   */
  getToasts(): Array<ToastParams & { id: string; createdAt: number }> {
    return toastStore.getAll();
  }

  /**
   * 消费 Toast（标记为已显示）
   */
  consumeToast(id: string): boolean {
    return toastStore.consume(id);
  }

  /**
   * 更新管理员邮箱
   */
  setAdminEmail(email: string): void {
    this.adminEmail = email;
    logger.info(`管理员邮箱已更新: ${email}`);
  }

  /**
   * 获取当前管理员邮箱
   */
  getAdminEmail(): string {
    return this.adminEmail;
  }
}

// 导出默认实例
export const alertNotifier = new AlertNotifier();

/**
 * Server Action: 获取待显示的 Toast 通知
 * 供前端轮询调用
 */
export async function getPendingToasts() {
  'use server';
  return toastStore.getAll();
}

/**
 * Server Action: 消费 Toast 通知
 */
export async function consumeToast(id: string) {
  'use server';
  return toastStore.consume(id);
}
