import { Languages } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useI18n, useT } from "@/lib/i18n";

interface Props {
  /** Render as a compact icon-only trigger (for the header). */
  compact?: boolean;
}

export function LanguageSwitcher({ compact = false }: Props) {
  const { lang, setLang } = useI18n();
  const t = useT();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {compact ? (
          <Button
            variant="ghost"
            size="icon"
            aria-label={t("settings.languageTitle")}
            className="h-9 w-9"
          >
            <Languages className="h-4 w-4" />
          </Button>
        ) : (
          <Button variant="outline" size="sm" className="gap-2">
            <Languages className="h-3.5 w-3.5" />
            {lang === "th" ? t("languages.th") : t("languages.en")}
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => setLang("en")}
          aria-current={lang === "en" ? "true" : undefined}
        >
          {t("languages.en")}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setLang("th")}
          aria-current={lang === "th" ? "true" : undefined}
        >
          {t("languages.th")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
