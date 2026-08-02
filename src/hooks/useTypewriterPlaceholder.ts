import { useEffect, useState } from "react"

type UseTypewriterPlaceholderOptions = {
  typingSpeedMs?: number
  deletingSpeedMs?: number
  pauseMs?: number
}

export function useTypewriterPlaceholder(
  words: string[],
  options?: UseTypewriterPlaceholderOptions,
): string {
  const typingSpeedMs = options?.typingSpeedMs ?? 80
  const deletingSpeedMs = options?.deletingSpeedMs ?? 40
  const pauseMs = options?.pauseMs ?? 1500

  const [text, setText] = useState("")
  const [wordIndex, setWordIndex] = useState(0)
  const [isDeleting, setIsDeleting] = useState(false)

  const wordsKey = words.join("\u0001")

  // Reset when the word list changes (e.g. language switch).
  useEffect(() => {
    setText("")
    setWordIndex(0)
    setIsDeleting(false)
  }, [wordsKey])

  useEffect(() => {
    if (words.length === 0) {
      return
    }

    const currentWord = words[wordIndex % words.length] ?? ""
    let timeoutId: ReturnType<typeof setTimeout>

    if (!isDeleting && text === currentWord) {
      timeoutId = setTimeout(() => {
        setIsDeleting(true)
      }, pauseMs)
    } else if (isDeleting && text.length === 0) {
      timeoutId = setTimeout(() => {
        setIsDeleting(false)
        setWordIndex((index) => (index + 1) % words.length)
      }, deletingSpeedMs)
    } else if (isDeleting) {
      timeoutId = setTimeout(() => {
        setText((current) => current.slice(0, -1))
      }, deletingSpeedMs)
    } else {
      timeoutId = setTimeout(() => {
        setText(currentWord.slice(0, text.length + 1))
      }, typingSpeedMs)
    }

    return () => {
      clearTimeout(timeoutId)
    }
  }, [text, isDeleting, wordIndex, words, typingSpeedMs, deletingSpeedMs, pauseMs])

  return text
}
