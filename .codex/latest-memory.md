# 压缩记忆

- 日期：2026-05-15
- 主题：Phase B 首次启动与登录

## 目标

- 实现启动 loading、新老用户分流、写死登录和 onboarding 空壳。

## 改动

- `src/actions/auth-session.ts`
  - 新增本地 session、演示账号密码、onboarding 完成状态。
- `src/routes/index.tsx`
  - 根路由改为全屏动态 logo loading，并根据 session 分流。
- `src/routes/login.tsx`
  - 新增写死账号密码登录页。
- `src/routes/onboarding.tsx`
  - 新增 onboarding 空壳，包含“接入我的项目”和“先看演示”入口。
- `src/routes/dashboard.tsx`
  - 增加 Dashboard guard，未登录或未完成 onboarding 时跳转。
- `src/styles/global.css`
  - 新增启动 logo 动画。
- `src/routeTree.gen.ts`
  - 增加 `/login`、`/onboarding` 路由。

## 验证

- `./node_modules/.bin/tsc --noEmit --skipLibCheck`
- `npm test`
- `./node_modules/.bin/biome check src/actions/auth-session.ts src/constants/index.ts src/routes/index.tsx src/routes/login.tsx src/routes/onboarding.tsx src/routes/dashboard.tsx src/styles/global.css src/routeTree.gen.ts`
- `npm run check` 未通过，失败项为既有 lint/format 问题。

## 待办

- Phase C：补 GitHub/GitLab 连接、webhook 测试和 SDK 代码片段。
- Phase D：实现可点击触发 Alert 的 demo 链路。
