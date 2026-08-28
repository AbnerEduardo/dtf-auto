'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Sparkles, Mail, Lock, LogIn, ArrowRight, Loader2, ShieldCheck } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('demo@dtfauto.com.br');
  const [password, setPassword] = useState('123456');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', email, password }),
      });

      const data = await res.json();
      if (data.success) {
        localStorage.setItem('dtf_user', JSON.stringify(data.user));
        router.push('/fila');
        router.refresh();
      } else {
        setErrorMsg(data.error || 'Credenciais inválidas. Verifique seu e-mail e senha.');
      }
    } catch (err: any) {
      setErrorMsg('Erro de conexão: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070a13] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-[#101524] border border-slate-800 rounded-3xl p-8 shadow-2xl shadow-purple-950/30 space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 mx-auto flex items-center justify-center shadow-lg shadow-purple-600/30">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">DTF Auto</h1>
          <p className="text-xs text-slate-400">
            Acesse seu painel para otimizar metros DTF e gerar romaneios de separação.
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold rounded-xl text-center">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">E-mail</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seuemail@estamparia.com.br"
                className="w-full bg-[#0d111d] border border-slate-800 focus:border-purple-500 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none transition"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-300">Senha</label>
              <Link
                href="/recuperar-senha"
                className="text-[11px] text-purple-400 hover:text-purple-300 font-semibold transition"
              >
                Esqueceu a senha?
              </Link>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••"
                className="w-full bg-[#0d111d] border border-slate-800 focus:border-purple-500 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold py-3 rounded-xl text-xs transition shadow-lg shadow-purple-600/30 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Autenticando...
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                Entrar no Sistema
              </>
            )}
          </button>
        </form>

        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
          <span>Não possui conta?</span>
          <Link href="/cadastro" className="font-bold text-purple-400 hover:text-purple-300 flex items-center gap-1">
            Criar conta grátis <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="bg-[#0d111d] p-3 rounded-xl border border-slate-800/80 text-[11px] text-slate-400 space-y-1">
          <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            Conta Demonstração Pré-configurada:
          </div>
          <p className="font-mono text-[10px] text-slate-500">
            E-mail: <strong className="text-slate-300">demo@dtfauto.com.br</strong> | Senha: <strong className="text-slate-300">123456</strong>
          </p>
        </div>
      </div>
    </div>
  );
}
