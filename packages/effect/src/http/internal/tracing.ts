import { getStackTraceLimit, setStackTraceLimit } from "../../internal/stackTraceLimit.ts"
import type * as Tracer from "../../Tracer.ts"
import * as Headers from "../Headers.ts"

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
export const spanName = (method: string): string => knownMethods.has(method) ? method : "HTTP"

/** @internal */
export const setMethodAttributes = (span: Tracer.Span, method: string): void => {
  if (knownMethods.has(method)) {
    span.attribute("http.request.method", method)
  } else {
    span.attribute("http.request.method", "_OTHER")
    span.attribute("http.request.method_original", method)
  }
}

/** @internal */
export const setHeaderAttributes = (
  span: Tracer.Span,
  phase: "request" | "response",
  headers: Headers.Headers,
  filter: (name: string, phase: "request" | "response") => boolean,
  redactedNames: ReadonlyArray<string | RegExp>
): void => {
  for (const name in headers) {
    if (!filter(name, phase)) continue
    span.attribute(`http.${phase}.header.${name}`, [
      Headers.isRedactedName(name, redactedNames) ? "<redacted>" : headers[name]
    ])
  }
}

// The semantic conventions list `AWSAccessKeyId`, `Signature`, `sig` and
// `X-Goog-Signature`. The `X-Amz-*` keys cover AWS SigV4 presigned URLs.
const sensitiveQueryKeys: ReadonlySet<string> = new Set([
  "AWSAccessKeyId",
  "Signature",
  "sig",
  "X-Amz-Credential",
  "X-Amz-Security-Token",
  "X-Amz-Signature",
  "X-Goog-Signature"
])

const decodeQueryKey = (key: string): string => {
  if (!key.includes("%")) return key
  try {
    return decodeURIComponent(key)
  } catch {
    return key
  }
}

/** @internal */
export const redactQuery = (query: string): string =>
  query.replace(
    /(^|&)([^&=]+)=[^&]*/g,
    (param, separator: string, key: string) =>
      sensitiveQueryKeys.has(decodeQueryKey(key)) ? `${separator}${key}=REDACTED` : param
  )

/** @internal */
export const setUrlAttributes = (span: Tracer.Span, url: URL): void => {
  const query = url.search.slice(1)
  const redactedQuery = redactQuery(query)
  const hasCredentials = url.username !== "" || url.password !== ""
  if (hasCredentials || redactedQuery !== query) {
    url = new URL(url)
    if (hasCredentials) {
      url.username = "REDACTED"
      url.password = "REDACTED"
    }
    if (redactedQuery !== query) {
      url.search = redactedQuery
    }
  }
  span.attribute("url.full", url.toString())
  span.attribute("url.path", url.pathname)
  span.attribute("url.scheme", url.protocol.slice(0, -1))
  if (redactedQuery !== "") {
    span.attribute("url.query", redactedQuery)
  }
}

/**
 * Span exits for error statuses only describe the response, so their errors
 * skip stack trace capture.
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
