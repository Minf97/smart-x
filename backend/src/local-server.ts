import { serve } from "@hono/node-server";
import app from "./app";
import { DEFAULT_PORT } from "./db";

const port = Number(process.env.BACKEND_PORT || DEFAULT_PORT);

serve(
  {
    fetch: app.fetch,
    hostname: "0.0.0.0",
    port,
  },
  () => {
    console.log(`backend ready on http://localhost:${port}`);
  }
);
