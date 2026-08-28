const fs = require('fs');
const path = require('path');

function writeFile(relPath, content) {
  const full = path.join(process.cwd(), relPath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content, 'utf8');
  console.log('✓ Generated UI:', relPath);
}

// ----------------------------------------------------
// 1. src/components/Sidebar.tsx
// ----------------------------------------------------
writeFile('src/components/Sidebar.tsx', `'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Layers, 
  PackageCheck, 
  Palette, 
  CreditCard, 
  History, 
  Sparkles, 
  LayoutDashboard,
  HelpCircle,
  ShieldCheck
} from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();

  const navItems = [
    { href: '/', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/fila', label: 'Montar Fila DTF', icon: Layers, highlight: true },
    { href: '/separacao', label: 'Romaneio / Separação', icon: PackageCheck, badge: 'Novo' },
    { href: '/catalogo', label: 'Catálogo de Artes', icon: Palette },
    { href: '/assinatura', label: 'Minha Assinatura', icon: CreditCard },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-100 min-h-screen flex flex-col border-r border-slate-800 shrink-0">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-indigo-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
          <Sparkles className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="font-bold text-lg leading-tight tracking-tight flex items-center gap-1.5">
            DTF Auto <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">Pro</span>
          </h1>
          <p className="text-xs text-slate-400">Nesting &amp; Romaneio Inteligente</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="p-4 space-y-1.5 flex-1">
        <div className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
          Menu Principal
        </div>
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={\`flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 \${
                isActive
                  ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shadow-sm'
                  : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
              } \${item.highlight && !isActive ? 'hover:border hover:border-slate-700' : ''}\`}
            >
              <div className="flex items-center gap-3">
                <Icon className={\`w-5 h-5 \${isActive ? 'text-cyan-400' : 'text-slate-400'}\`} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Subscription Status Card */}
      <div className="p-4 border-t border-slate-800">
        <div className="bg-gradient-to-b from-slate-800 to-slate-850 p-3.5 rounded-xl border border-slate-700/60 shadow-inner">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Plano Pro Ativo
            </span>
            <span className="text-xs font-bold text-emerald-400">R$ 65/mês</span>
          </div>
          <p className="text-[11px] text-slate-400 mb-3">
            Nesting ilimitado em 300 DPI e romaneio automático.
          </p>
          <Link
            href="/assinatura"
            className="block text-center text-xs font-semibold py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 transition"
          >
            Gerenciar Assinatura
          </Link>
        </div>
      </div>

      {/* User Footer */}
      <div className="p-4 border-t border-slate-800/80 flex items-center gap-3 bg-slate-950/40">
        <div className="w-8 h-8 rounded-full bg-cyan-600 text-white font-bold flex items-center justify-center text-xs">
          EP
        </div>
        <div className="overflow-hidden flex-1">
          <p className="text-xs font-semibold text-slate-200 truncate">Estamparia Brasil</p>
          <p className="text-[11px] text-slate-400 truncate">demo@dtfauto.com.br</p>
        </div>
      </div>
    </aside>
  );
}
`);

// ----------------------------------------------------
// 2. src/app/layout.tsx
// ----------------------------------------------------
writeFile('src/app/layout.tsx', `import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "DTF Auto — Montagem Automática de Filas DTF & Romaneio",
  description: "Sistema inteligente de nesting 2D para filas DTF em 300 DPI transparente e separação automática de peças para e-commerce.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="dark">
      <body className="bg-slate-950 text-slate-100 flex min-h-screen antialiased selection:bg-cyan-500/30 selection:text-cyan-200">
        <Sidebar />
        <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          {children}
        </main>
      </body>
    </html>
  );
}
`);

// ----------------------------------------------------
// 3. src/app/page.tsx (Dashboard)
// ----------------------------------------------------
writeFile('src/app/page.tsx', `'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  Layers, 
  PackageCheck, 
  TrendingUp, 
  Clock, 
  Sparkles, 
  ArrowRight, 
  Palette, 
  CheckCircle2,
  FileSpreadsheet,
  Download
} from 'lucide-react';

export default function DashboardPage() {
  const [stats, setStats] = useState({
    totalQueues: 12,
    metersPrinted: 34.8,
    savedBrl: 582.40,
    hoursSaved: 18.5,
  });

  const [skusCount, setSkusCount] = useState(4);

  useEffect(() => {
    fetch('/api/skus')
      .then((res) => res.json())
      .then((data) => {
        if (data.skus) setSkusCount(data.skus.length);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="p-8 max-w-7xl mx-auto w-full space-y-8">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            Sistema Inteligente DTF Auto Pro
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
            Bem-vindo à sua Central de Produção DTF
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Automatize o encaixe das estampas, economize metros de filme e separe os pedidos do estoque em 1 clique.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/fila"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold px-5 py-3 rounded-xl shadow-lg shadow-cyan-500/25 transition-all text-sm"
          >
            <Layers className="w-4 h-4" />
            Montar Nova Fila DTF
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* ROI & Key Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl -mr-6 -mt-6"></div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Economia em Rolo</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-emerald-400">R$ {stats.savedBrl.toFixed(2)}</span>
            <p className="text-xs text-slate-400 mt-1">Economizados em filme DTF este mês</p>
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/10 rounded-full blur-2xl -mr-6 -mt-6"></div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Tempo Poupado</span>
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-white">{stats.hoursSaved} hrs</span>
            <p className="text-xs text-slate-400 mt-1">Sem montagem manual no Canva/Corel</p>
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl -mr-6 -mt-6"></div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Metros Gerados</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-white">{stats.metersPrinted} m</span>
            <p className="text-xs text-slate-400 mt-1">Filas em 300 DPI transparente</p>
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-fuchsia-500/10 rounded-full blur-2xl -mr-6 -mt-6"></div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Estampas Salvas</span>
            <div className="w-8 h-8 rounded-lg bg-fuchsia-500/20 text-fuchsia-400 flex items-center justify-center">
              <Palette className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-white">{skusCount} SKUs</span>
            <p className="text-xs text-slate-400 mt-1">Salvos permanentemente na conta</p>
          </div>
        </div>
      </div>

      {/* Quick Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link
          href="/fila"
          className="group bg-slate-900/80 hover:bg-slate-850 border border-slate-800 hover:border-cyan-500/50 p-6 rounded-2xl transition-all shadow-lg hover:shadow-cyan-500/10 flex flex-col justify-between"
        >
          <div>
            <div className="w-12 h-12 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Layers className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-white mb-1.5 group-hover:text-cyan-400 transition-colors">
              1. Montar Fila DTF Automática
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Arraste o PDF ou planilha do UpSeller. O sistema calcula o encaixe lado a lado com rotação de 90° e gera o PNG 300 DPI transparente de 59 cm.
            </p>
          </div>
          <div className="mt-6 flex items-center gap-2 text-xs font-bold text-cyan-400">
            Acessar Gerador de Fila <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        <Link
          href="/separacao"
          className="group bg-slate-900/80 hover:bg-slate-850 border border-slate-800 hover:border-emerald-500/50 p-6 rounded-2xl transition-all shadow-lg hover:shadow-emerald-500/10 flex flex-col justify-between"
        >
          <div>
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <PackageCheck className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-white mb-1.5 group-hover:text-emerald-400 transition-colors">
              2. Romaneio / Separação de Peças
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Veja exatamente quantas camisetas pretas G, moletons M ou infantis você precisa retirar do estoque com checklist interativo e impressão.
            </p>
          </div>
          <div className="mt-6 flex items-center gap-2 text-xs font-bold text-emerald-400">
            Ver Romaneio de Estoque <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        <Link
          href="/catalogo"
          className="group bg-slate-900/80 hover:bg-slate-850 border border-slate-800 hover:border-fuchsia-500/50 p-6 rounded-2xl transition-all shadow-lg hover:shadow-fuchsia-500/10 flex flex-col justify-between"
        >
          <div>
            <div className="w-12 h-12 rounded-xl bg-fuchsia-500/20 text-fuchsia-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Palette className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-white mb-1.5 group-hover:text-fuchsia-400 transition-colors">
              3. Catálogo Permanente de Artes
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Cadastre suas estampas uma única vez com SKU, tamanho exato em cm e arte sem fundo. Ficam salvas para sempre na sua conta.
            </p>
          </div>
          <div className="mt-6 flex items-center gap-2 text-xs font-bold text-fuchsia-400">
            Gerenciar Estampas <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>
      </div>

      {/* Why DTF Auto Pro is a Game Changer */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-800 p-6 rounded-2xl">
        <h3 className="font-bold text-base text-white mb-4 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          Por que a assinatura de R$ 65/mês se paga no primeiro dia?
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-slate-300">
          <div className="p-3 bg-slate-950/50 rounded-xl border border-slate-800/80">
            <span className="font-bold text-cyan-400 block mb-1">Economia de Filme DTF</span>
            O algoritmo de nesting 2D encaixa artes lado a lado e gira 90°, aproveitando mais de 90% da largura de 59 cm.
          </div>
          <div className="p-3 bg-slate-950/50 rounded-xl border border-slate-800/80">
            <span className="font-bold text-emerald-400 block mb-1">Zero Erro de Quantidade</span>
            O leitor de PDF/Excel extrai as quantidades exatas vendidas no UpSeller, sem esquecer nenhum pedido.
          </div>
          <div className="p-3 bg-slate-950/50 rounded-xl border border-slate-800/80">
            <span className="font-bold text-fuchsia-400 block mb-1">Transparência 300 DPI Real</span>
            Composição nativa no servidor com canal Alpha preservado, sem fundos pretos ou brancos indesejados.
          </div>
        </div>
      </div>
    </div>
  );
}
`);

console.log('✓ Part 1 of UI generated');