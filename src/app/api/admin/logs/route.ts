import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { requireAdmin } from '@/lib/accessControl';

export async function GET(request: Request) {
  const { isAdmin, errorResponse } = await requireAdmin(request);
  if (!isAdmin) return NextResponse.json({ error: errorResponse.error }, { status: errorResponse.status });

  const logs = db.prepare('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 100').all();
  return NextResponse.json({ logs });
}
