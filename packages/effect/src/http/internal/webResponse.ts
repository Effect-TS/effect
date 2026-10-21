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

/**
 * Implemented by client responses that keep `set-cookie` headers apart from
 * `cookies`, so converting them keeps every cookie without guessing which
 * header values `cookies` repeats. Wrappers forward it to the response they wrap.
 *
 * @internal
 */
export const SetCookieTypeId = "~effect/http/HttpClientResponse/SetCookie"

/**
 * @internal
 */
export interface SetCookie {
  readonly [SetCookieTypeId]: () => ReadonlyArray<string> | undefined
}

/**
 * @internal
 */
export const getSetCookie = (self: object): ReadonlyArray<string> | undefined =>
  (self as Partial<SetCookie>)[SetCookieTypeId]?.()
