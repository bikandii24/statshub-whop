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
  // Whop App Store requires English-only UI
  const t = en

  return (
    <I18nContext.Provider value={{ lang: "en", t }}>
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
