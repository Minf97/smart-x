# 压缩记忆

- 日期：2026-04-28
- 主题：分析复用与自动修复建 MR

## 目标

- 让报警分析结果入库复用，并把“创建 PR/MR”接成“本地改代码 -> commit/push -> 创建 MR”的完整链路。

## 改动

- `src/server/alerts/pi-service.ts`
  - 新增 `applyAlertFixWithPi()`，基于已存储的分析结果在本地仓库做最小修复改动。
- `src/server/alerts/repository.ts`
  - `analyzeAlert()` 现在如果已有 `detail.analysis` 就直接复用，不再重复分析。
  - `createAlertRequest()` 现在要求先有已存储的分析结果，再调用 `pi` 对本地仓库实际改代码。
- `src/server/projects/git-service.ts`
  - 拆分了分支准备、工作区校验、提交、推送步骤，避免继续用空提交开分支。
- `src/server/alerts/request-service.ts`
  - `createRequest()` 现在支持在分支创建后插入真实代码修改，再 commit/push 并创建远端 PR/MR。
  - PR/MR 描述会带上根因、影响、修复摘要、验证建议。
- `src/components/dashboard/request-actions.tsx`
  - 创建 PR/MR 按钮新增前置条件：AI 配置完整、仓库路径存在、报警已分析。
- `src/localization/i18n.ts`
  - 新增“请先分析报警”等按钮提示文案。

## 验证

- `./node_modules/.bin/tsc --noEmit --pretty false --skipLibCheck`

## 待办

- 还没做真实 repo 上的端到端联调，下一步要验证 `pi` 的写入质量、git 工作区约束和 GitHub/GitLab MR 创建是否串起来。
