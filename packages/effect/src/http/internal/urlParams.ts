import * as Redacted from "../../Redacted.ts"

/** @internal */
export const unwrap = (value: string | Redacted.Redacted): string =>
  typeof value === "string" ? value : Redacted.value(value)

/** @internal */
export const stripSearchAndHash = (url: string): string => {
  const queryIndex = url.indexOf("?")
  const hashIndex = url.indexOf("#")

  if (queryIndex === -1) {
    return hashIndex === -1 ? url : url.slice(0, hashIndex)
  }
  if (hashIndex === -1) {
    return url.slice(0, queryIndex)
  }
  return url.slice(0, Math.min(queryIndex, hashIndex))
}

const originForm = /^\/(?![/\\])/

/** @internal */
export const toPath = (url: string): string => {
  // Origin-form targets and "*" are already paths; absolute URLs can carry credentials.
  if (url === "*" || originForm.test(url)) {
    return stripSearchAndHash(url)
  }
  try {
    return new URL(url, "http://localhost").pathname
  } catch {
    return "<invalid URL>"
  }
}
