'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  Layers, 
  PackageCheck, 
  Palette, 
  TrendingUp, 
  Sparkles, 
  ArrowRight, 
  FileSpreadsheet,
  CheckCircle2,
  Boxes,
  Users
} from 'lucide-react';

export default function DashboardPage() {
  const [stats, setStats] = useState({
    totalSkus: 0,
    totalQueues: 0,
    linearSavedCm: 1420,
    financialSavedBrl: 450.00
  });

  useEffect(() => {
    fetch('/api/skus')
      .then(res => res.json())
      .then(data => {
        if (data.skus) {
          setStats(prev => ({ ...prev, totalSkus: data.skus.length }));
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div className="p-8 max-w-6xl mx-auto w-full space-y-8">
      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#10162a] via-[#161735] to-[#121026] border border-purple-500/20 rounded-3xl p-8 shadow-2xl shadow-purple-950/40">
        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-blue-950/80 to-purple-950/80 border border-purple-500/30 text-purple-300 text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            Sistema Automatizado para DTF &amp; Confecção
          </div>
          
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight">
            Montagem de Filas DTF e Romaneio de Separação
          </h1>
          
          <p className="text-sm text-slate-300 leading-relaxed">
            Importe seu arquivo do UpSeller ou monte seus metros livremente com economia máxima de espaço e lista de compras pronta para o fornecedor.
          </p>

          <div className="pt-2 flex flex-wrap gap-3">
            <Link
              href="/fila"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold px-5 py-3 rounded-xl text-xs transition shadow-lg shadow-purple-600/30 hover:scale-[1.02]"
            >
              <Layers className="w-4 h-4" />
              Montar Novo Metro DTF
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/separacao"
              className="inline-flex items-center gap-2 bg-[#161c30] hover:bg-[#1f2642] text-purple-200 border border-purple-500/30 font-bold px-5 py-3 rounded-xl text-xs transition"
            >
              <PackageCheck className="w-4 h-4 text-purple-400" />
              Ver Separação / Fornecedor
            </Link>
          </div>
        </div>
      </div>

      {/* 3 Steps Guide */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-400" />
          Como Funciona o Sistema em 3 Passos
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-[#101524] border border-slate-800 hover:border-purple-500/40 p-5 rounded-2xl shadow-lg transition">
            <div className="w-8 h-8 rounded-xl bg-blue-950/80 border border-blue-500/40 text-blue-400 flex items-center justify-center font-black text-sm mb-3">
              1
            </div>
            <h3 className="font-bold text-white text-sm mb-1">Cadastre as Estampas (1x só)</h3>
            <p className="text-xs text-slate-400">
              Faça o upload das artes sem fundo e defina a altura em centímetros. O sistema calcula a largura automaticamente.
            </p>
          </div>

          <div className="bg-[#101524] border border-slate-800 hover:border-purple-500/40 p-5 rounded-2xl shadow-lg transition">
            <div className="w-8 h-8 rounded-xl bg-indigo-950/80 border border-indigo-500/40 text-indigo-400 flex items-center justify-center font-black text-sm mb-3">
              2
            </div>
            <h3 className="font-bold text-white text-sm mb-1">Importe a Lista do UpSeller</h3>
            <p className="text-xs text-slate-400">
              Faça o upload do PDF ou planilha. O sistema separa por tamanho e monta o metro otimizado.
            </p>
          </div>

          <div className="bg-[#101524] border border-slate-800 hover:border-purple-500/40 p-5 rounded-2xl shadow-lg transition">
            <div className="w-8 h-8 rounded-xl bg-purple-950/80 border border-purple-500/40 text-purple-400 flex items-center justify-center font-black text-sm mb-3">
              3
            </div>
            <h3 className="font-bold text-white text-sm mb-1">Exporte em 300 DPI e WhatsApp</h3>
            <p className="text-xs text-slate-400">
              Baixe o arquivo PNG transparente pronto para impressão e copie o texto limpo com as quantidades para enviar ao fornecedor.
            </p>
          </div>
        </div>
      </div>

      {/* Quick Action Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link
          href="/catalogo"
          className="group bg-[#101524] hover:bg-[#151b2e] border border-slate-800 hover:border-purple-500/50 p-5 rounded-2xl transition flex items-center justify-between shadow-lg"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-blue-950/80 border border-blue-500/30 text-blue-400 flex items-center justify-center group-hover:scale-110 transition">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-white">Catálogo de Estampas</h4>
              <p className="text-xs text-slate-400">Gerenciar artes e tamanhos</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-purple-400 transition" />
        </Link>

        <Link
          href="/clientes"
          className="group bg-[#101524] hover:bg-[#151b2e] border border-slate-800 hover:border-purple-500/50 p-5 rounded-2xl transition flex items-center justify-between shadow-lg"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-purple-950/80 border border-purple-500/30 text-purple-400 flex items-center justify-center group-hover:scale-110 transition">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-white">Gerenciar Clientes</h4>
              <p className="text-xs text-slate-400">Cadastro multi-cliente</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-purple-400 transition" />
        </Link>

        <Link
          href="/assinatura"
          className="group bg-[#101524] hover:bg-[#151b2e] border border-slate-800 hover:border-purple-500/50 p-5 rounded-2xl transition flex items-center justify-between shadow-lg"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-emerald-950/80 border border-emerald-500/30 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-white">Plano Ativo (R$ 65/mês)</h4>
              <p className="text-xs text-slate-400">Ver detalhes da assinatura</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-purple-400 transition" />
        </Link>
      </div>
    </div>
  );
}
