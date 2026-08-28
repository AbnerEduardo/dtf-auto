const fs = require('fs');
const path = require('path');

function writeFile(relPath, content) {
  const full = path.join(process.cwd(), relPath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content, 'utf8');
  console.log('✓ Generated UI Part 3:', relPath);
}

// ----------------------------------------------------
// 1. src/app/catalogo/page.tsx (Permanent SKU Catalog)
// ----------------------------------------------------
writeFile('src/app/catalogo/page.tsx', `'use client';

import React, { useState, useEffect } from 'react';
import { 
  Palette, 
  Plus, 
  Trash2, 
  Upload, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  Search,
  Maximize2,
  ShieldCheck,
  Loader2
} from 'lucide-react';

interface SkuItem {
  id: string;
  sku: string;
  title: string;
  image_path: string;
  width_cm: number;
  height_cm: number;
  dpi_calculated: number;
  has_transparency: number;
  created_at: string;
}

export default function CatalogoPage() {
  const [skus, setSkus] = useState<SkuItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Form State
  const [formSku, setFormSku] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formWidth, setFormWidth] = useState('30');
  const [formHeight, setFormHeight] = useState('25');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchSkus = () => {
    setIsLoading(true);
    fetch('/api/skus')
      .then((res) => res.json())
      .then((data) => {
        if (data.skus) setSkus(data.skus);
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchSkus();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleSubmitNewSku = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formSku || !formTitle || !formWidth || !formHeight) return;

    setIsSubmitting(true);
    const formData = new FormData();
    formData.append('sku', formSku);
    formData.append('title', formTitle);
    formData.append('width_cm', formWidth);
    formData.append('height_cm', formHeight);
    if (selectedFile) {
      formData.append('image', selectedFile);
    }

    try {
      const res = await fetch('/api/skus', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setIsModalOpen(false);
        setFormSku('');
        setFormTitle('');
        setSelectedFile(null);
        setPreviewUrl(null);
        fetchSkus();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSku = async (id: string) => {
    if (!confirm('Deseja realmente remover esta estampa do catálogo?')) return;
    try {
      await fetch(\`/api/skus/\${id}\`, { method: 'DELETE' });
      fetchSkus();
    } catch (err) {
      console.error(err);
    }
  };

  const filteredSkus = skus.filter(
    (s) =>
      s.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8 max-w-7xl mx-auto w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-fuchsia-500/10 border border-fuchsia-500/30 text-fuchsia-400 text-xs font-semibold mb-2">
            <Palette className="w-3.5 h-3.5" />
            Biblioteca Perpétua de Artes
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            Catálogo Permanente de Estampas
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Cadastre suas artes uma única vez. Elas ficam salvas para sempre na sua conta para alimentar a montagem automática.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold px-5 py-2.5 rounded-xl shadow-lg shadow-cyan-500/20 text-xs transition"
        >
          <Plus className="w-4 h-4" />
          Cadastrar Nova Estampa
        </button>
      </div>

      {/* Search & Stats Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por SKU ou nome da estampa..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="text-xs text-slate-400 flex items-center gap-2">
          <span>Total cadastrado:</span>
          <span className="font-bold text-white bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800">
            {skus.length} estampas
          </span>
        </div>
      </div>

      {/* Grid of SKUs */}
      {isLoading ? (
        <div className="py-20 text-center text-slate-500 text-xs flex flex-col items-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
          Carregando catálogo...
        </div>
      ) : filteredSkus.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredSkus.map((item) => (
            <div
              key={item.id}
              className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 shadow-lg flex flex-col justify-between transition-all group"
            >
              <div>
                {/* Checkerboard Preview Area */}
                <div
                  className="w-full h-48 rounded-xl border border-slate-800 flex items-center justify-center p-3 overflow-hidden relative"
                  style={{
                    backgroundImage: \`
                      linear-gradient(45deg, #1e293b 25%, transparent 25%), 
                      linear-gradient(-45deg, #1e293b 25%, transparent 25%), 
                      linear-gradient(45deg, transparent 75%, #1e293b 75%), 
                      linear-gradient(-45deg, transparent 75%, #1e293b 75%)
                    \`,
                    backgroundSize: '12px 12px',
                    backgroundColor: '#0f172a',
                  }}
                >
                  <img
                    src={item.image_path}
                    alt={item.sku}
                    className="max-w-full max-h-full object-contain group-hover:scale-105 transition-transform"
                  />

                  {/* Transparency Badge */}
                  <div className="absolute top-2 right-2 flex items-center gap-1 bg-slate-950/80 backdrop-blur px-2 py-0.5 rounded text-[10px] font-bold border border-slate-700">
                    {item.has_transparency === 1 ? (
                      <span className="text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Transparente
                      </span>
                    ) : (
                      <span className="text-amber-400 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Fundo Sólido
                      </span>
                    )}
                  </div>
                </div>

                {/* Info */}
                <div className="mt-3.5 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-extrabold text-white">{item.sku}</span>
                    <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                      {item.width_cm} × {item.height_cm} cm
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 line-clamp-1">{item.title}</p>
                </div>
              </div>

              {/* Footer */}
              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center gap-1 text-slate-400">
                  Qualidade: <strong className="text-emerald-400 font-semibold">{item.dpi_calculated} DPI</strong>
                </span>
                <button
                  onClick={() => handleDeleteSku(item.id)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
                  title="Excluir estampa"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-20 text-center text-slate-500 text-xs">
          Nenhuma estampa encontrada. Clique em &quot;Cadastrar Nova Estampa&quot; para adicionar.
        </div>
      )}

      {/* Add Sku Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <Palette className="w-5 h-5 text-cyan-400" />
                Cadastrar Estampa no Catálogo
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitNewSku} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Código SKU *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: CAM-BOSTON-01"
                    value={formSku}
                    onChange={(e) => setFormSku(e.target.value.toUpperCase())}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold placeholder:text-slate-600 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Nome / Título *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Boston Athletics Verde"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Largura Física (cm) *</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={formWidth}
                    onChange={(e) => setFormWidth(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Altura Física (cm) *</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={formHeight}
                    onChange={(e) => setFormHeight(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              {/* Upload Art with Transparency check */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Arquivo da Arte (PNG Transparente ou SVG)
                </label>
                <div className="border-2 border-dashed border-slate-700 hover:border-cyan-500 bg-slate-950 rounded-xl p-4 text-center relative cursor-pointer">
                  <input
                    type="file"
                    accept="image/png,image/svg+xml"
                    onChange={handleFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  {previewUrl ? (
                    <div className="flex flex-col items-center gap-2">
                      <div 
                        className="w-24 h-24 rounded-lg border border-slate-700 p-2 flex items-center justify-center"
                        style={{
                          backgroundImage: 'radial-gradient(#475569 1px, transparent 1px)',
                          backgroundSize: '6px 6px',
                          backgroundColor: '#1e293b'
                        }}
                      >
                        <img src={previewUrl} alt="Preview" className="max-w-full max-h-full object-contain" />
                      </div>
                      <span className="text-[11px] text-cyan-400 font-semibold">Clique para trocar de arquivo</span>
                    </div>
                  ) : (
                    <div>
                      <Upload className="w-6 h-6 text-slate-400 mx-auto mb-1" />
                      <span className="text-slate-300 font-semibold">Escolha a imagem da arte sem fundo</span>
                      <p className="text-[10px] text-slate-500 mt-0.5">Preferencialmente PNG com fundo transparente</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-300 hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold px-5 py-2.5 rounded-xl shadow-lg shadow-cyan-500/20"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    'Salvar Estampa'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
`);

// ----------------------------------------------------
// 2. src/app/assinatura/page.tsx (Subscription & Billing)
// ----------------------------------------------------
writeFile('src/app/assinatura/page.tsx', `'use client';

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
  ArrowRight
} from 'lucide-react';

export default function AssinaturaPage() {
  const [subData, setSubData] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [isActivating, setIsActivating] = useState(false);

  useEffect(() => {
    fetch('/api/subscription')
      .then((res) => res.json())
      .then((data) => setSubData(data));
  }, []);

  const handleCopyPix = () => {
    if (subData?.pixCode) {
      navigator.clipboard.writeText(subData.pixCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleSimulatePayment = async () => {
    setIsActivating(true);
    try {
      await fetch('/api/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'renew' }),
      });
      const res = await fetch('/api/subscription');
      const data = await res.json();
      setSubData(data);
      alert('Pagamento PIX confirmado com sucesso! Assinatura ativa por 30 dias.');
    } catch (err) {
      console.error(err);
    } finally {
      setIsActivating(false);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto w-full space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            Assinatura Recorrente Mensal
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            Plano Pro DTF Auto — R$ 65,00/mês
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Acesso ilimitado à montagem de filas 2D com 300 DPI transparente e romaneio de estoque automático.
          </p>
        </div>

        <div className="text-right">
          <span className="text-xs text-slate-400 block">Status Atual</span>
          <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 mt-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Ativo
          </span>
        </div>
      </div>

      {/* Pricing & ROI Value Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: Plan Details & Included Features */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-5">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">O que está incluso</span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-4xl font-extrabold text-white">R$ 65,00</span>
              <span className="text-slate-400 text-xs">/ mês (sem fidelidade)</span>
            </div>
          </div>

          <div className="space-y-3 text-xs text-slate-300">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Nesting 2D automático com rotação 90° e aproveitamento de 59 cm</span>
            </div>
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Exportação em PNG 300 DPI real com fundo 100% transparente</span>
            </div>
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Leitor inteligente de Lista de Resumo UpSeller (PDF, XLSX e CSV)</span>
            </div>
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Romaneio de Separação de Peças por Tipo, Cor e Tamanho</span>
            </div>
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Catálogo permanente de artes e SKUs ilimitado</span>
            </div>
          </div>

          {/* ROI Comparison Box */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
              <TrendingUp className="w-4 h-4" />
              Por que a assinatura se paga no primeiro dia?
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              O metro de filme DTF custa cerca de <strong>R$ 45,00</strong>. Ao economizar apenas <strong>1,5 metro de filme</strong> ou <strong>40 minutos de trabalho manual</strong> no mês, o sistema já pagou 100% do seu valor!
            </p>
          </div>
        </div>

        {/* Right: Payment Gateway Simulator (PIX & Card) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-5">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <QrCode className="w-4 h-4 text-cyan-400" />
            Pagamento via PIX (Ativação Instantânea)
          </span>

          {/* Simulated PIX QR Code */}
          <div className="p-5 bg-slate-950 rounded-xl border border-slate-800 text-center space-y-3">
            <div className="w-36 h-36 mx-auto bg-white rounded-xl p-2.5 flex items-center justify-center shadow-lg">
              {/* Visual QR Code Pattern */}
              <div className="w-full h-full bg-slate-900 rounded flex flex-col items-center justify-center p-2 text-[9px] text-center text-white font-mono leading-tight">
                <QrCode className="w-12 h-12 text-cyan-400 mb-1" />
                <span>PIX R$ 65,00</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400">
              Abra o app do seu banco e aponte a câmera para o QR Code acima.
            </p>

            {/* PIX Copia e Cola */}
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs">
              <input
                type="text"
                readOnly
                value={subData?.pixCode || '00020126580014br.gov.bcb.pix0136e9181408...'}
                className="w-full bg-transparent text-slate-400 font-mono text-[11px] focus:outline-none"
              />
              <button
                onClick={handleCopyPix}
                className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-400 font-semibold shrink-0 flex items-center gap-1 text-xs"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copiado!' : 'Copiar'}
              </button>
            </div>
          </div>

          <button
            onClick={handleSimulatePayment}
            disabled={isActivating}
            className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold py-3 rounded-xl shadow-lg shadow-emerald-500/20 text-xs transition"
          >
            {isActivating ? 'Processando confirmação...' : 'Simular Pagamento PIX (Renovar 30 Dias)'}
          </button>
        </div>
      </div>
    </div>
  );
}
`);

console.log('✓ UI Part 3 generated successfully!');