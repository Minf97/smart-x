import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { serve } from "@hono/node-server";
import { createLogger } from "../../shared/logger";
import app from "./app";
import { DEFAULT_PORT } from "./db";

const ENV_LINE_RE = /\r?\n/;
const ENV_QUOTE_RE = /^["']|["']$/g;

// 加载本地环境
function loadLocalEnv() {
  const envPath = path.resolve(process.cwd(), "../.env");

  if (!existsSync(envPath)) {
    return;
  }

  const content = readFileSync(envPath, "utf8");

  for (const line of content.split(ENV_LINE_RE)) {
    const nextLine = line.trim();

    if (!(nextLine && !nextLine.startsWith("#"))) {
      continue;
    }

    const separatorIndex = nextLine.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = nextLine.slice(0, separatorIndex).trim();
    const value = nextLine.slice(separatorIndex + 1).trim();

    if (key && process.env[key] === undefined) {
      process.env[key] = value.replace(ENV_QUOTE_RE, "");
    }
  }
}

loadLocalEnv();

const port = Number(process.env.BACKEND_PORT || DEFAULT_PORT);
const logger = createLogger("backend-api");

serve(
  {
    fetch: app.fetch,
    hostname: "0.0.0.0",
    port,
  },
  () => {
    logger.info("server started", {
      origin: `http://localhost:${port}`,
    });
  }
);
