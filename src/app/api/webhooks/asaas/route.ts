import { NextResponse } from 'next/server';
import db from '@/lib/db';

const ASAAS_WEBHOOK_SECRET = process.env.ASAAS_WEBHOOK_SECRET;

/**
 * Official Asaas Webhook Handler (v3)
 * Endpoint: POST /api/webhooks/asaas
 */
export async function POST(request: Request) {
  try {
    // 1. Validate Webhook Authenticity via Asaas Secret Token
    const authToken = request.headers.get('asaas-access-token') || request.headers.get('webhook-token');

    if (ASAAS_WEBHOOK_SECRET) {
      if (!authToken || authToken !== ASAAS_WEBHOOK_SECRET) {
        return NextResponse.json({ error: 'Token de autenticação do webhook inválido' }, { status: 401 });
      }
    }

    const payload = await request.json();
    const eventName = payload.event; // e.g. 'PAYMENT_RECEIVED', 'PAYMENT_CONFIRMED', 'PAYMENT_OVERDUE', etc.
    const payment = payload.payment;
    const subscription = payload.subscription;

    if (!eventName) {
      return NextResponse.json({ error: 'Payload de webhook inválido: evento não informado' }, { status: 400 });
    }

    // 2. Idempotency Check (Prevent duplicate event processing)
    const eventId = payload.id || `${eventName}_${payment?.id || subscription?.id}_${payment?.dateCreated || Date.now()}`;

    const existingEvent = db.prepare('SELECT id FROM webhook_events WHERE id = ?').get(eventId);
    if (existingEvent) {
      return NextResponse.json({
        success: true,
        duplicate: true,
        message: 'Evento já processado anteriormente (Idempotente)',
      });
    }

    // Record event in webhook_events audit log
    db.prepare(`
      INSERT INTO webhook_events (id, provider, event_name, payload_json, processed)
      VALUES (?, 'asaas', ?, ?, 1)
    `).run(eventId, eventName, JSON.stringify(payload));

    const customerId = payment?.customer || subscription?.customer;
    const subscriptionId = payment?.subscription || subscription?.id;
    const paymentId = payment?.id;

    // Find local user linked to this Asaas Customer or Subscription
    let user: any = null;
    if (customerId) {
      user = db.prepare('SELECT id, name, email FROM users WHERE asaas_customer_id = ?').get(customerId) as any;
    }
    if (!user && subscriptionId) {
      const subRecord = db.prepare('SELECT user_id FROM subscriptions WHERE asaas_subscription_id = ?').get(subscriptionId) as any;
      if (subRecord) {
        user = db.prepare('SELECT id, name, email FROM users WHERE id = ?').get(subRecord.user_id) as any;
      }
    }
    if (!user && payment?.externalReference) {
      user = db.prepare('SELECT id, name, email FROM users WHERE id = ?').get(payment.externalReference) as any;
    }

    if (!user) {
      console.warn(`Asaas Webhook: Usuário não localizado para customer=${customerId}, sub=${subscriptionId}`);
      return NextResponse.json({
        success: true,
        warning: 'Evento registrado, mas usuário associado não foi encontrado no banco.',
      });
    }

    // 3. Process Specific Events
    switch (eventName) {
      // --- A. PAYMENT CONFIRMED / RECEIVED (PIX APPROVED) ---
      case 'PAYMENT_RECEIVED':
      case 'PAYMENT_CONFIRMED': {
        const nextDueDate = payment?.dueDate || subscription?.nextDueDate;

        db.prepare(`
          UPDATE subscriptions
          SET status = 'active',
              asaas_payment_id = COALESCE(?, asaas_payment_id),
              current_period_end = datetime('now', '+30 days'),
              last_payment_at = datetime('now')
          WHERE user_id = ?
        `).run(paymentId, user.id);

        db.prepare("UPDATE users SET status = 'active' WHERE id = ?").run(user.id);

        console.log(`✓ Asaas Webhook: Assinatura ATIVADA com sucesso para o usuário ${user.id} (${user.email})`);
        break;
      }

      // --- B. PAYMENT OVERDUE (ATRASADO / VENCIDO) ---
      case 'PAYMENT_OVERDUE': {
        db.prepare(`
          UPDATE subscriptions
          SET status = 'overdue'
          WHERE user_id = ?
        `).run(user.id);

        db.prepare("UPDATE users SET status = 'expired' WHERE id = ?").run(user.id);

        console.log(`! Asaas Webhook: Cobrança ATRASADA para o usuário ${user.id}`);
        break;
      }

      // --- C. PAYMENT REFUNDED / DELETED (ESTORNADO / CANCELADO) ---
      case 'PAYMENT_REFUNDED':
      case 'PAYMENT_DELETED':
      case 'SUBSCRIPTION_DELETED':
      case 'SUBSCRIPTION_INACTIVATED': {
        db.prepare(`
          UPDATE subscriptions
          SET status = 'canceled'
          WHERE user_id = ?
        `).run(user.id);

        db.prepare("UPDATE users SET status = 'canceled' WHERE id = ?").run(user.id);

        console.log(`! Asaas Webhook: Assinatura CANCELADA/ESTORNADA para o usuário ${user.id}`);
        break;
      }

      // --- D. PAYMENT CREATED / UPDATED (PENDENTE) ---
      case 'PAYMENT_CREATED':
      case 'PAYMENT_UPDATED': {
        // Do not activate access prematurely, preserve pending status
        if (paymentId) {
          db.prepare(`
            UPDATE subscriptions
            SET asaas_payment_id = ?
            WHERE user_id = ? AND status != 'active'
          `).run(paymentId, user.id);
        }
        break;
      }

      default:
        console.log(`Asaas Webhook: Evento não crítico recebido (${eventName})`);
    }

    return NextResponse.json({
      success: true,
      event: eventName,
      processed: true,
      user_id: user.id,
    });
  } catch (err: any) {
    console.error('Asaas Webhook Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
