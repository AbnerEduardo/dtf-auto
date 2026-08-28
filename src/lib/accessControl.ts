import db from './db';

export interface UserAccessInfo {
  canAccess: boolean;
  status: 'trial' | 'active' | 'expired' | 'suspended' | 'canceled' | 'blocked';
  accessStatus: 'active' | 'blocked';
  daysRemaining: number;
  trialStartedAt?: string;
  trialEndsAt?: string;
  currentPeriodEnd?: string;
  planName?: string;
  priceMonthly?: number;
  reason?: string;
  manualOverride?: 'none' | 'granted' | 'blocked';
  role?: string;
}

/**
 * Server-side source of truth for user access control, 7-day trial verification, and admin overrides
 */
export async function canUserAccess(userId: string): Promise<UserAccessInfo> {
  if (!userId) {
    return {
      canAccess: false,
      status: 'expired',
      accessStatus: 'blocked',
      daysRemaining: 0,
      reason: 'Usuário não autenticado',
    };
  }

  const user = db.prepare('SELECT id, name, role, status, manual_access_override, manual_access_reason, created_at FROM users WHERE id = ?').get(userId) as any;
  if (!user) {
    return {
      canAccess: false,
      status: 'expired',
      accessStatus: 'blocked',
      daysRemaining: 0,
      reason: 'Conta não encontrada',
    };
  }

  // Admin always has full access
  if (user.role === 'admin') {
    return {
      canAccess: true,
      status: 'active',
      accessStatus: 'active',
      daysRemaining: 999,
      planName: 'Administrador Pro',
      priceMonthly: 0,
      role: 'admin',
    };
  }

  // --- MANUAL OVERRIDE CHECK ---
  if (user.manual_access_override === 'blocked') {
    return {
      canAccess: false,
      status: 'blocked',
      accessStatus: 'blocked',
      daysRemaining: 0,
      manualOverride: 'blocked',
      reason: user.manual_access_reason || 'Acesso bloqueado pela administração.',
    };
  }

  if (user.manual_access_override === 'granted') {
    return {
      canAccess: true,
      status: 'active',
      accessStatus: 'active',
      daysRemaining: 365,
      manualOverride: 'granted',
      planName: 'Acesso VIP Concedido (Administrador)',
      priceMonthly: 0,
    };
  }

  const sub = db.prepare('SELECT * FROM subscriptions WHERE user_id = ?').get(userId) as any;

  // If no subscription record, create 7-day trial on the fly
  if (!sub) {
    const trialStartedAt = new Date().toISOString();
    const trialEndsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    db.prepare(`
      INSERT INTO subscriptions (id, user_id, status, plan_name, price_monthly, trial_started_at, trial_ends_at, current_period_end)
      VALUES (?, ?, 'trialing', 'Plano Pro DTF Auto', 75.00, ?, ?, ?)
    `).run('sub_' + Date.now(), userId, trialStartedAt, trialEndsAt, trialEndsAt);

    return {
      canAccess: true,
      status: 'trial',
      accessStatus: 'active',
      daysRemaining: 7,
      trialStartedAt,
      trialEndsAt,
      planName: 'Plano Pro DTF Auto (Teste)',
      priceMonthly: 75.00,
    };
  }

  const now = Date.now();

  // Active paid subscription
  if (sub.status === 'active') {
    const periodEnd = sub.current_period_end ? new Date(sub.current_period_end).getTime() : now + 30 * 24 * 60 * 60 * 1000;
    if (periodEnd > now) {
      const days = Math.max(1, Math.ceil((periodEnd - now) / (1000 * 60 * 60 * 24)));
      return {
        canAccess: true,
        status: 'active',
        accessStatus: 'active',
        daysRemaining: days,
        currentPeriodEnd: sub.current_period_end,
        planName: sub.plan_name || 'Plano Pro DTF Auto',
        priceMonthly: sub.price_monthly || 75.00,
      };
    }
  }

  // Trial mode
  if (sub.status === 'trialing' || user.status === 'trial' || !sub.status) {
    const trialEnds = sub.trial_ends_at ? new Date(sub.trial_ends_at).getTime() : new Date(sub.created_at || now).getTime() + 7 * 24 * 60 * 60 * 1000;
    
    if (trialEnds > now) {
      const days = Math.max(1, Math.ceil((trialEnds - now) / (1000 * 60 * 60 * 24)));
      return {
        canAccess: true,
        status: 'trial',
        accessStatus: 'active',
        daysRemaining: days,
        trialStartedAt: sub.trial_started_at,
        trialEndsAt: sub.trial_ends_at,
        planName: 'Plano Pro DTF Auto (Teste Gratuito)',
        priceMonthly: 75.00,
      };
    }

    // Trial expired -> Mark status as expired in database
    db.prepare("UPDATE subscriptions SET status = 'expired' WHERE user_id = ?").run(userId);
    db.prepare("UPDATE users SET status = 'expired' WHERE id = ?").run(userId);
  }

  // Expired / Suspended -> Blocked access (Preserving all user data)
  return {
    canAccess: false,
    status: 'expired',
    accessStatus: 'blocked',
    daysRemaining: 0,
    trialEndsAt: sub.trial_ends_at,
    planName: sub.plan_name || 'Plano Pro DTF Auto',
    priceMonthly: sub.price_monthly || 75.00,
    reason: 'Seu período de teste gratuito de 7 dias terminou. Ative sua assinatura para continuar usando o DTF Auto.',
  };
}

/**
 * Server-side Admin Auth Guard
 */
export async function requireAdmin(request: Request): Promise<{ isAdmin: boolean; adminUser?: any; errorResponse?: any }> {
  const cookieHeader = request.headers.get('cookie') || '';
  const match = cookieHeader.match(/dtf_user_id=([^;]+)/);
  const userId = match ? decodeURIComponent(match[1]) : null;

  if (!userId) {
    return { isAdmin: false, errorResponse: { error: 'Não autenticado', status: 401 } };
  }

  const user = db.prepare('SELECT id, name, email, role FROM users WHERE id = ?').get(userId) as any;
  if (!user || user.role !== 'admin') {
    return { isAdmin: false, errorResponse: { error: 'Acesso restrito a administradores', status: 403 } };
  }

  return { isAdmin: true, adminUser: user };
}
