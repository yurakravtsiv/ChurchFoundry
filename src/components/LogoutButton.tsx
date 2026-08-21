import { LogOut } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { MotionDialogContent } from "@/components/ui/motion-dialog-content"
import { useAuth } from "@/hooks/useAuth"
import { cn } from "@/lib/utils"

type LogoutConfirmDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSignedOut?: () => void
}

export function LogoutConfirmDialog({ open, onOpenChange, onSignedOut }: LogoutConfirmDialogProps) {
  const { t } = useTranslation()
  const { signOut } = useAuth()
  const [isSigningOut, setIsSigningOut] = useState(false)

  const onConfirm = async () => {
    setIsSigningOut(true)
    try {
      await signOut()
      onOpenChange(false)
      onSignedOut?.()
    } finally {
      setIsSigningOut(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <MotionDialogContent open={open} className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("auth.logoutConfirmTitle")}</DialogTitle>
          <DialogDescription>{t("auth.logoutConfirmDescription")}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={isSigningOut}
            onClick={() => onOpenChange(false)}
          >
            {t("auth.logoutCancel")}
          </Button>
          <Button type="button" disabled={isSigningOut} onClick={() => void onConfirm()}>
            {isSigningOut ? t("auth.loggingOut") : t("auth.logoutConfirm")}
          </Button>
        </DialogFooter>
      </MotionDialogContent>
    </Dialog>
  )
}

type LogoutButtonProps = {
  className?: string
  onSignedOut?: () => void
}

export function LogoutButton({ className, onSignedOut }: LogoutButtonProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className={cn(className)}
        onClick={() => setOpen(true)}
        aria-label={t("auth.logout")}
        title={t("auth.logout")}
      >
        <LogOut className="size-4" />
      </Button>

      <LogoutConfirmDialog open={open} onOpenChange={setOpen} onSignedOut={onSignedOut} />
    </>
  )
}
