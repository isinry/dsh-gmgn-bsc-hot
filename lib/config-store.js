/**
 * dsh-bsc-hot — local settings store.
 *
 * The panel lets the user paste a GMGN API key, a public key and a private key
 * without editing any YAML. Those values live in a small JSON file under the
 * harness home (`$DSH_HOME` or `~/.dsh`), created with owner-only permissions and
 * replaced atomically so an interrupted save cannot leave a truncated file.
 *
 * Precedence is handled by the Host: this store wins over `cordis.patch.yml`
 * values, which in turn win over environment variables and GMGN's own
 * `~/.config/gmgn/.env`.
 */
import { chmodSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'

/** Fields the settings panel may write. Order is stable for diffs and docs. */
export const FIELDS = ['apiKey', 'publicKey', 'privateKey', 'proxy']

/** Harness home, matching DSH's own resolution (`$DSH_HOME` then `~/.dsh`). */
export function harnessHome() {
  const fromEnv = process.env.DSH_HOME
  return fromEnv && fromEnv.trim() ? fromEnv.trim() : join(homedir(), '.dsh')
}

/** Absolute path of the settings file. */
export function storePath() {
  return join(harnessHome(), 'dsh-bsc-hot', 'settings.json')
}

/** Read the store, returning `{}` for a missing, unreadable or corrupt file. */
export function readSettings() {
  try {
    const raw = readFileSync(storePath(), 'utf8')
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    const out = {}
    for (const field of FIELDS) {
      const value = parsed[field]
      if (typeof value === 'string' && value.trim()) out[field] = value
    }
    return out
  } catch {
    return {}
  }
}

/**
 * Merge `patch` into the store and write it back atomically.
 * An empty string removes a field; an absent field keeps the stored value.
 * @returns the merged settings
 */
export function writeSettings(patch) {
  const current = readSettings()
  const next = { ...current }
  for (const field of FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(patch, field)) continue
    const value = String(patch[field] ?? '').trim()
    if (value) next[field] = value
    else delete next[field]
  }
  const file = storePath()
  mkdirSync(dirname(file), { recursive: true })
  const temporary = `${file}.${process.pid}.tmp`
  writeFileSync(temporary, `${JSON.stringify(next, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 })
  try {
    chmodSync(temporary, 0o600)
  } catch {
    // Windows has no POSIX mode bits; the file still lives under the user's home.
  }
  renameSync(temporary, file)
  try {
    chmodSync(file, 0o600)
  } catch {}
  return next
}

/** Whether the store currently holds at least one value. */
export function storeExists() {
  return existsSync(storePath())
}
