/**
 * @since 1.0.0
 */
import type { ParseOptions } from "@effect/schema/AST"
import type * as Schema from "@effect/schema/Schema"
import type * as Effect from "effect/Effect"
import type { Inspectable } from "effect/Inspectable"
import type { Scope } from "effect/Scope"
import type * as Stream from "effect/Stream"
import type * as PlatformError from "../Error.js"
import type * as FileSystem from "../FileSystem.js"
import * as internal from "../internal/http/clientRequest.js"
import type * as Body from "./Body.js"
import type { Client } from "./Client.js"
import type { HttpClientError } from "./ClientError.js"
import type { ClientResponse } from "./ClientResponse.js"
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
export interface ClientRequest
  extends Effect.Effect<ClientResponse, HttpClientError, Client.Default | Scope>, Inspectable
{
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
  readonly method?: Method | undefined
  readonly url?: string | undefined
  readonly urlParams?: UrlParams.Input | undefined
  readonly headers?: Headers.Input | undefined
  readonly body?: Body.Body | undefined
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
export const make: <M extends Method>(
  method: M
) => (
  url: string | URL,
  options?: (M extends "GET" | "HEAD" ? Options.NoBody : Options.NoUrl) | undefined
) => ClientRequest = internal.make

/**
 * @since 1.0.0
 * @category constructors
 */
export const get: (url: string | URL, options?: Options.NoBody) => ClientRequest = internal.get

/**
 * @since 1.0.0
 * @category constructors
 */
export const post: (url: string | URL, options?: Options.NoUrl) => ClientRequest = internal.post

/**
 * @since 1.0.0
 * @category constructors
 */
export const patch: (url: string | URL, options?: Options.NoUrl) => ClientRequest = internal.patch

/**
 * @since 1.0.0
 * @category constructors
 */
export const put: (url: string | URL, options?: Options.NoUrl) => ClientRequest = internal.put

/**
 * @since 1.0.0
 * @category constructors
 */
export const del: (url: string | URL, options?: Options.NoUrl) => ClientRequest = internal.del

/**
 * @since 1.0.0
 * @category constructors
 */
export const head: (url: string | URL, options?: Options.NoBody) => ClientRequest = internal.head

/**
 * @since 1.0.0
 * @category constructors
 */
export const options: (url: string | URL, options?: Options.NoUrl) => ClientRequest = internal.options

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
  (url: string | URL): (self: ClientRequest) => ClientRequest
  (self: ClientRequest, url: string): ClientRequest
} = internal.setUrl

/**
 * @since 1.0.0
 * @category combinators
 */
export const prependUrl: {
  (path: string | URL): (self: ClientRequest) => ClientRequest
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
  (body: unknown): (self: ClientRequest) => Effect.Effect<ClientRequest, Body.BodyError>
  (self: ClientRequest, body: unknown): Effect.Effect<ClientRequest, Body.BodyError>
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
export const schemaBody: <A, I, R>(
  schema: Schema.Schema<A, I, R>,
  options?: ParseOptions | undefined
) => {
  (body: A): (self: ClientRequest) => Effect.Effect<ClientRequest, Body.BodyError, R>
  (self: ClientRequest, body: A): Effect.Effect<ClientRequest, Body.BodyError, R>
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
    body: Stream.Stream<Uint8Array, unknown>,
    options?: { readonly contentType?: string | undefined; readonly contentLength?: number | undefined } | undefined
  ): (self: ClientRequest) => ClientRequest
  (
    self: ClientRequest,
    body: Stream.Stream<Uint8Array, unknown>,
    options?: { readonly contentType?: string | undefined; readonly contentLength?: number | undefined } | undefined
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
  ): (self: ClientRequest) => Effect.Effect<ClientRequest, PlatformError.PlatformError, FileSystem.FileSystem>
  (
    self: ClientRequest,
    path: string,
    options?: FileSystem.StreamOptions & { readonly contentType?: string }
  ): Effect.Effect<ClientRequest, PlatformError.PlatformError, FileSystem.FileSystem>
} = internal.fileBody

/**
 * @since 1.0.0
 * @category combinators
 */
export const fileWebBody: {
  (file: Body.Body.FileLike): (self: ClientRequest) => ClientRequest
  (self: ClientRequest, file: Body.Body.FileLike): ClientRequest
} = internal.fileWebBody
