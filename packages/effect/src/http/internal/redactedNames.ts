import type * as HttpClientRequest from "../HttpClientRequest.ts"

type Names = ReadonlyArray<string | RegExp>

const urlParamsKey = Symbol("effect/http/HttpClientRequest/urlParamsRedactedNames")
const headersKey = Symbol("effect/http/HttpClientRequest/headersRedactedNames")

/**
 * Stores the redaction names of the fiber that executes a request on the copy
 * made for that execution. The properties are non-enumerable, so equality,
 * inspection and serialization keys are unchanged.
 *
 * @internal
 */
export const setRequestRedactedNames = (
  request: HttpClientRequest.HttpClientRequest,
  urlParams: Names,
  headers: Names
): void => {
  Object.defineProperty(request, urlParamsKey, { value: urlParams })
  Object.defineProperty(request, headersKey, { value: headers })
}

/** @internal */
export const requestUrlParamsRedactedNames = (request: HttpClientRequest.HttpClientRequest): Names | undefined =>
  (request as any)[urlParamsKey]

/** @internal */
export const requestHeadersRedactedNames = (request: HttpClientRequest.HttpClientRequest): Names | undefined =>
  (request as any)[headersKey]
