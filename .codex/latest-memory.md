# 压缩记忆

- 日期：2026-04-16
- 主题：项目创建链路简化、`repository.ts` 去 helper、memory 改为每日文件

## 目标

- 创建项目继续使用 `repoId` / `managedRepoPath` 驱动连接和 clone。
- 参考用户手改的 `validateProjectConnection`，减少多余转换和包装。
- `.codex/memories` 不再每次任务新增文件，改成每天一个文件。

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
- `.codex/memories/2026-04-16.md`
  - 已合并今天的 memory。

## 记忆规则

- `AGENTS.md` 已更新：
  - 每次任务后仍更新 `.codex/latest-memory.md`。
  - `.codex/memories/` 每天只建一个 `YYYY-MM-DD.md`。
  - 同一天多次任务追加到当天文件，用一级标题分隔。

## 验证

- `./node_modules/.bin/biome check src/server/alerts/repository.ts` 已通过。
- `./node_modules/.bin/tsc --noEmit --pretty false --skipLibCheck` 已通过。

## 待办

- 无。
