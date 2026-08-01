import { LogOut } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useAuth } from "@/hooks/useAuth"
import { cn } from "@/lib/utils"

type LogoutButtonProps = {
  className?: string
  onSignedOut?: () => void
  /** Fires when the logout control is pressed (e.g. close the mobile drawer). */
  onPress?: () => void
}

export function LogoutButton({ className, onSignedOut, onPress }: LogoutButtonProps) {
  const { t } = useTranslation()
  const { signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)

  const onConfirm = async () => {
    setIsSigningOut(true)
    try {
      await signOut()
      setOpen(false)
      onSignedOut?.()
    } finally {
      setIsSigningOut(false)
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className={cn(className)}
        onClick={() => {
          onPress?.()
          setOpen(true)
        }}
        aria-label={t("auth.logout")}
        title={t("auth.logout")}
      >
        <LogOut className="size-4" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("auth.logoutConfirmTitle")}</DialogTitle>
            <DialogDescription>{t("auth.logoutConfirmDescription")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isSigningOut}
              onClick={() => setOpen(false)}
            >
              {t("auth.logoutCancel")}
            </Button>
            <Button type="button" disabled={isSigningOut} onClick={() => void onConfirm()}>
              {isSigningOut ? t("auth.loggingOut") : t("auth.logoutConfirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
