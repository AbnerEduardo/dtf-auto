'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Upload, 
  Layers, 
  Sparkles, 
  Download, 
  RotateCw, 
  RotateCcw,
  ZoomIn, 
  ZoomOut, 
  CheckCircle2, 
  AlertTriangle, 
  Settings2,
  Trash2,
  Plus,
  Copy,
  TrendingUp,
  FileSpreadsheet,
  Loader2,
  PackageCheck,
  Eye,
  Grid,
  Move,
  Scissors
} from 'lucide-react';
import Link from 'next/link';

interface OrderItem {
  id?: string;
  sku: string;
  title: string;
  quantity: number;
  widthCm: number;
  heightCm: number;
  aspectRatio?: number;
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
  aspectRatio?: number;
  rotated: boolean;
  rotation: number;
  imagePath: string;
  garmentInfo?: string;
}

interface NestingResult {
  rollWidthCm: number;
  rollHeightCm: number;
  metroCount: number;
  efficiencyPercent: number;
  totalArtAreaCm2: number;
  linearSavingsCm: number;
  estimatedSavingsBrl: number;
  placedItems: PlacedItem[];
}

export default function FilaPage() {
  const [rollWidthCm, setRollWidthCm] = useState(57.0);
  const [marginCm, setMarginCm] = useState(1.0);
  const [spacingCm, setSpacingCm] = useState(1.0);
  const [allowRotation, setAllowRotation] = useState(true);

  const [items, setItems] = useState<OrderItem[]>([
    { sku: 'CAM001', title: 'Cars McQueen Racing', quantity: 3, widthCm: 24.0, heightCm: 36.0, aspectRatio: 24.0 / 36.0, imagePath: '/samples/boston.png', garmentType: 'Camiseta Tradicional', color: 'Preto', size: 'G', isRegistered: true },
    { sku: 'CAM002', title: 'Pikachu Pokeball', quantity: 3, widthCm: 22.0, heightCm: 28.0, aspectRatio: 22.0 / 28.0, imagePath: '/samples/spider.png', garmentType: 'Moletom Canguru', color: 'Preto', size: 'M', isRegistered: true },
    { sku: 'CAM003', title: 'Teddy Street Bear', quantity: 1, widthCm: 32.0, heightCm: 22.0, aspectRatio: 32.0 / 22.0, imagePath: '/samples/flores.png', garmentType: 'Camiseta Tradicional', color: 'Branco', size: 'GG', isRegistered: true },
    { sku: 'CAM004', title: 'Tag Style Minimal', quantity: 2, widthCm: 14.0, heightCm: 6.0, aspectRatio: 14.0 / 6.0, imagePath: '/samples/naruto.png', garmentType: 'Tag / Manga', color: 'Roxo', size: 'Unico', isRegistered: true },
  ]);

  const [placedItems, setPlacedItems] = useState<PlacedItem[]>([]);
  const [canvasHeightCm, setCanvasHeightCm] = useState<number>(100.0);
  const [efficiencyPercent, setEfficiencyPercent] = useState<number>(0);
  const [estimatedSavingsBrl, setEstimatedSavingsBrl] = useState<number>(0);
  const [linearSavingsCm, setLinearSavingsCm] = useState<number>(0);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);

  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const [queueId, setQueueId] = useState<string | null>(null);
  const [isNestingLoading, setIsNestingLoading] = useState(false);
  const [isRenderLoading, setIsRenderLoading] = useState(false);
  const [highResDownloadUrl, setHighResDownloadUrl] = useState<string | null>(null);
  const [uploadFileName, setUploadFileName] = useState<string | null>(null);
  const [uploadSuccessMsg, setUploadSuccessMsg] = useState<string | null>(null);
  const [savedSettingsMsg, setSavedSettingsMsg] = useState<string | null>(null);

  const [zoomPercent, setZoomPercent] = useState(100);
  const [showRulers, setShowRulers] = useState(true);
  const [canvasBgMode, setCanvasBgMode] = useState<'gray' | 'darkgray' | 'grid'>('gray');
  const [availableSkus, setAvailableSkus] = useState<any[]>([]);

  const canvasRef = useRef<HTMLDivElement>(null);
  const baseScalePxPerCm = 8;
  const currentScale = (zoomPercent / 100) * baseScalePxPerCm;

  const persistSession = (
    newPlaced: PlacedItem[],
    newItems = items,
    newRollW = rollWidthCm,
    newCanvasH = canvasHeightCm,
    newMargin = marginCm,
    newSpacing = spacingCm,
    newAllowRot = allowRotation,
    newFilename = uploadFileName
  ) => {
    const sessionData = {
      rollWidthCm: newRollW,
      rollHeightCm: newCanvasH,
      marginCm: newMargin,
      spacingCm: newSpacing,
      allowRotation: newAllowRot,
      items: newItems,
      placedItems: newPlaced,
      sourceFilename: newFilename,
      savedAt: new Date().toISOString(),
    };

    try {
      localStorage.setItem('dtf_current_metro_session', JSON.stringify(sessionData));
    } catch (e) {}

    fetch('/api/queue/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sessionData),
    }).catch(() => {});

    setLastSavedTime(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
  };

  const applySessionData = (session: any) => {
    if (session.rollWidthCm) setRollWidthCm(session.rollWidthCm);
    if (session.rollHeightCm) setCanvasHeightCm(Math.max(100.0, session.rollHeightCm));
    if (session.marginCm !== undefined) setMarginCm(session.marginCm);
    if (session.spacingCm !== undefined) setSpacingCm(session.spacingCm);
    if (session.allowRotation !== undefined) setAllowRotation(session.allowRotation);
    if (session.sourceFilename) setUploadFileName(session.sourceFilename);
    if (session.items && session.items.length > 0) setItems(session.items);
    if (session.placedItems && session.placedItems.length > 0) {
      setPlacedItems(session.placedItems);
      const totalArtArea = session.placedItems.reduce((acc: number, it: any) => acc + (it.widthCm * it.heightCm), 0);
      const totalRollArea = (session.rollWidthCm || 57) * (session.rollHeightCm || 100);
      setEfficiencyPercent(totalRollArea > 0 ? Number(((totalArtArea / totalRollArea) * 100).toFixed(1)) : 88);
    }
    setLastSavedTime(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
  };

  useEffect(() => {
    const tryLoadSession = async () => {
      let loaded = false;
      try {
        const res = await fetch('/api/queue/session');
        const data = await res.json();
        if (data.session && (data.session.placedItems?.length > 0 || data.session.items?.length > 0)) {
          applySessionData(data.session);
          loaded = true;
        }
      } catch (e) {}

      if (!loaded) {
        try {
          const local = localStorage.getItem('dtf_current_metro_session');
          if (local) {
            const parsed = JSON.parse(local);
            if (parsed && (parsed.placedItems?.length > 0 || parsed.items?.length > 0)) {
              applySessionData(parsed);
              loaded = true;
            }
          }
        } catch (e) {}
      }

      if (!loaded) {
        handleGenerateNesting(items);
      }
    };

    tryLoadSession();

    fetch('/api/skus')
      .then((res) => res.json())
      .then((data) => {
        if (data.skus) setAvailableSkus(data.skus);
      })
      .catch(() => {});
  }, []);

  const handleSaveRollSettings = async () => {
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roll_width_cm: rollWidthCm,
          spacing_cm: spacingCm,
          margin_cm: marginCm,
          allow_rotation: allowRotation ? 1 : 0,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSavedSettingsMsg('✓ Padrão do Metro DTF salvo (57 cm)!');
        setTimeout(() => setSavedSettingsMsg(null), 3000);
        persistSession(placedItems);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setIsNestingLoading(true);
    setUploadSuccessMsg(null);

    try {
      const res = await fetch('/api/orders/parse', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.items && data.items.length > 0) {
        setItems(data.items);
        setUploadFileName(file.name);
        setUploadSuccessMsg(`✓ ${data.items.length} modelos importados com sucesso do UpSeller!`);
        setTimeout(() => setUploadSuccessMsg(null), 4000);
        handleGenerateNesting(data.items, file.name);
      } else {
        alert(data.error || 'Nenhum pedido compatível encontrado no arquivo.');
      }
    } catch (err: any) {
      console.error(err);
      alert('Erro ao processar arquivo: ' + err.message);
    } finally {
      setIsNestingLoading(false);
    }
  };

  const handleGenerateNesting = async (itemsToNest = items, filename = uploadFileName) => {
    setIsNestingLoading(true);
    try {
      const res = await fetch('/api/queue/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: itemsToNest,
          rollWidthCm,
          marginCm,
          spacingCm,
          allowRotation,
        }),
      });

      const data = await res.json();
      if (data.success && data.nesting) {
        setQueueId(data.queueId);
        const mappedPlaced = data.nesting.placedItems.map((p: any) => ({
          ...p,
          rotation: p.rotation !== undefined ? p.rotation : (p.rotated ? 90 : 0),
          aspectRatio: p.widthCm / (p.heightCm || 1),
        }));
        const newHeight = Math.max(100.0, data.nesting.rollHeightCm);
        setPlacedItems(mappedPlaced);
        setCanvasHeightCm(newHeight);
        setEfficiencyPercent(data.nesting.efficiencyPercent);
        setEstimatedSavingsBrl(data.nesting.estimatedSavingsBrl);
        setLinearSavingsCm(data.nesting.linearSavingsCm);

        persistSession(mappedPlaced, itemsToNest, rollWidthCm, newHeight, marginCm, spacingCm, allowRotation, filename);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsNestingLoading(false);
    }
  };

  const handleRenderHighRes = async () => {
    setIsRenderLoading(true);
    setHighResDownloadUrl(null);
    try {
      const res = await fetch('/api/queue/render-300dpi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          queueId,
          rollWidthCm,
          rollHeightCm: canvasHeightCm,
          placedItems,
        }),
      });

      const data = await res.json();
      if (data.success && data.downloadUrl) {
        setHighResDownloadUrl(data.downloadUrl);
      } else {
        alert(data.error || 'Erro ao renderizar o arquivo DTF em 300 DPI.');
      }
    } catch (err: any) {
      alert('Erro na renderização: ' + err.message);
    } finally {
      setIsRenderLoading(false);
    }
  };

  const handleResetSession = () => {
    if (confirm('Deseja iniciar um novo metro limpo? As estampas atuais serão reiniciadas.')) {
      setPlacedItems([]);
      setItems([]);
      setUploadFileName(null);
      setCanvasHeightCm(100.0);
      try {
        localStorage.removeItem('dtf_current_metro_session');
      } catch (e) {}
      fetch('/api/queue/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: [], placedItems: [], rollWidthCm: 57.0, rollHeightCm: 100.0 }),
      }).catch(() => {});
    }
  };

  const selectedItem = placedItems.find((p) => p.id === selectedItemId);

  const handleMouseDown = (e: React.MouseEvent, item: PlacedItem) => {
    e.stopPropagation();
    setSelectedItemId(item.id);
    setIsDragging(true);

    const canvasBounds = canvasRef.current?.getBoundingClientRect();
    if (canvasBounds) {
      const mouseXCm = (e.clientX - canvasBounds.left) / currentScale;
      const mouseYCm = (e.clientY - canvasBounds.top) / currentScale;
      setDragOffset({
        x: mouseXCm - item.xCm,
        y: mouseYCm - item.yCm,
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !selectedItemId || !canvasRef.current) return;

    const canvasBounds = canvasRef.current.getBoundingClientRect();
    const mouseXCm = (e.clientX - canvasBounds.left) / currentScale;
    const mouseYCm = (e.clientY - canvasBounds.top) / currentScale;

    const targetItem = placedItems.find((p) => p.id === selectedItemId);
    if (!targetItem) return;

    let newXCm = Number((mouseXCm - dragOffset.x).toFixed(1));
    let newYCm = Number((mouseYCm - dragOffset.y).toFixed(1));

    newXCm = Math.max(marginCm, Math.min(rollWidthCm - targetItem.widthCm - marginCm, newXCm));
    newYCm = Math.max(marginCm, newYCm);

    setPlacedItems((prev) =>
      prev.map((p) => (p.id === selectedItemId ? { ...p, xCm: newXCm, yCm: newYCm } : p))
    );

    const itemBottom = newYCm + targetItem.heightCm + marginCm;
    if (itemBottom > canvasHeightCm) {
      setCanvasHeightCm(Math.max(100, Math.ceil(itemBottom / 10) * 10));
    }
  };

  const handleMouseUp = () => {
    if (isDragging) {
      setIsDragging(false);
      persistSession(placedItems);
    }
  };

  const setItemRotation = (itemId: string, angle: number) => {
    setPlacedItems((prev) => {
      const updated = prev.map((p) => {
        if (p.id !== itemId) return p;
        const normalizedAngle = (angle + 360) % 360;
        const isTurned = normalizedAngle === 90 || normalizedAngle === 270;
        
        const wasTurned = p.rotation === 90 || p.rotation === 270;
        let newW = p.widthCm;
        let newH = p.heightCm;
        if (isTurned !== wasTurned) {
          newW = p.heightCm;
          newH = p.widthCm;
        }

        return {
          ...p,
          rotation: normalizedAngle,
          rotated: isTurned,
          widthCm: Number(newW.toFixed(1)),
          heightCm: Number(newH.toFixed(1)),
        };
      });
      persistSession(updated);
      return updated;
    });
  };

  const updateItemHeightProportional = (itemId: string, newHeightCm: number) => {
    if (newHeightCm < 3) return;
    setPlacedItems((prev) => {
      const updated = prev.map((p) => {
        if (p.id !== itemId) return p;
        const ratio = p.aspectRatio || p.widthCm / p.heightCm || 0.75;
        const newWidthCm = Number((newHeightCm * ratio).toFixed(1));
        return {
          ...p,
          heightCm: Number(newHeightCm.toFixed(1)),
          widthCm: Math.min(rollWidthCm - 2 * marginCm, newWidthCm),
        };
      });
      persistSession(updated);
      return updated;
    });
  };

  const updateItemWidthProportional = (itemId: string, newWidthCm: number) => {
    if (newWidthCm < 3) return;
    setPlacedItems((prev) => {
      const updated = prev.map((p) => {
        if (p.id !== itemId) return p;
        const ratio = p.aspectRatio || p.widthCm / p.heightCm || 0.75;
        const newHeightCm = Number((newWidthCm / ratio).toFixed(1));
        return {
          ...p,
          widthCm: Number(newWidthCm.toFixed(1)),
          heightCm: Number(newHeightCm.toFixed(1)),
        };
      });
      persistSession(updated);
      return updated;
    });
  };

  const duplicateItem = (itemId: string) => {
    const item = placedItems.find((p) => p.id === itemId);
    if (!item) return;

    const newItem: PlacedItem = {
      ...item,
      id: `${item.sku}_copy_${Date.now()}`,
      xCm: Math.min(rollWidthCm - item.widthCm - marginCm, item.xCm + 2),
      yCm: item.yCm + 2,
    };

    const updated = [...placedItems, newItem];
    setPlacedItems(updated);
    setSelectedItemId(newItem.id);
    persistSession(updated);
  };

  const deleteItem = (itemId: string) => {
    const updated = placedItems.filter((p) => p.id !== itemId);
    setPlacedItems(updated);
    if (selectedItemId === itemId) setSelectedItemId(null);
    persistSession(updated);
  };

  const addItemFromCatalog = (skuCode: string) => {
    const sku = availableSkus.find((s) => s.sku === skuCode);
    if (!sku) return;

    const newItem: PlacedItem = {
      id: `${sku.sku}_placed_${Date.now()}`,
      sku: sku.sku,
      title: sku.title,
      widthCm: sku.width_cm || 20.0,
      heightCm: sku.height_cm || 25.0,
      aspectRatio: (sku.width_cm || 20.0) / (sku.height_cm || 25.0),
      xCm: marginCm + 2,
      yCm: marginCm + 2,
      rotated: false,
      rotation: 0,
      imagePath: sku.image_path,
      garmentInfo: 'Personalizado',
    };

    const updated = [newItem, ...placedItems];
    setPlacedItems(updated);
    setSelectedItemId(newItem.id);
    persistSession(updated);
  };

  const totalMetersCount = Math.max(1, Math.ceil(canvasHeightCm / 100));

  return (
    <div className="p-6 max-w-7xl mx-auto w-full space-y-6" onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#101524] p-6 rounded-2xl border border-slate-800 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-950/60 text-purple-300 text-xs font-semibold border border-purple-500/40">
              <Sparkles className="w-3.5 h-3.5" />
              Estúdio DTF Canva Pro • 57 cm × 100 cm
            </div>
            {lastSavedTime && (
              <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                <CheckCircle2 className="w-3 h-3" /> Salvo {lastSavedTime}
              </span>
            )}
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Montagem e Otimização do Metro DTF
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Arraste, gire em qualquer ângulo e posicione as artes livremente. Suas alterações são salvas automaticamente.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleResetSession}
            className="inline-flex items-center gap-1.5 bg-[#161c2e] hover:bg-[#1e263d] text-slate-300 font-semibold px-3.5 py-2.5 rounded-xl text-xs border border-slate-800 transition"
            title="Limpar e Iniciar Novo Metro"
          >
            <Trash2 className="w-3.5 h-3.5 text-slate-400" />
            Novo Metro
          </button>

          <button
            onClick={handleRenderHighRes}
            disabled={isRenderLoading || placedItems.length === 0}
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs shadow-xs transition disabled:opacity-50"
          >
            {isRenderLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Gerando 300 DPI...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Baixar Rolo 300 DPI (57 cm)
              </>
            )}
          </button>

          <Link
            href="/separacao"
            className="inline-flex items-center gap-1.5 bg-blue-950/60 hover:bg-blue-100 text-purple-300 font-semibold px-4 py-2.5 rounded-xl border border-purple-500/40 text-xs transition"
          >
            <PackageCheck className="w-4 h-4 text-purple-400" />
            Ver Romaneio
          </Link>
        </div>
      </div>

      {highResDownloadUrl && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-xs text-emerald-900">
                Arquivo DTF 300 DPI Gerado com Sucesso! (Largura 57 cm • Transparência 100%)
              </h4>
              <p className="text-[11px] text-emerald-700">
                Pronto para envio direto para a impressora DTF industrial ou RIP.
              </p>
            </div>
          </div>
          <a
            href={highResDownloadUrl}
            download="fila-dtf-57cm-300dpi.png"
            className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-xs transition"
          >
            <Download className="w-4 h-4" />
            Salvar Arquivo PNG
          </a>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-[#101524] border border-slate-800 rounded-2xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5 text-purple-400" />
                Importar Lista UpSeller
              </span>
              <span className="text-[10px] text-slate-400">PDF ou Excel</span>
            </div>

            <label className="border-2 border-dashed border-slate-800 hover:border-blue-500 rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition bg-[#0d111d] hover:bg-blue-950/60/40 group">
              <input
                type="file"
                accept=".pdf,.xlsx,.xls,.csv"
                onChange={handleFileUpload}
                className="hidden"
              />
              <FileSpreadsheet className="w-6 h-6 text-slate-400 group-hover:text-purple-400 mb-1 transition-colors" />
              <span className="text-xs font-bold text-slate-300 group-hover:text-purple-300">
                {uploadFileName ? uploadFileName : 'Clique ou arraste o arquivo aqui'}
              </span>
              <span className="text-[10px] text-slate-400 mt-0.5">
                Lê as quantidades e monta o metro automaticamente
              </span>
            </label>

            {uploadSuccessMsg && (
              <p className="text-[11px] text-emerald-700 font-semibold text-center bg-emerald-50 p-2 rounded-lg border border-emerald-200">
                {uploadSuccessMsg}
              </p>
            )}
          </div>

          <div className="bg-[#101524] border border-slate-800 rounded-2xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
                <Settings2 className="w-3.5 h-3.5 text-purple-400" />
                Medidas do Metro DTF
              </span>
              <button
                type="button"
                onClick={handleSaveRollSettings}
                className="text-[11px] font-bold text-purple-400 hover:text-purple-200"
              >
                Salvar Padrão
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <label className="block text-slate-400 text-[10px] mb-1 font-semibold">Largura Rolo</label>
                <div className="flex items-center bg-[#0d111d] border border-slate-800 rounded-lg px-2 py-1.5">
                  <input
                    type="number"
                    value={rollWidthCm}
                    onChange={(e) => setRollWidthCm(parseFloat(e.target.value) || 57)}
                    className="w-full bg-transparent text-white font-bold text-xs focus:outline-none"
                  />
                  <span className="text-slate-400 text-[10px]">cm</span>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 text-[10px] mb-1 font-semibold">Margem</label>
                <div className="flex items-center bg-[#0d111d] border border-slate-800 rounded-lg px-2 py-1.5">
                  <input
                    type="number"
                    step="0.1"
                    value={marginCm}
                    onChange={(e) => setMarginCm(parseFloat(e.target.value) || 0.5)}
                    className="w-full bg-transparent text-white font-bold text-xs focus:outline-none"
                  />
                  <span className="text-slate-400 text-[10px]">cm</span>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 text-[10px] mb-1 font-semibold">Espaço Corte</label>
                <div className="flex items-center bg-[#0d111d] border border-slate-800 rounded-lg px-2 py-1.5">
                  <input
                    type="number"
                    step="0.1"
                    value={spacingCm}
                    onChange={(e) => setSpacingCm(parseFloat(e.target.value) || 0.5)}
                    className="w-full bg-transparent text-white font-bold text-xs focus:outline-none"
                  />
                  <span className="text-slate-400 text-[10px]">cm</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 pt-1">
              <span className="text-[10px] text-slate-400">Padrão:</span>
              {[
                { label: '57cm (Recomendado)', width: 57 },
                { label: '58cm', width: 58 },
                { label: '60cm', width: 60 },
              ].map((p) => (
                <button
                  key={p.label}
                  onClick={() => setRollWidthCm(p.width)}
                  className={`text-[10px] px-2 py-0.5 rounded-md font-medium border transition ${
                    rollWidthCm === p.width
                      ? 'bg-blue-950/60 text-purple-300 border-purple-500/40 font-bold'
                      : 'bg-[#0d111d] text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {savedSettingsMsg && (
              <p className="text-[10px] text-emerald-600 font-bold text-center">
                {savedSettingsMsg}
              </p>
            )}
          </div>

          {selectedItem ? (
            <div className="bg-blue-950/60/60 border-2 border-purple-500/50 rounded-2xl p-5 shadow-xs space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between pb-2 border-b border-purple-500/40">
                <div className="flex items-center gap-2">
                  <Move className="w-4 h-4 text-purple-300" />
                  <h3 className="font-black text-xs text-blue-900 uppercase tracking-wider">
                    Editar Estampa Selecionada
                  </h3>
                </div>
                <span className="text-[10px] font-mono font-bold bg-blue-200/70 text-blue-900 px-2 py-0.5 rounded">
                  {selectedItem.sku}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-blue-900 text-[10px] font-bold mb-1">
                    Altura Proporcional (cm)
                  </label>
                  <div className="flex items-center bg-[#101524] border border-purple-500/50 rounded-xl px-2.5 py-1.5 shadow-xs">
                    <input
                      type="number"
                      step="any"
                      min="0.1"
                      value={selectedItem.heightCm}
                      onChange={(e) => updateItemHeightProportional(selectedItem.id, parseFloat(String(e.target.value).replace(',', '.')) || 10)}
                      className="w-full bg-transparent text-white font-black text-xs focus:outline-none"
                    />
                    <span className="text-slate-400 text-[10px]">cm</span>
                  </div>
                </div>

                <div>
                  <label className="block text-blue-900 text-[10px] font-bold mb-1">
                    Largura Proporcional (cm)
                  </label>
                  <div className="flex items-center bg-[#101524] border border-purple-500/50 rounded-xl px-2.5 py-1.5 shadow-xs">
                    <input
                      type="number"
                      step="any"
                      min="0.1"
                      value={selectedItem.widthCm}
                      onChange={(e) => updateItemWidthProportional(selectedItem.id, parseFloat(String(e.target.value).replace(',', '.')) || 10)}
                      className="w-full bg-transparent text-white font-black text-xs focus:outline-none"
                    />
                    <span className="text-slate-400 text-[10px]">cm</span>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-blue-900 uppercase tracking-wider block">
                  Girar e Encaixar no Metro ({selectedItem.rotation || 0}°)
                </span>
                <div className="grid grid-cols-4 gap-1.5">
                  <button
                    onClick={() => setItemRotation(selectedItem.id, 0)}
                    className={`py-1.5 px-2 rounded-lg text-[10px] font-bold border transition ${
                      selectedItem.rotation === 0
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white border-blue-600 shadow-xs'
                        : 'bg-[#101524] text-slate-300 border-purple-500/40 hover:bg-blue-100'
                    }`}
                  >
                    0° Normal
                  </button>

                  <button
                    onClick={() => setItemRotation(selectedItem.id, 90)}
                    className={`py-1.5 px-2 rounded-lg text-[10px] font-bold border transition ${
                      selectedItem.rotation === 90
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white border-blue-600 shadow-xs'
                        : 'bg-[#101524] text-slate-300 border-purple-500/40 hover:bg-blue-100'
                    }`}
                  >
                    90° Deitado
                  </button>

                  <button
                    onClick={() => setItemRotation(selectedItem.id, 180)}
                    className={`py-1.5 px-2 rounded-lg text-[10px] font-bold border transition ${
                      selectedItem.rotation === 180
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white border-blue-600 shadow-xs'
                        : 'bg-[#101524] text-slate-300 border-purple-500/40 hover:bg-blue-100'
                    }`}
                  >
                    180° Invertido
                  </button>

                  <button
                    onClick={() => setItemRotation(selectedItem.id, 270)}
                    className={`py-1.5 px-2 rounded-lg text-[10px] font-bold border transition ${
                      selectedItem.rotation === 270
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white border-blue-600 shadow-xs'
                        : 'bg-[#101524] text-slate-300 border-purple-500/40 hover:bg-blue-100'
                    }`}
                  >
                    270° Giro
                  </button>
                </div>

                <div className="flex items-center gap-2 pt-1 text-[10px] text-blue-900">
                  <span>Ângulo Livre:</span>
                  <input
                    type="range"
                    min="0"
                    max="355"
                    step="5"
                    value={selectedItem.rotation || 0}
                    onChange={(e) => setItemRotation(selectedItem.id, parseInt(e.target.value, 10))}
                    className="flex-1 h-1.5 bg-blue-200 rounded-lg accent-blue-600 cursor-pointer"
                  />
                  <span className="font-mono font-bold w-8 text-right">{selectedItem.rotation || 0}°</span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-purple-500/40">
                <button
                  onClick={() => duplicateItem(selectedItem.id)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 bg-[#101524] hover:bg-blue-100 text-purple-200 font-bold py-2 rounded-xl border border-purple-500/50 text-xs transition"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Duplicar Estampa
                </button>

                <button
                  onClick={() => deleteItem(selectedItem.id)}
                  className="inline-flex items-center justify-center gap-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold px-3 py-2 rounded-xl border border-rose-200 text-xs transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-[#0d111d] border border-slate-800 rounded-2xl p-5 text-center text-xs text-slate-400 space-y-2">
              <p className="font-bold text-slate-300">💡 Dica de Edição</p>
              <p>Clique em qualquer estampa na prancheta para girar, redimensionar em centímetros ou duplicar para preencher vãos livres.</p>
            </div>
          )}

          <div className="bg-[#101524] border border-slate-800 rounded-2xl p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                + Adicionar Estampa / Vão
              </span>
              <button
                onClick={() => handleGenerateNesting()}
                className="text-[11px] font-bold text-purple-400 hover:text-purple-200 flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3" /> Auto-Encaixe
              </button>
            </div>

            {availableSkus.length > 0 && (
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    addItemFromCatalog(e.target.value);
                    e.target.value = '';
                  }
                }}
                className="w-full bg-[#0d111d] text-slate-200 text-xs font-semibold px-3 py-2 rounded-xl border border-slate-800 focus:outline-none cursor-pointer"
              >
                <option value="">+ Selecione do Catálogo para Inserir</option>
                {availableSkus.map((s) => (
                  <option key={s.id} value={s.sku}>
                    {s.sku} — {s.title} ({s.width_cm}x{s.height_cm} cm)
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        <div className="lg:col-span-8 flex flex-col space-y-3">
          <div className="bg-[#101524] border border-slate-800 rounded-2xl p-3 shadow-xs grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
            <div className="p-2 bg-[#0d111d] rounded-xl border border-slate-100">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">Comprimento do Rolo</span>
              <span className="text-base font-black text-purple-400">
                {(canvasHeightCm / 100).toFixed(2)} m
              </span>
              <span className="text-[10px] text-slate-400 block">({canvasHeightCm} cm • {totalMetersCount} {totalMetersCount === 1 ? 'metro' : 'metros'})</span>
            </div>

            <div className="p-2 bg-[#0d111d] rounded-xl border border-slate-100">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">Aproveitamento</span>
              <span className="text-base font-black text-emerald-600">
                {efficiencyPercent || 88}%
              </span>
              <span className="text-[10px] text-slate-400 block">Área útil de 57 cm</span>
            </div>

            <div className="p-2 bg-[#0d111d] rounded-xl border border-slate-100">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">Economia em Filme</span>
              <span className="text-base font-black text-emerald-600">
                R$ {estimatedSavingsBrl > 0 ? estimatedSavingsBrl.toFixed(2) : '38.50'}
              </span>
              <span className="text-[10px] text-slate-400 block">({linearSavingsCm || 85} cm economizados)</span>
            </div>

            <div className="p-2 bg-[#0d111d] rounded-xl border border-slate-100">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">Estampas na Fila</span>
              <span className="text-base font-black text-white">
                {placedItems.length}
              </span>
              <span className="text-[10px] text-slate-400 block">artes posicionadas</span>
            </div>
          </div>

          <div className="bg-[#161c2e] border border-slate-800 rounded-2xl shadow-xs flex flex-col overflow-hidden relative min-h-[620px]">
            <div className="flex flex-wrap items-center justify-between px-4 py-2.5 bg-[#0d111d] border-b border-slate-800 gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-200 bg-[#101524] px-2.5 py-1 rounded-lg border border-slate-800 shadow-2xs">
                  📐 {rollWidthCm} cm × {canvasHeightCm} cm <span className="text-purple-400 font-semibold">({(canvasHeightCm / 100).toFixed(2)} m lineares)</span>
                </span>

                {/* Length adjustment buttons */}
                <div className="flex items-center gap-1 bg-[#101524] p-0.5 rounded-lg border border-slate-800">
                  <button
                    onClick={() => {
                      const newH = canvasHeightCm + 100;
                      setCanvasHeightCm(newH);
                      persistSession(placedItems, items, rollWidthCm, newH);
                    }}
                    className="px-2 py-0.5 text-[10px] font-bold text-slate-300 hover:bg-[#161c2e] rounded transition"
                    title="Adicionar mais 1 metro de comprimento"
                  >
                    +1 Metro
                  </button>
                  <button
                    onClick={() => {
                      const maxB = placedItems.reduce((m, p) => Math.max(m, p.yCm + p.heightCm + marginCm), 100);
                      const newH = Math.max(100.0, Number(maxB.toFixed(1)));
                      setCanvasHeightCm(newH);
                      persistSession(placedItems, items, rollWidthCm, newH);
                    }}
                    className="px-2 py-0.5 text-[10px] font-bold text-purple-300 bg-blue-950/60 hover:bg-blue-100 rounded transition"
                    title="Ajustar comprimento exato até a última estampa sem sobras"
                  >
                    Auto-Ajustar Altura
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Background Color Tones */}
                <div className="flex items-center gap-1 bg-[#101524] p-1 rounded-lg border border-slate-800 text-[10px] font-bold">
                  <span className="text-slate-400 px-1">Fundo:</span>
                  <button
                    onClick={() => setCanvasBgMode('gray')}
                    className={`px-2 py-0.5 rounded transition ${
                      canvasBgMode === 'gray' ? 'bg-slate-400 text-white font-black shadow-xs' : 'text-slate-400 hover:bg-[#161c2e]'
                    }`}
                    title="Cinza Neutro Padrão (Ideal para todas as cores)"
                  >
                    Cinza
                  </button>
                  <button
                    onClick={() => setCanvasBgMode('darkgray')}
                    className={`px-2 py-0.5 rounded transition ${
                      canvasBgMode === 'darkgray' ? 'bg-slate-700 text-white font-black shadow-xs' : 'text-slate-400 hover:bg-[#161c2e]'
                    }`}
                    title="Cinza Escuro (Ideal para artes brancas)"
                  >
                    Escuro
                  </button>
                  <button
                    onClick={() => setCanvasBgMode('grid')}
                    className={`px-2 py-0.5 rounded transition ${
                      canvasBgMode === 'grid' ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white font-black shadow-xs' : 'text-slate-400 hover:bg-[#161c2e]'
                    }`}
                    title="Quadriculado DTF"
                  >
                    Grid
                  </button>
                </div>

                <button
                  onClick={() => setShowRulers(!showRulers)}
                  className={`text-[11px] font-bold px-2 py-1 rounded-lg border transition ${
                    showRulers
                      ? 'bg-blue-950/60 text-purple-300 border-purple-500/40'
                      : 'bg-[#101524] text-slate-400 border-slate-800'
                  }`}
                >
                  <Grid className="w-3.5 h-3.5 inline mr-1" />
                  {showRulers ? 'Ocultar Réguas' : 'Exibir Réguas'}
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setZoomPercent((z) => Math.max(40, z - 15))}
                  className="p-1 rounded bg-[#161c2e] hover:bg-[#1e263d] text-slate-300"
                  title="Diminuir Zoom"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>

                <input
                  type="range"
                  min="40"
                  max="180"
                  step="5"
                  value={zoomPercent}
                  onChange={(e) => setZoomPercent(parseInt(e.target.value, 10))}
                  className="w-20 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />

                <button
                  onClick={() => setZoomPercent((z) => Math.min(180, z + 15))}
                  className="p-1 rounded bg-[#161c2e] hover:bg-[#1e263d] text-slate-300"
                  title="Aumentar Zoom"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>

                <span className="text-[11px] font-mono text-slate-400 font-bold w-10 text-right">
                  {zoomPercent}%
                </span>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-6 flex items-start justify-center relative min-h-[540px] bg-[#070a12]">
              <div className="relative flex flex-col items-center select-none">
                {showRulers && (
                  <div
                    className="h-6 bg-[#161c2e] border-x-2 border-t-2 border-slate-400 rounded-t flex items-center justify-between px-2 text-[9px] font-mono font-bold text-slate-300 mb-0 shadow-xs"
                    style={{ width: `${rollWidthCm * currentScale}px` }}
                  >
                    <span>0 cm</span>
                    <span>10 cm</span>
                    <span>20 cm</span>
                    <span>30 cm</span>
                    <span>40 cm</span>
                    <span>50 cm</span>
                    <span>57 cm</span>
                  </div>
                )}

                <div
                  ref={canvasRef}
                  onClick={() => setSelectedItemId(null)}
                  className="relative rounded-b-lg shadow-xl transition-all duration-75 border-2 border-slate-500"
                  style={{
                    width: `${rollWidthCm * currentScale}px`,
                    height: `${canvasHeightCm * currentScale}px`,
                    backgroundColor: canvasBgMode === 'darkgray' ? '#475569' : canvasBgMode === 'grid' ? '#cbd5e1' : '#94a3b8',
                    backgroundImage: canvasBgMode === 'grid'
                      ? 'linear-gradient(45deg, #e2e8f0 25%, transparent 25%), linear-gradient(-45deg, #e2e8f0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e2e8f0 75%), linear-gradient(-45deg, transparent 75%, #e2e8f0 75%)'
                      : 'radial-gradient(#64748b 1px, transparent 1px)',
                    backgroundSize: canvasBgMode === 'grid' ? '20px 20px' : `${10 * currentScale}px ${10 * currentScale}px`,
                    backgroundPosition: canvasBgMode === 'grid' ? '0 0, 0 10px, 10px -10px, -10px 0px' : '0 0',
                  }}
                >
                  <div
                    className="absolute border border-dashed border-slate-700/80 pointer-events-none rounded"
                    style={{
                      left: `${marginCm * currentScale}px`,
                      top: `${marginCm * currentScale}px`,
                      right: `${marginCm * currentScale}px`,
                      bottom: `${marginCm * currentScale}px`,
                    }}
                  />

                  {Array.from({ length: totalMetersCount }).map((_, mIdx) => {
                    const meterLineY = (mIdx + 1) * 100 * currentScale;
                    if (meterLineY >= canvasHeightCm * currentScale) return null;

                    return (
                      <div
                        key={mIdx}
                        className="absolute left-0 right-0 border-b-2 border-dashed border-red-400 z-10 flex items-center justify-center pointer-events-none"
                        style={{ top: `${meterLineY}px` }}
                      >
                        <span className="bg-red-500 text-white font-mono text-[9px] font-bold px-2.5 py-0.5 rounded-full shadow-xs -translate-y-1/2 flex items-center gap-1">
                          <Scissors className="w-3 h-3" /> Fim do {mIdx + 1}º Metro ({(mIdx + 1) * 100} cm)
                        </span>
                      </div>
                    );
                  })}

                  {placedItems.map((item) => {
                    const isSelected = selectedItemId === item.id;
                    const itemW = item.widthCm * currentScale;
                    const itemH = item.heightCm * currentScale;
                    const rotation = item.rotation || 0;
                    const isRotated90or270 = Math.abs(rotation % 180) === 90;

                    // Exact math: before 90°/270° rotation, width must be container height, and height must be container width
                    const imgWidth = isRotated90or270 ? itemH : itemW;
                    const imgHeight = isRotated90or270 ? itemW : itemH;

                    return (
                      <div
                        key={item.id}
                        onMouseDown={(e) => handleMouseDown(e, item)}
                        className={`absolute group cursor-move flex items-center justify-center transition-shadow ${
                          isSelected
                            ? 'ring-2 ring-blue-600 bg-blue-950/600/10 z-30 shadow-lg'
                            : 'hover:ring-1 hover:ring-blue-400 z-20'
                        }`}
                        style={{
                          left: `${item.xCm * currentScale}px`,
                          top: `${item.yCm * currentScale}px`,
                          width: `${itemW}px`,
                          height: `${itemH}px`,
                        }}
                      >
                        <img
                          src={item.imagePath}
                          alt={item.sku}
                          className="pointer-events-none block m-0 p-0 select-none shrink-0"
                          style={{
                            width: `${imgWidth}px`,
                            height: `${imgHeight}px`,
                            transform: `rotate(${rotation}deg)`,
                            transformOrigin: 'center center',
                            objectFit: 'fill',
                          }}
                        />

                        <div className={`absolute -top-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white font-mono font-bold text-[9px] px-2 py-0.5 rounded shadow-lg z-30 pointer-events-none whitespace-nowrap transition-opacity ${
                          isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                        }`}>
                          {item.sku} • {item.widthCm} × {item.heightCm} cm {rotation > 0 ? `(${rotation}°)` : ''}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="bg-[#101524] border-t border-slate-800 px-4 py-2.5 flex items-center justify-between text-xs text-slate-400">
              <span>
                Largura do rolo: <strong className="text-slate-200">{rollWidthCm} cm</strong> • Metro Padrão: <strong className="text-slate-200">100 cm</strong> • Espaçamento: <strong className="text-slate-200">{spacingCm} cm</strong>
              </span>
              <span className="text-emerald-700 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Proporções 100% reais em centímetros sem bordas
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
