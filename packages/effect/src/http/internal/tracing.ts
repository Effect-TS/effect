import type * as Tracer from "../../Tracer.ts"
import * as Headers from "../Headers.ts"

const defaultPorts: Record<string, number> = {
  "http:": 80,
  "https:": 443,
  "ws:": 80,
  "wss:": 443
}

/**
 * Records the `url.*` and `server.*` attributes for a request URL.
 *
 * @internal
 */
export const addUrlAttributes = (
  span: Tracer.Span,
  url: URL
): void => {
  const query = url.search.slice(1)
  span.attribute("url.full", url.toString())
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
