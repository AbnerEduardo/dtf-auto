import type { Metadata } from "next";
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
      <body className="bg-[#0a0d14] text-slate-100 flex min-h-screen antialiased selection:bg-purple-500/30 selection:text-purple-200">
        <Sidebar />
        <main className="flex-1 flex flex-col min-w-0 overflow-y-auto bg-[#0a0d14]">
          {children}
        </main>
      </body>
    </html>
  );
}
