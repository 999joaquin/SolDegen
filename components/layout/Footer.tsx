"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Code, Book, ShieldCheck } from "lucide-react";

export function Footer() {
  return (
    <footer className="py-16 px-4 border-t border-purple-800/30">
      <div className="container mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <h3 className="text-2xl font-bold mb-4">
              <span className="bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text text-transparent">
                About SolDegen
              </span>
            </h3>
            <p className="text-purple-200 mb-6">
              SolDegen is a cutting-edge Solana-based gambling platform that offers provably fair games and lightning-fast transactions.
              Experience the thrill of Crash and Plinko with complete transparency and security.
            </p>
            <div className="bg-purple-900/20 border border-purple-800/30 rounded-lg p-6 backdrop-blur-sm">
              <div className="flex items-center space-x-3 mb-4">
                <Code className="w-5 h-5 text-purple-400" />
                <h4 className="text-lg font-semibold">Provably Fair</h4>
              </div>
              <p className="text-purple-200 text-sm mb-4">
                Our provably fair system uses a combination of server seed, client seed, and nonce to ensure that every game is 100% random and verifiable.
              </p>
              <div className="text-xs text-purple-300">
                <span className="font-semibold">Server Seed:</span> 7a4b...e8c2
                <br />
                <span className="font-semibold">Client Seed:</span> f9d6...a1b3
                <br />
                <span className="font-semibold">Nonce:</span> 127
              </div>
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-bold mb-4">
              <span className="bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text text-transparent">
                Explore
              </span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="text-lg font-semibold mb-2">Quick Links</h4>
                <ul className="space-y-2">
                  <li>
                    <a href="#" className="text-purple-200 hover:text-purple-300 transition-colors">
                      <span className="flex items-center space-x-2">
                        <Book className="w-4 h-4" />
                        <span>Games</span>
                      </span>
                    </a>
                  </li>
                  <li>
                    <a href="#" className="text-purple-200 hover:text-purple-300 transition-colors">
                      <span className="flex items-center space-x-2">
                        <ShieldCheck className="w-4 h-4" />
                        <span>Provably Fair</span>
                      </span>
                    </a>
                  </li>
                  <li>
                    <a href="#" className="text-purple-200 hover:text-purple-300 transition-colors">
                      <span className="flex items-center space-x-2">
                        <Code className="w-4 h-4" />
                        <span>API</span>
                      </span>
                    </a>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="text-lg font-semibold mb-2">Legal</h4>
                <ul className="space-y-2">
                  <li><a href="#" className="text-purple-200 hover:text-purple-300 transition-colors">Terms of Service</a></li>
                  <li><a href="#" className="text-purple-200 hover:text-purple-300 transition-colors">Privacy Policy</a></li>
                  <li><a href="#" className="text-purple-200 hover:text-purple-300 transition-colors">Responsible Gaming</a></li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        <div className="text-center mt-12">
          <p className="text-purple-300 text-sm">© 2024 SolDegen. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}