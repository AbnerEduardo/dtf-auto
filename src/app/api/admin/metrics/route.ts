import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { requireAdmin } from '@/lib/accessControl';
import { PLAN_CONFIG } from '@/lib/config/pricing';

export async function GET(request: Request) {
  const { isAdmin, errorResponse } = await requireAdmin(request);
  if (!isAdmin) {
    return NextResponse.json({ error: errorResponse.error }, { status: errorResponse.status });
  }

  const totalUsers = (db.prepare('SELECT COUNT(*) as c FROM users').get() as any).c;
  const trialUsers = (db.prepare("SELECT COUNT(*) as c FROM subscriptions WHERE status = 'trialing' OR status = 'trial'").get() as any).c;
  const activeSubs = (db.prepare("SELECT COUNT(*) as c FROM subscriptions WHERE status = 'active'").get() as any).c;
  const overdueUsers = (db.prepare("SELECT COUNT(*) as c FROM subscriptions WHERE status = 'overdue'").get() as any).c;
  const canceledUsers = (db.prepare("SELECT COUNT(*) as c FROM subscriptions WHERE status = 'canceled'").get() as any).c;
  const blockedUsers = (db.prepare("SELECT COUNT(*) as c FROM users WHERE manual_access_override = 'blocked' OR status = 'blocked'").get() as any).c;

  // MRR Calculation
  const mrr = activeSubs * PLAN_CONFIG.monthly_price;

  // Usage Metrics
  const queuesStats = db.prepare('SELECT COUNT(*) as total_queues, COALESCE(SUM(roll_height_cm), 0) as total_cm, COALESCE(SUM(total_items), 0) as total_items FROM print_queues').get() as any;
  const totalMeters = (queuesStats.total_cm / 100).toFixed(2);
  const exportedFiles = queuesStats.total_queues;

  return NextResponse.json({
    metrics: {
      totalUsers,
      trialUsers,
      activeSubs,
      overdueUsers,
      canceledUsers,
      blockedUsers,
      mrr,
      totalMeters,
      exportedFiles,
      monthlyPrice: PLAN_CONFIG.monthly_price,
    },
  });
}
