import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { requireAdmin } from '@/lib/accessControl';
import { maskCPF } from '@/lib/auth';

export async function GET(request: Request) {
  const { isAdmin, errorResponse } = await requireAdmin(request);
  if (!isAdmin) {
    return NextResponse.json({ error: errorResponse.error }, { status: errorResponse.status });
  }

  const users = db.prepare(`
    SELECT u.id, u.name, u.email, u.phone, u.cpf, u.company, u.role, u.status as user_status,
           u.manual_access_override, u.manual_access_reason, u.manual_access_by, u.manual_access_at,
           u.created_at, u.asaas_customer_id,
           s.status as sub_status, s.plan_name, s.price_monthly, s.trial_ends_at, s.current_period_end, s.asaas_subscription_id, s.next_due_date
    FROM users u
    LEFT JOIN subscriptions s ON u.id = s.user_id
    ORDER BY u.created_at DESC
  `).all() as any[];

  const safeUsers = users.map((u) => ({
    ...u,
    cpfMasked: u.cpf ? maskCPF(u.cpf) : '***.***.***-**',
  }));

  return NextResponse.json({ users: safeUsers });
}
