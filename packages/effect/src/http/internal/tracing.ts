import { getStackTraceLimit, setStackTraceLimit } from "../../internal/stackTraceLimit.ts"
import type * as Tracer from "../../Tracer.ts"

// HTTP methods known to the OpenTelemetry HTTP semantic conventions.
const knownMethods: ReadonlySet<string> = new Set([
  "CONNECT",
  "DELETE",
  "GET",
  "HEAD",
  "OPTIONS",
  "PATCH",
  "POST",
  "PUT",
  "QUERY",
  "TRACE"
])

/** @internal */
export const isKnownMethod = (method: string): boolean => knownMethods.has(method)

/** @internal */
export const spanNameMethod = (method: string): string => isKnownMethod(method) ? method : "HTTP"

/** @internal */
export const setMethodAttributes = (span: Tracer.Span, method: string): void => {
  if (isKnownMethod(method)) {
    span.attribute("http.request.method", method)
  } else {
    span.attribute("http.request.method", "_OTHER")
    span.attribute("http.request.method_original", method)
  }
}

/**
 * Query parameters whose values are redacted. The semantic conventions list
 * `AWSAccessKeyId`, `Signature`, `sig` and `X-Goog-Signature`; the `X-Amz-*`
 * keys extend that list to cover AWS SigV4 presigned URLs.
 */
const sensitiveQueryKeys: ReadonlySet<string> = new Set([
  "AWSAccessKeyId",
  "Signature",
  "sig",
  "X-Amz-Credential",
  "X-Amz-Security-Token",
  "X-Amz-Signature",
  "X-Goog-Signature"
])

/** @internal */
export const redactQuery = (query: string): string => {
  let redacted = false
  const parts = query.split("&")
  for (let i = 0; i < parts.length; i++) {
    const index = parts[i].indexOf("=")
    if (index === -1) continue
    const key = parts[i].slice(0, index)
    if (sensitiveQueryKeys.has(decodeQueryKey(key))) {
      parts[i] = `${key}=REDACTED`
      redacted = true
    }
  }
  return redacted ? parts.join("&") : query
}

const decodeQueryKey = (key: string): string => {
  if (!key.includes("%") && !key.includes("+")) return key
  try {
    return decodeURIComponent(key.replace(/\+/g, " "))
  } catch {
    return key
  }
}

/** @internal */
export const redactUrl = (url: URL, redactedQuery: string): string => {
  const query = url.search.slice(1)
  const hasCredentials = url.username !== "" || url.password !== ""
  if (!hasCredentials && redactedQuery === query) {
    return url.toString()
  }
  const copy = new URL(url.toString())
  if (hasCredentials) {
    copy.username = "REDACTED"
    copy.password = "REDACTED"
  }
  if (redactedQuery !== query) {
    copy.search = redactedQuery
  }
  return copy.toString()
}

/** @internal */
export const defaultPort = (protocol: string): number | undefined => {
  switch (protocol) {
    case "http:":
    case "ws:":
      return 80
    case "https:":
    case "wss:":
      return 443
    default:
      return undefined
  }
}

/** @internal */
export const setHeaderAttributes = (
  span: Tracer.Span,
  phase: "request" | "response",
  headers: Readonly<Record<string, string>>,
  filter: (headerName: string, phase: "request" | "response") => boolean,
  isRedacted: (headerName: string) => boolean
): void => {
  for (const name in headers) {
    if (!filter(name, phase)) continue
    span.attribute(`http.${phase}.header.${name}`, [isRedacted(name) ? "<redacted>" : headers[name]])
  }
}

/** @internal */
export const serverAddress = (url: URL): string =>
  url.hostname.startsWith("[") && url.hostname.endsWith("]") ? url.hostname.slice(1, -1) : url.hostname

/**
 * Builds an error without capturing a stack trace, for span exits that only
 * describe a response status.
 *
 * @internal
 */
export const withoutStackTrace = <A>(f: () => A): A => {
  const stackTraceLimit = getStackTraceLimit()
  setStackTraceLimit(0)
  try {
    return f()
  } finally {
    setStackTraceLimit(stackTraceLimit)
  }
}
