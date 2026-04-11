import type { Language } from "./language";

export default [
  {
    key: "en",
    nativeName: "English",
    prefix: "EN",
  },
  {
    key: "zh-CN",
    nativeName: "中文",
    prefix: "ZH",
  },
] as const satisfies Language[];
