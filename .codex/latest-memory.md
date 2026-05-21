# 报警分析 Prompt 精修

- 目标：让 AI 分析先判断真实业务/用户可见影响，再决定是否修复并创建 PR/MR。
- 改动：扩展 `Analysis` 增加 `businessImpact` 和 `fixDecision`；抽出共享分析/修复 prompt 与 schema；自动模式遇到 `keep_backlog` 会写回 Backlog 并跳过创建请求；创建请求入口也拒绝 `keep_backlog`。
- 验证：相关 Vitest、`npm run test`、touched 文件 Ultracite、`git diff --check` 通过；全量 `npm run check` 和 `npx tsc --noEmit` 仍被既有无关 lint/依赖类型问题阻塞。
- 待办：全量 Ultracite 和 TypeScript 项目检查需要单独清理仓库既有问题。
