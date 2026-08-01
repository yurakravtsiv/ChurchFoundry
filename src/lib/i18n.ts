import i18n from "i18next"
import { initReactI18next } from "react-i18next"

import en from "@/locales/en.json"
import uk from "@/locales/uk.json"

const STORAGE_KEY = "churchfoundry-lang"

const savedLanguage = localStorage.getItem(STORAGE_KEY)
const initialLanguage = savedLanguage === "en" || savedLanguage === "uk" ? savedLanguage : "uk"

function applyResources() {
  i18n.addResourceBundle("uk", "translation", uk, true, true)
  i18n.addResourceBundle("en", "translation", en, true, true)
}

if (i18n.isInitialized) {
  // Vite HMR can re-run this module after locale JSON edits; refresh bundles.
  applyResources()
} else {
  void i18n.use(initReactI18next).init({
    resources: {
      uk: { translation: uk },
      en: { translation: en },
    },
    lng: initialLanguage,
    fallbackLng: "uk",
    interpolation: {
      escapeValue: false,
    },
  })
}

i18n.on("languageChanged", (lng) => {
  localStorage.setItem(STORAGE_KEY, lng)
  document.documentElement.lang = lng
})

document.documentElement.lang = initialLanguage

if (import.meta.hot) {
  import.meta.hot.accept(["@/locales/uk.json", "@/locales/en.json"], async (modules) => {
    const nextUk = modules[0]?.default
    const nextEn = modules[1]?.default
    if (nextUk) {
      i18n.addResourceBundle("uk", "translation", nextUk, true, true)
    }
    if (nextEn) {
      i18n.addResourceBundle("en", "translation", nextEn, true, true)
    }
  })
}

export default i18n
