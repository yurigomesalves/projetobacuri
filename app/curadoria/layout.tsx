import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Curadoria — Memória e Verdade",
  robots: { index: false, follow: false },
};

export default function CuradoriaLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
