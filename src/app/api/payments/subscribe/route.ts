import { NextResponse } from 'next/server';
import db, { getCurrentUserId } from '@/lib/db';
import { PLAN_CONFIG } from '@/lib/config/pricing';
import { createOrGetAsaasCustomer, createAsaasSubscription, getSubscriptionPixDetails } from '@/lib/asaas';

export async function POST(request: Request) {
  try {
    const userId = getCurrentUserId(request);
    const user = db.prepare('SELECT id, name, email, cpf, phone, company, asaas_customer_id FROM users WHERE id = ?').get(userId) as any;

    if (!user) {
      return NextResponse.json({ error: 'Usuário não autenticado' }, { status: 401 });
    }

    // 1. Create or get customer in Asaas
    let customerId = user.asaas_customer_id;
    if (!customerId) {
      const customerResult = await createOrGetAsaasCustomer({
        id: user.id,
        name: user.name,
        email: user.email,
        cpf: user.cpf,
        phone: user.phone,
        company: user.company,
      });
      customerId = customerResult.customerId;

      // Save asaas_customer_id in user record
      db.prepare('UPDATE users SET asaas_customer_id = ? WHERE id = ?').run(customerId, user.id);
    }

    // 2. Create monthly subscription in Asaas (R$ 75.00)
    const subscriptionResult = await createAsaasSubscription(customerId, {
      description: PLAN_CONFIG.description,
    });

    // 3. Fetch Pix QR Code & Copy-and-paste payload
    const pixDetails = await getSubscriptionPixDetails(subscriptionResult.subscriptionId);

    // 4. Update subscriptions table with Asaas details (WITHOUT automatically activating status)
    // NOTE: Status remains pending/trialing until confirmed by the official Webhook in Phase 6.
    const existingSub = db.prepare('SELECT id FROM subscriptions WHERE user_id = ?').get(user.id) as any;
    if (existingSub) {
      db.prepare(`
        UPDATE subscriptions
        SET asaas_customer_id = ?,
            asaas_subscription_id = ?,
            asaas_payment_id = ?,
            pix_code = ?,
            next_due_date = ?,
            price_monthly = ?,
            status = 'pending'
        WHERE user_id = ?
      `).run(
        customerId,
        subscriptionResult.subscriptionId,
        pixDetails.paymentId,
        pixDetails.pixCode,
        subscriptionResult.nextDueDate,
        PLAN_CONFIG.monthly_price,
        user.id
      );
    } else {
      db.prepare(`
        INSERT INTO subscriptions (
          id, user_id, asaas_customer_id, asaas_subscription_id, asaas_payment_id,
          status, plan_name, price_monthly, pix_code, next_due_date
        )
        VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?)
      `).run(
        'sub_' + Date.now(),
        user.id,
        customerId,
        subscriptionResult.subscriptionId,
        pixDetails.paymentId,
        PLAN_CONFIG.plan_title,
        PLAN_CONFIG.monthly_price,
        pixDetails.pixCode,
        subscriptionResult.nextDueDate
      );
    }

    return NextResponse.json({
      success: true,
      plan: {
        name: PLAN_CONFIG.name,
        title: PLAN_CONFIG.plan_title,
        price: PLAN_CONFIG.monthly_price,
      },
      asaas: {
        customerId,
        subscriptionId: subscriptionResult.subscriptionId,
        paymentId: pixDetails.paymentId,
        nextDueDate: subscriptionResult.nextDueDate,
      },
      pix: {
        code: pixDetails.pixCode,
        encodedImage: pixDetails.encodedImage,
        expirationDate: pixDetails.expirationDate,
      },
      message: 'Assinatura gerada no Asaas com sucesso. Aguardando confirmação do pagamento via Pix.',
    });
  } catch (err: any) {
    console.error('Error generating Asaas subscription:', err);
    return NextResponse.json({ error: err.message || 'Erro ao processar assinatura com o Asaas' }, { status: 500 });
  }
}
