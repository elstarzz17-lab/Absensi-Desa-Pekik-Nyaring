import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Konektivitas Gajah Seblat · Prototipe GIS",
  description:
    "Rancangan eksplorasi GIS potensi konektivitas habitat gajah di sekitar TWA Seblat. Peta bersifat skematis dan bukan hasil analisis atau data pergerakan satwa.",
};

export default function KonektivitasGajahLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
