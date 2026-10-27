import * as Context from "../../Context.ts"
import { currentFiberTypeId, redact } from "../../Redactable.ts"
import * as Redacted from "../../Redacted.ts"
import type * as HttpClientError from "../HttpClientError.ts"
import type * as HttpClientRequest from "../HttpClientRequest.ts"
import * as UrlParams from "../UrlParams.ts"

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

// secrets written into the URL string itself, following `UrlParams.redactUrl`
const urlSecrets = (url: string): Array<string> => {
  const secrets: Array<string> = []
  try {
    const { password, username } = new URL(url)
    for (const part of [username, password]) secrets.push(part, decode(part, false))
  } catch {
    // a malformed URL can still carry a query
  }
  const queryStart = url.indexOf("?")
  if (queryStart === -1) return secrets
  const hashStart = url.indexOf("#", queryStart)
  const names = currentRedactedNames()
  for (const part of url.slice(queryStart + 1, hashStart === -1 ? undefined : hashStart).split("&")) {
    const index = part.indexOf("=")
    if (index === -1 || !UrlParams.isRedactedName(decode(part.slice(0, index), true), names)) continue
    const value = part.slice(index + 1)
    secrets.push(value, ...queryValueForms(decode(value, true)))
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
