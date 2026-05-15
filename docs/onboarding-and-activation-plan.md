# 新用户引导与接入计划

## 1. 背景

AI Alert Platform 解决的是“线上出错后，谁来发现、判断、定位和修复”的问题。研发团队理解 Alert，因为他们每天处理监控、日志、飞书群消息和错误堆栈。个人开发者、独立开发者和 vibe coder 往往没有完整监控体系。他们更熟悉的问题是：

- 用户说“页面打不开”，但开发者不知道哪里出错。
- AI 帮忙写了代码，应用上线后没人盯运行质量。
- 报错只留在浏览器控制台，本地看不到生产环境发生了什么。
- 接入 Sentry、Datadog、飞书机器人或自建日志系统要理解很多概念。

我们要把“报警”翻译成用户能理解的语言：应用出错后，平台自动把问题带回来，读代码，解释影响，提出修复，并创建 Code Request。

产品第一印象不能只给用户一个空的报警列表。用户第一次打开应用时，必须知道三件事：

1. 为什么要接入 Alert。
2. 如何把自己的 User Project 接进来。
3. 接入后平台能自动完成什么。

## 2. 产品定位

AI Alert Platform 面向两类用户：

- 企业研发团队：已经有报警、飞书群、GitHub / GitLab 和线上流程，希望减少报警噪音和人工排查。
- 个人开发者与 vibe coder：没有成熟监控，希望用最少步骤知道线上应用出了什么问题，并让 AI 帮忙修。

对第二类用户，Alert 不能从“监控系统配置”讲起。我们应该从结果讲起：

```text
你的应用出错
  -> 平台收到错误
  -> AI 读堆栈和代码
  -> 给出原因和修复方案
  -> 你确认后创建 Code Request
```

这条解释要出现在 Quick Start、新手教程和 demo 中。

## 3. 首次启动体验

### 3.1 动态 Logo Loading

应用启动时先展示一个全屏动态 logo。目标不是做营销页，而是给 Desktop Agent 一个有记忆点的启动状态。

体验要求：

- 全屏展示，背景和主应用视觉一致。
- Logo 有轻量动态效果，例如渐入、呼吸、描边扫光或粒子聚合。
- 加载过程控制在 1 到 2 秒内；主进程初始化完成后立即进入下一步。
- 如果初始化慢，展示短状态文案，例如“准备你的报警工作台”。
- 动画只服务启动反馈，不阻塞真实初始化。

### 3.2 用户状态识别

启动后判断用户状态：

- 老用户：已有本地 session，直接进入 Dashboard。
- 新用户：进入登录页。

MVP 暂时使用写死账号密码，先验证流程：

```text
email: demo@smart-x.local
password: smartx
```

本地保存 session。后续再替换为真实用户体系。

## 4. 新手教程

新手教程负责把用户从“第一次打开应用”带到“看到一条可修复 Alert”。教程应该是分步任务，不是大段说明。

### Step 1：解释平台价值

用户看到一句清楚的话：

```text
把你的应用错误接进来，AI 会帮你读堆栈、找代码位置，并创建可 review 的 Code Request。
```

页面提供两个入口：

- 接入我的项目
- 先看演示

### Step 2：连接 GitHub / GitLab

用户选择代码托管平台：

- GitHub
- GitLab

教程引导用户完成授权，选择 User Project 对应的仓库，设置 base branch。平台创建或选择 Managed Repository。

需要说明权限：

- 读取仓库用于定位代码。
- 创建分支和 Code Request 用于提交修复。
- 平台不自动 merge。

### Step 3：选择是否已有报警

用户选择当前状态：

- 我已经有报警系统。
- 我还没有报警系统。
- 我只是想先看看。

不同选择进入不同路径。

#### 已有报警系统

平台展示 webhook URL，引导用户把现有监控系统新增一个 webhook 目标。飞书、Sentry、后端服务或自建监控都可以继续保留原通知方式。

用户完成后点击“发送测试 Alert”，平台用 Remote Backend 验收脚本同类逻辑确认链路可用。

#### 没有报警系统

平台推荐安装 SDK。MVP 先提供文档和代码片段，后续提供 npm 包。

教程生成两类内容：

- `.env` 中的 webhook 配置。
- User Project 中的接入代码。

示例：

```text
SMART_X_WEBHOOK_URL=https://your-backend.example.com/ingest/wk_xxx
```

#### 只是看看

用户进入演示 demo。平台不要求连接真实仓库，也不要求配置 webhook。

## 5. SDK 方向

我们需要一个轻量 SDK 来降低接入成本。SDK 的目标不是替代 Sentry，而是把 Alert 送进 AI Alert Platform。

### 5.1 SDK 目标

SDK 应该做到：

- 一行初始化。
- 自动捕获浏览器错误和 Promise rejection。
- React 场景提供 Error Boundary。
- Node 场景提供 `reportError`。
- 自动带上 `environment`、`source`、`sourceUrl`、`occurredAt`。
- 允许用户传业务上下文，例如 `userId`、`release`、`requestId`。

### 5.2 SDK 形态

建议拆成三个入口：

```text
@smart-x/alert/browser
@smart-x/alert/react
@smart-x/alert/node
```

MVP 不急着发布包。先把 API 设计和示例稳定下来，再抽 npm 包。

### 5.3 Browser API 草案

```ts
import { initSmartXAlert } from "@smart-x/alert/browser";

initSmartXAlert({
  environment: "production",
  source: "web",
  webhookUrl: process.env.SMART_X_WEBHOOK_URL,
});
```

### 5.4 React API 草案

```tsx
import { SmartXErrorBoundary } from "@smart-x/alert/react";

<SmartXErrorBoundary>
  <App />
</SmartXErrorBoundary>;
```

### 5.5 Node API 草案

```ts
import { reportError } from "@smart-x/alert/node";

await reportError(error, {
  path: request.url,
  requestId,
});
```

## 6. 演示 Demo

新用户可以不接真实 User Project，直接看一个完整闭环。

### 6.1 Demo 目标

用户点击一个按钮后，平台展示：

```text
按钮触发错误
  -> Remote Backend 收到 Alert
  -> Desktop Agent 同步 Alert
  -> AI 生成 Analysis
  -> 创建 Code Request
  -> 用户看到修复链路
```

用户应该在 3 到 5 分钟内看到平台价值。

### 6.2 Demo 网站

做一个最小 User Project demo site。页面只有一个核心动作：

- “触发一次线上错误”按钮。

点击后，demo site 向当前 demo project 的 webhook 上报 Alert。Alert 的 stack 指向 demo repo 中真实存在的文件和行号，确保 Desktop Agent 能定位代码。

Demo site 需要包含一个真实 bug，例如：

```ts
const items: string[] | undefined = undefined;
items.map((item) => item.toUpperCase());
```

### 6.3 Demo 仓库

Demo repo 应该很小，便于 AI 修复：

```text
demo-user-project/
  src/
    App.tsx
    broken-list.ts
  package.json
```

平台可以内置这个 demo repo，或者从 GitHub 克隆公开 demo repo。MVP 推荐内置到本仓库或提供一键创建本地 demo，减少网络变量。

### 6.4 Demo 验收

演示链路合格条件：

1. 用户点击按钮后，Dashboard 出现一条 demo Alert。
2. Analysis 展示错误原因、影响和代码位置。
3. Code Request 创建流程展示进度。
4. 远端或本地模拟 Code Request 展示修复 diff。
5. 用户能看到“从错误到修复”的完整路径。

## 7. Quick Start 改造

Quick Start 要按用户意图组织，而不是按系统模块组织。

建议结构：

1. 你为什么需要 Alert。
2. 3 分钟看 demo。
3. 10 分钟接入真实 User Project。
4. 已有报警系统如何接 webhook。
5. 没有报警系统如何装 SDK。
6. 如何连接 GitHub / GitLab。
7. 如何从 Alert 创建 Code Request。
8. 常见问题。

文案重点：

- 少讲“配置平台”，多讲“让你的应用出错后能回到你手里”。
- 少讲“报警系统”，多讲“用户遇到错误后你能看到问题”。
- 少讲 AI 自动化，明确用户仍然 review 和 merge。

## 8. 可实施 Plan

### Phase A：文档和概念收敛

目标：先让团队知道我们要把新用户带到哪里。

任务：

- 更新 `docs/intro.md`，增加面向个人开发者和 vibe coder 的解释。
- 新增 Quick Start 文档骨架。
- 将 `docs/user-project-webhook.md` 纳入 Quick Start。
- 定义 SDK API 草案，不发布包。
- 定义 demo site 的页面、错误、Alert payload 和验收标准。

验收：

- 新用户只看文档，也能说清平台解决什么问题。
- 文档能回答“我没有报警系统怎么办”。

### Phase B：首次启动与登录

目标：应用能区分新老用户。

任务：

- 增加启动 loading view。
- 增加本地 session 存储。
- 增加写死账号密码登录页。
- 老用户直接进 Dashboard。
- 新用户登录后进入 onboarding。

验收：

- 首次打开应用进入登录。
- 登录成功后进入新手教程。
- 关闭重开后直接进入 Dashboard 或继续未完成教程。

### Phase C：新手教程主流程

目标：用户按教程接入自己的 User Project。

任务：

- 增加 onboarding step 状态。
- Step 1 展示平台价值和两个入口。
- Step 2 接 GitHub / GitLab 授权与仓库选择。
- Step 3 选择已有报警、没有报警、只是看看。
- 已有报警路径展示 webhook 和测试发送。
- 没有报警路径展示 SDK 代码片段和 `.env`。

验收：

- 用户能复制 webhook。
- 用户能发送测试 Alert。
- 用户能看到接入成功状态。

### Phase D：Demo 链路

目标：用户不接真实项目也能看到闪光点。

任务：

- 新增 demo project 创建入口。
- 新增 demo site 或内置 demo 页面。
- 点击按钮上报 demo Alert。
- 为 demo Alert 准备稳定 stack 和源码位置。
- 允许 demo 使用模拟 Code Request，或者连接公开 demo repo 创建真实 PR。

验收：

- 用户点击一次按钮后，平台出现 demo Alert。
- 用户能完成分析、查看修复建议和创建 Code Request。
- Demo 不依赖用户已有报警系统。

### Phase E：SDK 最小实现

目标：把文档里的 SDK 草案变成可安装包或本地包。

任务：

- 新增 SDK workspace 或 `packages/alert-sdk`。
- 实现 browser 初始化和全局错误捕获。
- 实现 React Error Boundary。
- 实现 Node `reportError`。
- 补最小单测。
- Quick Start 改为优先推荐 SDK。

验收：

- 示例项目能安装 SDK 并上报 Alert。
- SDK 不吞业务错误。
- SDK 失败时不影响 User Project 主流程。

### Phase F：正式化

目标：把 MVP 体验升级为可交付产品体验。

任务：

- 替换写死登录为真实鉴权。
- 支持项目级 webhook 密钥轮换。
- 支持 onboarding 重置和跳过。
- 增加接入状态检查。
- 增加 Alert Group 历史处理提示。

验收：

- 新用户能从下载安装到完成首条 Alert 接入。
- 老用户打开应用直接回到工作台。
- 企业用户能把 webhook 安全交给团队接入。

## 9. 下一步建议

下一步先做 Phase A 和 Phase B。

原因：

- Phase A 会统一我们对“报警”这个概念的解释，后续 UI 和 SDK 都按这个口径写。
- Phase B 会建立新老用户分流，后续 onboarding、demo 和真实接入都有落点。

最小代码切片：

1. 新增启动 loading view。
2. 新增本地 session。
3. 新增登录页。
4. 新增 onboarding 空壳页面，先放“接入我的项目”和“先看演示”两个入口。

这四步完成后，我们再把 GitHub / GitLab 连接、SDK 片段和 demo 链路逐步填进去。
