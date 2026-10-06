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

// Query parameters whose values the semantic conventions ask to redact.
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
    const key = index === -1 ? parts[i] : parts[i].slice(0, index)
    if (index !== -1 && sensitiveQueryKeys.has(key)) {
      parts[i] = `${key}=REDACTED`
      redacted = true
    }
  }
  return redacted ? parts.join("&") : query
}

/** @internal */
export const redactUrl = (url: URL): string => {
  const query = url.search.slice(1)
  const redactedQuery = query === "" ? query : redactQuery(query)
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
