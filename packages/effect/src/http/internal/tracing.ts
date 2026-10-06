import type * as Tracer from "../../Tracer.ts"
import * as Headers from "../Headers.ts"

const decodeName = (name: string): string => {
  if (!name.includes("%")) return name
  try {
    return decodeURIComponent(name)
  } catch {
    return name
  }
}

/** @internal */
export const redactQuery = (query: string, redactedNames: ReadonlyArray<string | RegExp>): string => {
  if (query === "") return query
  const params = query.split("&")
  let redacted = false
  for (let i = 0; i < params.length; i++) {
    const param = params[i]
    const index = param.indexOf("=")
    const name = index === -1 ? param : param.slice(0, index)
    if (Headers.isRedactedName(decodeName(name), redactedNames)) {
      params[i] = `${name}=REDACTED`
      redacted = true
    }
  }
  return redacted ? params.join("&") : query
}

const defaultPorts: Record<string, number> = {
  "http:": 80,
  "https:": 443,
  "ws:": 80,
  "wss:": 443
}

/**
 * Records the `url.*` and `server.*` attributes for a request URL, returning
 * the redacted `url.full` value.
 *
 * @internal
 */
export const addUrlAttributes = (
  span: Tracer.Span,
  url: URL,
  redactedNames: ReadonlyArray<string | RegExp>
): string => {
  const query = redactQuery(url.search.slice(1), redactedNames)
  const credentials = url.username !== "" || url.password !== "" ? "REDACTED:REDACTED@" : ""
  const full = `${url.protocol}//${credentials}${url.host}${url.pathname}${query === "" ? "" : `?${query}`}${url.hash}`
  span.attribute("url.full", full)
  span.attribute("url.path", url.pathname)
  if (query !== "") {
    span.attribute("url.query", query)
  }
  span.attribute("url.scheme", url.protocol.slice(0, -1))
  if (url.hostname !== "") {
    // URL keeps IPv6 brackets in the hostname, but the semantic conventions do not.
    span.attribute("server.address", url.hostname.startsWith("[") ? url.hostname.slice(1, -1) : url.hostname)
    const port = url.port === "" ? defaultPorts[url.protocol] : Number(url.port)
    if (port !== undefined) {
      span.attribute("server.port", port)
    }
  }
  return full
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
