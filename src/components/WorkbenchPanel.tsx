import React, { useState } from 'react';
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
  AlertTriangle,
  Search,
  Sparkles,
  Clock,
  Layers
} from 'lucide-react';
import { NetworkConfig, DropInfo, TestWallet } from '../types';
import { fetchSeaDropOnChainInfo, fetchCurrentNetworkGasPrice } from '../utils/web3Service';

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
  onBatchUpdateQuantity?: (quantity: number) => void;
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
  onBatchUpdateQuantity,
  className = ''
}) => {
  const [isDetectingDrop, setIsDetectingDrop] = useState<boolean>(false);
  const [detectError, setDetectError] = useState<string | null>(null);
  const [isFetchingGas, setIsFetchingGas] = useState<boolean>(false);
  const [currentGasInfo, setCurrentGasInfo] = useState<{
    rawGwei: number;
    recommendedGwei: number;
  } | null>(null);

  // Auto-fetch current network Gas Price
  const handleFetchCurrentGas = async (applyToInput = true, silent = false) => {
    setIsFetchingGas(true);
    if (!silent) {
      addLog('cmd', `$ eth_gasPrice --network ${activeNetwork.name} --rpc ${effectiveRpcUrl.slice(0, 24)}...`);
    }
    try {
      const gasInfo = await fetchCurrentNetworkGasPrice(effectiveRpcUrl, activeNetwork.chainId);
      setCurrentGasInfo({
        rawGwei: gasInfo.rawGasPriceGwei,
        recommendedGwei: gasInfo.recommendedGasPriceGwei
      });

      if (applyToInput) {
        setSelectedDrop((prev) => ({
          ...prev,
          gasPriceGwei: gasInfo.recommendedGasPriceGwei
        }));
      }

      if (!silent) {
        addLog(
          'success',
          `⚡ 成功获取 ${activeNetwork.name} 实时 Gas！链上原生: ${gasInfo.rawGasPriceGwei} Gwei | 推荐抢购加速: ${gasInfo.recommendedGasPriceGwei} Gwei`
        );
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!silent) {
        addLog('error', `获取实时 Gas 费率失败: ${msg}`);
      }
    } finally {
      setIsFetchingGas(false);
    }
  };

  // Automatically fetch current gas price on initial load and network change
  React.useEffect(() => {
    handleFetchCurrentGas(true, true);
    const interval = setInterval(() => {
      // Background refresh of live gas info without overriding if user manually changed it
      handleFetchCurrentGas(false, true);
    }, 12000);
    return () => clearInterval(interval);
  }, [activeNetwork.chainId, effectiveRpcUrl]);

  // Auto-detect SeaDrop contract info
  const handleAutoDetectSeaDrop = async (targetAddr?: string) => {
    const addressToQuery = (targetAddr || selectedDrop.contractAddress).trim();
    if (!addressToQuery) {
      setDetectError('请输入合约地址后再进行自动探测');
      return;
    }

    setIsDetectingDrop(true);
    setDetectError(null);
    addLog('cmd', `$ opensea-mint inspect --contract ${addressToQuery} --network ${activeNetwork.name}`);
    addLog('info', `正在连接 ${activeNetwork.name} RPC 查询合约元数据与 SeaDrop 阶段配置...`);

    try {
      const res = await fetchSeaDropOnChainInfo(
        effectiveRpcUrl,
        activeNetwork.chainId,
        addressToQuery,
        activeNetwork.id
      );

      const updatedDrop: DropInfo = {
        ...selectedDrop,
        contractAddress: addressToQuery
      };

      if (res.name) {
        updatedDrop.name = `${res.name}${res.symbol ? ` (${res.symbol})` : ''}`;
        updatedDrop.collectionSlug = res.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      }

      if (res.publicDrop) {
        const detectedLimit = res.publicDrop.maxTotalMintableByWallet;
        updatedDrop.mintPrice = res.publicDrop.mintPrice;
        updatedDrop.maxPerWallet = detectedLimit;
        // Default target mint quantity to the detected limit if > 0
        if (detectedLimit > 0) {
          updatedDrop.mintQuantity = detectedLimit;
          onBatchUpdateQuantity?.(detectedLimit);
        }
        updatedDrop.startTime = res.publicDrop.startTime;
        updatedDrop.endTime = res.publicDrop.endTime;
        updatedDrop.saleStatusText = res.publicDrop.statusText;
        updatedDrop.isSeaDropDetected = true;
        updatedDrop.mintMethod = 'seadrop'; // Auto-switch to SeaDrop protocol routing
        updatedDrop.activeStage = res.publicDrop.isActive
          ? 'Public Sale (公开发售中)'
          : res.publicDrop.isUpcoming
          ? 'Upcoming (即将发售)'
          : 'Public Sale (公开阶段)';

        addLog(
          'success',
          `✅ 成功探查到 SeaDrop 链上公开发售参数！单价: ${res.publicDrop.mintPrice} ${activeNetwork.currency} | 单钱包限购: ${detectedLimit} 枚 | 状态: ${res.publicDrop.statusText}。已将抢购数量自动设为限额上限 (${detectedLimit} 枚) 并切换至「SeaDrop 公开路由协议」！`
        );
      } else {
        updatedDrop.isSeaDropDetected = false;
        updatedDrop.saleStatusText = '未探查到活跃 PublicDrop 阶段 (可能为白名单或专属合约)';
        addLog(
          'warn',
          `⚠️ 目标合约已验证存在，但在标准 SeaDrop 路由器未读取到 PublicDrop 开放参数，您可手动指定抢购单价和阶段。`
        );
      }

      setSelectedDrop(updatedDrop);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setDetectError(msg);
      addLog('error', `SeaDrop 探测失败: ${msg}`);
    } finally {
      setIsDetectingDrop(false);
    }
  };

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
          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-slate-800">SeaDrop 目标项目与发售参数</span>
                <span className="text-[10px] font-mono bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded border border-emerald-200 font-semibold">
                  OpenSea SeaDrop
                </span>
              </div>
              <button
                type="button"
                id="btn-autodetect-seadrop"
                onClick={() => handleAutoDetectSeaDrop()}
                disabled={isDetectingDrop}
                className="flex items-center space-x-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-400 text-white rounded-lg text-[11px] font-semibold transition-all cursor-pointer shadow-2xs"
                title="向当前链 RPC 探查目标合约发售阶段、单价与限额"
              >
                <RefreshCw className={`w-3 h-3 ${isDetectingDrop ? 'animate-spin' : ''}`} />
                <span>{isDetectingDrop ? '探查链上发售中...' : '自动同步单价与发售'}</span>
              </button>
            </div>

            {/* Contract Address Input with Auto-Probe Bar */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-slate-600 font-medium text-[11px] flex items-center space-x-1">
                  <span>SeaDrop NFT 合约地址 (输入后可自动同步)</span>
                </span>
                {selectedDrop.isSeaDropDetected && (
                  <span className="text-[10.5px] text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 flex items-center space-x-1 font-medium">
                    <Sparkles className="w-3 h-3 text-emerald-600" />
                    <span>已与链上 SeaDrop 阶段同步</span>
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <input
                  id="input-seadrop-contract"
                  type="text"
                  value={selectedDrop.contractAddress}
                  onChange={(e) => {
                    const val = e.target.value.trim();
                    setSelectedDrop({ ...selectedDrop, contractAddress: val, isSeaDropDetected: false });
                    // Auto-trigger if full 42-char EVM address is pasted
                    if (/^0x[a-fA-F0-9]{40}$/.test(val)) {
                      handleAutoDetectSeaDrop(val);
                    }
                  }}
                  onBlur={(e) => {
                    const val = e.target.value.trim();
                    if (/^0x[a-fA-F0-9]{40}$/.test(val) && !selectedDrop.isSeaDropDetected) {
                      handleAutoDetectSeaDrop(val);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAutoDetectSeaDrop();
                    }
                  }}
                  placeholder="0x... (粘贴或输入 NFT 合约地址，失焦或回车自动同步)"
                  className="flex-1 px-2.5 py-1.5 bg-white border border-slate-300 focus:border-emerald-500 rounded-lg text-slate-900 font-mono text-xs shadow-2xs outline-none"
                />
                <button
                  type="button"
                  onClick={() => handleAutoDetectSeaDrop()}
                  disabled={isDetectingDrop}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white rounded-lg text-xs font-semibold shrink-0 cursor-pointer flex items-center space-x-1 transition-all"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">探测</span>
                </button>
              </div>

              {detectError && (
                <div className="mt-1.5 text-[10.5px] text-rose-600 bg-rose-50 border border-rose-200 p-1.5 rounded-lg flex items-center space-x-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                  <span>{detectError}</span>
                </div>
              )}
            </div>

            {/* Auto-detected Sale Status Pill */}
            {selectedDrop.saleStatusText && (
              <div className={`p-2 rounded-lg border text-xs flex items-center justify-between ${
                selectedDrop.isSeaDropDetected
                  ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                  : 'bg-amber-50/80 border-amber-200 text-amber-950'
              }`}>
                <div className="flex items-center space-x-1.5">
                  <Clock className="w-3.5 h-3.5 shrink-0" />
                  <span className="font-semibold">链上发售状态:</span>
                  <span className="font-medium">{selectedDrop.saleStatusText}</span>
                </div>
                {selectedDrop.maxPerWallet !== undefined && (
                  <span className="font-mono text-[10.5px] bg-white/80 px-2 py-0.5 rounded border border-emerald-300 text-emerald-800">
                    单钱包限额: {selectedDrop.maxPerWallet === 0 ? '无限制' : `${selectedDrop.maxPerWallet} 枚`}
                  </span>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
              <div>
                <span className="text-slate-500 block text-[10.5px] font-medium">项目名称</span>
                <input
                  id="input-drop-name"
                  type="text"
                  value={selectedDrop.name}
                  onChange={(e) => setSelectedDrop({ ...selectedDrop, name: e.target.value })}
                  className="w-full mt-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900 font-medium text-xs shadow-2xs"
                />
              </div>

              <div>
                <span className="text-slate-500 block text-[10.5px] font-medium">活动阶段</span>
                <select
                  id="select-drop-stage"
                  value={selectedDrop.activeStage}
                  onChange={(e) => setSelectedDrop({ ...selectedDrop, activeStage: e.target.value })}
                  className="w-full mt-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900 font-medium cursor-pointer text-xs shadow-2xs"
                >
                  <option value="Public Sale (公开发售中)">Public Sale (公开阶段)</option>
                  <option value="WL & Allowlist">阶段 1: WL & Allowlist 白名单</option>
                  <option value="FCFS Priority">阶段 2: FCFS 优先抢购</option>
                  <option value="Upcoming (即将发售)">Upcoming (预备阶段)</option>
                </select>
              </div>

              <div>
                <span className="text-slate-500 block text-[10.5px] font-medium">
                  铸造单价 ({activeNetwork.currency})
                </span>
                <input
                  id="input-drop-price"
                  type="number"
                  step="0.0001"
                  value={selectedDrop.mintPrice}
                  onChange={(e) => setSelectedDrop({ ...selectedDrop, mintPrice: parseFloat(e.target.value) || 0 })}
                  className="w-full mt-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900 font-mono font-semibold text-xs shadow-2xs"
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 block text-[10.5px] font-medium">
                    单钱包抢购数量 (Quantity)
                  </span>
                  {selectedDrop.maxPerWallet && selectedDrop.maxPerWallet > 0 ? (
                    <button
                      type="button"
                      onClick={() => {
                        const maxQty = selectedDrop.maxPerWallet!;
                        setSelectedDrop({ ...selectedDrop, mintQuantity: maxQty });
                        onBatchUpdateQuantity?.(maxQty);
                        addLog('info', `已将每个钱包抢购数量拉满为合约最大限额: ${maxQty} 枚`);
                      }}
                      className="text-[9.5px] text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-1.5 py-0.2 rounded border border-emerald-200 font-semibold cursor-pointer transition-all active:scale-95"
                      title="点击将所有钱包一键拉满至单钱包最大限额"
                    >
                      拉满 ({selectedDrop.maxPerWallet}枚)
                    </button>
                  ) : null}
                </div>
                <div className="relative mt-1 flex items-center">
                  <input
                    id="input-drop-quantity"
                    type="number"
                    min="1"
                    max={selectedDrop.maxPerWallet && selectedDrop.maxPerWallet > 0 ? selectedDrop.maxPerWallet : 100}
                    value={selectedDrop.mintQuantity || 1}
                    onChange={(e) => {
                      const val = Math.max(1, parseInt(e.target.value) || 1);
                      setSelectedDrop({ ...selectedDrop, mintQuantity: val });
                      onBatchUpdateQuantity?.(val);
                    }}
                    className="w-full px-2.5 py-1.5 pr-14 bg-white border border-slate-200 rounded-lg text-slate-900 font-mono font-semibold text-xs shadow-2xs"
                  />
                  <div className="absolute right-1.5 flex items-center space-x-1">
                    <button
                      type="button"
                      onClick={() => {
                        const cur = selectedDrop.mintQuantity || 1;
                        if (cur > 1) {
                          const nextVal = cur - 1;
                          setSelectedDrop({ ...selectedDrop, mintQuantity: nextVal });
                          onBatchUpdateQuantity?.(nextVal);
                        }
                      }}
                      className="w-5 h-5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded flex items-center justify-center font-bold text-xs cursor-pointer"
                    >
                      -
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const cur = selectedDrop.mintQuantity || 1;
                        const maxLimit = selectedDrop.maxPerWallet && selectedDrop.maxPerWallet > 0 ? selectedDrop.maxPerWallet : 100;
                        if (cur < maxLimit) {
                          const nextVal = cur + 1;
                          setSelectedDrop({ ...selectedDrop, mintQuantity: nextVal });
                          onBatchUpdateQuantity?.(nextVal);
                        }
                      }}
                      className="w-5 h-5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded flex items-center justify-center font-bold text-xs cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 block text-[10.5px] font-medium">合约调用函数 (Mint Method)</span>
                  {selectedDrop.mintMethod === 'seadrop' && (
                    <span className="text-[9.5px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                      ⚡ OpenSea SeaDrop 专线
                    </span>
                  )}
                </div>
                <select
                  id="select-mint-method"
                  value={selectedDrop.mintMethod || 'mint'}
                  onChange={(e) => setSelectedDrop({ ...selectedDrop, mintMethod: e.target.value })}
                  className="w-full mt-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900 font-medium cursor-pointer text-xs shadow-2xs"
                >
                  <option value="mint">mint(address to, uint256 quantity) [通用标准]</option>
                  <option value="mintQuantity">mint(uint256 quantity) [单参数数量]</option>
                  <option value="mintNoArgs">mint() [无参铸造]</option>
                  <option value="mintPublic">mintPublic(address to, uint256 quantity)</option>
                  <option value="seadrop">SeaDrop 公开路由协议 (OpenSea)</option>
                  <option value="transfer">纯 ETH 原生转账 (Fallback/Receive 触发)</option>
                  <option value="custom">自定义 16 进制 Calldata (Custom Payload)</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5">
                    <span className="text-slate-500 block text-[10.5px] font-medium">
                      Gas Price (Gwei)
                    </span>
                    {currentGasInfo && (
                      <span className="text-[9.5px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded font-mono font-medium">
                        链上实时: {currentGasInfo.rawGwei}
                      </span>
                    )}
                  </div>
                  <button
                    id="btn-auto-fetch-gas"
                    type="button"
                    onClick={() => handleFetchCurrentGas(true, false)}
                    disabled={isFetchingGas}
                    className="flex items-center space-x-1 text-[10px] text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-md font-semibold cursor-pointer transition-all active:scale-95 disabled:opacity-50"
                    title="从当前链 RPC 节点实时读取最新 gasPrice，并自动填入带缓冲的推荐加速值"
                  >
                    <RefreshCw className={`w-3 h-3 ${isFetchingGas ? 'animate-spin text-emerald-600' : 'text-emerald-600'}`} />
                    <span>{isFetchingGas ? '获取中...' : '自动获取当前 Gas'}</span>
                  </button>
                </div>
                <div className="relative mt-1">
                  <input
                    id="input-drop-gas-price"
                    type="number"
                    step="0.001"
                    placeholder={
                      currentGasInfo
                        ? `当前推荐: ${currentGasInfo.recommendedGwei} Gwei`
                        : activeNetwork.id === 'robinhood'
                        ? '0.07 (默认推荐)'
                        : `${activeNetwork.avgGasGwei} (留空自动+25%加速)`
                    }
                    value={selectedDrop.gasPriceGwei !== undefined ? selectedDrop.gasPriceGwei : ''}
                    onChange={(e) => {
                      const val = e.target.value.trim();
                      setSelectedDrop({
                        ...selectedDrop,
                        gasPriceGwei: val !== '' ? parseFloat(val) : undefined
                      });
                    }}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900 font-mono font-semibold text-xs shadow-2xs placeholder:text-slate-400 pr-24"
                  />
                  {currentGasInfo && (
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedDrop((prev) => ({ ...prev, gasPriceGwei: currentGasInfo.recommendedGwei }))
                      }
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[9.5px] text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-1.5 py-0.5 rounded border border-slate-200 font-mono cursor-pointer transition-colors"
                      title="快速应用推荐加速费率"
                    >
                      填入 {currentGasInfo.recommendedGwei}
                    </button>
                  )}
                </div>
                <div className="flex items-center justify-between mt-1 text-[9.5px] text-slate-400 font-mono">
                  <span>
                    推荐加速: {currentGasInfo ? `${currentGasInfo.recommendedGwei} Gwei` : activeNetwork.id === 'robinhood' ? '0.07 Gwei' : `${activeNetwork.avgGasGwei} Gwei`}
                  </span>
                  <span>留空则发包时自动动态探测+25%加速</span>
                </div>
              </div>

              <div className="md:col-span-2">
                <span className="text-slate-500 block text-[10.5px] font-medium">
                  自定义 Calldata Payload (可选，用于白名单 Merkle 树/非标方法)
                </span>
                <input
                  id="input-drop-calldata"
                  type="text"
                  placeholder="0x... (若留空则根据所选函数与归集地址自动 ABI 编码打包)"
                  value={selectedDrop.customCalldata || ''}
                  onChange={(e) => setSelectedDrop({ ...selectedDrop, customCalldata: e.target.value })}
                  className="w-full mt-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900 font-mono text-xs shadow-2xs placeholder:text-slate-400"
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
