# 压缩记忆

- 日期：2026-05-14
- 主题：补全主链路进度与反馈

## 目标

- 为 Code Request 创建补独立进度状态。
- 将主链路反馈动作结构化沉淀到本地。

## 改动

- `shared/types/project.ts`
  - 新增 Code Request 创建进度状态、步骤和返回类型。
- `src/server/alerts/request-progress.ts`
  - 新增创建 PR/MR 的本地进度会话。
- `src/server/alerts/repository.ts`
  - `startCreateAlertRequest` 支持异步创建和轮询进度。
  - 状态 `done/dismiss/duplicate`、合并、关闭 PR/MR 时写入 Feedback Signal。
- `src/server/db/schema.ts`、`src/server/db/index.ts`
  - 新增 `feedback_signals` 本地表。
- `src/components/dashboard/request-actions.tsx`
  - 创建 PR/MR 改为 start/poll，并用 toast 展示阶段。
- `src/components/detail-content/activity.tsx`
  - 在处理记录展示同组 Feedback Signal。
- `src/tests/unit/alert-status-flow.test.ts`
  - 补创建进度和反馈记录单测。

## 验证

- `./node_modules/.bin/tsc --noEmit --skipLibCheck`
- `npm test`
- `npm run check`

## 待办

- 新增 User Project webhook 接入示例。
- 后续把 Feedback Signal 同步到 Remote Backend。
