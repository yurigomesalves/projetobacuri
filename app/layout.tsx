import type { Metadata } from "next";
import "./globals.css";
import Cabecalho from "./componentes/Cabecalho";

export const metadata: Metadata = {
  title: "Projeto Bacuri",
  description:
    "Acervo digital e chatbot documental sobre a Ditadura Civil-Militar no Brasil (1964–1985), com fontes históricas citadas em todas as respostas.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="flex h-full flex-col">
        <Cabecalho />
        {children}
      </body>
    </html>
  );
}
