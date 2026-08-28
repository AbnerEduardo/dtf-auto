'use client';

import React, { useState, useEffect } from 'react';
import { 
  PackageCheck, 
  Printer, 
  Layers, 
  Shirt, 
  Copy, 
  Check, 
  FileText, 
  Boxes, 
  ClipboardList
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
  const [activeTab, setActiveTab] = useState<'fornecedor' | 'checklist'>('fornecedor');
  const [copied, setCopied] = useState(false);
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [summaryGroups, setSummaryGroups] = useState<GarmentGroup[]>([
    {
      garmentType: 'Camiseta Plus Size',
      totalPieces: 4,
      colors: [
        {
          colorName: 'Preto',
          sizes: [
            { sizeName: 'G1', quantity: 1, skus: [{ sku: 'DOCINHO-G1', quantity: 1 }] },
            { sizeName: 'G2', quantity: 3, skus: [{ sku: 'LINDINHA-G2', quantity: 1 }, { sku: 'DOCINHO-G2', quantity: 1 }, { sku: 'PALMEIRAS-G2', quantity: 1 }] }
          ]
        }
      ]
    },
    {
      garmentType: 'Camiseta Tradicional',
      totalPieces: 2,
      colors: [
        {
          colorName: 'Bege Areia',
          sizes: [
            { sizeName: 'GG', quantity: 1, skus: [{ sku: 'LINDINHA-GG', quantity: 1 }] }
          ]
        },
        {
          colorName: 'Preto',
          sizes: [
            { sizeName: 'GG', quantity: 1, skus: [{ sku: 'PALMEIRAS-GG', quantity: 1 }] }
          ]
        }
      ]
    },
    {
      garmentType: 'Moletom Canguru',
      totalPieces: 2,
      colors: [
        {
          colorName: 'Branco',
          sizes: [
            { sizeName: 'G', quantity: 1, skus: [{ sku: 'ESTRELAS-G', quantity: 1 }] },
            { sizeName: 'M', quantity: 1, skus: [{ sku: 'ESTRELAS-M', quantity: 1 }] }
          ]
        }
      ]
    },
    {
      garmentType: 'Camiseta Infantil',
      totalPieces: 2,
      colors: [
        {
          colorName: 'Preto',
          sizes: [
            { sizeName: '16', quantity: 1, skus: [{ sku: 'NARUTO-16', quantity: 1 }] }
          ]
        },
        {
          colorName: 'Bege Areia',
          sizes: [
            { sizeName: '8', quantity: 1, skus: [{ sku: 'PIKACHU-08', quantity: 1 }] }
          ]
        }
      ]
    }
  ]);

  const [sourceFilename, setSourceFilename] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/orders/parse')
      .then((res) => res.json())
      .then((data) => {
        if (data.pickingSummary && data.pickingSummary.length > 0) {
          setSummaryGroups(data.pickingSummary);
          if (data.batch) {
            setSourceFilename(data.batch.filename);
          }
        }
      })
      .catch((err) => console.error(err));
  }, []);

  const totalPieces = summaryGroups.reduce((acc, g) => acc + g.totalPieces, 0);
  const totalChecked = Object.values(checkedItems).filter(Boolean).length;

  const toggleCheck = (id: string) => {
    setCheckedItems((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const generateSupplierCleanText = () => {
    let text = 'PEDIDO DE PEÇAS LISAS\n\n';

    summaryGroups.forEach((group) => {
      group.colors.forEach((c) => {
        text += `${group.garmentType.toUpperCase()} - ${c.colorName.toUpperCase()}\n`;
        c.sizes.forEach((s) => {
          text += `${s.sizeName} - ${s.quantity}\n`;
        });
        text += '\n';
      });
    });

    text += '-----------------------------\n';
    text += `TOTAL: ${totalPieces} peças\n`;
    return text;
  };

  const handleCopySupplierText = () => {
    const text = generateSupplierCleanText();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccessMsg, setUploadSuccessMsg] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setIsUploading(true);
    setUploadSuccessMsg(null);

    try {
      const res = await fetch('/api/orders/parse', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.pickingSummary && data.pickingSummary.length > 0) {
        setSummaryGroups(data.pickingSummary);
        setSourceFilename(file.name);
        setUploadSuccessMsg(`✓ ${data.items?.length || data.totalPieces} peças importadas com sucesso de ${file.name}!`);
        setTimeout(() => setUploadSuccessMsg(null), 4000);
      } else {
        alert(data.error || 'Nenhum pedido compatível encontrado no arquivo.');
      }
    } catch (err: any) {
      console.error(err);
      alert('Erro ao processar arquivo: ' + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#101524] p-6 rounded-2xl border border-slate-800 shadow-xs">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-950/60 text-purple-300 text-xs font-semibold mb-1.5 border border-blue-500/30">
            <PackageCheck className="w-3.5 h-3.5" />
            Separação &amp; Fornecedor
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Romaneio de Peças Lisas
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {sourceFilename ? `Arquivo importado: ${sourceFilename}` : 'Importe seu PDF ou planilha do UpSeller para separar as peças.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label className="inline-flex items-center gap-2 bg-[#161c2e] hover:bg-[#1e263d] text-slate-200 font-bold px-4 py-2.5 rounded-xl text-xs transition cursor-pointer border border-slate-800">
            <input
              type="file"
              accept=".pdf,.xlsx,.xls,.csv"
              onChange={handleFileUpload}
              className="hidden"
            />
            <FileText className="w-4 h-4 text-purple-400" />
            {isUploading ? 'Importando PDF...' : 'Importar PDF UpSeller'}
          </label>

          <button
            onClick={handleCopySupplierText}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold px-4 py-2.5 rounded-xl text-xs transition"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" />
                Copiado com Sucesso!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copiar Lista do Fornecedor
              </>
            )}
          </button>

          <Link
            href="/fila"
            className="inline-flex items-center gap-1.5 bg-[#161c2e] hover:bg-[#1e263d] text-slate-300 font-semibold px-4 py-2.5 rounded-xl text-xs transition"
          >
            <Layers className="w-4 h-4 text-slate-400" />
            Ir para Fila DTF
          </Link>
        </div>
      </div>

      {uploadSuccessMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800 text-center">
          {uploadSuccessMsg}
        </div>
      )}


      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-800">
        <button
          onClick={() => setActiveTab('fornecedor')}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 transition ${
            activeTab === 'fornecedor'
              ? 'border-blue-600 text-purple-300 bg-[#101524] rounded-t-xl'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <FileText className="w-4 h-4" />
          Lista Pronta para Fornecedor (WhatsApp / Texto)
        </button>

        <button
          onClick={() => setActiveTab('checklist')}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 transition ${
            activeTab === 'checklist'
              ? 'border-blue-600 text-purple-300 bg-[#101524] rounded-t-xl'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <ClipboardList className="w-4 h-4" />
          Checklist de Separação de Estoque
        </button>
      </div>

      {/* Tab 1: Clean Supplier Text */}
      {activeTab === 'fornecedor' && (
        <div className="bg-[#101524] border border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              Texto Formatado para o Fornecedor ({totalPieces} peças)
            </span>
            <button
              onClick={handleCopySupplierText}
              className="text-xs font-bold text-purple-400 hover:text-blue-800 flex items-center gap-1"
            >
              <Copy className="w-3.5 h-3.5" />
              {copied ? 'Copiado!' : 'Copiar Tudo'}
            </button>
          </div>

          <pre className="bg-[#0d111d] border border-slate-800 rounded-xl p-5 text-xs text-slate-200 font-mono leading-relaxed whitespace-pre-wrap select-all">
            {generateSupplierCleanText()}
          </pre>
        </div>
      )}

      {/* Tab 2: Visual Interactive Checklist */}
      {activeTab === 'checklist' && (
        <div className="space-y-4">
          {summaryGroups.map((group, gIdx) => (
            <div
              key={gIdx}
              className="bg-[#101524] border border-slate-800 rounded-2xl p-5 shadow-xs space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-950/60 text-purple-400 flex items-center justify-center">
                    <Shirt className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-white">
                      {group.garmentType}
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Total: {group.totalPieces} {group.totalPieces === 1 ? 'peça' : 'peças'}
                    </p>
                  </div>
                </div>

                <span className="text-xs font-bold text-slate-200 bg-[#161c2e] px-3 py-1 rounded-lg">
                  {group.totalPieces} un.
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {group.colors.map((c, cIdx) => (
                  <div
                    key={cIdx}
                    className="bg-[#0d111d] border border-slate-800 rounded-xl p-4 space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-200">
                        Cor: {c.colorName}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {c.sizes.reduce((acc, s) => acc + s.quantity, 0)} peças
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      {c.sizes.map((s, sIdx) => {
                        const checkKey = `${group.garmentType}-${c.colorName}-${s.sizeName}`;
                        const isChecked = !!checkedItems[checkKey];

                        return (
                          <div
                            key={sIdx}
                            onClick={() => toggleCheck(checkKey)}
                            className={`flex items-center justify-between p-2 rounded-lg border transition cursor-pointer ${
                              isChecked
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                : 'bg-[#101524] border-slate-800 text-slate-300 hover:border-slate-300'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {}}
                                className="rounded text-purple-400 pointer-events-none"
                              />
                              <span className="font-bold text-xs">
                                Tamanho {s.sizeName}
                              </span>
                            </div>

                            <span className="font-mono font-bold text-xs bg-[#161c2e] px-2 py-0.5 rounded text-white">
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
      )}
    </div>
  );
}
