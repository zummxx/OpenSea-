import React from 'react';
import {
  Users,
  Wallet,
  RefreshCw,
  Copy,
  Check,
  Key,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Layers
} from 'lucide-react';
import { TestWallet, NetworkConfig } from '../types';

interface WalletsFundPanelProps {
  wallets: TestWallet[];
  activeNetwork: NetworkConfig;
  sponsorAddress: string;
  setSponsorAddress: (addr: string) => void;
  recipientAddress: string;
  setRecipientAddress: (addr: string) => void;
  sponsorBalance: number;
  recipientNftCount: number;
  useBrowserWallet: boolean;
  setUseBrowserWallet: (use: boolean) => void;
  browserWallet: {
    isConnected: boolean;
    address: string;
    chainId: number;
    balance: number;
  };
  handleConnectBrowserWallet: () => void;
  sponsorPrivateKey: string;
  setSponsorPrivateKey: (key: string) => void;
  showSponsorKey: boolean;
  setShowSponsorKey: (show: boolean) => void;
  genCount: number;
  setGenCount: (count: number) => void;
  handleGenerateWallets: () => void;
  fundAmountPerWallet: number;
  setFundAmountPerWallet: (amt: number) => void;
  isFunding: boolean;
  handleMulticallFund: () => void;
  isWithdrawing: boolean;
  handleWithdrawFunds: () => void;
  handleUndelegate: () => void;
  syncAllBalances: () => void;
  isSyncingBalances: boolean;
  copyWalletsJson: () => void;
  copiedWallets: boolean;
  isHighlighted?: boolean;
}

export const WalletsFundPanel: React.FC<WalletsFundPanelProps> = ({
  wallets,
  activeNetwork,
  sponsorAddress,
  setSponsorAddress,
  recipientAddress,
  setRecipientAddress,
  sponsorBalance,
  recipientNftCount,
  useBrowserWallet,
  setUseBrowserWallet,
  browserWallet,
  handleConnectBrowserWallet,
  sponsorPrivateKey,
  setSponsorPrivateKey,
  showSponsorKey,
  setShowSponsorKey,
  genCount,
  setGenCount,
  handleGenerateWallets,
  fundAmountPerWallet,
  setFundAmountPerWallet,
  isFunding,
  handleMulticallFund,
  isWithdrawing,
  handleWithdrawFunds,
  handleUndelegate,
  syncAllBalances,
  isSyncingBalances,
  copyWalletsJson,
  copiedWallets,
  isHighlighted = false
}) => {
  return (
    <div className={`space-y-5 transition-all duration-300 ${isHighlighted ? 'ring-2 ring-emerald-500/50 rounded-2xl' : ''}`}>
      {/* 1. 钱包与主网资金实操控制台 */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
          <div className="flex items-center space-x-2">
            <Users className="w-5 h-5 text-emerald-600" />
            <h3 className="font-bold text-slate-900 text-sm md:text-base">钱包与主网资金实操</h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shrink-0">
              ● 100% 真实主网
            </span>
          </div>
          <div className="flex items-center space-x-1.5">
            <button
              onClick={syncAllBalances}
              disabled={isSyncingBalances}
              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-all flex items-center space-x-1 cursor-pointer"
              title="重新读取当前网络链上真实余额"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncingBalances ? 'animate-spin text-emerald-600' : ''}`} />
              <span>同步</span>
            </button>
            <button
              onClick={copyWalletsJson}
              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-mono transition-all flex items-center space-x-1 cursor-pointer"
              title="复制全部子钱包密钥对 JSON"
            >
              {copiedWallets ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedWallets ? '已复制' : 'wallets.json'}</span>
            </button>
          </div>
        </div>

        {/* Sponsor & Recipient Configuration */}
        <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/80 space-y-3 text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
            <span className="font-bold text-slate-900 flex items-center space-x-1.5">
              <Wallet className="w-4 h-4 text-emerald-600" />
              <span>主代付钱包 (Sponsor) 与归集</span>
            </span>
            
            {/* Signing Method Selector */}
            <div className="flex items-center space-x-2 text-[11px] text-slate-700">
              <label className="flex items-center space-x-1 cursor-pointer">
                <input
                  type="radio"
                  name="sponsorSignMethod"
                  checked={useBrowserWallet}
                  onChange={() => setUseBrowserWallet(true)}
                  className="text-emerald-600"
                />
                <span className="font-medium">Web3 钱包签名</span>
              </label>
              <label className="flex items-center space-x-1 cursor-pointer">
                <input
                  type="radio"
                  name="sponsorSignMethod"
                  checked={!useBrowserWallet}
                  onChange={() => setUseBrowserWallet(false)}
                  className="text-emerald-600"
                />
                <span className="font-medium">私钥离线签名</span>
              </label>
            </div>
          </div>

          <div className="space-y-2.5">
            {/* Sponsor Address */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-medium">代付 Sponsor:</span>
                <span className="text-emerald-700 font-bold font-mono text-[11px]">
                  余额: {sponsorBalance.toFixed(4)} {activeNetwork.currency}
                </span>
              </div>
              {useBrowserWallet ? (
                browserWallet.isConnected ? (
                  <div className="p-2 bg-white border border-emerald-300 rounded-lg flex items-center justify-between font-mono text-xs">
                    <span className="text-slate-800 truncate mr-2">{browserWallet.address}</span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-bold shrink-0">已绑定</span>
                  </div>
                ) : (
                  <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between">
                    <span className="text-amber-800 text-[11px]">未连接 Web3 钱包</span>
                    <button
                      onClick={handleConnectBrowserWallet}
                      className="px-2 py-0.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-medium cursor-pointer"
                    >
                      连接
                    </button>
                  </div>
                )
              ) : (
                <div className="relative">
                  <input
                    type="text"
                    value={sponsorAddress}
                    onChange={(e) => setSponsorAddress(e.target.value)}
                    placeholder="代付钱包地址 (0x...)"
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-mono text-xs text-slate-900"
                  />
                  {browserWallet.isConnected && (
                    <button
                      onClick={() => setSponsorAddress(browserWallet.address)}
                      className="absolute right-1.5 top-1.5 px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-medium cursor-pointer"
                    >
                      填入已连
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Recipient Address */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-medium">NFT 归集主地址 (Recipient):</span>
                {browserWallet.isConnected && (
                  <button
                    onClick={() => setRecipientAddress(browserWallet.address)}
                    className="text-[10px] text-indigo-600 hover:text-indigo-800 font-medium cursor-pointer"
                  >
                    填入已连钱包
                  </button>
                )}
              </div>
              <input
                type="text"
                value={recipientAddress}
                onChange={(e) => setRecipientAddress(e.target.value)}
                placeholder="接收 NFT 的真实主钱包地址 (0x...)"
                className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-mono text-xs text-slate-900"
              />
            </div>
          </div>

          <div className="p-2 bg-slate-100/90 rounded-lg border border-slate-200 text-[10.5px] text-slate-600 leading-snug">
            <strong>代付 Sponsor</strong> 出 Gas 或充值；<strong>归集 Recipient</strong> 接收抢到的 NFT，请务必填写您拥有控制权的地址！
          </div>

          {/* Direct Sponsor Private Key Input (if chosen) */}
          {!useBrowserWallet && (
            <div className="pt-2 border-t border-slate-200 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-medium flex items-center space-x-1">
                  <Key className="w-3.5 h-3.5 text-amber-600" />
                  <span>Sponsor 代付私钥:</span>
                </span>
                <button
                  onClick={() => setShowSponsorKey(!showSponsorKey)}
                  className="text-slate-500 hover:text-slate-800 flex items-center space-x-1 text-[11px] cursor-pointer"
                >
                  {showSponsorKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  <span>{showSponsorKey ? '隐藏' : '显示'}</span>
                </button>
              </div>
              <input
                type={showSponsorKey ? 'text' : 'password'}
                value={sponsorPrivateKey}
                onChange={(e) => setSponsorPrivateKey(e.target.value)}
                placeholder="0x1234567890abcdef..."
                className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-mono text-xs text-slate-900"
              />
              <p className="text-[9.5px] text-slate-500">私钥严格保留在前端本地内存，仅向 {activeNetwork.name} RPC 签名交易，绝不上报。</p>
            </div>
          )}
        </div>

        {/* Action Controls Grid */}
        <div className="grid grid-cols-1 gap-2.5">
          <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800">批量加密生成 EOA</span>
              <span className="text-[10px] text-slate-500">Secp256k1</span>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                min="1"
                max="25"
                value={genCount}
                onChange={(e) => setGenCount(parseInt(e.target.value) || 1)}
                className="w-14 px-2 py-1 bg-white border border-slate-200 rounded text-xs text-center font-mono"
              />
              <button
                onClick={handleGenerateWallets}
                className="flex-1 py-1 px-2 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-medium cursor-pointer"
              >
                生成有效密钥对
              </button>
            </div>
          </div>

          <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800">Multicall3 批量充值</span>
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
                className="flex-1 py-1 px-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded text-xs font-medium cursor-pointer shadow-xs"
              >
                {isFunding ? '分发中...' : 'Multicall3 充值'}
              </button>
            </div>
            <p className="text-[10px] text-slate-500">
              单笔原子交易向 {wallets.length} 个子钱包各分发 {fundAmountPerWallet} {activeNetwork.currency}
            </p>
          </div>

          <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800">资金一键原子归集</span>
              <span className="text-[10px] text-rose-600 font-mono">--withdraw</span>
            </div>
            <button
              disabled={isWithdrawing}
              onClick={handleWithdrawFunds}
              className="w-full py-1 px-2 bg-slate-200 hover:bg-slate-300 disabled:opacity-50 text-slate-800 rounded text-xs font-medium cursor-pointer"
            >
              {isWithdrawing ? '归集中...' : '回收子钱包资金至 Recipient'}
            </button>
            <p className="text-[10px] text-slate-500">
              扣除 21k gas{activeNetwork.id === 'arc' ? ' (锁定 Arc 20 Gwei 底线)' : ''}，将净余额安全转回主钱包
            </p>
          </div>
        </div>

        {/* Undelegate Row */}
        <div className="p-3 rounded-xl border border-indigo-100 bg-indigo-50/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
          <div>
            <span className="font-bold text-indigo-950">EIP-7702 委托复原 (--undelegate)</span>
            <p className="text-[10px] text-indigo-800/80">抢购完成后将子钱包代码指针重置为 address(0)</p>
          </div>
          <button
            onClick={handleUndelegate}
            className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium cursor-pointer shrink-0 text-xs"
          >
            撤回委托
          </button>
        </div>
      </div>

      {/* 2. 测试子钱包列表矩阵 */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Users className="w-4 h-4 text-slate-700" />
            <h4 className="font-bold text-slate-900 text-xs md:text-sm">测试子钱包列表 ({wallets.length} 个)</h4>
          </div>
          <span className="text-[11px] text-slate-500 font-mono">
            总额: {wallets.reduce((acc, w) => acc + w.nativeBalance, 0).toFixed(4)} {activeNetwork.currency}
          </span>
        </div>

        <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-200">
          {wallets.map((w) => (
            <div
              key={w.id}
              className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-slate-100/80 transition-all text-xs"
            >
              <div className="flex items-center space-x-2">
                <span className="w-5 h-5 rounded-full bg-slate-900 text-white font-mono text-[10px] font-bold flex items-center justify-center shrink-0">
                  {w.id}
                </span>
                <div className="min-w-0">
                  <div className="flex items-center space-x-1.5">
                    <span className="font-mono font-bold text-slate-800 truncate">
                      {w.address.slice(0, 6)}...{w.address.slice(-4)}
                    </span>
                    {w.isDelegated ? (
                      <span className="text-[9px] bg-indigo-100 text-indigo-700 px-1 py-0.2 rounded font-mono shrink-0">
                        7702
                      </span>
                    ) : (
                      <span className="text-[9px] bg-slate-200 text-slate-600 px-1 py-0.2 rounded font-mono shrink-0">
                        EOA
                      </span>
                    )}
                  </div>
                  <span className="text-[10.5px] text-slate-500 font-mono block">
                    {w.nativeBalance.toFixed(4)} {activeNetwork.currency}
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-1.5 shrink-0">
                {w.status === 'idle' && (
                  <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-mono">
                    待命
                  </span>
                )}
                {w.status === 'ready' && (
                  <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-mono animate-pulse">
                    锁定
                  </span>
                )}
                {w.status === 'fetching_calldata' && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-mono animate-pulse">
                    抓取
                  </span>
                )}
                {w.status === 'broadcasting' && (
                  <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-mono animate-pulse">
                    广播中
                  </span>
                )}
                {w.status === 'success' && (
                  <div className="flex flex-col items-end space-y-0.5">
                    <div className="flex items-center space-x-1 text-emerald-600 font-mono text-[10.5px] font-bold">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>{w.mintedNftCount} 枚</span>
                    </div>
                    {w.txHash && (
                      <a
                        href={`${activeNetwork.explorerUrl}/tx/${w.txHash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[9.5px] text-sky-600 hover:text-sky-800 hover:underline font-mono flex items-center space-x-0.5"
                      >
                        <span>{w.txHash.slice(0, 6)}...</span>
                        <ExternalLink className="w-2 h-2" />
                      </a>
                    )}
                  </div>
                )}
                {w.status === 'reverted' && (
                  <div className="flex flex-col items-end space-y-0.5">
                    <div className="flex items-center space-x-1 text-rose-600 font-mono text-[10.5px]">
                      <XCircle className="w-3 h-3" />
                      <span>{w.errorMsg || '回滚'}</span>
                    </div>
                    {w.txHash && (
                      <a
                        href={`${activeNetwork.explorerUrl}/tx/${w.txHash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[9.5px] text-slate-500 hover:underline font-mono flex items-center space-x-0.5"
                      >
                        <span>{w.txHash.slice(0, 6)}...</span>
                        <ExternalLink className="w-2 h-2" />
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. 链上资金与 NFT 原子流向看板 */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-2.5">
        <div className="flex items-center space-x-2 text-xs font-bold text-slate-800">
          <Layers className="w-4 h-4 text-emerald-600" />
          <span>链上资金与 NFT 原子流向</span>
        </div>

        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
            <span className="text-slate-500">代付钱包 (Sponsor)</span>
            <span className="font-mono font-bold text-slate-900">
              {sponsorBalance.toFixed(4)} {activeNetwork.currency}
            </span>
          </div>

          <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
            <span className="text-slate-500">子钱包汇总资金</span>
            <span className="font-mono font-bold text-slate-900">
              {wallets.reduce((sum, w) => sum + w.nativeBalance, 0).toFixed(4)} {activeNetwork.currency}
            </span>
          </div>

          <div className="flex items-center justify-between p-2.5 rounded-lg bg-indigo-50 border border-indigo-100">
            <div>
              <span className="text-indigo-900 font-bold block">最终 NFT 归集主地址</span>
              <span className="text-[10px] font-mono text-indigo-700 truncate max-w-[140px] block">
                {recipientAddress ? `${recipientAddress.slice(0, 10)}...${recipientAddress.slice(-6)}` : '未设置'}
              </span>
            </div>
            <div className="text-right">
              <span className="text-base font-bold font-mono text-indigo-600">{recipientNftCount}</span>
              <span className="text-[10px] text-indigo-800 block">枚已安全入库</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
