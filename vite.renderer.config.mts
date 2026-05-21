import path from "node:path";
import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import { codeInspectorPlugin } from "code-inspector-plugin";
import { defineConfig } from "vite";

export default defineConfig({
  // 暴露 AI 配置
  envPrefix: ["VITE_", "AI_"],
  plugins: [
    tanstackRouter({
      target: "react",
    }),
    tailwindcss(),
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    codeInspectorPlugin({
      bundler: "vite",
    }),
  ],
  resolve: {
    preserveSymlinks: true,
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
      "@shared": path.resolve(import.meta.dirname, "./shared"),
    },
  },
});
