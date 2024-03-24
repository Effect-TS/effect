/**
 * @since 1.0.0
 */
import type { ParseOptions } from "@effect/schema/AST"
import type * as Schema from "@effect/schema/Schema"
import type * as Effect from "effect/Effect"
import type { Inspectable } from "effect/Inspectable"
import type * as Stream from "effect/Stream"
import type * as PlatformError from "../Error.js"
import type * as FileSystem from "../FileSystem.js"
import * as internal from "../internal/http/serverResponse.js"
import type * as Template from "../Template.js"
import type * as Body from "./Body.js"
import type { Cookie, Cookies, CookiesError } from "./Cookies.js"
import type * as Headers from "./Headers.js"
import type * as Platform from "./Platform.js"
import type * as UrlParams from "./UrlParams.js"

/**
 * @since 1.0.0
 * @category type ids
 */
export const TypeId = Symbol.for("@effect/platform/Http/ServerResponse")

/**
 * @since 1.0.0
 * @category type ids
 */
export type TypeId = typeof TypeId

/**
 * @since 1.0.0
 * @category models
 */
export interface ServerResponse extends Effect.Effect<ServerResponse>, Inspectable {
  readonly [TypeId]: TypeId
  readonly status: number
  readonly statusText?: string | undefined
  readonly headers: Headers.Headers
  readonly cookies: Cookies
  readonly body: Body.Body
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
export const isServerResponse: (u: unknown) => u is ServerResponse = internal.isServerResponse

/**
 * @since 1.0.0
 * @category constructors
 */
export const empty: (options?: Options.WithContent | undefined) => ServerResponse = internal.empty

/**
 * @since 1.0.0
 * @category constructors
 */
export const uint8Array: (body: Uint8Array, options?: Options.WithContentType | undefined) => ServerResponse =
  internal.uint8Array

/**
 * @since 1.0.0
 * @category constructors
 */
export const text: (body: string, options?: Options.WithContentType | undefined) => ServerResponse = internal.text

/**
 * @since 1.0.0
 * @category constructors
 */
export const html: {
  <A extends ReadonlyArray<Template.Interpolated>>(
    strings: TemplateStringsArray,
    ...args: A
  ): Effect.Effect<ServerResponse, Template.Interpolated.Error<A[number]>, Template.Interpolated.Context<A[number]>>
  (html: string): ServerResponse
} = internal.html

/**
 * @since 1.0.0
 * @category constructors
 */
export const htmlStream: <A extends ReadonlyArray<Template.InterpolatedWithStream>>(
  strings: TemplateStringsArray,
  ...args: A
) => Effect.Effect<ServerResponse, never, Template.Interpolated.Context<A[number]>> = internal.htmlStream

/**
 * @since 1.0.0
 * @category constructors
 */
export const json: (
  body: unknown,
  options?: Options.WithContent | undefined
) => Effect.Effect<ServerResponse, Body.BodyError> = internal.json

/**
 * @since 1.0.0
 * @category constructors
 */
export const schemaJson: <A, I, R>(
  schema: Schema.Schema<A, I, R>,
  options?: ParseOptions | undefined
) => (body: A, options?: Options.WithContent | undefined) => Effect.Effect<ServerResponse, Body.BodyError, R> =
  internal.schemaJson

/**
 * @since 1.0.0
 * @category constructors
 */
export const unsafeJson: (body: unknown, options?: Options.WithContent | undefined) => ServerResponse =
  internal.unsafeJson

/**
 * @since 1.0.0
 * @category constructors
 */
export const urlParams: (body: UrlParams.Input, options?: Options.WithContent | undefined) => ServerResponse =
  internal.urlParams

/**
 * @since 1.0.0
 * @category constructors
 */
export const raw: (body: unknown, options?: Options | undefined) => ServerResponse = internal.raw

/**
 * @since 1.0.0
 * @category constructors
 */
export const formData: (body: FormData, options?: Options.WithContent | undefined) => ServerResponse = internal.formData

/**
 * @since 1.0.0
 * @category constructors
 */
export const stream: (body: Stream.Stream<Uint8Array, unknown>, options?: Options | undefined) => ServerResponse =
  internal.stream

/**
 * @since 1.0.0
 * @category constructors
 */
export const file: (
  path: string,
  options?: (Options & FileSystem.StreamOptions) | undefined
) => Effect.Effect<ServerResponse, PlatformError.PlatformError, Platform.Platform> = internal.file

/**
 * @since 1.0.0
 * @category constructors
 */
export const fileWeb: (
  file: Body.Body.FileLike,
  options?: (Options.WithContent & FileSystem.StreamOptions) | undefined
) => Effect.Effect<ServerResponse, never, Platform.Platform> = internal.fileWeb

/**
 * @since 1.0.0
 * @category combinators
 */
export const setHeader: {
  (key: string, value: string): (self: ServerResponse) => ServerResponse
  (self: ServerResponse, key: string, value: string): ServerResponse
} = internal.setHeader

/**
 * @since 1.0.0
 * @category combinators
 */
export const setHeaders: {
  (input: Headers.Input): (self: ServerResponse) => ServerResponse
  (self: ServerResponse, input: Headers.Input): ServerResponse
} = internal.setHeaders

/**
 * @since 1.0.0
 * @category combinators
 */
export const removeCookie: {
  (name: string): (self: ServerResponse) => ServerResponse
  (self: ServerResponse, name: string): ServerResponse
} = internal.removeCookie

/**
 * @since 1.0.0
 * @category combinators
 */
export const replaceCookies: {
  (cookies: Cookies): (self: ServerResponse) => ServerResponse
  (self: ServerResponse, cookies: Cookies): ServerResponse
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
    self: ServerResponse
  ) => Effect.Effect<
    ServerResponse,
    CookiesError
  >
  (
    self: ServerResponse,
    name: string,
    value: string,
    options?: Cookie["options"]
  ): Effect.Effect<
    ServerResponse,
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
  ): (self: ServerResponse) => ServerResponse
  (
    self: ServerResponse,
    name: string,
    value: string,
    options?: Cookie["options"]
  ): ServerResponse
} = internal.unsafeSetCookie

/**
 * @since 1.0.0
 * @category combinators
 */
export const updateCookies: {
  (f: (cookies: Cookies) => Cookies): (self: ServerResponse) => ServerResponse
  (self: ServerResponse, f: (cookies: Cookies) => Cookies): ServerResponse
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
  ): (self: ServerResponse) => Effect.Effect<ServerResponse, CookiesError, never>
  (
    self: ServerResponse,
    cookies: Iterable<
      readonly [
        name: string,
        value: string,
        options?: Cookie["options"]
      ]
    >
  ): Effect.Effect<ServerResponse, CookiesError, never>
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
  ): (self: ServerResponse) => ServerResponse
  (
    self: ServerResponse,
    cookies: Iterable<
      readonly [
        name: string,
        value: string,
        options?: Cookie["options"]
      ]
    >
  ): ServerResponse
} = internal.unsafeSetCookies

/**
 * @since 1.0.0
 * @category combinators
 */
export const setBody: {
  (body: Body.Body): (self: ServerResponse) => ServerResponse
  (self: ServerResponse, body: Body.Body): ServerResponse
} = internal.setBody

/**
 * @since 1.0.0
 * @category combinators
 */
export const setStatus: {
  (status: number, statusText?: string | undefined): (self: ServerResponse) => ServerResponse
  (self: ServerResponse, status: number, statusText?: string | undefined): ServerResponse
} = internal.setStatus

/**
 * @since 1.0.0
 * @category conversions
 */
export const toWeb: (response: ServerResponse, withoutBody?: boolean | undefined) => Response = internal.toWeb
