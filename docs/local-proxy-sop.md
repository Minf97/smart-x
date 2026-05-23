# 本地代理排查 SOP

## 适用场景

当浏览器可以访问线上服务，但终端、Node、Electron 或 CLI 请求一直超时，可以按本文排查。

典型表现：

- 浏览器打开 `https://example.com/health` 正常。
- `curl https://example.com/health` 超时。
- Node `fetch()` 超时。
- Electron 主进程请求远程 API 超时。
- 同一个 URL 在浏览器和本地程序里表现不一致。

## 本质

浏览器、终端、Node 和 Electron 不一定走同一条网络路径。

浏览器通常会读取系统代理、浏览器插件代理、PAC 规则或代理软件的增强模式。终端里的 `curl`、Node 的 `fetch()`、Electron 主进程则通常只看自己的进程环境变量，默认不会自动继承浏览器的代理行为。

所以“浏览器能打开”只能证明浏览器这条链路是通的，不能证明本地 Node/Electron 也能直连。

这类问题通常不是业务接口坏了，也不是 base URL 拼错了，而是下面几类差异：

- 浏览器走代理，终端没走代理。
- 浏览器远端解析 DNS，终端本地解析 DNS。
- 系统代理已配置，但当前 shell 没有 `HTTP_PROXY` / `HTTPS_PROXY`。
- Node 版本支持代理环境变量，但需要显式打开。
- Electron 主进程和渲染进程使用的网络栈不同。

## 快速判断

先确认线上服务是否真的可用：

```bash
curl -sS -i --connect-timeout 8 --max-time 12 "$BASE_URL/health"
```

如果浏览器能访问，但上面命令超时，继续检查本机代理。

查看 macOS 系统代理：

```bash
scutil --proxy
```

重点看这些字段：

```text
HTTPEnable : 1
HTTPProxy : 127.0.0.1
HTTPPort : 7892
HTTPSEnable : 1
HTTPSProxy : 127.0.0.1
HTTPSPort : 7892
SOCKSEnable : 1
SOCKSProxy : 127.0.0.1
SOCKSPort : 7892
```

再看终端进程有没有代理环境变量：

```bash
env | rg -i 'proxy|http_proxy|https_proxy|all_proxy|no_proxy'
```

如果系统代理存在，但终端环境变量为空，就说明终端请求大概率没有走代理。

## 对比验证

不走代理测试：

```bash
curl -sS -i --connect-timeout 8 --max-time 12 "$BASE_URL/health"
```

显式走 HTTP 代理测试：

```bash
curl -x http://127.0.0.1:7892 \
  -sS -i --connect-timeout 10 --max-time 20 \
  "$BASE_URL/health"
```

显式走 SOCKS 代理并远端解析 DNS：

```bash
curl -x socks5h://127.0.0.1:7892 \
  -sS -i --connect-timeout 10 --max-time 20 \
  "$BASE_URL/health"
```

如果显式代理能返回 `200`，不走代理超时，问题就可以定性为本地代理链路问题。

## DNS 线索

查看本地 DNS 解析：

```bash
dig +short smart-x-theta.vercel.app
```

如果解析结果看起来异常，或者直连 IP 超时，但浏览器正常，通常说明浏览器通过代理做了远端解析，而终端在本地解析后直接连接。

这时优先使用 `socks5h://` 或让 Node 走代理，避免本地 DNS 解析影响请求。

## Node 修复

Node 的 `fetch()` 不一定只靠 `HTTP_PROXY` / `HTTPS_PROXY` 就生效。当前项目验证过，需要同时打开：

```bash
NODE_USE_ENV_PROXY=1
```

临时测试：

```bash
NODE_USE_ENV_PROXY=1 \
HTTPS_PROXY=http://127.0.0.1:7892 \
HTTP_PROXY=http://127.0.0.1:7892 \
node -e 'fetch("https://smart-x-theta.vercel.app/health", { signal: AbortSignal.timeout(8000) }).then(async r => console.log(r.status, await r.text())).catch(console.error)'
```

预期输出：

```text
200 {"databaseConfigured":true,"ok":true}
```

## Electron 启动修复

开发环境启动 Electron 时，把代理变量加到启动命令前：

```bash
NODE_USE_ENV_PROXY=1 \
HTTPS_PROXY=http://127.0.0.1:7892 \
HTTP_PROXY=http://127.0.0.1:7892 \
npm start
```

如果代理端口不是 `7892`，以 `scutil --proxy` 输出为准。

如果使用代理软件，确认本地 HTTP/SOCKS 端口真的在监听：

```bash
lsof -nP -iTCP:7892 -sTCP:LISTEN
```

## 项目链路验证

本项目可以用内置脚本验证 Remote Backend 全链路：

```bash
NODE_USE_ENV_PROXY=1 \
HTTPS_PROXY=http://127.0.0.1:7892 \
HTTP_PROXY=http://127.0.0.1:7892 \
node scripts/verify-user-project-webhook.mjs \
  --base-url https://smart-x-theta.vercel.app \
  --ack
```

通过时会看到：

```text
Webhook verification passed.
```

这代表创建项目、发送 webhook、拉取报警、同步回执都通了。

## Vercel 配置检查

如果本地代理链路已通，但接口仍异常，再检查 Vercel：

- Production Deployment 是否为 `Ready`。
- `Root Directory` 是否为 `backend`。
- Framework 是否为 `Hono`。
- `DATABASE_URL` 是否存在。
- `BACKEND_BASE_URL` 是否设置为线上稳定域名。

推荐设置：

```text
BACKEND_BASE_URL=https://smart-x-theta.vercel.app
```

`BACKEND_BASE_URL` 不决定本地能不能连上 Vercel，但会影响新建项目时返回的 webhook URL。

## 判断口径

排查时不要只问“这个 URL 能不能打开”，要拆成四条链路：

- 浏览器能不能打开。
- `curl` 不走代理能不能打开。
- `curl` 显式走代理能不能打开。
- Node/Electron 带代理环境变量能不能打开。

只有这四条链路分开看，才能判断问题在 Vercel、DNS、代理软件、终端环境，还是 Electron 主进程。

## 最短结论

如果浏览器能通、终端不通，先怀疑代理和 DNS，不要先改业务代码。

本项目当前推荐本地启动方式：

```bash
NODE_USE_ENV_PROXY=1 \
HTTPS_PROXY=http://127.0.0.1:7892 \
HTTP_PROXY=http://127.0.0.1:7892 \
npm start
```
