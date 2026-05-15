# 压缩记忆

- 日期：2026-05-15
- 主题：接入 code-inspector

## 目标

- 接入 `zh-lx/code-inspector`，开发时支持从页面元素跳转源码。

## 改动

- `package.json`、`package-lock.json`
  - 新增 `code-inspector-plugin` dev dependency。
- `vite.renderer.config.mts`
  - 在 renderer Vite plugins 中加入 `codeInspectorPlugin({ bundler: "vite" })`。

## 验证

- `npm test`
- `./node_modules/.bin/tsc --noEmit --skipLibCheck`
- `./node_modules/.bin/biome check vite.renderer.config.mts package.json`
- `npm run check` 未通过，失败项为既有 lint/format 问题。

## 待办

- 启动 Electron 开发环境后，用 `Option + Shift + 点击元素` 验证 IDE 跳转。
