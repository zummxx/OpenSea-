import { ModeInfo, TimelineStep, CommandInfo, ConfigOption, SecurityRisk } from '../types';

export const REPO_META = {
  name: 'OSNM-Z',
  fullName: 'OpenSea NFT Minter by Zun',
  binaryName: 'opensea-mint',
  githubUrl: 'https://github.com/zunmax/osnm-z.git',
  version: '0.1.0',
  edition: 'Rust 2024 (1.97.1)',
  license: 'MIT',
  solidityVersion: '0.8.36 (Prague EVM)',
  executorFactory: '0x4e59b44847b379578588920cA78FbF26c0B4956C',
  auditedRuntimeHash: '0x81a86fa2c51be4ed2e09e88256a792e20464184b657f49797d79c6eb90f63d60',
  creationCodeHash: '0x6bcc55c2a44c46d8a3b24f71cef400d0fc38b611f6ec38acaaee24d71470bf4f',
  summary: 'OSNM-Z 是一个用 Rust 编写的高性能跨平台命令行 Mint 工具，专为 OpenSea 支持的 SeaDrop 标准 NFT 系列而设计。它支持单钱包、自费并发多钱包以及基于以太坊最新 EIP-7702 标准的代付赞助批量 Mint，并在毫秒级倒计时（T-2s）抓取私有 GraphQL Calldata 以实现准点抢购与自动归集。'
};

export const MODES_DATA: ModeInfo[] = [
  {
    id: 'single',
    title: '单钱包模式 (Single Wallet)',
    subtitle: '传统单一私钥签名，适合单号抢购与个人白名单',
    maxWallets: 1,
    payerDescription: '配置的钱包自行支付 Mint 价格与链上 Gas 费',
    gasSponsor: '无代付 (钱包自费)',
    nftDestination: '直接保存在该配置钱包内，无需转账',
    failureBoundary: '仅影响该单个钱包和当前阶段',
    keyConfig: ['WALLET_KEY=0x...', 'RPC_URL=https://...', 'FEE_AUTOMATIC=true', 'GAS_LIMIT=300000'],
    features: [
      '极简配置，只需一个私钥与 RPC 地址',
      '完全支持 EIP-1559 动态 Gas 费率自适应',
      '自动检测白名单 (WL)、先到先得 (FCFS) 与公开销售 (Public)',
      'T-10 预先锁定 Nonce 与余额，T-2 获取最新 Calldata 签名发出'
    ],
    workflow: [
      '启动并载入 WALLET_KEY，连接 RPC 探测链 ID',
      '通过 OpenSea 私有 API 获取 Collection 元数据与钱包 Mint 资格',
      '选择要参与的一个或多个阶段（按开始时间排队）',
      'T-10s: 锁定 Nonce、Gas 估算、余额校验',
      'T-2s: 获取该钱包精确的 Mint Calldata',
      'T-0s: 签名并广播 EIP-1559 交易，NFT 保存在本钱包'
    ]
  },
  {
    id: 'self_funded',
    title: '自费多钱包并发模式 (Self-Funded Concurrent)',
    subtitle: '最多 10 个独立钱包并发执行，自动归集 NFT 至目标地址',
    maxWallets: 10,
    payerDescription: '每个子钱包独立支付各自的 Mint 金额、Mint Gas 以及归集转账 Gas',
    gasSponsor: '无代付 (各子钱包独立支付)',
    nftDestination: '通过 safeTransferFrom 自动归集至 RECIPIENT_ADDRESS',
    failureBoundary: '各子钱包并发隔离，单钱包失败不影响其它钱包',
    keyConfig: [
      'WALLETS_FILE=wallets.json',
      'SPONSORED=false',
      'RECIPIENT_ADDRESS=0x...',
      'RPC_URL=https://...'
    ],
    features: [
      '不需要智能合约代理委托，零合约权限风险',
      '交互式资金检查门禁：在启动前自动提示补足余额不足的钱包',
      '支持通过 Multicall3 进行一键原子分发 Native 代币（--fund）',
      'Mint 成功后自动校验上链收据中的 TokenID，并触发安全转账归集至主地址',
      '支持通过 --withdraw 命令一键收回所有子钱包剩余原生币'
    ],
    workflow: [
      '载入 wallets.json 并校验格式规范 (Version 1 格式)',
      '并发请求 OpenSea 查询每个钱包的白名单与阶段资格',
      '交互式资金盘点：计算所需 Mint 本金 + 预估 Gas，提示充值或剔除不足钱包',
      'T-10s: 重新刷新 Nonce、Gas 费率与余额（非阻塞式安全复核）',
      'T-2s: 单一 Aliased GraphQL 请求合并拉取所有钱包专属 Calldata',
      'T-0s: 多钱包并发独立广播 EIP-1559 交易',
      '验证收据并提取资产，触发独立转账归集至 RECIPIENT_ADDRESS'
    ]
  },
  {
    id: 'sponsored',
    title: '赞助者代付模式 (Sponsored EIP-7702)',
    subtitle: '利用 EIP-7702 委托 + EIP-1153 暂态存储，赞助者统包 Gas，最大 25 钱包批量原子 Mint',
    maxWallets: 25,
    payerDescription: '子钱包仅需持有 Mint 本金（免费项目甚至无需 Gas）；赞助钱包 (SPONSOR_KEY) 支付整批交易的全部 Gas 费！',
    gasSponsor: '赞助商钱包 (SPONSOR_KEY) 全包',
    nftDestination: '智能合约内部拦截 ERC-721/1155 回调，原子级直接转发到 RECIPIENT_ADDRESS',
    failureBoundary: '单钱包调用失败在合约内部捕获回滚，不影响同批次其他钱包成功铸造',
    keyConfig: [
      'WALLETS_FILE=wallets.json',
      'SPONSORED=true',
      'SPONSOR_KEY=0x...',
      'SPONSORED_EXECUTOR_ADDRESS=0x...',
      'RECIPIENT_ADDRESS=0x...'
    ],
    features: [
      '颠覆性技术架构：率先商用以太坊 Prague 硬分叉 EIP-7702 EOA 代码委托',
      'EIP-1153 暂态存储 (Transient Storage) 传递回调上下文，仅需 100 gas/TSTORE，杜绝存储槽污染',
      '子钱包签名 EIP-712 操作结构，仅授权扣除精确的 Mint 本金，防止超额扣款',
      'ERC-2098 短签名压缩技术，减少链上 Calldata 体积与手续费',
      '原子级安全归集：仅在 SeaDrop safeMint 回调证明资产生成后立即转给主地址',
      '完备的防沉淀与清理工具：提供 --undelegate 撤销 EIP-7702 委托'
    ],
    workflow: [
      '运行 doctor 检查链是否支持 EIP-7702 与 EIP-1153',
      '使用 deploy-executor 通过官方确定性工厂 (0x4e59...) 部署专属执行器合约',
      '载入最多 25 个子钱包并并发校验资格与本金余额',
      'T-15s: 捕获账户状态，子钱包预先签名 EIP-7702 委托授权',
      'T-2s: 单次 Aliased GraphQL 聚合请求拉取全量钱包动作',
      '生成 EIP-712 结构化签名，打包至单一 Executor Batch 交易',
      '赞助钱包广播交易并支付总 Gas，合约循环执行子钱包铸造并原子转发 NFT',
      '铸造完成后运行 opensea-mint mint --undelegate 撤回代理委托'
    ]
  }
];

export const TIMELINE_STEPS: TimelineStep[] = [
  {
    timeLabel: '准备阶段 (Setup & Doctor)',
    title: '环境诊断与资格预载',
    description: '连接 RPC 端点，探测底层网络特性 (EIP-1559 / EIP-7702 / EIP-1153)，读取 OpenSea 元数据',
    details: [
      'RPC 链 ID 自动识别，拒绝非安全非 HTTPS 连接',
      '全量钱包身份校验与白名单/FCFS 资格拉取 (Eligibility Snapshot)',
      '自费模式启动交互式充值门禁，赞助模式校验确定性执行器合约运行时字节码哈希'
    ],
    badgeColor: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20'
  },
  {
    timeLabel: 'T-15s ~ T-10s',
    title: '状态冻结与预签名',
    description: '进入发射前最后的准备窗口，锁定链上最新状态以防止执行期冲突',
    details: [
      '更新 Nonce、当前区块 Base Fee、小费预估与原生代币余额',
      '赞助模式：对需要新建或替换代理的钱包完成 EIP-7702 委托签名',
      '非阻塞式快速安全校验，若有钱包余额突变则安全跳过，不阻塞其他钱包'
    ],
    badgeColor: 'bg-sky-500/10 text-sky-700 border-sky-500/20'
  },
  {
    timeLabel: 'T-2s (2000ms 热启动)',
    title: '聚合请求获取实时 Calldata',
    description: '精准在各阶段开启前 2 秒向 OpenSea 发起批量 Calldata 抓取',
    details: [
      '通过单个 Aliased GraphQL 组合请求一次性拉取全部子钱包的 Mint 行为',
      '本地验证返回的 Calldata、目标合约、调用数值是否与阶段规则一致',
      '完成 EIP-712 / EIP-1559 签名组装，随时待命'
    ],
    badgeColor: 'bg-amber-500/10 text-amber-700 border-amber-500/20'
  },
  {
    timeLabel: 'T-0s (准点发射)',
    title: '广播与动态加速 (Replacement Bump)',
    description: '阶段开启瞬间立即推送到链上内存池，并持续轮询上链收据',
    details: [
      '单钱包/自费多钱包：独立提交交易；赞助模式：提交单个赞助批次交易',
      '智能轮询策略：250ms 步进重试，若超阈值则以 112.5% (REPLACEMENT_BUMP_BPS) 加价替换',
      '合约内部隔离单点错误：单个子钱包 Mint 失败不导致整个批次交易 Revert'
    ],
    badgeColor: 'bg-indigo-500/10 text-indigo-700 border-indigo-500/20'
  },
  {
    timeLabel: '收尾阶段 (Post-Mint Cleanup)',
    title: '资产归集与权限撤销',
    description: '确保铸造资产落袋为安，并清理临时委托以保障钱包长期安全',
    details: [
      '自费多钱包自动调取 safeTransferFrom 将 NFT 归集到目标归集钱包',
      '赞助模式在 SeaDrop 合约 safeMint 阶段已通过回调原子转发，无需二次转账',
      '关键安全闭环：必须运行 --undelegate 撤销 EIP-7702 委托代码'
    ],
    badgeColor: 'bg-purple-500/10 text-purple-700 border-purple-500/20'
  }
];

export const COMMANDS_DATA: CommandInfo[] = [
  {
    name: 'opensea-mint doctor',
    category: 'core',
    description: '全面检查本地配置、钱包私钥有效性、RPC 网络连通性、EIP 支持度与当前模式完备性',
    syntax: 'opensea-mint doctor',
    broadcasts: false,
    applicableMode: '所有模式',
    parameters: [],
    example: 'opensea-mint doctor'
  },
  {
    name: 'opensea-mint mint',
    category: 'core',
    description: '交互式 Mint 引擎入口，引导选择 OpenSea 项目、校验各钱包白名单资格、排队倒计时并自动发车',
    syntax: 'opensea-mint mint',
    broadcasts: true,
    applicableMode: '所有模式',
    parameters: [],
    example: 'opensea-mint mint'
  },
  {
    name: 'opensea-mint deploy-executor',
    category: 'sponsored',
    description: '通过官方确定性工厂 (0x4e59...) 部署或验证专属于赞助者的 SponsoredMintExecutor 合约，并输出合约地址',
    syntax: 'opensea-mint deploy-executor',
    broadcasts: true,
    applicableMode: '赞助模式 (SPONSORED=true)',
    parameters: [],
    example: 'opensea-mint deploy-executor'
  },
  {
    name: 'opensea-mint mint --fund',
    category: 'management',
    description: '向 wallets.json 列表中的所有子钱包统一批量分发指定数量的原生代币（自费多钱包最多 10 个，赞助模式最多 25 个）',
    syntax: 'opensea-mint mint --fund <NATIVE_AMOUNT>',
    broadcasts: true,
    applicableMode: '多钱包模式 (自费或赞助)',
    parameters: [
      {
        name: '<NATIVE_AMOUNT>',
        description: '每个子钱包分发的原生代币数量（最多 18 位小数，例如 0.005）',
        required: true
      }
    ],
    example: 'opensea-mint mint --fund 0.01'
  },
  {
    name: 'opensea-mint mint --withdraw',
    category: 'management',
    description: '在自费多钱包模式下，自动计算扣除转账 Gas 后的安全余额，并将所有子钱包的原生代币资金归集回指定接收地址',
    syntax: 'opensea-mint mint --withdraw',
    broadcasts: true,
    applicableMode: '自费多钱包模式 (SPONSORED=false)',
    parameters: [],
    example: 'opensea-mint mint --withdraw'
  },
  {
    name: 'opensea-mint mint --undelegate',
    category: 'sponsored',
    description: '重要安全清理命令！撤销 wallets.json 中所有子钱包的 EIP-7702 委托，恢复为普通无代码的纯 EOA 账户',
    syntax: 'opensea-mint mint --undelegate',
    broadcasts: true,
    applicableMode: '赞助模式 (SPONSORED=true)',
    parameters: [],
    example: 'opensea-mint mint --undelegate'
  },
  {
    name: 'opensea-mint wallets create',
    category: 'utility',
    description: '本地纯离线工具，快速批量生成指定数量的新私钥钱包，并格式化导出符合规范的 wallets.json 文件（无需 .env）',
    syntax: 'opensea-mint wallets create --count <COUNT> --quantity <QUANTITY> --output <OUTPUT>',
    broadcasts: false,
    applicableMode: '本地独立工具',
    parameters: [
      {
        name: '--count',
        description: '生成的钱包数量 (例如 10 或 25)',
        required: true,
        defaultValue: '1'
      },
      {
        name: '--quantity',
        description: '每个钱包预设的 Mint 数量属性',
        required: false,
        defaultValue: '1'
      },
      {
        name: '--output / -o',
        description: '导出的 JSON 文件路径（已有同名文件不会覆盖，保障安全）',
        required: false,
        defaultValue: 'wallets.json'
      }
    ],
    example: 'opensea-mint wallets create --count 10 --quantity 1 --output wallets.json'
  },
  {
    name: 'opensea-mint calldata',
    category: 'utility',
    description: '只读调试指令：针对指定 Collection 和钱包列表拉取并打印当前活跃阶段的 Mint 完整 Calldata（最多支持 250 个钱包别名）',
    syntax: 'opensea-mint calldata --collection <COLLECTION> --wallets <WALLETS> [--token-id <TOKEN_ID>]',
    broadcasts: false,
    applicableMode: '多钱包只读测试',
    parameters: [
      {
        name: '--collection',
        description: 'OpenSea Slug、OpenSea 集合页面 URL 或 NFT 合约地址',
        required: true
      },
      {
        name: '--wallets / -w',
        description: '钱包 JSON 文件路径',
        required: true
      },
      {
        name: '--token-id',
        description: 'Token ID（ERC-721 惯例填写 0）',
        required: false,
        defaultValue: '0'
      }
    ],
    example: 'opensea-mint calldata --collection azuki-elementals --wallets wallets.json'
  }
];

export const CONFIG_OPTIONS: ConfigOption[] = [
  {
    key: 'RPC_URL',
    defaultValue: 'https://...',
    required: true,
    category: 'network',
    purpose: '与目标 EVM 区块链交互的节点 RPC 地址（必须是 HTTPS 或本地回环地址）'
  },
  {
    key: 'WALLET_KEY',
    defaultValue: '0x...',
    required: false,
    category: 'mode',
    purpose: '单钱包模式的 64 位十六进制私钥（与 WALLETS_FILE 互斥）'
  },
  {
    key: 'WALLETS_FILE',
    defaultValue: 'wallets.json',
    required: false,
    category: 'mode',
    purpose: '多钱包清单文件路径，包含子钱包私钥与预设数量（与 WALLET_KEY 互斥）'
  },
  {
    key: 'SPONSORED',
    defaultValue: 'false',
    required: false,
    category: 'mode',
    purpose: '多钱包模式下是否开启 EIP-7702 赞助代付（true: 赞助模式; false: 自费并发）'
  },
  {
    key: 'SPONSOR_KEY',
    defaultValue: '0x...',
    required: false,
    category: 'sponsored',
    purpose: '代付赞助者的私钥，负责支付批量交易 Gas、部署合约或批量充值'
  },
  {
    key: 'SPONSORED_EXECUTOR_ADDRESS',
    defaultValue: '0x...',
    required: false,
    category: 'sponsored',
    purpose: '通过 deploy-executor 部署的确定性执行器智能合约地址'
  },
  {
    key: 'RECIPIENT_ADDRESS',
    defaultValue: '0x...',
    required: false,
    category: 'mode',
    purpose: '多钱包模式下最终接收所有 Mint 产生 NFT 的目标主地址'
  },
  {
    key: 'FEE_AUTOMATIC',
    defaultValue: 'true',
    required: true,
    category: 'fees',
    purpose: '是否根据链上最新 Base Fee 与小费自动计算 EIP-1559 手续费'
  },
  {
    key: 'GAS_LIMIT',
    defaultValue: '300000',
    required: true,
    category: 'fees',
    purpose: '每个钱包预估的最大 Mint Gas 额度（默认 300,000）'
  },
  {
    key: 'REPLACEMENT_BUMP_BPS',
    defaultValue: '11250',
    required: false,
    category: 'fees',
    purpose: '交易排队超时重试时的加价比例（基点 bps，11250 代表 112.5%）',
    validRange: '10001 - 20000'
  },
  {
    key: 'OPENSEA_CALLDATA_MAX_ATTEMPTS',
    defaultValue: '40',
    required: false,
    category: 'timeouts',
    purpose: '在 T-2s 窗口期内重试拉取私有 Calldata 的最大次数',
    validRange: '1 - 1000'
  },
  {
    key: 'SPONSORED_OPERATION_DEADLINE_SECONDS',
    defaultValue: '120',
    required: false,
    category: 'sponsored',
    purpose: '子钱包 EIP-712 Mint 签名的有效窗口秒数（过期作废）',
    validRange: '30 - 3600'
  }
];

export const SECURITY_RISKS: SecurityRisk[] = [
  {
    level: 'critical',
    title: '依赖 OpenSea 私有不稳定 API 与盲签风险',
    description: '该工具依赖 OpenSea 网站内部未公开的私有 GraphQL 接口。OpenSea 随时可能更改接口签名或返回未经公开核实的 Calldata。',
    recommendation: '切勿将包含大额资产的主钱包私钥输入到 .env 或 wallets.json 中！必须仅使用专用的抛弃型小号钱包（Burner Wallets），且每个钱包仅转入完成该次 Mint 所需的最低金额。'
  },
  {
    level: 'critical',
    title: 'EIP-7702 代码委托权限持久化风险',
    description: '在赞助模式下，子钱包通过 EIP-7702 委托了 SponsoredMintExecutor 合约。虽然合约仅在签名授权时执行转账，但委托代码在链上会一直保留。',
    recommendation: '每次使用赞助模式完成 Mint 后，必须立即执行 opensea-mint mint --undelegate 撤回所有子钱包的代码委托，恢复为干净的纯 EOA 账户。'
  },
  {
    level: 'high',
    title: '智能合约未经第三方权威审计',
    description: '仓库中包含的 SponsoredMintExecutor.sol 虽然有完整的 Foundry 测试用例与 Slither 静态分析配置，但未经商业安全公司审计。',
    recommendation: '在大规模资金或高价值 NFT 项目中使用前，建议自行在测试网或小金额场景进行演练，核验部署字节码哈希（0x81a86fa...）。'
  },
  {
    level: 'medium',
    title: '明文私钥文件安全与 Git 泄露隐患',
    description: '.env 与 wallets.json 文件中存储了未经加密的原始私钥。',
    recommendation: '确保 .gitignore 包含 .env 与 wallets.json，防止意外提交到公开代码仓库；在公用服务器或 VPS 上使用后应彻底清除文件。'
  }
];
