"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Code, Book, ShieldCheck, Twitter, Github, Instagram } from "lucide-react";
import Image from "next/image";

export function Footer() {
  return (
    <footer className="bg-gray-900 border-t border-gray-800 py-16 px-4 relative overflow-hidden">
      {/* Glowing Orbs Background */}
      <div className="absolute inset-0">
        <div className="absolute top-10 left-10 w-32 h-32 bg-purple-600 rounded-full opacity-20 blur-3xl animate-pulse"></div>
        <div className="absolute top-1/3 right-20 w-40 h-40 bg-blue-600 rounded-full opacity-15 blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute bottom-20 left-1/4 w-36 h-36 bg-indigo-600 rounded-full opacity-20 blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute bottom-10 right-1/3 w-28 h-28 bg-violet-600 rounded-full opacity-15 blur-3xl animate-pulse" style={{ animationDelay: '0.5s' }}></div>
      </div>
      
      <div className="container mx-auto relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center space-x-3 mb-6">
              <Image 
                src="/logo.png" 
                alt="SolDegen Logo" 
                width={40} 
                height={40}
                className="rounded-lg"
              />
              <h3 className="text-2xl font-bold">
                <span className="bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text text-transparent">
                  SolDegen
                </span>
              </h3>
            </div>
            <p className="text-gray-300 mb-6">
              SolDegen is a cutting-edge Solana-based gambling platform that offers provably fair games and lightning-fast transactions.
              Experience the thrill of Crash and Plinko with complete transparency and security.
            </p>
            <div className="flex space-x-4">
              <a 
                href="https://twitter.com/soldegen" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-purple-400 transition-colors"
              >
                <Twitter className="w-5 h-5" />
              </a>
              <a 
                href="https://github.com/soldegen" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-purple-400 transition-colors"
              >
                <Github className="w-5 h-5" />
              </a>
              <a 
                href="https://instagram.com/soldegen" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-purple-400 transition-colors"
              >
                <Instagram className="w-5 h-5" />
              </a>
            </div>
          </div>
          
          <div>
            <h3 className="text-xl font-bold mb-4">
              <span className="bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text text-transparent">
                Quick Links
              </span>
            </h3>
            <ul className="space-y-3">
              <li>
                <a href="#" className="text-gray-300 hover:text-purple-400 transition-colors">
                  <span className="flex items-center space-x-2">
                    <Book className="w-4 h-4" />
                    <span>Games</span>
                  </span>
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-300 hover:text-purple-400 transition-colors">
                  <span className="flex items-center space-x-2">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Provably Fair</span>
                  </span>
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-300 hover:text-purple-400 transition-colors">
                  <span className="flex items-center space-x-2">
                    <Code className="w-4 h-4" />
                    <span>API</span>
                  </span>
                </a>
              </li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-xl font-bold mb-4">
              <span className="bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text text-transparent">
                Legal
              </span>
            </h3>
            <ul className="space-y-3">
              <li><a href="#" className="text-gray-300 hover:text-purple-400 transition-colors">Terms of Service</a></li>
              <li><a href="#" className="text-gray-300 hover:text-purple-400 transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="text-gray-300 hover:text-purple-400 transition-colors">Responsible Gaming</a></li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-gray-700 mt-12 pt-8">
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6 backdrop-blur-sm mb-8">
            <div className="flex items-center space-x-3 mb-4">
              <Code className="w-5 h-5 text-purple-400" />
              <h4 className="text-lg font-semibold text-gray-200">Provably Fair</h4>
            </div>
            <p className="text-gray-300 text-sm mb-4">
              Our provably fair system uses a combination of server seed, client seed, and nonce to ensure that every game is 100% random and verifiable.
            </p>
            <div className="text-xs text-gray-400">
              <span className="font-semibold">Server Seed:</span> 7a4b...e8c2
              <br />
              <span className="font-semibold">Client Seed:</span> f9d6...a1b3
              <br />
              <span className="font-semibold">Nonce:</span> 127
            </div>
          </div>
          
          <div className="text-center">
            <p className="text-gray-400 text-sm">© 2024 SolDegen. All rights reserved.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}