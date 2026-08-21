import { useEffect, useId, useRef, useState } from "react"
import { useTranslation } from "react-i18next"

import { Input } from "@/components/ui/input"
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover"
import { type AddressSuggestion, searchAddresses } from "@/lib/addressLookup"
import { cn } from "@/lib/utils"

const SEARCH_DEBOUNCE_MS = 400
const MIN_QUERY_LENGTH = 3

type AddressLookupFieldProps = {
  id: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  maxLength?: number
  "aria-invalid"?: boolean
}

export function AddressLookupField({
  id,
  value,
  onChange,
  disabled,
  maxLength,
  "aria-invalid": ariaInvalid,
}: AddressLookupFieldProps) {
  const { t, i18n } = useTranslation()
  const listId = useId()
  const [open, setOpen] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState(false)
  const skipSearchRef = useRef(false)
  const typedWhileFocusedRef = useRef(false)

  useEffect(() => {
    if (skipSearchRef.current) {
      skipSearchRef.current = false
      return
    }

    const query = value.trim()
    if (query.length < MIN_QUERY_LENGTH) {
      setSuggestions([])
      setIsSearching(false)
      setSearchError(false)
      setOpen(false)
      return
    }

    if (!isFocused || !typedWhileFocusedRef.current) {
      return
    }

    const controller = new AbortController()
    setIsSearching(true)
    setSearchError(false)

    const timeoutId = window.setTimeout(() => {
      void searchAddresses(query, i18n.language, controller.signal)
        .then((results) => {
          setSuggestions(results)
          setOpen(true)
        })
        .catch((error: unknown) => {
          if (controller.signal.aborted) {
            return
          }
          console.error("[AddressLookupField] Search failed", error)
          setSuggestions([])
          setSearchError(true)
          setOpen(true)
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            setIsSearching(false)
          }
        })
    }, SEARCH_DEBOUNCE_MS)

    return () => {
      window.clearTimeout(timeoutId)
      controller.abort()
    }
  }, [i18n.language, isFocused, value])

  const handleSelect = (label: string) => {
    skipSearchRef.current = true
    typedWhileFocusedRef.current = false
    onChange(label)
    setSuggestions([])
    setOpen(false)
  }

  const closeSuggestions = () => {
    typedWhileFocusedRef.current = false
    setIsFocused(false)
    setOpen(false)
  }

  const showList = open && !disabled && value.trim().length >= MIN_QUERY_LENGTH

  return (
    <Popover open={showList} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <Input
          id={id}
          value={value}
          onChange={(event) => {
            typedWhileFocusedRef.current = true
            onChange(event.target.value)
          }}
          onFocus={() => setIsFocused(true)}
          onBlur={closeSuggestions}
          placeholder={t("settings.church.addressPlaceholder")}
          autoComplete="off"
          maxLength={maxLength}
          disabled={disabled}
          aria-invalid={ariaInvalid}
          aria-autocomplete="list"
          aria-controls={listId}
          aria-expanded={showList}
          role="combobox"
        />
      </PopoverAnchor>
      <PopoverContent
        align="start"
        sideOffset={4}
        onOpenAutoFocus={(event) => event.preventDefault()}
        className="w-[var(--radix-popover-anchor-width)] p-1"
      >
        <div id={listId} role="listbox" className="max-h-60 overflow-y-auto">
          {isSearching ? (
            <p className="px-2 py-2 text-sm text-muted-foreground">
              {t("settings.church.addressSearching")}
            </p>
          ) : searchError ? (
            <p className="px-2 py-2 text-sm text-muted-foreground">
              {t("settings.church.addressError")}
            </p>
          ) : suggestions.length === 0 ? (
            <p className="px-2 py-2 text-sm text-muted-foreground">
              {t("settings.church.addressEmpty")}
            </p>
          ) : (
            suggestions.map((suggestion) => (
              <button
                key={suggestion.id}
                type="button"
                role="option"
                className={cn(
                  "flex w-full cursor-pointer rounded-md px-2 py-2 text-left text-sm",
                  "hover:bg-accent hover:text-accent-foreground",
                )}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => handleSelect(suggestion.label)}
              >
                {suggestion.label}
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
