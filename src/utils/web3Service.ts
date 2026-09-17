import {
  createPublicClient,
  createWalletClient,
  http,
  custom,
  parseEther,
  formatEther,
  parseGwei,
  defineChain,
  isAddress,
  type PublicClient
} from 'viem';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';

export const MULTICALL3_ADDRESS = '0xcA11bde05977b3631167028862bE2a173976CA11' as const;

export const MULTICALL3_ABI = [
  {
    name: 'aggregate3Value',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      {
        name: 'calls',
        type: 'tuple[]',
        components: [
          { name: 'target', type: 'address' },
          { name: 'allowFailure', type: 'bool' },
          { name: 'value', type: 'uint256' },
          { name: 'callData', type: 'bytes' }
        ]
      }
    ],
    outputs: [
      {
        name: 'returnData',
        type: 'tuple[]',
        components: [
          { name: 'success', type: 'bool' },
          { name: 'returnData', type: 'bytes' }
        ]
      }
    ]
  },
  {
    name: 'getEthBalance',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'addr', type: 'address' }],
    outputs: [{ name: 'balance', type: 'uint256' }]
  }
] as const;

export function buildChainDefinition(chainId: number, name: string, currency: string, rpcUrl: string, explorerUrl: string) {
  return defineChain({
    id: chainId,
    name,
    nativeCurrency: {
      decimals: 18,
      name: currency,
      symbol: currency
    },
    rpcUrls: {
      default: { http: [rpcUrl] },
      public: { http: [rpcUrl] }
    },
    blockExplorers: {
      default: { name: 'Explorer', url: explorerUrl }
    }
  });
}

export function getPublicClient(rpcUrl: string, chainId: number) {
  return createPublicClient({
    transport: http(rpcUrl, {
      timeout: 15000,
      retryCount: 2
    })
  });
}

/**
 * Check if browser has an injected Ethereum provider (e.g. MetaMask, Rabby, OKX)
 */
export function hasInjectedProvider(): boolean {
  return typeof window !== 'undefined' && Boolean((window as unknown as { ethereum?: unknown }).ethereum);
}

/**
 * Connect to injected browser wallet
 */
export async function connectInjectedWallet(): Promise<{ address: `0x${string}`; chainId: number }> {
  const eth = (window as unknown as { ethereum?: { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> } }).ethereum;
  if (!eth) {
    throw new Error('未检测到浏览器 Web3 钱包 (如 MetaMask/Rabby/OKX)，请先安装扩展或使用私钥直接签名！');
  }

  const accounts = (await eth.request({ method: 'eth_requestAccounts' })) as string[];
  if (!accounts || accounts.length === 0) {
    throw new Error('用户拒绝连接或未找到有效账户');
  }

  const chainIdHex = (await eth.request({ method: 'eth_chainId' })) as string;
  const chainId = parseInt(chainIdHex, 16);

  return {
    address: accounts[0] as `0x${string}`,
    chainId
  };
}

/**
 * Request wallet to switch chain or add network
 */
export async function switchOrAddChain(
  chainId: number,
  name: string,
  currency: string,
  rpcUrl: string,
  explorerUrl: string
): Promise<void> {
  const eth = (window as unknown as { ethereum?: { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> } }).ethereum;
  if (!eth) return;

  const hexChainId = `0x${chainId.toString(16)}`;
  try {
    await eth.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: hexChainId }]
    });
  } catch (switchError: unknown) {
    // Error code 4902 means the chain has not been added to wallet
    const err = switchError as { code?: number };
    if (err?.code === 4902) {
      await eth.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: hexChainId,
            chainName: name,
            nativeCurrency: { name: currency, symbol: currency, decimals: 18 },
            rpcUrls: [rpcUrl],
            blockExplorerUrls: [explorerUrl]
          }
        ]
      });
    } else {
      throw switchError;
    }
  }
}

/**
 * Query real on-chain balance for an address in ETH (or native token)
 */
export async function fetchOnChainBalance(rpcUrl: string, chainId: number, address: string): Promise<number> {
  if (!isAddress(address)) {
    return 0;
  }
  try {
    const client = getPublicClient(rpcUrl, chainId);
    const balanceWei = await client.getBalance({ address: address as `0x${string}` });
    return parseFloat(formatEther(balanceWei));
  } catch {
    return 0;
  }
}

/**
 * Query real on-chain balances for multiple addresses in batch
 */
export async function fetchBatchOnChainBalances(
  rpcUrl: string,
  chainId: number,
  addresses: string[]
): Promise<Map<string, number>> {
  const resultMap = new Map<string, number>();
  const client = getPublicClient(rpcUrl, chainId);

  const validAddresses = addresses.filter((addr) => isAddress(addr));
  
  await Promise.allSettled(
    validAddresses.map(async (addr) => {
      try {
        const balWei = await client.getBalance({ address: addr as `0x${string}` });
        resultMap.set(addr.toLowerCase(), parseFloat(formatEther(balWei)));
      } catch {
        resultMap.set(addr.toLowerCase(), 0);
      }
    })
  );

  return resultMap;
}

/**
 * Check if Multicall3 contract is deployed on this chain
 */
export async function checkMulticall3Deployed(rpcUrl: string, chainId: number): Promise<boolean> {
  try {
    const client = getPublicClient(rpcUrl, chainId);
    const bytecode = await client.getBytecode({ address: MULTICALL3_ADDRESS });
    return Boolean(bytecode && bytecode !== '0x' && bytecode.length > 2);
  } catch {
    return false;
  }
}

/**
 * Generate cryptographically valid Ethereum Private Keys and Matching Addresses
 */
export function generateCryptographicWallets(count: number): Array<{ address: `0x${string}`; privateKey: `0x${string}` }> {
  const list: Array<{ address: `0x${string}`; privateKey: `0x${string}` }> = [];
  for (let i = 0; i < count; i++) {
    const pk = generatePrivateKey();
    const account = privateKeyToAccount(pk);
    list.push({
      address: account.address,
      privateKey: pk
    });
  }
  return list;
}

/**
 * Execute real on-chain Multicall3 Funding
 */
export async function executeRealMulticallFund(options: {
  rpcUrl: string;
  chainId: number;
  chainName: string;
  currency: string;
  explorerUrl: string;
  targets: Array<{ address: string; amount: number }>;
  useBrowserWallet: boolean;
  sponsorPrivateKey?: string;
  onStatusUpdate?: (msg: string) => void;
}): Promise<{ txHash: string; totalSent: number }> {
  const { rpcUrl, chainId, chainName, currency, explorerUrl, targets, useBrowserWallet, sponsorPrivateKey, onStatusUpdate } = options;

  const chain = buildChainDefinition(chainId, chainName, currency, rpcUrl, explorerUrl);
  const publicClient = getPublicClient(rpcUrl, chainId);

  // Prepare Multicall3 calls and compute exact total Wei sum from BigInt to avoid float mismatch
  const calls = targets.map((t) => {
    // Format amount cleanly to prevent exponential notation or float precision loss
    const amountStr = typeof t.amount === 'number' ? t.amount.toFixed(18).replace(/\.?0+$/, '') || '0' : String(t.amount);
    return {
      target: t.address as `0x${string}`,
      allowFailure: false,
      value: parseEther(amountStr),
      callData: '0x' as `0x${string}`
    };
  });

  // Calculate totalValueWei strictly by summing calls[i].value BigInts (Multicall3 requirement: msg.value == sum(call.value))
  const totalValueWei = calls.reduce((acc, c) => acc + c.value, 0n);
  const totalAmount = Number(formatEther(totalValueWei));

  onStatusUpdate?.(`已编码 Multicall3 aggregate3Value 调用，共包含 ${targets.length} 笔资金分发...`);

  let txHash: `0x${string}`;

  if (useBrowserWallet) {
    const eth = (window as unknown as { ethereum?: { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> } }).ethereum;
    if (!eth) {
      throw new Error('未检测到浏览器 Web3 钱包，请连接钱包或填入 Sponsor 私钥！');
    }

    const walletClient = createWalletClient({
      chain,
      transport: custom(eth)
    });

    const [account] = await walletClient.getAddresses();
    if (!account) {
      throw new Error('未找到已连接的钱包账户，请先在右上角连接钱包！');
    }

    onStatusUpdate?.('请在浏览器钱包 (MetaMask/Rabby) 中确认 Multicall3 原子分发交易...');

    txHash = await walletClient.writeContract({
      chain,
      address: MULTICALL3_ADDRESS,
      abi: MULTICALL3_ABI,
      functionName: 'aggregate3Value',
      args: [calls],
      value: totalValueWei,
      account
    });
  } else {
    // Use Sponsor Private Key
    if (!sponsorPrivateKey || !sponsorPrivateKey.startsWith('0x') || sponsorPrivateKey.length !== 66) {
      throw new Error('请提供有效的 32 字节私钥 (以 0x 开头的 66 位十六进制字符串)，或切换至「连接浏览器钱包」模式！');
    }

    const account = privateKeyToAccount(sponsorPrivateKey as `0x${string}`);
    const walletClient = createWalletClient({
      account,
      chain,
      transport: http(rpcUrl)
    });

    onStatusUpdate?.(`正在通过 Sponsor 账户 ${account.address.slice(0, 10)}... 离线签名并广播交易...`);

    // On Arc network (chainId: 5042), minimum gasPrice is 20 Gwei
    const minGasPriceWei = chainId === 5042 ? parseGwei('20') : undefined;

    const writeParams: any = {
      chain,
      account,
      address: MULTICALL3_ADDRESS,
      abi: MULTICALL3_ABI,
      functionName: 'aggregate3Value',
      args: [calls],
      value: totalValueWei
    };
    if (minGasPriceWei) {
      writeParams.gasPrice = minGasPriceWei;
    }

    txHash = await walletClient.writeContract(writeParams);
  }

  onStatusUpdate?.(`交易已广播至 ${chainName} 内存池！哈希: ${txHash}，正在等待出块确认...`);

  // Wait for receipt
  await publicClient.waitForTransactionReceipt({ hash: txHash, timeout: 60000 });

  return {
    txHash,
    totalSent: totalAmount
  };
}

/**
 * Execute real on-chain Fund Withdraw / Collection from child wallets
 */
export async function executeRealWithdrawFunds(options: {
  rpcUrl: string;
  chainId: number;
  chainName: string;
  currency: string;
  explorerUrl: string;
  recipientAddress: string;
  childWallets: Array<{ address: string; privateKey: string; balance: number }>;
  onStatusUpdate?: (msg: string) => void;
}): Promise<{
  totalRecovered: number;
  transfers: Array<{ address: string; txHash: string; recovered: number; error?: string }>;
}> {
  const { rpcUrl, chainId, chainName, currency, explorerUrl, recipientAddress, childWallets, onStatusUpdate } = options;

  if (!isAddress(recipientAddress)) {
    throw new Error('主接收钱包地址 (RECIPIENT_ADDRESS) 格式不合规！');
  }

  const chain = buildChainDefinition(chainId, chainName, currency, rpcUrl, explorerUrl);
  const publicClient = getPublicClient(rpcUrl, chainId);

  // Get current gas price and enforce minimum gas floor (Arc chainId 5042 is minimum 20 Gwei)
  let gasPrice = await publicClient.getGasPrice();
  const minGasFloorWei = chainId === 5042 ? parseGwei('20') : 0n;
  if (gasPrice < minGasFloorWei) {
    gasPrice = minGasFloorWei;
  }
  const gasLimit = 21000n;
  const gasCostWei = gasLimit * gasPrice;
  const gasCostEth = parseFloat(formatEther(gasCostWei));

  const displayGwei = (Number(gasPrice) / 1e9).toFixed(2);
  onStatusUpdate?.(`网络基准 Gas Price: ${displayGwei} Gwei${chainId === 5042 ? ' (已锁定 Arc 最低下限 20 Gwei)' : ''} | 单笔转账预估 Gas: ${gasCostEth.toFixed(6)} ${currency}`);

  let totalRecovered = 0;
  const transfers: Array<{ address: string; txHash: string; recovered: number; error?: string }> = [];

  for (const cw of childWallets) {
    if (!cw.privateKey || !cw.privateKey.startsWith('0x') || cw.privateKey.length !== 66) {
      transfers.push({
        address: cw.address,
        txHash: '',
        recovered: 0,
        error: '私钥无效或缺失'
      });
      continue;
    }

    try {
      const account = privateKeyToAccount(cw.privateKey as `0x${string}`);
      // Query exact fresh on-chain balance
      const balanceWei = await publicClient.getBalance({ address: account.address });

      if (balanceWei <= gasCostWei) {
        transfers.push({
          address: cw.address,
          txHash: '',
          recovered: 0,
          error: `余额 (${formatEther(balanceWei)} ${currency}) 低于转账基础 Gas (${gasCostEth.toFixed(6)} ${currency})`
        });
        continue;
      }

      const sendValueWei = balanceWei - gasCostWei;
      const sendValueEth = parseFloat(formatEther(sendValueWei));

      const walletClient = createWalletClient({
        account,
        chain,
        transport: http(rpcUrl)
      });

      onStatusUpdate?.(`正在从子钱包 ${account.address.slice(0, 8)}... 归集 ${sendValueEth.toFixed(6)} ${currency}...`);

      const txHash = await walletClient.sendTransaction({
        chain,
        account,
        to: recipientAddress as `0x${string}`,
        value: sendValueWei,
        gas: gasLimit,
        gasPrice
      } as any);

      totalRecovered += sendValueEth;
      transfers.push({
        address: cw.address,
        txHash,
        recovered: sendValueEth
      });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      transfers.push({
        address: cw.address,
        txHash: '',
        recovered: 0,
        error: errorMsg.slice(0, 60)
      });
    }
  }

  return {
    totalRecovered,
    transfers
  };
}

/**
 * Execute real on-chain mint transaction across wallets
 */
export async function executeRealOnChainMint(options: {
  rpcUrl: string;
  chainId: number;
  chainName: string;
  currency: string;
  contractAddress: string;
  mintPrice: number;
  wallets: Array<{ address: string; privateKey: string; quantity: number }>;
  onStatusUpdate?: (msg: string) => void;
}): Promise<{
  results: Array<{
    address: string;
    txHash: string;
    success: boolean;
    error?: string;
    mintedCount: number;
  }>;
}> {
  const { rpcUrl, chainId, chainName, currency, contractAddress, mintPrice, wallets, onStatusUpdate } = options;

  if (!isAddress(contractAddress)) {
    throw new Error(`目标抢购合约地址格式不合规: ${contractAddress}`);
  }

  const publicClient = getPublicClient(rpcUrl, chainId);
  const chain = buildChainDefinition(chainId, chainName, currency, rpcUrl, '');

  onStatusUpdate?.(`[真实链上检查] 正在向 ${chainName} RPC 探查合约 ${contractAddress.slice(0, 10)}... 部署字节码...`);

  // Verify real bytecode
  const bytecode = await publicClient.getBytecode({ address: contractAddress as `0x${string}` });
  if (!bytecode || bytecode === '0x' || bytecode.length <= 2) {
    throw new Error(`[真实链上拦截] 目标合约 ${contractAddress} 在 ${chainName} (Chain ID: ${chainId}) 尚未部署字节码（未上线或已销毁），无法在主网执行真实 Mint！拒绝伪造模拟数据。`);
  }

  // Enforce gas floor for Arc (20 Gwei minimum)
  let gasPrice = await publicClient.getGasPrice();
  const minGasFloorWei = chainId === 5042 ? parseGwei('20') : 0n;
  if (gasPrice < minGasFloorWei) {
    gasPrice = minGasFloorWei;
  }

  const results: Array<{
    address: string;
    txHash: string;
    success: boolean;
    error?: string;
    mintedCount: number;
  }> = [];

  for (const w of wallets) {
    try {
      if (!w.privateKey || !w.privateKey.startsWith('0x') || w.privateKey.length !== 66) {
        throw new Error('私钥缺失或格式错误，无法完成离线签名');
      }

      const account = privateKeyToAccount(w.privateKey as `0x${string}`);
      const balanceWei = await publicClient.getBalance({ address: account.address });
      const balanceEth = parseFloat(formatEther(balanceWei));

      const totalMintCostWei = parseEther((mintPrice * w.quantity).toString());
      const estimatedGasWei = 150000n * gasPrice;
      const totalRequiredWei = totalMintCostWei + estimatedGasWei;

      if (balanceWei < totalRequiredWei) {
        throw new Error(
          `链上真实余额不足: 需 ${parseFloat(formatEther(totalRequiredWei)).toFixed(4)} ${currency} (含 Gas)，当前仅有 ${balanceEth.toFixed(4)} ${currency}`
        );
      }

      const walletClient = createWalletClient({
        account,
        chain,
        transport: http(rpcUrl)
      });

      onStatusUpdate?.(`[签名广播] 钱包 ${account.address.slice(0, 8)}... 正在向主网广播真实抢购交易...`);

      const txHash = await walletClient.sendTransaction({
        chain,
        account,
        to: contractAddress as `0x${string}`,
        value: totalMintCostWei,
        gas: 150000n,
        gasPrice
      } as any);

      onStatusUpdate?.(`[主网已入池] 钱包 ${account.address.slice(0, 8)}... 交易哈希: ${txHash}，正在等待出块确认...`);

      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash, timeout: 60000 });

      if (receipt.status === 'success') {
        results.push({
          address: w.address,
          txHash,
          success: true,
          mintedCount: w.quantity
        });
      } else {
        results.push({
          address: w.address,
          txHash,
          success: false,
          error: '链上执行 Revert (合约执行已回滚)',
          mintedCount: 0
        });
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      results.push({
        address: w.address,
        txHash: '',
        success: false,
        error: errMsg.slice(0, 80),
        mintedCount: 0
      });
    }
  }

  return { results };
}
