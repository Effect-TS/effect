import type * as HttpClientResponse from "../HttpClientResponse.ts"
import * as UrlParams from "../UrlParams.ts"

type Names = ReadonlyArray<string | RegExp>

// Both maps are kept outside the objects they describe, so structural `Equal`
// and `Hash` don't see them. Neither is keyed on a request, which callers can
// reuse across executions under different names.

// Keyed on the response a runner produced, and on the wrapper `HttpClient.make`
// returns for it. A runner may return the same response to several
// executions, so an entry only grows: errors from that response redact the
// names of every execution that received it.
const responseRedactedNames = new WeakMap<HttpClientResponse.HttpClientResponse, Names>()

// Keyed on an `HttpClientError` reason. Its constructor writes the entry, and
// `HttpClient.make` may only add redaction to it afterwards.
const reasonRedactedUrls = new WeakMap<object, string>()

/**
 * Stores the `UrlParams.CurrentRedactedNames` of the fiber that executed the
 * request of a response, adding them to any names already stored for it.
 *
 * @internal
 */
export const setResponseRedactedNames = (response: HttpClientResponse.HttpClientResponse, names: Names): void => {
  const existing = responseRedactedNames.get(response)
  responseRedactedNames.set(response, existing === undefined ? names : [...existing, ...names])
}

/** @internal */
export const responseUrlParamsRedactedNames = (response: HttpClientResponse.HttpClientResponse): Names | undefined =>
  responseRedactedNames.get(response)

/** @internal */
export const setReasonRedactedUrl = (reason: object, url: string): void => {
  reasonRedactedUrls.set(reason, url)
}

/** @internal */
export const reasonRedactedUrl = (reason: object): string | undefined => reasonRedactedUrls.get(reason)

/**
 * Adds names to the stored URL of a reason. It never removes redaction.
 *
 * @internal
 */
export const addReasonRedactedNames = (reason: object, names: Names): void => {
  const url = reasonRedactedUrls.get(reason)
  if (url !== undefined) reasonRedactedUrls.set(reason, UrlParams.redactUrl(url, names))
}
