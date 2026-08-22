import { Building2, Mail, MapPin, Phone } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Link, useParams } from "react-router"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useChurchProfileQuery } from "@/hooks/queries/useChurchProfileQueries"
import { mapsSearchUrl } from "@/lib/addressLookup"

export function PublicChurchPage() {
  const { t } = useTranslation()
  const { id } = useParams()
  const { data: profile } = useChurchProfileQuery()

  const name = profile?.name.trim() ?? ""
  const address = profile?.address.trim() ?? ""
  const phone = profile?.phone.trim() ?? ""
  const email = profile?.email.trim() ?? ""
  const nextPath = id ? `/inventory/${id}` : "/"
  const loginTo = `/login?next=${encodeURIComponent(nextPath)}`

  return (
    <main className="mx-auto flex min-h-[var(--app-height)] w-full max-w-md flex-col justify-center bg-background px-4 py-8 pt-[max(2rem,env(safe-area-inset-top,0px))]">
      <Card>
        <CardHeader className="space-y-4 text-center">
          <img
            src="/favicon.svg"
            alt=""
            width={64}
            height={64}
            className="mx-auto size-16 rounded-2xl"
          />
          <CardTitle className="text-2xl font-bold tracking-tight">{t("app.name")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {name || address || phone || email ? (
            <ul className="space-y-3 text-sm">
              {name ? (
                <li className="flex items-start gap-3">
                  <Building2 className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 break-words">
                    {t("church.public.nameWithLabel", { name })}
                  </span>
                </li>
              ) : null}
              {address ? (
                <li className="flex items-start gap-3">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <a
                    href={mapsSearchUrl(address)}
                    target="_blank"
                    rel="noreferrer"
                    className="min-w-0 break-words text-primary underline-offset-4 hover:underline"
                  >
                    {address}
                    <span className="sr-only"> ({t("church.public.openMap")})</span>
                  </a>
                </li>
              ) : null}
              {phone ? (
                <li className="flex items-start gap-3">
                  <Phone className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <a
                    href={`tel:${phone}`}
                    className="min-w-0 break-all text-primary underline-offset-4 hover:underline"
                  >
                    {phone}
                  </a>
                </li>
              ) : null}
              {email ? (
                <li className="flex items-start gap-3">
                  <Mail className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <a
                    href={`mailto:${email}`}
                    className="min-w-0 break-all text-primary underline-offset-4 hover:underline"
                  >
                    {email}
                  </a>
                </li>
              ) : null}
            </ul>
          ) : null}

          <p className="text-center text-sm text-muted-foreground">{t("auth.scanSubtitle")}</p>
          <Button type="button" className="w-full" asChild>
            <Link to={loginTo}>{t("auth.login")}</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  )
}
