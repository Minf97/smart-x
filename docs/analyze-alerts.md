# 分析报警流程

本文记录点击“分析报警”后的后端主流程，方便后续排查和修改。

## 入口

- 前端按钮调用 `src/api/alerts.ts` 的 `analyzeAlert(id)`。
- 请求打到 `POST /alerts/:id/analyze`。
- 路由在 `src/server/alerts/routes.ts` 中调用 `repository.analyzeAlert(id)`。

## 主流程

1. 读取报警和项目配置。
   - 从本地数据库读取报警行。
   - 通过 `projectId` 找到项目。
   - 项目里包含 `repoConfig` 和 `aiConfig`。

2. 复用已有分析。
   - 如果报警已经有 `rootCause`、`impact`、`codeLocations` 或 `fixSuggestions`，直接返回。
   - 这样避免同一条报警重复请求模型。

3. 更新本地仓库。
   - 先解析当前项目的 GitHub / GitLab 凭证。
   - 再更新本地托管仓库的 `origin` 地址。
   - 然后检查工作区是否干净。
   - 最后执行：

```bash
git fetch origin
git checkout <baseBranch>
git pull --rebase=false origin <baseBranch>
```

默认项目的 `<baseBranch>` 是 `main`；如果项目配置成 `develop` 或其他分支，则同步对应分支。同步失败会直接中断分析，把错误返回给前端。

4. 定位代码上下文。
   - `locateAlertCodeLocations` 会读取本地仓库。
   - 从报警标题、错误信息、原始 payload 中提取关键词。
   - 跳过 `.git`、`node_modules`、`dist`、`build` 等目录。
   - 只扫描常见前端源码扩展名，例如 `ts`、`tsx`、`js`、`vue`、`svelte`。
   - 找到命中文件后返回最多 3 个代码位置和上下文片段。

5. 调用 AI 分析。
   - 把报警内容和候选代码位置传给 `analyzeAlertWithAi`。
   - 模型输出根因、影响范围、代码位置和修复建议。

6. 写回数据库。
   - 新分析结果写入报警的 `detail.analysis`。
   - 更新 `updatedAt`。
   - 前端收到更新后的报警详情并刷新分析面板。

## 失败行为

- 本地仓库路径为空：返回 `Local repository path is not configured.`。
- 工作区有未提交改动：返回 `Managed repository has uncommitted changes.`。
- `git pull --rebase=false` 失败：直接返回 git 错误，不做静默兜底。
- AI 请求失败：返回 AI 服务抛出的错误，由前端 toast 展示。

## 相关文件

- `src/components/dashboard/analysis-action.tsx`
- `src/api/alerts.ts`
- `src/server/alerts/routes.ts`
- `src/server/alerts/repository.ts`
- `src/server/projects/git-service.ts`
- `src/server/alerts/analysis-service.ts`
- `src/server/alerts/ai-service.ts`
