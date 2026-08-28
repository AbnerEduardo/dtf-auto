'use client';

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  Building2, 
  Mail, 
  ShieldCheck, 
  Calendar, 
  Palette, 
  Package, 
  Search, 
  CheckCircle2, 
  Loader2,
  Plus
} from 'lucide-react';

interface Client {
  id: string;
  name: string;
  email: string;
  company: string;
  created_at: string;
  subscription_status: string;
  plan_name: string;
  price_monthly: number;
  total_skus: number;
  total_batches: number;
}

export default function ClientesPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchClients = () => {
    setIsLoading(true);
    fetch('/api/clients')
      .then((res) => res.json())
      .then((data) => {
        if (data.clients) setClients(data.clients);
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, company }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg('Cliente cadastrado com sucesso!');
        setTimeout(() => {
          setSuccessMsg(null);
          setIsModalOpen(false);
          setName('');
          setEmail('');
          setCompany('');
          fetchClients();
        }, 1200);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filtered = clients.filter(
    (c) =>
      c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8 max-w-6xl mx-auto w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#101524] p-6 rounded-2xl border border-slate-800 shadow-xs">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-950/60 text-purple-300 text-xs font-semibold mb-1.5 border border-blue-200">
            <Users className="w-3.5 h-3.5" />
            Gestao de Clientes &amp; Contas
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Contas de Clientes Cadastradas
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Cada cliente possui seu proprio catalogo de artes, configuracoes e historico de filas salvos no banco de dados.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold px-4 py-2.5 rounded-xl text-xs shadow-sm transition"
        >
          <UserPlus className="w-4 h-4" />
          Cadastrar Novo Cliente
        </button>
      </div>

      {/* Filter and Stats */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por nome, estamparia ou e-mail..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#101524] border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-slate-400 focus:outline-none focus:border-blue-500 shadow-xs"
          />
        </div>

        <div className="text-xs text-slate-400 flex items-center gap-2">
          <span>Total de contas ativas:</span>
          <span className="font-bold text-white bg-[#101524] px-2.5 py-1 rounded-lg border border-slate-800">
            {clients.length} clientes
          </span>
        </div>
      </div>

      {/* Clients List Grid */}
      {isLoading ? (
        <div className="py-20 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          Carregando contas...
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((client) => (
            <div
              key={client.id}
              className="bg-[#101524] border border-slate-800 hover:border-slate-700 rounded-2xl p-5 shadow-xs transition flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-950/60 text-blue-600 font-bold flex items-center justify-center text-sm border border-blue-100">
                      {client.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm text-white leading-tight">
                        {client.name}
                      </h3>
                      {client.company && (
                        <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                          <Building2 className="w-3 h-3 text-slate-400" />
                          {client.company}
                        </p>
                      )}
                    </div>
                  </div>

                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {client.subscription_status || 'Ativo'}
                  </span>
                </div>

                <div className="bg-[#0d111d] rounded-xl p-3 border border-slate-100 space-y-1.5 text-xs text-slate-400">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Mail className="w-3 h-3" /> E-mail
                    </span>
                    <span className="font-mono text-[11px] font-semibold text-slate-200 truncate max-w-[180px]">
                      {client.email}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Palette className="w-3 h-3" /> Artes Cadastradas
                    </span>
                    <span className="font-bold text-white">{client.total_skus || 0} estampas</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Package className="w-3 h-3" /> Lotes UpSeller
                    </span>
                    <span className="font-bold text-white">{client.total_batches || 0} lotes</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-400 text-[10px]">
                  ID: <code className="font-mono text-slate-400">{client.id}</code>
                </span>
                <span className="text-[11px] font-bold text-blue-600">
                  R$ {client.price_monthly || 65},00/mes
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-20 text-center text-slate-400 text-xs bg-[#101524] rounded-2xl border border-slate-800">
          Nenhum cliente encontrado. Clique em &quot;Cadastrar Novo Cliente&quot; para adicionar.
        </div>
      )}

      {/* Modal Add Client */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-[#101524] border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-blue-600" />
                Cadastrar Conta de Cliente
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-400 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateClient} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Nome do Responsavel / Usuario *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Joao da Silva"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#0d111d] border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Nome da Empresa / Estamparia</label>
                <input
                  type="text"
                  placeholder="Ex: Estamparia Silva &amp; Co"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="w-full bg-[#0d111d] border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">E-mail de Login *</label>
                <input
                  type="email"
                  required
                  placeholder="cliente@estamparia.com.br"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#0d111d] border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="bg-blue-950/60 border border-blue-100 rounded-xl p-3 text-[11px] text-blue-800 space-y-1">
                <span className="font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Assinatura Padrao Inclusa
                </span>
                <p>Plano Pro DTF Auto (R$ 65,00/mes) ativado automaticamente para esta conta.</p>
              </div>

              {successMsg && (
                <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold text-center">
                  {successMsg}
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:bg-[#161c2e] font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold px-5 py-2.5 rounded-xl shadow-xs transition"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Cadastrando...
                    </>
                  ) : (
                    'Cadastrar Cliente'
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
