import type { Metadata } from "next";
import "./globals.css";
import Providers from "../components/Providers";
import Header from "../components/layout/Header";
import { Footer } from "../components/layout/Footer";
import GridBackground from "../components/layout/GridBackground";
import { Exo_2 } from "next/font/google";
import { usePathname } from "next/navigation";

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
  const pathname = usePathname();
  const hideChrome = pathname === "/";

  return (
    <html lang="en">
      <body className={exo2.className}>
        <div className="min-h-screen flex flex-col bg-background text-foreground relative overflow-hidden">
          <GridBackground />
          <Providers>
            <div className="relative z-10 flex flex-col flex-grow">
              {!hideChrome && <Header />}
              <main className={hideChrome ? "min-h-screen w-full p-0" : "flex-grow w-full px-2 sm:px-3 md:px-4 lg:px-6 xl:px-8"}>
                {children}
              </main>
              {!hideChrome && <Footer />}
            </div>
          </Providers>
        </div>
      </body>
    </html>
  );
}