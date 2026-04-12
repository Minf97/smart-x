import { os } from "@orpc/server";
import { app } from "electron";
import { getLocalApiOrigin } from "@/server";

export const currentPlatfom = os.handler(() => {
  return process.platform;
});

export const appVersion = os.handler(() => {
  return app.getVersion();
});

export const alertsApiOrigin = os.handler(() => {
  return getLocalApiOrigin();
});
