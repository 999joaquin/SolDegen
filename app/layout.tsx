import type { Metadata } from "next";
import "./globals.css";
import Providers from "../components/Providers";
import Header from "../components/layout/Header";
import { Footer } from "../components/layout/Footer";
import GridBackground from "../components/layout/GridBackground";

export const metadata: Metadata = {
  title: "SolDegen Next",
  description: "Solana-based gambling platform (Next.js)"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen flex flex-col bg-background text-foreground relative overflow-hidden">
          <GridBackground />
          <Providers>
            <div className="relative z-10 flex flex-col flex-grow">
              <Header />
              <main className="flex-grow container mx-auto p-4">{children}</main>
              <Footer />
            </div>
          </Providers>
        </div>
      </body>
    </html>
  );
}