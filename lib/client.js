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
