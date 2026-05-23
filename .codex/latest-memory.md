# 按标题生成 groupKey 并优化左侧组行

- 目标：放宽默认 groupKey，让同标题报警收敛到同一组，并在左侧列表按 group 展示。
- 改动：`backend/src/alert-normalizer.ts` 未显式传 `groupKey` 时改用 `title` 的 sha1；`SidebarPanel` 行内展示标题、次数、优先级和最近时间；更新 webhook/API 文档说明。
- 验证：`npm run test -- alert-normalizer.test.ts alert-cluster.test.ts sidebar-panel-group.test.tsx`、`npm --prefix backend run check`、`npm run test`、改动文件 `biome check`。
- 待办：历史旧 groupKey 不自动重算。
