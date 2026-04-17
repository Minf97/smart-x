# 压缩记忆

- 日期：2026-04-17
- 主题：报警位置改为搜索候选定位

## 目标

- 去掉基于 stack 的报错位置解析。
- 改成从报警内容做仓库全局搜索，给用户一个更适合“开始定位 bug”的报警位置。
- 位置项支持点击打开本地文件。

## 当前状态

- `src/server/alerts/analysis-service.ts`
  - 已不再解析 stack。
  - 改为从 `title`、`message`、`sourceUrl`、`rawAlert` 提取关键词。
  - 在 `managedRepoPath` 下遍历源码文件并做本地全文匹配。
  - 返回最多 3 个 `codeLocations` 候选，包含命中的文件、行号、代码片段、绝对路径。
- `shared/types/alert.ts`
  - `CodeLocation` 新增 `absolutePath`。
- `src/components/detail-content/location.tsx`
  - 报警位置现可点击。
  - 点击后通过 `openPath` 打开本地文件。
- `src/localization/i18n.ts`
  - 新增 `openLocation`、`openLocationFailed` 文案。

## 验证

- `./node_modules/.bin/biome check shared/types/alert.ts src/server/alerts/analysis-service.ts src/components/detail-content/location.tsx src/localization/i18n.ts src/server/alerts/repository.ts`
- `./node_modules/.bin/tsc --noEmit --pretty false --skipLibCheck`

## 待办

- 继续提升候选排序，加入 route/component/log key 等权重。
- 如需更快搜索，可补 `rg` fast path。
- 后续再接真实 AI，补 root cause / fix suggestions。
