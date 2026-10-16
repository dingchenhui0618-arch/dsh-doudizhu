# Changelog

本项目遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/) 与
[语义化版本](https://semver.org/lang/zh-CN/)。

## [Unreleased]

### 修复

- **「加入」按钮从来没成功过（v0.1.2）。** 浮窗 `onJoin()` 发的是 `{ baseUrl, code, name }`，
  宿主 `becomeGuest()` 读的是 `input.url`，于是 `baseUrl` 解析成空串并直接返回
  「请填写房主地址（例如 …）」——**地址栏里填什么都不会变，座位从来没被占到**。
  同事截图上的那句红字就是它。
  为什么一直没发现：这条路由唯一的测试用的是 `{ host, port }`（宿主接受的另一种形状），
  客户端发的是第三种形状，两边各自都"对"，中间没人对；而 `检查` 恰好读 `url`，所以症状
  看着像网络不通（检查能连上、加入进不去）。
  修法：客户端改发规范字段 `{ url, code, name }`；宿主 `becomeGuest`/`probe` 同时接受
  `url` 与 `baseUrl`，已装旧版的机器不更新也不会被落下。
  补 4 个测试（总数 118）：`test/contract.test.mjs` 读 `src/client.cjs` 源码抽出每个请求体的
  顶层字段，对着 `src/ui-logic.js` 新增的 `ROUTE_BODIES` 路由表核对（扫描不到请求体即失败，
  避免空扫描通过；实测把客户端改回 `baseUrl` 就会报「加入 必须发 url 字段」）；
  `test/host.test.mjs` 把客户端真正会发的 `{ url }` 打到真实插件实例上，并覆盖
  `{ baseUrl }` 与空地址。
  实测：旧宿主半区下 `join {baseUrl}` → 409「请填写房主地址」，`join {url}` → 200
  `role=guest seat=1`，离开后回到 `idle`。
- **分享出去的是一个连不上的地址。** `lanAddresses()` 用 `Object.values(networkInterfaces())`
  丢掉了网卡名，所以分不清真网卡和虚拟网卡，把 WSL 的 `vEthernet` 地址（`172.22.0.1`）
  和真实 WLAN 地址并列成 `地址 192.168.1.50:8791 或 172.22.0.1:8791` 一起发给别人——
  一半概率抄到那个永远连不上的。本机实测同事拿到的就是这个地址。
  现在改成：保留网卡名、虚拟网卡排到最后、**只把真实网卡的地址放进分享那一行**，
  被隐藏的虚拟网卡在 UI 里用一行小字说明是哪一个（新增 `lanCandidates`、
  `rankLanCandidates`、`isVirtualIface`、`lanChips`、`hiddenLanCandidates`）。
  顺带修掉同一类陷阱：`127.0.0.1` 原来也在可复制列表里，发给别人等于让他连他自己，
  现在那一项标了「（本机）」。
- **`scripts/live-check.mjs` 的压牌分支是死代码。** 它读 `move.shape` / `move.length`，
  而 `classifyMove` 从来没返回过这两个字段（返回的是 `type` / `size` / `mainValue`），
  于是除了第一次领出，之后每一步都走 `pass`。牌局照样能结束——谁领出谁一路领完——
  所以这个缺陷一直没暴露：它证明的是传输，不是规则。
  现在改成用真的 `classifyMove` / `canBeat` / `smallestLead` 选牌，并**加了断言**
  （`beats > 0`、`passes > 0`）。修完实测一盘：**领出 7 次 / 压上家 36 次 / 不出 16 次**；
  修之前这个数字是 0 次。

### 订正

- **"新增客户端半区必须重启 DSH"是错的。** 我原先的结论建立在探测
  `/plugins/<id>/client.js` 返回 404 上，但那个探测**不可诊断**：已经正常工作的
  `dsh-holdem` 同样 404（桌面版走 shell 自己的 carrier，不是那条 HTTP 路由）。
  实测**把插件关掉再打开一次**，运行中的页面就通过 HMR 拿到新的 Loader entry 并按
  `dsh.client` 组合出客户端半区。判断"客户端半区装上没有"要看**客户端槽位树**，不是 HTTP 探测。
- 现场证据（本机桌面版，**没有重启**）：`shell.overlay` 出现
  `{registrant: "dsh-doudizhu", id: "doudizhu-mini", order: 30, active: true}`，
  排在 `holdem-mini`(20) 与 `den-mini`(40) 之间；`conversation.view` 出现
  `{id: "doudizhu", order: 30, active: true}`。

### 真 GUI 验收（M5 的视觉部分）

桌面版的窗口是 Electron、没有开远程调试端口，WebBridge 只能驱动 Chrome、够不到它；
未带会话的 `GET /` 返回 401，而认证带在 URL 上，新开标签页也进不去。绕开的办法是
**按窗口句柄截图**：`user32!PrintWindow` 只抓 DSH 这一个窗口，不需要任何输入通道，
也不截整个桌面。抓到的事实：

- **标签栏出现「斗地主」**，位置在 `审查` 与 `日报` 之间，正是注册的 `order: 30`。
- **浮窗在浮窗层里渲染成收起态药丸** `● 斗地主 · 等人`：状态圆点、圆角背景、
  `斗地主 · <阶段>` 文案都在，说明 `src/client-css.cjs` 在真实宿主里生效，
  没被浮窗层的点击穿透规则吃掉。
- **药丸文字会自己变**：两次抓图之间从 `斗地主 · 等人` 变成 `斗地主 · 未进桌`
  （对应我这边把房间关掉）。这是轮询与重渲染在真实宿主里跑着的直接证据。
- **交互在真实浮窗层里是通的**：点中药丸收起生效并落盘 `prefs.collapsed`，拖动也生效，
  说明事件处理与 `localStorage` 在这层壳里都正常。

没抓到的：展开态的像素。使用者点开过（能点中「—」把它收起，说明展开态确实渲染了），
但我没能自己截到那一张。

### 发布

- **已推到 GitHub**：<https://github.com/dingchenhui0618-arch/dsh-doudizhu>（public）。
  Release 附 `dsh-doudizhu-<version>.tgz`——`pnpm pack` 的产物，只有 8 个文件
  （`lib/index.js`、`lib/client.js`、`cordis.patch.yml`、`package.json` 与四份文档，
  不含 `src/`、测试与 `_tmp/`，40,934 字节）。这就是另外两家要装的包，
  **他们不需要克隆、不需要构建、不需要在本机装 Node**。
- 实测该地址能装：干净目录里 `pnpm add <release tarball URL>` 5.7 秒装好，
  装出来的包能真的加载出 `name = "dsh-doudizhu"`、`inject = ["webServer"]`、`apply` 函数，
  且 `exports["./client"]`、`dsh.bundle.patch`、`dsh.client` 元数据齐全。
- 推送前三步检查的结论：无 API key / token / 私钥 / `.env`；`.gitignore` 覆盖
  `node_modules/`、`_tmp/`、`*.tgz`、`.env*`、`*.pem`、`*.key`；临时产物与截图全部留在
  未提交的 `_tmp/`。**顺带清掉了一处真实的隐私泄漏**：本机局域网地址原本被写进了
  浮窗的输入占位符、错误示例和测试数据，已换成文档示例地址。

### 新增

- 规则引擎 `src/rules.js`：54 张牌堆、11 种合法牌型识别、压牌关系、
  炸弹与王炸、座位与阵营 helper。移植自 Aevi 家庭斗地主（MIT）。
- 牌局状态机 `src/game.js`：发牌（17/17/17 + 3 底牌）、顺时针叫分、
  地主定选与底牌归属、出牌/不出校验、台面收回、胜负判定、首叫位顺时针轮换。
  纯函数、状态可 JSON 序列化、随机源可注入，因此整局可从种子复现。
- 房间模型 `src/room.js`：座位与令牌（一人一签）、房间码校验、断线保座重连、
  三人到齐自动发牌、流局自动重发。`snapshotFor` 是**唯一**决定哪些牌能离开权威的地方。
- 传输 `src/net.js`：权威侧 `http` 服务（默认绑 `0.0.0.0`，端口可配）+
  follower 侧长轮询客户端。零运行时依赖。
- **DSH 插件 host 半区 `src/host.js`**：`export name / inject = ['webServer'] / apply(ctx, config)`，
  在 DSH 自己的回环 webServer 上挂 `/dsh-doudizhu` prefix 路由。两种角色——
  开房（绑定局域网端口、本地玩家坐 0 号位、令牌不出内存）与加入（长轮询 follower）。
- 构建脚本 `scripts/build.mjs`（esbuild 打包 `src/host.js` → `lib/index.js`，并校验插件
  导出、`webServer` 注入、客户端 bundle 可解析），`scripts/wrap-client.mjs` 为 M5 的
  客户端半区备好。`prepack` 自动 build。
- `scripts/live-check.mjs`：对着**运行中的 DSH** 做实机验收——开房、经局域网地址入座、
  打完一盘、开下一局、关房，全程做防泄牌扫描。
- 确定性随机源 `src/rng.js`：`seedRandom` / `randomCode`。
- **客户端半区 `src/client.cjs` + 展示逻辑 `src/ui-logic.js` + 样式 `src/client-css.cjs`**：
  浮窗（`shell.overlay`，可拖动、可收起成药丸、位置与折叠状态存 `localStorage`）
  与会话标签页（`conversation.view`）两个入口，一份代码两种角色通用。
  排队、叫分、选牌出牌、不出、复盘、下一局都在浮窗里完成；
  手牌按牌力排开、按钮选到合法牌型才可点、本地即时反馈与权威判定分开。
  样式全部走宿主主题令牌，深浅色跟随宿主。
- 展示逻辑单独成模块并有单测：牌面文案与配色、手牌排序、选牌切换、
  「能不能出」的原因、叫分按钮可用性、各阶段按钮组合、状态行、出牌历史、
  事件日志、昵称/位置偏好清洗、窗口位置夹取、地址规整。
- `test/client-half.test.mjs`：在干净 V8 上下文里加载**真实的 `lib/client.js`**，
  用最小 React 与最小 DOM 驱动真实房间快照，覆盖槽位注册、渲染与按钮交互。
- `test/client-bundling.test.mjs`：浏览器半区的依赖守卫。
- `scripts/browser-harness.mjs`：桩宿主。在真实浏览器里用真实 React 加载真实 `lib/client.js`，
  把 `/dsh-doudizhu/*` 代理到运行中的插件，用来做真机视觉验收（唯一 stub 的是 DSH 自己的槽位外壳）。
- 单测 112 个（规则 18、牌局 18、房间 17、传输 11、插件 host 11、
  展示逻辑 21、客户端依赖 4、客户端渲染 12）。

### 安全

- **防泄牌有断言，不是靠约定**：每一步都快照里不得出现「别人的、尚未公开的」牌面 id。
  房间层、HTTP 层、插件层各查一遍；另有一个独立 OS 进程再查一遍。
  公开的牌（打出去的牌、地主拿走后的 3 张底牌）不算泄露；一局结束后全明牌是刻意的
  复盘行为，由 `secretsRevealed` 标记并有测试钉住它只在结束后为真。
- 座位令牌只在 `x-ddz-token` 请求头里传，不落 query；无令牌 → 401。
- 权威接口请求体上限 64 KiB；非法 JSON → 400；未知路由 → 404。
- 关闭权威会唤醒所有挂起的长轮询并释放端口，不等 keep-alive 超时。
- 插件本地路由上所有改状态的操作要过三道：本地令牌
  （`x-dsh-doudizhu-token`，首次 GET 下发）、`Origin` / `Referer` 同源、
  `sec-fetch-site` 非跨站。非 http(s) 来源（桌面壳的 `dsh-app://`）按「无信息」处理，
  避免误伤。
- 插件层请求体超限回 413 并 `connection: close`——不是直接掐 socket，
  否则客户端只会看到 `fetch failed` 而拿不到原因。
- 权威端口**只在开房期间监听**；散局、卸载、切换到另一种角色都会关掉它。
- **实测边界：DSH 的 Web 认证不覆盖插件 prefix 路由。** 未带会话时 `/api/boot` 返回 401，
  而 `/dsh-doudizhu/state` 返回 200。因此三道校验是改状态接口唯一的防线；
  响应不带 CORS 头，别的网页读不到响应体，但**本机任何进程都能读到你自己的手牌**。
  攻击面未扩大到局域网（路由在回环上，权威端口另开且只承载牌局端点）。
- **不把 DSH 自己的 webServer 开到 `0.0.0.0`**：那后面是完整的 agent API，
  局域网里任何人都能驱动宿主的会话。游戏走独立端口，只开牌局端点。

### 修复

- **小王 id 与黑桃 J 撞号**：`SJ` 既是「小王」又是黑桃 J，牌堆会少一张（53 张），
  `10JQKA` 也识别不出来。已固定为上游的 `LJ` / `BJ` 并加了回归测试。
- **大厅阶段显示占位名**：`snapshotFor` 的 `you.name` / `seats[].name` 读的是
  `createGame` 时的占位名，只有发牌时才同步真实座位名，所以刚开房会显示「玩家一」。
  显示名改为以座位名册为准（有回归测试）。
- **一次失败的尝试会拆掉当前牌局**：`becomeHost` / `becomeGuest` 原本先 `shutdown()`
  再干活，于是一次房间码填错就把你从正在打的桌上踢下线。改为先把能失败的事做完
  再切换角色。
- **以客人身份重连同名房间会多占一个位子**：会拿新令牌占第二个座位，旧座位变成幽灵。
  改为复用原令牌重连。
- **Windows 上端口被占用不报错**：`SO_REUSEADDR` 的语义让第二次 bind 到同一端口成功，
  于是两个权威共用一个端口、连接被瓜分。改为监听前先探一次端口，占用则明确拒绝。
- **409 响应却带 `ok: true`**：`{ ...result, ...localState() }` 里 `localState()` 的
  `ok: true` 把失败结果覆盖了。`localState()` 不再携带 `ok`。
- **纯规则模块偷偷依赖 Node**：`src/rules.js` 为了给 `shuffleDeck` 一个默认随机源而
  `import 'node:crypto'`。这只在 host 半区消费它时看不出来，浮窗一开始引用规则就炸——
  esbuild 报 `Could not resolve "node:crypto"`；若当时把它标成 external，
  浏览器会在加载插件时抛错。现在 crypto 留在本就 Node-only 的 `room.js`
  （`createRoom` 的默认 rng），`rules.js` 成为真正无依赖的纯模块，
  并有 `test/client-bundling.test.mjs` 守着这条边界。
- **结束后不显示别人的牌**：权威在一局结束时故意公开三家手牌（`secretsRevealed`），
  但浮窗只画了自己的手牌，等于把复盘数据发了却不用。现在结束时列出另外两家的手牌。
- **`prefsFrom` 把 `null` 当成坐标 0**（真实浏览器里发现）：`Number(null)` 是 `0` 而不是 `NaN`，
  于是 `{"x":null,"y":null}` 一旦落盘，下次加载浮窗就跳进左上角。首次进入看不出问题
  （存储为空时 `Number(undefined)` 才是 NaN），所以只在第二次加载暴露。现在只接受真正的 number。
- **浮窗按固定高度定位，20 张牌时底部被顶出屏幕**（真实浏览器里发现）：窗口高度随内容变化、
  样式表上限 78vh，而 `clampPosition` 用的是常量 `MINI_H`，默认位置就按 468px 算，
  实际 651px 的窗口因此挂到屏幕外。现在先 `getBoundingClientRect()` 量真实盒子再夹取。
