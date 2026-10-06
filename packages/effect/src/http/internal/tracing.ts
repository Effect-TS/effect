import type * as Tracer from "../../Tracer.ts"
import * as Headers from "../Headers.ts"

// Methods defined by the OpenTelemetry HTTP semantic conventions.
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
export const addMethodAttributes = (span: Tracer.Span, method: string): void => {
  if (knownMethods.has(method)) {
    span.attribute("http.request.method", method)
  } else {
    span.attribute("http.request.method", "_OTHER")
    span.attribute("http.request.method_original", method)
  }
}

// Query parameters whose values are redacted by the OpenTelemetry URL
// semantic conventions.
const signedQueryParams: ReadonlySet<string> = new Set([
  "AWSAccessKeyId",
  "Signature",
  "sig",
  "X-Goog-Signature"
])

const decodeName = (name: string): string => {
  if (!name.includes("%")) return name
  try {
    return decodeURIComponent(name)
  } catch {
    return name
  }
}

/** @internal */
export const redactQuery = (query: string): string => {
  if (query === "") return query
  const params = query.split("&")
  let redacted = false
  for (let i = 0; i < params.length; i++) {
    const param = params[i]
    const index = param.indexOf("=")
    const name = index === -1 ? param : param.slice(0, index)
    if (signedQueryParams.has(decodeName(name))) {
      params[i] = `${name}=REDACTED`
      redacted = true
    }
  }
  return redacted ? params.join("&") : query
}

/** @internal */
export const addUrlAttributes = (span: Tracer.Span, url: URL): string => {
  const query = redactQuery(url.search.slice(1))
  const credentials = url.username !== "" || url.password !== "" ? "REDACTED:REDACTED@" : ""
  const full = `${url.protocol}//${credentials}${url.host}${url.pathname}${query === "" ? "" : `?${query}`}${url.hash}`
  span.attribute("url.full", full)
  span.attribute("url.path", url.pathname)
  if (query !== "") {
    span.attribute("url.query", query)
  }
  span.attribute("url.scheme", url.protocol.slice(0, -1))
  return full
}

const defaultPorts: Record<string, number> = {
  http: 80,
  https: 443,
  ws: 80,
  wss: 443
}

/** @internal */
export const addServerAttributes = (
  span: Tracer.Span,
  hostname: string,
  port: string,
  scheme: string
): void => {
  if (hostname === "") return
  span.attribute(
    "server.address",
    hostname.startsWith("[") && hostname.endsWith("]") ? hostname.slice(1, -1) : hostname.toLowerCase()
  )
  const portNumber = port === "" ? defaultPorts[scheme] : Number(port)
  if (portNumber !== undefined && Number.isInteger(portNumber)) {
    span.attribute("server.port", portNumber)
  }
}

/** @internal */
export const addHostAttributes = (span: Tracer.Span, host: string, scheme: string): void => {
  let hostname = host
  let port = ""
  if (host.startsWith("[")) {
    const end = host.indexOf("]")
    if (end === -1) return
    hostname = host.slice(0, end + 1)
    if (host[end + 1] === ":") {
      port = host.slice(end + 2)
    }
  } else {
    const index = host.lastIndexOf(":")
    if (index !== -1) {
      hostname = host.slice(0, index)
      port = host.slice(index + 1)
    }
  }
  addServerAttributes(span, hostname, port, scheme)
}

/** @internal */
export const addHeaderAttributes = (
  span: Tracer.Span,
  phase: "request" | "response",
  headers: Headers.Headers,
  filter: (headerName: string, phase: "request" | "response") => boolean,
  redactedNames: ReadonlyArray<string | RegExp>
): void => {
  for (const name in headers) {
    if (!filter(name, phase)) continue
    span.attribute(
      `http.${phase}.header.${name}`,
      Headers.isRedactedName(name, redactedNames) ? "<redacted>" : headers[name]
    )
  }
}
