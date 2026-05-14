# 主链路闭环方案

本文记录 AI Alert Dashboard 的主链路设计：User Project 如何接入 AI Alert Platform，Alert 如何被分析和修复，以及 Feedback Signal 如何反过来优化后续处理。

> 参考文档：用户提供的飞书 wiki 链接当前无法在本环境读取。本文先基于当前代码和已有 docs 收敛框架，后续拿到可访问内容后再逐条对齐。

## 1. 目标闭环

主链路定义为：

```text
User Project 上报 Alert
  -> Remote Backend 标准化和暂存
  -> Desktop Agent 同步到本地
  -> Desktop Agent 读取 Managed Repository 并生成 Analysis
  -> Desktop Agent 创建 Code Request
  -> 用户 review / merge / close / dismiss
  -> Feedback Signal 沉淀为后续过滤、分组和修复策略
```

这条链路的目标不是“AI 自动替人合代码”，而是让报警从进入系统到形成可审查修复建议之间没有断点，最终动作仍由用户确认。

## 2. 当前事实

已经存在的能力：

- Remote Backend 已支持 `POST /projects`、`POST /ingest/:webhookId`、`GET /projects/:projectId/alerts`、`POST /projects/:projectId/alerts/sync-ack`。
- Desktop Agent 创建项目时会创建 Remote Backend project，保存 webhook，并克隆/维护 Managed Repository。
- Desktop Agent 已能拉取未同步 Alert，写入本地 SQLite，并向 Remote Backend 回执同步成功。
- Desktop Agent 已能在分析前同步 base branch，再定位代码候选位置，并调用 OpenAI-compatible AI 生成 Analysis。
- Desktop Agent 已能基于 Analysis 创建分支、调用修复 agent、提交、push，并创建 GitHub PR 或 GitLab MR。
- UI 已有状态流转按钮、分析按钮、创建/合并/关闭 Code Request 的入口。

当前断点：

- User Project 只有 webhook 合约，没有 SDK / 框架接入模板，接入成本高。
- Alert 状态和 Code Request 状态没有形成自动联动，例如创建 Code Request 后未自动进入 `in_review`。
- Feedback Signal 只体现在本地状态变化，没有结构化沉淀为过滤规则或修复偏好。
- Remote Backend 暂无用户鉴权，只适合 MVP 链路验证。
- Alert Group 目前只作为分组键，缺少同类报警复用 Analysis / 过滤噪音的策略。

## 3. 平台与用户项目边界

### User Project 负责

- 在运行时捕获错误、接口异常或业务报警。
- 通过 webhook 将 Alert 发送到 Remote Backend。
- 提供可定位问题的字段：`title`、`message`、`stack`、`source`、`environment`、`sourceUrl`、`occurredAt`、`priority`。
- 保持代码仓库可被 Desktop Agent 通过 GitHub / GitLab 凭证读取和创建分支。

### AI Alert Platform 负责

- Remote Backend 标准化 Alert，并保证待同步 Alert 不丢。
- Desktop Agent 把 Remote Backend 的 Alert 同步到本地。
- Desktop Agent 在 Managed Repository 中定位上下文，生成 Analysis。
- Desktop Agent 只通过 Code Request 修改 User Project，不直接改生产环境。
- Desktop Agent 记录用户对 Alert 和 Code Request 的处理结果。

### 不做的事

- 不在 Remote Backend 中保存用户代码。
- 不自动 merge Code Request。
- 不在 MVP 阶段引入完整用户/团队权限模型。
- 不把 `groupKey` 当作唯一记录覆盖原始 Alert。

## 4. 实施切片

### Phase 1：打通可演示主链路

- 保留现有 webhook 接入方式，补充一份 User Project 接入示例。
- 确认创建项目后，用户能直接复制 webhook 并完成一次 Alert 上报。
- 同步 Alert 后，Desktop Agent 自动展示在左侧列表。
- 分析 Alert 成功后，Analysis 写回本地。
- 创建 Code Request 成功后，状态自动进入 `in_review`。
- 合并 Code Request 后，Alert 状态自动进入 `done`。
- 关闭 Code Request 后，Alert 状态保持可人工处理，不自动吞掉。

### Phase 2：沉淀 Feedback Signal

- 用户标记 `dismiss` / `duplicate` 时，记录原因类型。
- 同一 Alert Group 再次出现时，优先展示历史处理结论。
- 对明显噪音类 Alert 给出“自动忽略建议”，但仍保留原始记录。
- Analysis 失败或 Code Request 无改动时，保留失败原因供下一次优化 prompt / 检索策略。

### Phase 3：降低 User Project 接入成本

- 提供最小浏览器端接入片段。
- 提供 React Error Boundary 接入示例。
- 提供通用 Node 服务端报警上报示例。
- 后续再考虑 SDK 包，而不是第一版就引入依赖发布链路。

### Phase 4：正式化平台能力

- 引入用户鉴权和项目归属。
- webhook 增加可轮换密钥。
- Remote Backend 支持按用户/项目查询同步状态。
- 为 Alert Group 提供统计、趋势和历史处理结果。

## 5. 状态闭环

建议把 Alert 状态作为用户可理解的任务状态：

```text
backlog      新 Alert 入库后的默认状态
todo         用户确认需要处理
in_progress 进入分析或修复中
in_review    Code Request 已创建，等待 review
done         Code Request 已合并或用户确认完成
dismiss      用户确认无需处理
duplicate    用户确认是重复报警
```

最小自动流转：

- `analyzeAlert` 开始时：`backlog | todo -> in_progress`。
- `analyzeAlert` 成功后：保持 `in_progress`，等待用户决定是否创建 Code Request。
- `createAlertRequest` 成功后：`in_progress | todo | backlog -> in_review`。
- `mergeAlertRequest` 成功后：`in_review -> done`。
- `closeAlertRequest` 成功后：不自动完成，保留用户手动选择 `todo`、`dismiss` 或 `duplicate`。

## 6. Code Request 创建流程

Code Request 是从一条已分析 Alert 到远端 PR/MR 的最小修复闭环。目标流程必须按下面顺序执行：

```text
1. 切回 base branch
2. git pull 确保 base branch 是最新代码
3. 从最新 base branch 创建 alert 修复分支
4. 根据 Alert stack 和 Analysis 定位代码位置
5. 调用修复 agent 进行最小代码修改并提交
6. push 分支并创建 PR/MR
7. 创建成功后把 Alert 状态改为 in_review
```

### 6.1 分支准备

Desktop Agent 必须先保证 Managed Repository 是安全可改的：

- 检查 Managed Repository 路径存在且是 git 仓库。
- 更新 `origin` 到当前 GitHub / GitLab 凭证对应的远端地址。
- 检查工作区干净；如果存在未提交改动，直接中断，不覆盖用户改动。
- 执行 `git fetch origin`。
- 执行 `git checkout <baseBranch>`。
- 执行 `git pull --rebase=false origin <baseBranch>`。
- 用 `alert/<alertId>-<slug>-<timestamp>-<nonce>` 创建修复分支。

这里的 `<baseBranch>` 来自项目配置，通常是 `main`，但不能写死成 `main`。

### 6.2 定位和修复

Code Request 创建阶段不应重新猜测报警上下文，而应优先复用 Analysis：

- `Analysis.codeLocations` 是修复 agent 的首选入口。
- `Alert.detail.error.stack`、`message`、`rawAlert` 作为补充上下文。
- 如果 Alert 没有 Analysis，禁止创建 Code Request，要求用户先分析。
- 修复 agent 可以读取和修改 Managed Repository 文件，但不能运行 git 命令。
- 修复必须保持最小改动；如果没有生成真实代码改动，创建流程失败。

这意味着定位有两层：

- 分析阶段：`analyzeAlert` 从 stack / message / repo 中找候选位置，生成 Analysis。
- 修复阶段：`createAlertRequest` 复用 Analysis，并允许修复 agent 再读取相关代码确认最终修改点。

### 6.3 提交和 PR/MR

修复完成后，Desktop Agent 负责：

- `git add -A`
- 如果没有文件变更，返回 `No code changes were generated for this alert.`
- 用 `chore(alert): <alertId> <title>` 提交。
- push 修复分支到远端。
- GitHub 项目创建 PR，GitLab 项目创建 MR。
- PR/MR 标题使用 `[<alertId>] <title>`。
- PR/MR 描述包含 root cause、impact、suggested fix、verification。

创建 PR/MR 成功后必须同时更新本地状态：

- 写入 `project.requestMap[alertId]`。
- 将 Alert 状态更新为 `in_review`。
- 前端刷新后能看到 Code Request 链接和 `in_review` 状态。

### 6.4 当前代码差异

当前代码已经覆盖：

- `prepareAlertBranch` 会检查工作区、切 base branch、pull 最新代码并创建分支。
- `createAlertRequest` 会要求 Alert 已经有 Analysis。
- `applyAlertFixWithPi` 会在分支创建后修复代码。
- `createRequest` 会提交、push 并创建 GitHub PR / GitLab MR。
- `createAlertRequest` 成功后会把 Alert 状态更新为 `in_review`。
- `mergeAlertRequest` 成功后会把 Alert 状态更新为 `done`。

当前缺口：

- Code Request 创建过程没有独立进度状态，失败时只能看到最终错误。

## 7. 数据闭环

Alert 数据需要保留三层：

- 原始层：Remote Backend 保存每次 webhook 上报的 Alert。
- 分析层：Desktop Agent 保存 Analysis、代码位置和修复建议。
- 反馈层：Desktop Agent 保存 Feedback Signal，后续再同步到 Remote Backend。

Feedback Signal 第一版不需要复杂模型，先记录：

- `alertId`
- `groupKey`
- `action`: `done | dismiss | duplicate | close_request | merge_request`
- `reason`: 可选短文本或固定枚举
- `createdAt`

这些数据后续用于：

- 同组 Alert 的历史提示。
- 噪音报警的自动忽略建议。
- prompt 中加入“上次同类问题怎么处理”。
- 判断某类修复建议是否经常被关闭。

## 8. 验收标准

一条主链路算“通”，必须满足：

1. 创建 User Project 后能拿到 webhook。
2. User Project 能向 webhook 上报一条真实 Alert。
3. Desktop Agent 能同步该 Alert 并回执 Remote Backend。
4. 用户点击分析后，Analysis 能写回本地。
5. 用户点击创建 Code Request 后，远端仓库出现 PR/MR。
6. 用户合并 PR/MR 后，Desktop Agent 中 Alert 变为 `done`。
7. 用户关闭或忽略后，同类 Alert 下次出现时能看到历史处理提示。

Phase 1 只要求 1-6；第 7 条是 Phase 2 的验收点。

## 9. 下一步代码入口

优先补三处最小实现：

- `src/server/alerts/repository.ts`
  - 新增 Code Request 创建过程的进度状态，区分同步分支、修复、提交、创建 PR/MR。
- `src/server/alerts/repository.ts`
  - 新增最小 Feedback Signal 本地存储，先不改 Remote Backend。
- `docs/`
  - 新增 User Project webhook 接入示例，覆盖浏览器端和 Node 服务端。

这三处完成后，主链路从“能点功能”变成“状态和反馈能闭环”。
