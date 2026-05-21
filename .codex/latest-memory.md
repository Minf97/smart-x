# Webhook Step 进入 Dashboard

- 目标：补齐 onboarding 最后一步的收口，并允许用户在 Dashboard 随时回到接入指引。
- 改动：Webhook step 增加“进入 Dashboard”，点击后 `completeOnboarding()` 并跳转 `/dashboard`；已有项目重新打开 onboarding 时，AI 已配置则直接进入 webhook step，否则进入 AI Settings；Dashboard header 增加“接入指引”入口跳转 `/onboarding`。
- 验证：`npm run test -- src/tests/unit/onboarding-layout.test.tsx src/tests/unit/dashboard-header-layout.test.tsx src/tests/unit/create-project-dialog-layout.test.tsx` 通过；本次 touched 文件 `biome check` 通过；`npm --prefix backend run check` 通过；`git diff --check` 通过。
- 待办：无。
