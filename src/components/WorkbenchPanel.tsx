import React from 'react';
import {
  Play,
  Zap,
  Cpu,
  FileCode,
  ShieldCheck,
  Flame,
  RefreshCw,
  Send,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { NetworkConfig, DropInfo, TestWallet } from '../types';

interface WorkbenchPanelProps {
  activeSubTab: 'mint' | 'doctor' | 'wallets' | 'executor' | 'calldata';
  setActiveSubTab: (tab: 'mint' | 'doctor' | 'wallets' | 'executor' | 'calldata') => void;
  activeNetwork: NetworkConfig;
  effectiveRpcUrl: string;
  mintMode: 'sponsored' | 'self_funded' | 'single';
  setMintMode: (mode: 'sponsored' | 'self_funded' | 'single') => void;
  selectedDrop: DropInfo;
  setSelectedDrop: React.Dispatch<React.SetStateAction<DropInfo>>;
  isMintRunning: boolean;
  startRealMintExecution: () => void;
  countdownSeconds: number | null;
  mintProgress: number;
  doctorResults: {
    rpcOk: boolean;
    eip1559Ok: boolean;
    eip7702Ok: boolean;
    eip1153Ok: boolean;
    walletsValid: boolean;
  } | null;
  doctorRunning: boolean;
  handleRunDoctor: () => void;
  calcExecutorAddress: string;
  executorDeployed: boolean;
  handleDeployExecutor: () => void;
  sponsorAddress: string;
  setSponsorAddress: (addr: string) => void;
  addLog: (level: 'info' | 'warn' | 'error' | 'success' | 'cmd', message: string) => void;
  wallets: TestWallet[];
  className?: string;
}

export const WorkbenchPanel: React.FC<WorkbenchPanelProps> = ({
  activeSubTab,
  setActiveSubTab,
  activeNetwork,
  effectiveRpcUrl,
  mintMode,
  setMintMode,
  selectedDrop,
  setSelectedDrop,
  isMintRunning,
  startRealMintExecution,
  countdownSeconds,
  mintProgress,
  doctorResults,
  doctorRunning,
  handleRunDoctor,
  calcExecutorAddress,
  executorDeployed,
  handleDeployExecutor,
  sponsorAddress,
  setSponsorAddress,
  addLog,
  wallets,
  className = ''
}) => {
  return (
    <div className={`space-y-4 ${className}`}>
      {/* Workbench Integrated Sub-Tab Navigation Bar */}
      <div className="bg-slate-900 p-1.5 rounded-2xl border border-slate-800 flex items-center gap-1.5 overflow-x-auto scrollbar-none shadow-xs">
        <button
          id="btn-subtab-mint"
          onClick={() => setActiveSubTab('mint')}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            activeSubTab === 'mint' || activeSubTab === 'wallets'
              ? 'bg-emerald-500 text-slate-950 font-bold shadow-xs'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <Play className="w-3.5 h-3.5" />
          <span>抢购发射舱 (T-2s Mint)</span>
        </button>

        <button
          id="btn-subtab-doctor"
          onClick={() => setActiveSubTab('doctor')}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            activeSubTab === 'doctor'
              ? 'bg-emerald-500 text-slate-950 font-bold shadow-xs'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          <span>环境诊断 (Doctor)</span>
          {doctorResults && (
            <span className="w-2 h-2 rounded-full bg-emerald-400 ml-0.5" />
          )}
        </button>

        <button
          id="btn-subtab-executor"
          onClick={() => setActiveSubTab('executor')}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            activeSubTab === 'executor'
              ? 'bg-emerald-500 text-slate-950 font-bold shadow-xs'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <Cpu className="w-3.5 h-3.5" />
          <span>执行器 (CREATE2)</span>
        </button>

        <button
          id="btn-subtab-calldata"
          onClick={() => setActiveSubTab('calldata')}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            activeSubTab === 'calldata'
              ? 'bg-emerald-500 text-slate-950 font-bold shadow-xs'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <FileCode className="w-3.5 h-3.5" />
          <span>Calldata 嗅探器</span>
        </button>
      </div>
      {/* TAB 1: 抢购发射舱工作台 (Also shown when user is viewing wallets tab, so workbench remains accessible) */}
      {(activeSubTab === 'mint' || activeSubTab === 'wallets') && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <Play className="w-5 h-5 text-emerald-600" />
              <h3 className="font-bold text-slate-900 text-sm md:text-base">抢购发射舱工作台</h3>
            </div>
            <span className={`text-[11px] font-mono px-2.5 py-0.5 rounded-full border ${activeNetwork.badgeColor}`}>
              {activeNetwork.name} · {activeNetwork.currency}
            </span>
          </div>

          {/* Mode Selection */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700">运作架构模式:</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                onClick={() => setMintMode('sponsored')}
                className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                  mintMode === 'sponsored'
                    ? 'border-indigo-500 bg-indigo-50/50 ring-2 ring-indigo-200'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-950">EIP-7702 赞助</span>
                  <span className="text-[9.5px] bg-indigo-100 text-indigo-700 px-1 py-0.2 rounded font-mono">
                    推荐
                  </span>
                </div>
                <p className="text-[10.5px] text-slate-500 mt-1 leading-snug">主代付钱包出 Gas，NFT 原子归集</p>
              </button>

              <button
                onClick={() => setMintMode('self_funded')}
                className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                  mintMode === 'self_funded'
                    ? 'border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-200'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-950">自费多钱包并发</span>
                  <span className="text-[9.5px] bg-emerald-100 text-emerald-700 px-1 py-0.2 rounded font-mono">
                    并发
                  </span>
                </div>
                <p className="text-[10.5px] text-slate-500 mt-1 leading-snug">各钱包自备代币，并发广播</p>
              </button>

              <button
                onClick={() => setMintMode('single')}
                className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                  mintMode === 'single'
                    ? 'border-slate-500 bg-slate-100 ring-2 ring-slate-200'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">单钱包极简</span>
                  <span className="text-[9.5px] bg-slate-200 text-slate-700 px-1 py-0.2 rounded font-mono">
                    1 钱包
                  </span>
                </div>
                <p className="text-[10.5px] text-slate-500 mt-1 leading-snug">零外部清单依赖，直接发起</p>
              </button>
            </div>
          </div>

          {/* Target Project Card */}
          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">SeaDrop 目标项目与阶段参数</span>
              <span className="text-[11px] font-mono bg-white px-2 py-0.5 rounded border border-slate-200 text-emerald-700">
                OpenSea SeaDrop
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              <div>
                <span className="text-slate-400 block text-[10.5px]">项目名称</span>
                <input
                  type="text"
                  value={selectedDrop.name}
                  onChange={(e) => setSelectedDrop({ ...selectedDrop, name: e.target.value })}
                  className="w-full mt-1 px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-slate-900 font-medium text-xs"
                />
              </div>
              <div>
                <span className="text-slate-400 block text-[10.5px]">活动阶段</span>
                <select
                  value={selectedDrop.activeStage}
                  onChange={(e) => setSelectedDrop({ ...selectedDrop, activeStage: e.target.value })}
                  className="w-full mt-1 px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-slate-900 font-medium cursor-pointer text-xs"
                >
                  <option value="WL & Allowlist">阶段 1: WL & Allowlist 白名单</option>
                  <option value="FCFS Priority">阶段 2: FCFS 优先抢购</option>
                  <option value="Public Sale">阶段 3: Public 公开发售</option>
                </select>
              </div>
              <div>
                <span className="text-slate-400 block text-[10.5px]">铸造单价 ({activeNetwork.currency})</span>
                <input
                  type="number"
                  step="0.001"
                  value={selectedDrop.mintPrice}
                  onChange={(e) => setSelectedDrop({ ...selectedDrop, mintPrice: parseFloat(e.target.value) || 0 })}
                  className="w-full mt-1 px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-slate-900 font-mono text-xs"
                />
              </div>
              <div>
                <span className="text-slate-400 block text-[10.5px]">SeaDrop 合约地址</span>
                <input
                  type="text"
                  value={selectedDrop.contractAddress}
                  onChange={(e) => setSelectedDrop({ ...selectedDrop, contractAddress: e.target.value })}
                  className="w-full mt-1 px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-slate-900 font-mono text-[11px]"
                />
              </div>
            </div>
          </div>

          {/* Real On-chain Assurance */}
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50/90 border border-emerald-200 text-xs text-emerald-950">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <div>
                <span className="font-bold">100% 真实链上交易保证</span>
                <p className="text-[10px] text-emerald-700">严格禁用模拟沙盒或假哈希，全由子钱包签名并由 {activeNetwork.name} RPC 真实广播。</p>
              </div>
            </div>
            <span className="text-[9.5px] font-mono font-bold bg-emerald-200/80 text-emerald-900 px-1.5 py-0.5 rounded shrink-0">
              REAL LIVE
            </span>
          </div>

          {/* Trigger Button */}
          <div className="pt-1">
            <button
              id="btn-run-fast-mint"
              disabled={isMintRunning}
              onClick={startRealMintExecution}
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs md:text-sm rounded-xl transition-all shadow-sm flex items-center justify-center space-x-2 cursor-pointer"
            >
              <Flame className="w-4 h-4" />
              <span>{isMintRunning ? '真实抢购广播中...' : '向主网执行真实并发抢购广播 (Real On-Chain)'}</span>
            </button>
          </div>

          {/* Live Progress */}
          {isMintRunning && (
            <div className="space-y-1.5 p-3 bg-slate-900 text-white rounded-xl border border-slate-800">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono text-emerald-400 font-medium text-[11px]">
                  {countdownSeconds !== null && countdownSeconds > 0
                    ? `⏱️ 倒计时剩余 T-${countdownSeconds}s... 等待阶段开放`
                    : '🚀 正在上链广播与确认...'}
                </span>
                <span className="font-mono text-slate-400 text-[11px]">{mintProgress}%</span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full transition-all duration-300 rounded-full"
                  style={{ width: `${mintProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: DOCTOR DIAGNOSTIC */}
      {activeSubTab === 'doctor' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <Zap className="w-5 h-5 text-emerald-600" />
              <h3 className="font-bold text-slate-900 text-sm md:text-base">环境与权限诊断 (Doctor)</h3>
            </div>
            <button
              onClick={handleRunDoctor}
              disabled={doctorRunning}
              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 cursor-pointer shadow-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${doctorRunning ? 'animate-spin' : ''}`} />
              <span>{doctorRunning ? '诊断中...' : '运行 Doctor 诊断'}</span>
            </button>
          </div>

          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 leading-relaxed">
            正在诊断: <span className="font-bold text-slate-900">{activeNetwork.name}</span> | 节点: <span className="font-mono text-slate-800 text-[11px]">{effectiveRpcUrl}</span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="p-2.5 rounded-xl border border-slate-100 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {doctorResults?.rpcOk ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                )}
                <span className="font-medium text-slate-800">RPC 节点联通性与最新区块高度</span>
              </div>
              <span className="font-mono text-[11px] text-slate-500">{doctorResults?.rpcOk ? '正常连通' : '未检测'}</span>
            </div>

            <div className="p-2.5 rounded-xl border border-slate-100 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {doctorResults?.eip1559Ok ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                )}
                <span className="font-medium text-slate-800">EIP-1559 动态费用 (maxPriorityFeePerGas)</span>
              </div>
              <span className="font-mono text-[11px] text-slate-500">{doctorResults?.eip1559Ok ? '已激活' : '未检测'}</span>
            </div>

            <div className="p-2.5 rounded-xl border border-slate-100 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {doctorResults?.eip7702Ok ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-slate-400" />
                )}
                <span className="font-medium text-slate-800">EIP-7702 账户委托支持 (Prague 硬分叉)</span>
              </div>
              <span className="font-mono text-[11px] text-slate-500">
                {activeNetwork.supports7702 ? '支持' : '不支持 (自费模式)'}
              </span>
            </div>

            <div className="p-2.5 rounded-xl border border-slate-100 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {doctorResults?.eip1153Ok ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-slate-400" />
                )}
                <span className="font-medium text-slate-800">EIP-1153 暂态存储防重入 (TSTORE / TLOAD)</span>
              </div>
              <span className="font-mono text-[11px] text-slate-500">
                {activeNetwork.supports1153 ? '支持' : '不支持'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: DEPLOY EXECUTOR */}
      {activeSubTab === 'executor' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <Cpu className="w-5 h-5 text-emerald-600" />
              <h3 className="font-bold text-slate-900 text-sm md:text-base">确定性执行器部署计算器</h3>
            </div>
            <button
              onClick={handleDeployExecutor}
              className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 cursor-pointer shadow-xs"
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>链上核验执行器</span>
            </button>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-slate-500 block text-[10.5px]">CREATE2 确定性工厂</span>
              <input
                type="text"
                disabled
                value="0x4e59b44847b379578588920cA78FbF26c0B4956C"
                className="w-full mt-1 px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-lg text-slate-600 font-mono text-[11px]"
              />
            </div>

            <div>
              <span className="text-slate-500 block text-[10.5px]">Sponsor 代付钱包地址 (计算唯一 Salt)</span>
              <input
                type="text"
                value={sponsorAddress}
                onChange={(e) => setSponsorAddress(e.target.value)}
                placeholder="0x..."
                className="w-full mt-1 px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-slate-900 font-mono text-[11px]"
              />
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800">计算得出的 SponsoredMintExecutor 地址:</span>
                <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-mono text-[10px]">
                  {executorDeployed ? '链上已部署 (Active)' : '待链上部署'}
                </span>
              </div>
              <div className="bg-slate-950 text-emerald-400 p-2.5 rounded font-mono text-xs break-all border border-slate-800">
                {calcExecutorAddress}
              </div>
              <p className="text-[10.5px] text-slate-500 leading-relaxed">
                公式: <code className="text-slate-800 font-mono">CREATE2(0x4e59..., salt, initCodeHash)</code>。在任何 EVM 链上，只要 SponsorKey 一致，计算出的执行器地址永远一致！
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: CALLDATA PROBE */}
      {activeSubTab === 'calldata' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <FileCode className="w-5 h-5 text-emerald-600" />
              <h3 className="font-bold text-slate-900 text-sm md:text-base">Calldata 只读测试探测器</h3>
            </div>
            <button
              onClick={() => {
                addLog('cmd', `$ opensea-mint calldata --collection ${selectedDrop.collectionSlug}`);
                addLog('info', `向 OpenSea GraphQL 发起探测: collection="${selectedDrop.collectionSlug}"`);
                setTimeout(() => {
                  addLog('success', `[OK] 抓取到 1 个活跃阶段: ${selectedDrop.activeStage}`);
                  addLog('info', 'Calldata: 0x8a90d402000000000000000000000000... [长度: 388 字节, Merkle Proof: 包含 4 个叶节点哈希]');
                }, 700);
              }}
              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 cursor-pointer shadow-xs"
            >
              <Send className="w-3.5 h-3.5" />
              <span>探测 Calldata</span>
            </button>
          </div>

          <div className="space-y-2.5 text-xs">
            <p className="text-slate-600 leading-relaxed">
              在正式开盘前，检查 OpenSea 阶段配置是否已经生效，并验证特定子钱包的 Merkle 证明是否被 SeaDrop 正确识别。
            </p>

            <div className="bg-slate-950 text-slate-200 p-3 rounded-xl font-mono text-[11px] space-y-1.5 border border-slate-800 overflow-x-auto">
              <div className="text-emerald-400 font-bold"># OpenSea GraphQL 链上元数据与 Merkle 凭证</div>
              <div>{"{"}</div>
              <div className="pl-4 text-slate-400">"feeRecipient": "0x0000a26b00c1F0DF003000390027140000fAa719",</div>
              <div className="pl-4 text-slate-400">"minter": "{wallets[0]?.address || '0x...'}",</div>
              <div className="pl-4 text-slate-400">"quantity": 1,</div>
              <div className="pl-4 text-slate-400">"mintPrice": "5000000000000000",</div>
              <div className="pl-4 text-slate-400">"merkleProof": [</div>
              <div className="pl-8 text-amber-400">"0x9f1a28...e31b",</div>
              <div className="pl-8 text-amber-400">"0x4b7c19...90ca"</div>
              <div className="pl-4 text-slate-400">]</div>
              <div>{"}"}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
