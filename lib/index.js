/**
 * dsh-bsc-hot — Host half.
 *
 * Polls GMGN OpenAPI `/v1/market/rank` for BSC, 5-minute interval, sorted by
 * volume (USD) descending, keeps the top-N snapshot in memory, and serves it to
 * the Web client over a same-origin fetch route:
 *
 *   GET  /api/bsc-hot/top   -> { ok, chain, interval, updatedAt, ageMs, items[] }
 *   POST /api/bsc-hot/open  -> opens https://gmgn.ai/bsc/token/<address>
 *
 * Egress note: this machine reaches openapi.gmgn.ai only through a local HTTP
 * proxy, and Node's global fetch ignores HTTPS_PROXY. So proxied requests shell
 * out to `curl --proxy` (see `curlGet`). Set `config.proxy` to "" to use a
 * direct `fetch` instead.
 */
import { execFile } from 'node:child_process'
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  truncateSync,
} from 'node:fs'
import { readFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'

export const name = 'dsh-bsc-hot'

const API_HOST = 'https://openapi.gmgn.ai'
const ROUTE_PATH = '/api/bsc-hot/top'
const OPEN_PATH = '/api/bsc-hot/open'
const DEFAULT_PROXY = 'http://127.0.0.1:7890'
const CLIENT_IDLE_MS = 60_000
// Background cadence: with notifications on, the boards must stay fresh even when
// no panel is open, so idle is only a little slower than the focused cadence.
const IDLE_REFRESH_MS = 6_000
/** How many leading rows are announced when they change. */
const NOTIFY_TOP_N = 3
/**
 * macOS `display notification` has no colour or icon parameter, so the two boards
 * are told apart by a coloured dot in the title plus a distinct alert sound.
 */
const NOTIFY_STYLE = {
  volume: { label: '成交额榜', title: '成交额榜 Top3 变动', sound: 'Glass' },
  time: { label: '时间榜', title: '时间榜 Top3 变动', sound: 'Ping' },
}
/**
 * Clicking a banner touches this file, which the panel picks up on its next poll and
 * turns into "select my sidebar panel". The click handler runs outside this process,
 * so a file is the simplest way to hand the event over.
 */
const FOCUS_FILE = '/tmp/dsh-bsc-hot-focus'
/**
 * A token that bounces in and out of the top 3 would otherwise notify on every
 * bounce; hold it quiet for this long after it was announced once.
 */
const NOTIFY_COOLDOWN_MS = 10 * 60_000
/** `terminal-notifier` is the only way to get a clickable banner; probed once at apply. */
const NOTIFIER_CANDIDATES = [
  // A copy in ~/Applications is registered with LaunchServices, which macOS needs
  // before it will grant notification permission to a command-line bundle.
  join(homedir(), 'Applications/terminal-notifier.app/Contents/MacOS/terminal-notifier'),
  '/opt/homebrew/bin/terminal-notifier',
  '/usr/local/bin/terminal-notifier',
]
/** Token logos are downloaded here, because a banner image must be a local file. */
const LOGO_DIR = '/tmp/dsh-bsc-hot-logos'
const LOGO_TTL_MS = 6 * 60 * 60_000
/** Free-tier weight budget is 5/s and `market/rank` costs 3: never issue faster than this. */
const MIN_INTERVAL_MS = 1_100
// A hard floor between any two GMGN calls: bursts (queue floods, a second board
// turning due at once) are what trips the tier limit, not the average rate.
const MIN_REQUEST_GAP_MS = 900
const SECURITY_PATH = '/v1/token/security'
const INFO_PATH = '/v1/token/info'
/** Socials change rarely; a long TTL keeps `/v1/token/info` off the hot path. */
const SOCIAL_TTL_MS = 30 * 60_000
/** New addresses per board refresh, so a full-board swap cannot flood the queue. */
const SOCIAL_PER_REFRESH = 6
/** Honeypot status almost never changes, so keep a verdict for ten minutes. */
const DEFAULT_SECURITY_TTL_MS = 10 * 60_000
/** A 100% sell tax is a honeypot in all but name; 50% is already unexitable. */
const HONEYPOT_SELL_TAX = 0.5

function envProxy() {
  return (
    process.env.HTTPS_PROXY ||
    process.env.https_proxy ||
    process.env.HTTP_PROXY ||
    process.env.http_proxy ||
    process.env.ALL_PROXY ||
    process.env.all_proxy ||
    ''
  )
}

/** Resolve the proxy for this run: explicit config wins, then env, then the local default. */
function resolveProxy(config) {
  if (config.proxy !== undefined && config.proxy !== null) return String(config.proxy) || ''
  const fromEnv = envProxy()
  if (fromEnv) return fromEnv
  return DEFAULT_PROXY
}

async function readApiKey(explicit) {
  if (explicit) return String(explicit).trim()
  if (process.env.GMGN_API_KEY) return process.env.GMGN_API_KEY.trim()
  const configHome = process.env.XDG_CONFIG_HOME || join(homedir(), '.config')
  const candidates = [join(configHome, 'gmgn', '.env'), join(homedir(), '.gmgn', '.env')]
  for (const file of candidates) {
    let text
    try {
      text = await readFile(file, 'utf8')
    } catch {
      continue
    }
    for (const line of text.split(/\r?\n/)) {
      const match = /^\s*(?:export\s+)?GMGN_API_KEY\s*=\s*(.*)\s*$/.exec(line)
      if (match) return match[1].trim().replace(/^['"]|['"]$/g, '')
    }
  }
  return ''
}

/** Run curl, resolving to { status, text } (curl already speaks proxy + TLS for us). */
/** Stream one image to `dest`; resolves to true when a plausible file landed. */
function curlDownload(url, dest, proxyUrl, timeoutMs) {
  const args = [
    '--silent', '--show-error', '--location', '--max-time', String(Math.ceil(timeoutMs / 1000)),
    '--fail', '--output', dest,
    '--write-out', '%{http_code}',
  ]
  if (proxyUrl) args.push('--proxy', proxyUrl)
  args.push('--user-agent', 'dsh-bsc-hot/0.1.0', url)
  return new Promise((resolve) => {
    execFile('curl', args, { timeout: timeoutMs + 2_000 }, (error, stdout) => {
      if (error) {
        resolve(false)
        return
      }
      resolve(String(stdout).trim() === '200')
    })
  })
}

function curlGet(url, headers, proxyUrl, timeoutMs) {
  const args = [
    '--silent', '--show-error', '--location', '--max-time', String(Math.ceil(timeoutMs / 1000)),
    '--proxy', proxyUrl,
    '--user-agent', 'dsh-bsc-hot/0.1.0',
    '--write-out', '\n%{http_code}',
  ]
  for (const [name, value] of Object.entries(headers)) {
    if (name.toLowerCase() === 'user-agent') continue
    args.push('--header', `${name}: ${value}`)
  }
  args.push(url)

  return new Promise((resolve, reject) => {
    execFile('curl', args, { maxBuffer: 8 * 1024 * 1024, timeout: timeoutMs + 2_000 }, (error, stdout) => {
      if (error && !stdout) {
        reject(new Error(`curl failed: ${error.message}`))
        return
      }
      const cut = stdout.lastIndexOf('\n')
      const text = cut === -1 ? stdout : stdout.slice(0, cut)
      const status = cut === -1 ? 0 : Number(stdout.slice(cut + 1).trim())
      resolve({ status, text })
    })
  })
}

async function directGet(url, headers, timeoutMs) {
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(timeoutMs) })
  const text = await response.text()
  return { status: response.status, text }
}

/**
 * GET a JSON document. Node's global fetch ignores HTTPS_PROXY, so when a proxy
 * is configured the request goes through curl instead.
 */
async function httpGetJson(url, headers, proxyUrl, timeoutMs = 12_000) {
  if (!proxyUrl) return await directGet(url, headers, timeoutMs)
  return await curlGet(url, headers, proxyUrl, timeoutMs)
}

/** Unwrap the double `{code, data}` envelope GMGN uses on the OpenAPI edge. */
function unwrapRank(payload) {
  let node = payload
  for (let depth = 0; depth < 4; depth += 1) {
    if (!node || typeof node !== 'object') return null
    if (Array.isArray(node.rank)) return node.rank
    if (!('data' in node)) return null
    if (Number(node.code) !== 0) {
      throw new Error(node.message || node.msg || `GMGN error code ${node.code}`)
    }
    node = node.data
  }
  return null
}

/**
 * Unwrap the double `{code, data}` envelope when the payload is a single object
 * (`/v1/token/info`) rather than the rank list {@link unwrapRank} expects.
 */
function unwrapObject(payload) {
  let node = payload
  for (let depth = 0; depth < 4; depth += 1) {
    if (!node || typeof node !== 'object' || Array.isArray(node)) return null
    if (node.link && typeof node.link === 'object') return node
    if (!('data' in node)) return node
    if (Number(node.code) !== 0) {
      throw new Error(node.message || node.msg || `GMGN error code ${node.code}`)
    }
    node = node.data
  }
  return null
}

/** Like {@link num}, but keeps "absent" distinguishable from a real zero. */
function nullableNum(value) {
  if (value === null || value === undefined || value === '') return null
  const parsed = typeof value === 'number' ? value : Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : null
}

function num(value) {
  const parsed = typeof value === 'number' ? value : Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : 0
}

/** Accept seconds or milliseconds and normalize to milliseconds, or 0 when absent. */
function timestampToMs(value) {
  const n = num(value)
  if (!n || n < 0) return 0
  return n > 1e12 ? n : n * 1000
}

function normalizeItem(entry, index) {
  return {
    rank: index + 1,
    address: String(entry.address || ''),
    symbol: String(entry.symbol || ''),
    name: String(entry.name || ''),
    logo: typeof entry.logo === 'string' ? entry.logo : '',
    price: num(entry.price),
    volume5m: num(entry.volume),
    change5m: nullableNum(entry.price_change_percent5m ?? entry.price_change_percent),
    change1m: num(entry.price_change_percent1m),
    swaps5m: num(entry.swaps),
    buys5m: num(entry.buys),
    sells5m: num(entry.sells),
    marketCap: num(entry.market_cap),
    liquidity: num(entry.liquidity),
    holders: num(entry.holder_count),
    // Holders that GMGN labels as KOL (renowned wallets) and smart money.
    kolCount: num(entry.renowned_count),
    smartCount: num(entry.smart_degen_count),
    // GMGN reports seconds; keep milliseconds so the panel can show 32s / 12m / 3h / 2d.
    createdAt: timestampToMs(entry.creation_timestamp ?? entry.open_timestamp),
    launchpad: typeof entry.launchpad_platform === 'string' ? entry.launchpad_platform : '',
    // Chip and dev risk: rates arrive as 0..1 fractions.
    top10Rate: num(entry.top_10_holder_rate),
    bundlerRate: num(entry.bundler_rate),
    athMarketCap: num(entry.history_highest_market_cap),
    creator: typeof entry.creator === 'string' ? entry.creator : '',
    creatorClose: entry.creator_close === true,
    creatorStatus: typeof entry.creator_token_status === 'string' ? entry.creator_token_status : '',
    // Security verdict is filled in by the background `/v1/token/security` pass:
    // `null` means "not checked yet", never "safe".
    honeypot: null,
    sellTax: null,
    buyTax: null,
    canSell: null,
    securityAt: 0,
  }
}

/** Drop rows whose verdict is a honeypot; rows without a verdict stay visible. */
export function dropHoneypots(items, enabled) {
  if (!enabled) return { items, dropped: 0 }
  const kept = items.filter((item) => item.honeypot !== true)
  return { items: kept, dropped: items.length - kept.length }
}

export function verdictOf(entry) {
  const flagged = entry.is_honeypot === true || Number(entry.honeypot) > 0
  const sellTax = Number(entry.sell_tax)
  const buyTax = Number(entry.buy_tax)
  const taxedOut = Number.isFinite(sellTax) && sellTax >= HONEYPOT_SELL_TAX
  return {
    honeypot: flagged || taxedOut,
    sellTax: Number.isFinite(sellTax) ? sellTax : null,
    buyTax: Number.isFinite(buyTax) ? buyTax : null,
    at: Date.now(),
  }
}

export function apply(ctx, config = {}) {
  const settings = {
    chain: config.chain || 'bsc',
    interval: config.interval || '5m',
    limit: Math.min(Math.max(Number(config.limit) || 20, 1), 100),
    // GMGN filters server-side, so one request returns `scanLimit` tokens under the
    // ceiling and the board takes the first `limit` of them by 5m volume.
    scanLimit: Math.min(Math.max(Number(config.scanLimit) || 60, 1), 100),
    maxMarketCapUsd: config.maxMarketCapUsd === undefined ? 5_000_000 : Math.max(Number(config.maxMarketCapUsd) || 0, 0),
    // Keep only tokens that at least one KOL wallet holds; 0 turns the gate off.
    minKolCount: config.minKolCount === undefined ? 1 : Math.max(Number(config.minKolCount) || 0, 0),
    // Launch platforms to hide, matched as lowercase substrings of `launchpad_platform`
    // (e.g. "pancake" hides pool_pancake and pancakeswap). Empty list keeps everything.
    excludePlatforms: Array.isArray(config.excludePlatforms)
      ? config.excludePlatforms.map((value) => String(value).toLowerCase().trim()).filter(Boolean)
      : ['pancake'],
    // Tokens with no `launchpad_platform` (plain pools, not a launchpad mint) are
    // hidden too unless this is false.
    requirePlatform: config.requirePlatform !== false,
    // Honeypots are dropped from the board after a per-token security verdict.
    notify: config.notify !== false,
    filterHoneypot: config.filterHoneypot !== false,
    securityTtlMs: Math.max(Number(config.securityTtlMs) || DEFAULT_SECURITY_TTL_MS, 60_000),
    refreshMs: Math.max(Number(config.refreshMs) || 1_000, 1_000),
    // The newest-created column is its own GMGN request, so it refreshes on a
    // slower clock: creation times never change, only the set of new pairs does.
    timeRefreshMs: Math.max(Number(config.timeRefreshMs) || 5_000, 3_000),
    // "Newest" column: one wide page of the trending board, locally ordered by
    // creation time. `order_by` has no time value on GMGN's side, so the page must
    // be wide (100 is the endpoint's maximum).
    timeScanLimit: Math.min(Math.max(Number(config.timeScanLimit) || 100, 1), 100),
    proxy: resolveProxy(config),
    apiKey: config.apiKey,
    debug: Boolean(config.debug),
    debugFile: config.debugFile,
    apiHost: config.apiHost || API_HOST,
  }

  let snapshot = {
    items: [],
    updatedAt: 0,
    error: null,
    warning: null,
    timeItems: [],
    timeUpdatedAt: 0,
    timeError: null,
    // Rows the KOL gate removed, per board; surfaced so the filter is not a silent cut.
    kolFilteredVolume: 0,
    kolFilteredTime: 0,
    platformFilteredVolume: 0,
    platformFilteredTime: 0,
    platformlessFilteredVolume: 0,
    platformlessFilteredTime: 0,
    version: 0,
  }
  let inFlight = null
  let timeInFlight = null
  let lastClientAt = 0
  let apiKey = ''
  let proxyUp = Boolean(settings.proxy)
  let backoffUntil = 0
  let lastFetchAt = 0
  let lastRequestAt = 0
  let lastTimeFetchAt = 0
  /** address -> { honeypot, sellTax, buyTax, at } from `/v1/token/security`. */
  const security = new Map()
  /** Addresses still waiting for their first (or a stale) verdict. */
  let securityQueue = []
  const notifierPath = NOTIFIER_CANDIDATES.find((candidate) => existsSync(candidate)) || ''
  /** Bumped when a banner is clicked; the panel acknowledges it once handled. */
  let focusAt = 0
  /** Token the clicked banner was about, so the panel can flash that row. */
  let focusAddress = ''
  let focusSeenMtime = 0

  /** Translate a banner click into a one-shot focus request. */
  function pollFocusFile() {
    try {
      const { mtimeMs } = statSync(FOCUS_FILE)
      if (mtimeMs > focusSeenMtime) {
        focusSeenMtime = mtimeMs
        focusAt = Date.now()
        // The click handler writes the announced token into the same file.
        try {
          const raw = readFileSync(FOCUS_FILE, 'utf8').trim()
          focusAddress = /^0x[0-9a-fA-F]{40}$/.test(raw) ? raw : ''
        } catch {
          focusAddress = ''
        }
        dbg(`focus: requested by notification click (${focusAddress || 'no address'})`)
      }
    } catch {
      // No click file: nothing to do.
    }
    return focusAt
  }
  /**
   * Local copy of a token's logo for the banner. Falls back to the board dot when
   * the URL is missing or the download fails, so a broken CDN never blocks a push.
   */
  async function logoFileFor(item) {
    const url = item && typeof item.logo === 'string' ? item.logo : ''
    const address = item && item.address ? String(item.address).toLowerCase() : ''
    if (!/^https?:\/\//.test(url) || !/^0x[0-9a-f]{40}$/.test(address)) return ''
    const file = join(LOGO_DIR, `${address}.png`)
    try {
      if (existsSync(file) && Date.now() - statSync(file).mtimeMs < LOGO_TTL_MS) return file
    } catch {
      // fall through to a fresh download
    }
    try {
      mkdirSync(LOGO_DIR, { recursive: true })
      // gmgn.ai serves the artwork behind a bot challenge and in webp, so the
      // image goes through a public resizer that answers with a plain PNG.
      const proxied = `https://wsrv.nl/?url=${encodeURIComponent(
        url.replace(/^https?:\/\//, ''),
      )}&output=png&w=96&h=96&fit=cover`
      const ok = await curlDownload(proxied, file, settings.proxy, 12_000)
      if (ok && existsSync(file) && statSync(file).size > 512) return file
    } catch (error) {
      dbg(`logo: FAILED ${error.message}`)
    }
    return ''
  }

  /** Last announced top-N key per board, so only real changes are notified. */
  const lastTop = { volume: '', time: '' }
  /** address -> last announcement time, per board, to mute bounce-backs. */
  const announced = { volume: new Map(), time: new Map() }
  /** address -> { twitter, website, telegram, at } from `/v1/token/info`. */
  const social = new Map()
  /** Addresses still waiting for their first (or a stale) socials. */
  let socialQueue = []

  const debugFile = settings.debug ? String(settings.debugFile || '/tmp/dsh-bsc-hot-debug.log') : ''
  if (debugFile) {
    // The host restarts often during plugin development; keep the trace bounded.
    try {
      if (statSync(debugFile).size > 2 * 1024 * 1024) truncateSync(debugFile, 0)
    } catch {}
  }
  function dbg(message) {
    if (!debugFile) return
    try {
      appendFileSync(debugFile, `${new Date().toISOString()} ${message}\n`)
    } catch {}
  }
  dbg(`notifier: ${notifierPath || 'none (osascript fallback, not clickable)'}`)
  dbg(`apply: chain=${settings.chain} interval=${settings.interval} limit=${settings.limit} scan=${settings.scanLimit} maxMc=${settings.maxMarketCapUsd} minKol=${settings.minKolCount} dropPlatforms=${settings.excludePlatforms.join(',') || '-'} requirePlatform=${settings.requirePlatform} refreshMs=${settings.refreshMs} proxy=${JSON.stringify(settings.proxy)}`)

  async function ensureApiKey() {
    if (apiKey) return apiKey
    apiKey = await readApiKey(settings.apiKey)
    return apiKey
  }

  /** Keep a floor between consecutive GMGN calls; the poller already serializes them. */
  async function gateRequest() {
    const wait = MIN_REQUEST_GAP_MS - (Date.now() - lastRequestAt)
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait))
    lastRequestAt = Date.now()
  }

  /** A token qualifies when at least `minKolCount` GMGN-labelled KOL wallets hold it. */
  const hasKol = (item) =>
    settings.minKolCount <= 0 || (item.kolCount || 0) >= settings.minKolCount

  /** True when the token launched on a platform the user asked to hide. */
  /** A token passes when GMGN reports a launch platform and it is not excluded. */
  const hasPlatform = (item) => !settings.requirePlatform || String(item.launchpad || '') !== ''

  const onExcludedPlatform = (item) => {
    if (!settings.excludePlatforms.length) return false
    const platform = String(item.launchpad || '').toLowerCase()
    return platform !== '' && settings.excludePlatforms.some((name) => platform.includes(name))
  }

  async function fetchRank() {
    const key = await ensureApiKey()
    if (!key) throw new Error('GMGN_API_KEY missing (looked in env and ~/.config/gmgn/.env)')

    const timestamp = Math.floor(Date.now() / 1000)
    const query = new URLSearchParams({
      chain: settings.chain,
      interval: settings.interval,
      limit: String(settings.scanLimit),
      order_by: 'volume',
      direction: 'desc',
      timestamp: String(timestamp),
      client_id: randomUUID(),
    })
    if (settings.maxMarketCapUsd > 0) query.set('max_marketcap', String(settings.maxMarketCapUsd))
    const url = `${settings.apiHost}/v1/market/rank?${query}`
    const headers = {
      'X-APIKEY': key,
      'Content-Type': 'application/json',
      'User-Agent': 'dsh-bsc-hot/0.1.0',
      Accept: 'application/json',
    }

    await gateRequest()
    let response
    const useProxy = proxyUp && settings.proxy
    try {
      response = await httpGetJson(url, headers, useProxy)
    } catch (error) {
      // A dead proxy is worse than no proxy: fall back to a direct request once.
      if (useProxy) {
        proxyUp = false
        ctx.logger?.warn?.(`[dsh-bsc-hot] proxy ${settings.proxy} failed (${error.message}); falling back to direct`)
        response = await httpGetJson(url, headers, '')
      } else {
        throw error
      }
    }

    if (response.status === 429) {
      // GMGN bans the caller's IP for violating the tier limit, so honour its
      // own reset clock (`reset_at`, unix seconds) instead of a fixed guess.
      let resetAt = 0
      try {
        resetAt = Number(JSON.parse(response.text).reset_at) || 0
      } catch {}
      const fromReset = resetAt > 0 ? resetAt * 1000 - Date.now() + 500 : 0
      const waitMs = Math.min(Math.max(fromReset, 3_000), 120_000)
      backoffUntil = Date.now() + waitMs
      throw new Error(`GMGN rate limited (HTTP 429), backing off ${Math.round(waitMs / 1000)}s`)
    }
    if (response.status !== 200) {
      throw new Error(`GMGN HTTP ${response.status}: ${String(response.text || '').slice(0, 160)}`)
    }

    let payload
    try {
      payload = JSON.parse(response.text)
    } catch {
      throw new Error(`GMGN returned non-JSON: ${String(response.text || '').slice(0, 160)}`)
    }

    const rank = unwrapRank(payload)
    if (!Array.isArray(rank)) throw new Error('GMGN response has no rank array')
    // The ceiling is re-applied here even though GMGN already filtered: a server
    // that ignores `max_marketcap` must never leak a large cap into the board.
    const ceiling = settings.maxMarketCapUsd
    const underCeiling = rank
      .map(normalizeItem)
      .filter((item) => (ceiling > 0 ? item.marketCap > 0 && item.marketCap <= ceiling : true))
    const kolKept = underCeiling.filter(hasKol)
    snapshot.kolFilteredVolume = underCeiling.length - kolKept.length
    const platformKept = kolKept.filter((item) => !onExcludedPlatform(item))
    snapshot.platformFilteredVolume = kolKept.length - platformKept.length
    const kept = platformKept.filter(hasPlatform)
    snapshot.platformlessFilteredVolume = platformKept.length - kept.length
    return kept
  }

  /** Newest-created pairs of the chain, ordered by creation time (descending). */
  /**
   * Exactly what `gmgn-cli market trending --chain bsc --interval 5m` returns
   * (`GET /v1/market/rank` with no `order_by`, i.e. GMGN's own hot ordering),
   * re-ordered by token creation time and limited to the same market-cap ceiling
   * as the volume board. The endpoint has no time-based `order_by`, so the page is
   * wide (`timeScanLimit`) and sorted here.
   */
  async function fetchHotByTime() {
    const key = await ensureApiKey()
    if (!key) throw new Error('GMGN_API_KEY missing (looked in env and ~/.config/gmgn/.env)')

    const query = new URLSearchParams({
      chain: settings.chain,
      interval: settings.interval,
      limit: String(settings.timeScanLimit),
      timestamp: String(Math.floor(Date.now() / 1000)),
      client_id: randomUUID(),
    })
    if (settings.maxMarketCapUsd > 0) query.set('max_marketcap', String(settings.maxMarketCapUsd))
    const url = `${settings.apiHost}/v1/market/rank?${query}`
    const headers = {
      'X-APIKEY': key,
      'Content-Type': 'application/json',
      'User-Agent': 'dsh-bsc-hot/0.1.0',
      Accept: 'application/json',
    }

    const useProxy = proxyUp && settings.proxy
    await gateRequest()
    let response
    try {
      response = await httpGetJson(url, headers, useProxy)
    } catch (error) {
      if (!useProxy) throw error
      proxyUp = false
      ctx.logger?.warn?.(`[dsh-bsc-hot] proxy ${settings.proxy} failed (${error.message}); falling back to direct`)
      response = await httpGetJson(url, headers, '')
    }

    if (response.status === 429) {
      let resetAt = 0
      try {
        resetAt = Number(JSON.parse(response.text).reset_at) || 0
      } catch {}
      const fromReset = resetAt > 0 ? resetAt * 1000 - Date.now() + 500 : 0
      const waitMs = Math.min(Math.max(fromReset, 3_000), 120_000)
      backoffUntil = Date.now() + waitMs
      throw new Error(`GMGN rate limited (HTTP 429), backing off ${Math.round(waitMs / 1000)}s`)
    }
    if (response.status !== 200) {
      throw new Error(`GMGN hot-time HTTP ${response.status}: ${String(response.text || '').slice(0, 160)}`)
    }

    let payload
    try {
      payload = JSON.parse(response.text)
    } catch {
      throw new Error(`GMGN returned non-JSON: ${String(response.text || '').slice(0, 160)}`)
    }

    const rank = unwrapRank(payload)
    if (!Array.isArray(rank)) throw new Error('GMGN hot-time response has no rank array')

    // Same ceiling as the volume board: filtered server-side above and re-checked
    // here, then ordered newest-first.
    const ceiling = settings.maxMarketCapUsd
    const underCeiling = rank
      .map(normalizeItem)
      .filter((item) => (ceiling > 0 ? item.marketCap > 0 && item.marketCap <= ceiling : true))
    const kolKept = underCeiling.filter(hasKol)
    snapshot.kolFilteredTime = underCeiling.length - kolKept.length
    const platformKept = kolKept.filter((item) => !onExcludedPlatform(item))
    snapshot.platformFilteredTime = kolKept.length - platformKept.length
    const kept = platformKept.filter(hasPlatform)
    snapshot.platformlessFilteredTime = platformKept.length - kept.length
    const sorted = kept.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
    dbg(
      `hot-time: ${rank.length} raw -> ${sorted.length} under ceiling, first ages: ${sorted
        .slice(0, 3)
        .map((item) => (item.createdAt ? `${Math.round((Date.now() - item.createdAt) / 1000)}s` : '-'))
        .join(',')}`,
    )
    return sorted
  }

  /**
   * One `/v1/token/security` verdict. A token counts as a honeypot when GMGN says
   * so, or when the sell tax is high enough that exiting is impossible (100% is
   * the classic trap; 50% already eats the position).
   */

  async function fetchSecurity(address) {
    const key = await ensureApiKey()
    if (!key) throw new Error('GMGN_API_KEY missing (looked in env and ~/.config/gmgn/.env)')
    const query = new URLSearchParams({
      chain: settings.chain,
      address,
      timestamp: String(Math.floor(Date.now() / 1000)),
      client_id: randomUUID(),
    })
    const url = `${settings.apiHost}${SECURITY_PATH}?${query}`
    const headers = {
      'X-APIKEY': key,
      'Content-Type': 'application/json',
      'User-Agent': 'dsh-bsc-hot/0.1.0',
      Accept: 'application/json',
    }
    const useProxy = proxyUp && settings.proxy
    await gateRequest()
    let response
    try {
      response = await httpGetJson(url, headers, useProxy)
    } catch (error) {
      if (!useProxy) throw error
      proxyUp = false
      response = await httpGetJson(url, headers, '')
    }
    if (response.status === 429) {
      let resetAt = 0
      try {
        resetAt = Number(JSON.parse(response.text).reset_at) || 0
      } catch {}
      const fromReset = resetAt > 0 ? resetAt * 1000 - Date.now() + 500 : 0
      backoffUntil = Date.now() + Math.min(Math.max(fromReset, 3_000), 120_000)
      throw new Error('GMGN security rate limited (HTTP 429)')
    }
    if (response.status !== 200) throw new Error(`GMGN security HTTP ${response.status}`)
    const payload = JSON.parse(response.text)
    const entry = payload?.data?.data ?? payload?.data
    if (!entry || typeof entry !== 'object') throw new Error('GMGN security response has no data')
    return verdictOf(entry)
  }

  /**
   * Queue every candidate whose verdict is missing or older than the TTL. New
   * entrants go to the front: a token that just entered the board must not wait
   * behind a backlog before its verdict lands.
   */
  /** One `/v1/token/info` lookup, reduced to the social handles the panel links to. */
  async function fetchSocial(address) {
    const key = await ensureApiKey()
    if (!key) throw new Error('GMGN_API_KEY missing (looked in env and ~/.config/gmgn/.env)')
    const query = new URLSearchParams({
      chain: settings.chain,
      address,
      timestamp: String(Math.floor(Date.now() / 1000)),
      client_id: randomUUID(),
    })
    const url = `${settings.apiHost}${INFO_PATH}?${query}`
    const headers = {
      'X-APIKEY': key,
      'Content-Type': 'application/json',
      'User-Agent': 'dsh-bsc-hot/0.1.0',
      Accept: 'application/json',
    }
    const useProxy = proxyUp && settings.proxy
    await gateRequest()
    let response
    try {
      response = await httpGetJson(url, headers, useProxy)
    } catch (error) {
      if (!useProxy) throw error
      proxyUp = false
      response = await httpGetJson(url, headers, '')
    }
    if (response.status === 429) {
      let resetAt = 0
      try {
        resetAt = Number(JSON.parse(response.text).reset_at) || 0
      } catch {}
      const fromReset = resetAt > 0 ? resetAt * 1000 - Date.now() + 500 : 0
      backoffUntil = Date.now() + Math.min(Math.max(fromReset, 3_000), 120_000)
      throw new Error('GMGN rate limited (HTTP 429)')
    }
    if (response.status !== 200) {
      throw new Error(`GMGN info HTTP ${response.status}: ${String(response.text || '').slice(0, 120)}`)
    }
    let payload
    try {
      payload = JSON.parse(response.text)
    } catch {
      throw new Error('GMGN info returned non-JSON')
    }
    const info = unwrapObject(payload)
    const link = (info && info.link) || {}
    const handle = String(link.twitter_username || '').trim().replace(/^@/, '')
    return {
      twitter: /^[A-Za-z0-9_]{1,15}$/.test(handle) ? handle : '',
      website: String(link.website || '').trim(),
      telegram: String(link.telegram || '').trim(),
      at: Date.now(),
    }
  }

  function queueSecurity(candidates) {
    const now = Date.now()
    // Keep only addresses that still matter: a token that fell out of the band must
    // not keep spending the shared request budget.
    const band = new Set(candidates.map((item) => item.address))
    // Both columns spend the same verdict budget, so an address still shown in
    // either board keeps its place in the queue.
    for (const item of snapshot.items) if (item.address) band.add(item.address)
    for (const item of snapshot.timeItems || []) if (item.address) band.add(item.address)
    const kept = securityQueue.filter((address) => band.has(address))
    const fresh = []
    for (const item of candidates) {
      if (!item.address) continue
      const cached = security.get(item.address)
      if (cached && cached.at > 0 && now - cached.at < settings.securityTtlMs) continue
      if (kept.includes(item.address) || fresh.includes(item.address)) continue
      fresh.push(item.address)
    }
    securityQueue = fresh.concat(kept)
  }

  function queueSocial(candidates) {
    const now = Date.now()
    const band = new Set(candidates.map((item) => item.address))
    for (const item of snapshot.items) if (item.address) band.add(item.address)
    for (const item of snapshot.timeItems || []) if (item.address) band.add(item.address)
    const kept = socialQueue.filter((address) => band.has(address))
    const fresh = []
    for (const item of candidates) {
      if (!item.address) continue
      if (fresh.length >= SOCIAL_PER_REFRESH) break
      const cached = social.get(item.address)
      if (cached && cached.at > 0 && now - cached.at < SOCIAL_TTL_MS) continue
      if (kept.includes(item.address) || fresh.includes(item.address)) continue
      fresh.push(item.address)
    }
    socialQueue = fresh.concat(kept)
  }

  function decorate(item) {
    const cached = security.get(item.address)
    const link = social.get(item.address)
    const twitter = link && link.twitter ? link.twitter : ''
    if ((!cached || cached.at === 0) && !twitter) return item
    return {
      ...item,
      ...(cached && cached.at !== 0
        ? { honeypot: cached.honeypot, sellTax: cached.sellTax, buyTax: cached.buyTax, securityAt: cached.at }
        : null),
      twitter,
    }
  }

  /**
   * Native macOS notification through `osascript`, so it still arrives when the
   * Web panel is closed, throttled, or the window is in the background.
   */
  function pushNativeNotification(style, body, address, iconPath) {
    if (!settings.notify || process.platform !== 'darwin') return
    const title = style.title
    const sound = style.sound
    // Only the token's own artwork is used; without it the banner stays text-only.
    const image = iconPath || ''
    if (notifierPath) {
      const args = ['-title', title, '-message', body, '-group', `dsh-bsc-hot-${style.label}`]
      if (sound) args.push('-sound', sound)
      if (image && existsSync(image)) args.push('-contentImage', image)
      // Clicking must surface the panel, not a browser tab: activate the app and
      // leave a marker the panel turns into `layout.selectPanel(...)`.
      // The announced token rides along so the panel can flash exactly that row.
      const token = /^0x[0-9a-fA-F]{40}$/.test(address || '') ? address : ''
      args.push('-execute', `printf '%s' '${token}' > ${FOCUS_FILE}`)
      args.push('-activate', 'com.deepseek.dsh')
      execFile(notifierPath, args, { timeout: 8_000 }, (error) => {
        if (error) dbg(`notify: FAILED ${error.message}`)
      })
      dbg(`notify[tn]: ${title} | ${body} | ${token || '-'} | icon=${image && existsSync(image) ? image : '-'}`)
      return
    }
    // Symbols come from the chain, so strip anything that would break the AppleScript.
    const clean = (text) => String(text).replace(/[\\"]/g, ' ').slice(0, 180)
    const script =
      `display notification "${clean(body)}" with title "${clean(title)}"` +
      (sound ? ` sound name "${clean(sound)}"` : '')
    execFile('osascript', ['-e', script], { timeout: 5_000 }, (error) => {
      if (error) dbg(`notify: FAILED ${error.message}`)
    })
    dbg(`notify: ${title} | ${body}`)
  }

  /** Announce entrants into the top N of one board; a change of order alone is silent. */
  function announceTop(kind, items) {
    const top = (items || []).slice(0, NOTIFY_TOP_N).map((item) => item.address).filter(Boolean)
    if (!top.length) return
    const key = top.join(',')
    const previous = lastTop[kind]
    lastTop[kind] = key
    if (!previous || previous === key) return
    const before = new Set(previous.split(','))
    const now = Date.now()
    const seen = announced[kind] || announced.volume
    const entered = (items || [])
      .slice(0, NOTIFY_TOP_N)
      .filter((item) => item.address && !before.has(item.address))
      .filter((item) => {
        const last = seen.get(item.address) || 0
        if (now - last < NOTIFY_COOLDOWN_MS) return false
        seen.set(item.address, now)
        return true
      })
    // Drop anything that aged out, so the map cannot grow without bound.
    for (const [address, at] of seen) if (now - at > NOTIFY_COOLDOWN_MS * 6) seen.delete(address)
    if (!entered.length) return
    const symbols = entered.map((item) => `$${item.symbol || String(item.address).slice(0, 6)}`).join('  ')
    const style = NOTIFY_STYLE[kind] || NOTIFY_STYLE.volume
    const target = entered.find((item) => item.address)
    // Announce immediately with the board dot, then replace it once the logo is
    // cached: a slow CDN must not delay the alert.
    void logoFileFor(target).then((icon) => {
      pushNativeNotification(style, `新进：${symbols}`, target ? target.address : '', icon)
    })
  }

  function refresh() {
    if (inFlight) return inFlight
    if (Date.now() < backoffUntil) return Promise.resolve(snapshot)
    if (Date.now() - lastFetchAt < MIN_INTERVAL_MS) return Promise.resolve(snapshot)
    lastFetchAt = Date.now()
    inFlight = (async () => {
      try {
        dbg('refresh: fetching')
        const candidates = await fetchRank()
        // Only the head of the list can enter the board, so verify that band and
        // leave the tail unchecked instead of burning the quota on 100 verdicts.
        queueSecurity(candidates.slice(0, settings.limit + 5))
        queueSocial(candidates.slice(0, settings.limit + 5))
        const decorated = candidates.map(decorate)
        // Only honeypots that would otherwise have made the board are worth reporting.
        const head = decorated.slice(0, settings.limit + 5)
        const droppedInHead = head.filter((item) => item.honeypot === true).length
        const { items: visible, dropped } = dropHoneypots(decorated, settings.filterHoneypot)
        const items = visible
          .slice(0, settings.limit)
          .map((item, index) => ({ ...item, rank: index + 1 }))
        // Spread, never rebuild: this snapshot also carries the time-column fields
        // (`timeItems` / `timeUpdatedAt` / `timeError`). Rebuilding it here dropped
        // them, and the next throttled time refresh then read `.length` of undefined
        // inside its catch block and killed the whole host process.
        snapshot = {
          ...snapshot,
          items,
          updatedAt: Date.now(),
          error: null,
          warning: null,
          filteredHoneypots: dropped,
          pendingSecurity: securityQueue.length,
          version: snapshot.version + 1,
        }
        announceTop('volume', items)
        dbg(`refresh: ok ${items.length} items (honeypots filtered: ${snapshot.filteredHoneypots}, pending: ${securityQueue.length})`)
      } catch (error) {
        const message = error && error.message ? error.message : String(error)
        if (/429|rate limited/i.test(message)) {
          // A transient rate limit must not blank the board or raise an error banner:
          // keep the last good snapshot and let the backoff above throttle us.
          snapshot = { ...snapshot, warning: message, version: snapshot.version + 1 }
          dbg(`refresh: throttled -> keep ${(snapshot.items || []).length} items`)
        } else {
          snapshot = { ...snapshot, error: message, version: snapshot.version + 1 }
          dbg(`refresh: FAILED ${message}`)
          ctx.logger?.warn?.(`[dsh-bsc-hot] refresh failed: ${message}`)
        }
      } finally {
        inFlight = null
      }
      return snapshot
    })()
    return inFlight
  }

  function refreshTime() {
    if (timeInFlight) return timeInFlight
    if (Date.now() < backoffUntil) return Promise.resolve(snapshot)
    if (Date.now() - lastTimeFetchAt < MIN_INTERVAL_MS) return Promise.resolve(snapshot)
    lastTimeFetchAt = Date.now()
    timeInFlight = (async () => {
      try {
        dbg('hot-time: fetching')
        const candidates = await fetchHotByTime()
        queueSecurity(candidates.slice(0, settings.limit + 5))
        queueSocial(candidates.slice(0, settings.limit + 5))
        const decorated = candidates.map(decorate)
        const head = decorated.slice(0, settings.limit + 5)
        const droppedInHead = head.filter((item) => item.honeypot === true).length
        const { items: visible, dropped } = dropHoneypots(decorated, settings.filterHoneypot)
        const timeItems = visible
          .slice(0, settings.limit)
          .map((item, index) => ({ ...item, rank: index + 1 }))
        snapshot = {
          ...snapshot,
          timeItems,
          timeUpdatedAt: Date.now(),
          timeError: null,
          timeFilteredHoneypots: dropped,
          version: snapshot.version + 1,
        }
        announceTop('time', timeItems)
        dbg(`hot-time: ok ${timeItems.length} items (honeypots filtered: ${dropped}, dropped-in-head: ${droppedInHead})`)
      } catch (error) {
        const message = error && error.message ? error.message : String(error)
        if (/429|rate limited/i.test(message)) {
          snapshot = { ...snapshot, warning: message, version: snapshot.version + 1 }
          dbg(`hot-time: throttled -> keep ${(snapshot.timeItems || []).length} items`)
        } else {
          snapshot = { ...snapshot, timeError: message, version: snapshot.version + 1 }
          dbg(`hot-time: FAILED ${message}`)
          ctx.logger?.warn?.(`[dsh-bsc-hot] hot-time failed: ${message}`)
        }
      } finally {
        timeInFlight = null
      }
      return snapshot
    })()
    return timeInFlight
  }

  function payload() {
    const ageMs = snapshot.updatedAt ? Date.now() - snapshot.updatedAt : null
    const focus = pollFocusFile()
    return {
      ok: Boolean(snapshot.updatedAt) && !snapshot.error,
      chain: settings.chain,
      interval: settings.interval,
      limit: settings.limit,
      scanLimit: settings.scanLimit,
      maxMarketCapUsd: settings.maxMarketCapUsd,
      minKolCount: settings.minKolCount,
      refreshMs: settings.refreshMs,
      updatedAt: snapshot.updatedAt,
      ageMs,
      focusAt: focus,
      focusAddress: focusAt ? focusAddress : '',
      error: snapshot.error,
      warning: snapshot.warning,
      filterHoneypot: settings.filterHoneypot,
      filteredHoneypots: snapshot.filteredHoneypots || 0,
      kolFiltered: snapshot.kolFilteredVolume || 0,
      excludePlatforms: settings.excludePlatforms,
      requirePlatform: settings.requirePlatform,
      platformFiltered: snapshot.platformFilteredVolume || 0,
      platformlessFiltered: snapshot.platformlessFilteredVolume || 0,
      pendingSecurity: snapshot.pendingSecurity || 0,
      pendingSocial: socialQueue.length,
      items: snapshot.items,
      time: {
        items: snapshot.timeItems || [],
        updatedAt: snapshot.timeUpdatedAt || 0,
        ageMs: snapshot.timeUpdatedAt ? Date.now() - snapshot.timeUpdatedAt : null,
        error: snapshot.timeError || null,
        refreshMs: settings.timeRefreshMs,
        filteredHoneypots: snapshot.timeFilteredHoneypots || 0,
        minKolCount: settings.minKolCount,
        kolFiltered: snapshot.kolFilteredTime || 0,
        platformFiltered: snapshot.platformFilteredTime || 0,
        platformlessFiltered: snapshot.platformlessFilteredTime || 0,
      },
    }
  }

  const JSON_HEADERS = {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  }

  async function handler(request) {
    lastClientAt = Date.now()
    const requested = new URL(request.url)
    dbg(`route: hit ${request.method} ${requested.pathname}`)
    const ack = Number(requested.searchParams.get('ack') || 0)
    if (ack && ack === focusAt) {
      focusAt = 0
      dbg('focus: acknowledged by panel')
    }
    try {
      if (!snapshot.updatedAt) await refresh()
      return new Response(JSON.stringify(payload()), { status: 200, headers: JSON_HEADERS })
    } catch (error) {
      const message = error && error.message ? error.message : String(error)
      dbg(`route: failed ${message}`)
      return new Response(JSON.stringify({ ok: false, error: message, items: [] }), {
        status: 500,
        headers: JSON_HEADERS,
      })
    }
  }

  /**
   * POST /api/bsc-hot/open { address } — open the token page in the OS browser.
   * The address is validated and the URL rebuilt here, so this endpoint can only
   * ever launch gmgn.ai token pages.
   */
  async function openHandler(request) {
    dbg(`route: hit ${request.method} ${new URL(request.url).pathname}`)
    let body
    try {
      body = await request.json()
    } catch {
      body = null
    }
    const address = typeof body?.address === 'string' ? body.address.trim() : ''
    if (!/^0x[0-9a-fA-F]{40}$/.test(address)) {
      return Response.json({ ok: false, error: 'invalid address' }, { status: 400 })
    }
    const target = body?.target === 'twitter' ? 'twitter' : 'gmgn'
    let url = `https://gmgn.ai/bsc/token/${address}`
    if (target === 'twitter') {
      // The handle comes from the Host cache, never from the request, so this
      // endpoint cannot be turned into an open redirect.
      const handle = social.get(address)?.twitter || ''
      if (!/^[A-Za-z0-9_]{1,15}$/.test(handle)) {
        return Response.json({ ok: false, error: 'no twitter for this token' }, { status: 404 })
      }
      url = `https://x.com/${handle}`
    }
    dbg(`open: ${url}`)
    const command = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'cmd' : 'xdg-open'
    const args = process.platform === 'win32' ? ['/c', 'start', '', url] : [url]
    try {
      await new Promise((resolve, reject) => {
        execFile(command, args, { timeout: 5_000 }, (error) => (error ? reject(error) : resolve()))
      })
    } catch (error) {
      return Response.json({ ok: false, error: error.message, url }, { status: 500 })
    }
    return Response.json({ ok: true, url })
  }

  // Register the same-origin data route through the Web transport's fetch service,
  // exactly the way first-party plugins do (`connection.fetch.register`).
  ctx.inject(['connection'], (scoped) => {
    scoped.effect(() => {
      const connection = scoped.get('connection')
      const register = connection?.fetch?.register?.bind(connection.fetch)
      if (typeof register !== 'function') {
        throw new Error('[dsh-bsc-hot] connection.fetch.register is unavailable')
      }
      const disposers = [
        register({ path: ROUTE_PATH, methods: ['GET'], requestBody: 'buffered', fetch: handler }),
        register({ path: OPEN_PATH, methods: ['POST'], requestBody: 'buffered', fetch: openHandler }),
      ]
      dbg(`routes: registered ${ROUTE_PATH} + ${OPEN_PATH}`)
      return () => {
        for (const dispose of disposers) dispose()
      }
    }, 'dsh-bsc-hot: route')
  })

  // Poll fast while a client is looking, and only every IDLE_REFRESH_MS otherwise,
  // so an idle sidebar does not burn GMGN quota.
  ctx.effect(() => {
    dbg('poller: start')
    let stopped = false
    let timer = 0
    // One request per second, shared by the board and the honeypot verdicts: the
    // GMGN weight budget is a single bucket, so spending it twice in one second
    // bans the IP. While verdicts are pending, alternate them with rank refreshes.
    let tickIndex = 0
    // A tick starts on a fixed cadence and skips work when the previous request is
    // still in flight: overlapping two GMGN calls is what earns the 429 ban.
    let busy = false
    const tick = async () => {
      if (stopped) return
      const startedAt = Date.now()
      const active = Date.now() - lastClientAt <= CLIENT_IDLE_MS
      const rankAge = snapshot.updatedAt ? Date.now() - snapshot.updatedAt : Number.POSITIVE_INFINITY
      const timeAge = snapshot.timeUpdatedAt ? Date.now() - snapshot.timeUpdatedAt : Number.POSITIVE_INFINITY
      // The board is the fast lane; the newest-created column only needs to keep up
      // with new pairs, so it rides a slower clock and a slimmer share of the quota.
      const rankDue = rankAge >= (active ? Math.max(settings.refreshMs - 150, 250) : IDLE_REFRESH_MS)
      const timeDue = timeAge >= (active ? settings.timeRefreshMs : IDLE_REFRESH_MS)
      const securityDue = securityQueue.length > 0 && Date.now() >= backoffUntil
      const socialDue = socialQueue.length > 0 && Date.now() >= backoffUntil
      tickIndex += 1
      // One GMGN request per tick: overlapping two calls is what earns the 429 ban.
      let action = 'wait'
      if (!busy) {
        if (securityDue && tickIndex % 4 === 0) action = 'security'
        else if (socialDue && tickIndex % 4 === 2) action = 'social'
        else if (timeDue) action = 'time'
        else if (rankDue) action = 'rank'
        else if (securityDue) action = 'security'
        else if (socialDue) action = 'social'
      }
      if (action === 'security') {
        const address = securityQueue[0]
        busy = true
        try {
          security.set(address, await fetchSecurity(address))
          const verdict = security.get(address)
          dbg(`security: ${address} honeypot=${verdict.honeypot} sell=${verdict.sellTax}`)
          securityQueue.shift()
        } catch (error) {
          // Retry later; a 429 above already set the shared backoff clock.
          securityQueue.push(securityQueue.shift())
          dbg(`security: FAILED ${address} ${error && error.message}`)
        } finally {
          busy = false
        }
      } else if (action === 'social') {
        const address = socialQueue[0]
        busy = true
        try {
          social.set(address, await fetchSocial(address))
          dbg(`social: ${address} twitter=${social.get(address)?.twitter || '-'}`)
          socialQueue.shift()
        } catch (error) {
          socialQueue.push(socialQueue.shift())
          dbg(`social: FAILED ${address} ${error && error.message}`)
        } finally {
          busy = false
        }
      } else if (action === 'time') {
        busy = true
        try {
          await refreshTime()
        } catch (error) {
          // A timer callback that rejects becomes an unhandled rejection, which the
          // DSH host treats as a fatal load failure. Swallow and keep the cadence.
          dbg(`poller: time tick failed ${error && error.message ? error.message : String(error)}`)
        } finally {
          busy = false
        }
      } else if (action === 'rank') {
        busy = true
        try {
          await refresh()
        } catch (error) {
          dbg(`poller: rank tick failed ${error && error.message ? error.message : String(error)}`)
        } finally {
          busy = false
        }
      }
      if (stopped) return
      const delay = active ? Math.max(0, settings.refreshMs - (Date.now() - startedAt)) : 1_000
      timer = setTimeout(tick, delay)
      timer.unref?.()
    }
    void tick().catch((error) => {
      dbg(`poller: tick failed ${error && error.message ? error.message : String(error)}`)
    })
    return () => {
      stopped = true
      clearTimeout(timer)
    }
  }, 'dsh-bsc-hot: poller')

  ctx.effect(() => () => {
    snapshot = {
      items: [],
      updatedAt: 0,
      error: null,
      filteredHoneypots: 0,
      pendingSecurity: 0,
      timeItems: [],
      timeUpdatedAt: 0,
      timeError: null,
      version: snapshot.version + 1,
    }
    security.clear()
    securityQueue = []
  }, 'dsh-bsc-hot: teardown')

  ctx.logger?.info?.(
    `[dsh-bsc-hot] tracking ${settings.chain} ${settings.interval} top ${settings.limit} by volume every ${settings.refreshMs}ms + newest ${settings.limit} by creation every ${settings.timeRefreshMs}ms`,
  )
}
