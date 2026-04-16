import { os } from "@orpc/server";
import { clipboard, shell } from "electron";
import {
  copyTextInputSchema,
  openExternalLinkInputSchema,
  openPathInputSchema,
} from "./schemas";

export const openExternalLink = os
  .input(openExternalLinkInputSchema)
  .handler(({ input }) => {
    const { url } = input;
    shell.openExternal(url);
  });

export const copyText = os.input(copyTextInputSchema).handler(({ input }) => {
  clipboard.writeText(input.text);
});

export const openPath = os
  .input(openPathInputSchema)
  .handler(async ({ input }) => {
    const errorMessage = await shell.openPath(input.path);

    if (errorMessage) {
      throw new Error(errorMessage);
    }
  });
