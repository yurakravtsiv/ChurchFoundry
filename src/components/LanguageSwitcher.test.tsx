import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { I18nextProvider } from "react-i18next"
import { describe, expect, it } from "vitest"

import { LanguageSwitcher } from "@/components/LanguageSwitcher"
import i18n from "@/lib/i18n"

describe("LanguageSwitcher", () => {
  it("switches language from Ukrainian to English", async () => {
    await i18n.changeLanguage("uk")
    const user = userEvent.setup()

    render(
      <I18nextProvider i18n={i18n}>
        <LanguageSwitcher />
      </I18nextProvider>,
    )

    expect(screen.getByText("Мова")).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "EN" }))

    expect(screen.getByText("Language")).toBeInTheDocument()
    expect(i18n.language).toBe("en")
  })
})
