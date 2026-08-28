import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { requireAdmin } from '@/lib/accessControl';
import { hashPassword } from '@/lib/auth';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: targetUserId } = await params;
  const { isAdmin, adminUser, errorResponse } = await requireAdmin(request);
  if (!isAdmin) {
    return NextResponse.json({ error: errorResponse.error }, { status: errorResponse.status });
  }

  const targetUser = db.prepare('SELECT id, name, email FROM users WHERE id = ?').get(targetUserId) as any;
  if (!targetUser) {
    return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
  }

  const body = await request.json();
  const { action, reason, courtesyDays } = body;

  const logId = 'log_' + Date.now();

  switch (action) {
    case 'block': {
      db.prepare(`
        UPDATE users
        SET manual_access_override = 'blocked',
            manual_access_reason = ?,
            manual_access_by = ?,
            manual_access_at = datetime('now')
        WHERE id = ?
      `).run(reason || 'Bloqueado administrativamente', adminUser.name, targetUserId);

      db.prepare(`
        INSERT INTO audit_logs (id, admin_id, admin_name, target_user_id, target_user_email, action, details_json)
        VALUES (?, ?, ?, ?, ?, 'BLOCK_USER', ?)
      `).run(logId, adminUser.id, adminUser.name, targetUser.id, targetUser.email, JSON.stringify({ reason }));

      return NextResponse.json({ success: true, message: `Usuário ${targetUser.name} bloqueado com sucesso.` });
    }

    case 'unblock': {
      db.prepare(`
        UPDATE users
        SET manual_access_override = 'none',
            manual_access_reason = NULL,
            manual_access_by = ?,
            manual_access_at = datetime('now')
        WHERE id = ?
      `).run(adminUser.name, targetUserId);

      db.prepare(`
        INSERT INTO audit_logs (id, admin_id, admin_name, target_user_id, target_user_email, action, details_json)
        VALUES (?, ?, ?, ?, ?, 'UNBLOCK_USER', ?)
      `).run(logId, adminUser.id, adminUser.name, targetUser.id, targetUser.email, JSON.stringify({ action: 'unblock' }));

      return NextResponse.json({ success: true, message: `Bloqueio do usuário ${targetUser.name} removido.` });
    }

    case 'grant_override': {
      db.prepare(`
        UPDATE users
        SET manual_access_override = 'granted',
            manual_access_reason = ?,
            manual_access_by = ?,
            manual_access_at = datetime('now')
        WHERE id = ?
      `).run(reason || 'Acesso VIP manual concedido', adminUser.name, targetUserId);

      db.prepare(`
        INSERT INTO audit_logs (id, admin_id, admin_name, target_user_id, target_user_email, action, details_json)
        VALUES (?, ?, ?, ?, ?, 'GRANT_MANUAL_ACCESS', ?)
      `).run(logId, adminUser.id, adminUser.name, targetUser.id, targetUser.email, JSON.stringify({ reason }));

      return NextResponse.json({ success: true, message: `Acesso manual liberado para ${targetUser.name}.` });
    }

    case 'add_courtesy_days': {
      const days = parseInt(courtesyDays || '7', 10);
      db.prepare(`
        UPDATE subscriptions
        SET trial_ends_at = datetime(COALESCE(trial_ends_at, 'now'), '+${days} days'),
            current_period_end = datetime(COALESCE(current_period_end, 'now'), '+${days} days'),
            status = CASE WHEN status = 'expired' THEN 'trialing' ELSE status END
        WHERE user_id = ?
      `).run(targetUserId);

      db.prepare("UPDATE users SET status = CASE WHEN status = 'expired' THEN 'trial' ELSE status END WHERE id = ?").run(targetUserId);

      db.prepare(`
        INSERT INTO audit_logs (id, admin_id, admin_name, target_user_id, target_user_email, action, details_json)
        VALUES (?, ?, ?, ?, ?, 'ADD_COURTESY_DAYS', ?)
      `).run(logId, adminUser.id, adminUser.name, targetUser.id, targetUser.email, JSON.stringify({ daysAdded: days, reason }));

      return NextResponse.json({ success: true, message: `${days} dias de cortesia adicionados para ${targetUser.name}.` });
    }

    case 'reset_password': {
      const newPwd = body.newPassword || '123456';
      if (newPwd.length < 6) {
        return NextResponse.json({ error: 'A nova senha deve ter no mínimo 6 caracteres' }, { status: 400 });
      }

      const hashedPassword = await hashPassword(newPwd);
      db.prepare(`
        UPDATE users
        SET password = ?,
            reset_token = NULL,
            reset_token_expires = NULL
        WHERE id = ?
      `).run(hashedPassword, targetUserId);

      db.prepare(`
        INSERT INTO audit_logs (id, admin_id, admin_name, target_user_id, target_user_email, action, details_json)
        VALUES (?, ?, ?, ?, ?, 'ADMIN_RESET_PASSWORD', ?)
      `).run(logId, adminUser.id, adminUser.name, targetUser.id, targetUser.email, JSON.stringify({ resetBy: adminUser.name }));

      return NextResponse.json({ success: true, message: `Senha do usuário ${targetUser.name} redefinida com sucesso para "${newPwd}".` });
    }

    default:
      return NextResponse.json({ error: 'Ação não reconhecida' }, { status: 400 });
  }
}
