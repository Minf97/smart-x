import { serve } from "@hono/node-server";
import { createLogger } from "../../shared/logger";
import app from "./app";
import { DEFAULT_PORT } from "./db";

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
