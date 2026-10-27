import * as Context from "../../Context.ts"
import { currentFiberTypeId, redact } from "../../Redactable.ts"
import * as Redacted from "../../Redacted.ts"
import type * as HttpClientError from "../HttpClientError.ts"
import type * as HttpClientRequest from "../HttpClientRequest.ts"
import * as UrlParams from "../UrlParams.ts"
import * as InternalUrlParams from "./urlParams.ts"

// Node, Deno and Bun wordings for a rejected header value
const invalidHeaderValue = /invalid header value|has invalid value/i

const loneSurrogate = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g

// a printed URL encodes lone surrogates as U+FFFD, which `encodeURIComponent` rejects
const queryValueForms = (value: string): Array<string> => {
  const wellFormed = value.replace(loneSurrogate, "\uFFFD")
  return [value, encodeURIComponent(wellFormed), new URLSearchParams([["", wellFormed]]).toString().slice(1)]
}

const decode = (value: string, plusAsSpace: boolean): string => {
  try {
    return decodeURIComponent(plusAsSpace ? value.replace(/\+/g, " ") : value)
  } catch {
    return value
  }
}

const currentRedactedNames = (): ReadonlyArray<string | RegExp> =>
  Context.get((globalThis as any)[currentFiberTypeId]?.context ?? Context.empty(), UrlParams.CurrentRedactedNames)

// the percent-encoded form a serialized URL prints; the setter never throws
const serializeUserinfo = (part: string): string => {
  const url = new URL("http://localhost")
  url.username = part
  return url.username
}

// the query-encoded form a serialized URL prints; the setter never throws
const serializeQueryValue = (value: string): string => {
  const url = new URL("http://localhost")
  url.search = `?k=${value}`
  return url.search.slice(3)
}

// the URL parser drops tabs and newlines and trims leading and trailing spaces and C0 controls
const normalizeUrl = (url: string): string => {
  const stripped = url.replace(/[\t\n\r]/g, "")
  let start = 0
  let end = stripped.length
  while (start < end && stripped.charCodeAt(start) <= 32) start++
  while (end > start && stripped.charCodeAt(end - 1) <= 32) end--
  return stripped.slice(start, end)
}

// secrets written into the URL string itself, within the same bounds as `UrlParams.redactUrl`
const urlSecrets = (url: string): Array<string> => {
  const secrets: Array<string> = []
  const names = currentRedactedNames()
  for (const form of [url, normalizeUrl(url)]) {
    const userinfo = InternalUrlParams.userinfoRange(form)
    if (userinfo !== undefined) {
      const text = form.slice(userinfo[0], userinfo[1])
      const colon = text.indexOf(":")
      for (const part of colon === -1 ? [text] : [text.slice(0, colon), text.slice(colon + 1)]) {
        secrets.push(part, decode(part, false), serializeUserinfo(part))
      }
    }
    const query = InternalUrlParams.queryRange(form)
    if (query === undefined) continue
    for (const part of form.slice(query[0], query[1]).split("&")) {
      const index = part.indexOf("=")
      if (index === -1 || !UrlParams.isRedactedName(decode(part.slice(0, index), true), names)) continue
      const value = part.slice(index + 1)
      secrets.push(value, serializeQueryValue(value), ...queryValueForms(decode(value, true)))
    }
  }
  return secrets
}

/**
 * The sensitive header and query values of a request, in the forms they can
 * take in an error message, longest first so that a secret containing another
 * is replaced whole.
 */
const requestSecrets = (request: HttpClientRequest.HttpClientRequest): Array<string> => {
  const secrets: Array<string> = []
  const headers = redact(request.headers) as Record<string, string | Redacted.Redacted>
  for (const name in headers) {
    if (!Redacted.isRedacted(headers[name])) continue
    // `fetch` prints a rejected value trimmed, and `Authorization` credentials can appear without the scheme
    const value = request.headers[name].trim()
    secrets.push(value, value.replace(/^\S+\s+/, ""))
  }
  const params = (redact(request.urlParams) as { readonly params: Record<string, string | Redacted.Redacted> }).params
  for (const [name, value] of request.urlParams) {
    // `params` keeps only the last value of a repeated name, so check explicit redaction first
    const secret = Redacted.isRedacted(value)
      ? Redacted.value(value)
      : Redacted.isRedacted(params[name])
      ? value
      : undefined
    if (secret !== undefined) secrets.push(...queryValueForms(secret))
  }
  secrets.push(...urlSecrets(request.url))
  return secrets.filter((secret) => secret !== "").sort((a, b) => b.length - a.length)
}

/**
 * Node's `fetch` keeps the reason one level below `TypeError: fetch failed`,
 * and a refused `localhost` connection is an `AggregateError` with an empty
 * message that keeps the reasons in `errors`.
 */
const causeMessage = (cause: Error): string => {
  const message = cause.message === "" && cause instanceof AggregateError
    ? cause.errors.flatMap((error) => error instanceof Error && error.message !== "" ? [error.message] : []).join(", ")
    : cause.message
  // a rejected header value can come from outside the request, such as `FetchHttpClient.RequestInit`
  return invalidHeaderValue.test(message) ? "Invalid HTTP header value" : message
}

const describeCause = (cause: unknown, secrets: ReadonlyArray<string>): string | undefined => {
  const messages: Array<string> = []
  for (let depth = 0; depth < 3 && cause instanceof Error; depth++, cause = cause.cause) {
    const message = causeMessage(cause)
    if (message !== "") messages.push(message)
  }
  if (messages.length === 0) return undefined
  return secrets.reduce((description, secret) => description.replaceAll(secret, "<redacted>"), messages.join(": "))
}

export const describe = (error: HttpClientError.RequestError): string | undefined =>
  describeCause(error.cause, requestSecrets(error.request))
