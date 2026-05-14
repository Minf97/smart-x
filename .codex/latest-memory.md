# 压缩记忆

- 日期：2026-05-14
- 主题：细化 Code Request 创建流程

## 目标

- 在主链路文档中细化 Code Request 从 base branch 到 PR/MR 的创建顺序。
- 明确创建 PR/MR 成功后 Alert 应进入 `in_review`。

## 改动

- `docs/main-flow.md`
  - 新增 Code Request 创建流程章节，覆盖切 base branch、pull、创建分支、定位、修复、提交、push、创建 PR/MR、状态更新。
  - 记录当前代码已覆盖部分和缺口：创建成功未自动 `in_review`、合并成功未自动 `done`、缺少创建进度状态。

## 验证

- `npm run check`

## 待办

- 后续实现 `createAlertRequest -> in_review` 和 `mergeAlertRequest -> done` 的自动状态流转。
