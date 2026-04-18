import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Qiada — Patente in Arabo",
  description: "Preparati all'esame della patente italiana in arabo e italiano",
  manifest: "/manifest.json",
  themeColor: "#2563eb",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Qiada",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
