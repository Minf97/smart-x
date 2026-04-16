import z from "zod";

export const openExternalLinkInputSchema = z.object({
  url: z.url(),
});

export const copyTextInputSchema = z.object({
  text: z.string(),
});

export const openPathInputSchema = z.object({
  path: z.string().trim().min(1),
});
