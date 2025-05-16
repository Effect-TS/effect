/**
 * @since 1.0.0
 */
import * as Cause from "effect/Cause"
import * as Either from "effect/Either"
import { dual } from "effect/Function"
import * as Redacted from "effect/Redacted"
import * as UrlParams from "./UrlParams.js"

/**
 * Parses a URL string into a `URL` object, returning an `Either` type for safe
 * error handling.
 *
 * **Details**
 *
 * This function converts a string into a `URL` object, enabling safe URL
 * parsing with built-in error handling. If the string is invalid or fails to
 * parse, this function does not throw an error; instead, it wraps the error in
 * a `IllegalArgumentException` and returns it as the `Left` value of an
 * `Either`. The `Right` value contains the successfully parsed `URL`.
 *
 * An optional `base` parameter can be provided to resolve relative URLs. If
 * specified, the function interprets the input `url` as relative to this
 * `base`. This is especially useful when dealing with URLs that might not be
 * fully qualified.
 *
 * **Example**
 *
 * ```ts
 * import { Url } from "@effect/platform"
 * import { Either } from "effect"
 *
 * // Parse an absolute URL
 * //
 * //      ┌─── Either<URL, IllegalArgumentException>
 * //      ▼
 * const parsed = Url.fromString("https://example.com/path")
 *
 * if (Either.isRight(parsed)) {
 *   console.log("Parsed URL:", parsed.right.toString())
 * } else {
 *   console.log("Error:", parsed.left.message)
 * }
 * // Output: Parsed URL: https://example.com/path
 *
 * // Parse a relative URL with a base
 * const relativeParsed = Url.fromString("/relative-path", "https://example.com")
 *
 * if (Either.isRight(relativeParsed)) {
 *   console.log("Parsed relative URL:", relativeParsed.right.toString())
 * } else {
 *   console.log("Error:", relativeParsed.left.message)
 * }
 * // Output: Parsed relative URL: https://example.com/relative-path
 * ```
 *
 * @since 1.0.0
 * @category Constructors
 */
export const fromString: {
  (url: string, base?: string | URL | undefined): Either.Either<URL, Cause.IllegalArgumentException>
} = (url, base) =>
  Either.try({
    try: () => new URL(url, base),
    catch: (cause) =>
      new Cause.IllegalArgumentException(cause instanceof globalThis.Error ? cause.message : "Invalid input")
  })

/**
 * This function clones the original `URL` object and applies a callback to the
 * clone, allowing multiple updates at once.
 *
 * **Example**
 *
 * ```ts
 * import { Url } from "@effect/platform"
 *
 * const myUrl = new URL("https://example.com")
 *
 * const mutatedUrl = Url.mutate(myUrl, (url) => {
 *   url.username = "user"
 *   url.password = "pass"
 * })
 *
 * console.log("Mutated:", mutatedUrl.toString())
 * // Output: Mutated: https://user:pass@example.com/
 * ```
 *
 * @since 1.0.0
 * @category Modifiers
 */
export const mutate: {
  (f: (url: URL) => void): (self: URL) => URL
  (self: URL, f: (url: URL) => void): URL
} = dual(2, (self: URL, f: (url: URL) => void) => {
  const copy = new URL(self)
  f(copy)
  return copy
})

/** @internal */
const immutableURLSetter = <P extends keyof URL, A = never>(property: P): {
  (value: URL[P] | A): (url: URL) => URL
  (url: URL, value: URL[P] | A): URL
} =>
  dual(2, (url: URL, value: URL[P]) =>
    mutate(url, (url) => {
      url[property] = value
    }))

/**
 * Updates the hash fragment of the URL.
 *
 * @since 1.0.0
 * @category Setters
 */
export const setHash: {
  (hash: string): (url: URL) => URL
  (url: URL, hash: string): URL
} = immutableURLSetter("hash")

/**
 * Updates the host (domain and port) of the URL.
 *
 * @since 1.0.0
 * @category Setters
 */
export const setHost: {
  (host: string): (url: URL) => URL
  (url: URL, host: string): URL
} = immutableURLSetter("host")

/**
 * Updates the domain of the URL without modifying the port.
 *
 * @since 1.0.0
 * @category Setters
 */
export const setHostname: {
  (hostname: string): (url: URL) => URL
  (url: URL, hostname: string): URL
} = immutableURLSetter("hostname")

/**
 * Replaces the entire URL string.
 *
 * @since 1.0.0
 * @category Setters
 */
export const setHref: {
  (href: string): (url: URL) => URL
  (url: URL, href: string): URL
} = immutableURLSetter("href")

/**
 * Updates the password used for authentication.
 *
 * @since 1.0.0
 * @category Setters
 */
export const setPassword: {
  (password: string | Redacted.Redacted): (url: URL) => URL
  (url: URL, password: string | Redacted.Redacted): URL
} = dual(2, (url: URL, password: string | Redacted.Redacted) =>
  mutate(url, (url) => {
    url.password = typeof password === "string"
      ? password :
      Redacted.value(password)
  }))

/**
 * Updates the path of the URL.
 *
 * @since 1.0.0
 * @category Setters
 */
export const setPathname: {
  (pathname: string): (url: URL) => URL
  (url: URL, pathname: string): URL
} = immutableURLSetter("pathname")

/**
 * Updates the port of the URL.
 *
 * @since 1.0.0
 * @category Setters
 */
export const setPort: {
  (port: string | number): (url: URL) => URL
  (url: URL, port: string | number): URL
} = immutableURLSetter("port")

/**
 * Updates the protocol (e.g., `http`, `https`).
 *
 * @since 1.0.0
 * @category Setters
 */
export const setProtocol: {
  (protocol: string): (url: URL) => URL
  (url: URL, protocol: string): URL
} = immutableURLSetter("protocol")

/**
 * Updates the query string of the URL.
 *
 * @since 1.0.0
 * @category Setters
 */
export const setSearch: {
  (search: string): (url: URL) => URL
  (url: URL, search: string): URL
} = immutableURLSetter("search")

/**
 * Updates the username used for authentication.
 *
 * @since 1.0.0
 * @category Setters
 */
export const setUsername: {
  (username: string): (url: URL) => URL
  (url: URL, username: string): URL
} = immutableURLSetter("username")

/**
 * Updates the query parameters of a URL.
 *
 * **Details**
 *
 * This function allows you to set or replace the query parameters of a `URL`
 * object using the provided `UrlParams`. It creates a new `URL` object with the
 * updated parameters, leaving the original object unchanged.
 *
 * **Example**
 *
 * ```ts
 * import { Url, UrlParams } from "@effect/platform"
 *
 * const myUrl = new URL("https://example.com?foo=bar")
 *
 * // Write parameters
 * const updatedUrl = Url.setUrlParams(
 *   myUrl,
 *   UrlParams.fromInput([["key", "value"]])
 * )
 *
 * console.log(updatedUrl.toString())
 * // Output: https://example.com/?key=value
 * ```
 *
 * @since 1.0.0
 * @category Setters
 */
export const setUrlParams: {
  (urlParams: UrlParams.UrlParams): (url: URL) => URL
  (url: URL, urlParams: UrlParams.UrlParams): URL
} = dual(2, (url: URL, searchParams: UrlParams.UrlParams) =>
  mutate(url, (url) => {
    url.search = UrlParams.toString(searchParams)
  }))

/**
 * Retrieves the query parameters from a URL.
 *
 * **Details**
 *
 * This function extracts the query parameters from a `URL` object and returns
 * them as `UrlParams`. The resulting structure can be easily manipulated or
 * inspected.
 *
 * **Example**
 *
 * ```ts
 * import { Url } from "@effect/platform"
 *
 * const myUrl = new URL("https://example.com?foo=bar")
 *
 * // Read parameters
 * const params = Url.urlParams(myUrl)
 *
 * console.log(params)
 * // Output: [ [ 'foo', 'bar' ] ]
 * ```
 *
 * @since 1.0.0
 * @category Getters
 */
export const urlParams = (url: URL): UrlParams.UrlParams => UrlParams.fromInput(url.searchParams)

/**
 * Reads, modifies, and updates the query parameters of a URL.
 *
 * **Details**
 *
 * This function provides a functional way to interact with query parameters by
 * reading the current parameters, applying a transformation function, and then
 * writing the updated parameters back to the URL. It returns a new `URL` object
 * with the modified parameters, ensuring immutability.
 *
 * **Example**
 *
 * ```ts
 * import { Url, UrlParams } from "@effect/platform"
 *
 * const myUrl = new URL("https://example.com?foo=bar")
 *
 * const changedUrl = Url.modifyUrlParams(myUrl, UrlParams.append("key", "value"))
 *
 * console.log(changedUrl.toString())
 * // Output: https://example.com/?foo=bar&key=value
 * ```
 *
 * @since 1.0.0
 * @category Modifiers
 */
export const modifyUrlParams: {
  (f: (urlParams: UrlParams.UrlParams) => UrlParams.UrlParams): (url: URL) => URL
  (url: URL, f: (urlParams: UrlParams.UrlParams) => UrlParams.UrlParams): URL
} = dual(2, (url: URL, f: (urlParams: UrlParams.UrlParams) => UrlParams.UrlParams) =>
  mutate(url, (url) => {
    const params = f(UrlParams.fromInput(url.searchParams))
    url.search = UrlParams.toString(params)
  }))
