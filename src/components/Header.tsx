import React from 'react';
import { Terminal, Cpu, ExternalLink, Activity } from 'lucide-react';
import { REPO_META } from '../data/osnmData';

export const Header: React.FC = () => {
  return (
    <header className="border-b border-slate-200 bg-white/95 backdrop-blur sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Title */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-mono font-bold shadow-sm">
              <Terminal className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-slate-900 text-lg tracking-tight">
                  {REPO_META.name}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono">
                  实操控制台
                </span>
                <span className="hidden sm:inline-flex text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-mono">
                  Rust 2024
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                OpenSea NFT Minter 抢购调度与 EIP-7702 代付测试环境
              </p>
            </div>
          </div>

          {/* Right Status & Quick Actions */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            <div className="flex items-center space-x-2 text-xs text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-mono font-medium hidden sm:inline">Engine Online</span>
              <span className="font-mono font-medium sm:hidden">Online</span>
            </div>

            <div className="hidden md:flex items-center space-x-1.5 text-xs text-slate-600 bg-slate-100/80 px-3 py-1.5 rounded-lg border border-slate-200">
              <Cpu className="w-3.5 h-3.5 text-indigo-500" />
              <span>EIP-7702 & EIP-1153</span>
            </div>

            <a
              id="github-repo-link"
              href={REPO_META.githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-sm"
            >
              <span>GitHub 源码</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>
    </header>
  );
};
