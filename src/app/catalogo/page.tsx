'use client';

import React, { useState, useEffect } from 'react';
import { 
  Palette, 
  Plus, 
  Trash2, 
  Pencil,
  Upload, 
  Search, 
  Loader2,
  CheckCircle2,
  Tag,
  Check
} from 'lucide-react';

interface SkuItem {
  id: string;
  sku: string;
  sku_aliases?: string;
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
  const [editingSkuId, setEditingSkuId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Form State
  const [formSku, setFormSku] = useState('');
  const [formAliases, setFormAliases] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formHeight, setFormHeight] = useState('28');
  const [formWidth, setFormWidth] = useState('22');
  const [aspectRatio, setAspectRatio] = useState(0.8);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOpenCreateModal = () => {
    setEditingSkuId(null);
    setFormSku('');
    setFormAliases('');
    setFormTitle('');
    setFormHeight('28');
    setFormWidth('22');
    setSelectedFile(null);
    setPreviewUrl(null);
    setAspectRatio(0.8);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: SkuItem) => {
    setEditingSkuId(item.id);
    setFormSku(item.sku);
    setFormAliases(item.sku_aliases || '');
    setFormTitle(item.title);
    setFormHeight(String(item.height_cm));
    setFormWidth(String(item.width_cm));
    setPreviewUrl(item.image_path);
    setSelectedFile(null);
    if (item.height_cm > 0) {
      setAspectRatio(item.width_cm / item.height_cm);
    }
    setIsModalOpen(true);
  };

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

  const handleHeightChange = (newHeightStr: string, currentRatio = aspectRatio) => {
    setFormHeight(newHeightStr);
    const h = parseFloat(String(newHeightStr).replace(',', '.'));
    if (!isNaN(h) && h > 0 && currentRatio > 0) {
      const calcW = Number((h * currentRatio).toFixed(1));
      setFormWidth(String(calcW));
    }
  };

  const handleWidthChange = (newWidthStr: string, currentRatio = aspectRatio) => {
    setFormWidth(newWidthStr);
    const w = parseFloat(String(newWidthStr).replace(',', '.'));
    if (!isNaN(w) && w > 0 && currentRatio > 0) {
      const calcH = Number((w / currentRatio).toFixed(1));
      setFormHeight(String(calcH));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);

      // Auto-fill SKU/Title from filename if empty
      const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ').toUpperCase();
      if (!formTitle) setFormTitle(cleanName);
      if (!formSku) setFormSku(cleanName.split(' ')[0] || 'ESTAMPA');

      // Read natural image dimensions for exact aspect ratio
      const img = new Image();
      img.onload = () => {
        if (img.naturalWidth && img.naturalHeight) {
          const ratio = img.naturalWidth / img.naturalHeight;
          setAspectRatio(ratio);
          handleHeightChange(formHeight, ratio);
        }
      };
      img.src = url;
    }
  };

  const handleSubmitNewSku = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formSku || !formTitle || !formHeight) return;

    setIsSubmitting(true);
    const formData = new FormData();
    formData.append('sku', formSku);
    formData.append('sku_aliases', formAliases);
    formData.append('title', formTitle);
    formData.append('height_cm', String(formHeight).replace(',', '.'));
    formData.append('width_cm', String(formWidth).replace(',', '.'));
    if (selectedFile) {
      formData.append('image', selectedFile);
    }

    try {
      const url = editingSkuId ? `/api/skus/${editingSkuId}` : '/api/skus';
      const method = editingSkuId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setIsModalOpen(false);
        setEditingSkuId(null);
        setFormSku('');
        setFormAliases('');
        setFormTitle('');
        setFormHeight('28');
        setFormWidth('22');
        setSelectedFile(null);
        setPreviewUrl(null);
        fetchSkus();
      } else {
        alert(data.error || 'Erro ao salvar estampa');
      }
    } catch (err: any) {
      console.error(err);
      alert('Erro ao salvar: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSku = async (id: string) => {
    if (!confirm('Deseja realmente remover esta estampa do catálogo?')) return;
    try {
      await fetch(`/api/skus/${id}`, { method: 'DELETE' });
      fetchSkus();
    } catch (err) {
      console.error(err);
    }
  };

  const filteredSkus = skus.filter(
    (s) =>
      s.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.sku_aliases && s.sku_aliases.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="p-8 max-w-7xl mx-auto w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#101524] p-6 rounded-2xl border border-slate-800 shadow-xs">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-950/60 text-purple-300 text-xs font-semibold mb-1.5 border border-blue-200">
            <Palette className="w-3.5 h-3.5" />
            Catálogo de Estampas Salvas
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Biblioteca de Artes DTF
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Cadastre a estampa uma única vez com suas medidas reais. O sistema usará este tamanho automaticamente na montagem da fila.
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold px-4 py-2.5 rounded-xl text-xs shadow-xs transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Cadastrar Nova Estampa
        </button>
      </div>

      {/* Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por SKU, nome ou código de variação..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#101524] border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-slate-400 focus:outline-none focus:border-blue-500 shadow-xs"
          />
        </div>

        <div className="text-xs text-slate-400 flex items-center gap-2">
          <span>Total cadastrado:</span>
          <span className="font-bold text-white bg-[#101524] px-2.5 py-1 rounded-lg border border-slate-800">
            {skus.length} estampas
          </span>
        </div>
      </div>

      {/* Grid of SKUs */}
      {isLoading ? (
        <div className="py-20 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          Carregando catálogo...
        </div>
      ) : filteredSkus.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {filteredSkus.map((item) => (
            <div
              key={item.id}
              className="bg-[#101524] border border-slate-800 hover:border-slate-700 rounded-2xl p-4 shadow-xs flex flex-col justify-between transition group"
            >
              <div>
                {/* Transparent Checkerboard Preview Area */}
                <div
                  className="w-full h-44 rounded-xl border border-slate-100 flex items-center justify-center p-3 overflow-hidden relative"
                  style={{
                    backgroundImage: `
                      linear-gradient(45deg, #f1f5f9 25%, transparent 25%), 
                      linear-gradient(-45deg, #f1f5f9 25%, transparent 25%), 
                      linear-gradient(45deg, transparent 75%, #f1f5f9 75%), 
                      linear-gradient(-45deg, transparent 75%, #f1f5f9 75%)
                    `,
                    backgroundSize: '12px 12px',
                    backgroundColor: '#ffffff',
                  }}
                >
                  <img
                    src={item.image_path}
                    alt={item.sku}
                    className="max-w-full max-h-full object-contain group-hover:scale-105 transition-transform"
                  />

                  {/* Quality Badge */}
                  <div className="absolute top-2 right-2 bg-[#101524]/90 backdrop-blur-xs px-2 py-0.5 rounded-md text-[10px] font-bold border border-slate-800 text-slate-300 shadow-xs">
                    {item.dpi_calculated || 300} DPI
                  </div>
                </div>

                {/* Info */}
                <div className="mt-3.5 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-black text-white">{item.sku}</span>
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-blue-950/60 text-purple-300 border border-blue-200">
                      {item.width_cm} × {item.height_cm} cm
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 font-medium line-clamp-1">{item.title}</p>

                  {/* Multi-SKU / UpSeller Aliases Badges */}
                  {item.sku_aliases && (
                    <div className="pt-1">
                      <span className="text-[10px] text-slate-400 font-medium block mb-1">
                        Códigos de Variação (UpSeller):
                      </span>
                      <div className="flex flex-wrap gap-1 max-h-12 overflow-y-auto">
                        {item.sku_aliases
                          .split(/[,;\n]/)
                          .map((a) => a.trim())
                          .filter(Boolean)
                          .map((alias, aIdx) => (
                            <span
                              key={aIdx}
                              className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#161c2e] text-slate-300 border border-slate-800"
                            >
                              {alias}
                            </span>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="mt-3.5 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Transparente
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEditModal(item)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-purple-300 hover:bg-purple-950/40 border border-transparent hover:border-purple-500/30 transition cursor-pointer"
                    title="Editar estampa"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteSku(item.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 border border-transparent hover:border-rose-500/30 transition cursor-pointer"
                    title="Excluir estampa"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-20 text-center text-slate-400 text-xs bg-[#101524] rounded-2xl border border-slate-800">
          Nenhuma estampa encontrada. Clique em &quot;Cadastrar Nova Estampa&quot; para adicionar.
        </div>
      )}

      {/* Super Simple Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-[#101524] border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-extrabold text-base text-white flex items-center gap-2">
                <Palette className="w-5 h-5 text-blue-500" />
                {editingSkuId ? 'Editar Estampa' : 'Cadastrar Nova Estampa'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitNewSku} className="space-y-4 text-xs">
              {/* Step 1: Upload Artwork */}
              <div>
                <label className="block text-slate-300 font-bold mb-1">
                  1. Imagem da Arte (PNG sem fundo) {editingSkuId ? '(Opcional se mantiver a atual)' : '*'}
                </label>
                <div className="border-2 border-dashed border-slate-700 hover:border-blue-500 bg-[#0d111d] hover:bg-blue-950/60/30 rounded-xl p-4 text-center relative cursor-pointer transition">
                  <input
                    type="file"
                    accept="image/png,image/svg+xml"
                    onChange={handleFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  {previewUrl ? (
                    <div className="flex items-center justify-center gap-4">
                      <div 
                        className="w-20 h-20 rounded-lg border border-slate-800 p-1 flex items-center justify-center bg-[#101524] shrink-0"
                        style={{
                          backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)',
                          backgroundSize: '6px 6px',
                        }}
                      >
                        <img src={previewUrl} alt="Preview" className="max-w-full max-h-full object-contain" />
                      </div>
                      <div className="text-left">
                        <span className="text-xs text-purple-300 font-bold block">✓ Arte carregada com sucesso!</span>
                        <p className="text-[11px] text-slate-400">Clique para trocar de arquivo se desejar</p>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <Upload className="w-6 h-6 text-blue-600 mx-auto mb-1" />
                      <span className="text-slate-200 font-bold">Clique ou arraste seu PNG sem fundo aqui</span>
                      <p className="text-[11px] text-slate-400 mt-0.5">Sem bordas adicionais, corte exato da estampa</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Step 2: Info & Variation SKUs */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Código / SKU Principal *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: DOCINHO"
                    value={formSku}
                    onChange={(e) => setFormSku(e.target.value.toUpperCase())}
                    className="w-full bg-[#0d111d] border border-slate-800 rounded-xl px-3 py-2 text-white font-bold focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Nome da Estampa *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Docinho Meninas"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="w-full bg-[#0d111d] border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1 flex items-center justify-between">
                  <span>Códigos de Variação do UpSeller (Opcional)</span>
                  <span className="text-[10px] text-slate-400 font-normal">Separados por vírgula</span>
                </label>
                <input
                  type="text"
                  placeholder="Ex: 119726184872, 119871070915, 119871070913"
                  value={formAliases}
                  onChange={(e) => setFormAliases(e.target.value)}
                  className="w-full bg-[#0d111d] border border-slate-800 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Step 3: Exact Dimensions */}
              <div className="bg-[#0d111d] border border-slate-800 p-4 rounded-xl space-y-3">
                <label className="block text-slate-200 font-bold">
                  2. Medidas Reais da Estampa no Metro (em Centímetros)
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Altura Desejada (cm) *</label>
                    <div className="flex items-center bg-[#101524] border border-slate-800 rounded-xl px-3 py-2">
                      <input
                        type="number"
                        step="any"
                        min="0.1"
                        max="500"
                        required
                        value={formHeight}
                        onChange={(e) => handleHeightChange(e.target.value)}
                        className="w-full bg-transparent text-white font-extrabold text-sm focus:outline-none"
                      />
                      <span className="text-slate-400 font-bold text-xs">cm</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Largura Proporcional (cm)</label>
                    <div className="flex items-center bg-[#101524] border border-slate-800 rounded-xl px-3 py-2">
                      <input
                        type="number"
                        step="any"
                        min="0.1"
                        max="500"
                        value={formWidth}
                        onChange={(e) => handleWidthChange(e.target.value)}
                        className="w-full bg-transparent text-white font-extrabold text-sm focus:outline-none"
                      />
                      <span className="text-slate-400 font-bold text-xs">cm</span>
                    </div>
                  </div>
                </div>

                {/* Quick Presets */}
                <div className="flex items-center gap-1.5 pt-1">
                  <span className="text-[10px] text-slate-400 font-semibold">Tamanhos padrão:</span>
                  {[
                    { label: 'Bolso 10cm', h: '10' },
                    { label: 'Infantil 18cm', h: '18' },
                    { label: 'Adulto A4 28cm', h: '28' },
                    { label: 'Plus Size 32cm', h: '32' },
                    { label: 'A3 36cm', h: '36' },
                  ].map((preset) => (
                    <button
                      key={preset.h}
                      type="button"
                      onClick={() => handleHeightChange(preset.h)}
                      className={`text-[10px] px-2 py-0.5 rounded-md font-semibold border transition ${
                        formHeight === preset.h
                          ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white border-blue-600 shadow-xs'
                          : 'bg-[#101524] text-slate-300 border-slate-800 hover:bg-[#0d111d]'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:bg-[#161c2e] font-semibold cursor-pointer transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold px-6 py-2.5 rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Salvando...
                    </>
                  ) : editingSkuId ? (
                    'Salvar Alterações'
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
