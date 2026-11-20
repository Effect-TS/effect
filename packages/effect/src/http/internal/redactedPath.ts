import { getClosingParenthensePosition } from "../FindMyWay/internal/router.ts"
import type { HttpServerRequest } from "../HttpServerRequest.ts"
import { stripSearchAndHash, toPath } from "./urlParams.ts"

const STATIC = 0
const PARAM = 1
const REDACTED = 2

/**
 * A matched path with the kind of each character of `text`: route pattern
 * text, a param value, or a redacted param value.
 *
 * @internal
 */
export interface RedactedPath {
  readonly text: string
  readonly kinds: ReadonlyArray<number>
}

/**
 * Renders a matched path from the route pattern, following the pattern grammar
 * of `FindMyWay`, and marks the values of the listed params as redacted.
 *
 * @internal
 */
export const render = (
  path: string,
  params: Readonly<Record<string, string | undefined>>,
  redactedParams: ReadonlyArray<string>
): RedactedPath => {
  let text = ""
  let kinds: Array<number> = []
  // FindMyWay assigns every regex capture to the params in order, so a nested
  // capture shifts values onto the wrong names. Then every value is redacted.
  let ambiguous = false
  const push = (value: string, kind: number) => {
    text += value
    for (let i = 0; i < value.length; i++) kinds.push(kind)
  }
  for (let i = 0; i < path.length; i++) {
    const char = path[i]
    if (char === ":" && path[i + 1] === ":") {
      push(":", STATIC)
      i++
      continue
    } else if (char !== ":" && char !== "*") {
      push(char, STATIC)
      continue
    }
    let end = i + 1
    if (char === ":") {
      while (
        end < path.length && !"(-./".includes(path[end]) &&
        !(path[end] === "?" && (end === path.length - 1 || path[end + 1] === "/"))
      ) end++
    }
    const name = char === "*" ? "*" : path.slice(i + 1, end)
    const value = params[name]
    if (value === undefined) {
      // An absent optional param or wildcard is last, and drops its segment.
      const slash = Math.max(text.lastIndexOf("/"), 0)
      text = text.slice(0, slash)
      kinds = kinds.slice(0, slash)
      break
    }
    push(
      char === "*" ? value.split("/").map(encodeSegment).join("/") : encodeSegment(value),
      redactedParams.includes(name) ? REDACTED : PARAM
    )
    if (char === "*") continue
    if (path[end] === "(") {
      const close = getClosingParenthensePosition(path, end)
      ambiguous ||= hasCapture(path.slice(end + 1, close))
      i = close
    } else {
      i = path[end] === "?" ? end : end - 1
    }
  }
  if (ambiguous) kinds = kinds.map((kind) => kind === PARAM ? REDACTED : kind)
  return text.startsWith("/") ? { text, kinds } : { text: "/" + text, kinds: [STATIC, ...kinds] }
}

// Over-matches character classes such as `[(]`, which only redacts more.
const hasCapture = (regex: string): boolean => /\((?!\?(?:[:=!]|<[=!]))/.test(regex.replace(/\\./g, ""))

const encodeSegment = (segment: string): string => {
  try {
    return encodeURIComponent(segment)
  } catch {
    return segment
  }
}

/**
 * Combines the path rendered by a router with the one already recorded for the
 * request, so a router mounted inside another route only adds redactions.
 *
 * @internal
 */
export const combine = (
  previous: RedactedPath | undefined,
  next: RedactedPath,
  request: HttpServerRequest
): RedactedPath => {
  if (previous === undefined) {
    // A mounted router sees the URL without the mount prefix, so add it back.
    const local = stripSearchAndHash(request.url)
    const original = toPath(request.originalUrl)
    if (local === original || !original.endsWith(local)) return next
    const prefix = original.slice(0, original.length - local.length)
    return { text: prefix + next.text, kinds: [...prefix].map(() => PARAM).concat(next.kinds) }
  }
  const kinds = previous.kinds.slice()
  const offset = previous.text.length - next.text.length
  if (offset >= 0 && previous.text.endsWith(next.text)) {
    for (let i = 0; i < next.kinds.length; i++) {
      if (next.kinds[i] === REDACTED) kinds[offset + i] = REDACTED
    }
  } else {
    // The paths cannot be aligned, so redact every param value.
    for (let i = 0; i < kinds.length; i++) {
      if (kinds[i] === PARAM) kinds[i] = REDACTED
    }
  }
  return { text: previous.text, kinds }
}

/**
 * Formats a path, replacing each run of redacted characters with `REDACTED`.
 *
 * @internal
 */
export const format = (path: RedactedPath): string => {
  let out = ""
  for (let i = 0; i < path.text.length; i++) {
    if (path.kinds[i] !== REDACTED) out += path.text[i]
    else if (path.kinds[i - 1] !== REDACTED) out += "REDACTED"
  }
  return out
}
