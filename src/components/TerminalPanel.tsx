import React from 'react';
import { Terminal } from 'lucide-react';
import { LogEntry } from '../types';

interface TerminalPanelProps {
  logs: LogEntry[];
  onClearLogs: () => void;
  terminalEndRef: React.RefObject<HTMLDivElement | null>;
  className?: string;
}

export const TerminalPanel: React.FC<TerminalPanelProps> = ({
  logs,
  onClearLogs,
  terminalEndRef,
  className = ''
}) => {
  return (
    <div className={`bg-slate-950 rounded-2xl border border-slate-800 p-4 shadow-sm flex flex-col h-[640px] xl:h-[800px] ${className}`}>
      {/* Terminal Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-xs">
        <div className="flex items-center space-x-2">
          <div className="flex space-x-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
          </div>
          <span className="text-slate-400 font-mono ml-2 flex items-center space-x-1.5">
            <Terminal className="w-3.5 h-3.5 text-emerald-400" />
            <span>osnm-terminal-stream</span>
          </span>
        </div>
        <div className="flex items-center space-x-3">
          <span className="text-[10px] font-mono text-slate-500">{logs.length} 行记录</span>
          <button
            onClick={onClearLogs}
            className="text-[11px] text-slate-400 hover:text-slate-200 font-mono cursor-pointer transition-colors"
          >
            清空日志
          </button>
        </div>
      </div>

      {/* Scrollable Logs Output */}
      <div className="flex-1 overflow-y-auto py-3 space-y-2 font-mono text-xs leading-relaxed scrollbar-thin scrollbar-thumb-slate-800">
        {logs.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-600 text-xs font-mono">
            暂无日志记录，触发操作后将在此实时输出...
          </div>
        ) : (
          logs.map((log, idx) => (
            <div key={idx} className="flex items-start space-x-2 hover:bg-slate-900/50 p-0.5 rounded transition-colors">
              <span className="text-slate-600 shrink-0 text-[10px] mt-0.5 select-none">{log.timestamp}</span>
              {log.level === 'cmd' && <span className="text-emerald-400 font-bold break-all">{log.message}</span>}
              {log.level === 'info' && <span className="text-slate-300 break-all">{log.message}</span>}
              {log.level === 'success' && <span className="text-emerald-400 break-all">{log.message}</span>}
              {log.level === 'warn' && <span className="text-amber-400 break-all">{log.message}</span>}
              {log.level === 'error' && <span className="text-rose-400 font-bold break-all">{log.message}</span>}
            </div>
          ))
        )}
        <div ref={terminalEndRef} />
      </div>

      {/* Terminal Command Line Footer */}
      <div className="pt-2.5 border-t border-slate-800 flex items-center space-x-2 text-xs font-mono text-slate-400">
        <span className="text-emerald-400 font-bold select-none">&gt;</span>
        <span className="text-slate-500 text-[11px] truncate">
          准备就绪 · 点击抢购工作台或资金控制台按键触发链上调度
        </span>
      </div>
    </div>
  );
};
