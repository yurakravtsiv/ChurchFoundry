import i18n from "i18next"
import { initReactI18next } from "react-i18next"

import en from "@/locales/en.json"
import uk from "@/locales/uk.json"

const STORAGE_KEY = "churchfoundry-lang"

const savedLanguage = localStorage.getItem(STORAGE_KEY)
const initialLanguage = savedLanguage === "en" || savedLanguage === "uk" ? savedLanguage : "uk"

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

i18n.on("languageChanged", (lng) => {
  localStorage.setItem(STORAGE_KEY, lng)
  document.documentElement.lang = lng
})

document.documentElement.lang = initialLanguage

export default i18n
