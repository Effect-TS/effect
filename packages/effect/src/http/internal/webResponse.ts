/**
 * Optional methods that let `HttpClientResponse.toWeb` read what the public
 * `HttpClientResponse` interface does not expose. Wrappers forward each one to
 * the response they wrap.
 */

/**
 * Returns the original Web `Response` of a fetch-backed response.
 *
 * @internal
 */
export const WebSourceSymbol = "~effect/http/HttpClientResponse/WebSource"

/**
 * @internal
 */
export interface WebSource {
  readonly [WebSourceSymbol]: () => globalThis.Response | undefined
}

/**
 * @internal
 */
export const getWebSource = (self: object): globalThis.Response | undefined =>
  (self as Partial<WebSource>)[WebSourceSymbol]?.()

/**
 * Returns every `set-cookie` value of a response whose `cookies` are kept
 * apart from its `set-cookie` header, so none has to be guessed from names.
 *
 * @internal
 */
export const SetCookieSymbol = "~effect/http/HttpClientResponse/SetCookie"

/**
 * @internal
 */
export interface SetCookie {
  readonly [SetCookieSymbol]: () => ReadonlyArray<string> | undefined
}

/**
 * @internal
 */
export const getSetCookie = (self: object): ReadonlyArray<string> | undefined =>
  (self as Partial<SetCookie>)[SetCookieSymbol]?.()
