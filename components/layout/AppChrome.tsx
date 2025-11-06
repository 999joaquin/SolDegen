"use client";

import React from "react";
import { usePathname } from "next/navigation";
import Header from "./Header";
import { Footer } from "./Footer";

type Props = {
  children: React.ReactNode;
};

export default function AppChrome({ children }: Props) {
  const pathname = usePathname();
  const hideChrome = pathname === "/";

  return (
    <div className="relative z-10 flex flex-col flex-grow">
      {!hideChrome && <Header />}
      <main className={hideChrome ? "min-h-screen w-full p-0" : "flex-grow w-full px-2 sm:px-3 md:px-4 lg:px-6 xl:px-8"}>
        {children}
      </main>
      {!hideChrome && <Footer />}
    </div>
  );
}