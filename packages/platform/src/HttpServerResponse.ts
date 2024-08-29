/**
 * @since 1.0.0
 */
import type { ParseOptions } from "@effect/schema/AST"
import type * as Schema from "@effect/schema/Schema"
import type * as Effect from "effect/Effect"
import type { Inspectable } from "effect/Inspectable"
import type * as Runtime from "effect/Runtime"
import type * as Stream from "effect/Stream"
import type { Cookie, Cookies, CookiesError } from "./Cookies.js"
import type * as PlatformError from "./Error.js"
import type * as FileSystem from "./FileSystem.js"
import type * as Headers from "./Headers.js"
import type * as Body from "./HttpBody.js"
import type * as Platform from "./HttpPlatform.js"
import type { Respondable } from "./HttpServerRespondable.js"
import * as internal from "./internal/httpServerResponse.js"
import type * as Template from "./Template.js"
import type * as UrlParams from "./UrlParams.js"

/**
 * @since 1.0.0
 * @category type ids
 */
export const TypeId: unique symbol = Symbol.for("@effect/platform/HttpServerResponse")

/**
 * @since 1.0.0
 * @category type ids
 */
export type TypeId = typeof TypeId

/**
 * @since 1.0.0
 * @category models
 */
export interface HttpServerResponse extends Effect.Effect<HttpServerResponse>, Inspectable, Respondable {
  readonly [TypeId]: TypeId
  readonly status: number
  readonly statusText?: string | undefined
  readonly headers: Headers.Headers
  readonly cookies: Cookies
  readonly body: Body.HttpBody
}

/**
 * @since 1.0.0
 * @category models
 */
export interface Options {
  readonly status?: number | undefined
  readonly statusText?: string | undefined
  readonly headers?: Headers.Headers | undefined
  readonly cookies?: Cookies | undefined
  readonly contentType?: string | undefined
  readonly contentLength?: number | undefined
}

/**
 * @since 1.0.0
 */
export declare namespace Options {
  /**
   * @since 1.0.0
   * @category models
   */
  export interface WithContent extends Omit<Options, "contentType" | "contentLength"> {}

  /**
   * @since 1.0.0
   * @category models
   */
  export interface WithContentType extends Omit<Options, "contentLength"> {}
}

/**
 * @since 1.0.0
 */
export const isServerResponse: (u: unknown) => u is HttpServerResponse = internal.isServerResponse

/**
 * @since 1.0.0
 * @category constructors
 */
export const empty: (options?: Options.WithContent | undefined) => HttpServerResponse = internal.empty

/**
 * @since 1.0.0
 * @category constructors
 */
export const uint8Array: (body: Uint8Array, options?: Options.WithContentType | undefined) => HttpServerResponse =
  internal.uint8Array

/**
 * @since 1.0.0
 * @category constructors
 */
export const text: (body: string, options?: Options.WithContentType | undefined) => HttpServerResponse = internal.text

/**
 * @since 1.0.0
 * @category constructors
 */
export const html: {
  <A extends ReadonlyArray<Template.Interpolated>>(
    strings: TemplateStringsArray,
    ...args: A
  ): Effect.Effect<HttpServerResponse, Template.Interpolated.Error<A[number]>, Template.Interpolated.Context<A[number]>>
  (html: string): HttpServerResponse
} = internal.html

/**
 * @since 1.0.0
 * @category constructors
 */
export const htmlStream: <A extends ReadonlyArray<Template.InterpolatedWithStream>>(
  strings: TemplateStringsArray,
  ...args: A
) => Effect.Effect<HttpServerResponse, never, Template.Interpolated.Context<A[number]>> = internal.htmlStream

/**
 * @since 1.0.0
 * @category constructors
 */
export const json: (
  body: unknown,
  options?: Options.WithContentType | undefined
) => Effect.Effect<HttpServerResponse, Body.HttpBodyError> = internal.json

/**
 * @since 1.0.0
 * @category constructors
 */
export const schemaJson: <A, I, R>(
  schema: Schema.Schema<A, I, R>,
  options?: ParseOptions | undefined
) => (body: A, options?: Options.WithContent | undefined) => Effect.Effect<HttpServerResponse, Body.HttpBodyError, R> =
  internal.schemaJson

/**
 * @since 1.0.0
 * @category constructors
 */
export const unsafeJson: (body: unknown, options?: Options.WithContentType | undefined) => HttpServerResponse =
  internal.unsafeJson

/**
 * @since 1.0.0
 * @category constructors
 */
export const urlParams: (body: UrlParams.Input, options?: Options.WithContentType | undefined) => HttpServerResponse =
  internal.urlParams

/**
 * @since 1.0.0
 * @category constructors
 */
export const raw: (body: unknown, options?: Options | undefined) => HttpServerResponse = internal.raw

/**
 * @since 1.0.0
 * @category constructors
 */
export const formData: (body: FormData, options?: Options.WithContent | undefined) => HttpServerResponse =
  internal.formData

/**
 * @since 1.0.0
 * @category constructors
 */
export const stream: <E>(
  body: Stream.Stream<Uint8Array, E, never>,
  options?: Options | undefined
) => HttpServerResponse = internal.stream

/**
 * @since 1.0.0
 * @category constructors
 */
export const file: (
  path: string,
  options?: (Options & FileSystem.StreamOptions) | undefined
) => Effect.Effect<HttpServerResponse, PlatformError.PlatformError, Platform.HttpPlatform> = internal.file

/**
 * @since 1.0.0
 * @category constructors
 */
export const fileWeb: (
  file: Body.HttpBody.FileLike,
  options?: (Options.WithContent & FileSystem.StreamOptions) | undefined
) => Effect.Effect<HttpServerResponse, never, Platform.HttpPlatform> = internal.fileWeb

/**
 * @since 1.0.0
 * @category combinators
 */
export const setHeader: {
  (key: string, value: string): (self: HttpServerResponse) => HttpServerResponse
  (self: HttpServerResponse, key: string, value: string): HttpServerResponse
} = internal.setHeader

/**
 * @since 1.0.0
 * @category combinators
 */
export const setHeaders: {
  (input: Headers.Input): (self: HttpServerResponse) => HttpServerResponse
  (self: HttpServerResponse, input: Headers.Input): HttpServerResponse
} = internal.setHeaders

/**
 * @since 1.0.0
 * @category combinators
 */
export const removeCookie: {
  (name: string): (self: HttpServerResponse) => HttpServerResponse
  (self: HttpServerResponse, name: string): HttpServerResponse
} = internal.removeCookie

/**
 * @since 1.0.0
 * @category combinators
 */
export const replaceCookies: {
  (cookies: Cookies): (self: HttpServerResponse) => HttpServerResponse
  (self: HttpServerResponse, cookies: Cookies): HttpServerResponse
} = internal.replaceCookies

/**
 * @since 1.0.0
 * @category combinators
 */
export const setCookie: {
  (
    name: string,
    value: string,
    options?: Cookie["options"]
  ): (
    self: HttpServerResponse
  ) => Effect.Effect<
    HttpServerResponse,
    CookiesError
  >
  (
    self: HttpServerResponse,
    name: string,
    value: string,
    options?: Cookie["options"]
  ): Effect.Effect<
    HttpServerResponse,
    CookiesError
  >
} = internal.setCookie

/**
 * @since 1.0.0
 * @category combinators
 */
export const unsafeSetCookie: {
  (
    name: string,
    value: string,
    options?: Cookie["options"]
  ): (self: HttpServerResponse) => HttpServerResponse
  (
    self: HttpServerResponse,
    name: string,
    value: string,
    options?: Cookie["options"]
  ): HttpServerResponse
} = internal.unsafeSetCookie

/**
 * @since 1.0.0
 * @category combinators
 */
export const updateCookies: {
  (f: (cookies: Cookies) => Cookies): (self: HttpServerResponse) => HttpServerResponse
  (self: HttpServerResponse, f: (cookies: Cookies) => Cookies): HttpServerResponse
} = internal.updateCookies

/**
 * @since 1.0.0
 * @category combinators
 */
export const setCookies: {
  (
    cookies: Iterable<
      readonly [
        name: string,
        value: string,
        options?: Cookie["options"]
      ]
    >
  ): (self: HttpServerResponse) => Effect.Effect<HttpServerResponse, CookiesError, never>
  (
    self: HttpServerResponse,
    cookies: Iterable<
      readonly [
        name: string,
        value: string,
        options?: Cookie["options"]
      ]
    >
  ): Effect.Effect<HttpServerResponse, CookiesError, never>
} = internal.setCookies

/**
 * @since 1.0.0
 * @category combinators
 */
export const unsafeSetCookies: {
  (
    cookies: Iterable<
      readonly [
        name: string,
        value: string,
        options?: Cookie["options"]
      ]
    >
  ): (self: HttpServerResponse) => HttpServerResponse
  (
    self: HttpServerResponse,
    cookies: Iterable<
      readonly [
        name: string,
        value: string,
        options?: Cookie["options"]
      ]
    >
  ): HttpServerResponse
} = internal.unsafeSetCookies

/**
 * @since 1.0.0
 * @category combinators
 */
export const setBody: {
  (body: Body.HttpBody): (self: HttpServerResponse) => HttpServerResponse
  (self: HttpServerResponse, body: Body.HttpBody): HttpServerResponse
} = internal.setBody

/**
 * @since 1.0.0
 * @category combinators
 */
export const setStatus: {
  (status: number, statusText?: string | undefined): (self: HttpServerResponse) => HttpServerResponse
  (self: HttpServerResponse, status: number, statusText?: string | undefined): HttpServerResponse
} = internal.setStatus

/**
 * @since 1.0.0
 * @category conversions
 */
export const toWeb: (
  response: HttpServerResponse,
  options?: {
    readonly withoutBody?: boolean | undefined
    readonly runtime?: Runtime.Runtime<never> | undefined
  }
) => Response = internal.toWeb
