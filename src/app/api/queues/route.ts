import { NextResponse } from 'next/server';
import db, { getCurrentUserId } from '@/lib/db';

export async function GET(request: Request) {
  const userId = getCurrentUserId(request);
  const queues = db.prepare('SELECT * FROM print_queues WHERE user_id = ? ORDER BY created_at DESC').all(userId);
  return NextResponse.json({ queues });
}
