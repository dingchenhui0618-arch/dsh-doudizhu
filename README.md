# dsh-doudizhu

DeepSeek Harness 的插件：**三人局域网斗地主**。三个人各自在自己那台 DSH 里用浮窗打牌，
其中一台当权威服务，另外两台连过来。

> **当前进度：规则引擎、牌局状态机、权威房间服务与传输、DSH 插件两个半区（host + 浮窗/标签页
> 客户端）都已完成并有测试覆盖；三机实机验收与开源推送尚未开始。**
> 具体的完成边界见「进度」一节，不要按 README 的愿景当成已实现的能力。

## 规则口径

一副 54 张牌（52 张 + 大小王），花色不分大小。
大小顺序：**大王 > 小王 > 2 > A > K > Q > J > 10 > 9 > 8 > 7 > 6 > 5 > 4 > 3**。

| 环节 | 口径 |
| --- | --- |
| 发牌 | 随机洗牌，三家各 17 张，留 3 张底牌 |
| 叫分 | 从首叫位起顺时针，依次叫 1 / 2 / 3 分或「不叫」；**必须比当前最高分更高** |
| 定地主 | 叫到 3 分立刻成地主；否则三家各叫一次，最高分者当地主并拿走 3 张底牌（20 张） |
| 流局 | 三家都不叫则重新发牌，**首叫位不变** |
| 轮换 | 每局结束后，首叫位顺时针轮换一位 |
| 出牌 | 地主先出，之后顺时针；同牌型同长度比点数；炸弹压普通牌型，王炸压一切 |
| 不出 | 只在跟牌时可以「不出」；先手必须出牌 |
| 收回台面 | 连续两家不出，台面清空，出牌权回到最后出牌的那家，可自由选牌型 |
| 胜负 | 地主先出完 → 地主赢；任一农民先出完 → 农民赢 |

### 你给的规则里没写、由本项目钉死的边界

这些都在 `test/rules.test.mjs` 里标了 `PINNED`，改行为前先改测试：

- `10JQKA` **合法**；`JQKA2`、`A2345`、任何带 2 或王的顺子/连对/飞机**非法**。
- 顺子 ≥5 张、连对 ≥3 对、飞机 ≥2 个连续三张。
- 飞机的核心三张必须来自**正好三张**的点数；手里四张同点不能拆出核心。
- 飞机的翅膀数量必须等于核心组数（三个单张，或三个对子）。
- 飞机带单时，翅膀里出现一对也算「两个单张」。
- 四带二（四张 + 两张单牌 / 两对）**不是炸弹**，压不了炸弹，也不能压普通牌型。
- 王炸最大且唯一，没有任何牌能压王炸。
- 两张王的 id 是 `LJ` / `BJ`：`SJ` 是黑桃 J，复用它会让牌堆少一张（有回归测试）。

## 进度

| 阶段 | 状态 | 验收证据 |
| --- | --- | --- |
| M1 规则引擎 `src/rules.js` | ✅ 完成 | 18 个用例 |
| M2 牌局状态机 `src/game.js` | ✅ 完成 | 18 个用例，含固定种子整局重放 |
| M3 权威服务 + 传输 `src/room.js` `src/net.js` | ✅ 完成 | 27 个用例：真 TCP/HTTP、长轮询、**全程防泄牌断言**、跨 OS 进程入座、局域网地址可达 |
| M4 DSH 插件接线 `src/host.js` | ✅ 完成 | 11 个用例 + `scripts/live-check.mjs` 在**运行中的 DSH 里**开房、经这台机器的局域网地址入座、打完一盘（60–70 步，含 36 次真的压牌） |
| M5 浮窗 UI `src/client.cjs` | ✅ 完成 | 37 个用例：21 个展示逻辑 + 4 个浏览器半区依赖守卫 + 12 个**跑真实 `lib/client.js`** 的渲染/交互用例；真实 Chrome 走过开房→入座→叫分定地主；真 GUI 里两个槽位 `active`、标签页与浮窗药丸已抓图 |
| M6 三机实机验收 | ⬜ 未开始 | 步骤见下面「三机实机怎么跑」；本机的传输路径已通，缺的是另外两台真机器 |
| M7 开源推送 | ⬜ 未开始 | — |

当前 `node --test "test/*.test.mjs"`：**112 个用例全部通过**（约 2.9 秒）。
规则 18、牌局 18、房间 17、传输 11、插件 host 11、展示逻辑 21、客户端依赖 4、客户端渲染 12。

### 还没验证的（别当成已经好了）

- **浮窗的展开态我没有抓到像素。** 下面「在真 GUI 里看到的」有收起态药丸的抓图、
  标签页的抓图，以及药丸文字随轮询变化的证据；展开态是使用者点开过的
  （他能点中「—」把它收起，说明展开态确实渲染出来了），但我没能自己截到那一张。
- **三机实机、防火墙、以及"另外两家真的在别的电脑上"**：一步都没跑，M6 的事。
  目前 follower 路径是用 Node 客户端经本机局域网地址验证的，那是真实传输但不是真实浏览器。
- 深浅色主题下的对比度只在深色下看过。

### 让它出现在 GUI 里（实测：不用重启）

**这一节我上一轮写错过，在这里纠正。** 我原先说"`dsh.client` 元数据在启动时读一次，
所以必须重启 DSH 才会扫描到客户端半区"，依据是探测 `/plugins/<id>/client.js` 返回 404。
那个探测**不可诊断**：已经正常工作的 `dsh-holdem` 同样 404（桌面版走的是 shell 自己的
carrier，不是那条 HTTP 路由）。**结论是错的。**

真实情况：**把插件关掉再打开一次就够了**，运行中的页面会通过 HMR 拿到新的 Loader entry，
并按 `dsh.client` 组合出客户端半区（官方文档 `dsh-client-modules` 的原话：
*"Enabling an ordinary plugin adds its Loader entry … Re-enabling loads one instance with its styles"*）。
本机桌面版实测：

```
plugin_manager set_plugin  include:dsh-doudizhu  enabled=false   -> application: applied
plugin_manager set_plugin  include:dsh-doudizhu  enabled=true    -> application: applied
```

之后**没有重启**，客户端槽位树里立刻出现上面那两个 `active` 的占用者。

所以判断"客户端半区到底装上没有"，要看**客户端槽位树**（`cordis_inspect_query`
→ `client/Slots.listSubTree`，root 填 `shell.overlay` 或 `conversation.view`），
不要看 HTTP 探测。

### 在真 GUI 里看到的

桌面版的窗口是 Electron，没有开远程调试端口，Kimi WebBridge 只能驱动 Chrome、够不到它；
未带会话的 `GET /` 返回 401，而认证是**带在 URL 上**的，所以新开标签页也进不去。
但**抓它自己的窗口像素不需要输入通道**：用 `user32!PrintWindow` 按窗口句柄截图即可
（只抓 DSH 这一个窗口，不截整个桌面）。看到的东西：

- **标签栏里出现了「斗地主」**，位置在 `审查` 与 `日报` 之间——正是注册的 `order: 30`。
- **浮窗在浮窗层里渲染成收起态药丸**：`● 斗地主 · 等人`，有状态圆点、圆角背景、
  文字是 `斗地主 · <阶段>`。说明 `src/client-css.cjs` 的样式在真实宿主里生效，
  没有被浮窗层的点击穿透规则吃掉。
- **药丸文字会自己变**：两次抓图之间从 `斗地主 · 等人` 变成 `斗地主 · 未进桌`，
  对应我这边把房间关掉。这是**轮询与重渲染在真实宿主里跑着**的直接证据
  （收起态轮询间隔 2.6 秒，所以会看到一点延迟）。
- **交互在真实浮窗层里是通的**：使用者点中药丸把它收起（`prefs.collapsed = true` 落盘），
  拖动也生效。也就是说 `pointer-events: auto` 这个必需的重启用在真壳里有效。

抓图不随仓库发布：它拍的是整窗，含本机会话内容（对话记录、其他插件的名字）。
图留在被忽略的 `_tmp/` 下，所以上面只有文字描述，没有图片链接。

### 真实浏览器里验过什么

`scripts/browser-harness.mjs` 是个**桩宿主**：它在真实 Chrome 里用真实 React UMD 加载**真实的
`lib/client.js`**，并把 `/dsh-doudizhu/*` 代理到**真实运行中的插件**。唯一 stub 掉的是 DSH 自己的
槽位外壳，其余全是真的。用它（经 Kimi WebBridge 驱动你的 Chrome）走完的过程：

1. 两个槽位注册成功，浮窗与标签页同时渲染出大厅：`🃏 斗地主 · 未进桌`、`我开房/我加入`、
   昵称、端口、`开房`，标签页那份还有 `收起浮窗`。
2. 真点 `开房` → **`POST /dsh-doudizhu/host -> 200`**，房间码、局域网地址、
   分享行、三人座位、事件日志 `我 入座` 全部渲染出来。
3. 另外两家经局域网端口真的入座 → 自动发牌，界面显示三家各 17 张、`行动中`、
   `轮到你叫分`、不叫/1/2/3 分四个按钮、`叫分` 阶段徽标。
4. 真点 `3 分` → 变成 `地主`、**20 张**、`你先手，必须出牌`、底牌 `K♥ 9♥ 3♠` 亮出、
   `出牌`/`不出` 并排且显示 `先选牌`；浮窗 651px 高，`left:1566px; top:286px`，整窗在屏幕内。

这一步抓到了两个真 bug，都是单测和 Node 渲染测不出来的：

- **`prefsFrom` 把 `null` 当成了坐标 0。** `Number(null)` 是 `0` 而不是 `NaN`，所以一旦
  `{"x":null,"y":null}` 被写进 `localStorage`，再刷新浮窗就跳到左上角。首次进入（存储为空，
  `Number(undefined)` 才是 NaN）看着正常，所以只在第二次加载才暴露。
- **浮窗按固定高度定位，20 张牌时底部被顶出屏幕。** 窗口真实高度随内容变化（样式表上限 78vh），
  而 `clampPosition` 用的是常量 `MINI_H`。现在先量真实盒子再夹取。

### 已验的安全性质

防泄牌不是靠约定，是靠断言。每个用例在**每一手之后**把三家收到的快照里所有字符串收集成集合，
再断言其中不含任何「此刻属于别人、且尚未公开」的牌面 id：

- `test/room.test.mjs` —— 一盘完整对局的每一步都查一遍（含叫分、炸弹、王炸、过牌、胜负）。
- `test/net.test.mjs` —— 三个 follower 走**真实 HTTP** 打完一盘，每一步都查一遍，
  并且要求每家的快照 `seq` 与权威一致（既查泄露，也查同步）。
- `test/fixtures/follower-probe.mjs` —— 独立 **OS 进程**入座后，`otherHands` 必须是 `[null, null]`。

公开的牌（打出去的牌、地主拿走后的 3 张底牌）不算泄露；一局结束后全明牌是**刻意**的复盘行为，
由 `secretsRevealed` 标记，且有测试钉住它只在结束后为真。

## 架构

```
机器 A（房主 / authority）            机器 B、C（客人 / follower）
┌──────────────────────┐            ┌──────────────────────┐
│ DSH + 本插件          │            │ DSH + 本插件          │
│  浮窗 shell.overlay   │            │  浮窗 shell.overlay   │
│        │ 回环 HTTP     │            │        │ 回环 HTTP     │
│  host 半区 authority  │◄───────────┤  host 半区 follower   │
│  牌堆 / 判定 / 座位过滤 │  长轮询 LAN │  转发 + 本地快照      │
│  0.0.0.0:<port>       │            │                      │
└──────────────────────┘            └──────────────────────┘
```

- **浮窗只跟自己那台机器的 host 半区说话**：一份客户端代码，两种角色通用；浏览器不跨机直连。
- **传输用零依赖 HTTP 长轮询**，不引入 WebSocket。回合制 + 不限时，延迟足够。
- 权威服务**按座位过滤快照**：每个人只拿自己的手牌，别人只给张数。
- 权威端口**只在开房期间监听**，散局即关。

### host 半区的本地接口（M4 已实现）

浮窗调的是**本机 DSH webServer** 上的 `prefix` 路由，不是局域网端口：

| 方法 | 路径 | 作用 |
| --- | --- | --- |
| GET | `/dsh-doudizhu/state` | 当前角色、房间码/地址、**本座视角的快照**；响应头带本地令牌 |
| POST | `/dsh-doudizhu/host` | 开房并坐 0 号位，返回房间码与所有局域网地址 |
| POST | `/dsh-doudizhu/join` | 以客人身份连到某台权威（`host` + `port` + `code`） |
| POST | `/dsh-doudizhu/probe` | 只探一下某个地址是不是斗地主房间，不入座 |
| POST | `/dsh-doudizhu/act` | 转发一个动作（`start` / `next` / `bid` / `play` / `pass`） |
| POST | `/dsh-doudizhu/leave` | 散局：关掉权威端口并回到 idle |

这些 POST 都要求 `x-dsh-doudizhu-token`（首次 GET 下发），并校验 `Origin` /
`Referer` / `sec-fetch-site`：跨站页面既设不了自定义头，也藏不住自己的来源。
`dsh-app://` 这类非 http(s) 来源被当作「无信息」而不是拒绝，否则桌面壳会被误伤。

两次失败的尝试不会拆掉你已经在打的牌局：开房先绑定端口再关旧房，
加入先入座成功再切换角色。**同名重进会复用原座位令牌**，不会多占一个位子。

### 明确不做

**不把 DSH 自己的 webServer 开到 `0.0.0.0`。** 那个端口后面是完整的 agent API，
局域网里任何人都能驱动宿主的会话。游戏走独立端口，只开牌局端点。

### 一个实测到的边界

DSH 自己的 Web 认证**不覆盖插件用 `ctx.webServer.register` 挂的 prefix 路由**：
本机实测 `/api/boot` 未带会话时返回 401，而 `/dsh-doudizhu/state` 返回 200。
所以这个插件的三道校验（本地令牌、同源、`sec-fetch-site`）不是锦上添花，
而是改状态接口**唯一**的防线。响应不带 CORS 头，因此别的网页读不到响应体；
但要记住：**任何本机进程都能读到 `GET /dsh-doudizhu/state` 里你自己的手牌。**

这没有把攻击面扩大到局域网——路由挂在回环 webServer 上，权威端口另开且只承载牌局端点。
但它是一条值得记住的事实，将来 DSH 改了 webServer 认证覆盖面时应当重新核对。

本插件的 `prefix` 路由挂在 DSH 自己的回环 webServer 上，所以它天然不出局域网；
即便如此，所有改状态的操作仍要过上面那三道校验。

## 浮窗与标签页（M5 已实现）

客户端半区只注册**两个**入口，一份代码两种角色通用：

| 槽位 | id | 位置 |
| --- | --- | --- |
| `shell.overlay` | `doudizhu-mini` | 浮窗：可拖动、双击收起成悬浮药丸、位置与折叠状态存 `localStorage` |
| `conversation.view` | `doudizhu` | 会话标签页「斗地主」：牌桌 + 记录并排，适合摆开看 |

浮窗里有「牌桌 / 记录」两个面：牌桌是座位、台面、手牌与操作按钮；
记录是权威写的中文事件日志（`甲 入座`、`丙 入座，开局`）加**逐手出牌历史**。

- 手牌按牌力从大到小排开，♥♦ 红、大小王单独着色；点一下选中抬起，再点取消。
- 「出牌」按钮**选到合法牌型才可点**，旁边直接写出你选的是什么（`顺子 · 5 张`）或
  `压不过上家的对子`。这是本地即时反馈，权威仍然会自己再判一次。
- 「不出」按钮始终在位，靠置灰表达能不能点——按钮位置不随回合跳动。
- 浏览器半区**只调本机回环路由** `/dsh-doudizhu/*`，从不直连权威端口，
  所以三台机器跑的是同一份客户端代码，浏览器也不需要跨域访问对端。
- 样式全部走宿主主题令牌（`--dsw-alias-*`），深浅色随宿主切换。

按 `lib/client.js` 的构建产物做单元测试：`test/client-half.test.mjs` 在一个干净的 V8
上下文里加载真实 bundle，配一个最小 React 与最小 DOM，**驱动真实房间产生的快照**，
断言槽位注册、渲染结果与按钮交互（选牌后「出牌」由灰变亮、再点又变灰）。

## 装进自己的 DSH（另外两家要做的）

**不用克隆、不用构建、不用在这台机器上装 Node。** 装的是一份预构建的包，`lib/` 已经在仓库里
（所以这个仓库的 `.gitignore` 故意**不**忽略 `lib/`）。把这一行地址交给 DSH 的插件管理器：

```
https://github.com/dingchenhui0618-arch/dsh-doudizhu/releases/download/v0.1.1/dsh-doudizhu-0.1.1.tgz
```

三条路都通向同一个动作，挑顺手的：

- **插件市场**（本机装的是 `dshmarket`，界面里"点一下装好"）：搜 `doudizhu` 或直接粘地址；
- **设置 → 插件**：粘贴上面那行地址安装；
- **让智能体装**：`plugin_manager` 工具 `install_bundle`，target 填那行地址。

装完**关掉插件再打开一次**（不是重启 DSH），浮窗和「斗地主」标签页就出现了，
原因见上面「让它出现在 GUI 里」。

### 这条路径我验到什么程度

- **验过**：在一个干净目录里从上面这个 URL 装，5.7 秒装好；装出来的包能真的被加载出来，
  `name = "dsh-doudizhu"`、`inject = ["webServer"]`、`apply` 是函数，
  `exports["./client"]`、`dsh.bundle.patch`、`dsh.client` 元数据齐全。
- **验过（先例）**：你这台机器的 profile 里 `dsh-all-in` 就是用同样形态的
  GitHub Release tarball URL 装的（`profiles/desktop/package.json` 里能看见），
  所以插件管理器接受这种 spec。
- **没验过**：桌面版安装对话框的**具体文案**——那是个 Electron 窗口，我够不到，
  没法替你点。如果你那台机器上按钮名字不一样，照意思找"从地址/URL 安装"即可。

### 从源码装（改代码时用）

`link:` 安装，改完 `lib/` 立即生效，`~/.dsh/profiles/<profile>/package.json` 里的依赖写成
本地目录的 `link:` 路径（本机就是这么装的）：

```json
"dsh-doudizhu": "link:<你克隆到的目录>"
```

再把 `dsh-doudizhu` 加进同一份 `package.json` 的 `dsh.profile.bundles` 数组：

```sh
git clone https://github.com/dingchenhui0618-arch/dsh-doudizhu
node scripts/build.mjs        # 只有改了 src/ 才需要
```

## 三机实机怎么跑（M6）

三个人的机器都要先有 DSH。**主机**就是你现在这台；另外两家各做一次：

1. 装 DSH，再按上面「装进自己的 DSH」把插件装上（一行 Release 地址，不用克隆不用构建）；
2. 关掉插件再打开一次，右下角出现浮窗、标签栏出现「斗地主」；
3. 主机点「开房」，浮窗里会显示房间码和局域网地址，把 `房间码 XXXX · 地址 <ip>:8791`
   那一行发给另外两家；
4. 他们在自己的浮窗里填地址和房间码，点「加入」；
5. **三人到齐才自动发牌**（不补位、无 AI 补位），叫分定地主，顺时针出牌。

**主机这台要放行入站 TCP 8791**，Windows 默认拦入站。管理员 PowerShell：

```
netsh advfirewall firewall add rule name="dsh-doudizhu 8791" dir=in action=allow protocol=TCP localport=8791
```

不再需要时删掉：

```
netsh advfirewall firewall delete rule name="dsh-doudizhu 8791"
```

已经通到哪一步：`scripts/live-check.mjs` 在**这台机器上**对**运行中的插件**走完了整条路径——
真开房、真绑定局域网端口、另外两家作为 Node 客户端经**真实局域网地址**入座、打完一盘
（含 36 次真的压牌）、再开下一局、关房，全程做防泄牌扫描。**但那不等于**另外两家真的在
别的电脑上、真的用浏览器打——那才是 M6 剩下的事。

## 同事连不上怎么排查

按顺序排，别一次改三样：

1. **地址是不是虚拟网卡的。** 主机装了 WSL / Docker / 虚拟机 / VPN 时，
   `os.networkInterfaces()` 会把那些网卡的地址一起给出（例如 `172.22.0.1` 是 WSL 的
   `vEthernet`）。它们看着和局域网地址一样，**别的电脑永远连不上**。
   本插件现在只把真实网卡的地址放进「发给另外两家」那一行，虚拟网卡的会在下面用一行
   小字说明「已隐藏」，别手抄。本机实测：修之前给的是 `192.168.1.50 或 172.22.0.1`
   （一半概率抄错），修之后只有 `192.168.1.50`。
   注意 `127.0.0.1` 指的是**他自己**那台机器，发给别人一定连不上——所以那一项标了「（本机）」。
2. **房间是不是开着。** 局域网端口**只在开房期间监听**：`role=idle` 时 8791 上什么都没有。
   关房再开房之后房间码会变，要把新的那一行重新发一次。
3. **防火墙。** 本机入站是 `BlockInbound` 默认策略，但已经有两条 `DeepSeek Harness`
   的入站 Allow 规则（`Protocol: TCP`、`LocalPort: Any`、`Public` 配置文件），而监听 8791 的
   进程正是 `D:\.deepseek\DeepSeek Harness.exe`，你的 WiFi 也正好是 Public——所以放行是够的。
   换机器或换网络后如果不够，用上面 M6 那节的两条 `netsh` 命令。
4. **网络本身。** 公司 / 园区 WiFi 常开**客户端隔离**（同一个 SSID 下的机器互相看不见），
   或者同事挂在另一个 SSID / VLAN 上。这一条在客户端改不了，只能这样确认：让同事直接用浏览器
   打开

   ```
   http://<主机地址>:8791/hello
   ```

   - 出 JSON（`{"ok":true,...}`）→ 网络通，问题在插件里填的地址或房间码；
   - 转圈超时 / 无法访问 → 网络或防火墙，先确认两个人连的是同一个 WiFi。

   实际遇到的案子集中在第 1 条和第 2 条。

## 开发

```sh
node --test "test/*.test.mjs"     # 112 个单测：规则 / 牌局 / 房间 / 传输 / 插件 / 展示逻辑 / 客户端
node scripts/build.mjs            # esbuild 打包：src/host.js -> lib/index.js，src/client.cjs -> lib/client.js
node scripts/live-check.mjs       # 对着运行中的 DSH 实机跑一盘（host 半区端到端）
```

在真实浏览器里看浮窗（`scripts/browser-harness.mjs`）：它需要一个本机运行的 DSH，先把两个
React UMD 构建放进 `_tmp/`，再把夹具起在回环端口上，然后用浏览器打开它。

```sh
curl.exe -s -o _tmp/react.js     https://unpkg.com/react@18.3.1/umd/react.production.min.js
curl.exe -s -o _tmp/react-dom.js https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js
node scripts/browser-harness.mjs --port 8792   # 然后打开 http://127.0.0.1:8792/
```

夹具里的「开房」会真的在运行中的插件上建房，所以看完记得回插件里散局。

`lib/` 是提交进 git 的构建产物：用户装的是预构建包，不该在自己机器上跑 esbuild。
改完 `src/` 必须重新 build，否则跑的还是旧代码。

**热更新边界**：客户端半区（`src/client.cjs`）改完 build，桌面版若在跑 client-hmr
会推给浏览器；host 半区（`src/host.js`）改动要重启 DSH 才加载。
而**给一个原本没有客户端半区的插件新加 `dsh.client` / `exports["./client"]`，
不需要重启**：关掉插件再打开一次就会重新扫描并组合，实测见上面「让它出现在 GUI 里」。
（我原先在这里写"必须重启"，是错的。）

`test/` 下除了 `*.test.mjs` 还有共享断言（`test/helpers/leak.mjs`）和子进程探针
（`test/fixtures/follower-probe.mjs`），所以 test 脚本显式带上 glob——
Node 默认会把 `test/` 目录下**所有** `.mjs` 当测试文件跑。

`scripts/live-check.mjs` 是本轮 M4 验收用过的实机脚本，也留给 M6 复用：
它从外部连上运行中的 DSH，开房、经局域网地址入座、打完一盘、再开下一局，最后关房。
`--keep` 可以留下房间给人看。

本机 `node` 不在 PATH 时用 DSH 自带的：

```sh
& "$env:USERPROFILE\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe" --test "test/*.test.mjs"
```

## 许可

MIT。规则层移植自 [Aevi 家庭斗地主](https://github.com/AurexloveU/doudizhu)（MIT，
Copyright (c) 2026 AurexloveU），范围与改动见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
