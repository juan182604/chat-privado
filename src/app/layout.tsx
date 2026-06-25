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
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16.png" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <style dangerouslySetInnerHTML={{ __html: `
          * { box-sizing: border-box; }
          html, body {
            margin: 0;
            padding: 0;
            width: 100%;
            height: 100%;
            overflow: hidden;
            background: #000;
          }
          /* The app container uses percentage-based sizing that works
             reliably on iOS PWA. 92vh leaves ~8% for safe areas. */
          #app-shell {
            width: 100%;
            height: 92vh;
            margin: 0 auto;
            padding: 0;
            background: #0a0a0a;
            overflow: hidden;
            position: relative;
          }
          @media (max-width: 768px) {
            #app-shell {
              height: 91vh;
            }
          }
        `}} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        style={{ background: '#000' }}
      >
        <div id="app-shell">
          {children}
        </div>
        <Toaster />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
