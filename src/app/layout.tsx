import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Chat Privado",
  description: "Chat privado estilo WhatsApp con IDs únicos.",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    title: "Chat Privado",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#10b981",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="Chat Privado" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        {/* NO CACHE — force browser to always load fresh */}
        <meta httpEquiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
        <meta httpEquiv="Pragma" content="no-cache" />
        <meta httpEquiv="Expires" content="0" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <style dangerouslySetInnerHTML={{ __html: `
          * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; margin: 0; padding: 0; }
          html, body {
            width: 100%; height: 100%;
            overflow: hidden; background: #000;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          }
          /* PADDING FIJO EN BODY — 70px arriba, 55px abajo.
             Esto empuja TODO el contenido hacia abajo, incluyendo
             headers sticky y fixed, porque el body es el contenedor raíz. */
          body {
            padding-top: 70px !important;
            padding-bottom: 55px !important;
            padding-left: 8px !important;
            padding-right: 8px !important;
          }
          /* IMPORTANTE: anular sticky/fixed que ignoran el padding */
          header, [class*="sticky"], [class*="fixed"] {
            top: auto !important;
            position: relative !important;
          }
          /* El contenedor de la app */
          #app-content {
            width: 100%;
            height: 100%;
            background: #0a0a0a;
            overflow: hidden;
            position: relative;
          }
        `}} />
        {/* Eliminar service workers viejos ANTES de que cargue la página */}
        <script dangerouslySetInnerHTML={{ __html: `
          if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then(function(r) {
              r.forEach(function(x) { x.unregister(); });
            });
          }
          if ('caches' in window) {
            caches.keys().then(function(n) { n.forEach(function(name) { caches.delete(name); }); });
          }
        `}} />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`} style={{ background: '#000' }}>
        <div id="app-content">{children}</div>
        <Toaster />
      </body>
    </html>
  );
}
