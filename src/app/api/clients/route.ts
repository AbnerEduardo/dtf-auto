import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { requireAdmin } from '@/lib/accessControl';

export async function GET(request: Request) {
  const { isAdmin, errorResponse } = await requireAdmin(request);
  if (!isAdmin) {
    return NextResponse.json({ error: errorResponse.error }, { status: errorResponse.status });
  }

  try {
    const clients = db.prepare(`
      SELECT u.id, u.name, u.email, u.company, u.created_at,
             s.status as subscription_status, s.plan_name, s.price_monthly,
             (SELECT COUNT(*) FROM skus WHERE user_id = u.id) as total_skus,
             (SELECT COUNT(*) FROM order_batches WHERE user_id = u.id) as total_batches
      FROM users u
      LEFT JOIN subscriptions s ON s.user_id = u.id
      ORDER BY u.created_at DESC
    `).all();

    return NextResponse.json({ success: true, clients });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
