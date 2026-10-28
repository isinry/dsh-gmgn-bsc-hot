# dsh-bsc-hot

DSH 插件：左侧栏「BSC 热门」面板，两栏实时榜。

- **左栏**：BSC 5m 成交额 Top20
- **右栏**：GMGN 5m 热榜（`gmgn-cli market trending --chain bsc --interval 5m` 同样的结果）按**创建时间**倒序
- 每秒刷新，点击任意代币用系统浏览器打开 `https://gmgn.ai/bsc/token/{address}`
- Top3 成员变动时发系统通知（macOS / Linux / Windows），macOS 通知可点击回到面板并闪烁对应代币行
- 面板内置「设置」：API Key、GMGN Ed25519 公钥/私钥、代理都在面板里填写，缺失时自动进入引导；没有密钥对时可一键生成，生成后公私钥只读；换台电脑不用改代码

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
lib/index.js        Host 半：轮询 GMGN OpenAPI，暴露 top / open / config / config-test 路由
lib/config-store.js 设置持久化：~/.dsh/dsh-bsc-hot/settings.json（0600，原子写）
lib/client.js       Client 半：sidebar.panellist + main 面板、两栏渲染、设置视图
cordis.patch.yml    bundle patch，含全部可调配置
```

### Host

- 数据源 `GET https://openapi.gmgn.ai/v1/market/rank`，头 `X-APIKEY`，query 必带 `timestamp` 与**每次新生成**的 `client_id`（复用会 401 `AUTH_CLIENT_ID_REPLAYED`）。
- 本机访问 GMGN 需代理（`http://127.0.0.1:7890`），且 Node 的全局 `fetch` 不读 `HTTPS_PROXY`，所以实际用 `curl --proxy` 发请求。
- 限频：`/v1/market/rank` 权重 3，Free 档 5/5；全局请求门 `MIN_REQUEST_GAP_MS = 900`，单飞轮转（rank / 热榜 / security），1 req/s 长期稳定，2 req/s 立即 429 并封 IP。
- 貔貅判定用 `GET /v1/token/security`：`is_honeypot` 为真、或 `sell_tax >= 0.5` 视为貔貅；结果缓存 10 分钟，未知不等于安全。
- 通知：macOS 优先 `terminal-notifier`（可点击，点击把地址写入系统临时目录的 `dsh-bsc-hot-focus`，客户端轮询到 `focusAt` 后切面板并高亮），否则 `osascript`；Linux 用 `notify-send`；Windows 用 PowerShell Toast。
- 设置：`GET/POST /api/bsc-hot/config` 读写凭据与代理，`POST /api/bsc-hot/config/test` 用一次最小请求验证 Key，`POST /api/bsc-hot/config/generate` 在没有密钥对时生成 Ed25519 密钥对；密钥只写入 `~/.dsh/dsh-bsc-hot/settings.json`；面板通过本地路由读取当前值并默认以 `*` 掩码显示，点眼睛才展开。
- 依赖检查随 `GET /api/bsc-hot/config` 返回：Node 版本、curl、通知通道、代理，缺什么由客户端给出对应平台的安装命令。

### Client

- 入口：`sidebar.panellist`（id `dsh-bsc-hot`）+ `main` 面板。
- 取数用相对路径 `fetch('api/bsc-hot/top')`，同源 cookie 鉴权；轮询放在插件层（不在组件里），切换面板不会中断。
- GMGN logo 经 `wsrv.nl` 转成 PNG 才能用作通知附图（`gmgn.ai/external-res` 是 webp 且有 Cloudflare 挑战）。

## 安装

```bash
# 先移除旧版本（重复 install 会返回 already-installed）
# plugin_manager remove_bundle    target=dsh-bsc-hot
# plugin_manager install_bundle   target=link:<本仓库路径>
```

插件零 npm 依赖、无构建步骤，把仓库拷到任意电脑即可按上面命令安装。装好后在 GUI 左侧栏点图表图标进入面板；`lib/client.js` 改动需要刷新页面，`lib/index.js` 改动随插件重装生效。

### 换电脑 / 多平台

- 代码、配置里没有写死任何本机路径：临时文件走 `os.tmpdir()`，设置存 `$DSH_HOME`（默认 `~/.dsh`）。
- API Key / 公钥 / 私钥不写进仓库：装好后在面板「设置」里填一次即可，之后升级插件、重启 DSH 都不会丢。
- 密钥对用 `gmgn-cli config` 生成（Ed25519，写入 `~/.config/gmgn/keypair.pem` 并打印预填公钥的 API Key 创建链接）；已用它配置过的机器，面板会自动读取公钥与私钥。
- 平台差异：Node ≥ 22；代理场景需要 `curl`；桌面通知 macOS 可选装 `terminal-notifier`，Linux 需要 `notify-send`（`libnotify-bin`），Windows 用系统 Toast。设置页会自动检测并给出安装命令。

## 配置

业务参数（`refreshMs`、`timeRefreshMs`、`scanLimit`、`notify` 等）在 `cordis.patch.yml` 的 `config` 段。

凭据与代理在面板「设置」中填写，优先级由高到低：

1. `cordis.patch.yml` 里显式写的 `proxy` / `apiKey`
2. 面板设置（`~/.dsh/dsh-bsc-hot/settings.json`）
3. 环境变量或 `~/.config/gmgn/.env`（`GMGN_API_KEY` / `GMGN_PUBLIC_KEY` / `GMGN_PRIVATE_KEY`），兼容 gmgn-cli

设置页会把已保存的 API Key / 公钥 / 私钥回填到输入框，默认用 `*` 隐藏，点字段右侧的眼睛显示明文；这些值只在本机 DSH 的本地接口与页面之间传递。公私钥是**一次性写入**的：没有密钥对时字段可填写并显示「生成密钥对」按钮，生成或保存后立即变为只读，只能查看，接口也会拒绝任何覆盖请求；确需更换时删除 `~/.dsh/dsh-bsc-hot/settings.json` 中对应字段后重启。代理留空表示自动（环境变量 → 本机 7890 兜底），填 `none` 表示强制直连，填 URL 则强制走该代理。

## 已知限制

- 仅 BSC；GMGN `/v1/market/rank` 不支持按创建时间排序，右栏是本地排序结果。
- 面板视觉无法自动验证：桌面壳未开放 CDP，UI 回归靠最小 React 桩渲染 `lib/client.js`。
- 通知左侧的 App 图标无法更改（macOS 限制），只支持右侧附图；Linux/Windows 的点击聚焦尚未实现，只做展示。
- 私钥以明文保存在本机 `~/.dsh`（权限 0600），插件不会上传；只有 swap/下单/跟随钱包等签名命令才需要它，看榜与通知仅需 API Key。
