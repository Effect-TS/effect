/**
 * @since 1.0.0
 */
import * as Cause from "effect/Cause"
import * as Either from "effect/Either"
import { dual } from "effect/Function"
import * as UrlParams from "./UrlParams.js"

/** @internal */
const immutableSetter = <M>(clone: (mutable: M) => M) =>
<P extends keyof M>(property: P): {
  (value: M[P]): (mutable: M) => M
  (mutable: M, value: M[P]): M
} =>
  dual(2, (mutable: M, value: M[P]) => {
    const result = clone(mutable)
    result[property] = value
    return result
  })

/** @internal */
const immutableURLSetter = immutableSetter<URL>((url) => new URL(url))

/**
 * @since 1.0.0
 * @category constructors
 */
export const copy: {
  (url: URL): URL
} = (url) => new URL(url)

/**
 * @since 1.0.0
 * @category constructors
 */
export const make: {
  (url: string | URL, base?: string | URL | undefined): Either.Either<URL, Cause.IllegalArgumentException>
} = (url, base) =>
  Either.try({
    try: () => new URL(url, base),
    catch: (cause) =>
      new Cause.IllegalArgumentException(cause instanceof globalThis.Error ? cause.message : "Invalid input")
  })

/**
 * @since 1.0.0
 * @category setters
 */
export const setHash: {
  (hash: string): (url: URL) => URL
  (url: URL, hash: string): URL
} = immutableURLSetter("hash")

/**
 * @since 1.0.0
 * @category setters
 */
export const setHost: {
  (host: string): (url: URL) => URL
  (url: URL, host: string): URL
} = immutableURLSetter("host")

/**
 * @since 1.0.0
 * @category setters
 */
export const setHostname: {
  (hostname: string): (url: URL) => URL
  (url: URL, hostname: string): URL
} = immutableURLSetter("hostname")
/**
 * @since 1.0.0
 * @category setters
 */
export const setHref: {
  (href: string): (url: URL) => URL
  (url: URL, href: string): URL
} = immutableURLSetter("href")

/**
 * @since 1.0.0
 * @category setters
 */
export const setPassword: {
  (password: string): (url: URL) => URL
  (url: URL, password: string): URL
} = immutableURLSetter("password")

/**
 * @since 1.0.0
 * @category setters
 */
export const setPathname: {
  (pathname: string): (url: URL) => URL
  (url: URL, pathname: string): URL
} = immutableURLSetter("pathname")

/**
 * @since 1.0.0
 * @category setters
 */
export const setPort: {
  (port: string): (url: URL) => URL
  (url: URL, port: string): URL
} = immutableURLSetter("port")

/**
 * @since 1.0.0
 * @category setters
 */
export const setProtocol: {
  (protocol: string): (url: URL) => URL
  (url: URL, protocol: string): URL
} = immutableURLSetter("protocol")

/**
 * @since 1.0.0
 * @category setters
 */
export const setSearch: {
  (search: string): (url: URL) => URL
  (url: URL, search: string): URL
} = immutableURLSetter("search")

/**
 * @since 1.0.0
 * @category setters
 */
export const setUsername: {
  (username: string): (url: URL) => URL
  (url: URL, username: string): URL
} = immutableURLSetter("username")

/**
 * @since 1.0.0
 * @category setters
 */
export const setUrlParams: {
  (urlParams: UrlParams.UrlParams): (url: URL) => URL
  (url: URL, urlParams: UrlParams.UrlParams): URL
} = dual(2, (url: URL, searchParams: UrlParams.UrlParams) => {
  const result = copy(url)
  result.search = UrlParams.toString(searchParams)
  return result
})

/**
 * @since 1.0.0
 * @category getters
 */
export const urlParams: {
  (url: URL): UrlParams.UrlParams
} = (url) => UrlParams.fromInput(url.searchParams)

/**
 * @since 1.0.0
 * @category utils
 */
export const modifyUrlParams: {
  (f: (urlParams: UrlParams.UrlParams) => UrlParams.UrlParams): (url: URL) => URL
  (url: URL, f: (urlParams: UrlParams.UrlParams) => UrlParams.UrlParams): URL
} = dual(2, (url: URL, f: (urlParams: UrlParams.UrlParams) => UrlParams.UrlParams) => {
  const urlParams = UrlParams.fromInput(url.searchParams)
  const newUrlParams = f(urlParams)
  const result = copy(url)
  result.search = UrlParams.toString(newUrlParams)
  return result
})
