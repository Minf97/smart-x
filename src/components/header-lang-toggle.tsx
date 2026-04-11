import { Languages } from "lucide-react";
import { useTranslation } from "react-i18next";
import { setAppLanguage } from "@/actions/language";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const ZH_KEY = "zh-CN";

export default function HeaderLangToggle() {
  const { i18n, t } = useTranslation();

  // 下个语言
  const nextLang = i18n.language.startsWith("zh") ? "en" : ZH_KEY;
  // 提示文案
  const tooltip = i18n.language.startsWith("zh")
    ? t("language.toEnglish")
    : t("language.toChinese");

  // 切换语言
  function handleClick() {
    setAppLanguage(nextLang, i18n);
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          aria-label={t("language.toggle")}
          className="h-7 w-7"
          onClick={handleClick}
          size="icon"
          title={tooltip}
          variant="ghost"
        >
          <Languages className="h-3.5 w-3.5" />
          <span className="sr-only">{tooltip}</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  );
}
