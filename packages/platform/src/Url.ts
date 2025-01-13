/**
 * @since 1.0.0
 */
import * as Cause from "effect/Cause"
import * as Either from "effect/Either"
import { dual } from "effect/Function"
import * as UrlParams from "./UrlParams.js"

/**
 * @since 1.0.0
 * @category constructors
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
 * @since 1.0.0
 * @category utils
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
const immutableURLSetter = <P extends keyof URL>(property: P): {
  (value: URL[P]): (url: URL) => URL
  (url: URL, value: URL[P]): URL
} =>
  dual(2, (url: URL, value: URL[P]) =>
    mutate(url, (url) => {
      url[property] = value
    }))

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
} = dual(2, (url: URL, searchParams: UrlParams.UrlParams) =>
  mutate(url, (url) => {
    url.search = UrlParams.toString(searchParams)
  }))

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
} = dual(2, (url: URL, f: (urlParams: UrlParams.UrlParams) => UrlParams.UrlParams) =>
  mutate(url, (url) => {
    const params = f(UrlParams.fromInput(url.searchParams))
    url.search = UrlParams.toString(params)
  }))
