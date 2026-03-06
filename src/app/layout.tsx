import type { Metadata, Viewport } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";
import FooterCredits from "@/components/FooterCredits";

const montserrat = Montserrat({
  subsets: ["latin"],
  display: 'swap',
  variable: '--font-montserrat',
});

export const metadata: Metadata = {
  title: "MyPet Flow | Sistema de Gestão para Pet Shops",
  description: "Sistema completo para gestão de Pet Shops, incluindo creche, hotel, banho e tosa.",
  keywords: ["pet shop", "banho e tosa", "hotel pet", "creche pet", "gestão pet shop"],
  icons: {
    icon: '/icon.png',
    apple: '/apple-icon.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={montserrat.variable}>
      <head>
        <link rel="icon" href="/icon.png" />
      </head>
      <body>
        {children}
        <FooterCredits />
      </body>
    </html>
  );
}
