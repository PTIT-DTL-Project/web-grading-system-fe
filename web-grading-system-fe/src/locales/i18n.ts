import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './en.json'
import vi from './vi.json'

export type Lang = 'vi' | 'en'

export const LANG_KEY = 'wgs.lang'

function initialLang(): Lang {
  if (typeof localStorage === 'undefined') return 'vi'
  return localStorage.getItem(LANG_KEY) === 'en' ? 'en' : 'vi'
}

/**
 * Every user-visible string lives in vi.json / en.json. The rule is: a new key is added
 * to BOTH files — `npm run i18n:check` fails the build when they drift apart.
 */
void i18n.use(initReactI18next).init({
  resources: {
    vi: { translation: vi },
    en: { translation: en },
  },
  lng: initialLang(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  // Resources are local JSON, so there is nothing to await — suspending on first paint
  // would only add a Suspense boundary for no benefit.
  react: { useSuspense: false },
})

export async function changeLanguage(lang: Lang): Promise<void> {
  localStorage.setItem(LANG_KEY, lang)
  await i18n.changeLanguage(lang)
}

export default i18n
