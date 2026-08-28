'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Sparkles, Mail, Lock, KeyRound, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';

export default function RecuperarSenhaPage() {
  const router = useRouter();
  const [step, setStep] = useState<'request' | 'reset'>('request');
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'forgot_password', email }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg(data.message || 'Código de recuperação gerado.');
        if (data.debugCode) setToken(data.debugCode);
        setStep('reset');
      } else {
        setErrorMsg(data.error || 'Erro ao solicitar código.');
      }
    } catch (err: any) {
      setErrorMsg('Erro de conexão: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset_password', email, token, newPassword }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg('✓ Senha redefinida com sucesso! Redirecionando para o login...');
        setTimeout(() => router.push('/login'), 2000);
      } else {
        setErrorMsg(data.error || 'Erro ao redefinir senha.');
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
            <KeyRound className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">Recuperar Senha</h1>
          <p className="text-xs text-slate-400">
            {step === 'request'
              ? 'Informe seu e-mail para receber as instruções de recuperação.'
              : 'Digite o código recebido e defina sua nova senha.'}
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold rounded-xl text-center">
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold rounded-xl text-center">
            {successMsg}
          </div>
        )}

        {step === 'request' ? (
          <form onSubmit={handleRequestCode} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">E-mail Cadastrado</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seuemail@empresa.com.br"
                  className="w-full bg-[#161c2e] border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500 transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold py-3 rounded-xl text-xs transition shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enviar Código de Recuperação'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">Código de Verificação</label>
              <input
                type="text"
                required
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Digite o código de 6 dígitos"
                className="w-full bg-[#161c2e] border border-slate-700/80 rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500 transition font-mono text-center tracking-widest text-base"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">Nova Senha</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full bg-[#161c2e] border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500 transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold py-3 rounded-xl text-xs transition shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar Nova Senha'}
            </button>
          </form>
        )}

        <div className="text-center pt-2 border-t border-slate-800 text-xs text-slate-400">
          Lembrou sua senha?{' '}
          <Link href="/login" className="text-purple-400 hover:text-purple-300 font-bold transition">
            Voltar ao Login
          </Link>
        </div>
      </div>
    </div>
  );
}
