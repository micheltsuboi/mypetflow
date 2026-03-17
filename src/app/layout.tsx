import type { Metadata, Viewport } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";
import FooterCredits from "@/components/FooterCredits";
import SWRegistration from "@/components/SWRegistration";

const montserrat = Montserrat({
  subsets: ["latin"],
  display: 'swap',
  variable: '--font-montserrat',
});

export const metadata: Metadata = {
  title: "MyPet Flow | Sistema de Gestão para Pet Shops",
  description: "Sistema completo para gestão de Pet Shops, incluindo creche, hotel, banho e tosa.",
  keywords: ["pet shop", "banho e tosa", "hotel pet", "creche pet", "gestão pet shop"],
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'MyPet Flow',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0057ff',
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={montserrat.variable}>
      <body>
        <SWRegistration />
        {children}
        <FooterCredits />
      </body>
    </html>
  );
}
