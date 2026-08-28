import { PLAN_CONFIG } from './config/pricing';

const ASAAS_API_KEY = process.env.ASAAS_API_KEY || '';
const ASAAS_ENVIRONMENT = process.env.ASAAS_ENVIRONMENT || 'sandbox';
const ASAAS_BASE_URL = ASAAS_ENVIRONMENT === 'production' 
  ? 'https://api.asaas.com/api/v3' 
  : 'https://sandbox.asaas.com/api/v3';

export const isAsaasConfigured = !!ASAAS_API_KEY && ASAAS_API_KEY.length > 10;

/**
 * Standard fetch helper for Asaas API with secure backend authentication
 */
async function asaasRequest(endpoint: string, method = 'GET', body: any = null) {
  if (!isAsaasConfigured) {
    throw new Error('ASAAS_API_KEY não está configurada no ambiente.');
  }

  const url = `${ASAAS_BASE_URL}${endpoint}`;
  const options: RequestInit = {
    method,
    headers: {
      'access_token': ASAAS_API_KEY,
      'Content-Type': 'application/json',
      'User-Agent': 'DTFAutoPro/1.0',
    },
  };

  if (body && (method === 'POST' || method === 'PUT')) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  const data = await response.json();

  if (!response.ok) {
    const errorMsg = data.errors?.[0]?.description || data.message || 'Erro na comunicação com o Asaas';
    throw new Error(errorMsg);
  }

  return data;
}

/**
 * Create or retrieve Customer in Asaas
 */
export async function createOrGetAsaasCustomer(user: {
  id: string;
  name: string;
  email: string;
  cpf?: string;
  phone?: string;
  company?: string;
}): Promise<{ customerId: string; isNew: boolean }> {
  // If no live Asaas key, return deterministic sandbox customer
  if (!isAsaasConfigured) {
    return {
      customerId: `cus_mock_${user.id}`,
      isNew: true,
    };
  }

  const cleanCpf = (user.cpf || '').replace(/\D/g, '');
  const cleanPhone = (user.phone || '').replace(/\D/g, '');

  // Check if customer already exists by CPF or Email
  try {
    const searchRes = await asaasRequest(`/customers?email=${encodeURIComponent(user.email.toLowerCase().trim())}`);
    if (searchRes.data && searchRes.data.length > 0) {
      return { customerId: searchRes.data[0].id, isNew: false };
    }
  } catch (e) {}

  // Create new customer
  const createPayload: any = {
    name: user.name.trim(),
    email: user.email.toLowerCase().trim(),
    externalReference: user.id,
    company: user.company || undefined,
  };

  if (cleanCpf && cleanCpf.length === 11) {
    createPayload.cpfCnpj = cleanCpf;
  }
  if (cleanPhone && cleanPhone.length >= 10) {
    createPayload.mobilePhone = cleanPhone;
  }

  const customer = await asaasRequest('/customers', 'POST', createPayload);
  return { customerId: customer.id, isNew: true };
}

/**
 * Create Monthly Subscription in Asaas (R$ 75.00 via Pix)
 */
export async function createAsaasSubscription(
  customerId: string,
  options: {
    nextDueDate?: string;
    description?: string;
  } = {}
): Promise<{
  subscriptionId: string;
  status: string;
  value: number;
  nextDueDate: string;
}> {
  // Format next due date: YYYY-MM-DD
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const nextDueDate = options.nextDueDate || tomorrow.toISOString().split('T')[0];

  if (!isAsaasConfigured) {
    return {
      subscriptionId: `sub_mock_${Date.now()}`,
      status: 'ACTIVE',
      value: PLAN_CONFIG.monthly_price,
      nextDueDate,
    };
  }

  const subscriptionPayload = {
    customer: customerId,
    billingType: 'PIX',
    value: PLAN_CONFIG.monthly_price,
    nextDueDate,
    cycle: PLAN_CONFIG.cycle,
    description: options.description || PLAN_CONFIG.description,
  };

  const subscription = await asaasRequest('/subscriptions', 'POST', subscriptionPayload);

  return {
    subscriptionId: subscription.id,
    status: subscription.status,
    value: subscription.value,
    nextDueDate: subscription.nextDueDate,
  };
}

/**
 * Get Pix QR Code and Copy-Paste code for a Subscription's latest payment
 */
export async function getSubscriptionPixDetails(subscriptionId: string): Promise<{
  paymentId: string;
  pixCode: string;
  encodedImage?: string;
  expirationDate?: string;
}> {
  if (!isAsaasConfigured || subscriptionId.startsWith('sub_mock_')) {
    // Return standard Pix test mockup
    return {
      paymentId: `pay_mock_${Date.now()}`,
      pixCode: '00020126580014br.gov.bcb.pix0136123e4567-e89b-12d3-a456-426614174000520400005303986540575.005802BR5925DTF AUTO SOFTWARE LTDA6009SAO PAULO62070503***6304ABCD',
      encodedImage: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      expirationDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };
  }

  // 1. Fetch payments for this subscription
  const paymentsRes = await asaasRequest(`/subscriptions/${subscriptionId}/payments`);
  if (!paymentsRes.data || paymentsRes.data.length === 0) {
    throw new Error('Nenhuma cobrança encontrada para esta assinatura no Asaas.');
  }

  const latestPayment = paymentsRes.data[0];
  const paymentId = latestPayment.id;

  // 2. Fetch Pix QR Code from Asaas
  const pixRes = await asaasRequest(`/payments/${paymentId}/pixQrCode`);

  return {
    paymentId,
    pixCode: pixRes.payload || latestPayment.invoiceUrl,
    encodedImage: pixRes.encodedImage,
    expirationDate: pixRes.expirationDate,
  };
}
