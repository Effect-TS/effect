/**
 * @since 1.0.0
 */
import type { ParseOptions } from "@effect/schema/AST"
import type * as Schema from "@effect/schema/Schema"
import type * as Effect from "effect/Effect"
import type { Inspectable } from "effect/Inspectable"
import type * as Option from "effect/Option"
import type { Scope } from "effect/Scope"
import type * as Stream from "effect/Stream"
import type * as PlatformError from "./Error.js"
import type * as FileSystem from "./FileSystem.js"
import type * as Headers from "./Headers.js"
import type * as Body from "./HttpBody.js"
import type { HttpClient } from "./HttpClient.js"
import type { HttpClientError } from "./HttpClientError.js"
import type { HttpClientResponse } from "./HttpClientResponse.js"
import type { HttpMethod } from "./HttpMethod.js"
import * as internal from "./internal/httpClientRequest.js"
import type * as UrlParams from "./UrlParams.js"

/**
 * @since 1.0.0
 * @category type ids
 */
export const TypeId: unique symbol = Symbol.for("@effect/platform/HttpClientRequest")

/**
 * @since 1.0.0
 * @category type ids
 */
export type TypeId = typeof TypeId

/**
 * @since 1.0.0
 * @category models
 */
export interface HttpClientRequest
  extends Effect.Effect<HttpClientResponse, HttpClientError, HttpClient.Default | Scope>, Inspectable
{
  readonly [TypeId]: TypeId
  readonly method: HttpMethod
  readonly url: string
  readonly urlParams: UrlParams.UrlParams
  readonly hash: Option.Option<string>
  readonly headers: Headers.Headers
  readonly body: Body.HttpBody
}

/**
 * @since 1.0.0
 * @category models
 */
export interface Options {
  readonly method?: HttpMethod | undefined
  readonly url?: string | URL | undefined
  readonly urlParams?: UrlParams.Input | undefined
  readonly hash?: string | undefined
  readonly headers?: Headers.Input | undefined
  readonly body?: Body.HttpBody | undefined
  readonly accept?: string | undefined
  readonly acceptJson?: boolean | undefined
}

/**
 * @since 1.0.0
 */
export declare namespace Options {
  /**
   * @since 1.0.0
   * @category models
   */
  export interface NoBody extends Omit<Options, "method" | "url" | "body"> {}

  /**
   * @since 1.0.0
   * @category models
   */
  export interface NoUrl extends Omit<Options, "method" | "url"> {}
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const make: <M extends HttpMethod>(
  method: M
) => (
  url: string | URL,
  options?: (M extends "GET" | "HEAD" ? Options.NoBody : Options.NoUrl) | undefined
) => HttpClientRequest = internal.make

/**
 * @since 1.0.0
 * @category constructors
 */
export const get: (url: string | URL, options?: Options.NoBody) => HttpClientRequest = internal.get

/**
 * @since 1.0.0
 * @category constructors
 */
export const post: (url: string | URL, options?: Options.NoUrl) => HttpClientRequest = internal.post

/**
 * @since 1.0.0
 * @category constructors
 */
export const patch: (url: string | URL, options?: Options.NoUrl) => HttpClientRequest = internal.patch

/**
 * @since 1.0.0
 * @category constructors
 */
export const put: (url: string | URL, options?: Options.NoUrl) => HttpClientRequest = internal.put

/**
 * @since 1.0.0
 * @category constructors
 */
export const del: (url: string | URL, options?: Options.NoUrl) => HttpClientRequest = internal.del

/**
 * @since 1.0.0
 * @category constructors
 */
export const head: (url: string | URL, options?: Options.NoBody) => HttpClientRequest = internal.head

/**
 * @since 1.0.0
 * @category constructors
 */
export const options: (url: string | URL, options?: Options.NoUrl) => HttpClientRequest = internal.options

/**
 * @since 1.0.0
 * @category combinators
 */
export const modify: {
  (options: Options): (self: HttpClientRequest) => HttpClientRequest
  (self: HttpClientRequest, options: Options): HttpClientRequest
} = internal.modify

/**
 * @since 1.0.0
 * @category combinators
 */
export const setMethod: {
  (method: HttpMethod): (self: HttpClientRequest) => HttpClientRequest
  (self: HttpClientRequest, method: HttpMethod): HttpClientRequest
} = internal.setMethod

/**
 * @since 1.0.0
 * @category combinators
 */
export const setHeader: {
  (key: string, value: string): (self: HttpClientRequest) => HttpClientRequest
  (self: HttpClientRequest, key: string, value: string): HttpClientRequest
} = internal.setHeader

/**
 * @since 1.0.0
 * @category combinators
 */
export const setHeaders: {
  (input: Headers.Input): (self: HttpClientRequest) => HttpClientRequest
  (self: HttpClientRequest, input: Headers.Input): HttpClientRequest
} = internal.setHeaders

/**
 * @since 1.0.0
 * @category combinators
 */
export const basicAuth: {
  (username: string, password: string): (self: HttpClientRequest) => HttpClientRequest
  (self: HttpClientRequest, username: string, password: string): HttpClientRequest
} = internal.basicAuth

/**
 * @since 1.0.0
 * @category combinators
 */
export const bearerToken: {
  (token: string): (self: HttpClientRequest) => HttpClientRequest
  (self: HttpClientRequest, token: string): HttpClientRequest
} = internal.bearerToken

/**
 * @since 1.0.0
 * @category combinators
 */
export const accept: {
  (mediaType: string): (self: HttpClientRequest) => HttpClientRequest
  (self: HttpClientRequest, mediaType: string): HttpClientRequest
} = internal.accept

/**
 * @since 1.0.0
 * @category combinators
 */
export const acceptJson: (self: HttpClientRequest) => HttpClientRequest = internal.acceptJson

/**
 * @since 1.0.0
 * @category combinators
 */
export const setUrl: {
  (url: string | URL): (self: HttpClientRequest) => HttpClientRequest
  (self: HttpClientRequest, url: string | URL): HttpClientRequest
} = internal.setUrl

/**
 * @since 1.0.0
 * @category combinators
 */
export const prependUrl: {
  (path: string): (self: HttpClientRequest) => HttpClientRequest
  (self: HttpClientRequest, path: string): HttpClientRequest
} = internal.prependUrl

/**
 * @since 1.0.0
 * @category combinators
 */
export const appendUrl: {
  (path: string): (self: HttpClientRequest) => HttpClientRequest
  (self: HttpClientRequest, path: string): HttpClientRequest
} = internal.appendUrl

/**
 * @since 1.0.0
 * @category combinators
 */
export const updateUrl: {
  (f: (url: string) => string): (self: HttpClientRequest) => HttpClientRequest
  (self: HttpClientRequest, f: (url: string) => string): HttpClientRequest
} = internal.updateUrl

/**
 * @since 1.0.0
 * @category combinators
 */
export const setUrlParam: {
  (key: string, value: string): (self: HttpClientRequest) => HttpClientRequest
  (self: HttpClientRequest, key: string, value: string): HttpClientRequest
} = internal.setUrlParam

/**
 * @since 1.0.0
 * @category combinators
 */
export const setUrlParams: {
  (input: UrlParams.Input): (self: HttpClientRequest) => HttpClientRequest
  (self: HttpClientRequest, input: UrlParams.Input): HttpClientRequest
} = internal.setUrlParams

/**
 * @since 1.0.0
 * @category combinators
 */
export const appendUrlParam: {
  (key: string, value: string): (self: HttpClientRequest) => HttpClientRequest
  (self: HttpClientRequest, key: string, value: string): HttpClientRequest
} = internal.appendUrlParam

/**
 * @since 1.0.0
 * @category combinators
 */
export const appendUrlParams: {
  (input: UrlParams.Input): (self: HttpClientRequest) => HttpClientRequest
  (self: HttpClientRequest, input: UrlParams.Input): HttpClientRequest
} = internal.appendUrlParams

/**
 * @since 1.0.0
 * @category combinators
 */
export const setHash: {
  (hash: string): (self: HttpClientRequest) => HttpClientRequest
  (self: HttpClientRequest, hash: string): HttpClientRequest
} = internal.setHash

/**
 * @since 1.0.0
 * @category combinators
 */
export const removeHash: (self: HttpClientRequest) => HttpClientRequest = internal.removeHash

/**
 * @since 1.0.0
 * @category combinators
 */
export const setBody: {
  (body: Body.HttpBody): (self: HttpClientRequest) => HttpClientRequest
  (self: HttpClientRequest, body: Body.HttpBody): HttpClientRequest
} = internal.setBody

/**
 * @since 1.0.0
 * @category combinators
 */
export const uint8ArrayBody: {
  (body: Uint8Array, contentType?: string): (self: HttpClientRequest) => HttpClientRequest
  (self: HttpClientRequest, body: Uint8Array, contentType?: string): HttpClientRequest
} = internal.uint8ArrayBody

/**
 * @since 1.0.0
 * @category combinators
 */
export const textBody: {
  (body: string, contentType?: string): (self: HttpClientRequest) => HttpClientRequest
  (self: HttpClientRequest, body: string, contentType?: string): HttpClientRequest
} = internal.textBody

/**
 * @since 1.0.0
 * @category combinators
 */
export const jsonBody: {
  (body: unknown): (self: HttpClientRequest) => Effect.Effect<HttpClientRequest, Body.HttpBodyError>
  (self: HttpClientRequest, body: unknown): Effect.Effect<HttpClientRequest, Body.HttpBodyError>
} = internal.jsonBody

/**
 * @since 1.0.0
 * @category combinators
 */
export const unsafeJsonBody: {
  (body: unknown): (self: HttpClientRequest) => HttpClientRequest
  (self: HttpClientRequest, body: unknown): HttpClientRequest
} = internal.unsafeJsonBody

/**
 * @since 1.0.0
 * @category combinators
 */
export const schemaBody: <A, I, R>(
  schema: Schema.Schema<A, I, R>,
  options?: ParseOptions | undefined
) => {
  (body: A): (self: HttpClientRequest) => Effect.Effect<HttpClientRequest, Body.HttpBodyError, R>
  (self: HttpClientRequest, body: A): Effect.Effect<HttpClientRequest, Body.HttpBodyError, R>
} = internal.schemaBody

/**
 * @since 1.0.0
 * @category combinators
 */
export const urlParamsBody: {
  (input: UrlParams.Input): (self: HttpClientRequest) => HttpClientRequest
  (self: HttpClientRequest, input: UrlParams.Input): HttpClientRequest
} = internal.urlParamsBody

/**
 * @since 1.0.0
 * @category combinators
 */
export const formDataBody: {
  (body: FormData): (self: HttpClientRequest) => HttpClientRequest
  (self: HttpClientRequest, body: FormData): HttpClientRequest
} = internal.formDataBody

/**
 * @since 1.0.0
 * @category combinators
 */
export const streamBody: {
  (
    body: Stream.Stream<Uint8Array, unknown>,
    options?: { readonly contentType?: string | undefined; readonly contentLength?: number | undefined } | undefined
  ): (self: HttpClientRequest) => HttpClientRequest
  (
    self: HttpClientRequest,
    body: Stream.Stream<Uint8Array, unknown>,
    options?: { readonly contentType?: string | undefined; readonly contentLength?: number | undefined } | undefined
  ): HttpClientRequest
} = internal.streamBody

/**
 * @since 1.0.0
 * @category combinators
 */
export const fileBody: {
  (
    path: string,
    options?: FileSystem.StreamOptions & { readonly contentType?: string }
  ): (self: HttpClientRequest) => Effect.Effect<HttpClientRequest, PlatformError.PlatformError, FileSystem.FileSystem>
  (
    self: HttpClientRequest,
    path: string,
    options?: FileSystem.StreamOptions & { readonly contentType?: string }
  ): Effect.Effect<HttpClientRequest, PlatformError.PlatformError, FileSystem.FileSystem>
} = internal.fileBody

/**
 * @since 1.0.0
 * @category combinators
 */
export const fileWebBody: {
  (file: Body.HttpBody.FileLike): (self: HttpClientRequest) => HttpClientRequest
  (self: HttpClientRequest, file: Body.HttpBody.FileLike): HttpClientRequest
} = internal.fileWebBody
