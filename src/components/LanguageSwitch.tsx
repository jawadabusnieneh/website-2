import { useLanguage } from "../lib/i18n";
import type { Language } from "../types";

export default function LanguageSwitch() {
  const { language, setLanguage, t } = useLanguage();
  return (
    <label className="language-switch">
      <span className="sr-only">{t("اللغة")}</span>
      <select
        aria-label={t("اللغة")}
        value={language}
        onChange={(e) => setLanguage(e.target.value as Language)}
      >
        <option value="ar" lang="ar">
          العربية
        </option>
        <option value="he" lang="he">
          עברית
        </option>
      </select>
    </label>
  );
}
