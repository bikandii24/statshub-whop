"use client"

import * as React from "react"
import { en } from "./en"
import { es } from "./es"

type Lang = "en" | "es"

interface I18nContextValue {
  lang: Lang
  t: typeof en
}

const I18nContext = React.createContext<I18nContextValue>({ lang: "en", t: en })

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = React.useState<Lang>("en")

  React.useEffect(() => {
    // Check browser/navigator language
    const browserLang =
      (typeof navigator !== "undefined" &&
        (navigator.language || (navigator.languages && navigator.languages[0]))) ||
      "en"
    setLang(browserLang.toLowerCase().startsWith("es") ? "es" : "en")
  }, [])

  const t = lang === "es" ? es : en

  return (
    <I18nContext.Provider value={{ lang, t }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useT() {
  return React.useContext(I18nContext).t
}

export function useLang() {
  return React.useContext(I18nContext).lang
}
