import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Navigation from "@/components/Navigation";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "DrevMaster — управление заказами",
  description: "Учет заказов, кассы и займов в торговле древесиной",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru" className={inter.variable}>
      <body>
        <Navigation>{children}</Navigation>
      </body>
    </html>
  );
}
