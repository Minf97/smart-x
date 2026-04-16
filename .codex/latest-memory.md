# 压缩记忆

- 日期：2026-04-16
- 主题：项目创建链路简化、repo dropdown 组件化、currentProject 仓库信息收口

## 目标

- 创建项目继续使用 `repoId` / `managedRepoPath` 驱动连接和 clone。
- 参考用户手改的 `validateProjectConnection`，减少多余转换和包装。
- `.codex/memories` 不再每次任务新增文件，改成每天一个文件。
- 提供一个手动刷新并拉取报警列表的入口。
- repo 列表里已经连接过的仓库不可重复选择。
- 解决手动刷新时报 `Remote request failed`。
- 把创建项目里的 repo dropdown 抽成独立组件。
- 不在 `create-project-dialog.tsx` 本地堆 repo id/name 集合，改从当前项目 store 获取。
- 删掉 `getCurrentProviderState` 这种难看的 provider 状态 helper。
- 设置弹窗内容过长时要限高并自动滚动。

## 当前状态

- `src/server/alerts/repository.ts`
  - 已删除 `toPublicProject`、`buildStoredProject`、`toAiConfig`、`toProjectInput`。
  - `validateProjectConnection` 保持直接解构 `input.repoConfig` 的写法。
  - `createProject` / `runCreateProjectSession` 直接 resolve connection、validate、组装 `nextProject`。
  - `updateProject` 直接使用 schema 处理后的 `input`，不再创建 `nextInput`。
- `src/server/projects/repo-path-service.ts`
  - 默认本地仓库路径当前是 `~/Documents/workspace/managed-repos/<provider>/<repo segments...>`。
- `src/components/dashboard/repo-path-field.tsx`
  - 零 props，内部读取当前 project 并处理打开目录。
- `src/components/dashboard/sidebar-panel.tsx`
  - 已新增 `RefreshCw` 手动刷新按钮，触发 `syncAlerts()` 并马上 refetch 报警列表。
  - 如果部分远端项目同步失败，会显示 warning，而不是整个刷新报错。
- `src/components/dashboard/create-project-dialog.tsx`
  - 仓库选择已从原生 `select` 改成 shadcn dropdown。
  - 已连接仓库会显示 badge 且禁用，不可再次选择。
  - 默认自动选择第一个未连接仓库。
  - dropdown 视图已抽离到 `src/components/dashboard/repo-select-dropdown.tsx`。
  - 已删除 `getCurrentProviderState`，改回 `isGitlab` + 直白变量。
  - GitLab 默认值、授权轮询副作用、GitLab 输入块都已拆成明确职责的小块。
- `src/components/dashboard/settings-dialog.tsx`
  - `DialogContent` 已增加 `max-h-[85vh] overflow-y-auto`。
- `src/hooks/use-projects.ts`
  - 已新增 `useCurrentProjectRepo(provider)`，用于从 zustand 当前项目派生 repo 信息。
- 当前版本说明
  - 用户确认上次“刷新失败”只是因为服务未重启，相关服务端容错改动已回滚。
  - 当前 repo 禁用逻辑按 `currentProject.repoConfig.repoId/repoName` 判断。
- `.codex/memories/2026-04-16.md`
  - 已合并今天的 memory。

## 记忆规则

- `AGENTS.md` 已更新：
  - 每次任务后仍更新 `.codex/latest-memory.md`。
  - `.codex/memories/` 每天只建一个 `YYYY-MM-DD.md`。
  - 同一天多次任务追加到当天文件，用一级标题分隔。

## 验证

- `./node_modules/.bin/biome check src/server/alerts/repository.ts` 已通过。
- `./node_modules/.bin/biome check src/components/dashboard/sidebar-panel.tsx src/components/dashboard/create-project-dialog.tsx src/localization/i18n.ts` 已通过。
- `./node_modules/.bin/biome check src/hooks/use-projects.ts src/components/dashboard/create-project-dialog.tsx src/components/dashboard/repo-select-dropdown.tsx` 已通过。
- `./node_modules/.bin/biome check src/components/dashboard/settings-dialog.tsx` 已通过。
- `./node_modules/.bin/tsc --noEmit --pretty false --skipLibCheck` 已通过。

## 待办

- 如果 repo 列表继续变长，可再升级成带搜索的 combobox。
