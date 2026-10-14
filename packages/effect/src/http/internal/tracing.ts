import { getCurrentFiber } from "../../internal/effect.ts"
import type * as Tracer from "../../Tracer.ts"
import * as Headers from "../Headers.ts"
import * as UrlParams from "../UrlParams.ts"

const defaultPorts: Record<string, number> = {
  "http:": 80,
  "https:": 443,
  "ws:": 80,
  "wss:": 443
}

/**
 * Records the `url.*` and `server.*` attributes for a request URL, redacting
 * userinfo and the values of sensitive query parameters.
 *
 * @internal
 */
export const addUrlAttributes = (
  span: Tracer.Span,
  url: URL,
  redactedNames: ReadonlyArray<string | RegExp>
): void => {
  const query = redactQuery(url.search.slice(1), redactedNames)
  let full = url
  if (url.username !== "" || url.password !== "") {
    full = new URL(url)
    full.username = "REDACTED"
    full.password = "REDACTED"
  }
  span.attribute("url.full", redactUrl(full.toString(), redactedNames))
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

/**
 * Replaces the values of query parameters whose names match `redactedNames`
 * with `REDACTED`, keeping every other part of the query string verbatim.
 *
 * @internal
 */
export const redactQuery = (
  query: string,
  redactedNames: ReadonlyArray<string | RegExp>
): string => {
  if (query === "" || redactedNames.length === 0) return query
  const parts = query.split("&")
  let changed = false
  for (let i = 0; i < parts.length; i++) {
    const index = parts[i].indexOf("=")
    if (index === -1) continue
    const key = parts[i].slice(0, index)
    if (UrlParams.isRedactedName(decodeQueryKey(key), redactedNames)) {
      parts[i] = `${key}=REDACTED`
      changed = true
    }
  }
  return changed ? parts.join("&") : query
}

const decodeQueryKey = (key: string): string => {
  try {
    return decodeURIComponent(key.replace(/\+/g, " "))
  } catch {
    return key
  }
}

/**
 * Redacts sensitive query parameter values in an absolute or relative URL
 * string. Defaults to the current fiber's `UrlParams.CurrentRedactedNames`.
 *
 * @internal
 */
export const redactUrl = (
  url: string,
  redactedNames: ReadonlyArray<string | RegExp> = currentRedactedNames()
): string => {
  const queryStart = url.indexOf("?")
  if (queryStart === -1) return url
  const hashStart = url.indexOf("#")
  if (hashStart !== -1 && hashStart < queryStart) return url
  const queryEnd = hashStart === -1 ? url.length : hashStart
  const query = url.slice(queryStart + 1, queryEnd)
  const redacted = redactQuery(query, redactedNames)
  return redacted === query ? url : url.slice(0, queryStart + 1) + redacted + url.slice(queryEnd)
}

const currentRedactedNames = (): ReadonlyArray<string | RegExp> => {
  const fiber = getCurrentFiber()
  return fiber ? fiber.getRef(UrlParams.CurrentRedactedNames) : UrlParams.CurrentRedactedNames.defaultValue()
}
