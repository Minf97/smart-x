# TODOLIST

## 产品目标

做一个 Electron 桌面端 AI 报警工作台：

- 接收报警
- 自动分级、过滤、去重
- 展示堆栈、根因、代码位置、修复方案
- 人工确认后创建 PR/MR

## 核心决策

- 报警接入：项目/监控系统同时发飞书和本平台 Webhook。
- 不依赖飞书群消息解析，飞书只保留通知能力。
- 代码上下文：MVP 先读取本地仓库，后续接 GitHub/GitLab。
- 修复策略：只生成 patch 和 PR/MR，不自动 merge。
- Memory：先用 SQLite 存结构化记忆，再补向量检索。
- 产品形态：先桌面端闭环，后续补 Docker 自托管。

## MVP 功能

### 1. Dashboard

- 左侧报警虚拟列表。
- 支持状态、等级、来源筛选。
- 右侧报警详情面板。
- 展示原始堆栈、AI 分析、代码块、修复方案。
- P0/P1 高亮，未知问题标红。

### 2. 报警接入

- Electron 主进程启动 Hono server。
- 提供 `POST /webhook/alerts`。
- 接收原始报警 JSON。
- 标准化为统一 Alert 数据。
- 写入本地 SQLite。

### 3. AI Triage

- 判断是否重复报警。
- 过滤已知无效报警，例如 `Load chunk failed`。
- 输出 P0/P1/P2/P3。
- 输出原因、影响、置信度、建议动作。
- 无法判断时标记为“需人工处理”。

### 4. 代码上下文

- 用户选择本地 repo 目录。
- 根据 stack trace 定位文件和行号。
- 读取相关文件片段。
- 记录历史报警、代码位置、埋点位置。
- 后续再做 GitHub/GitLab 远程读取。

### 5. 修复建议

- AI 生成修复思路。
- 展示关键代码块。
- 展示 patch/diff。
- 用户点击“确认创建 PR/MR”后再执行。
- 默认不写入用户仓库。

### 6. 使用文档

- 写 Quick Start。
- 说明如何配置 LLM Key。
- 说明如何选择 repo。
- 说明如何配置 Webhook。
- 说明如何查看报警和创建 PR/MR。

## 实现路径

### 阶段 1：界面骨架

- 替换模板首页为工作台。
- 新建 App Shell：顶部栏、左侧栏、详情区。
- 用 mock alert 数据跑通交互。
- 接入虚拟列表。
- 补充空状态、加载态、错误态。

### 阶段 2：本地数据

- 定义 Alert、Analysis、Repo、Memory 类型。
- 增加本地 SQLite 存储层。
- 增加报警列表查询、详情查询、状态更新。
- 前端用 React Query 读取数据。

### 阶段 3：Webhook 服务

- 在主进程启动 Hono。
- 实现 `/webhook/alerts`。
- 增加报警标准化 adapter。
- 收到报警后刷新 UI。
- 提供本地 Webhook URL 展示。

### 阶段 4：Agent Harness

- 增加 LLM Provider 配置。
- 定义 Agent Job 队列。
- 定义工具：读文件、搜索代码、查历史报警、写分析结果。
- 先做规则过滤，再调用 LLM。
- 保存分析结果和 token 消耗。

### 阶段 5：代码上下文

- 增加 repo 选择器。
- 建立文件索引。
- 根据堆栈定位代码。
- 缓存文件摘要和历史定位结果。
- 再补向量检索能力。

### 阶段 6：PR/MR 创建

- 先支持 GitHub。
- 再支持 GitLab。
- 流程：新分支 → 应用 patch → commit → push → 创建 PR/MR。
- PR/MR 创建前必须人工确认。
- 失败时保留 diff，方便手动处理。

### 阶段 7：产品化

- 完善 README。
- 增加示例报警 payload。
- 增加内置 demo 数据。
- 增加打包配置说明。
- 后续补 Docker 自托管版本。

## 近期优先级

1. 先做 Dashboard + mock 数据。
2. 再做 SQLite 持久化。
3. 再做 Hono Webhook。
4. 再接最小版 AI 分析。
5. 最后做代码上下文和 PR/MR。

## 暂不做

- 不做自动 merge。
- 不做自动部署。
- 不做飞书群消息反向解析。
- 不做多租户 SaaS。
- 不做复杂权限系统。
- 不一开始就做完整 RAG。

## 依赖检查

- 已有：`zod`、`@tanstack/react-query`、`shadcn`
- 可能新增：
  - `hono`
  - `@tanstack/react-virtual`
  - `better-sqlite3` 或 `libsql`
  - `octokit`
  - `@gitbeaker/rest`
