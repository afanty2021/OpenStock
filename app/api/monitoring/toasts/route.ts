/**
 * Toast 通知 API
 *
 * GET /api/monitoring/toasts - 获取待显示的 Toast
 * POST /api/monitoring/toasts/consume - 消费 Toast（标记已显示）
 */

import { NextRequest, NextResponse } from 'next/server';
import { toastStore } from '@/lib/data-sources/alerting/notifier';

/**
 * 获取待显示的 Toast
 */
export async function GET(request: NextRequest) {
  try {
    const toasts = toastStore.getAll();

    return NextResponse.json({
      toasts,
      count: toasts.length,
    });
  } catch (error) {
    console.error('Get toasts error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * 消费 Toast
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Missing toast id' },
        { status: 400 }
      );
    }

    const consumed = toastStore.consume(id);

    return NextResponse.json({
      consumed,
      id,
    });
  } catch (error) {
    console.error('Consume toast error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}