import { NextResponse } from 'next/server';
import db, { getCurrentUserId } from '@/lib/db';
import { canUserAccess } from '@/lib/accessControl';

export async function GET(request: Request) {
  const userId = getCurrentUserId(request);
  const user = db.prepare('SELECT id, name, email, company, role, status FROM users WHERE id = ?').get(userId);
  const sub = db.prepare('SELECT * FROM subscriptions WHERE user_id = ?').get(userId);
  const access = await canUserAccess(userId);

  return NextResponse.json({
    user,
    subscription: sub,
    access,
    plan: {
      name: 'Plano Pro DTF Auto',
      price: 75.00,
      period: 'mensal',
      features: [
        'Acesso ilimitado à Montagem de Rolos DTF (57 cm)',
        'Geração em 300 DPI Real com Canal Alpha Transparente',
        'Nesting 2D MaxRects com Rotação Livre em Qualquer Ângulo',
        'Importação Ilimitada de PDFs e Planilhas UpSeller',
        'Lista Automática de Separação de Peças e Romaneio Fornecedor',
        'Catálogo de Estampas e Gestão Multi-SKU',
        'Auto-Save Contínuo em Nuvem (Zero Perda de Metros)',
      ],
    },
  });
}

export async function POST(request: Request) {
  try {
    const userId = getCurrentUserId(request);
    const body = await request.json();
    const { action } = body;

    // Simulation / Direct Activation
    if (action === 'activate') {
      db.prepare(`
        UPDATE subscriptions
        SET status = 'active', current_period_end = datetime('now', '+30 days')
        WHERE user_id = ?
      `).run(userId);

      db.prepare("UPDATE users SET status = 'active' WHERE id = ?").run(userId);
      const access = await canUserAccess(userId);

      return NextResponse.json({ success: true, message: 'Assinatura ativada com sucesso!', access });
    }

    return NextResponse.json({ error: 'Ação inválida' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
