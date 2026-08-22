import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, Trash2 } from "lucide-react"
import { useEffect, useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { z } from "zod"
import { ChurchLogo } from "@/components/ChurchLogo"
import { AddressLookupField } from "@/components/settings/AddressLookupField"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  useChurchProfileQuery,
  useSaveChurchProfileMutation,
} from "@/hooks/queries/useChurchProfileQueries"
import { compressChurchLogo, isValidChurchWebsite } from "@/lib/churchProfileStorage"
import {
  CHURCH_PROFILE_FIELD_LIMITS,
  type ChurchProfile,
  EMPTY_CHURCH_PROFILE,
} from "@/types/church"

type ChurchFormValues = {
  name: string
  address: string
  phone: string
  email: string
  website: string
  logoDataUrl: string | null
}

function toFormValues(profile: ChurchProfile): ChurchFormValues {
  return {
    name: profile.name,
    address: profile.address,
    phone: profile.phone,
    email: profile.email,
    website: profile.website,
    logoDataUrl: profile.logoDataUrl,
  }
}

export function ChurchSettingsTab() {
  const { t } = useTranslation()
  const { data: profile } = useChurchProfileQuery()
  const saveMutation = useSaveChurchProfileMutation()
  const [isCompressing, setIsCompressing] = useState(false)

  const schema = z.object({
    name: z
      .string()
      .max(
        CHURCH_PROFILE_FIELD_LIMITS.name,
        t("inventory.form.validation.stringMax", { max: CHURCH_PROFILE_FIELD_LIMITS.name }),
      ),
    address: z
      .string()
      .max(
        CHURCH_PROFILE_FIELD_LIMITS.address,
        t("inventory.form.validation.stringMax", { max: CHURCH_PROFILE_FIELD_LIMITS.address }),
      ),
    phone: z
      .string()
      .max(
        CHURCH_PROFILE_FIELD_LIMITS.phone,
        t("inventory.form.validation.stringMax", { max: CHURCH_PROFILE_FIELD_LIMITS.phone }),
      ),
    email: z
      .string()
      .max(
        CHURCH_PROFILE_FIELD_LIMITS.email,
        t("inventory.form.validation.stringMax", { max: CHURCH_PROFILE_FIELD_LIMITS.email }),
      )
      .refine((value) => value.trim() === "" || z.email().safeParse(value.trim()).success, {
        message: t("settings.church.validation.email"),
      }),
    website: z
      .string()
      .max(
        CHURCH_PROFILE_FIELD_LIMITS.website,
        t("inventory.form.validation.stringMax", { max: CHURCH_PROFILE_FIELD_LIMITS.website }),
      )
      .refine((value) => isValidChurchWebsite(value), {
        message: t("settings.church.validation.website"),
      }),
    logoDataUrl: z.string().nullable(),
  })

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<ChurchFormValues>({
    resolver: zodResolver(schema),
    defaultValues: toFormValues(profile ?? EMPTY_CHURCH_PROFILE),
  })

  const logoDataUrl = watch("logoDataUrl")

  useEffect(() => {
    if (!isDirty) {
      reset(toFormValues(profile ?? EMPTY_CHURCH_PROFILE))
    }
  }, [isDirty, profile, reset])

  const onLogoSelected = async (fileList: FileList | null) => {
    const file = fileList?.[0]
    if (!file) {
      return
    }
    setIsCompressing(true)
    try {
      const dataUrl = await compressChurchLogo(file)
      setValue("logoDataUrl", dataUrl, { shouldDirty: true })
    } catch (error) {
      console.error("[ChurchSettingsTab] Logo compression failed", error)
    } finally {
      setIsCompressing(false)
    }
  }

  const onSubmit = handleSubmit(async (values) => {
    const saved = await saveMutation.mutateAsync({
      name: values.name,
      address: values.address,
      phone: values.phone,
      email: values.email,
      website: values.website,
      logoDataUrl: values.logoDataUrl,
    })
    reset(toFormValues(saved))
  })

  return (
    <Card>
      <form onSubmit={onSubmit} noValidate>
        <CardHeader className="space-y-1.5 px-4 py-4">
          <CardTitle className="text-base">{t("settings.church.title")}</CardTitle>
          <CardDescription>{t("settings.church.description")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 px-4 pt-0">
          <div className="space-y-2">
            <Label htmlFor="church-name">{t("settings.church.name")}</Label>
            <Input
              id="church-name"
              maxLength={CHURCH_PROFILE_FIELD_LIMITS.name}
              placeholder={t("settings.church.namePlaceholder")}
              aria-invalid={Boolean(errors.name)}
              {...register("name")}
            />
            {errors.name ? <p className="text-sm text-destructive">{errors.name.message}</p> : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="church-address">{t("settings.church.address")}</Label>
            <Controller
              control={control}
              name="address"
              render={({ field }) => (
                <AddressLookupField
                  id="church-address"
                  value={field.value}
                  onChange={field.onChange}
                  maxLength={CHURCH_PROFILE_FIELD_LIMITS.address}
                  aria-invalid={Boolean(errors.address)}
                />
              )}
            />
            {errors.address ? (
              <p className="text-sm text-destructive">{errors.address.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="church-phone">{t("settings.church.phone")}</Label>
            <Input
              id="church-phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              maxLength={CHURCH_PROFILE_FIELD_LIMITS.phone}
              placeholder={t("settings.church.phonePlaceholder")}
              aria-invalid={Boolean(errors.phone)}
              {...register("phone")}
            />
            {errors.phone ? (
              <p className="text-sm text-destructive">{errors.phone.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="church-email">{t("settings.church.email")}</Label>
            <Input
              id="church-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              maxLength={CHURCH_PROFILE_FIELD_LIMITS.email}
              placeholder={t("settings.church.emailPlaceholder")}
              aria-invalid={Boolean(errors.email)}
              {...register("email")}
            />
            {errors.email ? (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="church-website">{t("settings.church.website")}</Label>
            <Input
              id="church-website"
              type="url"
              inputMode="url"
              autoComplete="url"
              maxLength={CHURCH_PROFILE_FIELD_LIMITS.website}
              placeholder={t("settings.church.websitePlaceholder")}
              aria-invalid={Boolean(errors.website)}
              {...register("website")}
            />
            {errors.website ? (
              <p className="text-sm text-destructive">{errors.website.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="church-logo">{t("settings.church.logo")}</Label>
            <Input
              id="church-logo"
              type="file"
              accept="image/*"
              disabled={isCompressing}
              onChange={(event) => {
                void onLogoSelected(event.target.files)
                event.target.value = ""
              }}
            />
            <p className="text-sm text-muted-foreground">{t("settings.church.logoHint")}</p>
            {isCompressing ? (
              <p className="text-sm text-muted-foreground">
                {t("settings.church.logoCompressing")}
              </p>
            ) : null}
            {logoDataUrl ? (
              <div className="flex items-start gap-3">
                <ChurchLogo src={logoDataUrl} size={80} className="border" />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setValue("logoDataUrl", null, { shouldDirty: true })}
                >
                  <Trash2 className="size-4" />
                  {t("settings.church.removeLogo")}
                </Button>
              </div>
            ) : null}
          </div>
        </CardContent>
        <CardFooter className="justify-end px-4 pb-4">
          <Button type="submit" disabled={!isDirty || isSubmitting || isCompressing}>
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                {t("settings.church.saving")}
              </>
            ) : (
              t("settings.church.save")
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
