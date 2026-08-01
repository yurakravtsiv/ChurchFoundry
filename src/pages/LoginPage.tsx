import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { supabase } from "@/lib/supabase"

export function LoginPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [authError, setAuthError] = useState<string | null>(null)

  const loginSchema = z.object({
    email: z.email({ error: t("auth.validation.email") }),
    password: z.string().min(6, { error: t("auth.validation.password") }),
  })

  type LoginFormValues = z.infer<typeof loginSchema>

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  })

  const onSubmit = handleSubmit(async (values) => {
    setAuthError(null)

    const { error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    })

    if (error) {
      setAuthError(t("auth.errors.invalidCredentials"))
      return
    }

    void navigate("/", { replace: true })
  })

  return (
    <main className="mx-auto flex h-dvh min-h-dvh w-full max-w-md flex-col justify-center bg-background px-4 py-8 pb-[env(safe-area-inset-bottom,0px)] pt-[max(2rem,env(safe-area-inset-top,0px))]">
      <Card>
        <CardHeader className="space-y-4 text-center">
          <img
            src="/favicon.svg"
            alt=""
            width={64}
            height={64}
            className="mx-auto size-16 rounded-2xl"
          />
          <div className="space-y-2">
            <CardTitle className="text-2xl font-bold tracking-tight">{t("app.name")}</CardTitle>
            <CardDescription>{t("auth.loginSubtitle")}</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit} noValidate>
            <div className="space-y-2">
              <Label htmlFor="email">{t("auth.email")}</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                disabled={isSubmitting}
                aria-invalid={Boolean(errors.email)}
                {...register("email")}
              />
              {errors.email ? (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{t("auth.password")}</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                disabled={isSubmitting}
                aria-invalid={Boolean(errors.password)}
                {...register("password")}
              />
              {errors.password ? (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              ) : null}
            </div>

            {authError ? (
              <p className="text-sm text-destructive" role="alert">
                {authError}
              </p>
            ) : null}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  {t("auth.loggingIn")}
                </>
              ) : (
                t("auth.login")
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
