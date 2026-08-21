import { useTranslation } from "react-i18next"

import { useChurchProfileQuery } from "@/hooks/queries/useChurchProfileQueries"
import { churchProfileHasBranding } from "@/lib/churchProfileStorage"

const DEFAULT_LOGO_SRC = "/favicon.svg"

export function useChurchBranding() {
  const { t } = useTranslation()
  const { data: profile } = useChurchProfileQuery()
  const showChurchBranding = churchProfileHasBranding(profile)

  return {
    logoSrc: showChurchBranding && profile?.logoDataUrl ? profile.logoDataUrl : DEFAULT_LOGO_SRC,
    title: showChurchBranding && profile ? profile.name.trim() : t("app.name"),
    showChurchBranding,
    profile,
  }
}
