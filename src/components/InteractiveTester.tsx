import React, { useState, useEffect, useRef } from 'react';
import { 
  Terminal, 
  Play, 
  RefreshCw, 
  Users, 
  Wallet, 
  Cpu, 
  Zap, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Copy, 
  ArrowRight, 
  ShieldAlert, 
  Layers, 
  FileCode, 
  Check, 
  Flame, 
  Clock, 
  Send, 
  ExternalLink,
  Server,
  Wifi,
  Globe,
  Key,
  Eye,
  EyeOff,
  Gauge,
  Settings,
  Radio,
  CheckCheck,
  X
} from 'lucide-react';

export interface TestWallet {
  id: number;
  address: string;
  privateKey: string;
  quantity: number;
  nativeBalance: number;
  isDelegated: boolean; // EIP-7702 delegated
  status: 'idle' | 'ready' | 'fetching_calldata' | 'broadcasting' | 'success' | 'reverted';
  txHash?: string;
  mintedNftCount: number;
  errorMsg?: string;
}

interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'success' | 'cmd';
  message: string;
}

export interface NetworkConfig {
  id: string;
  name: string;
  chainId: number;
  currency: string;
  defaultRpcUrl: string;
  explorerUrl: string;
  supports7702: boolean;
  supports1153: boolean;
  isTestnet?: boolean;
  badgeColor: string;
  blockTimeSec: number;
  avgGasGwei: number;
}

const SUPPORTED_NETWORKS: NetworkConfig[] = [
  {
    id: 'eth',
    name: 'Ethereum Mainnet',
    chainId: 1,
    currency: 'ETH',
    defaultRpcUrl: 'https://eth.llamarpc.com',
    explorerUrl: 'https://etherscan.io',
    supports7702: false,
    supports1153: true,
    badgeColor: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    blockTimeSec: 12,
    avgGasGwei: 18.5
  },
  {
    id: 'robinhood',
    name: 'Robinhood Chain',
    chainId: 4663,
    currency: 'ETH',
    defaultRpcUrl: 'https://rpc.mainnet.chain.robinhood.com',
    explorerUrl: 'https://robinhoodchain.blockscout.com',
    supports7702: false,
    supports1153: true,
    badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    blockTimeSec: 0.25,
    avgGasGwei: 0.01
  },
  {
    id: 'ink',
    name: 'Ink Mainnet',
    chainId: 57073,
    currency: 'ETH',
    defaultRpcUrl: 'https://rpc-gel.inkonchain.com',
    explorerUrl: 'https://explorer.inkonchain.com',
    supports7702: true,
    supports1153: true,
    badgeColor: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    blockTimeSec: 1,
    avgGasGwei: 0.02
  },
  {
    id: 'arc',
    name: 'Arc Mainnet',
    chainId: 5042,
    currency: 'ARC',
    defaultRpcUrl: 'https://rpc.mainnet.arc.io',
    explorerUrl: 'https://arcscan.app',
    supports7702: false,
    supports1153: true,
    badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    blockTimeSec: 1,
    avgGasGwei: 0.05
  }
];

export const InteractiveTester: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'mint' | 'doctor' | 'wallets' | 'executor' | 'calldata'>('mint');

  // Network & RPC State
  const [selectedNetworkId, setSelectedNetworkId] = useState<string>('eth');
  const [customRpcUrl, setCustomRpcUrl] = useState<string>('');
  const [useCustomRpc, setUseCustomRpc] = useState<boolean>(false);
  const [rpcModalOpen, setRpcModalOpen] = useState<boolean>(false);
  const [showApiKey, setShowApiKey] = useState<boolean>(false);
  
  // RPC Diagnostics
  const [rpcPingState, setRpcPingState] = useState<{
    status: 'idle' | 'testing' | 'success' | 'error';
    latencyMs: number;
    blockNumber: number;
    checkedAt?: string;
  }>({
    status: 'success',
    latencyMs: 19,
    blockNumber: 24198402,
    checkedAt: '刚刚'
  });

  const activeNetwork = SUPPORTED_NETWORKS.find((n) => n.id === selectedNetworkId) || SUPPORTED_NETWORKS[0];
  const effectiveRpcUrl = useCustomRpc && customRpcUrl.trim() ? customRpcUrl.trim() : activeNetwork.defaultRpcUrl;

  // Wallets State
  const [wallets, setWallets] = useState<TestWallet[]>([
    {
      id: 1,
      address: '0x3A54f6B0C484D3C9D55b774E9A40366D7D31b8D7',
      privateKey: '0x8f23...a491',
      quantity: 1,
      nativeBalance: 0.012,
      isDelegated: true,
      status: 'idle',
      mintedNftCount: 0
    },
    {
      id: 2,
      address: '0x7B12cD34eF56Ab90e12A45C34e56D78E9012A34F',
      privateKey: '0x1c44...9e10',
      quantity: 1,
      nativeBalance: 0.008,
      isDelegated: true,
      status: 'idle',
      mintedNftCount: 0
    },
    {
      id: 3,
      address: '0x99Ec72d4F3819A318e8749Cb145942D8E3c16641',
      privateKey: '0x55ba...77d3',
      quantity: 2,
      nativeBalance: 0.015,
      isDelegated: true,
      status: 'idle',
      mintedNftCount: 0
    }
  ]);

  // Master Addresses & Balances
  const [sponsorAddress, setSponsorAddress] = useState('0x8888b6038BeF89A52e0f43818e33F7D5F34E8888');
  const [recipientAddress, setRecipientAddress] = useState('0x9999a071850BE9048a127a92A1e2fa0635Ac9999');
  const [sponsorBalance, setSponsorBalance] = useState(0.45);
  const [recipientNftCount, setRecipientNftCount] = useState(0);

  // Mint Setup
  const [mintMode, setMintMode] = useState<'sponsored' | 'self_funded' | 'single'>('sponsored');
  const [selectedDrop, setSelectedDrop] = useState({
    name: 'Doodles Prague Edition (SeaDrop)',
    collectionSlug: 'doodles-prague-edition',
    contractAddress: '0x6295ee1b4f6dd65047762f9247da7b161a064344',
    mintPrice: 0.005,
    activeStage: 'WL & Allowlist'
  });
  const [simulatePartialRevert, setSimulatePartialRevert] = useState(true);
  const [isMintRunning, setIsMintRunning] = useState(false);
  const [mintProgress, setMintProgress] = useState(0);
  const [countdownSeconds, setCountdownSeconds] = useState<number | null>(null);

  // Logs Terminal
  const [logs, setLogs] = useState<LogEntry[]>([
    {
      timestamp: '00:00:00',
      level: 'info',
      message: 'OSNM-Z 核心实操控制台已启动 (Rust 2024 高性能引擎)'
    },
    {
      timestamp: '00:00:01',
      level: 'cmd',
      message: `网络已锁定: ${activeNetwork.name} (ChainID: ${activeNetwork.chainId})，默认 RPC: ${effectiveRpcUrl.slice(0, 32)}...`
    }
  ]);

  const terminalEndRef = useRef<HTMLDivElement>(null);

  const addLog = (level: LogEntry['level'], message: string) => {
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];
    setLogs((prev) => [...prev, { timestamp: timeStr, level, message }]);
  };

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Doctor state
  const [doctorRunning, setDoctorRunning] = useState(false);
  const [doctorResults, setDoctorResults] = useState<{
    rpcConnected: boolean;
    eip1559Supported: boolean;
    eip7702Supported: boolean;
    eip1153Supported: boolean;
    walletsValid: boolean;
    sponsorKeyOk: boolean;
  } | null>(null);

  // Wallet Generator State
  const [genCount, setGenCount] = useState(5);
  const [copiedWallets, setCopiedWallets] = useState(false);

  // Multicall Fund State
  const [fundAmountPerWallet, setFundAmountPerWallet] = useState(0.01);
  const [isFunding, setIsFunding] = useState(false);

  // Executor calculation state
  const [calcExecutorAddress, setCalcExecutorAddress] = useState('0x4014902F17c2445E1705D172A2a74c43C363d6f1');
  const [executorDeployed, setExecutorDeployed] = useState(true);

  // Test RPC Ping
  const testRpcPing = (targetUrl: string) => {
    setRpcPingState((prev) => ({ ...prev, status: 'testing' }));
    addLog('cmd', `$ opensea-mint test-rpc --url ${targetUrl.slice(0, 24)}...`);

    setTimeout(() => {
      const simulatedLatency = Math.floor(Math.random() * 25) + 12; // 12-37ms
      const simulatedBlock = rpcPingState.blockNumber + Math.floor(Math.random() * 3) + 1;
      const now = new Date();
      const timeStr = now.toTimeString().split(' ')[0];

      setRpcPingState({
        status: 'success',
        latencyMs: simulatedLatency,
        blockNumber: simulatedBlock,
        checkedAt: timeStr
      });

      addLog('success', `[RPC PING] 节点响应正常: 延迟 ${simulatedLatency}ms | 当前区块高度 #${simulatedBlock}`);
      addLog('info', `[EIP-1559] eth_feeHistory 校验通过，BaseFee 动态追踪已绑定`);
    }, 600);
  };

  // Switch network
  const handleNetworkChange = (networkId: string) => {
    setSelectedNetworkId(networkId);
    const net = SUPPORTED_NETWORKS.find((n) => n.id === networkId);
    if (net) {
      addLog('info', `切换测试网络至: ${net.name} (Chain ID: ${net.chainId}, 代币: ${net.currency})`);
      if (net.supports7702) {
        addLog('success', `[EIP-7702] ${net.name} 原生支持类型 0x04 委托授权`);
      } else {
        addLog('warn', `[提示] ${net.name} 未激活 Prague 升级，建议使用自费并发抢购模式`);
      }
      testRpcPing(useCustomRpc && customRpcUrl ? customRpcUrl : net.defaultRpcUrl);
    }
  };

  // Run Doctor Diagnostic
  const handleRunDoctor = () => {
    setDoctorRunning(true);
    addLog('cmd', `$ opensea-mint doctor --rpc ${effectiveRpcUrl.slice(0, 26)}...`);
    addLog('info', `正在探查 ${activeNetwork.name} RPC 节点与协议支持...`);

    setTimeout(() => {
      addLog('success', `[PASS] RPC 响应正常 (延迟 ${rpcPingState.latencyMs}ms, Chain ID: ${activeNetwork.chainId})`);
      addLog('success', '[PASS] EIP-1559 动态费用机制支持完整 (eth_feeHistory 成功解析)');
      
      const supports7702 = activeNetwork.supports7702;
      if (supports7702) {
        addLog('success', '[PASS] 目标链支持 EIP-7702 授权类型 0x04 交易 (Prague 激活)');
      } else {
        addLog('warn', '[WARN] 目标链暂未激活 EIP-7702，系统已自动准备自费并发 fallback 模式');
      }

      addLog('success', `[PASS] EIP-1153 暂态存储支持: ${activeNetwork.supports1153 ? '已就绪 (TSTORE/TLOAD)' : '未启用 (降级普通重入防护)'}`);
      addLog('success', `[PASS] 检测到 ${wallets.length} 个子钱包配置，格式合规，私钥解密成功`);

      if (mintMode === 'sponsored') {
        addLog('success', `[PASS] 赞助者钱包 ${sponsorAddress.slice(0, 10)}... 余额充沛 (${sponsorBalance} ${activeNetwork.currency})`);
      }

      setDoctorResults({
        rpcConnected: true,
        eip1559Supported: true,
        eip7702Supported: supports7702,
        eip1153Supported: activeNetwork.supports1153,
        walletsValid: true,
        sponsorKeyOk: true
      });
      setDoctorRunning(false);
      addLog('success', 'Doctor 诊断完毕: 当前环境一切就绪，可以安全发起抢购！');
    }, 1100);
  };

  // Generate Wallets
  const handleGenerateWallets = () => {
    const newWallets: TestWallet[] = [];
    const hexChars = '0123456789abcdef';
    for (let i = 1; i <= genCount; i++) {
      let randAddr = '0x';
      let randKey = '0x';
      for (let j = 0; j < 40; j++) randAddr += hexChars[Math.floor(Math.random() * 16)];
      for (let k = 0; k < 64; k++) randKey += hexChars[Math.floor(Math.random() * 16)];
      newWallets.push({
        id: i,
        address: randAddr,
        privateKey: randKey.slice(0, 8) + '...' + randKey.slice(-6),
        quantity: 1,
        nativeBalance: 0,
        isDelegated: false,
        status: 'idle',
        mintedNftCount: 0
      });
    }
    setWallets(newWallets);
    addLog('cmd', `$ opensea-mint wallets create --count ${genCount} --output wallets.json`);
    addLog('success', `成功离线批量生成 ${genCount} 个合规 EOA 钱包，已导入调度内存！`);
  };

  // Multicall3 Fund
  const handleMulticallFund = () => {
    if (sponsorBalance < fundAmountPerWallet * wallets.length) {
      addLog('error', `赞助钱包余额不足！需 ${fundAmountPerWallet * wallets.length} ${activeNetwork.currency}，当前仅有 ${sponsorBalance} ${activeNetwork.currency}`);
      return;
    }
    setIsFunding(true);
    addLog('cmd', `$ opensea-mint mint --fund ${fundAmountPerWallet}`);
    addLog('info', `准备通过 Multicall3 (0xcA11bde05977b3631167028862bE2a173976CA11) 批量打包 ${wallets.length} 笔资金原子分发...`);

    setTimeout(() => {
      const totalFund = fundAmountPerWallet * wallets.length;
      setSponsorBalance((prev) => parseFloat((prev - totalFund - 0.0008).toFixed(4)));
      setWallets((prev) =>
        prev.map((w) => ({
          ...w,
          nativeBalance: parseFloat((w.nativeBalance + fundAmountPerWallet).toFixed(4))
        }))
      );
      setIsFunding(false);
      addLog('success', `Multicall3 原子充值成功确认！共发放 ${totalFund} ${activeNetwork.currency} 至 ${wallets.length} 个钱包。`);
    }, 900);
  };

  // Withdraw
  const handleWithdrawFunds = () => {
    addLog('cmd', '$ opensea-mint mint --withdraw');
    addLog('info', '正在为各子钱包核算归集 Gas (21,000 gas * 当前 BaseFee)...');

    setTimeout(() => {
      let recovered = 0;
      setWallets((prev) =>
        prev.map((w) => {
          const ret = Math.max(0, w.nativeBalance - 0.00015);
          recovered += ret;
          return {
            ...w,
            nativeBalance: 0
          };
        })
      );
      setSponsorBalance((prev) => parseFloat((prev + recovered).toFixed(4)));
      addLog('success', `资金一键归集完成！扣除网络基础 Gas 后，成功回收 ${recovered.toFixed(4)} ${activeNetwork.currency} 至主代付钱包。`);
    }, 800);
  };

  // Undelegate
  const handleUndelegate = () => {
    addLog('cmd', '$ opensea-mint mint --undelegate');
    addLog('info', '正在广播 EIP-7702 撤回委托授权，将子钱包代码指针还原为 address(0)...');

    setTimeout(() => {
      setWallets((prev) =>
        prev.map((w) => ({
          ...w,
          isDelegated: false
        }))
      );
      addLog('success', 'EIP-7702 代码委托撤回成功！全部子钱包已安全复原为纯 EOA 账户。');
    }, 900);
  };

  // Deploy Executor
  const handleDeployExecutor = () => {
    addLog('cmd', '$ opensea-mint deploy-executor');
    addLog('info', '基于确定性 CREATE2 部署工厂 (0x4e59b44847b379578588920cA78FbF26c0B4956C)...');
    
    setTimeout(() => {
      setExecutorDeployed(true);
      addLog('success', `[OK] 专属 SponsoredMintExecutor 部署就绪: ${calcExecutorAddress}`);
      addLog('info', '已校验字节码运行时哈希: 0x81a86fad69bf234bc98b7dc3f8c853e07bc... (完全匹配)');
    }, 800);
  };

  // Mint Simulation
  const startMintSimulation = (fastCountdown = true) => {
    if (wallets.length === 0) {
      addLog('error', '请先在「钱包管理」中创建至少 1 个测试钱包！');
      return;
    }

    setIsMintRunning(true);
    setMintProgress(5);
    addLog('cmd', `$ opensea-mint mint --collection ${selectedDrop.collectionSlug}`);
    addLog('info', `目标链: ${activeNetwork.name} | 节点: ${effectiveRpcUrl.slice(0, 28)}...`);
    addLog('info', `抢购模式: ${mintMode === 'sponsored' ? 'EIP-7702 赞助代付模式' : mintMode === 'self_funded' ? '自费多钱包并发模式' : '单钱包模式'}`);

    // T-15s
    setCountdownSeconds(fastCountdown ? 3 : 15);
    addLog('info', '【T-15s 状态机】锁定 Nonce，检查子钱包本地签名凭证，验证 EIP-712 授权结构体...');

    setWallets((prev) =>
      prev.map((w) => ({
        ...w,
        status: 'ready'
      }))
    );

    setTimeout(() => {
      // T-2s
      setCountdownSeconds(fastCountdown ? 1 : 2);
      setMintProgress(40);
      addLog('info', '【T-2s 状态机】触发 OpenSea GraphQL 别名聚合热请求，一次性抓取全部钱包专属 Mint Calldata...');

      setWallets((prev) =>
        prev.map((w) => ({
          ...w,
          status: 'fetching_calldata'
        }))
      );

      setTimeout(() => {
        // T-0s
        setCountdownSeconds(0);
        setMintProgress(75);
        addLog('warn', `【T-0s 状态机】倒计时归零！抢购通道开启，向 ${activeNetwork.name} 内存池瞬间并发广播！`);

        setWallets((prev) =>
          prev.map((w) => ({
            ...w,
            status: 'broadcasting'
          }))
        );

        setTimeout(() => {
          setMintProgress(100);
          setIsMintRunning(false);
          setCountdownSeconds(null);

          let totalNewNfts = 0;

          setWallets((prev) =>
            prev.map((w, idx) => {
              if (simulatePartialRevert && idx === 1 && prev.length > 1) {
                return {
                  ...w,
                  status: 'reverted',
                  errorMsg: 'SeaDrop: AllowlistExceeded (单点失败已被隔离)'
                };
              }

              const nfts = w.quantity;
              totalNewNfts += nfts;
              const fakeHash = '0x' + Math.random().toString(16).slice(2, 10) + '...' + Math.random().toString(16).slice(2, 6);

              return {
                ...w,
                status: 'success',
                mintedNftCount: w.mintedNftCount + nfts,
                txHash: fakeHash,
                nativeBalance: mintMode === 'sponsored' ? w.nativeBalance : Math.max(0, w.nativeBalance - (selectedDrop.mintPrice * nfts + 0.0005))
              };
            })
          );

          if (mintMode === 'sponsored') {
            setSponsorBalance((prev) => parseFloat((prev - 0.0015 - (selectedDrop.mintPrice * totalNewNfts)).toFixed(4)));
            setRecipientNftCount((prev) => prev + totalNewNfts);
            addLog('success', `【EIP-7702 原子归集】SeaDrop _safeMint 触发回调，已直接原子转移 ${totalNewNfts} 枚 NFT 至主钱包 ${recipientAddress.slice(0, 8)}...！`);
          } else {
            setRecipientNftCount((prev) => prev + totalNewNfts);
            addLog('success', `【自费并发归集】各子钱包抢购确认，并自动执行 safeTransferFrom 将 ${totalNewNfts} 枚 NFT 转移至主接收钱包！`);
          }

          if (simulatePartialRevert && wallets.length > 1) {
            addLog('warn', '【单点隔离验证】钱包 #2 遭遇限购回滚，合约 try-catch 隔离成功，其余钱包 100% 成功铸造！');
          }

          addLog('success', '🎉 抢购流程执行完毕，已完成链上凭证审计。');
        }, 1300);
      }, 1000);
    }, 1100);
  };

  const copyWalletsJson = () => {
    const jsonStr = JSON.stringify(
      wallets.map((w) => ({
        address: w.address,
        privateKey: w.privateKey,
        quantity: w.quantity
      })),
      null,
      2
    );
    navigator.clipboard.writeText(jsonStr);
    setCopiedWallets(true);
    setTimeout(() => setCopiedWallets(false), 2000);
    addLog('info', '已将 wallets.json 复制到剪贴板');
  };

  return (
    <div className="space-y-6">
      {/* 1. TOP STATUS & NETWORK/RPC BAR */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Left: Engine & Chain Info */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center space-x-2 bg-slate-800/90 px-3 py-1.5 rounded-xl border border-slate-700/80">
              <Globe className="w-4 h-4 text-emerald-400" />
              <span className="text-xs text-slate-400">网络:</span>
              <select
                id="select-network"
                value={selectedNetworkId}
                onChange={(e) => handleNetworkChange(e.target.value)}
                className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer"
              >
                {SUPPORTED_NETWORKS.map((n) => (
                  <option key={n.id} value={n.id} className="bg-slate-900 text-slate-100">
                    {n.name} ({n.currency} · ID: {n.chainId})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center space-x-2 bg-slate-800/90 px-3 py-1.5 rounded-xl border border-slate-700/80">
              <Server className="w-4 h-4 text-indigo-400" />
              <span className="text-xs text-slate-400">RPC 节点:</span>
              <span className="text-xs font-mono text-slate-200 max-w-[160px] sm:max-w-[220px] truncate" title={effectiveRpcUrl}>
                {useCustomRpc && customRpcUrl ? '私人 RPC (已激活)' : effectiveRpcUrl}
              </span>
              <button
                id="btn-open-rpc-modal"
                onClick={() => setRpcModalOpen(true)}
                className="text-[11px] text-emerald-400 hover:text-emerald-300 font-bold ml-1 flex items-center space-x-1 cursor-pointer underline underline-offset-2"
              >
                <Settings className="w-3 h-3" />
                <span>设置</span>
              </button>
            </div>

            {/* Ping Chip */}
            <div className="flex items-center space-x-1.5 bg-slate-800/90 px-3 py-1.5 rounded-xl border border-slate-700/80 text-xs font-mono">
              <Wifi className={`w-3.5 h-3.5 ${rpcPingState.latencyMs < 30 ? 'text-emerald-400' : 'text-amber-400'}`} />
              <span className="text-slate-400">延迟:</span>
              <span className="text-emerald-400 font-bold">{rpcPingState.latencyMs}ms</span>
            </div>
          </div>

          {/* Right: Quick Action Controls */}
          <div className="flex items-center space-x-3 shrink-0">
            <button
              id="btn-ping-rpc"
              onClick={() => testRpcPing(effectiveRpcUrl)}
              disabled={rpcPingState.status === 'testing'}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium flex items-center space-x-1.5 cursor-pointer transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${rpcPingState.status === 'testing' ? 'animate-spin' : ''}`} />
              <span>测速 PING</span>
            </button>

            <button
              id="btn-quick-doctor"
              onClick={() => {
                setActiveSubTab('doctor');
                handleRunDoctor();
              }}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center space-x-1.5 cursor-pointer shadow-xs transition-all"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>一键 Doctor 体检</span>
            </button>
          </div>
        </div>

        {/* Dynamic Sub-tab Navigation */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800">
          <button
            id="tab-mint"
            onClick={() => setActiveSubTab('mint')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeSubTab === 'mint'
                ? 'bg-emerald-500 text-slate-950 shadow-sm'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
            }`}
          >
            <Play className="w-3.5 h-3.5" />
            <span>实时抢购发射舱 (T-2s Mint)</span>
          </button>

          <button
            id="tab-doctor"
            onClick={() => setActiveSubTab('doctor')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeSubTab === 'doctor'
                ? 'bg-emerald-500 text-slate-950 shadow-sm'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>环境与权限诊断 (Doctor)</span>
          </button>

          <button
            id="tab-wallets"
            onClick={() => setActiveSubTab('wallets')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeSubTab === 'wallets'
                ? 'bg-emerald-500 text-slate-950 shadow-sm'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>钱包与原子充值 (Wallets & Fund)</span>
          </button>

          <button
            id="tab-executor"
            onClick={() => setActiveSubTab('executor')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeSubTab === 'executor'
                ? 'bg-emerald-500 text-slate-950 shadow-sm'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>确定性执行器部署 (CREATE2)</span>
          </button>

          <button
            id="tab-calldata"
            onClick={() => setActiveSubTab('calldata')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeSubTab === 'calldata'
                ? 'bg-emerald-500 text-slate-950 shadow-sm'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>Calldata 只读嗅探器</span>
          </button>
        </div>
      </div>

      {/* 2. MAIN TWO-COLUMN SPLIT: LEFT LOGS STREAM (5 COLS), RIGHT WORKBENCH UI (7 COLS) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Right Column on Desktop: Workbench & Sub-Wallets Matrix (7 cols) */}
        <div className="lg:col-span-7 space-y-6 order-1 lg:order-2">
          {/* TAB 1: MINT ENGINE */}
          {activeSubTab === 'mint' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center space-x-2">
                  <Play className="w-5 h-5 text-emerald-600" />
                  <h3 className="font-bold text-slate-900 text-base">抢购发射舱工作台</h3>
                </div>
                <span className={`text-[11px] font-mono px-2.5 py-0.5 rounded-full border ${activeNetwork.badgeColor}`}>
                  {activeNetwork.name} · {activeNetwork.currency}
                </span>
              </div>

              {/* Mode Selection */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700">运作架构模式:</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <button
                    onClick={() => setMintMode('sponsored')}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      mintMode === 'sponsored'
                        ? 'border-indigo-500 bg-indigo-50/50 ring-2 ring-indigo-200'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-indigo-950">EIP-7702 赞助</span>
                      <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-mono">
                        代付推荐
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 leading-snug">主代付钱包出 Gas，NFT 原子归集</p>
                  </button>

                  <button
                    onClick={() => setMintMode('self_funded')}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      mintMode === 'self_funded'
                        ? 'border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-200'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-950">自费多钱包并发</span>
                      <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-mono">
                        传统并发
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 leading-snug">各钱包自备代币，并发广播</p>
                  </button>

                  <button
                    onClick={() => setMintMode('single')}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      mintMode === 'single'
                        ? 'border-slate-500 bg-slate-100 ring-2 ring-slate-200'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">单钱包极简</span>
                      <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-mono">
                        1 钱包
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 leading-snug">零外部清单依赖，直接发起</p>
                  </button>
                </div>
              </div>

              {/* Target Project Card */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">SeaDrop 目标项目与阶段参数</span>
                  <span className="text-xs font-mono bg-white px-2 py-0.5 rounded border border-slate-200 text-emerald-700">
                    OpenSea SeaDrop
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px]">项目名称</span>
                    <input
                      type="text"
                      value={selectedDrop.name}
                      onChange={(e) => setSelectedDrop({ ...selectedDrop, name: e.target.value })}
                      className="w-full mt-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900 font-medium"
                    />
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">活动阶段</span>
                    <select
                      value={selectedDrop.activeStage}
                      onChange={(e) => setSelectedDrop({ ...selectedDrop, activeStage: e.target.value })}
                      className="w-full mt-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900 font-medium cursor-pointer"
                    >
                      <option value="WL & Allowlist">阶段 1: WL & Allowlist 白名单</option>
                      <option value="FCFS Priority">阶段 2: FCFS 优先抢购</option>
                      <option value="Public Sale">阶段 3: Public 公开发售</option>
                    </select>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">铸造单价 ({activeNetwork.currency})</span>
                    <input
                      type="number"
                      step="0.001"
                      value={selectedDrop.mintPrice}
                      onChange={(e) => setSelectedDrop({ ...selectedDrop, mintPrice: parseFloat(e.target.value) || 0 })}
                      className="w-full mt-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900 font-mono"
                    />
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">SeaDrop 合约地址</span>
                    <input
                      type="text"
                      value={selectedDrop.contractAddress}
                      onChange={(e) => setSelectedDrop({ ...selectedDrop, contractAddress: e.target.value })}
                      className="w-full mt-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900 font-mono text-[11px]"
                    />
                  </div>
                </div>
              </div>

              {/* Simulation Safeguards & Options */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50/70 border border-amber-200 text-xs text-amber-900">
                <div className="flex items-center space-x-2">
                  <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                  <div>
                    <span className="font-bold">单点失败隔离容错机制测试</span>
                    <p className="text-[11px] text-amber-700">模拟钱包 #2 遭遇限购 Revert，验证其余钱包正常打包不中断</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={simulatePartialRevert}
                  onChange={(e) => setSimulatePartialRevert(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded cursor-pointer"
                />
              </div>

              {/* Trigger Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                <button
                  id="btn-run-fast-mint"
                  disabled={isMintRunning}
                  onClick={() => startMintSimulation(true)}
                  className="w-full sm:flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-sm rounded-xl transition-all shadow-sm flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <Flame className="w-4 h-4" />
                  <span>{isMintRunning ? '抢购执行中...' : '启动抢购模拟测试 (T-2s 调度)'}</span>
                </button>

                <button
                  id="btn-run-timed-mint"
                  disabled={isMintRunning}
                  onClick={() => startMintSimulation(false)}
                  className="w-full sm:w-auto py-3 px-4 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-800 font-semibold text-xs rounded-xl transition-all border border-slate-200 flex items-center justify-center space-x-1.5 cursor-pointer"
                >
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  <span>15 秒倒计时演练</span>
                </button>
              </div>

              {/* Live Progress */}
              {isMintRunning && (
                <div className="space-y-2 p-3.5 bg-slate-900 text-white rounded-xl border border-slate-800">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono text-emerald-400 font-medium">
                      {countdownSeconds !== null && countdownSeconds > 0
                        ? `⏱️ 倒计时剩余 T-${countdownSeconds}s... 正在等待阶段开放`
                        : '🚀 正在上链广播与确认...'}
                    </span>
                    <span className="font-mono text-slate-400">{mintProgress}%</span>
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
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center space-x-2">
                  <Zap className="w-5 h-5 text-emerald-600" />
                  <h3 className="font-bold text-slate-900 text-base">环境与权限诊断 (Doctor)</h3>
                </div>
                <button
                  onClick={handleRunDoctor}
                  disabled={doctorRunning}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 cursor-pointer shadow-xs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${doctorRunning ? 'animate-spin' : ''}`} />
                  <span>{doctorRunning ? '诊断中...' : '运行 Doctor 诊断'}</span>
                </button>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 leading-relaxed">
                正在诊断网络: <span className="font-bold text-slate-900">{activeNetwork.name}</span> | 节点地址: <span className="font-mono text-slate-800">{effectiveRpcUrl}</span>
              </div>

              {/* Diagnostics Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-start space-x-2.5">
                  {doctorResults ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-slate-300 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <span className="font-bold text-slate-900">RPC 节点延迟与连通性</span>
                    <p className="text-[11px] text-slate-500 mt-0.5">测试与 RPC 节点的通信往返耗时（当前: {rpcPingState.latencyMs}ms）</p>
                  </div>
                </div>

                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-start space-x-2.5">
                  {doctorResults ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-slate-300 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <span className="font-bold text-slate-900">EIP-1559 费率历史 (eth_feeHistory)</span>
                    <p className="text-[11px] text-slate-500 mt-0.5">确保能动态拉取最近区块的 BaseFee 与小费</p>
                  </div>
                </div>

                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-start space-x-2.5">
                  {doctorResults ? (
                    doctorResults.eip7702Supported ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    )
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-slate-300 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <span className="font-bold text-slate-900">EIP-7702 Prague 授权支持</span>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {activeNetwork.supports7702 ? '支持类型 0x04 委托交易' : '当前链未激活，建议切换至 Base 或自费模式'}
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-start space-x-2.5">
                  {doctorResults ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-slate-300 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <span className="font-bold text-slate-900">EIP-1153 暂态存储防重入</span>
                    <p className="text-[11px] text-slate-500 mt-0.5">测试 TSTORE / TLOAD 指令，仅需 100 gas</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: WALLETS & FUNDING */}
          {activeSubTab === 'wallets' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center space-x-2">
                  <Users className="w-5 h-5 text-emerald-600" />
                  <h3 className="font-bold text-slate-900 text-base">钱包与资金管理测试</h3>
                </div>
                <button
                  onClick={copyWalletsJson}
                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-mono transition-all flex items-center space-x-1 cursor-pointer"
                >
                  {copiedWallets ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedWallets ? '已复制 JSON' : '复制 wallets.json'}</span>
                </button>
              </div>

              {/* Actions */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">批量离线生成</span>
                    <span className="text-[10px] text-slate-500">create</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      min="1"
                      max="25"
                      value={genCount}
                      onChange={(e) => setGenCount(parseInt(e.target.value) || 1)}
                      className="w-16 px-2 py-1 bg-white border border-slate-200 rounded text-xs text-center font-mono"
                    />
                    <button
                      onClick={handleGenerateWallets}
                      className="flex-1 py-1 px-2 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-medium cursor-pointer"
                    >
                      重新生成
                    </button>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">Multicall3 充值</span>
                    <span className="text-[10px] text-emerald-600 font-mono">--fund</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      step="0.005"
                      value={fundAmountPerWallet}
                      onChange={(e) => setFundAmountPerWallet(parseFloat(e.target.value) || 0)}
                      className="w-20 px-2 py-1 bg-white border border-slate-200 rounded text-xs text-center font-mono"
                    />
                    <button
                      disabled={isFunding}
                      onClick={handleMulticallFund}
                      className="flex-1 py-1 px-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded text-xs font-medium cursor-pointer"
                    >
                      {isFunding ? '分发中...' : '原子分发'}
                    </button>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">资金一键撤回</span>
                    <span className="text-[10px] text-rose-600 font-mono">--withdraw</span>
                  </div>
                  <button
                    onClick={handleWithdrawFunds}
                    className="w-full py-1.5 px-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded text-xs font-medium cursor-pointer"
                  >
                    回收子钱包余额外币
                  </button>
                </div>
              </div>

              {/* Undelegate Row */}
              <div className="p-3.5 rounded-xl border border-indigo-100 bg-indigo-50/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <div>
                  <span className="font-bold text-indigo-950">EIP-7702 委托代码复原 (--undelegate)</span>
                  <p className="text-[11px] text-indigo-800/80">抢购完成后将子钱包的代码指针重置为 0，复原为纯 EOA 账户</p>
                </div>
                <button
                  onClick={handleUndelegate}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium cursor-pointer shrink-0"
                >
                  撤回所有委托
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: DEPLOY EXECUTOR */}
          {activeSubTab === 'executor' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center space-x-2">
                  <Cpu className="w-5 h-5 text-emerald-600" />
                  <h3 className="font-bold text-slate-900 text-base">确定性执行器部署计算器</h3>
                </div>
                <button
                  onClick={handleDeployExecutor}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 cursor-pointer shadow-xs"
                >
                  <Cpu className="w-3.5 h-3.5" />
                  <span>执行部署模拟</span>
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-slate-500 block text-[11px]">CREATE2 确定性工厂</span>
                  <input
                    type="text"
                    disabled
                    value="0x4e59b44847b379578588920cA78FbF26c0B4956C"
                    className="w-full mt-1 px-2.5 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-slate-600 font-mono text-xs"
                  />
                </div>

                <div>
                  <span className="text-slate-500 block text-[11px]">Sponsor 代付钱包地址 (计算唯一 Salt)</span>
                  <input
                    type="text"
                    value={sponsorAddress}
                    onChange={(e) => setSponsorAddress(e.target.value)}
                    className="w-full mt-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900 font-mono text-xs"
                  />
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800">计算得出的 SponsoredMintExecutor 地址:</span>
                    <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-mono text-[10px]">
                      {executorDeployed ? '已部署 (Active)' : '待部署'}
                    </span>
                  </div>
                  <div className="bg-slate-950 text-emerald-400 p-2.5 rounded font-mono text-xs break-all border border-slate-800">
                    {calcExecutorAddress}
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    公式: <code className="text-slate-800 font-mono">CREATE2(0x4e59..., salt, initCodeHash)</code>
                    。在任何 EVM 链上，只要 SponsorKey 一致，计算出的执行器地址永远一致！
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: CALLDATA PROBE */}
          {activeSubTab === 'calldata' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center space-x-2">
                  <FileCode className="w-5 h-5 text-emerald-600" />
                  <h3 className="font-bold text-slate-900 text-base">Calldata 只读测试探测器</h3>
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
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 cursor-pointer shadow-xs"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>探测 Calldata</span>
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <p className="text-slate-600 leading-relaxed">
                  在正式开盘前，检查 OpenSea 阶段配置是否已经生效，并验证特定子钱包的 Merkle 证明是否被 SeaDrop 正确识别。
                </p>

                <div className="bg-slate-950 text-slate-200 p-3.5 rounded-xl font-mono text-[11px] space-y-2 border border-slate-800 overflow-x-auto">
                  <div className="text-emerald-400 font-bold"># OpenSea GraphQL 模拟响应 Payload</div>
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

          {/* Sub-wallet List Matrix */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4 text-slate-700" />
                <h4 className="font-bold text-slate-900 text-sm">测试子钱包列表 ({wallets.length} 个)</h4>
              </div>
              <span className="text-[11px] text-slate-500 font-mono">
                总代币: {wallets.reduce((acc, w) => acc + w.nativeBalance, 0).toFixed(4)} {activeNetwork.currency}
              </span>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {wallets.map((w) => (
                <div
                  key={w.id}
                  className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-slate-100/80 transition-all text-xs"
                >
                  <div className="flex items-center space-x-3">
                    <span className="w-5 h-5 rounded-full bg-slate-900 text-white font-mono text-[10px] font-bold flex items-center justify-center">
                      {w.id}
                    </span>
                    <div>
                      <div className="flex items-center space-x-1.5">
                        <span className="font-mono font-bold text-slate-800">
                          {w.address.slice(0, 8)}...{w.address.slice(-6)}
                        </span>
                        {w.isDelegated ? (
                          <span className="text-[9px] bg-indigo-100 text-indigo-700 px-1.5 py-0.2 rounded font-mono">
                            7702 已委托
                          </span>
                        ) : (
                          <span className="text-[9px] bg-slate-200 text-slate-600 px-1.5 py-0.2 rounded font-mono">
                            纯 EOA
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-500 font-mono">
                        余额: {w.nativeBalance} {activeNetwork.currency}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {w.status === 'idle' && (
                      <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-mono">
                        空闲待命
                      </span>
                    )}
                    {w.status === 'ready' && (
                      <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-mono animate-pulse">
                        签名锁定
                      </span>
                    )}
                    {w.status === 'fetching_calldata' && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-mono animate-pulse">
                        Calldata 抓取
                      </span>
                    )}
                    {w.status === 'broadcasting' && (
                      <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-mono animate-pulse">
                        上链广播中
                      </span>
                    )}
                    {w.status === 'success' && (
                      <div className="flex items-center space-x-1 text-emerald-600 font-mono text-[11px]">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>已铸造 {w.mintedNftCount} 枚</span>
                      </div>
                    )}
                    {w.status === 'reverted' && (
                      <div className="flex items-center space-x-1 text-rose-600 font-mono text-[11px]">
                        <XCircle className="w-3.5 h-3.5" />
                        <span>单点回滚 (已隔离)</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Left Column on Desktop: Terminal & Chain Asset Visualizer (5 cols) */}
        <div className="lg:col-span-5 space-y-6 order-2 lg:order-1">
          {/* CLI Terminal Simulator */}
          <div className="bg-slate-950 rounded-2xl border border-slate-800 p-4 shadow-sm flex flex-col h-[560px]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-xs">
              <div className="flex items-center space-x-2">
                <div className="flex space-x-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                </div>
                <span className="text-slate-400 font-mono ml-2">osnm-terminal-stream</span>
              </div>
              <button
                onClick={() => setLogs([])}
                className="text-[11px] text-slate-500 hover:text-slate-300 font-mono cursor-pointer"
              >
                清空日志
              </button>
            </div>

            {/* Scrollable Logs Output */}
            <div className="flex-1 overflow-y-auto py-3 space-y-2 font-mono text-xs leading-relaxed">
              {logs.map((log, idx) => (
                <div key={idx} className="flex items-start space-x-2">
                  <span className="text-slate-600 shrink-0 text-[10px] mt-0.5">{log.timestamp}</span>
                  {log.level === 'cmd' && <span className="text-emerald-400 font-bold">{log.message}</span>}
                  {log.level === 'info' && <span className="text-slate-300">{log.message}</span>}
                  {log.level === 'success' && <span className="text-emerald-400">{log.message}</span>}
                  {log.level === 'warn' && <span className="text-amber-400">{log.message}</span>}
                  {log.level === 'error' && <span className="text-rose-400 font-bold">{log.message}</span>}
                </div>
              ))}
              <div ref={terminalEndRef} />
            </div>

            {/* Terminal Input Mock */}
            <div className="pt-2 border-t border-slate-800 flex items-center space-x-2 text-xs font-mono text-slate-400">
              <span className="text-emerald-400 font-bold">&gt;</span>
              <span className="text-slate-500 text-[11px]">准备就绪，点击右侧工作台功能按键触发真实调度</span>
            </div>
          </div>

          {/* Chain Asset Visualizer */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
            <div className="flex items-center space-x-2 text-xs font-bold text-slate-800">
              <Layers className="w-4 h-4 text-emerald-600" />
              <span>当前网络链上资金与 NFT 原子流向</span>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-slate-500">代付赞助钱包 (Sponsor)</span>
                <span className="font-mono font-bold text-slate-900">
                  {sponsorBalance.toFixed(4)} {activeNetwork.currency}
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-slate-500">所有子钱包汇总资金</span>
                <span className="font-mono font-bold text-slate-900">
                  {wallets.reduce((sum, w) => sum + w.nativeBalance, 0).toFixed(4)} {activeNetwork.currency}
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-indigo-50 border border-indigo-100">
                <div>
                  <span className="text-indigo-900 font-bold block">最终 NFT 归集主地址</span>
                  <span className="text-[10px] font-mono text-indigo-700">{recipientAddress.slice(0, 16)}...</span>
                </div>
                <div className="text-right">
                  <span className="text-lg font-bold font-mono text-indigo-600">{recipientNftCount}</span>
                  <span className="text-[11px] text-indigo-800 block">枚已安全接收</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. PRIVATE RPC SETTINGS MODAL */}
      {rpcModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 w-full max-w-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-slate-900 text-white">
                  <Server className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">私人 RPC 节点与专线配置</h3>
                  <p className="text-[11px] text-slate-500">当前网络: {activeNetwork.name} (ChainID: {activeNetwork.chainId})</p>
                </div>
              </div>
              <button
                onClick={() => setRpcModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-4 text-xs">
              {/* RPC Mode Toggle */}
              <div className="space-y-2">
                <label className="font-bold text-slate-800 block">节点接入方式:</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setUseCustomRpc(false)}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      !useCustomRpc
                        ? 'border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-200'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="font-bold text-slate-900">公共默认 RPC</div>
                    <div className="text-[11px] text-slate-500 mt-0.5 truncate">{activeNetwork.defaultRpcUrl}</div>
                  </button>

                  <button
                    onClick={() => setUseCustomRpc(true)}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      useCustomRpc
                        ? 'border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-200'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="font-bold text-slate-900">自定义 / 私人专线 RPC</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">Alchemy, QuickNode, 自建等</div>
                  </button>
                </div>
              </div>

              {/* Custom RPC Input */}
              {useCustomRpc && (
                <div className="space-y-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-slate-800">输入私人 RPC URL (含 API Key):</label>
                    <button
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center space-x-1 cursor-pointer"
                    >
                      {showApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      <span>{showApiKey ? '隐藏 Key' : '明文显示'}</span>
                    </button>
                  </div>

                  <div className="relative">
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      placeholder={`https://${activeNetwork.id}-mainnet.g.alchemy.com/v2/YOUR-KEY`}
                      value={customRpcUrl}
                      onChange={(e) => setCustomRpcUrl(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>

                  {/* Preset Buttons */}
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[11px] text-slate-500">主流服务商快捷填入模板:</span>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        onClick={() => setCustomRpcUrl(`https://${activeNetwork.id}-mainnet.g.alchemy.com/v2/demo-key`)}
                        className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded text-[10px] font-mono cursor-pointer"
                      >
                        Alchemy
                      </button>
                      <button
                        onClick={() => setCustomRpcUrl(`https://${activeNetwork.id}.infura.io/v3/demo-key`)}
                        className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded text-[10px] font-mono cursor-pointer"
                      >
                        Infura
                      </button>
                      <button
                        onClick={() => setCustomRpcUrl(`https://${activeNetwork.id}.quiknode.pro/demo-key/`)}
                        className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded text-[10px] font-mono cursor-pointer"
                      >
                        QuickNode
                      </button>
                      <button
                        onClick={() => setCustomRpcUrl('http://127.0.0.1:8545')}
                        className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded text-[10px] font-mono cursor-pointer"
                      >
                        本地 Anvil/Hardhat
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Ping Test Status Card in Modal */}
              <div className="flex items-center justify-between p-3 bg-slate-900 text-white rounded-xl">
                <div>
                  <span className="text-[11px] text-slate-400 block">实时节点握手状态</span>
                  <span className="font-mono text-xs text-emerald-400 font-bold">
                    {rpcPingState.status === 'testing'
                      ? '测试连接中...'
                      : `● 响应良好 (${rpcPingState.latencyMs}ms, 最新区块 #${rpcPingState.blockNumber})`}
                  </span>
                </div>
                <button
                  onClick={() => testRpcPing(effectiveRpcUrl)}
                  disabled={rpcPingState.status === 'testing'}
                  className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg text-xs cursor-pointer flex items-center space-x-1"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${rpcPingState.status === 'testing' ? 'animate-spin' : ''}`} />
                  <span>立即测速</span>
                </button>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end p-4 border-t border-slate-100 bg-slate-50 space-x-2">
              <button
                onClick={() => setRpcModalOpen(false)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-xl text-xs cursor-pointer"
              >
                保存并生效
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
