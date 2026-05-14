# AI Alert Dashboard

AI Alert Dashboard 是一个把线上报警、代码仓库、AI 分析和 PR/MR 修复串起来的本地优先报警处理系统。

## Language · 词表

**AI Alert Platform**:
覆盖远端报警后端、Electron 桌面端和代码托管集成的完整产品边界。
_Avoid_: 平台、系统、大盘

**Remote Backend**:
托管的报警入口和同步 API，保存项目、webhook 和待同步报警。
_Avoid_: 后端、云端、server

**Desktop Agent**:
运行在用户电脑上的 Electron 应用，负责同步报警、读取仓库、调用 AI 和创建 PR/MR。
_Avoid_: 客户端、dashboard、本地端

**User Project**:
用户接入报警的真实业务应用及其代码仓库。
_Avoid_: 项目、业务项目、用户仓库

**Managed Repository**:
Desktop Agent 管理的 User Project 本地克隆。
_Avoid_: 本地仓库、clone 目录

**Alert**:
Remote Backend 接收到的一次报警记录。
_Avoid_: 事件、问题、任务

**Alert Group**:
由 `groupKey` 标识的一组同类 Alert。
_Avoid_: 告警类别、聚合问题

**Analysis**:
AI 对单条 Alert 给出的根因、影响、代码位置和修复建议。
_Avoid_: AI 结果、诊断

**Code Request**:
Desktop Agent 基于 Alert 创建的 GitHub PR 或 GitLab MR。
_Avoid_: PR、MR、修复请求

**Feedback Signal**:
用户对 Analysis 或 Code Request 的处理动作，例如完成、忽略、关闭、合并或标记重复。
_Avoid_: 反馈、状态、人工判断

## Relationships · 关系

- 一个 **User Project** 对应一个 **Remote Backend** project 和一个 webhook。
- 一个 **User Project** 对应零个或一个 **Managed Repository**。
- 一个 **Remote Backend** project 产生零条或多条 **Alert**。
- 一条 **Alert** 属于一个 **Alert Group**。
- 一条 **Alert** 最多有一个 **Analysis**。
- 一条 **Alert** 最多有一个 **Code Request**。
- 一个 **Feedback Signal** 必须指向一条 **Alert**，也可以关联一个 **Code Request**。

## Flagged ambiguities · 已澄清歧义

- “平台”统一指 **AI Alert Platform**，不是单指 Remote Backend。
- “用户项目”统一指 **User Project**，不是 Desktop Agent 内的本地项目记录。
- “闭环”统一拆成 **Alert -> Analysis -> Code Request -> Feedback Signal**。
