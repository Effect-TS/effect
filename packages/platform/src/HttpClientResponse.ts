/**
 * @since 1.0.0
 */
import type * as Effect from "effect/Effect"
import type * as ParseResult from "effect/ParseResult"
import type * as Schema from "effect/Schema"
import type { ParseOptions } from "effect/SchemaAST"
import type * as Stream from "effect/Stream"
import type { Unify } from "effect/Unify"
import type * as Cookies from "./Cookies.js"
import type * as Error from "./HttpClientError.js"
import type * as ClientRequest from "./HttpClientRequest.js"
import type * as IncomingMessage from "./HttpIncomingMessage.js"
import * as internal from "./internal/httpClientResponse.js"

export {
  /**
   * @since 1.0.0
   * @category schema
   */
  schemaBodyJson,
  /**
   * @since 1.0.0
   * @category schema
   */
  schemaBodyUrlParams,
  /**
   * @since 1.0.0
   * @category schema
   */
  schemaHeaders
} from "./HttpIncomingMessage.js"

/**
 * @since 1.0.0
 * @category type ids
 */
export const TypeId: unique symbol = internal.TypeId

/**
 * @since 1.0.0
 * @category type ids
 */
export type TypeId = typeof TypeId

/**
 * @since 1.0.0
 * @category models
 */
export interface HttpClientResponse extends IncomingMessage.HttpIncomingMessage<Error.ResponseError> {
  readonly [TypeId]: TypeId
  readonly request: ClientRequest.HttpClientRequest
  readonly status: number
  readonly cookies: Cookies.Cookies
  readonly formData: Effect.Effect<FormData, Error.ResponseError>
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const fromWeb: (request: ClientRequest.HttpClientRequest, source: Response) => HttpClientResponse =
  internal.fromWeb

/**
 * @since 1.0.0
 * @category schema
 */
export const schemaJson: <
  R,
  I extends {
    readonly status?: number | undefined
    readonly headers?: Readonly<Record<string, string>> | undefined
    readonly body?: unknown
  },
  A
>(
  schema: Schema.Schema<A, I, R>,
  options?: ParseOptions | undefined
) => (self: HttpClientResponse) => Effect.Effect<A, Error.ResponseError | ParseResult.ParseError, R> =
  internal.schemaJson

/**
 * @since 1.0.0
 * @category schema
 */
export const schemaNoBody: <
  R,
  I extends {
    readonly status?: number | undefined
    readonly headers?: Readonly<Record<string, string>> | undefined
  },
  A
>(
  schema: Schema.Schema<A, I, R>,
  options?: ParseOptions | undefined
) => (self: HttpClientResponse) => Effect.Effect<A, ParseResult.ParseError, R> = internal.schemaNoBody

/**
 * @since 1.0.0
 * @category accessors
 */
export const stream: <E, R>(
  effect: Effect.Effect<HttpClientResponse, E, R>
) => Stream.Stream<Uint8Array, Error.ResponseError | E, R> = internal.stream

/**
 * @since 1.0.0
 * @category pattern matching
 */
export const matchStatus: {
  <
    const Cases extends {
      readonly [status: number]: (_: HttpClientResponse) => any
      readonly "2xx"?: (_: HttpClientResponse) => any
      readonly "3xx"?: (_: HttpClientResponse) => any
      readonly "4xx"?: (_: HttpClientResponse) => any
      readonly "5xx"?: (_: HttpClientResponse) => any
      readonly orElse: (_: HttpClientResponse) => any
    }
  >(cases: Cases): (self: HttpClientResponse) => Cases[keyof Cases] extends (_: any) => infer R ? Unify<R> : never
  <
    const Cases extends {
      readonly [status: number]: (_: HttpClientResponse) => any
      readonly "2xx"?: (_: HttpClientResponse) => any
      readonly "3xx"?: (_: HttpClientResponse) => any
      readonly "4xx"?: (_: HttpClientResponse) => any
      readonly "5xx"?: (_: HttpClientResponse) => any
      readonly orElse: (_: HttpClientResponse) => any
    }
  >(self: HttpClientResponse, cases: Cases): Cases[keyof Cases] extends (_: any) => infer R ? Unify<R> : never
} = internal.matchStatus

/**
 * @since 1.0.0
 * @category filters
 */
export const filterStatus: {
  (f: (status: number) => boolean): (self: HttpClientResponse) => Effect.Effect<HttpClientResponse, Error.ResponseError>
  (self: HttpClientResponse, f: (status: number) => boolean): Effect.Effect<HttpClientResponse, Error.ResponseError>
} = internal.filterStatus

/**
 * @since 1.0.0
 * @category filters
 */
export const filterStatusOk: (self: HttpClientResponse) => Effect.Effect<HttpClientResponse, Error.ResponseError> =
  internal.filterStatusOk
