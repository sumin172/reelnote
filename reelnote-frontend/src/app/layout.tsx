import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppProviders } from "./providers";
import { Header } from "@/domains/shared/components/layout/Header";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "ReelNote",
    template: "%s | ReelNote",
  },
  description: "영화 리뷰와 카탈로그, 분석을 한 곳에서",
  metadataBase: new URL("https://example.com"),
  icons: [{ rel: 'icon', url: '/favicon.ico' }],
  openGraph: {
    title: "ReelNote",
    description: "영화 리뷰와 카탈로그, 분석을 한 곳에서",
    type: 'website',
    url: 'https://example.com',
    siteName: 'ReelNote',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AppProviders>
          <Header />
          <main className="min-h-[calc(100vh-3.5rem)]">{children}</main>
        </AppProviders>
      </body>
    </html>
  );
}
