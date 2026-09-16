import React from 'react';
import { Header } from './components/Header';
import { InteractiveTester } from './components/InteractiveTester';
import { REPO_META } from './data/osnmData';
import { ExternalLink } from 'lucide-react';

export default function App() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      {/* Top Header */}
      <Header />

      {/* Main Interactive Console Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <InteractiveTester />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-slate-800">{REPO_META.name}</span>
            <span>—</span>
            <span>{REPO_META.fullName}</span>
            <span>({REPO_META.edition})</span>
          </div>

          <div className="flex items-center space-x-4">
            <span className="text-slate-400">开源协议: {REPO_META.license}</span>
            <a
              href={REPO_META.githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-slate-900 inline-flex items-center space-x-1 underline underline-offset-4"
            >
              <span>GitHub 原仓库</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
