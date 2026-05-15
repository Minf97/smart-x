# 压缩记忆

- 日期：2026-05-15
- 主题：User Project 接入文档与验收脚本

## 目标

- 补齐 User Project webhook 接入示例。
- 提供 Remote Backend 端到端验收脚本。

## 改动

- `docs/user-project-webhook.md`
  - 新增字段约定、浏览器端、React Error Boundary、Node 服务端接入示例。
  - 新增 Desktop Agent 主链路人工验收步骤。
- `scripts/verify-user-project-webhook.mjs`
  - 新增 Remote Backend 验收脚本，覆盖 health、建项目、发 Alert、拉列表、可选 sync ack。
- `package.json`
  - 新增 `npm run verify:webhook`。
- `docs/main-flow.md`
  - 更新当前事实和下一步，接入示例已完成，后续转向 Feedback Signal 同步。

## 验证

- `node --check scripts/verify-user-project-webhook.mjs`
- `npm run verify:webhook -- --help`
- `./node_modules/.bin/biome check scripts/verify-user-project-webhook.mjs`
- `npm test`
- `npm run check` 未通过，失败项为既有 lint/format 问题。

## 待办

- 实现 Feedback Signal 同步到 Remote Backend。
- 后续再考虑正式 SDK 包。
