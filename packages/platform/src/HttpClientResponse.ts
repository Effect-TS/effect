/**
 * @since 1.0.0
 */
import type { ParseOptions } from "@effect/schema/AST"
import type * as ParseResult from "@effect/schema/ParseResult"
import type * as Schema from "@effect/schema/Schema"
import type * as Effect from "effect/Effect"
import type * as Scope from "effect/Scope"
import type * as Stream from "effect/Stream"
import type * as Cookies from "./Cookies.js"
import type * as Error from "./HttpClientError.js"
import type * as ClientRequest from "./HttpClientRequest.js"
import type * as IncomingMessage from "./HttpIncomingMessage.js"
import * as internal from "./internal/httpClientResponse.js"
import type * as UrlParams from "./UrlParams.js"

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
  schemaBodyJsonScoped,
  /**
   * @since 1.0.0
   * @category schema
   */
  schemaBodyUrlParams,
  /**
   * @since 1.0.0
   * @category schema
   */
  schemaBodyUrlParamsScoped,
  /**
   * @since 1.0.0
   * @category schema
   */
  schemaHeaders,
  /**
   * @since 1.0.0
   * @category schema
   */
  schemaHeadersScoped
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
export const arrayBuffer: <E, R>(
  effect: Effect.Effect<HttpClientResponse, E, R>
) => Effect.Effect<ArrayBuffer, Error.ResponseError | E, Exclude<R, Scope.Scope>> = internal.arrayBuffer

/**
 * @since 1.0.0
 * @category accessors
 */
export const formData: <E, R>(
  effect: Effect.Effect<HttpClientResponse, E, R>
) => Effect.Effect<FormData, Error.ResponseError | E, Exclude<R, Scope.Scope>> = internal.formData

/**
 * @since 1.0.0
 * @category accessors
 */
export const json: <E, R>(
  effect: Effect.Effect<HttpClientResponse, E, R>
) => Effect.Effect<unknown, Error.ResponseError | E, Exclude<R, Scope.Scope>> = internal.json

const void_: <E, R>(
  effect: Effect.Effect<HttpClientResponse, E, R>
) => Effect.Effect<void, E, Exclude<R, Scope.Scope>> = internal.void_
export {
  /**
   * @since 1.0.0
   * @category accessors
   */
  void_ as void
}

/**
 * @since 1.0.0
 * @category accessors
 */
export const stream: <E, R>(
  effect: Effect.Effect<HttpClientResponse, E, R>
) => Stream.Stream<Uint8Array, Error.ResponseError | E, Exclude<R, Scope.Scope>> = internal.stream

/**
 * @since 1.0.0
 * @category accessors
 */
export const text: <E, R>(
  effect: Effect.Effect<HttpClientResponse, E, R>
) => Effect.Effect<string, Error.ResponseError | E, Exclude<R, Scope.Scope>> = internal.text

/**
 * @since 1.0.0
 * @category accessors
 */
export const urlParamsBody: <E, R>(
  effect: Effect.Effect<HttpClientResponse, E, R>
) => Effect.Effect<UrlParams.UrlParams, Error.ResponseError | E, Exclude<R, Scope.Scope>> = internal.urlParamsBody

/**
 * @since 1.0.0
 * @category schema
 */
export const schemaJsonScoped: <
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
) => <E, R2>(
  effect: Effect.Effect<HttpClientResponse, E, R2>
) => Effect.Effect<
  A,
  E | Error.ResponseError | ParseResult.ParseError,
  Exclude<R, Scope.Scope> | Exclude<R2, Scope.Scope>
> = internal.schemaJsonScoped

/**
 * @since 1.0.0
 * @category schema
 */
export const schemaNoBodyScoped: <
  R,
  I extends {
    readonly status?: number | undefined
    readonly headers?: Readonly<Record<string, string>> | undefined
  },
  A
>(
  schema: Schema.Schema<A, I, R>,
  options?: ParseOptions | undefined
) => <E, R2>(
  effect: Effect.Effect<HttpClientResponse, E, R2>
) => Effect.Effect<A, E | ParseResult.ParseError, Exclude<R, Scope.Scope> | Exclude<R2, Scope.Scope>> =
  internal.schemaNoBodyScoped

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
  >(cases: Cases): (self: HttpClientResponse) => Cases[keyof Cases] extends (_: any) => infer R ? R : never
  <
    const Cases extends {
      readonly [status: number]: (_: HttpClientResponse) => any
      readonly "2xx"?: (_: HttpClientResponse) => any
      readonly "3xx"?: (_: HttpClientResponse) => any
      readonly "4xx"?: (_: HttpClientResponse) => any
      readonly "5xx"?: (_: HttpClientResponse) => any
      readonly orElse: (_: HttpClientResponse) => any
    }
  >(self: HttpClientResponse, cases: Cases): Cases[keyof Cases] extends (_: any) => infer R ? R : never
} = internal.matchStatus

/**
 * @since 1.0.0
 * @category pattern matching
 */
export const matchStatusScoped: {
  <
    const Cases extends {
      readonly [status: number]: (_: HttpClientResponse) => Effect.Effect<any, any, any>
      readonly "2xx"?: (_: HttpClientResponse) => Effect.Effect<any, any, any>
      readonly "3xx"?: (_: HttpClientResponse) => Effect.Effect<any, any, any>
      readonly "4xx"?: (_: HttpClientResponse) => Effect.Effect<any, any, any>
      readonly "5xx"?: (_: HttpClientResponse) => Effect.Effect<any, any, any>
      readonly orElse: (_: HttpClientResponse) => Effect.Effect<any, any, any>
    }
  >(
    cases: Cases
  ): <E, R>(
    self: Effect.Effect<HttpClientResponse, E, R>
  ) => Effect.Effect<
    Cases[keyof Cases] extends (_: any) => Effect.Effect<infer _A, infer _E, infer _R> ? _A : never,
    E | (Cases[keyof Cases] extends (_: any) => Effect.Effect<infer _A, infer _E, infer _R> ? _E : never),
    Exclude<
      R | (Cases[keyof Cases] extends (_: any) => Effect.Effect<infer _A, infer _E, infer _R> ? _R : never),
      Scope.Scope
    >
  >
  <
    E,
    R,
    const Cases extends {
      readonly [status: number]: (_: HttpClientResponse) => Effect.Effect<any, any, any>
      readonly "2xx"?: (_: HttpClientResponse) => Effect.Effect<any, any, any>
      readonly "3xx"?: (_: HttpClientResponse) => Effect.Effect<any, any, any>
      readonly "4xx"?: (_: HttpClientResponse) => Effect.Effect<any, any, any>
      readonly "5xx"?: (_: HttpClientResponse) => Effect.Effect<any, any, any>
      readonly orElse: (_: HttpClientResponse) => Effect.Effect<any, any, any>
    }
  >(
    self: Effect.Effect<HttpClientResponse, E, R>,
    cases: Cases
  ): Effect.Effect<
    Cases[keyof Cases] extends (_: any) => Effect.Effect<infer _A, infer _E, infer _R> ? _A : never,
    E | (Cases[keyof Cases] extends (_: any) => Effect.Effect<infer _A, infer _E, infer _R> ? _E : never),
    Exclude<
      R | (Cases[keyof Cases] extends (_: any) => Effect.Effect<infer _A, infer _E, infer _R> ? _R : never),
      Scope.Scope
    >
  >
} = internal.matchStatusScoped
