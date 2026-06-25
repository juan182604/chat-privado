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
    statusBarStyle: "default",
    startupImage: ["/icon-512.png"],
  },
};

// viewport-fit=cover is REQUIRED for env(safe-area-inset-*) to work in PWA mode
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
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="Chat Privado" />
        {/* Use default status bar style so the status bar has a solid background */}
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16.png" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <style dangerouslySetInnerHTML={{ __html: `
          :root {
            --safe-top: env(safe-area-inset-top, 0px);
            --safe-bottom: env(safe-area-inset-bottom, 0px);
            --safe-left: env(safe-area-inset-left, 0px);
            --safe-right: env(safe-area-inset-right, 0px);
          }
          html {
            box-sizing: border-box;
          }
          *, *::before, *::after {
            box-sizing: inherit;
          }
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: #0a0a0a;
          }
          /* App container: fixed full-screen with safe area padding */
          #app-root {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            padding-top: calc(var(--safe-top) + 20px);
            padding-bottom: calc(var(--safe-bottom) + 20px);
            padding-left: calc(var(--safe-left) + 8px);
            padding-right: calc(var(--safe-right) + 8px);
            overflow: hidden;
          }
        `}} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-zinc-950 text-zinc-100`}
      >
        <div id="app-root">
          {children}
        </div>
        <Toaster />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
