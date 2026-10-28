# dsh-bsc-hot

DSH 插件：左侧栏「BSC 热门」面板，两栏实时榜。

- **左栏**：BSC 5m 成交额 Top20
- **右栏**：GMGN 5m 热榜（`gmgn-cli market trending --chain bsc --interval 5m` 同样的结果）按**创建时间**倒序
- 每秒刷新，点击任意代币用系统浏览器打开 `https://gmgn.ai/bsc/token/{address}`
- Top3 成员变动时发 macOS 通知，点击通知回到面板并闪烁对应代币行

## 过滤规则（两栏共用）

| 规则 | 配置 | 默认 |
| --- | --- | --- |
| 市值上限 | `maxMarketCapUsd` | 5,000,000 |
| 至少 N 个 KOL 持仓 | `minKolCount` | 1 |
| 排除发行平台 | `excludePlatforms` | `['pancake']` |
| 无发行平台剔除 | `requirePlatform` | `true` |
| 貔貅剔除 | `filterHoneypot` | `true` |

## 结构

```
lib/index.js     Host 半：轮询 GMGN OpenAPI，暴露 /api/bsc-hot/top 与 /api/bsc-hot/open
lib/client.js    Client 半：注册 sidebar.panellist + main 面板，两栏渲染与轮询
cordis.patch.yml bundle patch，含全部可调配置
```

### Host

- 数据源 `GET https://openapi.gmgn.ai/v1/market/rank`，头 `X-APIKEY`，query 必带 `timestamp` 与**每次新生成**的 `client_id`（复用会 401 `AUTH_CLIENT_ID_REPLAYED`）。
- 本机访问 GMGN 需代理（`http://127.0.0.1:7890`），且 Node 的全局 `fetch` 不读 `HTTPS_PROXY`，所以实际用 `curl --proxy` 发请求。
- 限频：`/v1/market/rank` 权重 3，Free 档 5/5；全局请求门 `MIN_REQUEST_GAP_MS = 900`，单飞轮转（rank / 热榜 / security），1 req/s 长期稳定，2 req/s 立即 429 并封 IP。
- 貔貅判定用 `GET /v1/token/security`：`is_honeypot` 为真、或 `sell_tax >= 0.5` 视为貔貅；结果缓存 10 分钟，未知不等于安全。
- 通知：`terminal-notifier`（`~/Applications/terminal-notifier.app`）发按钮可点的横幅，点击把地址写入 `/tmp/dsh-bsc-hot-focus`，客户端轮询到 `focusAt` 后切面板并高亮。

### Client

- 入口：`sidebar.panellist`（id `dsh-bsc-hot`）+ `main` 面板。
- 取数用相对路径 `fetch('api/bsc-hot/top')`，同源 cookie 鉴权；轮询放在插件层（不在组件里），切换面板不会中断。
- GMGN logo 经 `wsrv.nl` 转成 PNG 才能用作通知附图（`gmgn.ai/external-res` 是 webp 且有 Cloudflare 挑战）。

## 安装

```bash
# 先移除旧版本（重复 install 会返回 already-installed）
# plugin_manager remove_bundle    target=dsh-bsc-hot
# plugin_manager install_bundle   target=link:/Users/sinry/Work/GMGNAgent
```

装好后在 GUI 左侧栏点图表图标进入面板；`lib/client.js` 改动需要刷新页面，`lib/index.js` 改动随插件重装生效。

## 配置

全部在 `cordis.patch.yml` 的 `config` 段，含 `refreshMs`、`timeRefreshMs`、`scanLimit`、`proxy`、`apiKey`、`notify`、`debug`/`debugFile` 等。API Key 不写入仓库，运行时从 `GMGN_API_KEY` 或 `~/.config/gmgn/.env` 读取。

## 已知限制

- 仅 BSC；GMGN `/v1/market/rank` 不支持按创建时间排序，右栏是本地排序结果。
- 面板视觉无法自动验证：桌面壳未开放 CDP，UI 回归靠最小 React 桩渲染 `lib/client.js`。
- 通知左侧的 App 图标无法更改（macOS 限制），只支持右侧附图。
