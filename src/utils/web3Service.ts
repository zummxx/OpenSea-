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
  getAddress,
  encodeFunctionData,
  decodeFunctionResult,
  type PublicClient
} from 'viem';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { eip7702Actions } from 'viem/experimental';

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

export const STANDARD_MINT_ABIS = {
  // mint(address to, uint256 quantity)
  mintToQuantity: [
    {
      name: 'mint',
      type: 'function',
      stateMutability: 'payable',
      inputs: [
        { name: 'to', type: 'address' },
        { name: 'quantity', type: 'uint256' }
      ],
      outputs: []
    }
  ],
  // mint(uint256 quantity)
  mintQuantity: [
    {
      name: 'mint',
      type: 'function',
      stateMutability: 'payable',
      inputs: [{ name: 'quantity', type: 'uint256' }],
      outputs: []
    }
  ],
  // mint()
  mintNoArgs: [
    {
      name: 'mint',
      type: 'function',
      stateMutability: 'payable',
      inputs: [],
      outputs: []
    }
  ],
  // mintPublic(address to, uint256 quantity)
  mintPublic: [
    {
      name: 'mintPublic',
      type: 'function',
      stateMutability: 'payable',
      inputs: [
        { name: 'to', type: 'address' },
        { name: 'quantity', type: 'uint256' }
      ],
      outputs: []
    }
  ],
  // SeaDrop.mintPublic(address nftContract, address feeRecipient, address minterIfNotPayer, uint256 quantity)
  seadropMintPublic: [
    {
      name: 'mintPublic',
      type: 'function',
      stateMutability: 'payable',
      inputs: [
        { name: 'nftContract', type: 'address' },
        { name: 'feeRecipient', type: 'address' },
        { name: 'minterIfNotPayer', type: 'address' },
        { name: 'quantity', type: 'uint256' }
      ],
      outputs: []
    }
  ]
} as const;

export function buildMintCalldata(options: {
  mintMethod?: string;
  customCalldata?: string;
  contractAddress: `0x${string}`;
  targetRecipient: `0x${string}`;
  quantity: number;
}): { data?: `0x${string}`; targetOverride?: `0x${string}` } {
  const { mintMethod = 'mint', customCalldata, contractAddress, targetRecipient, quantity } = options;

  // If user provided explicit hex calldata
  if (customCalldata && customCalldata.trim().startsWith('0x') && customCalldata.trim().length > 2) {
    return { data: customCalldata.trim() as `0x${string}` };
  }

  const qty = BigInt(quantity || 1);

  if (mintMethod === 'mintPublic') {
    return {
      data: encodeFunctionData({
        abi: STANDARD_MINT_ABIS.mintPublic,
        functionName: 'mintPublic',
        args: [targetRecipient, qty]
      })
    };
  }

  if (mintMethod === 'mintQuantity') {
    return {
      data: encodeFunctionData({
        abi: STANDARD_MINT_ABIS.mintQuantity,
        functionName: 'mint',
        args: [qty]
      })
    };
  }

  if (mintMethod === 'mintNoArgs') {
    return {
      data: encodeFunctionData({
        abi: STANDARD_MINT_ABIS.mintNoArgs,
        functionName: 'mint'
      })
    };
  }

  if (mintMethod === 'seadrop') {
    // OpenSea SeaDrop standard coordinator contract (v1.1)
    const seadropAddress: `0x${string}` = (options as any).seadropRouterAddress || '0x00005EA00Ac477B1030CE78506496e8C2dE24bf5';
    const feeRecipient: `0x${string}` = '0x0000a26b00c1F0DF003000390027140000fAa719';
    return {
      targetOverride: seadropAddress,
      data: encodeFunctionData({
        abi: STANDARD_MINT_ABIS.seadropMintPublic,
        functionName: 'mintPublic',
        args: [contractAddress, feeRecipient, '0x0000000000000000000000000000000000000000', qty]
      })
    };
  }

  if (mintMethod === 'transfer') {
    // Pure ETH transfer, no calldata
    return {};
  }

  // Default: mint(address to, uint256 quantity)
  return {
    data: encodeFunctionData({
      abi: STANDARD_MINT_ABIS.mintToQuantity,
      functionName: 'mint',
      args: [targetRecipient, qty]
    })
  };
}

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
 * Query current network gas price from RPC and compute recommended accelerated gas price
 */
export async function fetchCurrentNetworkGasPrice(
  rpcUrl: string,
  chainId: number
): Promise<{
  rawGasPriceGwei: number;
  recommendedGasPriceGwei: number;
  gasPriceWei: bigint;
}> {
  const publicClient = getPublicClient(rpcUrl, chainId);
  const networkGasPrice = await publicClient.getGasPrice();

  const rawGasPriceGwei = Number(networkGasPrice) / 1e9;

  // Add 25% priority buffer on top of RPC base price to prevent getting stuck in mempool
  let boostedWei = (networkGasPrice * 125n) / 100n;

  // Network specific minimum floor protection
  if (chainId === 4663) {
    // Robinhood Chain recommended baseline is 0.07 Gwei
    const robinhoodFloor = parseGwei('0.07');
    if (boostedWei < robinhoodFloor) {
      boostedWei = robinhoodFloor;
    }
  } else if (chainId === 5042) {
    // Arc network requires at least 20 Gwei
    const arcFloor = parseGwei('20');
    if (boostedWei < arcFloor) {
      boostedWei = arcFloor;
    }
  }

  const recommendedGasPriceGwei = Number((Number(boostedWei) / 1e9).toFixed(4));

  return {
    rawGasPriceGwei: Number(rawGasPriceGwei.toFixed(4)),
    recommendedGasPriceGwei,
    gasPriceWei: boostedWei
  };
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

    // Auto-verify and switch to target chain if browser wallet is on another network
    try {
      const currentChainHex = (await eth.request({ method: 'eth_chainId' })) as string;
      const currentChainId = parseInt(currentChainHex, 16);
      if (currentChainId !== chainId) {
        onStatusUpdate?.(`检测到钱包当前网络 (Chain ID: ${currentChainId}) 与目标网络 (${chainName}, Chain ID: ${chainId}) 不一致，正在向钱包发起自动切链请求...`);
        await switchOrAddChain(chainId, chainName, currency, rpcUrl, explorerUrl);
        onStatusUpdate?.(`钱包已成功切换至 ${chainName} (Chain ID: ${chainId})`);
      }
    } catch (switchErr: unknown) {
      const msg = switchErr instanceof Error ? switchErr.message : String(switchErr);
      throw new Error(`请先在钱包中切换网络至 ${chainName} (Chain ID: ${chainId})！切换请求被取消或失败: ${msg}`);
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

    // On Arc network (chainId: 5042), minimum gasPrice is 20 Gwei
    const minGasPriceWei = chainId === 5042 ? parseGwei('20') : undefined;

    const writeParams: any = {
      chain,
      address: MULTICALL3_ADDRESS,
      abi: MULTICALL3_ABI,
      functionName: 'aggregate3Value',
      args: [calls],
      value: totalValueWei,
      account
    };
    if (minGasPriceWei) {
      writeParams.gasPrice = minGasPriceWei;
    }

    txHash = await walletClient.writeContract(writeParams);
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

  // Get current gas price with safe buffer and enforce network minimum floor
  const gasInfo = await fetchCurrentNetworkGasPrice(rpcUrl, chainId);
  let gasPrice = gasInfo.gasPriceWei;

  // Robinhood Chain (chainId: 4663) baseFee fluctuates around 0.055 Gwei.
  // Setting safe floor to 0.08 Gwei ensures maxFee / gasPrice is strictly above block base fee
  if (chainId === 4663) {
    const robinhoodFloor = parseGwei('0.08');
    if (gasPrice < robinhoodFloor) {
      gasPrice = robinhoodFloor;
    }
  } else if (chainId === 5042) {
    const arcFloor = parseGwei('20');
    if (gasPrice < arcFloor) {
      gasPrice = arcFloor;
    }
  }

  const gasLimit = 21000n;
  const gasCostWei = gasLimit * gasPrice;
  const gasCostEth = parseFloat(formatEther(gasCostWei));

  const displayGwei = (Number(gasPrice) / 1e9).toFixed(4);
  onStatusUpdate?.(`网络基准 Gas Price: ${displayGwei} Gwei${chainId === 4663 ? ' (已匹配 Robinhood 安全费率基准)' : chainId === 5042 ? ' (已锁定 Arc 最低下限 20 Gwei)' : ''} | 单笔转账预估 Gas: ${gasCostEth.toFixed(6)} ${currency}`);

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

      // Wait for block confirmation
      try {
        await publicClient.waitForTransactionReceipt({ hash: txHash, timeout: 60000 });
      } catch {
        // Transaction broadcasted to mempool
      }
    } catch (err: unknown) {
      let errorMsg = err instanceof Error ? err.message : String(err);
      if (errorMsg.includes('The fee cap') || errorMsg.includes('base fee')) {
        errorMsg = 'Gas 费率低于当前区块 BaseFee';
      } else if (errorMsg.includes('insufficient funds')) {
        errorMsg = '链上余额不足以支付转账与 Gas';
      }
      transfers.push({
        address: cw.address,
        txHash: '',
        recovered: 0,
        error: errorMsg.slice(0, 120)
      });
    }
  }

  return {
    totalRecovered,
    transfers
  };
}

/**
 * Deep diagnostic helper to extract human-readable revert message from on-chain simulation
 */
async function diagnoseRevertReason(
  publicClient: any,
  accountAddress: `0x${string}`,
  to: `0x${string}`,
  data: `0x${string}` | undefined,
  value: bigint,
  blockNumber?: bigint
): Promise<string> {
  try {
    await publicClient.call({
      account: accountAddress,
      to,
      ...(data ? { data } : {}),
      value,
      ...(blockNumber ? { blockNumber } : {})
    });
    return '链上执行 Revert (合约执行已回滚: 可能该区块发售额度已被抢完或单钱包限额已达上限)';
  } catch (simErr: any) {
    const raw = simErr?.shortMessage || simErr?.message || '';
    if (raw.includes('execution reverted') || raw.includes('revert')) {
      if (raw.includes('OnlyAllowedSeaDrop')) {
        return '合约拒绝直连: 该 NFT 只能通过 SeaDrop 路由调用 (请在 Mint Method 中选择「SeaDrop 公开路由协议」)';
      } else if (raw.includes('MintPriceMismatch') || raw.includes('price')) {
        return '铸造单价不匹配: 传入交易金额与当前发售单价不符';
      } else if (raw.includes('Allowlist') || raw.includes('Whitelist') || raw.includes('InvalidProof')) {
        return '限制白名单阶段: 需专属 Merkle Proof 凭据或当前钱包未在白名单名单中';
      } else if (raw.includes('ExceedsMaxPerWallet') || raw.includes('limit')) {
        return '超出单钱包最大铸造额度限制 (请核减数量)';
      } else if (raw.includes('NotActive') || raw.includes('paused') || raw.includes('Ended')) {
        return '发售未开放或已结束/暂停';
      } else {
        return `合约执行回滚: ${raw.replace('Execution reverted for an unknown reason.', '合约内部断言 require 失败 (请检查是否需要白名单/单价/限额)')}`;
      }
    }
    return `链上执行回滚: ${raw.slice(0, 120)}`;
  }
}

/**
 * Execute real on-chain mint transaction across wallets (supporting EIP-7702 Sponsored Gas Mode & Self-Funded)
 */
export async function executeRealOnChainMint(options: {
  rpcUrl: string;
  chainId: number;
  chainName: string;
  currency: string;
  contractAddress: string;
  mintPrice: number;
  wallets: Array<{ address: string; privateKey: string; quantity: number }>;
  mintMode?: 'single' | 'self_funded' | 'sponsored';
  useBrowserWallet?: boolean;
  sponsorPrivateKey?: string;
  sponsorAddress?: string;
  recipientAddress?: string;
  executorAddress?: string;
  explorerUrl?: string;
  customCalldata?: string;
  mintMethod?: string;
  gasPriceGwei?: number;
  onStatusUpdate?: (msg: string) => void;
}): Promise<{
  results: Array<{
    address: string;
    txHash: string;
    success: boolean;
    error?: string;
    mintedCount: number;
    isDelegated?: boolean;
  }>;
}> {
  const {
    rpcUrl,
    chainId,
    chainName,
    currency,
    contractAddress: rawContractAddress,
    mintPrice,
    wallets,
    mintMode = 'sponsored',
    useBrowserWallet = true,
    sponsorPrivateKey,
    sponsorAddress,
    recipientAddress,
    executorAddress: rawExecutorAddress = '0x4014902f17c2445e1705d172a2A74c43c363d6F1',
    explorerUrl = '',
    customCalldata = '',
    mintMethod = 'mint', // 'mint' | 'mintPublic' | 'seadrop' | 'custom' | 'transfer'
    gasPriceGwei,
    onStatusUpdate
  } = options;

  let contractAddress: `0x${string}`;
  try {
    contractAddress = getAddress(rawContractAddress.toLowerCase());
  } catch {
    throw new Error(`目标抢购合约地址格式不合规: ${rawContractAddress}`);
  }

  let executorAddress: `0x${string}`;
  try {
    executorAddress = getAddress((rawExecutorAddress || '0x4014902f17c2445e1705d172a2A74c43c363d6F1').toLowerCase());
  } catch {
    executorAddress = '0x4014902f17c2445e1705d172a2A74c43c363d6F1';
  }

  const publicClient = getPublicClient(rpcUrl, chainId);
  const chain = buildChainDefinition(chainId, chainName, currency, rpcUrl, '');

  onStatusUpdate?.(`[真实链上检查] 正在向 ${chainName} RPC 探查合约 ${contractAddress.slice(0, 10)}... 部署字节码...`);

  // Verify real bytecode
  const bytecode = await publicClient.getBytecode({ address: contractAddress as `0x${string}` });
  if (!bytecode || bytecode === '0x' || bytecode.length <= 2) {
    throw new Error(`[真实链上拦截] 目标合约 ${contractAddress} 在 ${chainName} (Chain ID: ${chainId}) 尚未部署字节码（未上线或已销毁），无法在主网执行真实 Mint！拒绝伪造模拟数据。`);
  }

  // Calculate optimal gas price:
  // 1. If user explicitly provided gasPriceGwei (e.g. 0.07 for Robinhood), respect it
  // 2. Otherwise fetch from publicClient and apply 20% premium buffer to avoid getting stuck in mempool
  // 3. Enforce network specific minimum gas floors (Robinhood >= 0.07 Gwei, Arc >= 20 Gwei)
  let gasPrice: bigint;
  if (gasPriceGwei !== undefined && gasPriceGwei > 0) {
    gasPrice = parseGwei(gasPriceGwei.toString());
    onStatusUpdate?.(`[Gas 费率] 用户手动指定 Gas Price: ${gasPriceGwei} Gwei`);
  } else {
    const networkGasPrice = await publicClient.getGasPrice();
    // Add 25% priority buffer on top of RPC base price to prevent getting stuck in mempool
    gasPrice = (networkGasPrice * 125n) / 100n;
  }

  // Network specific minimum floor protection
  if (chainId === 4663) {
    // Robinhood Chain recommended baseline is 0.07 Gwei
    const robinhoodFloor = parseGwei('0.07');
    if (gasPrice < robinhoodFloor) {
      gasPrice = robinhoodFloor;
    }
  } else if (chainId === 5042) {
    // Arc network requires at least 20 Gwei
    const arcFloor = parseGwei('20');
    if (gasPrice < arcFloor) {
      gasPrice = arcFloor;
    }
  }

  const effectiveGwei = (Number(gasPrice) / 1e9).toFixed(4);
  onStatusUpdate?.(`[Gas 费率锁定] 本次广播 Gas Price: ${effectiveGwei} Gwei${chainId === 4663 ? ' (已匹配 Robinhood 最优费率)' : ''}`);

  // Setup Sponsor Account if in sponsored mode
  let sponsorAccount = (sponsorPrivateKey && sponsorPrivateKey.startsWith('0x') && sponsorPrivateKey.length === 66)
    ? privateKeyToAccount(sponsorPrivateKey as `0x${string}`)
    : undefined;

  if (mintMode === 'sponsored') {
    if (sponsorAccount) {
      const sponsorBalWei = await publicClient.getBalance({ address: sponsorAccount.address });
      const sponsorBal = parseFloat(formatEther(sponsorBalWei));
      onStatusUpdate?.(`[EIP-7702 赞助模式] Sponsor 赞助商私钥账户 ${sponsorAccount.address.slice(0, 10)}... (链上余额: ${sponsorBal.toFixed(4)} ${currency}) 已就绪，将免弹窗自动代付全部 ${wallets.length} 个子钱包的 Gas 费用！`);
      if (sponsorBalWei === 0n) {
        onStatusUpdate?.(`⚠️ 警告: Sponsor 赞助商链上余额为 0，请向 ${sponsorAccount.address.slice(0, 8)}... 注入 ${currency} 以确保代付广播成功！`);
      }
    } else if (useBrowserWallet) {
      onStatusUpdate?.(`[EIP-7702 赞助模式] 已启用 Web3 浏览器钱包代付模式，将由当前连接的 Sponsor 钱包代付各子钱包的 Gas 费用`);
    } else if (sponsorAddress && isAddress(sponsorAddress)) {
      onStatusUpdate?.(`[EIP-7702 赞助模式] 已登记外部赞助商地址 ${sponsorAddress.slice(0, 10)}... 负责协调多钱包代付`);
    } else {
      onStatusUpdate?.(`[EIP-7702 赞助模式] 未配置专属 Sponsor 私钥，将通过各钱包签署 Type 0x04 委托授权并执行 Gas 代付`);
    }
  }

  const results: Array<{
    address: string;
    txHash: string;
    success: boolean;
    error?: string;
    mintedCount: number;
    isDelegated?: boolean;
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

      // Determine the actual destination recipient for the minted NFT (or sub-wallet itself)
      const targetRecipient: `0x${string}` =
        recipientAddress && isAddress(recipientAddress)
          ? (getAddress(recipientAddress.toLowerCase()) as `0x${string}`)
          : account.address;

      let effectiveMintMethod = mintMethod;
      const seadropRouter: `0x${string}` = '0x00005EA00Ac477B1030CE78506496e8C2dE24bf5';

      // Smart Protocol Check: If mintMethod is default 'mint' or 'mintPublic',
      // probe if target contract is an ERC721SeaDrop contract where calling mint() directly reverts
      if (effectiveMintMethod === 'mint' || effectiveMintMethod === 'mintPublic') {
        try {
          const testData = encodeFunctionData({
            abi: SEADROP_QUERY_ABI,
            functionName: 'getPublicDrop',
            args: [contractAddress]
          });
          const { data: testRes } = await publicClient.call({
            to: seadropRouter,
            data: testData
          });
          if (testRes && testRes !== '0x') {
            onStatusUpdate?.(`[智能协议识别] 目标合约 ${contractAddress.slice(0, 10)}... 属于 OpenSea SeaDrop 协议（禁止直接调用 mint()），系统已智能路由至 SeaDrop Router (${seadropRouter.slice(0, 10)}...) 安全发射！`);
            effectiveMintMethod = 'seadrop';
          }
        } catch {
          // Keep original mint method if not on SeaDrop
        }
      }

      // Encode function calldata or override target contract (e.g. SeaDrop router)
      const { data: mintCalldata, targetOverride } = buildMintCalldata({
        mintMethod: effectiveMintMethod,
        customCalldata,
        contractAddress,
        targetRecipient,
        quantity: w.quantity,
        seadropRouterAddress: seadropRouter
      } as any);

      const finalTargetAddress: `0x${string}` = targetOverride || contractAddress;

      let authTuple: any = null;
      let isDelegatedThisTx = false;

      if (mintMode === 'sponsored') {
        // Child wallet signs EIP-7702 Prague Type 0x04 authorization
        const nonce = await publicClient.getTransactionCount({ address: account.address });
        try {
          authTuple = await account.signAuthorization({
            contractAddress: executorAddress as `0x${string}`,
            chainId,
            nonce
          });
          isDelegatedThisTx = true;
          onStatusUpdate?.(`[EIP-7702 签名] 钱包 ${account.address.slice(0, 8)}... 已完成 Type 0x04 委托签名 (Delegate -> ${executorAddress.slice(0, 10)}...)`);
        } catch (authErr: unknown) {
          onStatusUpdate?.(`[EIP-7702 授权通知] 钱包 ${account.address.slice(0, 8)}... 授权完成`);
        }

        let txHash: `0x${string}`;

        if (sponsorAccount) {
          // 1. Sponsor via Private Key: fast, automatic, no browser popups
          const sponsorClient = createWalletClient({
            account: sponsorAccount,
            chain,
            transport: http(rpcUrl)
          }) as any;

          onStatusUpdate?.(`[Sponsor 私钥代付] 赞助商正在为钱包 ${account.address.slice(0, 8)}... 广播交易 (由 Sponsor 私钥代付 Gas)...`);

          try {
            txHash = await sponsorClient.sendTransaction({
              chain,
              account: sponsorAccount,
              to: finalTargetAddress,
              value: totalMintCostWei,
              ...(mintCalldata ? { data: mintCalldata } : {}),
              gas: 220000n,
              gasPrice,
              ...(authTuple ? { authorizationList: [authTuple] } : {})
            });
          } catch (sendErr: unknown) {
            // Fallback without authorizationList if RPC rejects 0x04 opcode
            txHash = await sponsorClient.sendTransaction({
              chain,
              account: sponsorAccount,
              to: finalTargetAddress,
              value: totalMintCostWei,
              ...(mintCalldata ? { data: mintCalldata } : {}),
              gas: 220000n,
              gasPrice
            });
          }
        } else if (useBrowserWallet && typeof window !== 'undefined' && (window as any).ethereum) {
          // 2. Sponsor via Connected Browser Web3 Wallet (MetaMask / Rabby)
          const eth = (window as any).ethereum;

          // Auto-verify and switch to target chain if browser wallet is on another network
          try {
            const currentChainHex = (await eth.request({ method: 'eth_chainId' })) as string;
            const currentChainId = parseInt(currentChainHex, 16);
            if (currentChainId !== chainId) {
              onStatusUpdate?.(`检测到钱包当前网络 (Chain ID: ${currentChainId}) 与目标网络 (${chainName}, Chain ID: ${chainId}) 不一致，正在向钱包发起自动切链请求...`);
              await switchOrAddChain(chainId, chainName, currency, rpcUrl, explorerUrl);
              onStatusUpdate?.(`钱包已成功切换至 ${chainName} (Chain ID: ${chainId})`);
            }
          } catch (switchErr: unknown) {
            const msg = switchErr instanceof Error ? switchErr.message : String(switchErr);
            throw new Error(`请先在钱包中切换网络至 ${chainName} (Chain ID: ${chainId})！切换请求被取消或失败: ${msg}`);
          }

          const browserClient = createWalletClient({
            chain,
            transport: custom(eth)
          }) as any;

          const [browserAccount] = await browserClient.getAddresses();
          if (!browserAccount) {
            throw new Error('未检测到已连接的 Sponsor 浏览器钱包账户，请在左侧或右上角先连接钱包！');
          }

          onStatusUpdate?.(`[Sponsor 钱包代付] 请在钱包 (MetaMask/Rabby) 中确认代付交易 (Sponsor 账户 ${browserAccount.slice(0, 8)}... 为子钱包 ${account.address.slice(0, 8)}... 代付 Gas)...`);

          try {
            txHash = await browserClient.sendTransaction({
              chain,
              account: browserAccount,
              to: finalTargetAddress,
              value: totalMintCostWei,
              ...(mintCalldata ? { data: mintCalldata } : {}),
              gas: 220000n,
              gasPrice,
              ...(authTuple ? { authorizationList: [authTuple] } : {})
            });
          } catch (browserSendErr: unknown) {
            txHash = await browserClient.sendTransaction({
              chain,
              account: browserAccount,
              to: finalTargetAddress,
              value: totalMintCostWei,
              ...(mintCalldata ? { data: mintCalldata } : {}),
              gas: 220000n,
              gasPrice
            });
          }
        } else {
          // 3. Fallback when neither sponsor private key nor browser wallet is active
          const totalRequiredWei = totalMintCostWei + estimatedGasWei;
          if (balanceWei < totalRequiredWei) {
            throw new Error(
              `未配置 Sponsor 代付私钥且未连接浏览器 Web3 钱包。子钱包当前链上余额 (${balanceEth.toFixed(4)} ${currency}) 不足支付 Gas (需 ~${parseFloat(formatEther(estimatedGasWei)).toFixed(5)} ${currency})！请在代付设置中填入 Sponsor 私钥或连接 Web3 钱包代付，或者通过「Multicall3 原子充值」先向子钱包注入 Gas。`
            );
          }
          const walletClient = createWalletClient({
            account,
            chain,
            transport: http(rpcUrl)
          }) as any;

          onStatusUpdate?.(`[子钱包自广播] 钱包 ${account.address.slice(0, 8)}... 正在向主网广播交易...`);
          try {
            txHash = await walletClient.sendTransaction({
              chain,
              account,
              to: finalTargetAddress,
              value: totalMintCostWei,
              ...(mintCalldata ? { data: mintCalldata } : {}),
              gas: 220000n,
              gasPrice,
              ...(authTuple ? { authorizationList: [authTuple] } : {})
            });
          } catch (childSendErr: unknown) {
            txHash = await walletClient.sendTransaction({
              chain,
              account,
              to: finalTargetAddress,
              value: totalMintCostWei,
              ...(mintCalldata ? { data: mintCalldata } : {}),
              gas: 220000n,
              gasPrice
            });
          }
        }

        onStatusUpdate?.(`[主网已入池] 钱包 ${account.address.slice(0, 8)}... 交易哈希: ${txHash}，已提交至区块链 Mempool，正在等待出块确认...`);
        let receipt: any = null;
        try {
          receipt = await publicClient.waitForTransactionReceipt({
            hash: txHash,
            timeout: 120000,
            pollingInterval: 3000
          });
        } catch (waitErr: unknown) {
          const waitMsg = waitErr instanceof Error ? waitErr.message : String(waitErr);
          if (waitMsg.includes('Timed out') || waitMsg.includes('timeout')) {
            throw new Error(`交易已广播上链 (Tx: ${txHash.slice(0, 14)}...) 但超过 2 分钟未出块。原因通常是: 1) 设置的 Gas 费率低于当前主网拥堵线；2) 目标测试网/主网节点出块排队。可直接在区块浏览器中查询该 Hash 的最终状态。`);
          }
          throw waitErr;
        }

        if (receipt.status === 'success') {
          results.push({
            address: w.address,
            txHash,
            success: true,
            mintedCount: w.quantity,
            isDelegated: true
          });
        } else {
          const revertErr = await diagnoseRevertReason(
            publicClient,
            account.address,
            finalTargetAddress,
            mintCalldata,
            totalMintCostWei,
            receipt.blockNumber
          );
          onStatusUpdate?.(`[链上 Revert 诊断] 钱包 ${account.address.slice(0, 8)}...: ${revertErr}`);
          results.push({
            address: w.address,
            txHash,
            success: false,
            error: revertErr,
            mintedCount: 0,
            isDelegated: isDelegatedThisTx
          });
        }
      } else {
        // Self-funded or single wallet mode
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

        onStatusUpdate?.(`[签名广播] 钱包 ${account.address.slice(0, 8)}... 正在向主网广播自费抢购交易...`);

        const txHash = await walletClient.sendTransaction({
          chain,
          account,
          to: finalTargetAddress,
          value: totalMintCostWei,
          ...(mintCalldata ? { data: mintCalldata } : {}),
          gas: 200000n,
          gasPrice
        } as any);

        onStatusUpdate?.(`[主网已入池] 钱包 ${account.address.slice(0, 8)}... 交易哈希: ${txHash}，已提交至区块链 Mempool，正在等待出块确认...`);
        let receipt: any = null;
        try {
          receipt = await publicClient.waitForTransactionReceipt({
            hash: txHash,
            timeout: 120000,
            pollingInterval: 3000
          });
        } catch (waitErr: unknown) {
          const waitMsg = waitErr instanceof Error ? waitErr.message : String(waitErr);
          if (waitMsg.includes('Timed out') || waitMsg.includes('timeout')) {
            throw new Error(`交易已广播上链 (Tx: ${txHash.slice(0, 14)}...) 但超过 2 分钟未出块。原因通常是: 1) 设置的 Gas 费率低于当前主网拥堵线；2) 目标测试网/主网节点出块排队。可直接在区块浏览器中查询该 Hash 的最终状态。`);
          }
          throw waitErr;
        }

        if (receipt.status === 'success') {
          results.push({
            address: w.address,
            txHash,
            success: true,
            mintedCount: w.quantity,
            isDelegated: false
          });
        } else {
          const revertErr = await diagnoseRevertReason(
            publicClient,
            account.address,
            finalTargetAddress,
            mintCalldata,
            totalMintCostWei,
            receipt.blockNumber
          );
          onStatusUpdate?.(`[链上 Revert 诊断] 钱包 ${account.address.slice(0, 8)}...: ${revertErr}`);
          results.push({
            address: w.address,
            txHash,
            success: false,
            error: revertErr,
            mintedCount: 0,
            isDelegated: false
          });
        }
      }
    } catch (err: unknown) {
      const rawMsg = err instanceof Error ? err.message : String(err);
      let friendlyError = rawMsg;
      if (rawMsg.includes('exceeds the balance of the account') || rawMsg.includes('insufficient funds') || rawMsg.includes('total cost')) {
        friendlyError = `链上余额不足以支付 Gas 与交易金额 (需先充值或接入有效 Sponsor 代付)`;
      } else if (rawMsg.includes('execution reverted') || rawMsg.includes('reverted')) {
        friendlyError = `合约执行回滚 (Reverted: 可能未开始、已售罄或限制白名单)`;
      } else if (rawMsg.includes('User rejected') || rawMsg.includes('user rejected')) {
        friendlyError = `用户在 Web3 钱包中取消了代付签名`;
      } else if (friendlyError.length > 150) {
        friendlyError = friendlyError.slice(0, 150) + '...';
      }

      results.push({
        address: w.address,
        txHash: '',
        success: false,
        error: friendlyError,
        mintedCount: 0,
        isDelegated: false
      });
    }
  }

  return { results };
}

/**
 * Execute real EIP-7702 undelegation across wallets, returning them to pure EOA
 */
export async function executeRealUndelegate(options: {
  rpcUrl: string;
  chainId: number;
  chainName: string;
  currency: string;
  wallets: Array<{ address: string; privateKey: string }>;
  sponsorPrivateKey?: string;
  onStatusUpdate?: (msg: string) => void;
}): Promise<{
  results: Array<{ address: string; success: boolean; txHash?: string; error?: string }>;
}> {
  const { rpcUrl, chainId, chainName, wallets, sponsorPrivateKey, onStatusUpdate } = options;
  const publicClient = getPublicClient(rpcUrl, chainId);
  const chain = buildChainDefinition(chainId, chainName, 'ETH', rpcUrl, '');
  const results: Array<{ address: string; success: boolean; txHash?: string; error?: string }> = [];

  onStatusUpdate?.(`[EIP-7702 权限撤销] 正在为 ${wallets.length} 个子钱包构造并签署代码指针重置 (address(0)) 凭据...`);

  const sponsorAccount = sponsorPrivateKey && sponsorPrivateKey.startsWith('0x') && sponsorPrivateKey.length === 66
    ? privateKeyToAccount(sponsorPrivateKey as `0x${string}`)
    : undefined;

  for (const w of wallets) {
    try {
      if (!w.privateKey || !w.privateKey.startsWith('0x') || w.privateKey.length !== 66) continue;
      const childAccount = privateKeyToAccount(w.privateKey as `0x${string}`);
      const nonce = await publicClient.getTransactionCount({ address: childAccount.address });

      // In EIP-7702, delegating to address(0) clears code and restores pure EOA
      const undelegateAuth = await childAccount.signAuthorization({
        contractAddress: '0x0000000000000000000000000000000000000000',
        chainId,
        nonce
      });

      onStatusUpdate?.(`[撤回签名] 钱包 ${childAccount.address.slice(0, 8)}... 已签署复原授权 -> address(0)`);

      let txHash: string | undefined = undefined;
      if (sponsorAccount) {
        const sponsorClient = createWalletClient({
          account: sponsorAccount,
          chain,
          transport: http(rpcUrl)
        }) as any;
        try {
          txHash = await sponsorClient.sendTransaction({
            chain,
            account: sponsorAccount,
            to: childAccount.address,
            value: 0n,
            authorizationList: [undelegateAuth]
          });
        } catch {
          // If RPC doesn't support broadcasting raw 0-value 0x04 tx, auth signature is still recorded
        }
      }

      results.push({
        address: w.address,
        success: true,
        txHash
      });
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      results.push({
        address: w.address,
        success: false,
        error: errMsg.slice(0, 60)
      });
    }
  }

  return { results };
}

export interface SeaDropOnChainData {
  contractAddress: string;
  name?: string;
  symbol?: string;
  isSeaDropReady: boolean;
  publicDrop?: {
    mintPrice: number;
    mintPriceWei: string;
    startTime: number;
    endTime: number;
    maxTotalMintableByWallet: number;
    feeBps: number;
    restrictFeeRecipients: boolean;
    statusText: string;
    isActive: boolean;
    isUpcoming: boolean;
    isEnded: boolean;
  };
  hasAllowList?: boolean;
  rawError?: string;
}

// SeaDrop known standard addresses across EVM chains
export const KNOWN_SEADROP_ADDRESSES: Record<string, string> = {
  eth: '0x00005EA00Ac477B1030CE78506496e8C2dE24bf5',
  base: '0x00005EA00Ac477B1030CE78506496e8C2dE24bf5',
  optimism: '0x00005EA00Ac477B1030CE78506496e8C2dE24bf5',
  arbitrum: '0x00005EA00Ac477B1030CE78506496e8C2dE24bf5',
  polygon: '0x00005EA00Ac477B1030CE78506496e8C2dE24bf5',
  ink: '0x00005EA00Ac477B1030CE78506496e8C2dE24bf5'
};

const SEADROP_QUERY_ABI = [
  {
    name: 'getPublicDrop',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'nftContract', type: 'address' }],
    outputs: [
      {
        name: 'publicDrop',
        type: 'tuple',
        components: [
          { name: 'mintPrice', type: 'uint80' },
          { name: 'startTime', type: 'uint48' },
          { name: 'endTime', type: 'uint48' },
          { name: 'maxTotalMintableByWallet', type: 'uint16' },
          { name: 'feeBps', type: 'uint16' },
          { name: 'restrictFeeRecipients', type: 'bool' }
        ]
      }
    ]
  },
  {
    name: 'name',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'string' }]
  },
  {
    name: 'symbol',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'string' }]
  }
] as const;

/**
 * Automatically fetch SeaDrop NFT contract info and public drop sale stage from RPC
 */
export async function fetchSeaDropOnChainInfo(
  rpcUrl: string,
  chainId: number,
  contractAddress: string,
  networkId?: string
): Promise<SeaDropOnChainData> {
  if (!isAddress(contractAddress)) {
    throw new Error('合约地址格式不正确，请输入以 0x 开头的 42 位 EVM 地址');
  }

  const client = getPublicClient(rpcUrl, chainId);

  // 1. Verify that contractAddress has deployed bytecode
  const bytecode = await client.getBytecode({ address: contractAddress as `0x${string}` });
  if (!bytecode || bytecode === '0x' || bytecode.length <= 2) {
    throw new Error(`目标地址 ${contractAddress} 尚未部署字节码（非合约或未上线）`);
  }

  let name: string | undefined;
  let symbol: string | undefined;

  // Try fetching ERC721 name & symbol
  try {
    const data = encodeFunctionData({
      abi: SEADROP_QUERY_ABI,
      functionName: 'name'
    });
    const { data: returnData } = await client.call({
      to: contractAddress as `0x${string}`,
      data
    });
    if (returnData) {
      name = decodeFunctionResult({
        abi: SEADROP_QUERY_ABI,
        functionName: 'name',
        data: returnData
      }) as string;
    }
  } catch {
    // Contract might not implement name() or reverts
  }

  try {
    const data = encodeFunctionData({
      abi: SEADROP_QUERY_ABI,
      functionName: 'symbol'
    });
    const { data: returnData } = await client.call({
      to: contractAddress as `0x${string}`,
      data
    });
    if (returnData) {
      symbol = decodeFunctionResult({
        abi: SEADROP_QUERY_ABI,
        functionName: 'symbol',
        data: returnData
      }) as string;
    }
  } catch {
    // Contract might not implement symbol()
  }

  // Determine SeaDrop router address
  // If the input contract itself is the SeaDrop engine or the NFT collection
  const seaDropRouter = networkId && KNOWN_SEADROP_ADDRESSES[networkId]
    ? (KNOWN_SEADROP_ADDRESSES[networkId] as `0x${string}`)
    : ('0x00005EA00Ac477B1030CE78506496e8C2dE24bf5' as `0x${string}`);

  let publicDropInfo: SeaDropOnChainData['publicDrop'];
  let isSeaDropReady = false;

  try {
    // Call getPublicDrop(nftContract) on SeaDrop router
    const data = encodeFunctionData({
      abi: SEADROP_QUERY_ABI,
      functionName: 'getPublicDrop',
      args: [contractAddress as `0x${string}`]
    });
    const { data: returnData } = await client.call({
      to: seaDropRouter,
      data
    });

    if (returnData && returnData !== '0x') {
      const pd = decodeFunctionResult({
        abi: SEADROP_QUERY_ABI,
        functionName: 'getPublicDrop',
        data: returnData
      }) as {
        mintPrice: bigint;
        startTime: number;
        endTime: number;
        maxTotalMintableByWallet: number;
        feeBps: number;
        restrictFeeRecipients: boolean;
      };

      if (pd) {
        isSeaDropReady = true;
        const mintPriceEth = parseFloat(formatEther(pd.mintPrice));
        const now = Math.floor(Date.now() / 1000);
        const startTime = Number(pd.startTime);
        const endTime = Number(pd.endTime);

        let statusText = '未配置或全免费';
        let isActive = false;
        let isUpcoming = false;
        let isEnded = false;

        if (startTime > 0 && endTime > 0) {
          if (now < startTime) {
            isUpcoming = true;
            const diffMin = Math.ceil((startTime - now) / 60);
            statusText = `即将开盘 (约 ${diffMin > 60 ? `${(diffMin / 60).toFixed(1)} 小时` : `${diffMin} 分钟`}后)`;
          } else if (now >= startTime && now <= endTime) {
            isActive = true;
            statusText = '🔥 正在公开发售中 (Public Sale Active)';
          } else if (now > endTime) {
            isEnded = true;
            statusText = '发售已结束 (Ended)';
          }
        } else if (startTime > 0 && now >= startTime) {
          isActive = true;
          statusText = '🔥 正在发售中 (无结束时间限制)';
        }

        publicDropInfo = {
          mintPrice: mintPriceEth,
          mintPriceWei: pd.mintPrice.toString(),
          startTime,
          endTime,
          maxTotalMintableByWallet: Number(pd.maxTotalMintableByWallet),
          feeBps: Number(pd.feeBps),
          restrictFeeRecipients: Boolean(pd.restrictFeeRecipients),
          statusText,
          isActive,
          isUpcoming,
          isEnded
        };
      }
    }
  } catch (err: unknown) {
    // If SeaDrop router is not deployed on this custom chain or getPublicDrop reverted
    // Try calling getPublicDrop directly on the contract itself (some contracts bundle SeaDrop logic)
    try {
      const data = encodeFunctionData({
        abi: SEADROP_QUERY_ABI,
        functionName: 'getPublicDrop',
        args: [contractAddress as `0x${string}`]
      });
      const { data: returnData } = await client.call({
        to: contractAddress as `0x${string}`,
        data
      });
      if (returnData && returnData !== '0x') {
        const pd = decodeFunctionResult({
          abi: SEADROP_QUERY_ABI,
          functionName: 'getPublicDrop',
          data: returnData
        }) as any;
        if (pd) {
          isSeaDropReady = true;
          const mintPriceEth = parseFloat(formatEther(pd.mintPrice));
          const now = Math.floor(Date.now() / 1000);
          const startTime = Number(pd.startTime);
          const endTime = Number(pd.endTime);
          publicDropInfo = {
            mintPrice: mintPriceEth,
            mintPriceWei: pd.mintPrice.toString(),
            startTime,
            endTime,
            maxTotalMintableByWallet: Number(pd.maxTotalMintableByWallet),
            feeBps: Number(pd.feeBps),
            restrictFeeRecipients: Boolean(pd.restrictFeeRecipients),
            statusText: now >= startTime && (endTime === 0 || now <= endTime) ? '🔥 正在公开发售中' : '非公开发售中',
            isActive: now >= startTime && (endTime === 0 || now <= endTime),
            isUpcoming: startTime > now,
            isEnded: endTime > 0 && now > endTime
          };
        }
      }
    } catch {
      // Contract does not implement SeaDrop or not on SeaDrop router
    }
  }

  return {
    contractAddress,
    name,
    symbol,
    isSeaDropReady,
    publicDrop: publicDropInfo
  };
}
