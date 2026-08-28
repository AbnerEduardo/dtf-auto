'use client';

import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  QrCode, 
  CheckCircle2, 
  ShieldCheck, 
  Sparkles, 
  Copy, 
  Check, 
  TrendingUp, 
  Clock, 
  Layers,
  ArrowRight,
  Loader2,
  AlertTriangle,
  Lock
} from 'lucide-react';
import { PLAN_CONFIG } from '@/lib/config/pricing';

export default function AssinaturaPage() {
  const [subData, setSubData] = useState<any>(null);
  const [pixData, setPixData] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchSubscriptionInfo = () => {
    fetch('/api/subscription')
      .then((res) => res.json())
      .then((data) => setSubData(data))
      .catch(() => {});
  };

  useEffect(() => {
    fetchSubscriptionInfo();
  }, []);

  const handleSubscribeNow = async () => {
    setIsGenerating(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/payments/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();

      if (data.success) {
        setPixData(data.pix);
        fetchSubscriptionInfo();
      } else {
        setErrorMsg(data.error || 'Erro ao gerar cobrança no Asaas. Tente novamente.');
      }
    } catch (err: any) {
      setErrorMsg('Erro de conexão: ' + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyPix = () => {
    const code = pixData?.code || subData?.subscription?.pix_code;
    if (code) {
      navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const isTrial = subData?.access?.status === 'trial';
  const isExpired = subData?.access?.status === 'expired';
  const isActive = subData?.access?.status === 'active' && subData?.subscription?.status === 'active';

  return (
    <div className="p-8 max-w-5xl mx-auto w-full space-y-8">
      {/* Header */}
      <div className="bg-[#101524] p-6 rounded-2xl border border-slate-800 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-950/80 text-purple-300 text-xs font-semibold mb-1.5 border border-purple-500/40">
            <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
            Assinatura Recorrente Asaas
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            {PLAN_CONFIG.name} — R$ {PLAN_CONFIG.monthly_price.toFixed(2).replace('.', ',')}/mês
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Automatização inteligente de filas DTF em 57 cm, composição 300 DPI e separação automática.
          </p>
        </div>

        <div className="text-right">
          <span className="text-xs text-slate-400 block">Status da Conta</span>
          {isActive ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase px-3 py-1 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 mt-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Assinatura Ativa
            </span>
          ) : isTrial ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase px-3 py-1 rounded-full bg-purple-950/80 text-purple-300 border border-purple-500/40 mt-1">
              <Clock className="w-3.5 h-3.5 text-purple-400" /> Teste Grátis ({subData?.access?.daysRemaining} dias)
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase px-3 py-1 rounded-full bg-rose-950/80 text-rose-300 border border-rose-500/40 mt-1">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" /> Teste Expirado
            </span>
          )}
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold rounded-2xl text-center">
          {errorMsg}
        </div>
      )}

      {/* Pricing & Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: Included Features */}
        <div className="bg-[#101524] border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-purple-400">O que está incluso no plano</span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-4xl font-black text-white">R$ {PLAN_CONFIG.monthly_price.toFixed(2).replace('.', ',')}</span>
              <span className="text-slate-400 text-xs">/ mês (sem fidelidade)</span>
            </div>
          </div>

          <div className="space-y-3 text-xs text-slate-300">
            {PLAN_CONFIG.features.map((feature, idx) => (
              <div key={idx} className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{feature}</span>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-purple-400" />
              Pagamento Seguro via Asaas
            </span>
            <span className="text-purple-300 font-bold">PIX Automático</span>
          </div>
        </div>

        {/* Right: Pix Payment Card */}
        <div className="bg-[#101524] border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between space-y-6">
          <div>
            <h2 className="text-base font-black text-white mb-1 flex items-center gap-2">
              <QrCode className="w-5 h-5 text-purple-400" />
              Pagamento via Pix (Asaas)
            </h2>
            <p className="text-xs text-slate-400">
              Assinatura mensal de R$ {PLAN_CONFIG.monthly_price.toFixed(2).replace('.', ',')}. O acesso é confirmado automaticamente após o pagamento.
            </p>
          </div>

          {pixData?.code || subData?.subscription?.pix_code ? (
            <div className="space-y-4 animate-in fade-in">
              {/* QR Code Container */}
              <div className="bg-white p-4 rounded-xl max-w-[200px] mx-auto shadow-lg flex items-center justify-center">
                {pixData?.encodedImage ? (
                  <img 
                    src={`data:image/png;base64,${pixData.encodedImage}`} 
                    alt="QR Code Pix Asaas" 
                    className="w-full h-auto aspect-square object-contain"
                  />
                ) : (
                  <div className="w-40 h-40 bg-slate-100 flex flex-col items-center justify-center text-slate-700 text-center p-2">
                    <QrCode className="w-12 h-12 text-slate-800 mb-1" />
                    <span className="text-[10px] font-bold">Pague com Pix Copia e Cola</span>
                  </div>
                )}
              </div>

              {/* Pix Copy and Paste Box */}
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">Código Pix Copia e Cola:</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={pixData?.code || subData?.subscription?.pix_code || ''}
                    className="flex-1 bg-[#161c2e] border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-300 font-mono select-all focus:outline-none"
                  />
                  <button
                    onClick={handleCopyPix}
                    className="px-3.5 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-sm cursor-pointer"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                    {copied ? 'Copiado!' : 'Copiar'}
                  </button>
                </div>
              </div>

              <div className="p-3 bg-purple-950/40 border border-purple-800/40 rounded-xl text-center text-xs text-purple-200">
                ⚡ Assim que o Pix for processado pelo Asaas, sua conta será ativada instantaneamente.
              </div>
            </div>
          ) : (
            <div className="py-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-purple-950/50 border border-purple-500/30 flex items-center justify-center mx-auto text-purple-300">
                <CreditCard className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Pronto para automatizar suas produções?</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                  Clique abaixo para gerar sua assinatura mensal de R$ {PLAN_CONFIG.monthly_price.toFixed(2).replace('.', ',')} no gateway Asaas.
                </p>
              </div>

              <button
                onClick={handleSubscribeNow}
                disabled={isGenerating}
                className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold py-3.5 rounded-xl text-xs transition shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Gerando Assinatura Asaas...
                  </>
                ) : (
                  <>
                    Assinar agora — R$ {PLAN_CONFIG.monthly_price.toFixed(2).replace('.', ',')}/mês
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
