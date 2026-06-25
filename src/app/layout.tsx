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
          * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
          html, body {
            margin: 0; padding: 0; width: 100%; height: 100%;
            overflow: hidden; background: #000;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          }
          /* FIXED PIXEL PADDING — works on ALL iPhones regardless of env() support.
             Notch iPhones need ~50px top, ~34px bottom.
             We use max() so it works on both notch and non-notch phones. */
          #app-shell {
            width: 100%;
            height: 100%;
            padding-top: max(50px, env(safe-area-inset-top, 50px));
            padding-bottom: max(40px, env(safe-area-inset-bottom, 40px));
            padding-left: max(8px, env(safe-area-inset-left, 8px));
            padding-right: max(8px, env(safe-area-inset-right, 8px));
            background: #0a0a0a;
            overflow: hidden;
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
          }
        `}} />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`} style={{ background: '#000' }}>
        <div id="app-shell">{children}</div>
        <Toaster />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
