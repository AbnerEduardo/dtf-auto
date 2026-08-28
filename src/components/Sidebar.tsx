'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Layers, 
  PackageCheck, 
  Palette, 
  CreditCard, 
  Sparkles, 
  LayoutDashboard,
  ShieldCheck,
  Users,
  LogOut,
  ChevronDown,
  Clock,
  AlertTriangle
} from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [accessInfo, setAccessInfo] = useState<any>(null);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [showSwitchMenu, setShowSwitchMenu] = useState(false);

  useEffect(() => {
    fetch('/api/auth')
      .then((res) => res.json())
      .then((data) => {
        if (data.user) setCurrentUser(data.user);
        if (data.access) setAccessInfo(data.access);
        if (data.allUsers) setAllUsers(data.allUsers);
      })
      .catch(() => {});
  }, [pathname]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'logout' }),
      });
      router.push('/login');
      router.refresh();
    } catch (e) {}
  };

  const navItems = [
    { href: '/', label: 'Início', icon: LayoutDashboard },
    { href: '/fila', label: 'Montar Fila DTF (57cm)', icon: Layers, highlight: true },
    { href: '/separacao', label: 'Separação & Fornecedor', icon: PackageCheck, badge: 'UpSeller' },
    { href: '/catalogo', label: 'Catálogo de Artes', icon: Palette },
    { href: '/clientes', label: 'Contas & Clientes', icon: Users },
    { href: '/assinatura', label: 'Minha Assinatura', icon: CreditCard },
  ];

  return (
    <aside className="w-64 bg-[#0d111d] text-slate-200 min-h-screen flex flex-col border-r border-slate-800/80 shrink-0 shadow-xl select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800/80 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-600/30">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="font-extrabold text-base text-white leading-tight flex items-center gap-1.5">
            DTF Auto <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-purple-950/80 text-purple-300 border border-purple-500/40">Pro</span>
          </h1>
          <p className="text-[11px] text-slate-400">Filas 57cm &amp; Romaneio</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="p-3.5 space-y-1 flex-1">
        <div className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
          Navegação
        </div>
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl font-semibold text-xs transition-all duration-150 ${
                isActive
                  ? 'bg-gradient-to-r from-blue-950/70 via-indigo-950/70 to-purple-950/70 text-purple-200 border border-purple-500/30 shadow-md shadow-purple-950/50'
                  : 'text-slate-400 hover:bg-[#131828] hover:text-slate-100'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-purple-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-blue-950 text-blue-300 border border-blue-500/40">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Discrete 7-Day Trial / Subscription Status Card */}
      <div className="p-3.5 border-t border-slate-800/80">
        <div className="bg-[#121728] p-3.5 rounded-xl border border-purple-900/30">
          {accessInfo?.status === 'trial' ? (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-purple-400" />
                  Teste Gratuito
                </span>
                <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-500/30">
                  {accessInfo.daysRemaining} {accessInfo.daysRemaining === 1 ? 'dia' : 'dias'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mb-2.5">
                Seu teste gratuito termina em <span className="text-purple-200 font-semibold">{accessInfo.daysRemaining} {accessInfo.daysRemaining === 1 ? 'dia' : 'dias'}</span>.
              </p>
              <Link
                href="/assinatura"
                className="block text-center text-xs font-bold py-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white transition shadow-sm"
              >
                Ativar R$ 75/mês
              </Link>
            </div>
          ) : accessInfo?.status === 'expired' ? (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                  Teste Expirado
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mb-2.5">
                Ative seu plano para liberar a geração de rolos e 300 DPI.
              </p>
              <Link
                href="/assinatura"
                className="block text-center text-xs font-bold py-1.5 rounded-lg bg-gradient-to-r from-rose-600 to-purple-600 hover:from-rose-500 hover:to-purple-500 text-white transition shadow-sm"
              >
                Assinar R$ 75/mês
              </Link>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Assinatura Ativa
                </span>
                <span className="text-xs font-bold text-purple-400">R$ 75/mês</span>
              </div>
              <p className="text-[11px] text-slate-400 mb-2.5">
                Acesso ilimitado a todas as ferramentas.
              </p>
              <Link
                href="/assinatura"
                className="block text-center text-xs font-semibold py-1.5 rounded-lg bg-[#181f36] border border-slate-700 hover:border-purple-500 text-slate-200 transition shadow-xs"
              >
                Ver Assinatura
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* User / Client Footer */}
      <div className="p-3.5 border-t border-slate-800/80 bg-[#0a0d16] relative">
        <div className="flex items-center justify-between gap-2">
          <div 
            onClick={() => setShowSwitchMenu(!showSwitchMenu)}
            className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer hover:opacity-80 transition"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-700 to-purple-800 flex items-center justify-center font-bold text-xs text-white shadow-xs shrink-0">
              {currentUser?.name ? currentUser.name.slice(0, 2).toUpperCase() : 'DT'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white truncate flex items-center gap-1">
                {currentUser?.name || 'Minha Conta'}
                <ChevronDown className="w-3 h-3 text-slate-500" />
              </p>
              <p className="text-[10px] text-slate-400 truncate">{currentUser?.email || 'cliente@dtfauto.com.br'}</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="p-1.5 text-slate-500 hover:text-rose-400 transition rounded-lg hover:bg-rose-950/30"
            title="Sair / Desconectar"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
