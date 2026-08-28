'use client';

import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Users, 
  CreditCard, 
  Layers, 
  TrendingUp, 
  Clock, 
  AlertTriangle, 
  Lock, 
  Unlock, 
  Gift, 
  CheckCircle2, 
  Search, 
  Filter, 
  FileText, 
  Activity, 
  Settings, 
  RefreshCw,
  Loader2,
  KeyRound
} from 'lucide-react';

export default function AdminDashboardPage() {
  const [metrics, setMetrics] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [tab, setTab] = useState<'overview' | 'users' | 'logs' | 'settings'>('overview');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [actionReason, setActionReason] = useState('');
  const [courtesyDays, setCourtesyDays] = useState(7);
  const [newAdminPassword, setNewAdminPassword] = useState('123456');
  const [actionModal, setActionModal] = useState<'block' | 'override' | 'courtesy' | 'reset_pwd' | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [mRes, uRes, lRes] = await Promise.all([
        fetch('/api/admin/metrics'),
        fetch('/api/admin/users'),
        fetch('/api/admin/logs'),
      ]);
      const mData = await mRes.json();
      const uData = await uRes.json();
      const lData = await lRes.json();

      if (mData.metrics) setMetrics(mData.metrics);
      if (uData.users) setUsers(uData.users);
      if (lData.logs) setLogs(lData.logs);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const handleUserAction = async (userId: string, action: string, customNewPwd?: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reason: actionReason, courtesyDays, newPassword: customNewPwd || newAdminPassword }),
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message || 'Ação realizada com sucesso');
        setActionModal(null);
        setActionReason('');
        loadAllData();
      } else {
        alert(data.error || 'Erro ao executar ação');
      }
    } catch (e: any) {
      alert('Erro: ' + e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const filteredUsers = users.filter((u) => 
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.cpf?.includes(search)
  );

  return (
    <div className="p-8 max-w-7xl mx-auto w-full space-y-8 animate-in fade-in">
      {/* Header */}
      <div className="bg-[#101524] p-6 rounded-2xl border border-slate-800 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-950/80 text-purple-300 text-xs font-semibold mb-1.5 border border-purple-500/40">
            <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
            Painel Administrativo Master
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Gestão DTF Auto Pro
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Monitoramento de clientes, receita recorrente (MRR), controle de acesso e auditoria.
          </p>
        </div>

        <button
          onClick={loadAllData}
          disabled={loading}
          className="px-4 py-2 bg-[#161c2e] hover:bg-[#1f273f] text-slate-200 border border-slate-700/80 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Atualizar Dados
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setTab('overview')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            tab === 'overview'
              ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md shadow-purple-900/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-[#131828]'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          Visão Geral &amp; MRR
        </button>

        <button
          onClick={() => setTab('users')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            tab === 'users'
              ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md shadow-purple-900/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-[#131828]'
          }`}
        >
          <Users className="w-4 h-4" />
          Clientes &amp; Acessos ({users.length})
        </button>

        <button
          onClick={() => setTab('logs')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            tab === 'logs'
              ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md shadow-purple-900/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-[#131828]'
          }`}
        >
          <Activity className="w-4 h-4" />
          Auditoria &amp; Logs ({logs.length})
        </button>
      </div>

      {/* TAB 1: OVERVIEW & MRR */}
      {tab === 'overview' && (
        <div className="space-y-6">
          {/* Key Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#101524] border border-slate-800 rounded-2xl p-5 shadow-xl">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">MRR (Receita Mensal)</span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-black text-white">
                  R$ {(metrics?.mrr || 0).toFixed(2).replace('.', ',')}
                </span>
                <span className="text-xs text-purple-400 font-bold">R$ 75/ativo</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">{metrics?.activeSubs || 0} assinantes ativos no Asaas</p>
            </div>

            <div className="bg-[#101524] border border-slate-800 rounded-2xl p-5 shadow-xl">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Usuários Totais</span>
              <div className="mt-2">
                <span className="text-3xl font-black text-white">{metrics?.totalUsers || 0}</span>
              </div>
              <p className="text-[11px] text-emerald-400 font-semibold mt-1">{metrics?.trialUsers || 0} em período de teste</p>
            </div>

            <div className="bg-[#101524] border border-slate-800 rounded-2xl p-5 shadow-xl">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Metros DTF Gerados</span>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-3xl font-black text-white">{metrics?.totalMeters || '0.00'}</span>
                <span className="text-xs text-slate-400 font-bold">metros</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">{metrics?.exportedFiles || 0} rolos em 300 DPI</p>
            </div>

            <div className="bg-[#101524] border border-slate-800 rounded-2xl p-5 shadow-xl">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Inadimplência / Bloqueios</span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-black text-rose-400">{metrics?.blockedUsers || 0}</span>
                <span className="text-xs text-slate-400">bloqueados</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">{metrics?.overdueUsers || 0} pagamentos pendentes</p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CLIENT MANAGEMENT */}
      {tab === 'users' && (
        <div className="bg-[#101524] border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Buscar por nome, e-mail ou CPF..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-[#161c2e] border border-slate-700/80 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500 transition"
              />
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-[#0b0e17] text-slate-400 uppercase text-[10px] font-extrabold tracking-wider border-b border-slate-800">
                <tr>
                  <th className="p-3.5">Cliente</th>
                  <th className="p-3.5">Contato &amp; CPF</th>
                  <th className="p-3.5">Status da Conta</th>
                  <th className="p-3.5">Assinatura Asaas</th>
                  <th className="p-3.5 text-right">Ações de Acesso</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-[#141a2c]/60 transition">
                    <td className="p-3.5">
                      <div className="font-bold text-white flex items-center gap-1.5">
                        {u.name}
                        {u.role === 'admin' && (
                          <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-500/40">
                            Admin
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400">{u.company || 'Pessoa Física'}</div>
                    </td>

                    <td className="p-3.5">
                      <div>{u.email}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{u.cpfMasked} {u.phone ? `• ${u.phone}` : ''}</div>
                    </td>

                    <td className="p-3.5">
                      {u.manual_access_override === 'blocked' ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-rose-950/80 text-rose-300 border border-rose-500/40">
                          <Lock className="w-3 h-3" /> Bloqueado Manual
                        </span>
                      ) : u.manual_access_override === 'granted' ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-purple-950/80 text-purple-300 border border-purple-500/40">
                          <CheckCircle2 className="w-3 h-3" /> VIP / Cortesia
                        </span>
                      ) : u.sub_status === 'active' ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-500/40">
                          <CheckCircle2 className="w-3 h-3" /> Assinante Ativo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-blue-950/80 text-blue-300 border border-blue-500/40">
                          <Clock className="w-3 h-3" /> Trial Grátis
                        </span>
                      )}
                    </td>

                    <td className="p-3.5">
                      <div className="font-bold text-slate-200">R$ {u.price_monthly || 75},00/mês</div>
                      <div className="text-[10px] text-slate-500 font-mono truncate max-w-[150px]">
                        {u.asaas_customer_id || 'Sem Asaas ID'}
                      </div>
                    </td>

                    <td className="p-3.5 text-right space-x-1.5">
                      {u.manual_access_override === 'blocked' ? (
                        <button
                          onClick={() => handleUserAction(u.id, 'unblock')}
                          className="px-2.5 py-1.5 bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/40 rounded-lg text-xs font-bold transition cursor-pointer"
                        >
                          Desbloquear
                        </button>
                      ) : (
                        <button
                          onClick={() => { setSelectedUser(u); setActionModal('block'); }}
                          className="px-2.5 py-1.5 bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-500/40 rounded-lg text-xs font-bold transition cursor-pointer"
                        >
                          Bloquear
                        </button>
                      )}

                      <button
                        onClick={() => { setSelectedUser(u); setActionModal('override'); }}
                        className="px-2.5 py-1.5 bg-purple-950/80 hover:bg-purple-900 text-purple-300 border border-purple-500/40 rounded-lg text-xs font-bold transition cursor-pointer"
                      >
                        Liberar Acesso
                      </button>

                      <button
                        onClick={() => { setSelectedUser(u); setActionModal('courtesy'); }}
                        className="px-2.5 py-1.5 bg-blue-950/80 hover:bg-blue-900 text-blue-300 border border-blue-500/40 rounded-lg text-xs font-bold transition cursor-pointer"
                      >
                        + Dias
                      </button>

                      <button
                        onClick={() => { setSelectedUser(u); setNewAdminPassword('123456'); setActionModal('reset_pwd'); }}
                        className="px-2.5 py-1.5 bg-amber-950/80 hover:bg-amber-900 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-bold transition cursor-pointer"
                        title="Redefinir senha do usuário"
                      >
                        <span className="flex items-center gap-1">
                          <KeyRound className="w-3 h-3" /> Senha
                        </span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: AUDIT LOGS */}
      {tab === 'logs' && (
        <div className="bg-[#101524] border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <h2 className="text-sm font-black text-white uppercase tracking-wider">Histórico de Ações Administrativas</h2>
          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-[#0b0e17] text-slate-400 uppercase text-[10px] font-extrabold tracking-wider border-b border-slate-800">
                <tr>
                  <th className="p-3.5">Data &amp; Hora</th>
                  <th className="p-3.5">Administrador</th>
                  <th className="p-3.5">Ação Realizada</th>
                  <th className="p-3.5">Usuário Afetado</th>
                  <th className="p-3.5">Detalhes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-slate-500 font-sans">
                      Nenhum registro de auditoria ainda.
                    </td>
                  </tr>
                ) : (
                  logs.map((l) => (
                    <tr key={l.id} className="hover:bg-[#141a2c]/60">
                      <td className="p-3.5 text-slate-400">{l.created_at}</td>
                      <td className="p-3.5 font-bold text-purple-300">{l.admin_name}</td>
                      <td className="p-3.5 font-bold text-white">{l.action}</td>
                      <td className="p-3.5 text-slate-300">{l.target_user_email}</td>
                      <td className="p-3.5 text-slate-400 truncate max-w-xs">{l.details_json}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ACTION MODAL */}
      {actionModal && selectedUser && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-[#101524] border border-slate-700 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="text-base font-black text-white">
              {actionModal === 'block' && 'Bloquear Acesso do Usuário'}
              {actionModal === 'override' && 'Conceder Acesso VIP Manual'}
              {actionModal === 'courtesy' && 'Adicionar Dias de Cortesia'}
              {actionModal === 'reset_pwd' && 'Redefinir Senha do Usuário'}
            </h3>

            <p className="text-xs text-slate-300">
              Cliente: <span className="font-bold text-white">{selectedUser.name}</span> ({selectedUser.email})
            </p>

            {actionModal === 'courtesy' ? (
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Dias a adicionar:</label>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={courtesyDays}
                  onChange={(e) => setCourtesyDays(parseInt(e.target.value, 10))}
                  className="w-full bg-[#161c2e] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
            ) : actionModal === 'reset_pwd' ? (
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Nova Senha (Mínimo 6 caracteres):</label>
                <input
                  type="text"
                  placeholder="Ex: 123456"
                  value={newAdminPassword}
                  onChange={(e) => setNewAdminPassword(e.target.value)}
                  className="w-full bg-[#161c2e] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  A nova senha será criptografada com Bcrypt e passará a valer imediatamente para o cliente.
                </p>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Motivo do registro:</label>
                <input
                  type="text"
                  placeholder="Ex: Solicitação via WhatsApp / Inadimplência"
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  className="w-full bg-[#161c2e] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setActionModal(null)}
                className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Cancelar
              </button>

              <button
                disabled={actionLoading}
                onClick={() => handleUserAction(
                  selectedUser.id, 
                  actionModal === 'block' ? 'block' : actionModal === 'override' ? 'grant_override' : actionModal === 'courtesy' ? 'add_courtesy_days' : 'reset_password'
                )}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmar Ação'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
