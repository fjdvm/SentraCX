import type { Metadata } from "next";
import { Hanken_Grotesk, Geist_Mono } from "next/font/google";
import { AppShell } from "@/components/shared/AppShell";
import { SessionProvider } from "next-auth/react";
import "./globals.css";

const hankenGrotesk = Hanken_Grotesk({
  variable: "--font-hanken-grotesk",
  subsets: ["latin"],
});
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SentraCX - Customer Relations",
  description: "Enterprise Portal",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${hankenGrotesk.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-screen bg-background text-foreground font-sans">
        <SessionProvider>
          <AppShell>{children}</AppShell>
        </SessionProvider>
      </body>
    </html>
  );
}
