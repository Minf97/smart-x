import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

describe("renderer vite config", () => {
  test("exposes project AI env variables", () => {
    const configText = readFileSync(
      resolve(process.cwd(), "vite.renderer.config.mts"),
      "utf8"
    );

    expect(configText).toContain('envPrefix: ["VITE_", "AI_"]');
  });
});
