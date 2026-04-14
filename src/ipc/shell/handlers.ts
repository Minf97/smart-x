import { os } from "@orpc/server";
import { clipboard, shell } from "electron";
import { copyTextInputSchema, openExternalLinkInputSchema } from "./schemas";

export const openExternalLink = os
  .input(openExternalLinkInputSchema)
  .handler(({ input }) => {
    const { url } = input;
    shell.openExternal(url);
  });

export const copyText = os.input(copyTextInputSchema).handler(({ input }) => {
  clipboard.writeText(input.text);
});
