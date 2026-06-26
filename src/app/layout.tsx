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
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <style dangerouslySetInnerHTML={{ __html: `
          * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; margin: 0; padding: 0; }
          html, body {
            width: 100%; height: 100%;
            overflow: hidden; background: #000;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          }
          /* PADDING DIRECTO EN BODY — sin #app-shell, sin vh tricks.
             60px arriba y 50px abajo garantiza espacio en TODOS los iPhones.
             El contenido se reduce automáticamente. */
          body {
            padding-top: 60px !important;
            padding-bottom: 50px !important;
            padding-left: 6px !important;
            padding-right: 6px !important;
          }
          /* El contenido ocupa el 100% del espacio restante */
          #app-content {
            width: 100%;
            height: 100%;
            background: #0a0a0a;
            overflow: hidden;
            position: relative;
          }
        `}} />
        {/* ELIMINAR service workers viejos */}
        <script dangerouslySetInnerHTML={{ __html: `
          if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then(function(r) { r.forEach(function(x) { x.unregister(); }); });
            caches.keys().then(function(n) { n.forEach(function(name) { caches.delete(name); }); });
          }
        `}} />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`} style={{ background: '#000' }}>
        <div id="app-content" style={{ width: '100%', height: '100%', background: '#0a0a0a', overflow: 'hidden', position: 'relative' }}>
          {children}
        </div>
        <Toaster />
      </body>
    </html>
  );
}
