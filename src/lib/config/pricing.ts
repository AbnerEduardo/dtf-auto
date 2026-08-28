/**
 * Centralized Pricing & Plan Configuration
 * NOTE: Do not hardcode prices elsewhere in the codebase.
 */
export const PLAN_CONFIG = {
  name: 'DTF Auto',
  plan_title: 'Plano Pro DTF Auto',
  monthly_price: 75.00,
  currency: 'BRL',
  cycle: 'MONTHLY',
  description: 'Assinatura Mensal DTF Auto Pro (57cm, 300 DPI, Romaneio e Catálogo)',
  features: [
    'Acesso ilimitado à Montagem de Rolos DTF (57 cm)',
    'Geração em 300 DPI Real com Canal Alpha Transparente',
    'Nesting 2D MaxRects com Rotação Livre em Qualquer Ângulo',
    'Importação Ilimitada de PDFs e Planilhas UpSeller',
    'Lista Automática de Separação de Peças e Romaneio Fornecedor',
    'Catálogo de Estampas e Gestão Multi-SKU',
    'Auto-Save Contínuo em Nuvem (Zero Perda de Metros)',
    'Armazenamento Privado Seguro no Supabase Storage',
  ],
};
