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

const authorityStart = /^(?:(https?|ftp|wss?):[/\\]*|[a-z][a-z\d+.-]*:\/\/|[/\\]{2,})/i
const specialAuthorityEnd = /[/\\?#]/
const authorityEnd = /[/?#]/

/**
 * The `[start, end)` offsets of the userinfo in a URL, without requiring the
 * URL to parse. Normalizes only to locate it; offsets keep the original spelling.
 *
 * @internal
 */
export const userinfoRange = (url: string): readonly [start: number, end: number] | undefined => {
  if (!url.includes("@")) return undefined
  let normalized = ""
  const offsets: Array<number> = []
  for (let i = 0; i < url.length; i++) {
    const code = url.charCodeAt(i)
    if (code === 9 || code === 10 || code === 13 || (normalized === "" && code <= 32)) continue
    normalized += url[i]
    offsets.push(i)
  }
  const authority = authorityStart.exec(normalized)
  if (authority === null) return undefined
  const start = authority[0].length
  const special = authority[1] !== undefined || !authority[0].includes(":")
  const rest = normalized.slice(start)
  const end = rest.search(special ? specialAuthorityEnd : authorityEnd)
  const userinfoEnd = (end === -1 ? rest : rest.slice(0, end)).lastIndexOf("@")
  return userinfoEnd === -1 ? undefined : [offsets[start], offsets[start + userinfoEnd]]
}

/**
 * The `[start, end)` offsets of the query in a URL, excluding `?` and any
 * fragment. A `?` inside the fragment does not start a query.
 *
 * @internal
 */
export const queryRange = (url: string): readonly [start: number, end: number] | undefined => {
  const queryStart = url.indexOf("?")
  if (queryStart === -1) return undefined
  const hashStart = url.indexOf("#")
  if (hashStart !== -1 && hashStart < queryStart) return undefined
  return [queryStart + 1, hashStart === -1 ? url.length : hashStart]
}
