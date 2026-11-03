import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useLocation } from "react-router-dom";
import type { Language } from "../types";
import { readLocal } from "./utils";
import { translator } from "./i18n-core";

interface LanguageContextValue {
  language: Language;
  setLanguage: (language: Language) => void;
  t: ReturnType<typeof translator>;
}
const LanguageContext = createContext<LanguageContextValue>(null!);
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(() =>
    readLocal<unknown>("elite-language", "ar") === "he" ? "he" : "ar",
  );
  const location = useLocation();
  const admin = location.pathname.startsWith("/elite-management-portal");
  useEffect(() => {
    document.documentElement.lang = admin ? "ar" : language;
    document.documentElement.dir = "rtl";
    document.title =
      language === "he" && !admin
        ? "Elite Accessories | אקססוריז"
        : "إيليت أكسسوريز | تفاصيل تُشبهك";
    try {
      localStorage.setItem("elite-language", JSON.stringify(language));
    } catch {
      /* private browser */
    }
  }, [language, admin]);
  const value = useMemo(
    () => ({ language, setLanguage, t: translator(language) }),
    [language],
  );
  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}
export const useLanguage = () => useContext(LanguageContext);
