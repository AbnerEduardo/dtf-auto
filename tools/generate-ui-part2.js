const fs = require('fs');
const path = require('path');

function writeFile(relPath, content) {
  const full = path.join(process.cwd(), relPath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content, 'utf8');
  console.log('✓ Generated UI Part 2:', relPath);
}

// ----------------------------------------------------
// 1. src/app/fila/page.tsx (Core DTF Queue Generator & Visualizer)
// ----------------------------------------------------
writeFile('src/app/fila/page.tsx', `'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Upload, 
  Layers, 
  Sparkles, 
  Download, 
  RotateCw, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  CheckCircle2, 
  AlertTriangle, 
  Settings2,
  Trash2,
  Plus,
  TrendingUp,
  FileSpreadsheet,
  FileText,
  Loader2,
  PackageCheck
} from 'lucide-react';
import Link from 'next/link';

interface OrderItem {
  sku: string;
  title: string;
  quantity: number;
  widthCm: number;
  heightCm: number;
  imagePath: string;
  garmentType?: string;
  color?: string;
  size?: string;
  isRegistered?: boolean;
}

interface PlacedItem {
  id: string;
  sku: string;
  title: string;
  xCm: number;
  yCm: number;
  widthCm: number;
  heightCm: number;
  rotated: boolean;
  imagePath: string;
  garmentInfo?: string;
}

interface NestingResult {
  rollWidthCm: number;
  rollHeightCm: number;
  efficiencyPercent: number;
  totalArtAreaCm2: number;
  linearSavingsCm: number;
  estimatedSavingsBrl: number;
  placedItems: PlacedItem[];
}

export default function FilaPage() {
  // Settings
  const [rollWidthCm, setRollWidthCm] = useState(59.0);
  const [marginCm, setMarginCm] = useState(1.0);
  const [spacingCm, setSpacingCm] = useState(1.0);
  const [allowRotation, setAllowRotation] = useState(true);

  // Items State
  const [items, setItems] = useState<OrderItem[]>([
    { sku: 'CAM001', title: 'Boston Athletics Verde', quantity: 5, widthCm: 30, heightCm: 25, imagePath: '/samples/boston.png', garmentType: 'Camiseta Tradicional', color: 'Preto', size: 'G', isRegistered: true },
    { sku: 'CAM002', title: 'Spider Urban Hero', quantity: 3, widthCm: 28, heightCm: 30, imagePath: '/samples/spider.png', garmentType: 'Moletom Canguru', color: 'Preto', size: 'M', isRegistered: true },
    { sku: 'CAM003', title: 'Flores Botanical Vintage', quantity: 4, widthCm: 20, heightCm: 15, imagePath: '/samples/flores.png', garmentType: 'Babylook', color: 'Cinza Mescla', size: 'P', isRegistered: true },
    { sku: 'CAM004', title: 'Naruto Shippuden Anime', quantity: 2, widthCm: 35, heightCm: 30, imagePath: '/samples/naruto.png', garmentType: 'Linha Infantil', color: 'Branco', size: 'Tam 08', isRegistered: true },
  ]);

  // Nesting & Rendering State
  const [nestingResult, setNestingResult] = useState<NestingResult | null>(null);
  const [queueId, setQueueId] = useState<string | null>(null);
  const [isNestingLoading, setIsNestingLoading] = useState(false);
  const [isRenderLoading, setIsRenderLoading] = useState(false);
  const [highResDownloadUrl, setHighResDownloadUrl] = useState<string | null>(null);
  const [uploadFileName, setUploadFileName] = useState<string | null>(null);

  // Zoom & Pan
  const [zoomScale, setZoomScale] = useState(1.0);
  const [availableSkus, setAvailableSkus] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/skus')
      .then((res) => res.json())
      .then((data) => {
        if (data.skus) setAvailableSkus(data.skus);
      })
      .catch(() => {});

    // Run initial nesting calculation
    handleGenerateNesting(items);
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadFileName(file.name);
    setIsNestingLoading(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/orders/parse', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.items && data.items.length > 0) {
        setItems(data.items);
        handleGenerateNesting(data.items);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsNestingLoading(false);
    }
  };

  const handleGenerateNesting = async (currentItems = items) => {
    if (!currentItems || currentItems.length === 0) return;
    setIsNestingLoading(true);
    setHighResDownloadUrl(null);

    try {
      const res = await fetch('/api/queue/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: currentItems,
          rollWidthCm,
          marginCm,
          spacingCm,
          allowRotation,
        }),
      });
      const data = await res.json();
      if (data.success && data.nesting) {
        setNestingResult(data.nesting);
        setQueueId(data.queueId);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsNestingLoading(false);
    }
  };

  const handleRender300Dpi = async () => {
    if (!queueId) return;
    setIsRenderLoading(true);

    try {
      const res = await fetch('/api/queue/render-300dpi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queueId }),
      });
      const data = await res.json();
      if (data.success && data.downloadUrl) {
        setHighResDownloadUrl(data.downloadUrl);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsRenderLoading(false);
    }
  };

  const updateItemQty = (index: number, newQty: number) => {
    const next = [...items];
    next[index].quantity = Math.max(1, newQty);
    setItems(next);
  };

  const removeItem = (index: number) => {
    const next = items.filter((_, i) => i !== index);
    setItems(next);
  };

  const addItemFromCatalog = (skuCode: string) => {
    const found = availableSkus.find((s) => s.sku === skuCode);
    if (!found) return;
    const next = [
      ...items,
      {
        sku: found.sku,
        title: found.title,
        quantity: 1,
        widthCm: found.width_cm,
        heightCm: found.height_cm,
        imagePath: found.image_path,
        garmentType: 'Camiseta Tradicional',
        color: 'Preto',
        size: 'G',
        isRegistered: true,
      },
    ];
    setItems(next);
  };

  // Preview Scale Factor (cm to screen px)
  const baseScale = 8; // 1 cm = 8px on screen at 100% zoom
  const scale = baseScale * zoomScale;

  const totalPiecesCount = items.reduce((acc, it) => acc + it.quantity, 0);

  return (
    <div className="p-6 max-w-7xl mx-auto w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
            <Layers className="w-7 h-7 text-cyan-400" />
            Montagem Automática de Fila DTF
          </h1>
          <p className="text-sm text-slate-400">
            Encaixe inteligente lado a lado com rotação 90° em largura útil de 59 cm.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/separacao"
            className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-xl text-xs font-semibold border border-slate-700 transition"
          >
            <PackageCheck className="w-4 h-4 text-emerald-400" />
            Ver Romaneio de Estoque ({totalPiecesCount} peças)
          </Link>
        </div>
      </div>

      {/* Main Grid: Left Controls & List | Right Visualizer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Upload & Items List (5 Cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Upload Box */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Importar Pedidos do UpSeller
            </label>
            <div className="border-2 border-dashed border-slate-700 hover:border-cyan-500/50 bg-slate-950/50 rounded-xl p-5 text-center cursor-pointer transition-colors relative group">
              <input
                type="file"
                accept=".pdf,.xlsx,.xls,.csv"
                onChange={handleFileUpload}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
              <div className="w-10 h-10 rounded-full bg-cyan-500/10 text-cyan-400 mx-auto flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                <Upload className="w-5 h-5" />
              </div>
              <p className="text-xs font-semibold text-slate-200">
                Arraste o PDF da Lista de Resumo ou Planilha Excel
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                Suporta UpSeller PDF, XLSX e CSV
              </p>
              {uploadFileName && (
                <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 text-xs border border-cyan-500/30">
                  <FileText className="w-3.5 h-3.5" />
                  {uploadFileName}
                </div>
              )}
            </div>
          </div>

          {/* Roll Settings Accordion */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Settings2 className="w-4 h-4 text-cyan-400" />
                Parâmetros do Rolo DTF
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Largura Rolo</label>
                <div className="flex items-center bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5">
                  <input
                    type="number"
                    step="1"
                    value={rollWidthCm}
                    onChange={(e) => setRollWidthCm(parseFloat(e.target.value) || 59)}
                    className="w-full bg-transparent text-white font-bold focus:outline-none"
                  />
                  <span className="text-slate-400 text-[10px]">cm</span>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Margem Borda</label>
                <div className="flex items-center bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5">
                  <input
                    type="number"
                    step="0.5"
                    value={marginCm}
                    onChange={(e) => setMarginCm(parseFloat(e.target.value) || 1)}
                    className="w-full bg-transparent text-white font-bold focus:outline-none"
                  />
                  <span className="text-slate-400 text-[10px]">cm</span>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Espaçamento</label>
                <div className="flex items-center bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5">
                  <input
                    type="number"
                    step="0.5"
                    value={spacingCm}
                    onChange={(e) => setSpacingCm(parseFloat(e.target.value) || 1)}
                    className="w-full bg-transparent text-white font-bold focus:outline-none"
                  />
                  <span className="text-slate-400 text-[10px]">cm</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
              <span className="text-slate-300 flex items-center gap-1.5">
                <RotateCw className="w-3.5 h-3.5 text-cyan-400" />
                Permitir Rotação de 90° (Otimização Máxima)
              </span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={allowRotation}
                  onChange={(e) => setAllowRotation(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-500"></div>
              </label>
            </div>
          </div>

          {/* Items in Queue */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Estampas Identificadas ({totalPiecesCount} itens)
              </span>

              {availableSkus.length > 0 && (
                <div className="relative inline-block">
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        addItemFromCatalog(e.target.value);
                        e.target.value = '';
                      }
                    }}
                    className="bg-slate-800 hover:bg-slate-750 text-cyan-400 text-xs font-semibold px-2.5 py-1 rounded-lg border border-cyan-500/30 focus:outline-none cursor-pointer"
                  >
                    <option value="">+ Adicionar do Catálogo</option>
                    {availableSkus.map((s) => (
                      <option key={s.id} value={s.sku}>
                        {s.sku} — {s.title} ({s.width_cm}x{s.height_cm}cm)
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {items.map((it, idx) => (
                <div
                  key={idx}
                  className="bg-slate-950/80 border border-slate-800/90 rounded-xl p-3 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div 
                      className="w-10 h-10 rounded-lg border border-slate-700/60 flex items-center justify-center shrink-0 overflow-hidden"
                      style={{
                        backgroundImage: 'radial-gradient(#475569 1px, transparent 1px)',
                        backgroundSize: '6px 6px',
                        backgroundColor: '#1e293b'
                      }}
                    >
                      <img src={it.imagePath} alt={it.sku} className="max-w-full max-h-full object-contain" />
                    </div>
                    <div className="truncate">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">{it.sku}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                          {it.widthCm}x{it.heightCm} cm
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 truncate">{it.title}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center border border-slate-700 rounded-lg bg-slate-900">
                      <button
                        onClick={() => updateItemQty(idx, it.quantity - 1)}
                        className="px-2 py-1 text-slate-400 hover:text-white"
                      >
                        -
                      </button>
                      <span className="px-1.5 font-bold text-white min-w-[20px] text-center">
                        {it.quantity}
                      </span>
                      <button
                        onClick={() => updateItemQty(idx, it.quantity + 1)}
                        className="px-2 py-1 text-slate-400 hover:text-white"
                      >
                        +
                      </button>
                    </div>
                    <button
                      onClick={() => removeItem(idx)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => handleGenerateNesting()}
              disabled={isNestingLoading || items.length === 0}
              className="w-full mt-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold py-2.5 rounded-xl shadow-lg shadow-cyan-500/20 text-xs flex items-center justify-center gap-2 transition disabled:opacity-50"
            >
              {isNestingLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Calculando Encaixe Inteligente...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Recalcular Fila Otimizada
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Visualizer & Output (7 Cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Metrics & Efficiency Bar */}
          {nestingResult && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-800">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Comprimento do Rolo</span>
                <span className="text-lg font-extrabold text-cyan-400">
                  {(nestingResult.rollHeightCm / 100).toFixed(2)} m
                </span>
                <span className="text-[10px] text-slate-500 block">({nestingResult.rollHeightCm} cm)</span>
              </div>

              <div className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-800">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Aproveitamento</span>
                <span className="text-lg font-extrabold text-emerald-400">
                  {nestingResult.efficiencyPercent}%
                </span>
                <span className="text-[10px] text-slate-500 block">Área útil preenchida</span>
              </div>

              <div className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-800">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Economia em Rolo</span>
                <span className="text-lg font-extrabold text-emerald-400">
                  R$ {nestingResult.estimatedSavingsBrl.toFixed(2)}
                </span>
                <span className="text-[10px] text-slate-500 block">({nestingResult.linearSavingsCm} cm poupados)</span>
              </div>

              <div className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-800">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Total Estampas</span>
                <span className="text-lg font-extrabold text-white">
                  {nestingResult.placedItems.length}
                </span>
                <span className="text-[10px] text-slate-500 block">estampas no rolo</span>
              </div>
            </div>
          )}

          {/* Interactive Canvas Visualizer */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col">
            {/* Visualizer Toolbar */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-cyan-400" />
                  Pré-visualização do Rolo DTF ({rollWidthCm} cm de largura)
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setZoomScale((z) => Math.max(0.5, z - 0.2))}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                  title="Diminuir Zoom"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-[11px] font-mono text-slate-400 min-w-[40px] text-center">
                  {Math.round(zoomScale * 100)}%
                </span>
                <button
                  onClick={() => setZoomScale((z) => Math.min(2.5, z + 0.2))}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                  title="Aumentar Zoom"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setZoomScale(1.0)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                  title="Resetar Zoom"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Canvas Scroll Container */}
            <div className="relative bg-slate-950 rounded-xl mt-3 p-4 overflow-auto max-h-[520px] flex justify-center border border-slate-800/80">
              {nestingResult && nestingResult.placedItems.length > 0 ? (
                <div
                  className="relative rounded-lg shadow-2xl border border-slate-700 transition-all duration-150"
                  style={{
                    width: \`\${nestingResult.rollWidthCm * scale}px\`,
                    height: \`\${nestingResult.rollHeightCm * scale}px\`,
                    backgroundImage: \`
                      linear-gradient(45deg, #1e293b 25%, transparent 25%), 
                      linear-gradient(-45deg, #1e293b 25%, transparent 25%), 
                      linear-gradient(45deg, transparent 75%, #1e293b 75%), 
                      linear-gradient(-45deg, transparent 75%, #1e293b 75%)
                    \`,
                    backgroundSize: '16px 16px',
                    backgroundColor: '#0f172a',
                  }}
                >
                  {/* Top Metric Ruler */}
                  <div className="absolute -top-5 left-0 right-0 h-4 flex items-center justify-between text-[9px] font-mono text-slate-500 px-1">
                    <span>0 cm</span>
                    <span>{rollWidthCm / 2} cm</span>
                    <span>{rollWidthCm} cm</span>
                  </div>

                  {/* Placed Items Overlay */}
                  {nestingResult.placedItems.map((item, i) => (
                    <div
                      key={item.id || i}
                      className="absolute border border-cyan-500/60 bg-cyan-950/20 hover:bg-cyan-500/20 rounded transition-all duration-100 group flex items-center justify-center overflow-hidden"
                      style={{
                        left: \`\${item.xCm * scale}px\`,
                        top: \`\${item.yCm * scale}px\`,
                        width: \`\${item.widthCm * scale}px\`,
                        height: \`\${item.heightCm * scale}px\`,
                      }}
                      title={\`\${item.sku} (\${item.widthCm}x\${item.heightCm}cm)\${item.rotated ? ' [Girado 90°]' : ''}\`}
                    >
                      <img
                        src={item.imagePath}
                        alt={item.sku}
                        className={\`max-w-full max-h-full object-contain pointer-events-none \${
                          item.rotated ? 'rotate-90' : ''
                        }\`}
                      />

                      {/* Small badge overlay on hover */}
                      <div className="absolute top-1 left-1 bg-slate-950/80 backdrop-blur text-cyan-300 font-mono font-bold text-[9px] px-1 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity border border-cyan-500/30 pointer-events-none">
                        {item.sku} {item.rotated ? '↻ 90°' : ''} ({item.widthCm}x{item.heightCm}cm)
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-20 text-center text-slate-500 text-xs">
                  Nenhuma estampa na fila. Adicione itens para visualizar.
                </div>
              )}
            </div>

            {/* Export & Download Action Bar */}
            <div className="mt-4 pt-3 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-xs text-slate-400">
                <span className="text-emerald-400 font-bold">✓ 300 DPI Real</span> — Exportação com fundo transparente (canal Alpha nativo).
              </div>

              <div className="flex items-center gap-3">
                {highResDownloadUrl ? (
                  <a
                    href={highResDownloadUrl}
                    download="fila_dtf_300dpi_transparente.png"
                    className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-5 py-2.5 rounded-xl shadow-lg shadow-emerald-500/20 text-xs transition"
                  >
                    <Download className="w-4 h-4" />
                    Baixar PNG 300 DPI Transparente
                  </a>
                ) : (
                  <button
                    onClick={handleRender300Dpi}
                    disabled={isRenderLoading || !queueId}
                    className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold px-5 py-2.5 rounded-xl shadow-lg shadow-emerald-500/20 text-xs transition disabled:opacity-50"
                  >
                    {isRenderLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Gerando 300 DPI no Servidor...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        Gerar Arquivo Final (300 DPI Transparente)
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
`);

// ----------------------------------------------------
// 2. src/app/separacao/page.tsx (Picking List / Romaneio de Estoque)
// ----------------------------------------------------
writeFile('src/app/separacao/page.tsx', `'use client';

import React, { useState, useEffect } from 'react';
import { 
  PackageCheck, 
  Printer, 
  CheckCircle2, 
  Layers, 
  ArrowRight,
  Sparkles,
  Tag,
  Shirt,
  Search
} from 'lucide-react';
import Link from 'next/link';

interface GarmentGroup {
  garmentType: string;
  totalPieces: number;
  colors: {
    colorName: string;
    sizes: {
      sizeName: string;
      quantity: number;
      skus: { sku: string; quantity: number }[];
    }[];
  }[];
}

export default function SeparacaoPage() {
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [summaryGroups, setSummaryGroups] = useState<GarmentGroup[]>([
    {
      garmentType: 'Camiseta Tradicional',
      totalPieces: 5,
      colors: [
        {
          colorName: 'Preto',
          sizes: [
            { sizeName: 'G', quantity: 5, skus: [{ sku: 'CAM001', quantity: 5 }] }
          ]
        }
      ]
    },
    {
      garmentType: 'Moletom Canguru',
      totalPieces: 3,
      colors: [
        {
          colorName: 'Preto',
          sizes: [
            { sizeName: 'M', quantity: 3, skus: [{ sku: 'CAM002', quantity: 3 }] }
          ]
        }
      ]
    },
    {
      garmentType: 'Babylook',
      totalPieces: 4,
      colors: [
        {
          colorName: 'Cinza Mescla',
          sizes: [
            { sizeName: 'P', quantity: 4, skus: [{ sku: 'CAM003', quantity: 4 }] }
          ]
        }
      ]
    },
    {
      garmentType: 'Linha Infantil',
      totalPieces: 2,
      colors: [
        {
          colorName: 'Branco',
          sizes: [
            { sizeName: 'Tam 08', quantity: 2, skus: [{ sku: 'CAM004', quantity: 2 }] }
          ]
        }
      ]
    }
  ]);

  const toggleCheck = (id: string) => {
    setCheckedItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const totalPieces = summaryGroups.reduce((acc, g) => acc + g.totalPieces, 0);
  const totalChecked = Object.values(checkedItems).filter(Boolean).length;

  return (
    <div className="p-8 max-w-5xl mx-auto w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold mb-2">
            <PackageCheck className="w-3.5 h-3.5" />
            Romaneio de Expedição &amp; Estoque
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            Separação Automática de Peças
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Lista organizada por tipo de peça, cor e tamanho para retirar do estoque sem erros.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold px-4 py-2.5 rounded-xl border border-slate-700 text-xs transition"
          >
            <Printer className="w-4 h-4 text-cyan-400" />
            Imprimir Romaneio (A4)
          </button>

          <Link
            href="/fila"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold px-4 py-2.5 rounded-xl text-xs shadow-lg shadow-cyan-500/20 transition"
          >
            <Layers className="w-4 h-4" />
            Ir para Fila DTF
          </Link>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <span className="text-xs text-slate-400 block font-semibold">Total de Peças</span>
          <span className="text-2xl font-extrabold text-white mt-1 block">{totalPieces} unid.</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <span className="text-xs text-slate-400 block font-semibold">Categorias</span>
          <span className="text-2xl font-extrabold text-cyan-400 mt-1 block">{summaryGroups.length} tipos</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <span className="text-xs text-slate-400 block font-semibold">Status do Picking</span>
          <span className="text-2xl font-extrabold text-emerald-400 mt-1 block">
            {totalChecked > 0 ? \`\${totalChecked} marcados\` : 'Pendente'}
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <span className="text-xs text-slate-400 block font-semibold">Integração</span>
          <span className="text-2xl font-extrabold text-fuchsia-400 mt-1 block">UpSeller</span>
        </div>
      </div>

      {/* Garments Breakdown List */}
      <div className="space-y-4">
        {summaryGroups.map((group, gIdx) => (
          <div
            key={gIdx}
            className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
                  <Shirt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">{group.garmentType}</h3>
                  <span className="text-xs text-slate-400">Total a separar: {group.totalPieces} unidades</span>
                </div>
              </div>

              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                {group.totalPieces} peças
              </span>
            </div>

            {/* Colors and Sizes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {group.colors.map((c, cIdx) => (
                <div
                  key={cIdx}
                  className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3"
                >
                  <div className="flex items-center gap-2 font-bold text-xs text-slate-200">
                    <span className="w-3 h-3 rounded-full border border-slate-700 bg-slate-800"></span>
                    Cor: {c.colorName}
                  </div>

                  <div className="space-y-2">
                    {c.sizes.map((s, sIdx) => {
                      const checkKey = \`\${group.garmentType}_\${c.colorName}_\${s.sizeName}\`;
                      const isChecked = !!checkedItems[checkKey];

                      return (
                        <div
                          key={sIdx}
                          onClick={() => toggleCheck(checkKey)}
                          className={\`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition text-xs \${
                            isChecked
                              ? 'bg-emerald-950/30 border-emerald-500/50 text-emerald-200'
                              : 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-300'
                          }\`}
                        >
                          <div className="flex items-center gap-2.5">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {}}
                              className="rounded border-slate-700 text-emerald-500 focus:ring-0 cursor-pointer"
                            />
                            <div>
                              <span className="font-bold text-white">{s.sizeName}</span>
                              <div className="text-[11px] text-slate-400 mt-0.5">
                                {s.skus.map((sk) => \`\${sk.quantity}x \${sk.sku}\`).join(', ')}
                              </div>
                            </div>
                          </div>

                          <span className="font-extrabold text-sm px-2 py-0.5 rounded bg-slate-800 text-slate-100">
                            {s.quantity} un.
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
`);

console.log('✓ UI Part 2 (Fila + Separacao) generated successfully!');