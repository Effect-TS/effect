/**
 * @since 1.0.0
 */
import type * as Schema from "@effect/schema/Schema"
import type * as Effect from "effect/Effect"
import type { Pipeable } from "effect/Pipeable"
import type * as Stream from "effect/Stream"
import type * as PlatformError from "../Error.js"
import type * as FileSystem from "../FileSystem.js"
import * as internal from "../internal/http/clientRequest.js"
import type * as Body from "./Body.js"
import type * as Error from "./ClientError.js"
import type * as Headers from "./Headers.js"
import type { Method } from "./Method.js"
import type * as UrlParams from "./UrlParams.js"

/**
 * @since 1.0.0
 * @category type ids
 */
export const TypeId = Symbol.for("@effect/platform/Http/ClientRequest")

/**
 * @since 1.0.0
 * @category type ids
 */
export type TypeId = typeof TypeId

/**
 * @since 1.0.0
 * @category models
 */
export interface ClientRequest extends Pipeable {
  readonly [TypeId]: TypeId
  readonly method: Method
  readonly url: string
  readonly urlParams: UrlParams.UrlParams
  readonly headers: Headers.Headers
  readonly body: Body.Body
}

/**
 * @since 1.0.0
 * @category models
 */
export interface Options {
  readonly method?: Method
  readonly url?: string
  readonly urlParams?: UrlParams.Input
  readonly headers?: Headers.Input
  readonly body?: Body.Body
  readonly accept?: string
  readonly acceptJson?: boolean
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
export const make: {
  (method: "GET" | "HEAD"): (url: string, options?: Options.NoBody) => ClientRequest
  (
    method: Exclude<Method, "GET" | "HEAD">
  ): (url: string, options?: Options.NoUrl) => ClientRequest
} = internal.make

/**
 * @since 1.0.0
 * @category constructors
 */
export const get: (url: string, options?: Options.NoBody) => ClientRequest = internal.get

/**
 * @since 1.0.0
 * @category constructors
 */
export const post: (url: string, options?: Options.NoUrl) => ClientRequest = internal.post

/**
 * @since 1.0.0
 * @category constructors
 */
export const patch: (url: string, options?: Options.NoUrl) => ClientRequest = internal.patch

/**
 * @since 1.0.0
 * @category constructors
 */
export const put: (url: string, options?: Options.NoUrl) => ClientRequest = internal.put

/**
 * @since 1.0.0
 * @category constructors
 */
export const del: (url: string, options?: Options.NoUrl) => ClientRequest = internal.del

/**
 * @since 1.0.0
 * @category constructors
 */
export const head: (url: string, options?: Options.NoBody) => ClientRequest = internal.head

/**
 * @since 1.0.0
 * @category constructors
 */
export const options: (url: string, options?: Options.NoUrl) => ClientRequest = internal.options

/**
 * @since 1.0.0
 * @category combinators
 */
export const modify: {
  (options: Options): (self: ClientRequest) => ClientRequest
  (self: ClientRequest, options: Options): ClientRequest
} = internal.modify

/**
 * @since 1.0.0
 * @category combinators
 */
export const setMethod: {
  (method: Method): (self: ClientRequest) => ClientRequest
  (self: ClientRequest, method: Method): ClientRequest
} = internal.setMethod

/**
 * @since 1.0.0
 * @category combinators
 */
export const setHeader: {
  (key: string, value: string): (self: ClientRequest) => ClientRequest
  (self: ClientRequest, key: string, value: string): ClientRequest
} = internal.setHeader

/**
 * @since 1.0.0
 * @category combinators
 */
export const setHeaders: {
  (input: Headers.Input): (self: ClientRequest) => ClientRequest
  (self: ClientRequest, input: Headers.Input): ClientRequest
} = internal.setHeaders

/**
 * @since 1.0.0
 * @category combinators
 */
export const basicAuth: {
  (username: string, password: string): (self: ClientRequest) => ClientRequest
  (self: ClientRequest, username: string, password: string): ClientRequest
} = internal.basicAuth

/**
 * @since 1.0.0
 * @category combinators
 */
export const bearerToken: {
  (token: string): (self: ClientRequest) => ClientRequest
  (self: ClientRequest, token: string): ClientRequest
} = internal.bearerToken

/**
 * @since 1.0.0
 * @category combinators
 */
export const accept: {
  (mediaType: string): (self: ClientRequest) => ClientRequest
  (self: ClientRequest, mediaType: string): ClientRequest
} = internal.accept

/**
 * @since 1.0.0
 * @category combinators
 */
export const acceptJson: (self: ClientRequest) => ClientRequest = internal.acceptJson

/**
 * @since 1.0.0
 * @category combinators
 */
export const setUrl: {
  (url: string): (self: ClientRequest) => ClientRequest
  (self: ClientRequest, url: string): ClientRequest
} = internal.setUrl

/**
 * @since 1.0.0
 * @category combinators
 */
export const prependUrl: {
  (path: string): (self: ClientRequest) => ClientRequest
  (self: ClientRequest, path: string): ClientRequest
} = internal.prependUrl

/**
 * @since 1.0.0
 * @category combinators
 */
export const appendUrl: {
  (path: string): (self: ClientRequest) => ClientRequest
  (self: ClientRequest, path: string): ClientRequest
} = internal.appendUrl

/**
 * @since 1.0.0
 * @category combinators
 */
export const updateUrl: {
  (f: (url: string) => string): (self: ClientRequest) => ClientRequest
  (self: ClientRequest, f: (url: string) => string): ClientRequest
} = internal.updateUrl

/**
 * @since 1.0.0
 * @category combinators
 */
export const setUrlParam = internal.setUrlParam

/**
 * @since 1.0.0
 * @category combinators
 */
export const setUrlParams = internal.setUrlParams

/**
 * @since 1.0.0
 * @category combinators
 */
export const appendUrlParam = internal.appendUrlParam

/**
 * @since 1.0.0
 * @category combinators
 */
export const appendUrlParams = internal.appendUrlParams

/**
 * @since 1.0.0
 * @category combinators
 */
export const setBody: {
  (body: Body.Body): (self: ClientRequest) => ClientRequest
  (self: ClientRequest, body: Body.Body): ClientRequest
} = internal.setBody

/**
 * @since 1.0.0
 * @category combinators
 */
export const uint8ArrayBody: {
  (body: Uint8Array, contentType?: string): (self: ClientRequest) => ClientRequest
  (self: ClientRequest, body: Uint8Array, contentType?: string): ClientRequest
} = internal.uint8ArrayBody

/**
 * @since 1.0.0
 * @category combinators
 */
export const textBody: {
  (body: string, contentType?: string): (self: ClientRequest) => ClientRequest
  (self: ClientRequest, body: string, contentType?: string): ClientRequest
} = internal.textBody

/**
 * @since 1.0.0
 * @category combinators
 */
export const jsonBody: {
  (body: unknown): (self: ClientRequest) => Effect.Effect<never, Body.BodyError, ClientRequest>
  (self: ClientRequest, body: unknown): Effect.Effect<never, Body.BodyError, ClientRequest>
} = internal.jsonBody

/**
 * @since 1.0.0
 * @category combinators
 */
export const unsafeJsonBody: {
  (body: unknown): (self: ClientRequest) => ClientRequest
  (self: ClientRequest, body: unknown): ClientRequest
} = internal.unsafeJsonBody

/**
 * @since 1.0.0
 * @category combinators
 */
export const schemaBody: <I, A>(
  schema: Schema.Schema<I, A>
) => {
  (body: A): (self: ClientRequest) => Effect.Effect<never, Body.BodyError, ClientRequest>
  (self: ClientRequest, body: A): Effect.Effect<never, Body.BodyError, ClientRequest>
} = internal.schemaBody

/**
 * @since 1.0.0
 * @category combinators
 */
export const urlParamsBody: {
  (input: UrlParams.Input): (self: ClientRequest) => ClientRequest
  (self: ClientRequest, input: UrlParams.Input): ClientRequest
} = internal.urlParamsBody

/**
 * @since 1.0.0
 * @category combinators
 */
export const formDataBody: {
  (body: FormData): (self: ClientRequest) => ClientRequest
  (self: ClientRequest, body: FormData): ClientRequest
} = internal.formDataBody

/**
 * @since 1.0.0
 * @category combinators
 */
export const streamBody: {
  (
    body: Stream.Stream<never, Error.RequestError, Uint8Array>,
    options?: { readonly contentType?: string; readonly contentLength?: number }
  ): (self: ClientRequest) => ClientRequest
  (
    self: ClientRequest,
    body: Stream.Stream<never, Error.RequestError, Uint8Array>,
    options?: { readonly contentType?: string; readonly contentLength?: number }
  ): ClientRequest
} = internal.streamBody

/**
 * @since 1.0.0
 * @category combinators
 */
export const fileBody: {
  (
    path: string,
    options?: FileSystem.StreamOptions & { readonly contentType?: string }
  ): (self: ClientRequest) => Effect.Effect<FileSystem.FileSystem, PlatformError.PlatformError, ClientRequest>
  (
    self: ClientRequest,
    path: string,
    options?: FileSystem.StreamOptions & { readonly contentType?: string }
  ): Effect.Effect<FileSystem.FileSystem, PlatformError.PlatformError, ClientRequest>
} = internal.fileBody

/**
 * @since 1.0.0
 * @category combinators
 */
export const fileWebBody: {
  (file: Body.Body.FileLike): (self: ClientRequest) => ClientRequest
  (self: ClientRequest, file: Body.Body.FileLike): ClientRequest
} = internal.fileWebBody
