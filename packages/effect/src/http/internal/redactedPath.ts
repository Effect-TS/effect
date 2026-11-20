import { getClosingParenthensePosition } from "../FindMyWay/internal/router.ts"
import type { HttpServerRequest } from "../HttpServerRequest.ts"
import { stripSearchAndHash, toPath } from "./urlParams.ts"

const STATIC = "s"
const PARAM = "p"
const REDACTED = "r"

/**
 * A matched path with the kind of each character of `text` in `kinds`: route
 * pattern text, a param value, or a redacted param value.
 *
 * @internal
 */
export interface RedactedPath {
  readonly text: string
  readonly kinds: string
}

/**
 * A route pattern split into static text and params.
 *
 * @internal
 */
export type Template = ReadonlyArray<string | { readonly name: string; readonly redacted: boolean }>

/**
 * Splits a route pattern into a template, following the pattern grammar of
 * `FindMyWay`.
 *
 * @internal
 */
export const compile = (path: string, redactedParams: ReadonlyArray<string>): Template => {
  const parts: Array<string | { name: string; redacted: boolean }> = []
  // FindMyWay assigns every regex capture to the params in order, so a nested
  // capture shifts values onto the wrong names. Then every value is redacted.
  let ambiguous = false
  let text = ""
  for (let i = 0; i < path.length; i++) {
    const char = path[i]
    if (char === ":" && path[i + 1] === ":") {
      text += ":"
      i++
      continue
    } else if (char !== ":" && char !== "*") {
      text += char
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
    if (text !== "") parts.push(text)
    text = ""
    parts.push({ name, redacted: redactedParams.includes(name) })
    if (char === "*") continue
    if (path[end] === "(") {
      const close = getClosingParenthensePosition(path, end)
      // FindMyWay has already compiled the constraint, so it is a valid regex.
      ambiguous ||= new RegExp(path.slice(end + 1, close) + "|").exec("")!.length > 1
      i = close
    } else {
      i = path[end] === "?" ? end : end - 1
    }
  }
  if (text !== "") parts.push(text)
  return ambiguous ? parts.map((part) => typeof part === "string" ? part : { name: part.name, redacted: true }) : parts
}

/**
 * Renders the path matched by a template.
 *
 * @internal
 */
export const render = (template: Template, params: Readonly<Record<string, string | undefined>>): RedactedPath => {
  let text = ""
  let kinds = ""
  for (const part of template) {
    if (typeof part === "string") {
      text += part
      kinds += STATIC.repeat(part.length)
      continue
    }
    const value = params[part.name]
    if (value === undefined) {
      // An absent optional param or wildcard is last, and drops its segment.
      const slash = Math.max(text.lastIndexOf("/"), 0)
      text = text.slice(0, slash)
      kinds = kinds.slice(0, slash)
      break
    }
    const encoded = part.name === "*" ? value.split("/").map(encodeSegment).join("/") : encodeSegment(value)
    text += encoded
    kinds += (part.redacted ? REDACTED : PARAM).repeat(encoded.length)
  }
  return text.startsWith("/") ? { text, kinds } : { text: "/" + text, kinds: STATIC + kinds }
}

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
    return { text: prefix + next.text, kinds: PARAM.repeat(prefix.length) + next.kinds }
  }
  if (!previous.text.endsWith(next.text)) {
    // The paths cannot be aligned, so redact every param value.
    return { text: previous.text, kinds: previous.kinds.replaceAll(PARAM, REDACTED) }
  }
  const offset = previous.text.length - next.text.length
  let kinds = previous.kinds.slice(0, offset)
  for (let i = 0; i < next.kinds.length; i++) {
    kinds += next.kinds[i] === REDACTED ? REDACTED : previous.kinds[offset + i]
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
  let last = 0
  for (const run of path.kinds.matchAll(/r+/g)) {
    out += path.text.slice(last, run.index) + "REDACTED"
    last = run.index + run[0].length
  }
  return out + path.text.slice(last)
}
