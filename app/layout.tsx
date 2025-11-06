import type { Metadata } from "next";
import "./globals.css";
import Providers from "../components/Providers";
import GridBackground from "../components/layout/GridBackground";
import { Exo_2 } from "next/font/google";
import AppChrome from "../components/layout/AppChrome";

// Use Exo 2 with SemiBold 600 Italic
const exo2 = Exo_2({
  subsets: ["latin"],
  weight: "600",
  style: "italic",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Slinko",
  description: "Solana-based gambling platform"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={exo2.className}>
        <div className="min-h-screen flex flex-col bg-background text-foreground relative overflow-hidden">
          <GridBackground />
          <Providers>
            <AppChrome>{children}</AppChrome>
          </Providers>
        </div>
      </body>
    </html>
  );
}