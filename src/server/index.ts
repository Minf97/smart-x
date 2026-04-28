import type { AddressInfo } from "node:net";
import type { ServerType } from "@hono/node-server";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { createRequestLogger } from "@shared/hono-request-logger";
import { createLogger } from "@shared/logger";
import { alertsRouter } from "./alerts/routes";
import { closeLocalDatabase, initLocalDatabase } from "./db";
import { githubRouter } from "./github/routes";
import { stopGitlabCallbackServer } from "./gitlab/auth-service";
import { gitlabRouter } from "./gitlab/routes";
import { projectsRouter } from "./projects/routes";

let alertsApiOrigin = "";
let server: ServerType | null = null;
let startPromise: Promise<string> | null = null;
const logger = createLogger("local-api");

// 服务端
function buildServerApp() {
  const app = new Hono();

  app.use("*", cors());
  app.use("*", createRequestLogger("local-api"));
  app.route("/", alertsRouter);
  app.route("/", gitlabRouter);
  app.route("/", githubRouter);
  app.route("/", projectsRouter);

  return app;
}

// 启动服
export function startLocalApiServer() {
  if (startPromise) {
    return startPromise;
  }

  startPromise = new Promise((resolve, reject) => {
    initLocalDatabase();
    const app = buildServerApp();
    const nextServer = serve(
      {
        fetch: app.fetch,
        hostname: "127.0.0.1",
        port: 0,
      },
      (info: AddressInfo) => {
        alertsApiOrigin = `http://127.0.0.1:${info.port}`;
        logger.info("server started", {
          origin: alertsApiOrigin,
        });
        resolve(alertsApiOrigin);
      }
    );

    nextServer.once("error", (error) => {
      startPromise = null;
      logger.error("server start failed", error);
      reject(error);
    });

    server = nextServer;
  });

  return startPromise;
}

// 服务址
export function getLocalApiOrigin() {
  if (!alertsApiOrigin) {
    throw new Error("Local API server is not ready.");
  }

  return alertsApiOrigin;
}

// 停止服
export function stopLocalApiServer() {
  if (!server) {
    return;
  }

  logger.info("server stopping");
  server.close();
  stopGitlabCallbackServer();
  closeLocalDatabase();
  server = null;
  startPromise = null;
  alertsApiOrigin = "";
}
