/**
 * @since 1.0.0
 */
import type { Pipeable } from "@effect/data/Pipeable"
import type * as Body from "@effect/platform/Http/Body"
import type * as Error from "@effect/platform/Http/ClientError"
import type * as Headers from "@effect/platform/Http/Headers"
import type { Method } from "@effect/platform/Http/Method"
import type * as UrlParams from "@effect/platform/Http/UrlParams"
import * as internal from "@effect/platform/internal/http/clientRequest"
import type * as Schema from "@effect/schema/Schema"
import type * as Stream from "@effect/stream/Stream"

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
 * @category constructors
 */
export const make: (
  method: Method
) => (
  url: string,
  options?: {
    readonly url?: string
    readonly urlParams?: UrlParams.Input
    readonly headers?: Headers.Input
    readonly body?: Body.Body
    readonly accept?: string
    readonly acceptJson?: boolean
  }
) => ClientRequest = internal.make

/**
 * @since 1.0.0
 * @category constructors
 */
export const get: (
  url: string,
  options?: {
    readonly url?: string
    readonly urlParams?: UrlParams.Input
    readonly headers?: Headers.Input
    readonly accept?: string
    readonly acceptJson?: boolean
  }
) => ClientRequest = internal.get

/**
 * @since 1.0.0
 * @category constructors
 */
export const post: (
  url: string,
  options?: {
    readonly url?: string
    readonly urlParams?: UrlParams.Input
    readonly headers?: Headers.Input
    readonly body?: Body.Body
    readonly accept?: string
    readonly acceptJson?: boolean
  }
) => ClientRequest = internal.post

/**
 * @since 1.0.0
 * @category constructors
 */
export const patch: (
  url: string,
  options?: {
    readonly url?: string
    readonly urlParams?: UrlParams.Input
    readonly headers?: Headers.Input
    readonly body?: Body.Body
    readonly accept?: string
    readonly acceptJson?: boolean
  }
) => ClientRequest = internal.patch

/**
 * @since 1.0.0
 * @category constructors
 */
export const put: (
  url: string,
  options?: {
    readonly url?: string
    readonly urlParams?: UrlParams.Input
    readonly headers?: Headers.Input
    readonly body?: Body.Body
    readonly accept?: string
    readonly acceptJson?: boolean
  }
) => ClientRequest = internal.put

/**
 * @since 1.0.0
 * @category constructors
 */
export const del: (
  url: string,
  options?: {
    readonly url?: string
    readonly urlParams?: UrlParams.Input
    readonly headers?: Headers.Input
    readonly accept?: string
    readonly acceptJson?: boolean
  }
) => ClientRequest = internal.del

/**
 * @since 1.0.0
 * @category constructors
 */
export const head: (
  url: string,
  options?: {
    readonly url?: string
    readonly urlParams?: UrlParams.Input
    readonly headers?: Headers.Input
    readonly accept?: string
    readonly acceptJson?: boolean
  }
) => ClientRequest = internal.head

/**
 * @since 1.0.0
 * @category constructors
 */
export const options: (
  url: string,
  options?: {
    readonly url?: string
    readonly urlParams?: UrlParams.Input
    readonly headers?: Headers.Input
    readonly accept?: string
    readonly acceptJson?: boolean
  }
) => ClientRequest = internal.options

/**
 * @since 1.0.0
 * @category combinators
 */
export const modify: {
  (
    options: {
      readonly method?: Method
      readonly url?: string
      readonly urlParams?: UrlParams.Input
      readonly headers?: Headers.Input
      readonly body?: Body.Body
      readonly accept?: string
      readonly acceptJson?: boolean
    }
  ): (self: ClientRequest) => ClientRequest
  (
    self: ClientRequest,
    options: {
      readonly method?: Method
      readonly url?: string
      readonly urlParams?: UrlParams.Input
      readonly headers?: Headers.Input
      readonly body?: Body.Body
      readonly accept?: string
      readonly acceptJson?: boolean
    }
  ): ClientRequest
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
export const binaryBody: {
  (body: Uint8Array, contentType?: string): (self: ClientRequest) => ClientRequest
  (self: ClientRequest, body: Uint8Array, contentType?: string): ClientRequest
} = internal.binaryBody

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
  (body: unknown): (self: ClientRequest) => ClientRequest
  (self: ClientRequest, body: string): ClientRequest
} = internal.jsonBody

/**
 * @since 1.0.0
 * @category combinators
 */
export const schemaBody: <I, A>(schema: Schema.Schema<I, A>) => {
  (body: A): (self: ClientRequest) => ClientRequest
  (self: ClientRequest, body: A): ClientRequest
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
