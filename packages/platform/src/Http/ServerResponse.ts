/**
 * @since 1.0.0
 */
import type * as Schema from "@effect/schema/Schema"
import type * as Effect from "effect/Effect"
import type * as Stream from "effect/Stream"
import type * as PlatformError from "../Error.js"
import type * as FileSystem from "../FileSystem.js"
import * as internal from "../internal/http/serverResponse.js"
import type * as Template from "../Template.js"
import type * as Body from "./Body.js"
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
export interface ServerResponse extends Effect.Effect<ServerResponse> {
  readonly [TypeId]: TypeId
  readonly status: number
  readonly statusText?: string | undefined
  readonly headers: Headers.Headers
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
export const empty: (options?: Options.WithContent) => ServerResponse = internal.empty

/**
 * @since 1.0.0
 * @category constructors
 */
export const uint8Array: (body: Uint8Array, options?: Options.WithContentType) => ServerResponse = internal.uint8Array

/**
 * @since 1.0.0
 * @category constructors
 */
export const text: (body: string, options?: Options.WithContentType) => ServerResponse = internal.text

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
  options?: Options.WithContent
) => Effect.Effect<ServerResponse, Body.BodyError> = internal.json

/**
 * @since 1.0.0
 * @category constructors
 */
export const schemaJson: <A, I, R>(
  schema: Schema.Schema<A, I, R>
) => (body: A, options?: Options.WithContent | undefined) => Effect.Effect<ServerResponse, Body.BodyError, R> =
  internal.schemaJson

/**
 * @since 1.0.0
 * @category constructors
 */
export const unsafeJson: (body: unknown, options?: Options.WithContent) => ServerResponse = internal.unsafeJson

/**
 * @since 1.0.0
 * @category constructors
 */
export const urlParams: (body: UrlParams.Input, options?: Options.WithContent) => ServerResponse = internal.urlParams

/**
 * @since 1.0.0
 * @category constructors
 */
export const raw: (body: unknown, options?: Options) => ServerResponse = internal.raw

/**
 * @since 1.0.0
 * @category constructors
 */
export const formData: (body: FormData, options?: Options.WithContent) => ServerResponse = internal.formData

/**
 * @since 1.0.0
 * @category constructors
 */
export const stream: (body: Stream.Stream<Uint8Array, unknown>, options?: Options) => ServerResponse = internal.stream

/**
 * @since 1.0.0
 * @category constructors
 */
export const file: (
  path: string,
  options?: Options & FileSystem.StreamOptions
) => Effect.Effect<ServerResponse, PlatformError.PlatformError, Platform.Platform> = internal.file

/**
 * @since 1.0.0
 * @category constructors
 */
export const fileWeb: (
  file: Body.Body.FileLike,
  options?: Options.WithContent & FileSystem.StreamOptions
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
export const toWeb: (response: ServerResponse, withoutBody?: boolean) => Response = internal.toWeb
