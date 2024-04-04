/**
 * @since 1.0.0
 */
import type { ParseOptions } from "@effect/schema/AST"
import type * as ParseResult from "@effect/schema/ParseResult"
import type * as Schema from "@effect/schema/Schema"
import type * as Effect from "effect/Effect"
import type * as Scope from "effect/Scope"
import type * as Stream from "effect/Stream"
import * as internal from "../internal/http/clientResponse.js"
import type * as Error from "./ClientError.js"
import type * as ClientRequest from "./ClientRequest.js"
import type * as Cookies from "./Cookies.js"
import type * as IncomingMessage from "./IncomingMessage.js"
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
} from "./IncomingMessage.js"

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
export interface ClientResponse extends IncomingMessage.IncomingMessage<Error.ResponseError> {
  readonly [TypeId]: TypeId
  readonly status: number
  readonly cookies: Cookies.Cookies
  readonly formData: Effect.Effect<FormData, Error.ResponseError>
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const fromWeb: (request: ClientRequest.ClientRequest, source: Response) => ClientResponse = internal.fromWeb

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
) => (self: ClientResponse) => Effect.Effect<A, Error.ResponseError | ParseResult.ParseError, R> = internal.schemaJson

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
) => (self: ClientResponse) => Effect.Effect<A, ParseResult.ParseError, R> = internal.schemaNoBody

/**
 * @since 1.0.0
 * @category accessors
 */
export const arrayBuffer: <E, R>(
  effect: Effect.Effect<ClientResponse, E, R>
) => Effect.Effect<ArrayBuffer, Error.ResponseError | E, Exclude<R, Scope.Scope>> = internal.arrayBuffer

/**
 * @since 1.0.0
 * @category accessors
 */
export const formData: <E, R>(
  effect: Effect.Effect<ClientResponse, E, R>
) => Effect.Effect<FormData, Error.ResponseError | E, Exclude<R, Scope.Scope>> = internal.formData

/**
 * @since 1.0.0
 * @category accessors
 */
export const json: <E, R>(
  effect: Effect.Effect<ClientResponse, E, R>
) => Effect.Effect<unknown, Error.ResponseError | E, Exclude<R, Scope.Scope>> = internal.json

/**
 * @since 1.0.0
 * @category accessors
 */
export const stream: <E, R>(
  effect: Effect.Effect<ClientResponse, E, R>
) => Stream.Stream<Uint8Array, Error.ResponseError | E, Exclude<R, Scope.Scope>> = internal.stream

/**
 * @since 1.0.0
 * @category accessors
 */
export const text: <E, R>(
  effect: Effect.Effect<ClientResponse, E, R>
) => Effect.Effect<string, Error.ResponseError | E, Exclude<R, Scope.Scope>> = internal.text

/**
 * @since 1.0.0
 * @category accessors
 */
export const urlParamsBody: <E, R>(
  effect: Effect.Effect<ClientResponse, E, R>
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
  effect: Effect.Effect<ClientResponse, E, R2>
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
  effect: Effect.Effect<ClientResponse, E, R2>
) => Effect.Effect<A, E | ParseResult.ParseError, Exclude<R, Scope.Scope> | Exclude<R2, Scope.Scope>> =
  internal.schemaNoBodyScoped
