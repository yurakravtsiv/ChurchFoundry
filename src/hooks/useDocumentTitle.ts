export function useDocumentTitle(title: string) {
  if (typeof document !== "undefined") {
    document.title = title
  }
}
