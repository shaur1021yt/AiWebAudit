import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { Providers } from "@/components/Providers";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "SiteAudit AI — Find Out What's Hurting Your Website",
  description:
    "Scan your website for SEO, performance, accessibility, security, content, and conversion problems in minutes. Free audit available.",
  keywords: ["website audit", "SEO audit", "website analysis", "performance test", "accessibility check"],
  openGraph: {
    title: "SiteAudit AI — Find Out What's Hurting Your Website",
    description: "Scan your website for problems in minutes. Free audit available.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrains.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>
          <Nav />
          <main className="flex-1">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
