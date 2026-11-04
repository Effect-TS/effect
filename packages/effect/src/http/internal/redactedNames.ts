import type * as HttpClientRequest from "../HttpClientRequest.ts"

type Names = ReadonlyArray<string | RegExp>

interface RedactedNames {
  readonly urlParams: Names
  readonly headers: Names
}

// Kept outside the request, so structural `Equal` and `Hash` don't see it.
// Each entry is keyed on the copy `HttpClient.make` creates for a single
// execution and is written once, before anything else can reference the copy.
// Executing that copy again makes another copy, so an entry never changes.
const requestRedactedNames = new WeakMap<HttpClientRequest.HttpClientRequest, RedactedNames>()

/**
 * Stores the redaction names of the fiber that executes a request on the copy
 * made for that execution. Only call it on a copy that was just created.
 *
 * @internal
 */
export const setRequestRedactedNames = (
  request: HttpClientRequest.HttpClientRequest,
  urlParams: Names,
  headers: Names
): void => {
  requestRedactedNames.set(request, { urlParams, headers })
}

/** @internal */
export const requestUrlParamsRedactedNames = (request: HttpClientRequest.HttpClientRequest): Names | undefined =>
  requestRedactedNames.get(request)?.urlParams

/** @internal */
export const requestHeadersRedactedNames = (request: HttpClientRequest.HttpClientRequest): Names | undefined =>
  requestRedactedNames.get(request)?.headers
