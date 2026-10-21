/**
 * Implemented by client responses that are backed by a Web `Response`.
 * Wrappers forward it to the response they wrap.
 *
 * @internal
 */
export const WebSourceTypeId = "~effect/http/HttpClientResponse/WebSource"

/**
 * @internal
 */
export interface WebSource {
  readonly [WebSourceTypeId]: () => globalThis.Response | undefined
}

/**
 * @internal
 */
export const getWebSource = (self: object): globalThis.Response | undefined =>
  (self as Partial<WebSource>)[WebSourceTypeId]?.()
