import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import Estrutura from "./componentes/Estrutura";

const inter = localFont({
  src: "../public/fontes/InterVariable.woff2",
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "projeto_BACURI",
  description:
    "Acervo digital e chatbot documental sobre a Ditadura Militar-Empresarial no Brasil (1964–1985), com fontes históricas citadas em todas as respostas.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${inter.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex h-full flex-col">
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('bacuri-tema')||'sistema';document.documentElement.dataset.theme=t==='sistema'?(matchMedia('(prefers-color-scheme: dark)').matches?'escuro':'claro'):t}catch(e){document.documentElement.dataset.theme=matchMedia('(prefers-color-scheme: dark)').matches?'escuro':'claro'}})()`,
          }}
        />
        <Estrutura>{children}</Estrutura>
      </body>
    </html>
  );
}
