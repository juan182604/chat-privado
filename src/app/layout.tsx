import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Chat Privado — ID-based, auto-borrado 10h",
  description: "Chat privado estilo WhatsApp con IDs únicos de 6 caracteres, llamadas, fotos y notas de voz. Auto-borrado a las 10 horas.",
  keywords: ["chat", "privado", "mensajería", "auto-delete", "ID"],
  authors: [{ name: "Croki" }],
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  appleWebApp: {
    capable: true,
    title: "Chat Privado",
    statusBarStyle: "black-translucent",
    startupImage: ["/icon-512.png"],
  },
};

// Use viewport-fit=contain instead of cover so the content does NOT go
// under the notch / home indicator. This makes the app appear slightly
// smaller (with black bars at the edges) but guarantees all buttons are
// fully tappable on iPhone.
export const viewport: Viewport = {
  themeColor: "#10b981",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "contain",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        {/* iOS PWA meta tags */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="Chat Privado" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16.png" />
        <link rel="shortcut icon" href="/favicon.ico" />
        {/* Extra safe area padding via CSS variables */}
        <style dangerouslySetInnerHTML={{ __html: `
          :root {
            --safe-top: env(safe-area-inset-top, 0px);
            --safe-bottom: env(safe-area-inset-bottom, 0px);
            --safe-left: env(safe-area-inset-left, 0px);
            --safe-right: env(safe-area-inset-right, 0px);
          }
          html, body {
            box-sizing: border-box;
          }
          body {
            padding-top: calc(var(--safe-top) + 16px) !important;
            padding-bottom: calc(var(--safe-bottom) + 16px) !important;
            padding-left: calc(var(--safe-left) + 8px) !important;
            padding-right: calc(var(--safe-right) + 8px) !important;
          }
          header {
            padding-top: calc(var(--safe-top) + 12px) !important;
            margin-top: 0 !important;
          }
          footer, nav {
            padding-bottom: calc(var(--safe-bottom) + 10px) !important;
            margin-bottom: 0 !important;
          }
        `}} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-zinc-950 text-zinc-100`}
      >
        {children}
        <Toaster />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
