import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SerwistProvider } from "./serwist";

export const metadata: Metadata = {
  applicationName: "Qiada",
  title: "Qiada — Patente in Arabo",
  description: "Preparati all'esame della patente italiana in arabo e italiano",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Qiada",
  },
};

export const viewport: Viewport = {
  themeColor: "#2563eb",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SerwistProvider swUrl="/serwist/sw.js">
      {children}
    </SerwistProvider>
  );
}
