"use client";

import React from "react";
import { Hero } from "@/components/Hero";

export default function AppHomePage() {
  return (
    <div className="min-h-[calc(100vh-120px)] flex flex-col items-center justify-center text-center p-4">
      <Hero />
    </div>
  );
}
