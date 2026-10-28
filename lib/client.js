/**
 * dsh-bsc-hot — Client half.
 *
 * Registers a left-rail entry (`sidebar.panellist`) plus its `main` panel, backed
 * by `/api/bsc-hot/top`, served by the Host half. The panel re-reads that
 * endpoint once per second and lists the BSC top 20 tokens by 5-minute trading
 * volume; clicking a token opens https://gmgn.ai/bsc/token/<address> in the
 * system browser.
 */
window.__ModuleLoader__.load({
  id: 'dsh-bsc-hot',
  factory: (require) => {
    const React = require('react')
    const h = React.createElement

    const NS = 'dsh-bsc-hot'
    const TAB_ID = 'dsh-bsc-hot'
    /** Relative on purpose: the page is served under a cookie-authorized root. */
    const ROUTE = 'api/bsc-hot/top'
    const OPEN_ROUTE = 'api/bsc-hot/open'
    const CONFIG_ROUTE = 'api/bsc-hot/config'
    const TEST_ROUTE = 'api/bsc-hot/config/test'
    const GENERATE_ROUTE = 'api/bsc-hot/config/generate'
    const TOKEN_URL = 'https://gmgn.ai/bsc/token/'
    const POLL_MS = 1000

    const DICT = {
      zh: {
        'tab.title': 'BSC 热榜',
        'guide.desc': 'BSC 5 分钟成交额前 20',
        'nav.label': 'BSC 热门',
        'head.title': 'BSC · 5 分钟成交额 Top 20',
        'head.live': '实时',
        'head.pending': '连接中',
        'head.stale': '数据滞后',
        'head.soon': '刚刚',
        'col.volume': '5m 成交额',
        'col.newest': '全网热榜 · 按时间',
        'notif.volume': '5m 成交额 Top3 变动',
        'notif.time': '热榜按时间 Top3 变动',
        'notif.entered': '新进',
        'notif.testAction': '测试通知',
        'btn.twitter': '打开推特',
        'notif.testTitle': '通知测试',
        'notif.testBody': '能看到这条，说明推送通道正常',
        'head.top': 'Top',
        'col.holders': '持仓',
        'col.kol': 'KOL',
        'col.mcap': '市值',
        'col.ath': 'ATH',
        'col.buy': '买',
        'col.sell': '卖',
        'col.top10': '前10',
        'col.bundler': '捆绑',
        'dev.hold': '持仓中',
        'dev.close': '已清仓',
        'dev.burn': '已销毁',
        'dev.none': '无 dev 数据',
        'head.mc': '市值 ≤',
        'chip.honeypot': '已剔除貔貅',
        'chip.verifying': '检测中',
        'chip.kol': '仅 KOL 持仓',
        'chip.platform': '排除',
        'chip.noPlatform': '无平台剔除',
        'tag.honeypot': '貔貅',
        'tax.sell': '卖税',
        'state.loading': '正在获取 GMGN 行情…',
        'state.empty': '暂无数据',
        'state.error': '上游异常',
        'hint.click': '点击代币打开 GMGN',
        'unit.s': '秒前',
        'age.s': '秒',
        'age.m': '分',
        'age.h': '小时',
        'age.d': '天',
        'unit.m': '分钟前',
        'settings.open': '设置',
        'settings.title': '设置',
        'settings.close': '返回榜单',
        'settings.intro': '密钥只保存在本机（~/.dsh），不会写进代码，也不需要重新安装插件。公私钥生成后不可修改。',
        'settings.apiKey': 'GMGN API Key（必填）',
        'settings.apiKey.ph': '粘贴 GMGN API Key',
        'settings.apiKey.hint': '已保存 {hint} · 来源 {source}',
        'settings.publicKey': 'GMGN 公钥（Ed25519，可选）',
        'settings.privateKey': 'GMGN 私钥（Ed25519，可选）',
        'settings.pub.ph': '-----BEGIN PUBLIC KEY----- …（PEM 原文；留空保留已存值）',
        'settings.priv.ph': '-----BEGIN PRIVATE KEY----- …（PEM 原文；留空保留已存值）',
        'settings.key.hint': '已保存 {hint}',
        'settings.proxy': '网络代理（可选）',
        'settings.proxy.ph': 'http://127.0.0.1:7890；none 表示直连；留空则自动',
        'settings.save': '保存并测试',
        'settings.saveOnly': '仅保存',
        'settings.test': '测试连接',
        'settings.testing': '正在向 GMGN 验证…',
        'settings.saved': '已保存',
        'settings.ok': '连接正常，密钥可用',
        'settings.fail': '验证失败',
        'settings.needKey': '还没有可用的 API Key，填好下面第一项就能开始拉取行情。',
        'settings.guide.title': '首次使用，三步完成',
        'settings.guide.one': '1. 运行 gmgn-cli config：生成 Ed25519 密钥对，并给出已预填公钥的 API Key 创建链接。',
        'settings.guide.two': '2. 在打开的页面创建 API Key，把 Key 和公钥/私钥填到下面（已用 gmgn-cli 配置过会自动读取）。',
        'settings.guide.three': '3. 公钥/私钥只有 swap、下单、跟随钱包等签名命令才需要；看榜和通知仅需 API Key。',
        'settings.guide.link': '打开 GMGN API Key 页面',
        'settings.guide.docs': '开放平台文档',
        'settings.deps': '运行环境检查',
        'settings.deps.redetect': '重新检测',
        'settings.deps.fix': '安装方法',
        'settings.deps.ok': '正常',
        'settings.deps.warn': '可选',
        'settings.deps.missing': '缺失',
        'settings.deps.node': 'Node.js 运行时',
        'settings.deps.curl': 'curl（代理请求必需）',
        'settings.deps.notifier': '系统通知通道',
        'settings.deps.cli': 'gmgn-cli（生成密钥对）',
        'settings.deps.keypair': 'GMGN 密钥对文件',
        'settings.deps.proxy': '网络代理',
        'settings.skip': '先看榜单',
        'settings.notSaved': '未保存',
        'settings.err': '保存失败',
        'settings.copy': '复制公钥',
        'settings.copied': '公钥已复制',
        'settings.copyFail': '复制失败，请手动选中文本',
        'settings.generate': '生成密钥对',
        'settings.generating': '正在生成…',
        'settings.genConfirm': '将生成一对新的 Ed25519 密钥并永久保存在本机。密钥生成后不可修改，只能查看，确定继续？',
        'settings.genDone': '密钥对已生成；复制公钥到 GMGN 创建 API Key',
        'settings.genFail': '生成失败',
        'settings.genHint': '还没有密钥对。生成后私钥只留在本机，公钥用来在 GMGN 创建 API Key。',
        'settings.keyLocked': '不可修改',
        'settings.keyLockedHint': '密钥对只能生成一次；确需更换时删除 ~/.dsh/dsh-bsc-hot/settings.json 里的对应字段后重启',
        'settings.keyLockedEnv': '当前密钥来自 gmgn-cli 配置（~/.config/gmgn），插件内只读；如需更换请先用 gmgn-cli 配置新的密钥对',
        'settings.show': '显示',
        'settings.hide': '隐藏',
        'settings.platform': '当前系统',
      },
      en: {
        'tab.title': 'BSC Hot',
        'guide.desc': 'BSC top 20 by 5m volume',
        'nav.label': 'BSC movers',
        'head.title': 'BSC · Top 20 by 5m volume',
        'head.live': 'live',
        'head.pending': 'connecting',
        'head.stale': 'delayed',
        'head.soon': 'just now',
        'col.volume': '5m volume',
        'col.newest': 'Hot · newest',
        'notif.volume': 'Volume Top 3 changed',
        'notif.time': 'Newest Top 3 changed',
        'notif.entered': 'new',
        'notif.testAction': 'Test alert',
        'btn.twitter': 'Open X profile',
        'notif.testTitle': 'Notification test',
        'notif.testBody': 'If you can see this, the push channel works',
        'head.top': 'Top',
        'col.holders': 'holders',
        'col.kol': 'KOL',
        'col.mcap': 'MC',
        'col.ath': 'ATH',
        'col.buy': 'buy',
        'col.sell': 'sell',
        'col.top10': 'top10',
        'col.bundler': 'bundle',
        'dev.hold': 'holding',
        'dev.close': 'closed',
        'dev.burn': 'burned',
        'dev.none': 'no dev data',
        'head.mc': 'MC ≤',
        'chip.honeypot': 'honeypots hidden',
        'chip.verifying': 'checking',
        'chip.kol': 'KOL-held only',
        'chip.platform': 'excluded',
        'chip.noPlatform': 'no-platform dropped',
        'tag.honeypot': 'HONEYPOT',
        'tax.sell': 'sell tax',
        'state.loading': 'Fetching GMGN market data…',
        'state.empty': 'No data yet',
        'state.error': 'Upstream error',
        'hint.click': 'Click a token to open GMGN',
        'unit.s': 's ago',
        'age.s': 's',
        'age.m': 'm',
        'age.h': 'h',
        'age.d': 'd',
        'unit.m': 'm ago',
        'settings.open': 'Settings',
        'settings.title': 'Settings',
        'settings.close': 'Back to board',
        'settings.intro': 'Keys stay on this machine (~/.dsh) — never in the code, and no reinstall needed. The generated pair is read-only.',
        'settings.apiKey': 'GMGN API key (required)',
        'settings.apiKey.ph': 'Paste your GMGN API key',
        'settings.apiKey.hint': 'Saved {hint} · source {source}',
        'settings.publicKey': 'Wallet public key (optional)',
        'settings.privateKey': 'Wallet private key (optional)',
        'settings.pub.ph': '-----BEGIN PUBLIC KEY----- … (PEM; empty keeps the saved value)',
        'settings.priv.ph': '-----BEGIN PRIVATE KEY----- … (PEM; empty keeps the saved value)',
        'settings.key.hint': 'Saved {hint}',
        'settings.proxy': 'Network proxy (optional)',
        'settings.proxy.ph': 'http://127.0.0.1:7890; none means direct; empty means auto',
        'settings.save': 'Save and test',
        'settings.saveOnly': 'Save only',
        'settings.test': 'Test connection',
        'settings.testing': 'Verifying with GMGN…',
        'settings.saved': 'Saved',
        'settings.ok': 'Connection works, key accepted',
        'settings.fail': 'Verification failed',
        'settings.needKey': 'No API key yet. Fill the first field below to start streaming market data.',
        'settings.guide.title': 'First run: three steps',
        'settings.guide.one': '1. Run gmgn-cli config: it creates an Ed25519 key pair and prints a pre-filled API-key link.',
        'settings.guide.two': '2. Create the API key there, then paste the key and both PEM blocks below (existing gmgn-cli setup is auto-detected).',
        'settings.guide.three': '3. The key pair is only needed by signed commands (swap, orders, follow-wallet); the board and alerts need the API key alone.',
        'settings.guide.link': 'Open gmgn.ai',
        'settings.guide.docs': 'Platform docs',
        'settings.deps': 'Environment check',
        'settings.deps.redetect': 'Re-check',
        'settings.deps.fix': 'How to install',
        'settings.deps.ok': 'ok',
        'settings.deps.warn': 'optional',
        'settings.deps.missing': 'missing',
        'settings.deps.node': 'Node.js runtime',
        'settings.deps.curl': 'curl (needed behind a proxy)',
        'settings.deps.notifier': 'Desktop notifications',
        'settings.deps.cli': 'gmgn-cli (key pair generator)',
        'settings.deps.keypair': 'GMGN key pair file',
        'settings.deps.proxy': 'Network proxy',
        'settings.skip': 'Show the board',
        'settings.notSaved': 'not saved',
        'settings.err': 'Save failed',
        'settings.copy': 'Copy public key',
        'settings.copied': 'Public key copied',
        'settings.copyFail': 'Copy failed; select the text manually',
        'settings.generate': 'Generate key pair',
        'settings.generating': 'Generating…',
        'settings.genConfirm': 'Generate a new Ed25519 key pair and save it on this machine? Keys are write-once and cannot be edited afterwards.',
        'settings.genDone': 'Key pair generated; copy the public key into GMGN to create an API key',
        'settings.genFail': 'Generation failed',
        'settings.genHint': 'No key pair yet. The private key stays local; the public key is what you register with GMGN.',
        'settings.keyLocked': 'read-only',
        'settings.keyLockedHint': 'A key pair can only be generated once; to replace it delete the fields in ~/.dsh/dsh-bsc-hot/settings.json and restart',
        'settings.keyLockedEnv': 'This pair comes from gmgn-cli (~/.config/gmgn) and is read-only here; reconfigure gmgn-cli to change it',
        'settings.show': 'Show',
        'settings.hide': 'Hide',
        'settings.platform': 'Platform',
      },
    }

    const STYLE = `
.dshbh-panel{height:100%;min-height:0;width:100%;display:flex}
.dshbh-root{display:flex;flex-direction:column;height:100%;min-height:0;width:100%;max-width:100%;font-size:12px;line-height:1.35}
.dshbh-head{display:flex;align-items:center;gap:6px;padding:8px 10px 6px;position:sticky;top:0;z-index:1;background:color-mix(in srgb,currentColor 4%,transparent);backdrop-filter:blur(6px)}
.dshbh-title{font-weight:600;font-size:12px;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dshbh-dot{width:6px;height:6px;border-radius:50%;background:#16c784;flex:none}
.dshbh-dot[data-state="pending"]{background:#f5a623}
.dshbh-dot[data-state="stale"]{background:#ea3943}
.dshbh-age{opacity:.55;font-variant-numeric:tabular-nums;white-space:nowrap}
.dshbh-x{border:0;background:transparent;color:inherit;font-size:10px;line-height:1;padding:2px 3px;border-radius:4px;
  cursor:pointer;opacity:.5;flex:none;font-weight:700}
.dshbh-x:hover{opacity:1;background:color-mix(in srgb,currentColor 12%,transparent)}
.dshbh-test{border:1px solid color-mix(in srgb,currentColor 22%,transparent);background:transparent;color:inherit;
  font-size:10px;line-height:1;padding:3px 6px;border-radius:6px;cursor:pointer;opacity:.65;flex:none}
.dshbh-test:hover{opacity:1}
.dshbh-kol{color:#e6b64c;font-weight:600}
.dshbh-chip{flex:none;padding:0 5px;border-radius:4px;font-size:10px;line-height:15px;background:color-mix(in srgb,#4a5568 18%,transparent);opacity:.75;white-space:nowrap}
.dshbh-tag{flex:none;padding:0 4px;border-radius:3px;font-size:9.5px;line-height:14px;background:color-mix(in srgb,#ea3943 22%,transparent)}
.dshbh-list{flex:1;min-height:0;overflow-y:auto;overflow-x:hidden;padding:2px 6px 10px}
.dshbh-row{display:flex;align-items:center;gap:8px;padding:5px 6px;border-radius:7px;text-decoration:none;color:inherit;cursor:pointer;border:0;background:transparent;width:100%;min-width:0;box-sizing:border-box;text-align:left;font:inherit}
.dshbh-row:hover{background:color-mix(in srgb,currentColor 9%,transparent)}
/* Row the clicked banner was about: three short pulses, then it settles. */
@keyframes dshbh-pulse{0%,100%{background:transparent;box-shadow:none}25%{background:rgba(52,199,89,.30);box-shadow:inset 0 0 0 1.5px rgba(52,199,89,.75)}}
.dshbh-row.dshbh-flash{animation:dshbh-pulse 1s ease-in-out 3}
.dshbh-row:active{background:color-mix(in srgb,currentColor 14%,transparent)}
.dshbh-rank{width:16px;text-align:right;opacity:.45;font-variant-numeric:tabular-nums;flex:none}
.dshbh-logo{width:20px;height:20px;border-radius:50%;object-fit:cover;flex:none;background:color-mix(in srgb,currentColor 10%,transparent)}
.dshbh-logo-fallback{width:20px;height:20px;border-radius:50%;flex:none;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:600;background:color-mix(in srgb,currentColor 12%,transparent)}
.dshbh-main{flex:1;min-width:0;display:flex;flex-direction:column;gap:1px}
.dshbh-sym{font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dshbh-symline{display:flex;align-items:center;gap:5px;min-width:0}
.dshbh-mcap{display:flex;align-items:baseline;gap:4px;font-variant-numeric:tabular-nums}
.dshbh-mcap-k{font-size:10px;opacity:.45;font-weight:400}
.dshbh-mcap-v{font-size:12.5px;font-weight:650;letter-spacing:.2px;opacity:1}
.dshbh-lp{flex:none;max-width:64px;height:15px;padding:0 4px;border-radius:4px;font-size:9.5px;line-height:15px;
  overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
  background:color-mix(in srgb,currentColor 10%,transparent);opacity:.75}
.dshbh-ath{font-size:10px;opacity:.45;margin-left:4px;font-variant-numeric:tabular-nums;white-space:nowrap}
.dshbh-flows{display:flex;align-items:baseline;gap:8px;font-size:10.5px;opacity:.72;
  overflow:hidden;white-space:nowrap;font-variant-numeric:tabular-nums}
.dshbh-bs{opacity:.95}
.dshbh-buy{color:#16c784}
.dshbh-sell{color:#ea3943}
.dshbh-risk{opacity:.9}
.dshbh-risk-warn{color:#f5a623}
.dshbh-risk-danger{color:#ea3943;font-weight:600}
.dshbh-dev{display:flex;align-items:baseline;gap:6px;font-size:10px;opacity:.5;
  overflow:hidden;white-space:nowrap;font-variant-numeric:tabular-nums}
.dshbh-ok{color:#16c784}
.dshbh-badge{flex:none;height:15px;padding:0 5px;border-radius:4px;font-size:10px;line-height:15px;font-weight:600;font-variant-numeric:tabular-nums;background:color-mix(in srgb,#16c784 18%,transparent);color:#16c784}
.dshbh-right{text-align:right;flex:none;display:flex;flex-direction:column;gap:1px;font-variant-numeric:tabular-nums}
.dshbh-vol{font-weight:600}
.dshbh-chg{font-size:11px}
.dshbh-holds{font-size:10.5px;opacity:.55}
.dshbh-up{color:#16c784}
.dshbh-down{color:#ea3943}
.dshbh-flat{opacity:.6}
.dshbh-cols{flex:1;min-height:0;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:10px;padding:0 6px;overflow:hidden}
.dshbh-col{display:flex;flex-direction:column;min-width:0;min-height:0;border-radius:8px;background:color-mix(in srgb,currentColor 2.5%,transparent)}
.dshbh-colhead{display:flex;align-items:center;gap:6px;padding:4px 8px 3px;font-size:10.5px;opacity:.75}
.dshbh-coltitle{font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dshbh-colage{margin-left:auto;opacity:.6;font-variant-numeric:tabular-nums;white-space:nowrap}
.dshbh-col .dshbh-list{padding:2px 4px 8px}
.dshbh-note{opacity:.45;padding:8px 10px;font-size:11px;text-align:center}
/* A transient tip: horizontally centered at the top of the window, no layout space. */
.dshbh-toast{position:fixed;left:50%;top:24px;transform:translateX(-50%);z-index:60;
  max-width:min(320px,70vw);padding:8px 12px;border-radius:10px;font-size:12px;line-height:1.45;
  background:color-mix(in srgb,#16c784 20%,rgba(10,14,12,.42));color:#eaf6ef;text-align:center;
  border:1px solid color-mix(in srgb,#16c784 38%,transparent);
  box-shadow:0 8px 24px rgba(0,0,0,.22);text-shadow:0 1px 2px rgba(0,0,0,.45);
  display:flex;flex-direction:column;gap:2px;
  pointer-events:none;animation:dshbh-tip-in .18s ease-out}
@keyframes dshbh-tip-in{from{opacity:0;transform:translate(-50%,-6px)}to{opacity:1;transform:translate(-50%,0)}}
.dshbh-toast-b{font-weight:650}
.dshbh-toast-t{opacity:.85}
.dshbh-banner{margin:6px 10px;padding:6px 8px;border-radius:6px;font-size:11px;background:color-mix(in srgb,#ea3943 16%,transparent);color:inherit}
.dshbh-banner-warn{background:color-mix(in srgb,#f5a623 16%,transparent)}
.dshbh-banner button{margin-left:6px}
/* ---- settings -------------------------------------------------------- */
.dshbh-settings{display:flex;flex-direction:column;height:100%;min-height:0}
.dshbh-settings-body{flex:1;min-height:0;overflow-y:auto;padding:4px 10px 14px;display:flex;flex-direction:column;gap:10px}
.dshbh-gen{display:flex;flex-direction:column;gap:6px;align-items:flex-start;margin:2px 0 4px}
.dshbh-card{border-radius:8px;padding:9px 10px;background:color-mix(in srgb,currentColor 3.5%,transparent);display:flex;flex-direction:column;gap:7px}
.dshbh-guide{border-radius:8px;padding:9px 10px;background:color-mix(in srgb,#f5a623 10%,transparent);display:flex;flex-direction:column;gap:4px}
.dshbh-guide-t{font-weight:650}
.dshbh-labelrow{display:flex;align-items:center;gap:6px}
.dshbh-eye{margin-left:auto;border:0;background:transparent;cursor:pointer;font-size:12px;line-height:1;padding:0 2px;opacity:.75}
.dshbh-eye:hover{opacity:1}
.dshbh-guide ol{margin:0;padding-left:16px;display:flex;flex-direction:column;gap:2px;opacity:.85}
.dshbh-guide a{color:inherit;text-decoration:underline;text-underline-offset:2px}
.dshbh-field{display:flex;flex-direction:column;gap:3px}
.dshbh-label{font-size:11px;font-weight:600;opacity:.8;display:flex;align-items:center;gap:6px}
.dshbh-hint{font-size:10.5px;opacity:.5;overflow-wrap:anywhere}
.dshbh-input,.dshbh-area{width:100%;box-sizing:border-box;font:inherit;font-size:11.5px;color:inherit;padding:5px 7px;border-radius:6px;
  border:1px solid color-mix(in srgb,currentColor 20%,transparent);background:color-mix(in srgb,currentColor 4%,transparent);outline:none}
.dshbh-input:focus,.dshbh-area:focus{border-color:color-mix(in srgb,#16c784 55%,transparent)}
.dshbh-area{resize:vertical;min-height:44px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:10.5px;line-height:1.4}
.dshbh-actions{display:flex;flex-wrap:wrap;gap:6px;align-items:center}
.dshbh-btn{border:1px solid color-mix(in srgb,currentColor 22%,transparent);background:transparent;color:inherit;
  font:inherit;font-size:11px;padding:4px 9px;border-radius:6px;cursor:pointer;white-space:nowrap}
.dshbh-btn:hover{background:color-mix(in srgb,currentColor 9%,transparent)}
.dshbh-btn:disabled{opacity:.45;cursor:default}
.dshbh-btn-primary{border-color:transparent;background:color-mix(in srgb,#16c784 24%,transparent);font-weight:600}
.dshbh-status{font-size:11px;padding:6px 8px;border-radius:6px;background:color-mix(in srgb,currentColor 6%,transparent);overflow-wrap:anywhere}
.dshbh-status.ok{background:color-mix(in srgb,#16c784 14%,transparent)}
.dshbh-status.bad{background:color-mix(in srgb,#ea3943 14%,transparent)}
.dshbh-dep{display:flex;align-items:flex-start;gap:6px;font-size:11px;line-height:1.4}
.dshbh-dep-name{font-weight:600;min-width:96px}
.dshbh-dep-detail{flex:1;min-width:0;opacity:.7;overflow-wrap:anywhere}
.dshbh-pill{flex:none;padding:0 5px;border-radius:4px;font-size:9.5px;line-height:15px;background:color-mix(in srgb,#16c784 18%,transparent);color:#16c784}
.dshbh-pill.warn{background:color-mix(in srgb,#f5a623 20%,transparent);color:#f5a623}
.dshbh-pill.missing{background:color-mix(in srgb,#ea3943 20%,transparent);color:#ea3943}
.dshbh-code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:10px;opacity:.75;overflow-wrap:anywhere}
`

    function fmtVolume(value) {
      const n = Number(value) || 0
      if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`
      if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`
      if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`
      return `$${n.toFixed(0)}`
    }

    function fmtPrice(value) {
      const n = Number(value) || 0
      if (!n) return '—'
      if (n >= 100) return n.toFixed(2)
      if (n >= 1) return n.toFixed(3)
      if (n >= 0.01) return n.toFixed(4)
      if (n >= 0.0001) return n.toFixed(6)
      return n.toPrecision(3)
    }

    /** Holder counts read as 8,926 / 317.6K / 1.2M, never as 317626. */
    function fmtCount(value) {
      const n = Number(value) || 0
      if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`
      if (n >= 1e4) return `${(n / 1e3).toFixed(1)}K`
      return n.toLocaleString('en-US')
    }

    /** Token age at the coarsest fitting unit: 32秒 / 12分 / 3小时 / 2天. */
    function fmtTokenAge(t, createdAt, now) {
      if (!createdAt) return ''
      const seconds = Math.max(0, Math.round((now - createdAt) / 1000))
      if (seconds < 60) return `${seconds}${t('age.s')}`
      if (seconds < 3600) return `${Math.floor(seconds / 60)}${t('age.m')}`
      if (seconds < 86400) return `${Math.floor(seconds / 3600)}${t('age.h')}`
      return `${Math.floor(seconds / 86400)}${t('age.d')}`
    }

    /** Coerce to a finite number; anything weird becomes 0. */
    function num(value) {
      const n = Number(value)
      return Number.isFinite(n) ? n : 0
    }

    /** GMGN reports holder/bundler rates as 0..1; tolerate an already-percent value. */
    function fmtRate(value) {
      const n = num(value)
      if (!n) return ''
      const pct = n > 1 ? n : n * 100
      return `${pct.toFixed(pct >= 10 ? 0 : 1)}%`
    }

    function shortAddress(address) {
      return address && address.length > 12 ? `${address.slice(0, 6)}…${address.slice(-4)}` : address || ''
    }

    /** 'flap' -> 'Flap', 'fourmeme' -> '4meme', 'pool_pancake' -> 'Pancake'. */
    function launchpadLabel(name) {
      if (!name) return ''
      const known = { fourmeme: '4meme', pool_pancake: 'Pancake', pancake: 'Pancake', flap: 'Flap',
        pumpfun: 'pump', 'pump.fun': 'pump', letsbonk: 'bonk', raydium: 'Raydium' }
      const hit = known[name] || known[name.toLowerCase()]
      return hit || name.replace(/_/g, ' ').slice(0, 10)
    }

    /** Distance from the all-time-high market cap, e.g. "-91%" or "+12%". */
    function athDelta(t, item) {
      const ath = num(item.athMarketCap)
      const cur = num(item.marketCap)
      if (!ath || !cur) return ''
      const pct = ((cur - ath) / ath) * 100
      if (pct >= 0) return '+0%'
      return `${pct.toFixed(pct <= -10 ? 0 : 1)}%`
    }

    /** Tail-risk tint: >80% concentration is a hard red flag. */
    function riskClass(rate, warnAt, dangerAt) {
      const r = num(rate) > 1 ? num(rate) / 100 : num(rate)
      if (r >= dangerAt) return 'dshbh-risk dshbh-risk-danger'
      if (r >= warnAt) return 'dshbh-risk dshbh-risk-warn'
      return 'dshbh-risk'
    }

    /** dev status text: the boolean wins, then the status string. */
    function devStatus(t, item) {
      if (item.creatorClose) return { key: 'dev.close', danger: true }
      const s = (item.creatorStatus || '').toLowerCase()
      if (s.includes('burn')) return { key: 'dev.burn', danger: false }
      if (s.includes('close') || s.includes('sell') || s.includes('out')) return { key: 'dev.close', danger: true }
      if (s.includes('hold')) return { key: 'dev.hold', danger: false }
      return null
    }

    function fmtPercent(value) {
      const n = Number(value) || 0
      const fixed = Math.abs(n) >= 100 ? n.toFixed(0) : n.toFixed(2)
      return `${n > 0 ? '+' : ''}${fixed}%`
    }

    function fmtAge(t, ageMs) {
      if (ageMs === null || ageMs === undefined) return t('head.pending')
      const seconds = Math.max(0, Math.round(ageMs / 1000))
      if (seconds < 2) return t('head.soon')
      if (seconds < 60) return `${seconds}${t('unit.s')}`
      return `${Math.round(seconds / 60)}${t('unit.m')}`
    }

    /** Absolute creation clock: seconds when it is today, date + minute otherwise. */
    function fmtClock(createdAt, now) {
      if (!createdAt) return ''
      const date = new Date(createdAt)
      const today = new Date(now)
      const hm = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
      if (date.toDateString() === today.toDateString()) {
        return `${hm}:${String(date.getSeconds()).padStart(2, '0')}`
      }
      const md = `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
      return `${md} ${hm}`
    }

    /** Ask the Host to hand one of the two known URLs to the system browser. */
    function openInBrowser(url, address, target = 'gmgn') {
      const fallback = () => {
        window.open(url, '_blank', 'noopener,noreferrer')
      }
      fetch(OPEN_ROUTE, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ address, target }),
      })
        .then((response) => {
          if (!response.ok) fallback()
        })
        .catch(fallback)
    }

    function Logo({ item }) {
      const [broken, setBroken] = React.useState(false)
      if (!item.logo || broken) {
        return h(
          'div',
          { className: 'dshbh-logo-fallback' },
          (item.symbol || '?').slice(0, 2).toUpperCase(),
        )
      }
      return h('img', {
        className: 'dshbh-logo',
        src: item.logo,
        alt: item.symbol,
        loading: 'lazy',
        referrerPolicy: 'no-referrer',
        onError: () => setBroken(true),
      })
    }

    function Row({ item, now, flash }) {
      const t = React.useMemo(() => ctxLocaleRef.bind(NS), [])
      const rowRef = React.useRef(null)
      React.useEffect(() => {
        if (!flash) return
        const node = rowRef.current
        if (node && typeof node.scrollIntoView === 'function') {
          node.scrollIntoView({ block: 'nearest' })
        }
      }, [flash])
      const direction =
        item.change5m > 0 ? 'dshbh-up' : item.change5m < 0 ? 'dshbh-down' : 'dshbh-flat'
      const url = `${TOKEN_URL}${item.address}`
      return h(
        'a',
        {
          ref: rowRef,
          className: flash ? 'dshbh-row dshbh-flash' : 'dshbh-row',
          href: url,
          target: '_blank',
          rel: 'noopener noreferrer',
          title: `${item.symbol} · ${item.name}\n${fmtPrice(item.price)}\n${
            item.createdAt ? new Date(item.createdAt).toLocaleString() : ''
          }\n${url}`,
          onClick: (event) => {
            event.preventDefault()
            openInBrowser(url, item.address)
          },
        },
        h('span', { className: 'dshbh-rank' }, String(item.rank)),
        h(Logo, { item }),
        h(
          'span',
          { className: 'dshbh-main' },
          h(
            'span',
            { className: 'dshbh-symline' },
            h('span', { className: 'dshbh-sym' }, item.symbol || item.address.slice(0, 8)),
            // A green pill on the identity line keeps the age visible even when the
            // narrow sidebar truncates the secondary line.
            item.createdAt
              ? h(
                  'span',
                  {
                    className: 'dshbh-badge',
                    title: new Date(item.createdAt).toLocaleString(),
                  },
                  fmtTokenAge(t, item.createdAt, now),
                )
              : null,
            item.launchpad
              ? h(
                  'span',
                  { className: 'dshbh-lp', title: item.launchpad },
                  launchpadLabel(item.launchpad),
                )
              : null,
            item.twitter
              ? h(
                  'button',
                  {
                    type: 'button',
                    className: 'dshbh-x',
                    title: `${t('btn.twitter')} · @${item.twitter}`,
                    onClick: (event) => {
                      event.preventDefault()
                      event.stopPropagation()
                      openInBrowser(`https://x.com/${item.twitter}`, item.address, 'twitter')
                    },
                  },
                  '𝕏',
                )
              : null,
          ),
          h(
            'span',
            { className: 'dshbh-mcap' },
            h('span', { className: 'dshbh-mcap-k' }, t('col.mcap')),
            h('span', { className: 'dshbh-mcap-v' }, fmtVolume(item.marketCap)),
            item.athMarketCap
              ? h(
                  'span',
                  {
                    className: 'dshbh-ath',
                    title: `${t('col.ath')} ${fmtVolume(item.athMarketCap)}`,
                  },
                  `${t('col.ath')} ${fmtVolume(item.athMarketCap)} ${athDelta(t, item)}`,
                )
              : null,
          ),
          h(
            'span',
            { className: 'dshbh-flows' },
            h('span', { className: 'dshbh-bs' },
              h('span', { className: 'dshbh-buy' }, `${t('col.buy')} ${fmtCount(item.buys5m)}`),
              ' / ',
              h('span', { className: 'dshbh-sell' }, `${t('col.sell')} ${fmtCount(item.sells5m)}`),
            ),
            item.kolCount
              ? h('span', { className: 'dshbh-kol', title: t('col.kol') }, `${t('col.kol')} ${fmtCount(item.kolCount)}`)
              : null,
            item.top10Rate
              ? h('span', { className: riskClass(item.top10Rate, 0.5, 0.8), title: t('col.top10') },
                  `${t('col.top10')} ${fmtRate(item.top10Rate)}`)
              : null,
            item.bundlerRate
              ? h('span', { className: riskClass(item.bundlerRate, 0.4, 0.7), title: t('col.bundler') },
                  `${t('col.bundler')} ${fmtRate(item.bundlerRate)}`)
              : null,
            // Only a known tax is shown: a missing verdict must not read as 0%.
            typeof item.sellTax === 'number' && item.sellTax > 0
              ? h('span', { className: riskClass(item.sellTax, 0.1, 0.3), title: t('tax.sell') },
                  `${t('tax.sell')} ${fmtRate(item.sellTax)}`)
              : null,
            // Reachable only when `filterHoneypot` is off; the row is then marked, not hidden.
            item.honeypot === true
              ? h('span', { className: 'dshbh-tag' }, t('tag.honeypot'))
              : null,
          ),
          h(
            'span',
            { className: 'dshbh-dev' },
            item.creator
              ? h('span', { className: 'dshbh-dev-addr', title: item.creator }, `dev ${shortAddress(item.creator)}`)
              : null,
            devStatus(t, item)
              ? h('span', { className: devStatus(t, item).danger ? 'dshbh-down' : 'dshbh-ok' }, t(devStatus(t, item).key))
              : null,
          ),
        ),
        h(
          'span',
          { className: 'dshbh-right' },
          h('span', { className: 'dshbh-vol' }, fmtVolume(item.volume5m)),
          item.change5m === null || item.change5m === undefined
            ? null
            : h('span', { className: `dshbh-chg ${direction}` }, fmtPercent(item.change5m)),
          h(
            'span',
            { className: 'dshbh-holds', title: t('col.holders') },
            `${fmtCount(item.holders)} ${t('col.holders')}`,
          ),
        ),
      )
    }

    /** Entrants into the top 3 between two payloads; empty means "no change". */
    function top3Entered(previous, next) {
      const before = new Set((previous || []).slice(0, 3).map((item) => item.address).filter(Boolean))
      if (!before.size) return []
      return (next || []).slice(0, 3).filter((item) => item.address && !before.has(item.address))
    }


    /** One column: a header with its own freshness clock, then its rows. */
    function Column({ title, ageMs, error, items, now, flash }) {
      const t = React.useMemo(() => ctxLocaleRef.bind(NS), [])
      // Both columns show the same fields; only their ordering differs.
      const rows = Row
      return h(
        'div',
        { className: 'dshbh-col' },
        h(
          'div',
          { className: 'dshbh-colhead' },
          h('span', { className: 'dshbh-coltitle', title }, title),
          h('span', { className: 'dshbh-colage' }, fmtAge(t, ageMs)),
        ),
        error ? h('div', { className: 'dshbh-banner' }, `${t('state.error')}: ${error}`) : null,
        items.length
          ? h(
              'div',
              { className: 'dshbh-list' },
              items.map((item) =>
                h(rows, {
                  key: item.address || `row-${item.rank}`,
                  item,
                  now,
                  flash: Boolean(flash) && item.address === flash,
                }),
              ),
            )
          : h('div', { className: 'dshbh-note' }, t('state.empty')),
      )
    }

    // ---- module-level feed ---------------------------------------------------
    // A single poller owned by the plugin, not by the panel: the panel is unmounted
    // whenever another panel is selected, but notifications and the click-to-focus
    // handshake have to keep working.
    const EMPTY_FEED = {
      loading: true,
      needsSetup: false,
      items: [],
      updatedAt: 0,
      error: null,
      warning: null,
      maxMarketCapUsd: 0,
      filteredHoneypots: 0,
      pendingSecurity: 0,
      time: { items: [], updatedAt: 0, error: null },
      highlight: null,
    }
    const FEED = {
      data: EMPTY_FEED,
      listeners: new Set(),
      layout: null,
      started: false,
      lastFocusAt: 0,
      ack: 0,
      highlight: null,
    }

    function subscribeFeed(listener) {
      FEED.listeners.add(listener)
      return () => FEED.listeners.delete(listener)
    }

    function useFeed() {
      return React.useSyncExternalStore(subscribeFeed, () => FEED.data)
    }

    function setFeed(next) {
      FEED.data = { ...next, highlight: FEED.highlight }
      for (const listener of FEED.listeners) listener()
    }

    /** Flash one row for a few seconds; the banner click names the token. */
    function highlightToken(address) {
      if (!/^0x[0-9a-fA-F]{40}$/.test(address || '')) return
      FEED.highlight = { address, at: Date.now() }
      setFeed(FEED.data)
    }

    function startFeed() {
      if (FEED.started) return () => {}
      FEED.started = true
      let alive = true
      let timer = 0

      const load = async () => {
        try {
          const query = FEED.ack ? `?ack=${FEED.ack}` : ''
          const response = await fetch(ROUTE + query, { cache: 'no-store' })
          if (!response.ok) throw new Error(`HTTP ${response.status}`)
          const body = await response.json()
          if (!alive) return
          FEED.ack = 0
          // A banner click left a focus request; bring our panel back and tell the
          // Host on the next poll that it has been handled.
          const focusAt = Number(body.focusAt) || 0
          if (focusAt && focusAt !== FEED.lastFocusAt) {
            FEED.lastFocusAt = focusAt
            FEED.ack = focusAt
            highlightToken(String(body.focusAddress || ''))
            try {
              FEED.layout?.selectPanel(TAB_ID)
            } catch (error) {
              console.warn('[dsh-bsc-hot] selectPanel failed', error)
            }
          }
          setFeed({
            loading: false,
            needsSetup: body.needsSetup === true,
            items: Array.isArray(body.items) ? body.items : [],
            updatedAt: body.updatedAt || 0,
            error: body.error || null,
            warning: body.warning || null,
            maxMarketCapUsd: Number(body.maxMarketCapUsd) || 0,
            minKolCount: Number(body.minKolCount) || 0,
            excludePlatforms: Array.isArray(body.excludePlatforms) ? body.excludePlatforms : [],
            platformFiltered: Number(body.platformFiltered) || 0,
            requirePlatform: body.requirePlatform !== false,
            platformlessFiltered: Number(body.platformlessFiltered) || 0,
            kolFiltered: Number(body.kolFiltered) || 0,
            filteredHoneypots: Number(body.filteredHoneypots) || 0,
            pendingSecurity: Number(body.pendingSecurity) || 0,
            time: {
              items: Array.isArray(body.time?.items) ? body.time.items : [],
              updatedAt: Number(body.time?.updatedAt) || 0,
              error: body.time?.error || null,
            },
          })
        } catch (error) {
          if (!alive) return
          setFeed({ ...FEED.data, loading: false, error: error && error.message ? error.message : String(error) })
        }
      }

      const tick = () => {
        void load()
        timer = setTimeout(tick, POLL_MS)
      }
      void load()
      timer = setTimeout(tick, POLL_MS)

      return () => {
        alive = false
        clearTimeout(timer)
        FEED.started = false
      }
    }

    function Panel() {
      const t = React.useMemo(() => ctxLocaleRef.bind(NS), [])
      // The feed itself lives outside the component (see FEED): selecting another
      // panel unmounts this one, and a banner click must still be able to come back.
      const data = useFeed()
      const [now, setNow] = React.useState(() => Date.now())
      const [toast, setToast] = React.useState(null)
      const [view, setView] = React.useState('board')
      // Onboarding opens by itself only once per mount; closing it must stick.
      const setupOpened = React.useRef(false)
      // Remember each column's last top 3 so a change can be detected between polls.
      const lastTop3 = React.useRef({ volume: [], time: [] })
      const toastTimer = React.useRef(0)

      React.useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), 1_000)
        return () => clearInterval(timer)
      }, [])

      // Mirror top-3 changes inside the panel; the OS banner is the Host's job.
      React.useEffect(() => {
        const announce = (kind, title, items) => {
          const list = Array.isArray(items) ? items : []
          const entered = top3Entered(lastTop3.current[kind], list)
          lastTop3.current[kind] = list.slice(0, 3)
          if (!entered.length) return
          const body = `${t('notif.entered')}: ${entered
            .map((item) => `$${item.symbol || String(item.address || '').slice(0, 6)}`)
            .join('  ')}`
          setToast({ title, body, at: Date.now() })
          clearTimeout(toastTimer.current)
          toastTimer.current = setTimeout(() => setToast(null), 8_000)
        }
        announce('volume', t('notif.volume'), data.items)
        announce('time', t('notif.time'), data.time?.items)
      }, [data])

      React.useEffect(() => () => clearTimeout(toastTimer.current), [])

      // No key means nothing can load, so lead with the setup form instead of an
      // empty board. Once dismissed, a banner keeps the way back one click away.
      React.useEffect(() => {
        if (data.needsSetup && !setupOpened.current) {
          setupOpened.current = true
          setView('settings')
        }
      }, [data.needsSetup])

      if (view === 'settings') {
        return h(
          'div',
          { className: 'dshbh-root' },
          h('style', null, STYLE),
          h(SettingsView, { onClose: () => setView('board') }),
        )
      }

      const ageMs = data.updatedAt ? now - data.updatedAt : null
      // Flash only for a few seconds, and only for the token the banner named.
      const highlight = data.highlight
      const flash = highlight && now - highlight.at < 4_000 ? highlight.address : ''
      const state = !data.updatedAt ? 'pending' : data.error || data.warning ? 'stale' : 'live'
      const label =
        state === 'live' ? t('head.live') : state === 'stale' ? t('head.stale') : t('head.pending')

      return h(
        'div',
        { className: 'dshbh-root' },
        h('style', null, STYLE),
        h(
          'div',
          { className: 'dshbh-head' },
          h(
            'span',
            { className: 'dshbh-title', title: t('head.title') },
            data.maxMarketCapUsd > 0
              ? `${t('head.title')} · ${t('head.mc')} ${fmtVolume(data.maxMarketCapUsd)}`
              : t('head.title'),
          ),
          data.minKolCount > 0
            ? h(
                'span',
                { className: 'dshbh-chip', title: t('chip.kol') },
                `${t('chip.kol')} ≥${data.minKolCount}`,
              )
            : null,
          data.excludePlatforms && data.excludePlatforms.length
            ? h(
                'span',
                { className: 'dshbh-chip', title: t('chip.platform') },
                `${t('chip.platform')} ${data.excludePlatforms
                  .map((name) => name.charAt(0).toUpperCase() + name.slice(1))
                  .join('/')}`,
              )
            : null,
          data.requirePlatform
            ? h('span', { className: 'dshbh-chip', title: t('chip.noPlatform') }, t('chip.noPlatform'))
            : null,
          data.filteredHoneypots > 0
            ? h(
                'span',
                { className: 'dshbh-chip', title: t('chip.honeypot') },
                `${t('chip.honeypot')} ${data.filteredHoneypots}`,
              )
            : null,
          data.pendingSecurity > 0
            ? h(
                'span',
                { className: 'dshbh-chip', title: t('chip.verifying') },
                `${t('chip.verifying')} ${data.pendingSecurity}`,
              )
            : null,
          h(
            'button',
            {
              type: 'button',
              className: 'dshbh-test',
              title: t('settings.open'),
              onClick: () => setView('settings'),
            },
            '⚙',
          ),
          h(
            'button',
            {
              type: 'button',
              className: 'dshbh-test',
              title: t('notif.testAction'),
              onClick: () => {
                const title = t('notif.testTitle')
                const message = t('notif.testBody')
                setToast({ title, body: message, at: Date.now() })
                clearTimeout(toastTimer.current)
                toastTimer.current = setTimeout(() => setToast(null), 8000)
              },
            },
            '🔔',
          ),
          h('span', { className: 'dshbh-dot', 'data-state': state, title: label }),
          h('span', { className: 'dshbh-age' }, fmtAge(t, ageMs)),
        ),
        toast
          ? h(
              'div',
              { className: 'dshbh-toast' },
              h('span', { className: 'dshbh-toast-b' }, toast.title),
              h('span', { className: 'dshbh-toast-t' }, toast.body),
            )
          : null,
        data.needsSetup
          ? h(
              'div',
              { className: 'dshbh-banner dshbh-banner-warn' },
              t('settings.needKey'),
              h(
                'button',
                {
                  type: 'button',
                  className: 'dshbh-btn',
                  onClick: () => setView('settings'),
                },
                t('settings.open'),
              ),
            )
          : null,
        data.error
          ? h('div', { className: 'dshbh-banner' }, `${t('state.error')}: ${data.error}`)
          : null,
        data.loading && !data.items.length && !data.time.items.length
          ? h('div', { className: 'dshbh-note' }, t('state.loading'))
          : h(
              'div',
              { className: 'dshbh-cols' },
              h(Column, {
                title: `${t('col.volume')} · ${t('head.top')} ${data.items.length || 20}`,
                ageMs: data.updatedAt ? now - data.updatedAt : null,
                error: data.error,
                items: data.items,
                now,
                flash,
              }),
              h(Column, {
                title: t('col.newest'),
                ageMs: data.time.updatedAt ? now - data.time.updatedAt : null,
                error: data.time.error,
                items: data.time.items,
                now,
                flash,
              }),
            ),
        h('div', { className: 'dshbh-note' }, t('hint.click')),
      )
    }

    /** Per-platform install hint shown next to a missing optional dependency. */
    function installHint(item, platform) {
      // The Host knows the exact command for CLI/key-pair gaps.
      if (item.install) return item.install
      if (item.id === 'curl') {
        if (platform === 'win32') return 'Windows 10+ ships curl.exe; older builds need curl installed.'
        if (platform === 'linux') return 'sudo apt install curl   # or: sudo dnf install curl'
        return 'curl ships with macOS; reinstall the command line tools if it is missing.'
      }
      if (item.id === 'notifier') {
        if (platform === 'darwin') return 'brew install terminal-notifier   # optional: clickable banners'
        if (platform === 'linux') return 'sudo apt install libnotify-bin   # or: sudo dnf install libnotify'
      }
      return ''
    }

    /** Settings live in one view: credentials first, environment guidance below. */
    function SettingsView({ onClose }) {
      const t = React.useMemo(() => ctxLocaleRef.bind(NS), [])
      const [config, setConfig] = React.useState(null)
      const [form, setForm] = React.useState({ apiKey: '', publicKey: '', privateKey: '', proxy: '' })
      const [busy, setBusy] = React.useState('')
      const [notice, setNotice] = React.useState(null)
      // Proxy is only written when edited, so saving a key never resets a proxy mode.
      const [proxyTouched, setProxyTouched] = React.useState(false)
      // Credentials are prefilled and masked; the eye reveals one field at a time.
      const [revealed, setRevealed] = React.useState({ apiKey: false, publicKey: false, privateKey: false })
      // The pair is write-once: once either half exists the panel is view-only and
      // generation disappears, so a stored key can never be replaced by accident.
      const keysLocked = Boolean(config && (config.publicKey.set || config.privateKey.set))
      const canGenerate = Boolean(config) && !keysLocked

      const readConfig = React.useCallback(async () => {
        try {
          const response = await fetch(CONFIG_ROUTE, { cache: 'no-store' })
          if (!response.ok) throw new Error(`HTTP ${response.status}`)
          const body = await response.json()
          setConfig(body)
          // Prefill with the live values: unlike a password manager, the panel has
          // no separate reveal round-trip, so a masked field still holds the value.
          const valueOf = (entry) => (entry && typeof entry.value === 'string' ? entry.value : '')
          setForm({
            apiKey: valueOf(body.apiKey),
            publicKey: valueOf(body.publicKey),
            privateKey: valueOf(body.privateKey),
            proxy: body.proxyStored ?? body.proxy ?? '',
          })
          return body
        } catch (error) {
          setNotice({ kind: 'bad', text: String(error && error.message ? error.message : error) })
          return null
        }
      }, [])

      React.useEffect(() => {
        void readConfig()
      }, [readConfig])

      const update = (field) => (event) => {
        const value = event.target.value
        setForm((prev) => ({ ...prev, [field]: value }))
      }

      const runTest = async () => {
        setBusy('test')
        try {
          const response = await fetch(TEST_ROUTE, { method: 'POST' })
          const result = await response.json().catch(() => ({}))
          if (result.ok) setNotice({ kind: 'ok', text: `${t('settings.ok')} · HTTP ${result.status || 200}` })
          else setNotice({ kind: 'bad', text: `${t('settings.fail')}: ${result.error || `HTTP ${result.status || '?'}`}` })
        } catch (error) {
          setNotice({ kind: 'bad', text: `${t('settings.fail')}: ${error.message || error}` })
        } finally {
          setBusy('')
        }
      }

      const generate = async () => {
        if (!window.confirm(t('settings.genConfirm'))) return
        setBusy('gen')
        setNotice(null)
        try {
          const response = await fetch(GENERATE_ROUTE, { method: 'POST' })
          const body = await response.json().catch(() => ({}))
          if (!response.ok || body.ok === false) throw new Error(body.error || `HTTP ${response.status}`)
          setConfig(body)
          await readConfig()
          setNotice({ kind: 'ok', text: t('settings.genDone') })
        } catch (error) {
          setNotice({ kind: 'bad', text: `${t('settings.genFail')}: ${error.message || error}` })
        } finally {
          setBusy('')
        }
      }

      const save = async (test) => {
        setBusy(test ? 'save+test' : 'save')
        setNotice(null)
        try {
          // Only non-empty secrets are sent: an empty input means "keep what is
          // stored", not "delete it". Clearing goes through its own button.
          const payload = {}
          if (proxyTouched) payload.proxy = form.proxy
          if (form.apiKey.trim()) payload.apiKey = form.apiKey.trim()
          if (!keysLocked) {
            if (form.publicKey.trim()) payload.publicKey = form.publicKey.trim()
            if (form.privateKey.trim()) payload.privateKey = form.privateKey.trim()
          }
          const response = await fetch(CONFIG_ROUTE, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(payload),
          })
          const body = await response.json().catch(() => ({}))
          if (!response.ok || body.ok === false) throw new Error(body.error || `HTTP ${response.status}`)
          setConfig(body)
          setProxyTouched(false)
          // Keep the values in the fields (they stay masked until revealed).
          await readConfig()
          if (!test) {
            setNotice({ kind: 'ok', text: t('settings.saved') })
            return
          }
          await runTest()
        } catch (error) {
          setNotice({ kind: 'bad', text: `${t('settings.err')}: ${error.message || error}` })
        } finally {
          setBusy('')
        }
      }

      /** One credential row: masked value, eye toggle, optional extra action. */
      const secretField = (name, label, placeholder, rows, action, locked = false) => {
        const value = form[name] || ''
        const open = Boolean(revealed[name])
        const display = open || !value ? value : '*'.repeat(Math.min(Math.max(value.length, 8), 40))
        const toggle = () =>
          setRevealed((prev) => ({ ...prev, [name]: !prev[name] }))
        // Locked fields are never editable: the eye only switches their display,
        // it cannot turn them into inputs.
        const editable = !locked && !open
        const control = rows
          ? h('textarea', {
              className: 'dshbh-area',
              rows,
              spellCheck: false,
              readOnly: !editable,
              placeholder: locked ? '' : placeholder,
              value: display,
              onChange: editable ? update(name) : undefined,
            })
          : h('input', {
              className: 'dshbh-input',
              type: 'text',
              autoComplete: 'off',
              spellCheck: false,
              readOnly: !editable,
              placeholder: locked ? '' : placeholder,
              value: display,
              onChange: editable ? update(name) : undefined,
            })
        return h(
          'label',
          { className: 'dshbh-field' },
          h(
            'div',
            { className: 'dshbh-labelrow' },
            h('span', { className: 'dshbh-label' }, label),
            locked || value
              ? h(
                  'button',
                  {
                    type: 'button',
                    className: 'dshbh-eye',
                    title: open ? t('settings.hide') : t('settings.show'),
                    'aria-label': open ? t('settings.hide') : t('settings.show'),
                    onClick: toggle,
                  },
                  open ? '🙈' : '👁',
                )
              : null,
          ),
          control,
          h(
            'span',
            { className: 'dshbh-hint' },
            locked
              ? `${secretHint(config && config[name])} · ${t('settings.keyLocked')}`
              : secretHint(config && config[name]),
          ),
          action || null,
        )
      }

      const field = (name, label, hint, control, action) =>
        h(
          'label',
          { className: 'dshbh-field' },
          h('span', { className: 'dshbh-label' }, label),
          control,
          hint ? h('span', { className: 'dshbh-hint' }, hint) : null,
          action || null,
        )

      const secretHint = (entry) =>
        entry && entry.set ? `${t('settings.saved')} ${entry.hint || ''} · ${entry.source || ''}` : t('settings.notSaved')

      const deps = config && config.deps

      return h(
        'div',
        { className: 'dshbh-settings' },
        h(
          'div',
          { className: 'dshbh-head' },
          h('span', { className: 'dshbh-title' }, t('settings.title')),
          h('button', { type: 'button', className: 'dshbh-test', onClick: onClose }, t('settings.close')),
        ),
        h(
          'div',
          { className: 'dshbh-settings-body' },
          !config || !config.apiKey.set
            ? h(
                'div',
                { className: 'dshbh-guide' },
                h('span', { className: 'dshbh-guide-t' }, t('settings.guide.title')),
                h(
                  'ol',
                  null,
                  h('li', null, t('settings.guide.one')),
                  h('li', null, t('settings.guide.two')),
                  h('li', null, t('settings.guide.three')),
                ),
                h(
                  'span',
                  { className: 'dshbh-hint' },
                  h('a', { href: 'https://gmgn.ai/ai/generateapi', target: '_blank', rel: 'noreferrer' }, t('settings.guide.link')),
                  ' · ',
                  h('a', { href: 'https://docs.gmgn.ai', target: '_blank', rel: 'noreferrer' }, t('settings.guide.docs')),
                ),
              )
            : null,
          h(
            'div',
            { className: 'dshbh-card' },
            h('span', { className: 'dshbh-hint' }, t('settings.intro')),
            secretField('apiKey', t('settings.apiKey'), t('settings.apiKey.ph'), 0),
            secretField(
              'publicKey',
              t('settings.publicKey'),
              t('settings.pub.ph'),
              2,
              config && config.publicKey && config.publicKey.value
                ? h(
                    'button',
                    {
                      type: 'button',
                      className: 'dshbh-btn',
                      onClick: async () => {
                        try {
                          await navigator.clipboard.writeText(config.publicKey.value)
                          setNotice({ kind: 'plain', text: t('settings.copied') })
                        } catch {
                          setNotice({ kind: 'bad', text: t('settings.copyFail') })
                        }
                      },
                    },
                    t('settings.copy'),
                  )
                : null,
              keysLocked,
            ),
            secretField('privateKey', t('settings.privateKey'), t('settings.priv.ph'), 3, null, keysLocked),
            canGenerate
              ? h(
                  'div',
                  { className: 'dshbh-gen' },
                  h(
                    'button',
                    {
                      type: 'button',
                      className: 'dshbh-btn',
                      disabled: Boolean(busy),
                      onClick: () => void generate(),
                    },
                    busy === 'gen' ? t('settings.generating') : t('settings.generate'),
                  ),
                  h('span', { className: 'dshbh-hint' }, t('settings.genHint')),
                )
              : null,
            keysLocked
              ? h(
                  'span',
                  { className: 'dshbh-hint' },
                  t(
                    config && (config.privateKey.source || config.publicKey.source) === 'gmgn-cli'
                      ? 'settings.keyLockedEnv'
                      : 'settings.keyLockedHint',
                  ),
                )
              : null,
            field(
              'proxy',
              t('settings.proxy'),
              '',
              h('input', {
                className: 'dshbh-input',
                type: 'text',
                spellCheck: false,
                placeholder: t('settings.proxy.ph'),
                value: form.proxy,
                onChange: (event) => {
                  const value = event.target.value
                  setProxyTouched(true)
                  setForm((prev) => ({ ...prev, proxy: value }))
                },
              }),
            ),
            h(
              'div',
              { className: 'dshbh-actions' },
              h(
                'button',
                {
                  type: 'button',
                  className: 'dshbh-btn dshbh-btn-primary',
                  disabled: Boolean(busy),
                  onClick: () => void save(true),
                },
                busy === 'save+test' ? t('settings.testing') : t('settings.save'),
              ),
              h(
                'button',
                { type: 'button', className: 'dshbh-btn', disabled: Boolean(busy), onClick: () => void save(false) },
                t('settings.saveOnly'),
              ),
              h(
                'button',
                { type: 'button', className: 'dshbh-btn', disabled: Boolean(busy), onClick: () => void runTest() },
                busy === 'test' ? t('settings.testing') : t('settings.test'),
              ),
            ),
            notice
              ? h(
                  'div',
                  { className: `dshbh-status ${notice.kind === 'ok' ? 'ok' : notice.kind === 'bad' ? 'bad' : ''}` },
                  notice.text,
                )
              : null,
          ),
          h(
            'div',
            { className: 'dshbh-card' },
            h(
              'div',
              { className: 'dshbh-label' },
              t('settings.deps'),
              h(
                'button',
                { type: 'button', className: 'dshbh-btn', disabled: Boolean(busy), onClick: () => void readConfig() },
                t('settings.deps.redetect'),
              ),
            ),
            deps
              ? deps.items.map((item) =>
                  h(
                    'div',
                    { className: 'dshbh-dep', key: item.id },
                    h('span', { className: 'dshbh-dep-name' }, t(`settings.deps.${item.id}`)),
                    h(
                      'span',
                      { className: `dshbh-pill ${item.status === 'ok' ? '' : item.status}` },
                      t(`settings.deps.${item.status}`),
                    ),
                    h(
                      'span',
                      { className: 'dshbh-dep-detail' },
                      item.detail || item.channel || '',
                      item.status !== 'ok' && installHint(item, deps.platform)
                        ? h('span', { className: 'dshbh-code' }, `  ${installHint(item, deps.platform)}`)
                        : null,
                    ),
                  ),
                )
              : h('div', { className: 'dshbh-hint' }, '…'),
            deps
              ? h(
                  'div',
                  { className: 'dshbh-hint' },
                  `${t('settings.platform')}: ${deps.platform} · Node ${deps.node}`,
                )
              : null,
            deps && deps.storePath
              ? h(
                  'div',
                  { className: 'dshbh-hint dshbh-code' },
                  deps.storeExists ? deps.storePath : `${deps.storePath} (new)`,
                )
              : null,
          ),
        ),
      )
    }

    /** The left-rail glyph; the sidebar passes `size` and `active`. */
    function PanelIcon({ size = 16 }) {
      return h(Icon, { size })
    }

    /** Full-height host for the panel body inside the main column. */
    function LeftPanel() {
      return h(
        'div',
        { className: 'dshbh-panel' },
        h(Boundary, null, h(Panel)),
      )
    }

    /** The glyph shared by the rail entry and the panel header. */
    function Icon({ size = 14 }) {
      return h(
        'svg',
        {
          viewBox: '0 0 24 24',
          width: size,
          height: size,
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 2,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
        },
        h('path', { d: 'M3 17l6-6 4 4 7-7' }),
        h('path', { d: 'M14 8h6v6' }),
      )
    }

    /** Keeps one bad row from taking down the sidebar tab, and surfaces the reason. */
    class Boundary extends React.Component {
      constructor(props) {
        super(props)
        this.state = { error: null }
      }

      static getDerivedStateFromError(error) {
        return { error }
      }

      render() {
        if (this.state.error) {
          const message =
            this.state.error && this.state.error.message
              ? this.state.error.message
              : String(this.state.error)
          return h('div', { className: 'dshbh-note dshbh-crash' }, `dsh-bsc-hot: ${message}`)
        }
        return this.props.children
      }
    }


    let ctxLocaleRef = null

    function apply(ctx) {
      ctx.effect(() => ctx.locale.register(NS, DICT), 'dsh-bsc-hot: dictionaries')
      ctxLocaleRef = ctx.locale
      const t = ctx.locale.bind(NS)

      // Keep the panel addressable from the poller, so a banner click can select it.
      ctx.inject(['layout'], (scoped) => {
        FEED.layout = scoped.layout
        return () => {
          FEED.layout = null
        }
      })
      // Poll from the plugin, not the panel: the panel unmounts on every other tab.
      ctx.effect(() => startFeed(), 'dsh-bsc-hot: feed poller')

      ctx.effect(
        () => {
          // A left-rail entry is a `sidebar.panellist` icon whose id addresses the
          // `main` panel of the same key — the sidebar owns the button and its label.
          const disposers = []
          const keep = (value) => {
            if (typeof value === 'function') disposers.push(value)
          }
          try {
            keep(
              ctx.slots.inject('sidebar.panellist', () =>
                ctx.slots.register(
                  {
                    name: 'sidebar.panellist',
                    id: TAB_ID,
                    order: 25,
                    label: () => t('nav.label'),
                    locale: NS,
                  },
                  PanelIcon,
                ),
              ),
            )
            keep(
              ctx.slots.inject('main', () =>
                ctx.slots.register(
                  { name: 'main', key: TAB_ID, locale: NS },
                  LeftPanel,
                ),
              ),
            )
            return () => {
              for (const dispose of disposers) dispose()
            }
          } catch (error) {
            for (const dispose of disposers) dispose()
            throw error
          }
        },
        'dsh-bsc-hot: left sidebar panel',
      )
    }

    return { name: NS, inject: ['slots', 'locale'], apply }
  },
})
