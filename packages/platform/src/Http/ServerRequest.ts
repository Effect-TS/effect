/**
 * @since 1.0.0
 */
import type * as ParseResult from "@effect/schema/ParseResult"
import type * as Schema from "@effect/schema/Schema"
import type * as Context from "effect/Context"
import type * as Effect from "effect/Effect"
import type * as Scope from "effect/Scope"
import type * as Stream from "effect/Stream"
import type * as FileSystem from "../FileSystem.js"
import * as internal from "../internal/http/serverRequest.js"
import type * as Path from "../Path.js"
import type * as Headers from "./Headers.js"
import type * as IncomingMessage from "./IncomingMessage.js"
import type { Method } from "./Method.js"
import type * as Multipart from "./Multipart.js"
import type * as Error from "./ServerError.js"

export {
  /**
   * @since 1.0.0
   * @category fiber refs
   */
  maxBodySize
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
export interface ServerRequest extends IncomingMessage.IncomingMessage<Error.RequestError> {
  readonly [TypeId]: TypeId
  readonly source: unknown
  readonly url: string
  readonly originalUrl: string
  readonly method: Method

  readonly multipart: Effect.Effect<
    Multipart.Persisted,
    Multipart.MultipartError,
    Scope.Scope | FileSystem.FileSystem | Path.Path
  >
  readonly multipartStream: Stream.Stream<Multipart.Part, Multipart.MultipartError>

  readonly modify: (
    options: {
      readonly url?: string
      readonly headers?: Headers.Headers
      readonly remoteAddress?: string
    }
  ) => ServerRequest
}

/**
 * @since 1.0.0
 * @category context
 */
export const ServerRequest: Context.Tag<ServerRequest, ServerRequest> = internal.serverRequestTag

/**
 * @since 1.0.0
 * @category accessors
 */
export const persistedMultipart: Effect.Effect<
  unknown,
  Multipart.MultipartError,
  Scope.Scope | FileSystem.FileSystem | Path.Path | ServerRequest
> = internal.multipartPersisted

/**
 * @since 1.0.0
 * @category schema
 */
export const schemaHeaders: <R, I extends Readonly<Record<string, string>>, A>(
  schema: Schema.Schema<A, I, R>
) => Effect.Effect<A, ParseResult.ParseError, ServerRequest | R> = internal.schemaHeaders

/**
 * @since 1.0.0
 * @category schema
 */
export const schemaBodyJson: <A, I, R>(
  schema: Schema.Schema<A, I, R>
) => Effect.Effect<A, Error.RequestError | ParseResult.ParseError, ServerRequest | R> = internal.schemaBodyJson

/**
 * @since 1.0.0
 * @category schema
 */
export const schemaBodyForm: <R, I extends Multipart.Persisted, A>(
  schema: Schema.Schema<A, I, R>
) => Effect.Effect<
  A,
  Multipart.MultipartError | Error.RequestError | ParseResult.ParseError,
  ServerRequest | Scope.Scope | FileSystem.FileSystem | Path.Path | R
> = internal.schemaBodyForm

/**
 * @since 1.0.0
 * @category schema
 */
export const schemaBodyUrlParams: <R, I extends Readonly<Record<string, string>>, A>(
  schema: Schema.Schema<A, I, R>
) => Effect.Effect<A, Error.RequestError | ParseResult.ParseError, ServerRequest | R> = internal.schemaBodyUrlParams

/**
 * @since 1.0.0
 * @category schema
 */
export const schemaBodyMultipart: <R, I extends Multipart.Persisted, A>(
  schema: Schema.Schema<A, I, R>
) => Effect.Effect<
  A,
  Multipart.MultipartError | ParseResult.ParseError,
  R | ServerRequest | Scope.Scope | FileSystem.FileSystem | Path.Path
> = internal.schemaBodyMultipart

/**
 * @since 1.0.0
 * @category schema
 */
export const schemaBodyFormJson: <A, I, R>(
  schema: Schema.Schema<A, I, R>
) => (
  field: string
) => Effect.Effect<
  A,
  ParseResult.ParseError | Error.RequestError,
  R | ServerRequest | FileSystem.FileSystem | Path.Path | Scope.Scope
> = internal.schemaBodyFormJson

/**
 * @since 1.0.0
 * @category conversions
 */
export const fromWeb: (request: Request) => ServerRequest = internal.fromWeb
