import { Mail, MapPin, Phone } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Link, useParams } from "react-router"
import { ChurchLogo } from "@/components/ChurchLogo"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useChurchProfileQuery } from "@/hooks/queries/useChurchProfileQueries"

function mapsSearchUrl(address: string) {
  return `https://www.openstreetmap.org/search?query=${encodeURIComponent(address)}`
}

export function PublicChurchPage() {
  const { t } = useTranslation()
  const { id } = useParams()
  const { data: profile } = useChurchProfileQuery()

  const name = profile?.name.trim() || t("app.name")
  const logoSrc = profile?.logoDataUrl || "/favicon.svg"
  const address = profile?.address.trim() ?? ""
  const phone = profile?.phone.trim() ?? ""
  const email = profile?.email.trim() ?? ""
  const nextPath = id ? `/inventory/${id}` : "/"
  const loginTo = `/login?next=${encodeURIComponent(nextPath)}`

  return (
    <main className="mx-auto flex min-h-[var(--app-height)] w-full max-w-md flex-col justify-center bg-background px-4 py-8 pt-[max(2rem,env(safe-area-inset-top,0px))]">
      <Card>
        <CardHeader className="space-y-4 text-center">
          <ChurchLogo src={logoSrc} size={64} roundedClassName="rounded-2xl" className="mx-auto" />
          <div className="space-y-2">
            <CardTitle className="text-2xl font-bold tracking-tight">{name}</CardTitle>
            <CardDescription>{t("auth.scanSubtitle")}</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {address || phone || email ? (
            <ul className="space-y-3 text-sm">
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

          <Button type="button" className="w-full" asChild>
            <Link to={loginTo}>{t("auth.login")}</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  )
}
